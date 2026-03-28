/**
 * RUNES transaction building and broadcasting.
 *
 * Uses UTXO model (Bitcoin-compatible):
 *   1. Fetch UTXOs for the sender address
 *   2. Select coins using coinselect (blackjack + accumulative algorithms)
 *   3. Build the raw transaction with bitcoinjs-lib
 *   4. Sign each input with the derived private key (secp256k1)
 *   5. Broadcast the signed transaction hex via the Insight API
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import coinSelect from 'coinselect';

import { getAddress, getKeyPair } from './address';
import { getNetwork } from './network';
import { getUtxos, getFeeRate, sendRawTransaction } from './insight';
import type { SendTxOptions } from '../types';

const ECPair = ECPairFactory(ecc);

/**
 * Build, sign, and broadcast a RUNES payment transaction.
 */
export async function sendTransaction(opts: SendTxOptions): Promise<string> {
  const { to, amount } = opts;
  const network = getNetwork();
  const address = await getAddress();
  const { privateKey } = await getKeyPair();

  const btcNetwork: bitcoin.Network = {
    messagePrefix: '\x15Runebase Signed Message:\n',
    bech32: 'rb',
    bip32: { public: 0x0488b21e, private: 0x0488ade4 },
    pubKeyHash: network.pubKeyHash,
    scriptHash: network.scriptHash,
    wif: network.wif,
  };

  const feeRate = opts.feeRate ?? (await getFeeRate());
  const rawUtxos = await getUtxos(address);

  if (!rawUtxos.length) {
    throw new Error('No UTXOs available');
  }

  const utxos = rawUtxos.map((u) => ({
    txId: u.txid,
    vout: u.vout,
    value: u.satoshis,
    scriptPubKey: u.scriptPubKey,
  }));

  const targets = [{ address: to, value: amount }];
  const { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate);

  if (!inputs || !outputs) {
    throw new Error('Insufficient funds. Fee: ' + (fee ?? 0));
  }

  const psbt = new bitcoin.Psbt({ network: btcNetwork });

  for (const input of inputs) {
    psbt.addInput({ hash: input.txId, index: input.vout });
  }

  for (const output of outputs) {
    psbt.addOutput({
      address: output.address ?? address,
      value: output.value,
    });
  }

  const keyPair = ECPair.fromPrivateKey(privateKey, { network: btcNetwork });
  for (let i = 0; i < inputs.length; i++) {
    psbt.signInput(i, keyPair);
  }

  psbt.finalizeAllInputs();
  const rawTx = psbt.extractTransaction().toHex();

  const { txid } = await sendRawTransaction(rawTx);
  return txid;
}
