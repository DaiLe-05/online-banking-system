
import { network } from "hardhat";
import { writeFileSync, mkdirSync } from "node:fs";

async function main() {
  const { ethers } = await network.create();

  const [admin, alice] = await ethers.getSigners();

  console.log("====================================");
  console.log(" ONLINE BANKING SYSTEM - DEPLOYMENT");
  console.log("====================================");
  console.log("Admin:", admin.address);
  console.log("Demo user:", alice.address);

  // 1. Deploy MockUSDC
  console.log("\n[1/6] Deploying MockUSDC...");

  const token = await ethers.deployContract("MockUSDC");
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("MockUSDC:", tokenAddress);

  // 2. Deploy VaultManager
  console.log("\n[2/6] Deploying VaultManager...");

  const vault = await ethers.deployContract("VaultManager", [
    tokenAddress,
    admin.address,
  ]);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("VaultManager:", vaultAddress);

  // 3. Deploy SavingCore
  console.log("\n[3/6] Deploying SavingCore...");

  const core = await ethers.deployContract("SavingCore", [
    tokenAddress,
    vaultAddress,
  ]);
  await core.waitForDeployment();

  const coreAddress = await core.getAddress();
  console.log("SavingCore:", coreAddress);

  // 4. Connect contracts
  console.log("\n[4/6] Connecting SavingCore to VaultManager...");

  const configureTx = await vault.setSavingCore(coreAddress);
  await configureTx.wait();

  console.log("SavingCore configured:", await vault.savingCore());

  // 5. Fund interest vault
  console.log("\n[5/6] Funding interest vault...");

  const vaultFunding = ethers.parseUnits("10000", 6);

  const mintTx = await token.mint(admin.address, vaultFunding);
  await mintTx.wait();

  const approveTx = await token.approve(vaultAddress, vaultFunding);
  await approveTx.wait();

  const fundTx = await vault.fundVault(vaultFunding);
  await fundTx.wait();

  console.log(
    "Vault balance:",
    ethers.formatUnits(await vault.vaultBalance(), 6),
    "mUSDC"
  );

  // 6. Verify personal variant and save addresses
  console.log("\n[6/6] Verifying deployment...");

  const plan = await core.plans(1n);

  if (
    plan.tenorDays !== 180n ||
    plan.aprBps !== 300n ||
    plan.earlyWithdrawPenaltyBps !== 350n ||
    (await core.GRACE_PERIOD()) !== 259200n
  ) {
    throw new Error("Personal variant verification failed");
  }

  const chain = await ethers.provider.getNetwork();

  const deployment = {
    chainId: Number(chain.chainId),
    network: "localhost",
    admin: admin.address,
    demoUser: alice.address,
    contracts: {
      MockUSDC: tokenAddress,
      VaultManager: vaultAddress,
      SavingCore: coreAddress,
    },
    personalVariant: {
      studentIdSuffix: "14",
      gracePeriodDays: 3,
      aprBps: 300,
      penaltyBps: 350,
      tenorDays: 180,
    },
  };

  mkdirSync("deployments", { recursive: true });

  writeFileSync(
    "deployments/localhost.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("\n====================================");
  console.log(" DEPLOYMENT SUCCESSFUL");
  console.log("====================================");
  console.log("Chain ID:", chain.chainId.toString());
  console.log("MockUSDC:", tokenAddress);
  console.log("VaultManager:", vaultAddress);
  console.log("SavingCore:", coreAddress);
  console.log("Vault funding: 10000 mUSDC");
  console.log("Default plan: 180 days / 3% APR");
  console.log("Early penalty: 3.5%");
  console.log("Grace period: 3 days");
  console.log("Addresses saved to deployments/localhost.json");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
