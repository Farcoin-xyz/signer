# Farcoin signer

This repo consists of a Next.js app that signs Farcaster data for use in Farcoin, a social token protocol.

## Getting Started

First, copy `.env.template` to `.env` and add the missing variables.

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Test that your connection is working:

```
 curl -H 'Content-Type: application/json' \
      -H 'Authorization: Bearer REPLACE_ME' \
      -d '{ "likerFid":"279887","likedFid":"319813","likedAddress":"0xfc002115e148bb57a0d3E9014B9C0D4fDc9cE090"}' \
      -X POST \
      http://localhost:3000
```

Should return data formatted like:

```
{
    "result": {
        "arguments": [
            ["279887"],
            ["319813"],
            ["0xfc002115e148bb57a0d3E9014B9C0D4fDc9cE090"],
            ["0x0000000000000000000000000000000000000000"],
            [1],
            [1708220092],
            [1708220092]
        ],
        "signature": "0x...",
        "signer": "0x..."
    }
}
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the Vercel Platform.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

Be sure to fill in all the environment variables prior to deploying. See `.env.template` for which are needed.
