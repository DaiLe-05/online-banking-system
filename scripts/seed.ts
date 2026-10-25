
import { network } from "hardhat";
import { readFileSync } from "node:fs";

async function main() {
  const { ethers } = await network.create();

  const deployment = JSON.parse(
    readFileSync("deployments/localhost.json", "utf8")
  );

  const [admin, alice] = await ethers.getSigners();

  const token = await ethers.getContractAt(
    "MockUSDC",
    deployment.contracts.MockUSDC
  );

  const core = await ethers.getContractAt(
    "SavingCore",
    deployment.contracts.SavingCore
  );

  const vault = await ethers.getContractAt(
    "VaultManager",
    deployment.contracts.VaultManager
  );

  // Prevent using a stale deployment file.
  const chain = await ethers.provider.getNetwork();

  if (Number(chain.chainId) !== deployment.chainId) {
    throw new Error("Wrong chain ID");
  }

  if (
    (await ethers.provider.getCode(deployment.contracts.MockUSDC)) === "0x" ||
    (await ethers.provider.getCode(deployment.contracts.SavingCore)) === "0x" ||
    (await ethers.provider.getCode(deployment.contracts.VaultManager)) === "0x"
  ) {
    throw new Error("Contracts not deployed. Run deploy.ts again.");
  }

  const mintAmount = ethers.parseUnits("5000", 6);
  const depositAmount = ethers.parseUnits("1000", 6);

  console.log("Admin:", admin.address);
  console.log("Demo user:", alice.address);

  // Mint test tokens to Alice.
  const mintTx = await token.connect(admin).mint(
    alice.address,
    mintAmount
  );
  await mintTx.wait();

  console.log("Minted 5000 mUSDC to Alice");

  // Alice approves SavingCore.
  const approveTx = await token.connect(alice).approve(
    await core.getAddress(),
    depositAmount
  );
  await approveTx.wait();

  console.log("Alice approved 1000 mUSDC");

  // Alice opens a deposit using default plan #1.
  const nextId = await core.nextDepositId();

  const openTx = await core.connect(alice).openDeposit(
    1n,
    depositAmount
  );
  await openTx.wait();

  const deposit = await core.deposits(nextId);
  const certificateOwner = await core.ownerOf(nextId);

  console.log("\n================================");
  console.log(" DEMO DEPOSIT CREATED");
  console.log("================================");
  console.log("Deposit ID:", nextId.toString());
  console.log("Certificate owner:", certificateOwner);

  console.log(
    "Principal:",
    ethers.formatUnits(deposit.principal, 6),
    "mUSDC"
  );

  console.log("APR:", deposit.aprBpsAtOpen.toString(), "bps");
  console.log("Tenor:", deposit.tenorDays.toString(), "days");

  console.log(
    "Interest:",
    ethers.formatUnits(await core.calculateInterest(nextId), 6),
    "mUSDC"
  );

  console.log(
    "Alice remaining balance:",
    ethers.formatUnits(await token.balanceOf(alice.address), 6),
    "mUSDC"
  );

  console.log(
    "Vault balance:",
    ethers.formatUnits(await vault.vaultBalance(), 6),
    "mUSDC"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
