import { NextResponse } from 'next/server';
import { getSSLHubRpcClient, ReactionType } from '@farcaster/hub-nodejs';
import { ethers } from 'ethers';

import frcAbi from './frc-abi.json';

const frcSigner = ethers.Wallet.fromPhrase(process.env.SIGNER_SEED_PHRASE);
let signer = null;
frcSigner.getAddress().then(address => {
  signer = address;
  console.log(`Loaded signer: ${signer}`)
})

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL, undefined, {
  staticNetwork: true,
});
const contract = new ethers.Contract(process.env.FARCOIN_MINTER, frcAbi, provider);

export async function GET (request, context) {
  return NextResponse.json({ result: 'OK' }, { status: 200 });
}

const getLikes = (likerFid, likedFid, rangeClose) => new Promise((resolve, reject) => {
  const frcEpoch = 1609459200;

  const hubClient = getSSLHubRpcClient(process.env.HUB_GRPC_URL);
  hubClient.$.waitForReady(Date.now() + 5000, async (e) => {
    if (e) {
      console.error(`Failed to connect to the gRPC server:`, e);
      reject(e);
      return;
    }
    try {
      let startTime = null;
      let endTime = null;
      let numTokens = 0;

      let isNextPage = true;
      let nextPageToken = undefined;
      while (isNextPage) {
        const reactions = await hubClient.getReactionsByFid({
          fid: likerFid,
          reactionType: ReactionType.LIKE,
          pageToken: nextPageToken,
        });
        if (reactions.error) {
          hubClient.close();
          console.error(reactions.error);
          reject(new Error('Unable to fetch reactions'));
        }
        const { messages } = reactions.value;
        for (let i = 0; i < messages.length; i++) {
          const {
            type,
            timestamp,
            reactionBody: {
              targetCastId,
            },
          } = messages[i].data;
          if (targetCastId) { // in some cases this can be null (e.g. `targetUrl` populated instead)
            const t = timestamp + frcEpoch;
            if (targetCastId.fid === likedFid && t > rangeClose) {
              endTime = Math.max(endTime || 0, t);
              startTime = Math.min(startTime || Infinity, t);
              numTokens++;
            }
          }
        }
        nextPageToken = reactions.value.nextPageToken;
        isNextPage = !!nextPageToken && nextPageToken.length > 0;
      }
      hubClient.close();
      resolve({ numTokens, startTime, endTime });
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
});

const verifyFidAddress = (fid, address) => new Promise((resolve, reject) => {
  const hubClient = getSSLHubRpcClient(process.env.HUB_GRPC_URL);
  hubClient.$.waitForReady(Date.now() + 5000, async (e) => {
    if (e) {
      console.error(`Failed to connect to the gRPC server:`, e);
      reject(e);
      return;
    }
    try {
      const verifications = await hubClient.getVerificationsByFid({
        fid,
      });
      const { messages } = verifications.value;
      const addresses = messages.map(m => m.data.verificationAddAddressBody).map(v => v.address.toString('hex'));
      if ((addresses || []).filter((a) => `0x${a}` === address.toLowerCase()).length === 0) {
        reject(new Error('Address not found'));
      }
      hubClient.close();
      resolve('OK');
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
});

export async function POST (request, context) {
  try {
    const authToken = (request.headers.get('authorization') || '').split("Bearer ").at(1);
    if (authToken !== process.env.BEARER_TOKEN) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }
    const body = await request.json();
    const {
      likerFid,
      likedFid,
      likedAddress,
    } = body;
    await verifyFidAddress(likedFid, likedAddress);
    const rangeClose = parseInt((await contract.getLikerLikedRangeClose(likedFid, likerFid)).toString());
    const result = {
      arguments: [],
      signature: '',
      signer,
    };
    const {
      startTime,
      endTime,
      numTokens,
    } = (await getLikes(parseInt(likerFid), parseInt(likedFid), parseInt(rangeClose)));

    if (numTokens === 0) {
      throw new Error("No tokens to mint");
    }
    result.arguments = [
      likedAddress,
      likedFid,
      [likerFid],
      [numTokens],
      [startTime],
      [endTime],
    ];
    const contractMessage = ethers.AbiCoder.defaultAbiCoder().encode(
      [ "address", "uint256", "uint256[]", "uint256[]", "uint256[]", "uint256[]" ],
      result.arguments
    );
    const contractMsgHash = ethers.keccak256(contractMessage);
    const contractSignature = await frcSigner.signMessage(ethers.getBytes(contractMsgHash));
    result.signature = contractSignature;
    return NextResponse.json({ result }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.toString() }, { status: 500 });
  }
}

export const maxDuration = 10; // 10 seconds
