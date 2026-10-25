
import { network } from "hardhat";
import { readFileSync } from "node:fs";

async function main() {
  const { ethers } = await network.create();

  const deployment = JSON.parse(
    readFileSync("deployments/localhost.json", "utf8")
  );

  const chain = await ethers.provider.getNetwork();

  if (Number(chain.chainId) !== deployment.chainId) {
    throw new Error("Wrong blockchain network");
  }

  const coreAddress: string = deployment.contracts.SavingCore;
  const vaultAddress: string = deployment.contracts.VaultManager;

  if (
    (await ethers.provider.getCode(coreAddress)) === "0x" ||
    (await ethers.provider.getCode(vaultAddress)) === "0x"
  ) {
    throw new Error("Contracts not found. Deploy again.");
  }

  const core = await ethers.getContractAt("SavingCore", coreAddress);
  const vault = await ethers.getContractAt("VaultManager", vaultAddress);

  if (
    (await vault.savingCore()).toLowerCase() !==
    coreAddress.toLowerCase()
  ) {
    throw new Error("Vault is not connected to this SavingCore");
  }

  if (await vault.paused()) {
    console.log("System is paused. Bot will not renew deposits.");
    return;
  }

  const grace = await core.GRACE_PERIOD();
  const nextId = await core.nextDepositId();
  const latestBlock = await ethers.provider.getBlock("latest");

  if (!latestBlock) {
    throw new Error("Cannot read latest block");
  }

  const now = BigInt(latestBlock.timestamp);

  console.log("================================");
  console.log(" AUTO-RENEW BOT");
  console.log("================================");
  console.log("Chain ID:", chain.chainId.toString());
  console.log("Current timestamp:", now.toString());
  console.log("Grace period:", (grace / 86400n).toString(), "days");
  console.log("Deposits to scan:", (nextId - 1n).toString());

  let renewed = 0;
  let skipped = 0;
  let failed = 0;

  for (let id = 1n; id < nextId; id++) {
    const deposit = await core.deposits(id);

    // 0 = Active
    if (deposit.status !== 0n) {
      skipped++;
      continue;
    }

    const renewalTime = deposit.maturityAt + grace;

    if (now < renewalTime) {
      console.log(
        `Deposit #${id}: not eligible. Renewal at ${renewalTime}`
      );
      skipped++;
      continue;
    }

    try {
      const tx = await core.autoRenewDeposit(id);
      const receipt = await tx.wait();

      console.log(
        `Deposit #${id}: renewed successfully. Tx: ${receipt?.hash}`
      );

      renewed++;
    } catch (error) {
      console.error(`Deposit #${id}: renewal failed`, error);
      failed++;
    }
  }

  console.log("\n================================");
  console.log(" BOT SUMMARY");
  console.log("================================");
  console.log("Renewed:", renewed);
  console.log("Skipped:", skipped);
  console.log("Failed:", failed);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
