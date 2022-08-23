/* eslint-disable */
const { POSClient, use } = require("@maticnetwork/maticjs");
const { Web3ClientPlugin } = require("@maticnetwork/maticjs-ethers");
const { setProofApi } = require("@maticnetwork/maticjs");
const { Wallet, providers, utils, Contract, BigNumber } = require("ethers");
const path = require("path");
const { abi: childTunnelAbi } = require("./PolymorphChildTunnel.json");
const { abi: polyRootAbi } = require("./PolymorphRoot.json");
const { abi: facesRootAbi } = require("./PolymorphicFacesRoot.json");
require("dotenv").config({
  path: path.resolve(__dirname, "../../../.env"),
});

use(Web3ClientPlugin);
setProofApi("https://apis.matic.network/");

// DON'T TOUCH
const MESSAGE_SENT_EVENT_SIGNATURE =
  "0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036";

async function filterMovedThroughWormhole(tokenIds, tokenType) {
  const provider = new providers.JsonRpcProvider(
    `${process.env.POLYGON_PROVIDER}`
  );

  const ethereumProvider = new providers.JsonRpcProvider(
    `${process.env.ETHEREUM_PROVIDER}`
  );

  const childContractAddress =
    tokenType === "0"
      ? `${process.env.POLYMORPH_CHILD_CONTRACT_ADDRESS}`
      : `${process.env.FACES_CHILD_CONTRACT_ADDRESS}`;

  const rootContractAddress =
    tokenType === "0"
      ? `${process.env.POLY_ROOT}`
      : `${process.env.FACES_ROOT}`;

  const contractABI = tokenType === "0" ? polyRootAbi : facesRootAbi;

  const tunnelAddress =
    tokenType === "0"
      ? `${process.env.POLY_ROOT_TUNNEL}`
      : `${process.env.FACES_ROOT_TUNNEL}`;

  const contractInstance = new Contract(
    rootContractAddress,
    contractABI,
    ethereumProvider
  );

  for (let i = 0; i < tokenIds.length; i++) {
    const currentTokenId = tokenIds[i];
    const currentTokenIdOwnerOf = await contractInstance.ownerOf(
      BigNumber.from(currentTokenId.toString())
    );

    if (currentTokenIdOwnerOf !== tunnelAddress) {
      return {
        validIds: false,
      };
    }
  }

  const zeroAddress = utils.hexZeroPad(utils.hexlify(0), 32);

  let burnTxHash = null;

  for (let i = 0; i < tokenIds.length; i++) {
    const tokenId = tokenIds[i];

    let currentBlock =
      tokenType === "0"
        ? Number(`${process.env.POLYMORPH_CHILD_DEPLOYMENT_BLOCK_NUMBER}`)
        : Number(`${process.env.FACES_CHILD_DEPLOYMENT_BLOCK_NUMBER}`);

    let totalLogsForId = [];

    while (true) {
      const latestBlock = await provider.getBlockNumber();
      const toBlock = Number(currentBlock) + 15000;

      const burnTransactionFilter = {
        fromBlock: currentBlock,
        toBlock: toBlock,
        address: childContractAddress,
        topics: [
          utils.id("Transfer(address,address,uint256)"),
          null,
          zeroAddress,
          utils.hexZeroPad(utils.hexlify(tokenId), 32),
        ],
      };

      const logs = await provider.getLogs(burnTransactionFilter);
      if (logs.length > 0) {
        totalLogsForId = totalLogsForId.concat(logs);
      }

      currentBlock = toBlock;
      if (currentBlock > latestBlock) {
        break;
      }
    }

    const logsLen = totalLogsForId.length;

    // we are only interested in the last burn event of the current tokenId if there is more than 1
    // because it is possible that at some point the user is briding this current tokenId for the second time or more
    if (!burnTxHash && logsLen > 0) {
      burnTxHash = totalLogsForId[logsLen - 1].transactionHash;
    }
    // this is the case if invalid id is passed. Invalid means:
    // 1. Either there are no burn logs (which means the token wasn't burnt on polygon)
    // 2. Or it is burnt but in another transcation
    else if (
      logsLen == 0 ||
      (burnTxHash && burnTxHash !== totalLogsForId[logsLen - 1].transactionHash)
    ) {
      burnTxHash = null;
      break;
    }
  }

  if (!burnTxHash) {
    // if burnTxHash is null, either the ids were invalid or were not burnt
    return {
      validIds: false,
    };
  }

  const result = await generateProof(burnTxHash, tokenType);
  return result;
}

async function generateProof(burnTxHash, tokenType) {
  const posClient = new POSClient();

  const parentProvider = new providers.JsonRpcProvider(
    `${process.env.ETHEREUM_PROVIDER}`
  );

  const childProvider = new providers.JsonRpcProvider(
    `${process.env.POLYGON_PROVIDER}`
  );

  await posClient.init({
    log: true,
    network: `${process.env.POS_CLIENT_NETWORK}`, // 'testnet' or 'mainnet'
    version: `${process.env.POS_CLIENT_VERSION}`, // 'mumbai' or 'v1'
    child: {
      provider: new Wallet(`${process.env.PRIVATE_KEY}`, childProvider),
      defaultConfig: {},
    },
    parent: {
      provider: new Wallet(`${process.env.PRIVATE_KEY}`, parentProvider),
      defaultConfig: {},
    },
  });

  // It's good to first check whether the txHash is checkpointed
  const isCheckPointed = await posClient.isCheckPointed(burnTxHash);

  if (isCheckPointed) {
    const proof = await posClient.exitUtil.buildPayloadForExit(
      burnTxHash,
      MESSAGE_SENT_EVENT_SIGNATURE,
      false // is fast
    );
    return {
      validIds: true,
      isCheckPointed: true,
      proof: proof,
    };
  }
  return {
    validIds: true,
    isCheckPointed: false,
    proof: "",
  };
}

export { filterMovedThroughWormhole };
