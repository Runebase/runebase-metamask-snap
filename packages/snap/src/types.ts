/**
 * Type definitions for the Runebase MetaMask Snap
 */

export type NetworkName = 'mainnet' | 'testnet';

export interface RunebaseNetwork {
  name: NetworkName;
  coinType: 2301;
  pubKeyHash: number;
  scriptHash: number;
  wif: number;
  chainId: number;
  insightUrl: string;
}

export interface RunebaseRpcRequest {
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface InsightUtxo {
  txid: string;
  vout: number;
  address: string;
  satoshis: number;
  scriptPubKey: string;
  height?: number;
  confirmations?: number;
}

export interface InsightAddressInfo {
  addrStr: string;
  balance: number;
  balanceSat: number;
  totalReceived: number;
  totalReceivedSat: number;
  totalSent: number;
  totalSentSat: number;
  unconfirmedBalance: number;
  unconfirmedBalanceSat: number;
  txApperances: number;
  transactions: string[];
}

export interface InsightTransaction {
  txid: string;
  version: number;
  locktime: number;
  isqrc20Transfer: boolean;
  vin: InsightTxInput[];
  vout: InsightTxOutput[];
  blockhash?: string;
  blockheight?: number;
  confirmations: number;
  time: number;
  blocktime?: number;
  valueOut: number;
  size: number;
  valueIn: number;
  fees: number;
}

export interface InsightTxInput {
  txid: string;
  vout: number;
  addr: string;
  valueSat: number;
  value: number;
}

export interface InsightTxOutput {
  value: string;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    type: string;
    addresses?: string[];
  };
}

export interface InsightRawTransactions {
  pagesTotal: number;
  txs: InsightTransaction[];
}

export interface InsightSendRawTxResult {
  txid: string;
}

export interface InsightContractCallResult {
  address: string;
  executionResult: {
    gasUsed: number;
    excepted: string;
    newAddress: string;
    output: string;
  };
}

export interface SendTxOptions {
  to: string;
  amount: number;
  feeRate?: number;
}

export interface ContractSendOptions {
  contractAddress: string;
  encodedData: string;
  amount?: number;
  gasLimit?: number;
  gasPrice?: number;
}

export interface QRC20SendOptions {
  contractAddress: string;
  to: string;
  amount: string;
}

export interface SnapState {
  network: NetworkName;
}
