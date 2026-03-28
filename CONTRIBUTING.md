# Contributing to runebase-metamask-snap

Thank you for your interest in contributing to the Runebase MetaMask Snap!

## Prerequisites

- Node.js >= 18
- Yarn v4 (Berry)
- MetaMask Flask for local testing

## Setup

```bash
git clone https://github.com/Runebase/runebase-metamask-snap.git
cd runebase-metamask-snap
yarn install
```

## Development workflow

```bash
# Build all packages
yarn build

# Start the snap dev server (serves on http://localhost:8080)
yarn workspace @runebase/snap start

# Run tests
yarn test

# Lint
yarn lint
yarn lint:fix
```

## Adding a new RPC method

1. Add the handler to `packages/snap/src/index.ts` (new `case` in the `switch`)
2. Implement the logic in the relevant module under `packages/snap/src/runebase/`
3. Add the method to `packages/connector/src/index.ts` as a typed method on `RunebaseSnap`
4. Write tests in `packages/snap/src/index.test.ts`
5. Update `README.md` with the new method

## Pull requests

- Fork the repository and create a feature branch
- Keep commits atomic and write clear commit messages
- Ensure all tests pass before opening a PR
- Reference related issues in your PR description

## Code style

- TypeScript strict mode
- ESLint + Prettier (run `yarn lint:fix` to auto-format)
- JSDoc comments for all public functions

## License

By contributing you agree that your contributions will be licensed under the MIT License.
