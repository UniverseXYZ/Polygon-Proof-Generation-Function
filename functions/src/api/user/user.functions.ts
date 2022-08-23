/* eslint-disable import/no-named-as-default */
import to from 'await-to-js';
import * as functions from 'firebase-functions';
import { UserService } from './user.service';
const userService = new UserService();

export const getTransferProof = functions.https.onRequest(
  async (request: any, response: any): Promise<any> => {
    const tokenIds = request.query.tokenIds.split(',').map(Number);
    const tokenType = request.query.morph;

    const [err, transferStatus] = await to(
      userService.getTransferStatus(tokenIds, tokenType),
    );

    if (err) {
      return response.status(500);
    }

    return response.json({
      transferStatus,
    });
  },
);
