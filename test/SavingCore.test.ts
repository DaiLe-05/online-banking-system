
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("SavingCore", function () {
  const USDC = (amount: string) => ethers.parseUnits(amount, 6);
  const DAY = 24 * 60 * 60;

  async function deployFixture() {
    const [admin, alice, bob, feeReceiver, bot] =
      await ethers.getSigners();

    const token = await ethers.deployContract("MockUSDC");
    await token.waitForDeployment();

    const vault = await ethers.deployContract("VaultManager", [
      await token.getAddress(),
      feeReceiver.address,
    ]);
    await vault.waitForDeployment();

    const core = await ethers.deployContract("SavingCore", [
      await token.getAddress(),
      await vault.getAddress(),
    ]);
    await core.waitForDeployment();

    await vault.setSavingCore(await core.getAddress());

    await token.mint(admin.address, USDC("100000"));
    await token.approve(await vault.getAddress(), USDC("100000"));
    await vault.fundVault(USDC("10000"));

    await token.mint(alice.address, USDC("5000"));
    await token.connect(alice).approve(
      await core.getAddress(),
      USDC("5000")
    );

    await token.mint(bob.address, USDC("5000"));
    await token.connect(bob).approve(
      await core.getAddress(),
      USDC("5000")
    );

    return { token, vault, core, admin, alice, bob, feeReceiver, bot };
  }

  async function openedDepositFixture() {
    const fixture = await deployFixture();

    await fixture.core.connect(fixture.alice).openDeposit(
      1n,
      USDC("1000")
    );

    return fixture;
  }

  async function reachMaturity(core: any, depositId = 1n) {
    const dep = await core.deposits(depositId);
    await networkHelpers.time.increaseTo(dep.maturityAt);
  }

  it("Should use personal variant 14", async function () {
    const { core } = await networkHelpers.loadFixture(deployFixture);

    expect(await core.GRACE_PERIOD()).to.equal(BigInt(3 * DAY));
    expect(await core.DEFAULT_APR_BPS()).to.equal(300n);
    expect(await core.DEFAULT_PENALTY_BPS()).to.equal(350n);
    expect(await core.DEFAULT_TENOR_DAYS()).to.equal(180n);
  });

  it("Should initialize the default plan correctly", async function () {
    const { core } = await networkHelpers.loadFixture(deployFixture);

    const plan = await core.plans(1n);

    expect(plan.tenorDays).to.equal(180n);
    expect(plan.aprBps).to.equal(300n);
    expect(plan.earlyWithdrawPenaltyBps).to.equal(350n);
    expect(plan.enabled).to.equal(true);
  });

  it("Should create a saving plan", async function () {
    const { core } = await networkHelpers.loadFixture(deployFixture);

    await core.createPlan(
      90n, 250n, USDC("100"), USDC("5000"), 500n
    );

    const plan = await core.plans(2n);

    expect(plan.tenorDays).to.equal(90n);
    expect(plan.aprBps).to.equal(250n);
    expect(plan.enabled).to.equal(true);
  });

  it("Should reject invalid APR", async function () {
    const { core } = await networkHelpers.loadFixture(deployFixture);

    await expect(
      core.createPlan(90n, 10001n, 0n, 0n, 350n)
    ).to.revert(ethers);
  });

  it("Should reject invalid plan settings", async function () {
    const { core } = await networkHelpers.loadFixture(deployFixture);

    await expect(
      core.createPlan(0n, 300n, 0n, 0n, 350n)
    ).to.revert(ethers);

    await expect(
      core.createPlan(90n, 300n, 0n, 0n, 10001n)
    ).to.revert(ethers);

    await expect(
      core.createPlan(90n, 300n, USDC("500"), USDC("100"), 350n)
    ).to.revert(ethers);

    await expect(
      core.updatePlan(1n, 10001n)
    ).to.revert(ethers);
  });

  it("Should emit plan management events", async function () {
    const { core } = await networkHelpers.loadFixture(deployFixture);

    await expect(
      core.createPlan(90n, 450n, USDC("100"), 0n, 200n)
    ).to.emit(core, "PlanCreated").withArgs(2n, 90n, 450n);

    await expect(core.updatePlan(2n, 500n))
      .to.emit(core, "PlanUpdated")
      .withArgs(2n, 500n);

    await expect(core.disablePlan(2n))
      .to.emit(core, "PlanEnabled")
      .withArgs(2n, false);
  });

  it("Should reject plan creation by non-admin", async function () {
    const { core, alice } = await networkHelpers.loadFixture(deployFixture);

    await expect(
      core.connect(alice).createPlan(90n, 300n, 0n, 0n, 350n)
    ).to.revert(ethers);
  });

  it("Should enable and disable a plan", async function () {
    const { core } = await networkHelpers.loadFixture(deployFixture);

    await core.disablePlan(1n);
    expect((await core.plans(1n)).enabled).to.equal(false);

    await core.enablePlan(1n);
    expect((await core.plans(1n)).enabled).to.equal(true);
  });

  it("Should open a deposit and mint its NFT", async function () {
    const { core, token, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    expect(await core.ownerOf(1n)).to.equal(alice.address);
    expect((await core.deposits(1n)).principal).to.equal(USDC("1000"));
    expect(await token.balanceOf(await core.getAddress()))
      .to.equal(USDC("1000"));
    expect((await core.deposits(1n)).status).to.equal(0n);
  });

  it("Should reject a disabled plan", async function () {
    const { core, alice } = await networkHelpers.loadFixture(deployFixture);

    await core.disablePlan(1n);

    await expect(
      core.connect(alice).openDeposit(1n, USDC("100"))
    ).to.revert(ethers);
  });

  it("Should reject deposits below min and above max", async function () {
    const { core, alice } = await networkHelpers.loadFixture(deployFixture);

    await core.createPlan(
      30n, 300n, USDC("100"), USDC("500"), 350n
    );

    await expect(
      core.connect(alice).openDeposit(2n, USDC("50"))
    ).to.revert(ethers);

    await expect(
      core.connect(alice).openDeposit(2n, USDC("600"))
    ).to.revert(ethers);
  });

  it("Should preserve APR and penalty snapshots", async function () {
    const { core } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await core.updatePlan(1n, 100n);

    const dep = await core.deposits(1n);

    expect((await core.plans(1n)).aprBps).to.equal(100n);
    expect(dep.aprBpsAtOpen).to.equal(300n);
    expect(dep.penaltyBpsAtOpen).to.equal(350n);
  });

  it("Should calculate interest with 6 decimals", async function () {
    const { core } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const expected =
      (USDC("1000") * 300n * 180n) / (365n * 10000n);

    expect(await core.calculateInterest(1n)).to.equal(expected);
    expect(expected).to.equal(14794520n);
  });

  it("Should reject maturity withdrawal before maturity", async function () {
    const { core, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await expect(
      core.connect(alice).withdrawAtMaturity(1n)
    ).to.revert(ethers);
  });

  it("Should allow maturity withdrawal at the exact boundary", async function () {
    const { core, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const dep = await core.deposits(1n);
    await networkHelpers.time.increaseTo(dep.maturityAt);

    await expect(core.connect(alice).withdrawAtMaturity(1n))
      .to.emit(core, "Withdrawn")
      .withArgs(
        1n,
        alice.address,
        USDC("1000"),
        await core.calculateInterest(1n),
        false
      );
  });

  it("Should pay principal and interest at maturity", async function () {
    const { core, token, vault, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const interest = await core.calculateInterest(1n);
    const before = await token.balanceOf(alice.address);
    const vaultBefore = await vault.vaultBalance();

    await reachMaturity(core);
    await core.connect(alice).withdrawAtMaturity(1n);

    expect(await token.balanceOf(alice.address))
      .to.equal(before + USDC("1000") + interest);

    expect(await vault.vaultBalance())
      .to.equal(vaultBefore - interest);

    expect((await core.deposits(1n)).status).to.equal(1n);
  });

  it("Should reject double withdrawal", async function () {
    const { core, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await reachMaturity(core);
    await core.connect(alice).withdrawAtMaturity(1n);

    await expect(
      core.connect(alice).withdrawAtMaturity(1n)
    ).to.revert(ethers);
  });

  it("Should apply 3.5 percent early withdrawal penalty", async function () {
    const { core, token, vault, alice, feeReceiver } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const vaultBefore = await vault.vaultBalance();
    const before = await token.balanceOf(alice.address);

    await core.connect(alice).earlyWithdraw(1n);

    expect(await token.balanceOf(alice.address))
      .to.equal(before + USDC("965"));

    expect(await token.balanceOf(feeReceiver.address))
      .to.equal(USDC("35"));

    expect(await vault.vaultBalance()).to.equal(vaultBefore);
    expect((await core.deposits(1n)).status).to.equal(1n);
  });

  it("Should allow current NFT owner to withdraw", async function () {
    const { core, token, alice, bob } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await core.connect(alice).transferFrom(
      alice.address, bob.address, 1n
    );

    expect(await core.ownerOf(1n)).to.equal(bob.address);

    await expect(
      core.connect(alice).earlyWithdraw(1n)
    ).to.revert(ethers);

    const before = await token.balanceOf(bob.address);

    await core.connect(bob).earlyWithdraw(1n);

    expect(await token.balanceOf(bob.address))
      .to.equal(before + USDC("965"));
  });

  it("Should manually renew with compounded principal", async function () {
    const { core, token, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const interest = await core.calculateInterest(1n);

    await reachMaturity(core);

    await core.connect(alice).renewDeposit(1n, 1n);

    const newDeposit = await core.deposits(2n);

    expect(newDeposit.principal).to.equal(USDC("1000") + interest);
    expect(newDeposit.aprBpsAtOpen).to.equal(300n);
    expect(await core.ownerOf(2n)).to.equal(alice.address);
    expect((await core.deposits(1n)).status).to.equal(2n);

    expect(await token.balanceOf(await core.getAddress()))
      .to.equal(USDC("1000") + interest);
  });

  it("Should use current plan APR for manual renew", async function () {
    const { core, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await core.updatePlan(1n, 200n);
    await reachMaturity(core);

    await core.connect(alice).renewDeposit(1n, 1n);

    expect((await core.deposits(2n)).aprBpsAtOpen).to.equal(200n);
  });

  it("Should reject auto renew before grace period", async function () {
    const { core, bot } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await reachMaturity(core);

    await expect(
      core.connect(bot).autoRenewDeposit(1n)
    ).to.revert(ethers);
  });

  it("Should auto renew after 3 days and preserve APR", async function () {
    const { core, alice, bot } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const original = await core.deposits(1n);
    const interest = await core.calculateInterest(1n);

    await core.updatePlan(1n, 100n);

    await networkHelpers.time.increaseTo(
      original.maturityAt + BigInt(3 * DAY)
    );

    await core.connect(bot).autoRenewDeposit(1n);

    const renewed = await core.deposits(2n);

    expect(renewed.principal).to.equal(USDC("1000") + interest);
    expect(renewed.aprBpsAtOpen).to.equal(300n);
    expect(renewed.tenorDays).to.equal(180n);
    expect(await core.ownerOf(2n)).to.equal(alice.address);
    expect((await core.deposits(1n)).status).to.equal(3n);
  });

  it("Should enforce the exact grace-period boundary", async function () {
    const { core, alice, bot } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const dep = await core.deposits(1n);
    const boundary = dep.maturityAt + BigInt(3 * DAY);

    await networkHelpers.time.increaseTo(boundary);

    await expect(
      core.connect(alice).renewDeposit(1n, 1n)
    ).to.revert(ethers);

    await expect(core.connect(bot).autoRenewDeposit(1n))
      .to.emit(core, "Renewed");
  });

  it("Should reject manual renew after grace period", async function () {
    const { core, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const dep = await core.deposits(1n);

    await networkHelpers.time.increaseTo(
      dep.maturityAt + BigInt(3 * DAY)
    );

    await expect(
      core.connect(alice).renewDeposit(1n, 1n)
    ).to.revert(ethers);
  });

  it("Should reject interest payout if vault is empty", async function () {
    const { core, vault, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const balance = await vault.vaultBalance();
    await vault.withdrawVault(balance);

    await reachMaturity(core);

    await expect(
      core.connect(alice).withdrawAtMaturity(1n)
    ).to.revert(ethers);

    expect((await core.deposits(1n)).status).to.equal(0n);
  });

  it("Should block withdrawal while paused", async function () {
    const { core, vault, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await vault.pause();

    await expect(
      core.connect(alice).earlyWithdraw(1n)
    ).to.revert(ethers);

    await reachMaturity(core);

    await expect(
      core.connect(alice).withdrawAtMaturity(1n)
    ).to.revert(ethers);
  });

  it("Should block renewal while paused", async function () {
    const { core, vault, alice, bot } =
      await networkHelpers.loadFixture(openedDepositFixture);

    const dep = await core.deposits(1n);

    await vault.pause();

    await networkHelpers.time.increaseTo(dep.maturityAt);

    await expect(
      core.connect(alice).renewDeposit(1n, 1n)
    ).to.revert(ethers);

    await networkHelpers.time.increaseTo(
      dep.maturityAt + BigInt(3 * DAY)
    );

    await expect(
      core.connect(bot).autoRenewDeposit(1n)
    ).to.revert(ethers);
  });

  it("Should reject a second renewal of old NFT", async function () {
    const { core, alice } =
      await networkHelpers.loadFixture(openedDepositFixture);

    await reachMaturity(core);

    await core.connect(alice).renewDeposit(1n, 1n);

    await expect(
      core.connect(alice).renewDeposit(1n, 1n)
    ).to.revert(ethers);
  });
});
