Based on tutorial:
https://thegraph.com/blog/file-data-sources-tutorial/

Breaking changes in new lenshub contract:
- contentURI and profileID are no longer directly accessible from event.params. Tthey are inside postParams, a custom type (struct) from LensHub smart contract. Need to compile solidity contracts in remix: lenshub.sol & types.sol
- new arweave and ipfs uri format
