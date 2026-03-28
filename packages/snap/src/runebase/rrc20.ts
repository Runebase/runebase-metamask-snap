/**
 * RRC20 token support for Runebase.
 *
 * RRC20 is Runebase's token standard — the equivalent of ERC20 on Ethereum.
 * Tokens live in EVM smart contracts on the Runebase chain, accessible via
 * the Account Abstraction Layer (AAL).
 *
 * Note: Runebase addresses start with 'R' (mainnet). The 20-byte public key
 * hash is extracted from the Base58Check address and zero-padded to 32 bytes
 * for ABI parameter encoding.
 *
 * ABI selectors:
 *   balanceOf(address)          -> keccak256[0:4]: 70a08231
 *   transfer(address,uint256)   -> keccak256[0:4]: a9059cbb
 */

import * as bitcoin from 'bitcoinjs-lib';
import { getAddress } from './address';
import { getNetwork } from './network';
import { callContract } from './insight';
import { contractSend } from './contract';
import type { RRC20SendOptions } from '../types';

// ─── ABI selectors ────────────────────────────────────────────────────────────

const BALANCE_OF_SELECTOR = '70a08231'; // balanceOf(address)
const TRANSFER_SELECTOR = 'a9059cbb';   // transfer(address,uint256)

// ─── Address conversion ───────────────────────────────────────────────────────

/**
 * Convert a Runebase Base58Check address (starts with R on mainnet) to a
 * 32-byte ABI-encoded address parameter for use in contract calls.
 *
 * Extracts the 20-byte public key hash and zero-pads to 32 bytes (64 hex chars).
 */
function runebaseAddressToEvmParam(address: string): string {
  const network = getNetwork();
  const btcNetwork: bitcoin.Network = {
    messagePrefix: '\x15Runebase Signed Message:\n',
    bech32: 'rb',
    bip32: { public: 0x0488b21e, private: 0x0488ade4 },
    pubKeyHash: network.pubKeyHash,
    scriptHash: network.scriptHash,
    wif: network.wif,
  };

  const decoded = bitcoin.address.fromBase58Check(address);
  const hash160 = decoded.hash.toString('hex'); // 20 bytes = 40 hex chars
  // ABI encoding: left-pad with zeros to 32 bytes (64 hex chars)
  return hash160.padStart(64, '0');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the RRC20 token balance for a Runebase address.
 *
 * Calls balanceOf(address) on the token contract via the Insight API
 * (read-only, no transaction created).
 *
 * @param walletAddress   - Runebase address (starts with R on mainnet)
 * @param contractAddress - Token contract address (hex, without 0x prefix)
 * @returns Raw token balance as a hex string from the ABI output
 */
export async function getRRC20Balance(
  walletAddress: string,
  contractAddress: string,
): Promise<string> {
  const addressParam = runebaseAddressToEvmParam(walletAddress);
  const encodedData = BALANCE_OF_SELECTOR + addressParam;

  const result = await callContract(contractAddress, encodedData);
  return result.executionResult.output || '0x0';
}

/**
 * Transfer RRC20 tokens.
 *
 * Encodes a transfer(address,uint256) call and sends it as a send-to-contract
 * transaction with an OP_CALL output on the Runebase UTXO chain.
 *
 * @param opts.contractAddress - Token contract address (hex)
 * @param opts.to              - Recipient Runebase address (starts with R on mainnet)
 * @param opts.amount          - Token amount (decimal string, in token base units)
 * @returns Transaction ID
 */
export async function sendRRC20(opts: RRC20SendOptions): Promise<string> {
  const { contractAddress, to, amount } = opts;

  const toParam = runebaseAddressToEvmParam(to);
  // ABI-encode the uint256 amount: convert to hex, left-pad to 32 bytes
  const amountHex = BigInt(amount).toString(16).padStart(64, '0');
  const encodedData = TRANSFER_SELECTOR + toParam + amountHex;

  return contractSend({
    contractAddress,
    encodedData,
    amount: 0, // RRC20 transfers send 0 RUNES value with the contract call
    gasLimit: 250000,
    gasPrice: 40,
  });
}
