/**
 * Transaction history for a Runebase address.
 */

import { getAddressTransactions } from './insight';
import type { InsightTransaction } from '../types';

/**
 * Fetch paginated transaction history for an address.
 *
 * @param address - Runebase P2PKH address
 * @param pageNum - Page number (0-indexed, default 0)
 * @returns Array of transaction objects
 */
export async function getTransactions(
  address: string,
  pageNum = 0,
): Promise<InsightTransaction[]> {
  const result = await getAddressTransactions(address, pageNum);
  return result.txs;
}
