import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

import * as hub from '../hub';
import * as chain from '../chain';

export async function GET (request, context) {
  return NextResponse.json({ result: 'OK' }, { status: 200 });
}

export async function POST (request, context) {
  try {
    const authToken = (request.headers.get('authorization') || '').split("Bearer ").at(1);
    if (authToken !== process.env.BEARER_TOKEN) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }
    const body = await request.json();
    const likerFid = Number(body.likerFid);
    const likedFid = Number(body.likedFid);
    const likerAddress = '0x0000000000000000000000000000000000000000';
    const likedAddress = body.likedAddress;

    await hub.verifyFidAddress(likedFid, likedAddress);

    const minter = chain.getMinter();
    const signer = chain.getSigner();
    const signerAddress = chain.getMinter();

    const result = {
      arguments: [],
      signature: '0x',
      signer: signerAddress,
    };

    const lastMintedLikeTime = Number((await minter.getLastLikeTime(likerFid, likedFid)));
    const {
      firstLikeTime,
      lastLikeTime,
      numTokens,
    } = (await hub.getLikes(likerFid, likedFid, lastMintedLikeTime));

    if (numTokens === 0) {
      throw new Error("No tokens to mint");
    }
    result.arguments = [
      [likerFid],
      [likedFid],
      [likerAddress],
      [likedAddress],
      [numTokens],
      [firstLikeTime],
      [lastLikeTime],
    ];
    const message = ethers.AbiCoder.defaultAbiCoder().encode(
      [ "uint256[]", "uint256[]", "address[]", "address[]", "uint256[]", "uint256[]", "uint256[]" ],
      result.arguments
    );
    const hash = ethers.keccak256(message);
    const signature = await signer.signMessage(ethers.getBytes(hash));
    result.signature = signature;
    return NextResponse.json({ result }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.toString() }, { status: 500 });
  }
}

export const maxDuration = 10; // 10 seconds
