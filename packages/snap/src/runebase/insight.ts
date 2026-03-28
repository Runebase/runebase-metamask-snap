/**
 * Runebase Insight API client.
 *
 * The Insight API is a REST API that wraps the Runebase blockchain node.
 * It is used for fetching UTXOs, address info, and broadcasting transactions.
 *
 * All network calls in this snap use the endowment:network-access permission.
 * The base URL is configured per-network in network.ts.
 */

import { getNetwork } from './network';
import type {
  InsightAddressInfo,
  InsightUtxo,
  InsightRawTransactions,
  InsightSendRawTxResult,
  InsightContractCallResult,
} from '../types';

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function apiGet<T>(path: string): Promise<T> {
  const { insightUrl } = getNetwork();
  const url = `${insightUrl}/api${path}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Insight API error: ${response.status} ${response.statusText} [${url}]`);
  }

  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { insightUrl } = getNetwork();
  const url = `${insightUrl}/api${path}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Insight API error: ${response.status} ${response.statusText} [${url}]: ${errText}`);
  }

  return response.json() as Promise<T>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch address info (balance, transaction count) for a Runebase address.
 */
export async function getAddressInfo(address: string): Promise<InsightAddressInfo> {
  return apiGet<InsightAddressInfo>(`/addr/${address}`);
}

/**
 * Fetch unspent transaction outputs (UTXOs) for an address.
 * These are used as inputs for building new transactions.
 */
export async function getUtxos(address: string): Promise<InsightUtxo[]> {
  return apiGet<InsightUtxo[]>(`/addr/${address}/utxo`);
}

/**
 * Get the current recommended fee rate (satoshi per byte) from the network.
 */
export async function getFeeRate(): Promise<number> {
  try {
    const data = await apiGet<{ feePerKb?: number }>(`/utils/estimatefee?nbBlocks=4`);
    if (data.feePerKb && data.feePerKb > 0) {
      // Convert from RUNES/KB to satoshi/byte
      return Math.ceil((data.feePerKb * 1e8) / 1024);
    }
  } catch {
    // Fallback to a reasonable default
  }
  return 400; // default: 400 satoshi/byte
}

/**
 * Broadcast a signed raw transaction hex to the Runebase network.
 *
 * @param rawTx - Hexadecimal string of the signed serialized transaction
 * @returns The transaction ID (txid) if broadcast was successful
 */
export async function sendRawTransaction(rawTx: string): Promise<InsightSendRawTxResult> {
  return apiPost<InsightSendRawTxResult>('/tx/send', { rawtx: rawTx });
}

/**
 * Fetch paginated transaction history for an address.
 *
 * @param address - Runebase address
 * @param pageNum - Page number (0-indexed)
 */
export async function getAddressTransactions(
  address: string,
  pageNum = 0,
): Promise<InsightRawTransactions> {
  return apiGet<InsightRawTransactions>(`/txs?address=${address}&pageNum=${pageNum}`);
}

/**
 * Perform a read-only smart contract call (does not create a transaction).
 *
 * @param contractAddress - The contract address in hexadecimal (without '0x' prefix)
 * @param encodedData - ABI-encoded method call data
 */
export async function callContract(
  contractAddress: string,
  encodedData: string,
): Promise<InsightContractCallResult> {
  return apiGet<InsightContractCallResult>(
    `/contracts/${contractAddress}/hash/${encodedData}/call`,
  );
}
