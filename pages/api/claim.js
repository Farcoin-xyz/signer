import { ethers } from 'ethers';

import * as hub from '../../lib/hub';
import * as chain from '../../lib/chain';

export default async function POST (req, res) {
  if (req.method !== 'POST') {
    return res.status(404).json({ error: 'Not Found' });
  }
  try {
    const authToken = (req.headers['authorization'] || '').split("Bearer ").at(1);
    if (authToken !== process.env.BEARER_TOKEN) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }
    const { body } = req;
    const likerFid = Number(body.likerFid);
    const likerAddress = body.likerAddress;

    await hub.verifyFidAddress(likerFid, likerAddress);

    const minter = chain.getMinter();
    const signer = chain.getSigner();
    const signerAddress = chain.getMinter();

    const result = {
      arguments: [],
      signature: '0x',
      signer: signerAddress,
    };

    const lastClaimNonce = Number((await minter.getClaimNonce(likerFid)));
    const claimNonce = lastClaimNonce + 1;
    result.arguments = [
      [likerFid],
      [likerAddress],
      [claimNonce],
    ];

    const message = ethers.AbiCoder.defaultAbiCoder().encode(
      [ "uint256[]", "address[]", "uint256[]" ],
      result.arguments
    );
    const hash = ethers.keccak256(message);
    const signature = await signer.signMessage(ethers.getBytes(hash));
    result.signature = signature;
    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.toString() });
  }
}

export const maxDuration = 10; // 10 seconds
