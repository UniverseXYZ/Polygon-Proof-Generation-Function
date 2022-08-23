/* eslint-disable */
import { use } from "@maticnetwork/maticjs";
import { Web3ClientPlugin } from "@maticnetwork/maticjs-ethers";
import * as dotenv from "dotenv";
import { filterMovedThroughWormhole } from "./generateProof";
import { ProofIsGeneratedResponse } from "./user";

dotenv.config();

use(Web3ClientPlugin);

export class UserService {
  async getTransferStatus(
    tokenIds: Array<number>,
    tokenType: string
  ): Promise<ProofIsGeneratedResponse> {
    return await filterMovedThroughWormhole(tokenIds, tokenType);
  }
}
