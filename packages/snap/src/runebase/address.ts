/**
 * Runebase address derivation from MetaMask BIP44 entropy.
 *
 * Key derivation path: m/44'/2301'/0'/0/0
 *   - BIP44 coin type 2301 is registered for RUNES (Runebase)
 *   - The address is a P2PKH (Pay-to-Public-Key-Hash) address
 *   - Encoded with Base58Check using the network's pubKeyHash version byte
 *
 * Security model:
 *   - The private key is derived inside the snap's isolated environment
 *   - The private key is NEVER exposed to DApps or returned via RPC
 *   - Signing happens locally; only the signed transaction hex leaves the snap
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { BIP32Factory } from 'bip32';
import type { BIP44CoinTypeNode } from '@metamask/snaps-sdk';
import { getNetwork } from './network';

const bip32 = BIP32Factory(ecc);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Derive the BIP44 entropy node for Runebase (coin type 2301) from MetaMask SRP.
 * This calls snap_getBip44Entropy which is gated by the snap's manifest permission.
 */
async function getBip44Node(): Promise<BIP44CoinTypeNode> {
  return (await snap.request({
    method: 'snap_getBip44Entropy',
    params: { coinType: 2301 },
  })) as BIP44CoinTypeNode;
}

/**
 * Derive the secp256k1 key pair for account index 0 / address index 0.
 *
 * BIP44 path: m/44'/2301'/0'/0/0
 * snap_getBip44Entropy returns the node at m/44'/2301', so we derive:
 *   bip44Node -> 0' (account) -> 0 (change) -> 0 (address index)
 */
async function deriveKeyPair(): Promise<{ privateKey: Buffer; publicKey: Buffer }> {
  const bip44Node = await getBip44Node();

  // The node returned by snap_getBip44Entropy has already derived m/44'/coinType'
  // We use the node's key and chain code to derive the remaining path components.
  const rootNode = bip32.fromPrivateKey(
    Buffer.from(bip44Node.privateKey!.slice(2), 'hex'),
    Buffer.from(bip44Node.chainCode.slice(2), 'hex'),
  );

  // Derive account 0 (hardened) -> change 0 -> address index 0
  const accountNode = rootNode.deriveHardened(0); // account 0'
  const changeNode = accountNode.derive(0);        // external chain
  const addressNode = changeNode.derive(0);        // address index 0

  if (!addressNode.privateKey) {
    throw new Error('Failed to derive private key');
  }

  return {
    privateKey: addressNode.privateKey,
    publicKey: Buffer.from(addressNode.publicKey),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the Runebase P2PKH address for account 0.
 *
 * The address format is Base58Check with the network's pubKeyHash version byte:
 *   Mainnet: version 58 -> addresses look like 'RxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX'
 *   Testnet: version 120 -> addresses look like 'qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxX'
 *
 * @returns The Runebase address string
 */
export async function getAddress(): Promise<string> {
  const { publicKey } = await deriveKeyPair();
  const network = getNetwork();

  const bitcoinNetwork: bitcoin.Network = {
    messagePrefix: '\x15Runebase Signed Message:\n',
    bech32: 'rb',
    bip32: { public: 0x0488b21e, private: 0x0488ade4 },
    pubKeyHash: network.pubKeyHash,
    scriptHash: network.scriptHash,
    wif: network.wif,
  };

  const { address } = bitcoin.payments.p2pkh({
    pubkey: publicKey,
    network: bitcoinNetwork,
  });

  if (!address) {
    throw new Error('Failed to derive Runebase address');
  }

  return address;
}

/**
 * Get the raw keypair — used internally for transaction signing only.
 * This is never exposed via RPC.
 */
export async function getKeyPair(): Promise<{ privateKey: Buffer; publicKey: Buffer }> {
  return deriveKeyPair();
}
