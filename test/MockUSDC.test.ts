
import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

describe("MockUSDC", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const token = await ethers.deployContract("MockUSDC");
    await token.waitForDeployment();

    return { token, owner, alice, bob };
  }

  it("Should have the correct name and symbol", async function () {
    const { token } = await networkHelpers.loadFixture(deployFixture);

    expect(await token.name()).to.equal("Mock USD Coin");
    expect(await token.symbol()).to.equal("mUSDC");
  });

  it("Should use 6 decimals", async function () {
    const { token } = await networkHelpers.loadFixture(deployFixture);

    expect(await token.decimals()).to.equal(6n);
  });

  it("Should start with zero total supply", async function () {
    const { token } = await networkHelpers.loadFixture(deployFixture);

    expect(await token.totalSupply()).to.equal(0n);
  });

  it("Should mint 1000 USDC correctly", async function () {
    const { token, alice } =
      await networkHelpers.loadFixture(deployFixture);

    const amount = ethers.parseUnits("1000", 6);

    await token.mint(alice.address, amount);

    expect(await token.balanceOf(alice.address)).to.equal(amount);
    expect(await token.totalSupply()).to.equal(amount);
  });

  it("Should allow public minting for testing", async function () {
    const { token, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    const amount = ethers.parseUnits("50", 6);

    await token.connect(alice).mint(bob.address, amount);

    expect(await token.balanceOf(bob.address)).to.equal(amount);
  });

  it("Should transfer tokens correctly", async function () {
    const { token, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    await token.mint(alice.address, ethers.parseUnits("1000", 6));

    await token
      .connect(alice)
      .transfer(bob.address, ethers.parseUnits("100", 6));

    expect(await token.balanceOf(alice.address)).to.equal(
      ethers.parseUnits("900", 6)
    );

    expect(await token.balanceOf(bob.address)).to.equal(
      ethers.parseUnits("100", 6)
    );
  });

  it("Should approve token allowance", async function () {
    const { token, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    const amount = ethers.parseUnits("500", 6);

    await token.connect(alice).approve(bob.address, amount);

    expect(
      await token.allowance(alice.address, bob.address)
    ).to.equal(amount);
  });

  it("Should transferFrom using an approved allowance", async function () {
    const { token, owner, alice, bob } =
      await networkHelpers.loadFixture(deployFixture);

    await token.mint(alice.address, ethers.parseUnits("1000", 6));

    await token
      .connect(alice)
      .approve(bob.address, ethers.parseUnits("300", 6));

    await token
      .connect(bob)
      .transferFrom(
        alice.address,
        owner.address,
        ethers.parseUnits("200", 6)
      );

    expect(await token.balanceOf(alice.address)).to.equal(
      ethers.parseUnits("800", 6)
    );

    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.parseUnits("200", 6)
    );

    expect(await token.allowance(alice.address, bob.address)).to.equal(
      ethers.parseUnits("100", 6)
    );
  });

it("Should reject transfers exceeding balance", async function () {
  const { token, alice, bob } =
    await networkHelpers.loadFixture(deployFixture);

  await expect(
    token.connect(alice).transfer(bob.address, 1n)
  ).to.revert(ethers);
});

it("Should reject transferFrom without allowance", async function () {
  const { token, alice, bob } =
    await networkHelpers.loadFixture(deployFixture);

  await token.mint(alice.address, ethers.parseUnits("100", 6));

  await expect(
    token.connect(bob).transferFrom(
      alice.address,
      bob.address,
      ethers.parseUnits("10", 6)
    )
  ).to.revert(ethers);
  });
});
