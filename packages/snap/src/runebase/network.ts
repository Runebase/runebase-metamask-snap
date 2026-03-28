/**
 * Runebase network configuration and state management.
 *
 * Chain parameters sourced from:
 *   - https://github.com/Runebase/runebase/blob/master/src/chainparams.cpp
 *   - https://github.com/runebase/runebasejs-wallet (network definitions)
 *
 * Address format: P2PKH Base58Check
 *   Mainnet version byte: 58  (addresses start with 'R' or 'Q' depending on entropy)
 *   Testnet version byte: 120 (addresses start with 'q')
 *
 * BIP44 coin type: 2301 (RUNES)
 *   See: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
 */

import type { NetworkName, RunebaseNetwork, SnapState } from '../types';

// ─── Network definitions ──────────────────────────────────────────────────────

export const NETWORKS: Record<NetworkName, RunebaseNetwork> = {
  mainnet: {
    name: 'mainnet',
    coinType: 2301,
    pubKeyHash: 58,    // Base58Check version byte — P2PKH addresses start with 'R'
    scriptHash: 50,    // P2SH addresses
    wif: 128,          // WIF private key prefix (same as Bitcoin mainnet)
    chainId: 1129,     // Runebase EVM chain ID
    insightUrl: 'https://explorer.runebase.org',
  },
  testnet: {
    name: 'testnet',
    coinType: 2301,
    pubKeyHash: 120,   // Base58Check version byte — P2PKH addresses start with 'q'
    scriptHash: 110,
    wif: 239,          // WIF private key prefix (same as Bitcoin testnet)
    chainId: 8888,
    insightUrl: 'https://testnet.runebase.org',
  },
};

// ─── Active network cache ─────────────────────────────────────────────────────

let _currentNetwork: RunebaseNetwork = NETWORKS.mainnet;

/**
 * Return the currently active Runebase network config.
 */
export function getNetwork(): RunebaseNetwork {
  return _currentNetwork;
}

/**
 * Switch the active network and persist the choice to snap state.
 */
export async function switchNetwork(name: NetworkName): Promise<void> {
  _currentNetwork = NETWORKS[name];

  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState | null;

  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: { ...(state ?? {}), network: name },
    },
  });
}

/**
 * Load persisted network from snap state on startup.
 */
export async function loadNetworkFromState(): Promise<void> {
  const state = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  })) as SnapState | null;

  if (state?.network) {
    _currentNetwork = NETWORKS[state.network] ?? NETWORKS.mainnet;
  }
}
