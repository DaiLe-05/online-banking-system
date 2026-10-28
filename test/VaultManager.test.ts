
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("VaultManager", function () {
  async function deployFixture() {
    const [owner, alice, bob, feeReceiver] =
      await ethers.getSigners();

    const token = await ethers.deployContract("MockUSDC");
    await token.waitForDeployment();

    const vault = await ethers.deployContract("VaultManager", [
      await token.getAddress(),
      feeReceiver.address,
    ]);
    await vault.waitForDeployment();

    const initialAmount = ethers.parseUnits("10000", 6);
    await token.mint(owner.address, initialAmount);

    await token.approve(
      await vault.getAddress(),
      initialAmount
    );

    return { token, vault, owner, alice, bob, feeReceiver };
  }

  it("Should initialize correctly", async function () {
    const { token, vault, owner, feeReceiver } =
      await networkHelpers.loadFixture(deployFixture);

    expect(await vault.owner()).to.equal(owner.address);
    expect(await vault.token()).to.equal(await token.getAddress());
    expect(await vault.feeReceiver()).to.equal(feeReceiver.address);
    expect(await vault.vaultBalance()).to.equal(0n);
  });

  it("Should allow admin to fund the vault", async function () {
    const { token, vault, owner } =
      await networkHelpers.loadFixture(deployFixture);

    const amount = ethers.parseUnits("5000", 6);

    await vault.fundVault(amount);

    expect(await vault.vaultBalance()).to.equal(amount);
    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("5000", 6)
    );
  });

  it("Should emit vault administration events", async function () {
    const { vault, owner, alice, feeReceiver } =
      await networkHelpers.loadFixture(deployFixture);

    const amount = ethers.parseUnits("1000", 6);

    await expect(vault.fundVault(amount))
      .to.emit(vault, "VaultFunded")
      .withArgs(owner.address, amount);

    await expect(vault.setFeeReceiver(alice.address))
      .to.emit(vault, "FeeReceiverUpdated")
      .withArgs(feeReceiver.address, alice.address);

    await expect(vault.withdrawVault(amount))
      .to.emit(vault, "VaultWithdrawn")
      .withArgs(owner.address, amount);
  });

  it("Should reject funding by non-admin", async function () {
    const { vault, alice } =
      await networkHelpers.loadFixture(deployFixture);

    await expect(
      vault.connect(alice).fundVault(100n)
    ).to.revert(ethers);
  });

  it("Should reject funding with zero amount", async function () {
    const { vault } =
      await networkHelpers.loadFixture(deployFixture);

    await expect(
      vault.fundVault(0n)
    ).to.revert(ethers);
  });

  it("Should allow admin to withdraw vault funds", async function () {
    const { token, vault, owner } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.fundVault(ethers.parseUnits("5000", 6));
    await vault.withdrawVault(ethers.parseUnits("2000", 6));

    expect(await vault.vaultBalance()).to.equal(
      ethers.parseUnits("3000", 6)
    );

    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("7000", 6)
    );
  });

  it("Should reject vault withdrawal by non-admin", async function () {
    const { vault, alice } =
      await networkHelpers.loadFixture(deployFixture);

    await expect(
      vault.connect(alice).withdrawVault(100n)
    ).to.revert(ethers);
  });

  it("Should reject withdrawal exceeding vault balance", async function () {
    const { vault } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.fundVault(ethers.parseUnits("100", 6));

    await expect(
      vault.withdrawVault(ethers.parseUnits("200", 6))
    ).to.revert(ethers);
  });

  it("Should update fee receiver", async function () {
    const { vault, alice } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.setFeeReceiver(alice.address);

    expect(await vault.feeReceiver()).to.equal(alice.address);
  });

  it("Should reject fee receiver update by non-admin", async function () {
    const { vault, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    await expect(
      vault.connect(alice).setFeeReceiver(bob.address)
    ).to.revert(ethers);
  });

  it("Should configure SavingCore only once", async function () {
    const { vault, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.setSavingCore(alice.address);

    expect(await vault.savingCore()).to.equal(alice.address);

    await expect(
      vault.setSavingCore(bob.address)
    ).to.revert(ethers);
  });

  it("Should reject unauthorized interest payments", async function () {
    const { vault, alice } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.fundVault(ethers.parseUnits("1000", 6));

    await expect(
      vault.payInterest(alice.address, ethers.parseUnits("10", 6))
    ).to.revert(ethers);
  });

  it("Should pay interest to the requested receiver", async function () {
    const { token, vault, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.setSavingCore(alice.address);
    await vault.fundVault(ethers.parseUnits("1000", 6));

    await vault
      .connect(alice)
      .payInterest(bob.address, ethers.parseUnits("50", 6));

    expect(await token.balanceOf(bob.address)).to.equal(
      ethers.parseUnits("50", 6)
    );

    expect(await vault.vaultBalance()).to.equal(
      ethers.parseUnits("950", 6)
    );
  });

  it("Should reject interest payments when vault is insufficient", async function () {
    const { vault, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.setSavingCore(alice.address);
    await vault.fundVault(ethers.parseUnits("10", 6));

    await expect(
      vault.connect(alice).payInterest(
        bob.address,
        ethers.parseUnits("100", 6)
      )
    ).to.revert(ethers);
  });

  it("Should pause and unpause the system", async function () {
    const { vault } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.pause();
    expect(await vault.paused()).to.equal(true);

    await vault.unpause();
    expect(await vault.paused()).to.equal(false);
  });

  it("Should reject interest payments while paused", async function () {
    const { vault, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    await vault.setSavingCore(alice.address);
    await vault.fundVault(ethers.parseUnits("1000", 6));

    await vault.pause();

    await expect(
      vault.connect(alice).payInterest(
        bob.address,
        ethers.parseUnits("50", 6)
      )
    ).to.revert(ethers);
  });

  it("Should reject pausing by non-admin", async function () {
    const { vault, alice } =
      await networkHelpers.loadFixture(deployFixture);

    await expect(
      vault.connect(alice).pause()
    ).to.revert(ethers);
  });
});
