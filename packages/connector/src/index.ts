/**
 * @runebase/connector
 *
 * DApp-facing connector library for the Runebase MetaMask Snap.
 * Provides a high-level API that DApps can use to interact with the snap.
 *
 * Usage:
 *   import { RunebaseSnap } from '@runebase/connector';
 *
 *   const snap = new RunebaseSnap(window.ethereum);
 *   await snap.install();
 *
 *   const address = await snap.getAddress();
 *   const balance = await snap.getBalance();
 *   const txid = await snap.sendTransaction({ to: 'Rxxxxx', amount: 1e8 });
 */

// Snap ID on npm — update this after publishing to npm
export const SNAP_ID = 'npm:@runebase/snap';
export const SNAP_VERSION = '0.1.0';

export interface EthereumProvider {
  request<T>(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<T>;
}

export interface SendTransactionParams {
  to: string;
  amount: number;
  feeRate?: number;
}

export interface QRC20SendParams {
  contractAddress: string;
  to: string;
  amount: string;
}

export interface ContractCallParams {
  contractAddress: string;
  encodedData: string;
}

export interface ContractSendParams {
  contractAddress: string;
  encodedData: string;
  amount?: number;
  gasLimit?: number;
  gasPrice?: number;
}

/**
 * RunebaseSnap connector class.
 *
 * Wraps wallet_invokeSnap calls for all supported Runebase snap RPC methods.
 */
export class RunebaseSnap {
  private readonly ethereum: EthereumProvider;
  private readonly snapId: string;

  constructor(ethereum: EthereumProvider, snapId = SNAP_ID) {
    this.ethereum = ethereum;
    this.snapId = snapId;
  }

  /**
   * Install or connect to the Runebase snap.
   * Must be called before using any other methods.
   */
  async install(): Promise<void> {
    await this.ethereum.request({
      method: 'wallet_requestSnaps',
      params: {
        [this.snapId]: { version: SNAP_VERSION },
      },
    });
  }

  /**
   * Invoke a snap RPC method.
   */
  private async invoke<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    return this.ethereum.request<T>({
      method: 'wallet_invokeSnap',
      params: {
        snapId: this.snapId,
        request: { method, params },
      },
    });
  }

  /**
   * Get the derived Runebase address for the connected wallet.
   */
  async getAddress(): Promise<string> {
    const result = await this.invoke<{ address: string }>('runebase_getAddress');
    return result.address;
  }

  /**
   * Get the RUNES balance (in satoshi) for the connected wallet.
   */
  async getBalance(): Promise<number> {
    const result = await this.invoke<{ balance: number }>('runebase_getBalance');
    return result.balance;
  }

  /**
   * Send RUNES to another address.
   * Shows a confirmation dialog to the user before signing.
   */
  async sendTransaction(params: SendTransactionParams): Promise<string> {
    const result = await this.invoke<{ txid: string }>('runebase_sendTransaction', params);
    return result.txid;
  }

  /**
   * Get QRC20 token balance for a contract.
   */
  async getQRC20Balance(contractAddress: string): Promise<string> {
    const result = await this.invoke<{ balance: string }>('runebase_getQRC20Balance', {
      contractAddress,
    });
    return result.balance;
  }

  /**
   * Transfer QRC20 tokens.
   * Shows a confirmation dialog to the user before signing.
   */
  async sendQRC20(params: QRC20SendParams): Promise<string> {
    const result = await this.invoke<{ txid: string }>('runebase_sendQRC20', params);
    return result.txid;
  }

  /**
   * Perform a read-only smart contract call (no transaction).
   */
  async contractCall(params: ContractCallParams): Promise<unknown> {
    return this.invoke('runebase_contractCall', params);
  }

  /**
   * Send a state-changing transaction to a smart contract.
   * Shows a confirmation dialog to the user before signing.
   */
  async contractSend(params: ContractSendParams): Promise<string> {
    const result = await this.invoke<{ txid: string }>('runebase_contractSend', params);
    return result.txid;
  }

  /**
   * Switch between mainnet and testnet.
   */
  async switchNetwork(network: 'mainnet' | 'testnet'): Promise<void> {
    await this.invoke('runebase_switchNetwork', { network });
  }

  /**
   * Get recent transaction history.
   */
  async getTransactions(pageNum = 0): Promise<unknown[]> {
    const result = await this.invoke<{ transactions: unknown[] }>('runebase_getTransactions', {
      pageNum,
    });
    return result.transactions;
  }
}
