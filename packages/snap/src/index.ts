/**
 * Runebase MetaMask Snap - Entry Point
 *
 * This snap acts as an RPC proxy between DApps and the Runebase blockchain.
 * It derives Runebase keypairs from the MetaMask SRP using BIP44 (coin type 2301),
 * builds and signs UTXO transactions locally, and communicates with the network
 * via the Runebase Insight API.
 *
 * Exposed RPC Methods:
 *   runebase_getAddress        - Return the derived Runebase address (starts with R)
 *   runebase_getBalance        - Return RUNES balance in satoshi
 *   runebase_sendTransaction   - Sign and broadcast a RUNES transfer
 *   runebase_getRRC20Balance   - Return RRC20 token balance
 *   runebase_sendRRC20         - Transfer RRC20 tokens
 *   runebase_contractCall      - Read-only smart contract call
 *   runebase_contractSend      - State-changing smart contract call
 *   runebase_switchNetwork     - Switch between mainnet / testnet
 *   runebase_getTransactions   - Fetch recent transaction history
 */

import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text, heading, divider } from '@metamask/snaps-sdk';

import { getAddress } from './runebase/address';
import { getBalance } from './runebase/balance';
import { sendTransaction } from './runebase/send';
import { getRRC20Balance, sendRRC20 } from './runebase/rrc20';
import { contractCall, contractSend } from './runebase/contract';
import { getTransactions } from './runebase/transactions';
import { switchNetwork, getNetwork } from './runebase/network';
import type { RunebaseRpcRequest } from './types';

/**
 * Main RPC request handler — dispatches incoming RPC calls to the appropriate module.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  const req = request as RunebaseRpcRequest;

  switch (req.method) {
    case 'runebase_getAddress': {
      const address = await getAddress();
      return { address };
    }

    case 'runebase_getBalance': {
      const address = await getAddress();
      const balance = await getBalance(address);
      return { balance };
    }

    case 'runebase_sendTransaction': {
      const { to, amount, feeRate } = req.params ?? {};
      if (!to || amount === undefined) {
        throw new Error('runebase_sendTransaction: missing required params (to, amount)');
      }

      const confirmed = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            heading('Confirm Transaction'),
            text(`Send ${(Number(amount) / 1e8).toFixed(8)} RUNES`),
            text(`To: ${to}`),
            divider(),
            text(`Network: ${getNetwork().name}`),
          ]),
        },
      });

      if (!confirmed) {
        throw new Error('Transaction rejected by user');
      }

      const txid = await sendTransaction({ to: to as string, amount: Number(amount), feeRate: feeRate as number | undefined });
      return { txid };
    }

    case 'runebase_getRRC20Balance': {
      const { contractAddress } = req.params ?? {};
      if (!contractAddress) {
        throw new Error('runebase_getRRC20Balance: missing contractAddress');
      }
      const address = await getAddress();
      const balance = await getRRC20Balance(address, contractAddress as string);
      return { balance };
    }

    case 'runebase_sendRRC20': {
      const { contractAddress, to, amount } = req.params ?? {};
      if (!contractAddress || !to || amount === undefined) {
        throw new Error('runebase_sendRRC20: missing required params');
      }

      const confirmed = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            heading('Confirm RRC20 Transfer'),
            text(`Token contract: ${contractAddress}`),
            text(`To: ${to}`),
            text(`Amount: ${amount}`),
          ]),
        },
      });

      if (!confirmed) {
        throw new Error('Transaction rejected by user');
      }

      const txid = await sendRRC20({
        contractAddress: contractAddress as string,
        to: to as string,
        amount: String(amount),
      });
      return { txid };
    }

    case 'runebase_contractCall': {
      const { contractAddress, encodedData } = req.params ?? {};
      if (!contractAddress || !encodedData) {
        throw new Error('runebase_contractCall: missing required params');
      }
      const result = await contractCall(contractAddress as string, encodedData as string);
      return result;
    }

    case 'runebase_contractSend': {
      const { contractAddress, encodedData, amount } = req.params ?? {};
      if (!contractAddress || !encodedData) {
        throw new Error('runebase_contractSend: missing required params');
      }

      const confirmed = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            heading('Confirm Contract Interaction'),
            text(`Contract: ${contractAddress}`),
            text(`Value: ${amount ? (Number(amount) / 1e8).toFixed(8) + ' RUNES' : '0 RUNES'}`),
          ]),
        },
      });

      if (!confirmed) {
        throw new Error('Transaction rejected by user');
      }

      const txid = await contractSend({
        contractAddress: contractAddress as string,
        encodedData: encodedData as string,
        amount: amount as number | undefined,
      });
      return { txid };
    }

    case 'runebase_switchNetwork': {
      const { network } = req.params ?? {};
      if (network !== 'mainnet' && network !== 'testnet') {
        throw new Error('runebase_switchNetwork: network must be "mainnet" or "testnet"');
      }
      await switchNetwork(network);
      return { network };
    }

    case 'runebase_getTransactions': {
      const address = await getAddress();
      const { pageNum } = req.params ?? {};
      const transactions = await getTransactions(address, pageNum as number | undefined);
      return { transactions };
    }

    default:
      throw new Error(`Unknown RPC method: ${req.method}`);
  }
};
