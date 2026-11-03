import { network } from "hardhat";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";

type ContractAddresses = {
  MockUSDC?: string;
  VaultManager?: string;
  SavingCore?: string;
};

type DeploymentState = {
  chainId: number;
  network: string;
  timeUnitSeconds: number;
  admin: string;
  demoUser: string;
  contracts: ContractAddresses;
};

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

function readState(path: string): DeploymentState | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as DeploymentState;
}

function writeState(path: string, state: DeploymentState) {
  mkdirSync("deployments", { recursive: true });
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
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

function requireAddress(address: string | undefined, label: string) {
  if (!address) throw new Error(`${label} address is missing`);
  return address;
}

async function main() {
  const { ethers } = await network.create();
  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);
  const targetNetwork = networkDetails(chainId);
  const deploymentPath = `deployments/${targetNetwork.fileName}.json`;
  const checkpointPath = `deployments/${targetNetwork.fileName}.in-progress.json`;
  const fresh =
    process.env.DEPLOY_FRESH === "1" || process.argv.includes("--fresh");

  const signers = await ethers.getSigners();
  const admin = signers[0];
  const demoUser = signers[1] ?? admin;
  const deployer = new ethers.NonceManager(admin);

  const hasCode = async (address: string | undefined) =>
    Boolean(address) && (await ethers.provider.getCode(address!)) !== "0x";

  const allContractsHaveCode = async (contracts: ContractAddresses) =>
    (await hasCode(contracts.MockUSDC)) &&
    (await hasCode(contracts.VaultManager)) &&
    (await hasCode(contracts.SavingCore));

  const assertCompatible = (state: DeploymentState, source: string) => {
    if (
      state.chainId !== chainId ||
      state.admin.toLowerCase() !== admin.address.toLowerCase() ||
      state.timeUnitSeconds !== targetNetwork.timeUnitSeconds
    ) {
      throw new Error(
        `${source} does not match the current chain, admin or timing configuration`,
      );
    }
  };

  console.log("====================================");
  console.log(" ONLINE BANKING SYSTEM - DEPLOYMENT");
  console.log("====================================");
  console.log("Admin:", admin.address);
  console.log("Demo user:", demoUser.address);

  const completed = !fresh ? readState(deploymentPath) : undefined;
  if (completed) {
    assertCompatible(completed, deploymentPath);
    if (await allContractsHaveCode(completed.contracts)) {
      const tokenAddress = requireAddress(
        completed.contracts.MockUSDC,
        "MockUSDC",
      );
      const vaultAddress = requireAddress(
        completed.contracts.VaultManager,
        "VaultManager",
      );
      const coreAddress = requireAddress(
        completed.contracts.SavingCore,
        "SavingCore",
      );

      updateFrontendEnvironment(targetNetwork.envPrefix, {
        MOCK_USDC_ADDRESS: tokenAddress,
        VAULT_MANAGER_ADDRESS: vaultAddress,
        SAVING_CORE_ADDRESS: coreAddress,
        ADMIN_ADDRESS: admin.address,
      });

      console.log("\nExisting completed deployment is still active.");
      console.log("No transactions were sent and no vault funds were changed.");
      console.log("MockUSDC:", tokenAddress);
      console.log("VaultManager:", vaultAddress);
      console.log("SavingCore:", coreAddress);
      console.log("Frontend addresses refreshed in frontend/.env.local");
      console.log("Use DEPLOY_FRESH=1 only when a new deployment is required.");
      return;
    }

    console.log("\nSaved addresses have no code on this chain.");
    console.log("The deployment will start again (expected after a local reset).");
  }

  let state = !fresh ? readState(checkpointPath) : undefined;
  if (state) {
    assertCompatible(state, checkpointPath);
    const savedAddresses = Object.values(state.contracts);
    const savedCodeChecks = await Promise.all(savedAddresses.map(hasCode));
    if (savedCodeChecks.some((present) => !present)) {
      console.log("\nIgnoring a stale partial deployment checkpoint.");
      rmSync(checkpointPath, { force: true });
      state = undefined;
    } else {
      console.log("\nResuming the saved partial deployment.");
    }
  }

  if (fresh) {
    console.log("\nFresh deployment explicitly requested.");
    console.log("Existing public addresses will only be replaced after success.");
    rmSync(checkpointPath, { force: true });
  }

  state ??= {
    chainId,
    network: targetNetwork.label,
    timeUnitSeconds: targetNetwork.timeUnitSeconds,
    admin: admin.address,
    demoUser: demoUser.address,
    contracts: {},
  };

  console.log("\n[1/6] MockUSDC");
  if (state.contracts.MockUSDC) {
    console.log("Reusing:", state.contracts.MockUSDC);
  } else {
    const deployedToken = await ethers.deployContract("MockUSDC", [], deployer);
    await deployedToken.waitForDeployment();
    state.contracts.MockUSDC = await deployedToken.getAddress();
    writeState(checkpointPath, state);
    console.log("Deployed:", state.contracts.MockUSDC);
  }
  const tokenAddress = requireAddress(state.contracts.MockUSDC, "MockUSDC");
  const token = await ethers.getContractAt("MockUSDC", tokenAddress, deployer);

  console.log("\n[2/6] VaultManager");
  if (state.contracts.VaultManager) {
    console.log("Reusing:", state.contracts.VaultManager);
  } else {
    const deployedVault = await ethers.deployContract(
      "VaultManager",
      [tokenAddress, admin.address],
      deployer,
    );
    await deployedVault.waitForDeployment();
    state.contracts.VaultManager = await deployedVault.getAddress();
    writeState(checkpointPath, state);
    console.log("Deployed:", state.contracts.VaultManager);
  }
  const vaultAddress = requireAddress(
    state.contracts.VaultManager,
    "VaultManager",
  );
  const vault = await ethers.getContractAt(
    "VaultManager",
    vaultAddress,
    deployer,
  );

  console.log("\n[3/6] SavingCore");
  if (state.contracts.SavingCore) {
    console.log("Reusing:", state.contracts.SavingCore);
  } else {
    const deployedCore = await ethers.deployContract(
      "SavingCore",
      [tokenAddress, vaultAddress, targetNetwork.timeUnitSeconds],
      deployer,
    );
    await deployedCore.waitForDeployment();
    state.contracts.SavingCore = await deployedCore.getAddress();
    writeState(checkpointPath, state);
    console.log("Deployed:", state.contracts.SavingCore);
    const receipt = await deployedCore.deploymentTransaction()?.wait();
    console.log("Deployment gas:", receipt?.gasUsed.toString() ?? "unknown");
  }
  const coreAddress = requireAddress(state.contracts.SavingCore, "SavingCore");
  const core = await ethers.getContractAt("SavingCore", coreAddress, deployer);

  console.log("\n[4/6] Connecting SavingCore to VaultManager");
  const configuredCore = await vault.savingCore();
  if (configuredCore === ethers.ZeroAddress) {
    const configureTx = await vault.setSavingCore(coreAddress);
    await configureTx.wait();
    console.log("Configured:", coreAddress);
  } else if (configuredCore.toLowerCase() === coreAddress.toLowerCase()) {
    console.log("Already configured:", configuredCore);
  } else {
    throw new Error(
      `VaultManager is already connected to another SavingCore: ${configuredCore}`,
    );
  }

  console.log("\n[5/6] Funding interest vault");
  const targetFunding = ethers.parseUnits("10000", 6);
  const currentFunding = await vault.vaultBalance();
  if (currentFunding >= targetFunding) {
    console.log(
      "Funding already complete:",
      ethers.formatUnits(currentFunding, 6),
      "mUSDC",
    );
  } else {
    const shortfall = targetFunding - currentFunding;
    const adminBalance = await token.balanceOf(admin.address);
    if (adminBalance < shortfall) {
      const mintTx = await token.mint(admin.address, shortfall - adminBalance);
      await mintTx.wait();
    }

    const allowance = await token.allowance(admin.address, vaultAddress);
    if (allowance < shortfall) {
      const approveTx = await token.approve(vaultAddress, shortfall);
      await approveTx.wait();
    }

    const fundTx = await vault.fundVault(shortfall);
    await fundTx.wait();
    console.log("Added:", ethers.formatUnits(shortfall, 6), "mUSDC");
  }

  console.log("\n[6/6] Verifying deployment");
  const plan = await core.plans(1n);
  if (
    plan.tenorDays !== 180n ||
    plan.aprBps !== 300n ||
    plan.earlyWithdrawPenaltyBps !== 350n ||
    (await core.TIME_UNIT_SECONDS()) !== BigInt(targetNetwork.timeUnitSeconds) ||
    (await core.GRACE_PERIOD()) !== BigInt(targetNetwork.timeUnitSeconds * 3)
  ) {
    throw new Error("Personal variant verification failed");
  }

  const deployment = {
    ...state,
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

  writeState(deploymentPath, deployment);
  rmSync(checkpointPath, { force: true });

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
  console.log(
    "Vault balance:",
    ethers.formatUnits(await vault.vaultBalance(), 6),
    "mUSDC",
  );
  console.log("Default plan: 180 days / 3% APR");
  console.log("Early penalty: 3.5%");
  console.log(
    "Time unit:",
    targetNetwork.timeUnitSeconds,
    "seconds per logical day",
  );
  console.log(
    "Grace period:",
    targetNetwork.timeUnitSeconds * 3,
    "seconds",
  );
  console.log(`Addresses saved to ${deploymentPath}`);
  console.log("Frontend addresses saved to frontend/.env.local");
  console.log("Restart the Vite dev server if it is already running.");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  console.error(
    "Run the same command again to resume from the saved checkpoint.",
  );
  process.exitCode = 1;
});
