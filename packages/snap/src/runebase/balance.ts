/**
 * Fetch the RUNES balance for a given Runebase address.
 * Balance is returned in satoshi units (1 RUNES = 1e8 satoshi).
 */

import { getAddressInfo } from './insight';

/**
 * Get the confirmed + unconfirmed RUNES balance for an address.
 *
 * @param address - Runebase P2PKH address
 * @returns Balance in satoshi
 */
export async function getBalance(address: string): Promise<number> {
  const info = await getAddressInfo(address);
  // Include unconfirmed balance so the user sees their full available balance
  return info.balanceSat + info.unconfirmedBalanceSat;
}
