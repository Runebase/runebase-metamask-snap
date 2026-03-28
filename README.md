# runebase-metamask-snap

> **MetaMask Snap for the Runebase blockchain** — connect MetaMask to RUNES, QRC20 tokens, and EVM-compatible smart contracts natively.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![MetaMask Snaps](https://img.shields.io/badge/MetaMask-Snap-orange)](https://metamask.io/snaps/)

---

## Overview

This MetaMask Snap allows users to interact with the **Runebase blockchain** directly through their MetaMask wallet — without needing a separate wallet application. Runebase is a UTXO-based blockchain with full EVM support (via its Account Abstraction Layer), Proof-of-Stake consensus, and native QRC20 token support.

The snap acts as an RPC proxy: it derives Runebase-compatible keypairs from the MetaMask secret recovery phrase, signs UTXO transactions locally, and communicates with the Runebase network via the Runebase Insight API.

---

## Features

- BIP44 HD key derivation from MetaMask SRP (coin type 2301)
- RUNES balance and transfer (native coin)
- QRC20 token support (balance queries and transfers)
- Smart contract interaction (call and send-to-contract)
- UTXO transaction building and local signing
- Mainnet and Testnet network support
- MetaMask Snap UI for transaction confirmation

---

## Architecture

The project is a monorepo with two packages:

```
packages/
  snap/        — The MetaMask Snap (TypeScript, @metamask/snaps-sdk)
  connector/   — A DApp-facing connector library
```

---

## Runebase Chain Parameters

| Parameter         | Value                                       |
|-------------------|---------------------------------------------|
| BIP44 coin type   | 2301 (RUNES)                                |
| Address prefix    | Q (P2PKH, Base58Check version 58)           |
| Testnet prefix    | q (version 120)                             |
| Block time        | ~128 seconds (PoS)                          |
| Native token      | RUNES (8 decimal places)                    |
| EVM chain ID      | 1129 (mainnet) / 8888 (testnet)             |
| Insight API       | https://explorer.runebase.org/              |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- Yarn (v4, berry)
- MetaMask Flask or MetaMask >= 11.0

### Installation

```bash
git clone https://github.com/Runebase/runebase-metamask-snap.git
cd runebase-metamask-snap
yarn install
```

### Development

```bash
# Start the snap dev server (http://localhost:8080)
yarn workspace @runebase/snap start

# Start the connector dev server
yarn workspace @runebase/connector start
```

### Testing

```bash
yarn test
yarn lint
yarn lint:fix
```

---

## Snap Permissions

| Permission                  | Purpose                                              |
|-----------------------------|------------------------------------------------------|
| snap_getBip44Entropy        | Derive Runebase keypairs from MetaMask SRP           |
| snap_dialog                 | Display transaction confirmation dialogs             |
| snap_manageState            | Persist network and account preferences              |
| endowment:network-access    | Fetch UTXOs and broadcast via Insight API            |
| endowment:rpc               | Expose RPC methods to DApps via the connector        |

---

## RPC Methods

| Method                        | Description                                      |
|-------------------------------|--------------------------------------------------|
| runebase_getAddress           | Get the derived Runebase address                 |
| runebase_getBalance           | Get RUNES balance (satoshi)                      |
| runebase_sendTransaction      | Sign and broadcast a RUNES transfer              |
| runebase_getQRC20Balance      | Get QRC20 token balance                          |
| runebase_sendQRC20            | Transfer QRC20 tokens                            |
| runebase_contractCall         | Call (read) a smart contract method              |
| runebase_contractSend         | Send a transaction to a smart contract           |
| runebase_switchNetwork        | Switch between mainnet and testnet               |
| runebase_getTransactions      | Fetch recent transaction history                 |

---

## MetaMask Snaps Store Submission

To get this snap listed on the official MetaMask Snaps Directory:

1. Audit — The snap must be audited by a Consensys-approved auditor.
2. npm publish — Publish the snap package to the public npm registry.
3. Pull request — Open a PR to MetaMask/snaps-registry with snap metadata.
4. Review — Consensys reviews the submission and audit report.
5. Listing — Once approved, the snap appears on snaps.metamask.io.

---

## Roadmap

- [ ] Phase 1 — Core snap scaffold (key derivation, address display)
- [ ] Phase 2 — RUNES send/receive + balance
- [ ] Phase 3 — QRC20 token support
- [ ] Phase 4 — Smart contract interaction
- [ ] Phase 5 — DApp connector library
- [ ] Phase 6 — Snap UI (home page, transaction insights)
- [ ] Phase 7 — Security audit
- [ ] Phase 8 — npm publish + MetaMask Store submission

---

## Contributing

Pull requests are welcome. Please see CONTRIBUTING.md.

---

## License

MIT — see LICENSE

---

## Resources

- [Runebase Website](https://runebase.io)
- [Runebase GitHub](https://github.com/Runebase)
- [MetaMask Snaps Docs](https://docs.metamask.io/snaps/)
- [MetaMask Snaps SDK](https://github.com/MetaMask/snaps)
