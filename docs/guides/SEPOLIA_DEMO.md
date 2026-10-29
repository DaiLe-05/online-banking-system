# Sepolia deployment and demo

This guide deploys the learning project to Ethereum Sepolia and demonstrates
the user, admin, C1 and C2 flows. Use a brand-new test wallet. Never use a
wallet that holds real assets.

## What Sepolia is for

Sepolia proves that MetaMask, public transactions, deployed contracts and the
frontend work on a public blockchain. The complete edge-case suite remains on
Hardhat Local because public testnets do not support `evm_increaseTime`. For a
live public-network demo, this project deploys Sepolia with a compressed clock:
one logical plan day is 60 seconds and the three-day grace period is 180
seconds. Interest is still calculated from the logical tenor, not the shortened
wall-clock duration.

## 1. Prepare a test wallet

1. Create a separate MetaMask account for this project.
2. Get a small amount of Sepolia ETH from a reputable faucet.
3. Create a Sepolia RPC endpoint with a provider such as Alchemy, Infura or
   QuickNode.
4. Keep the wallet private key private. Do not paste it into source files,
   screenshots, chat messages or GitHub.

Store the two secrets in Hardhat's encrypted keystore:

```powershell
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

Verify only the key names, not their values:

```powershell
npx hardhat keystore list
```

## 2. Deploy to Sepolia

From the repository root:

```powershell
npx hardhat --network sepolia --build-profile production run scripts/deploy.ts
```

The command:

- deploys MockUSDC, VaultManager and SavingCore;
- connects the vault to SavingCore;
- funds the interest vault with 10,000 test mUSDC;
- writes public addresses to `deployments/sepolia.json`;
- writes Vite addresses to the ignored `frontend/.env.local` file.

The private key is never written by the deployment script.

The repository also publishes the latest public contract addresses in
`deployments/sepolia.json`. To reuse that deployment, copy
`frontend/.env.example` to `frontend/.env.local` instead of deploying again.

## 3. Start the frontend

If Vite was already running, stop and restart it so it reads `.env.local`:

```powershell
cd frontend
npm run dev
```

Open the displayed URL, choose **Sepolia** in the header and connect MetaMask.
The green network indicator means the three contracts were found. Successful
transactions include a **View on explorer** link.

## 4. Immediate smoke demo

These flows can be shown without waiting:

1. Click **Mint 1000 test mUSDC**.
2. Open a deposit and confirm the approval and deposit transactions.
3. Show the new NFT certificate and its Etherscan transaction.
4. Open a second deposit and use **Withdraw early**.
5. Show the fee, returned principal and `WITHDRAWN` status.

MockUSDC has public minting because it is a test-only token. It must never be
presented as real USDC.

## 5. Admin demo

Connect the same Sepolia account used to deploy. The **Admin** menu appears.

Create a short plan for the time-based demo:

| Field | Value |
|---|---:|
| Term | 1 day |
| APR | 3% |
| Minimum | 0 |
| Maximum | 0 |
| Early fee | 3.5% |

The admin panel also supports:

- funding the interest vault;
- withdrawing safe liquidity;
- enabling or disabling a plan by ID;
- pausing and unpausing the system.

To demonstrate pause protection, pause the system, switch to the user account
and try to open a deposit. The transaction is rejected. Return to the admin
account and unpause before continuing.

## 6. C2 solvency-guard demo

1. Keep at least one deposit active.
2. Note **vault total**, **reserved interest** and **safe vault liquidity**.
3. As admin, enter the full vault balance in **Withdraw safe liquidity**.
4. Confirm the transaction attempt. It must fail with
   `Interest funds reserved`.
5. Enter an amount no greater than **safe vault liquidity** and try again.
   That withdrawal succeeds.

This proves that the admin cannot withdraw interest already promised to active
deposits.

## 7. Fast maturity schedule

Sepolia still uses real block time and cannot be moved forward manually. The
contract itself uses a demo time unit, so a 1-day plan matures after about 60
seconds without any privileged time-changing function.

### First minute

- Create the 1-day plan.
- Open three small deposits on that plan:
  - A for maturity withdrawal;
  - B for manual renewal;
  - C for automatic renewal.
- Record their transaction hashes.

### After about 60 seconds

- Click **Refresh** so the frontend reads the latest Sepolia block timestamp.
- Withdraw A with **Withdraw all**.
- Renew B with **Renew** while it is inside the 3-day grace period.
- Leave C untouched.

### After about 240 seconds from C's deposit

C matures after about 60 seconds, then its 180-second grace period ends. Run
the permissionless bot:

```powershell
npx hardhat --network sepolia --build-profile production run scripts/auto-renew.ts
```

Refresh the frontend. C becomes `AUTO RENEWED` and a replacement certificate
appears for the same owner.

Exact eligibility depends on the timestamp of the latest mined block. If a
transaction says the grace period has not ended, wait for the next Sepolia
block and retry.

## 8. C1 principal-safety demo

Use a fresh deployment or perform this before any deposit exists:

1. As admin, withdraw the full 10,000 mUSDC vault balance. This is allowed only
   because no interest is reserved yet.
2. Create the 1-day plan.
3. As a user, mint test mUSDC and open a deposit on that plan.
4. After about 60 seconds, click **Refresh** and use **Withdraw all**.
5. Confirm that the full principal returns while the interest appears as
   pending.
6. As admin, fund the vault.
7. As the user, click **Claim interest**.
8. Confirm that pending interest becomes zero.

After a deposit exists, C2 intentionally prevents the admin from draining its
reserved interest. This is why the C1 shortage must be prepared before opening
the deposit or demonstrated by the isolated automated test.

## 9. Recommended mentor demo

1. Show the Sepolia label in the frontend and the banner explaining that one
   logical day equals 60 seconds.
2. Mint mUSDC and open three deposits on the 1-day plan.
3. Use the transaction hash links to prove the actions are public on Etherscan.
4. After about 60 seconds, refresh and demonstrate **Withdraw all** and
   **Renew**.
5. After C's 180-second grace period, run the auto-renew bot and refresh.
6. Show the automated C1/C2 tests as repeatable evidence for edge cases.

## Troubleshooting

- **Sepolia contracts are not configured:** deploy again and restart Vite.
- **Insufficient funds for gas:** add Sepolia ETH to the sender wallet.
- **Wrong account:** select the deployer for admin controls and another account
  for the user flow.
- **Transaction pending:** wait for Sepolia confirmation; do not submit the
  same action repeatedly.
- **Old local MetaMask history:** activity history is cached by MetaMask and is
  not the source of truth. Use the Sepolia Etherscan link for public-network
  transactions.
