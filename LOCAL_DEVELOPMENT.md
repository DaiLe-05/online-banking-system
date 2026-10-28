# Local development runbook

The frontend expects Hardhat at `http://127.0.0.1:8545` with chain ID `31337`.

## Start from a clean local node

Use three terminals from the repository root:

```powershell
npx hardhat node
```

```powershell
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/seed.ts --network localhost
```

```powershell
cd frontend
npm run dev
```

Hardhat's local chain is ephemeral. Every time the node restarts, run both the deploy and seed commands again. Deployment writes the current addresses to `deployments/localhost.json`; if those addresses ever change, update the frontend address constants in `frontend/src/App.tsx`.

Connect MetaMask to `http://127.0.0.1:8545` (chain ID `31337`). Only use accounts printed by the local Hardhat node. Never commit wallet seed phrases, private keys, `.env` files, or production credentials.

## Validation

```powershell
cd frontend
npm run lint
npm run build
```
