
import { network } from "hardhat";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

function networkDetails(chainId: number) {
  if (chainId === 31337) {
    return {
      fileName: "localhost",
      envPrefix: "LOCAL",
      label: "localhost",
      timeUnitSeconds: 24 * 60 * 60,
    };
  }

  if (chainId === 11155111) {
    return {
      fileName: "sepolia",
      envPrefix: "SEPOLIA",
      label: "sepolia",
      timeUnitSeconds: 60,
    };
  }

  return {
    fileName: `chain-${chainId}`,
    envPrefix: `CHAIN_${chainId}`,
    label: `chain-${chainId}`,
    timeUnitSeconds: 24 * 60 * 60,
  };
}

function updateFrontendEnvironment(
  prefix: string,
  values: Record<string, string>,
) {
  const envPath = "frontend/.env.local";
  const current = existsSync(envPath)
    ? readFileSync(envPath, "utf8").split(/\r?\n/)
    : [];

  const updates = new Map(
    Object.entries(values).map(([key, value]) => [
      `VITE_${prefix}_${key}`,
      value,
    ]),
  );

  const output = current
    .filter(Boolean)
    .map((line) => {
      const key = line.split("=", 1)[0];
      if (!updates.has(key)) return line;

      const value = updates.get(key)!;
      updates.delete(key);
      return `${key}=${value}`;
    });

  for (const [key, value] of updates) {
    output.push(`${key}=${value}`);
  }

  writeFileSync(envPath, `${output.join("\n")}\n`);
}

async function main() {
  const { ethers } = await network.create();
  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);
  const targetNetwork = networkDetails(chainId);

  const signers = await ethers.getSigners();
  const admin = signers[0];
  const demoUser = signers[1] ?? admin;
  const deployer = new ethers.NonceManager(admin);

  console.log("====================================");
  console.log(" ONLINE BANKING SYSTEM - DEPLOYMENT");
  console.log("====================================");
  console.log("Admin:", admin.address);
  console.log("Demo user:", demoUser.address);

  // 1. Deploy MockUSDC
  console.log("\n[1/6] Deploying MockUSDC...");

  const token = await ethers.deployContract("MockUSDC", [], deployer);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log("MockUSDC:", tokenAddress);

  // 2. Deploy VaultManager
  console.log("\n[2/6] Deploying VaultManager...");

  const vault = await ethers.deployContract("VaultManager", [
    tokenAddress,
    admin.address,
  ], deployer);
  await vault.waitForDeployment();

  const vaultAddress = await vault.getAddress();
  console.log("VaultManager:", vaultAddress);

  // 3. Deploy SavingCore
  console.log("\n[3/6] Deploying SavingCore...");

  const core = await ethers.deployContract("SavingCore", [
    tokenAddress,
    vaultAddress,
    targetNetwork.timeUnitSeconds,
  ], deployer);
  await core.waitForDeployment();

  const coreAddress = await core.getAddress();
  console.log("SavingCore:", coreAddress);
  const coreDeploymentReceipt = await core.deploymentTransaction()?.wait();
  console.log(
    "SavingCore deployment gas:",
    coreDeploymentReceipt?.gasUsed.toString() ?? "unknown"
  );

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
    (await core.TIME_UNIT_SECONDS()) !==
      BigInt(targetNetwork.timeUnitSeconds) ||
    (await core.GRACE_PERIOD()) !==
      BigInt(targetNetwork.timeUnitSeconds * 3)
  ) {
    throw new Error("Personal variant verification failed");
  }

  const deployment = {
    chainId,
    network: targetNetwork.label,
    timeUnitSeconds: targetNetwork.timeUnitSeconds,
    admin: admin.address,
    demoUser: demoUser.address,
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

  const deploymentPath = `deployments/${targetNetwork.fileName}.json`;

  writeFileSync(
    deploymentPath,
    JSON.stringify(deployment, null, 2)
  );

  updateFrontendEnvironment(targetNetwork.envPrefix, {
    MOCK_USDC_ADDRESS: tokenAddress,
    VAULT_MANAGER_ADDRESS: vaultAddress,
    SAVING_CORE_ADDRESS: coreAddress,
    ADMIN_ADDRESS: admin.address,
  });

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
  console.log(
    "Time unit:",
    targetNetwork.timeUnitSeconds,
    "seconds per logical day"
  );
  console.log(
    "Grace period:",
    targetNetwork.timeUnitSeconds * 3,
    "seconds"
  );
  console.log(`Addresses saved to ${deploymentPath}`);
  console.log("Frontend addresses saved to frontend/.env.local");
  console.log("Restart the Vite dev server if it is already running.");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
