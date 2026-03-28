/**
 * Smart contract interaction for Runebase.
 *
 * Runebase uses the Account Abstraction Layer to bridge UTXO and EVM.
 * Send-to-contract transactions have a special OP_CALL output type:
 *
 *   scriptPubKey: <version> <gasLimit> <gasPrice> <encodedData> <contractAddr> OP_CALL
 *
 * The raw transaction building for OP_CALL outputs requires custom script construction
 * that goes beyond standard P2PKH. This module handles that encoding.
 *
 * Default gas parameters (configurable per call):
 *   gasLimit: 250,000
 *   gasPrice: 40 (satoshi per gas unit)
 */

import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';
import coinSelect from 'coinselect';

import { getAddress, getKeyPair } from './address';
import { getNetwork } from './network';
import { getUtxos, getFeeRate, sendRawTransaction, callContract as insightCallContract } from './insight';
import type { ContractSendOptions, InsightContractCallResult } from '../types';

const ECPair = ECPairFactory(ecc);

const DEFAULT_GAS_LIMIT = 250000;
const DEFAULT_GAS_PRICE = 40; // satoshi per gas

/**
 * Perform a read-only call to a smart contract (no transaction created).
 * Proxies to the Insight API's contract call endpoint.
 */
export async function contractCall(
  contractAddress: string,
  encodedData: string,
): Promise<InsightContractCallResult> {
  return insightCallContract(contractAddress, encodedData);
}

/**
 * Build and encode an OP_CALL output script for a Runebase send-to-contract transaction.
 *
 * Script format: OP_4 <gasLimit (CScriptNum)> <gasPrice (CScriptNum)> <encodedData> <contractAddr> OP_CALL
 *
 * This is the unique Runebase transaction type that bridges UTXO and EVM.
 * See: https://docs.runebase.org/en/Qtum-Smart-Contract.html
 */
function buildOpCallScript(
  contractAddress: string,
  encodedData: string,
  gasLimit: number,
  gasPrice: number,
): Buffer {
  const contractAddrBytes = Buffer.from(contractAddress, 'hex');
  const encodedDataBytes = Buffer.from(encodedData, 'hex');

  // Encode gasLimit and gasPrice as CScriptNum (little-endian, minimal)
  function encodeScriptNum(n: number): Buffer {
    if (n === 0) return Buffer.alloc(0);
    const buf = Buffer.alloc(8);
    let i = 0;
    let absVal = Math.abs(n);
    while (absVal > 0) {
      buf[i++] = absVal & 0xff;
      absVal >>= 8;
    }
    if (buf[i - 1] & 0x80) buf[i++] = n < 0 ? 0x80 : 0x00;
    else if (n < 0) buf[i - 1] |= 0x80;
    return buf.slice(0, i);
  }

  const gasLimitBuf = encodeScriptNum(gasLimit);
  const gasPriceBuf = encodeScriptNum(gasPrice);

  // Build the script: OP_4 gasLimit gasPrice encodedData contractAddr OP_CALL
  const script = bitcoin.script.compile([
    bitcoin.opcodes.OP_4,
    gasLimitBuf,
    gasPriceBuf,
    encodedDataBytes,
    contractAddrBytes,
    0xc2, // OP_CALL
  ]);

  return script;
}

/**
 * Build, sign, and broadcast a send-to-contract (OP_CALL) transaction.
 *
 * @param opts.contractAddress - Target contract address (20-byte hex, no 0x)
 * @param opts.encodedData     - ABI-encoded method call + parameters
 * @param opts.amount          - RUNES value to send with the call (in satoshi), default 0
 * @param opts.gasLimit        - Gas limit (default 250,000)
 * @param opts.gasPrice        - Gas price in satoshi/gas (default 40)
 * @returns Transaction ID
 */
export async function contractSend(opts: ContractSendOptions): Promise<string> {
  const {
    contractAddress,
    encodedData,
    amount = 0,
    gasLimit = DEFAULT_GAS_LIMIT,
    gasPrice = DEFAULT_GAS_PRICE,
  } = opts;

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

  const feeRate = await getFeeRate();
  const rawUtxos = await getUtxos(address);

  if (!rawUtxos.length) {
    throw new Error('No UTXOs available');
  }

  // Gas cost in satoshi: gasLimit * gasPrice
  const gasCost = gasLimit * gasPrice;
  // Total value needed: contract amount + gas reserve
  const totalNeeded = amount + gasCost;

  const utxos = rawUtxos.map((u) => ({
    txId: u.txid,
    vout: u.vout,
    value: u.satoshis,
  }));

  // Use coinselect to pick inputs; we add 1 output (the OP_CALL)
  const targets = [{ value: totalNeeded }];
  const { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate);

  if (!inputs || !outputs) {
    throw new Error('Insufficient funds for contract call (need ' + totalNeeded + ' + fee)');
  }

  const psbt = new bitcoin.Psbt({ network: btcNetwork });

  for (const input of inputs) {
    psbt.addInput({ hash: input.txId, index: input.vout });
  }

  // Add OP_CALL output
  const callScript = buildOpCallScript(contractAddress, encodedData, gasLimit, gasPrice);
  psbt.addOutput({ script: callScript, value: amount });

  // Add change output if necessary
  for (const output of outputs) {
    if (!output.value || output.value === totalNeeded) continue; // skip the call output
    psbt.addOutput({ address, value: output.value });
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
