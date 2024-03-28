import { ethers } from 'ethers';
import minterAbi from './minter-abi.json';

const oracleSigner = ethers.Wallet.fromPhrase(process.env.SIGNER_SEED_PHRASE);
let signerAddress = null;
oracleSigner.getAddress().then(address => {
  signerAddress = address;
  console.log(`Loaded signer: ${signerAddress}`)
});

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL, undefined, {
  staticNetwork: true,
});

export const getSigner = () => {
  return oracleSigner;
}

export const getSignerAddress = () => {
  return signerAddress;
}

export const getMinter = () => {
  return new ethers.Contract(process.env.FARCOIN_MINTER, minterAbi, provider);
}
