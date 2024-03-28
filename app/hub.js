import { getSSLHubRpcClient, ReactionType } from '@farcaster/hub-nodejs';

const FC_EPOCH_UNIX_OFFSET = 1609459200;

export const getLikes = (likerFid, likedFid, lastMintedLikeTime) => new Promise((resolve, reject) => {
  const hubClient = getSSLHubRpcClient(process.env.HUB_GRPC_URL);
  hubClient.$.waitForReady(Date.now() + 5000, async (e) => {
    if (e) {
      console.error(`Failed to connect to the gRPC server:`, e);
      reject(e);
      return;
    }
    try {
      let firstLikeTime = null;
      let lastLikeTime = null;
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
            const t = timestamp + FC_EPOCH_UNIX_OFFSET;
            if (targetCastId.fid === likedFid && t > lastMintedLikeTime) {
              lastLikeTime = Math.max(lastLikeTime || 0, t);
              firstLikeTime = Math.min(firstLikeTime || Infinity, t);
              numTokens++;
            }
          }
        }
        nextPageToken = reactions.value.nextPageToken;
        isNextPage = !!nextPageToken && nextPageToken.length > 0;
      }
      hubClient.close();
      resolve({ numTokens, firstLikeTime, lastLikeTime });
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
});

export const verifyFidAddress = (fid, address) => new Promise((resolve, reject) => {
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
