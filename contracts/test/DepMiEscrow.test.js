const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DepMiEscrow", function () {
  let escrow, usdc;
  let owner, buyer, seller, feeRecipient, other;

  // AMOUNT = total buyer deposits (includes 5% buyer gateway + 1.5% buffer)
  // SELLER_PAYOUT = what seller receives (95% of base = ~90.5% of total deposit)
  // DEPMI_CUT = AMOUNT - SELLER_PAYOUT (~9.5% — covers gateway + seller fee + buffer)
  const AMOUNT = ethers.parseUnits("100", 6);        // 100 USDC buyer deposits
  const SELLER_PAYOUT = ethers.parseUnits("90", 6);  // 90 USDC to seller on delivery
  const DEPMI_CUT = AMOUNT - SELLER_PAYOUT;          // 10 USDC to DepMi
  const CANCEL_FEE_BPS = 500n;                       // 5% buyer-fault cancel penalty
  const BPS_DENOM = 10_000n;

  beforeEach(async function () {
    [owner, buyer, seller, feeRecipient, other] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.mint(buyer.address, ethers.parseUnits("10000", 6));

    const DepMiEscrow = await ethers.getContractFactory("DepMiEscrow");
    escrow = await DepMiEscrow.deploy(await usdc.getAddress(), feeRecipient.address);
  });

  function orderId(str) {
    return ethers.keccak256(ethers.toUtf8Bytes(str));
  }

  async function createOrder(id = "order-1") {
    await usdc.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await escrow.connect(buyer).createOrder(orderId(id), seller.address, AMOUNT, SELLER_PAYOUT);
  }

  // ── Core flow ──────────────────────────────────────────────────────────────

  it("creates an order and locks USDC", async function () {
    await createOrder();
    const order = await escrow.getOrder(orderId("order-1"));
    expect(order.status).to.equal(1); // HELD
    expect(order.amount).to.equal(AMOUNT);
    expect(order.sellerPayout).to.equal(SELLER_PAYOUT);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
  });

  it("confirmDelivery: seller gets sellerPayout, DepMi gets the rest", async function () {
    await createOrder();
    const sellerBefore = await usdc.balanceOf(seller.address);
    const feeBefore = await usdc.balanceOf(feeRecipient.address);

    await escrow.connect(buyer).confirmDelivery(orderId("order-1"));

    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + SELLER_PAYOUT);
    expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore + DEPMI_CUT);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("dispute + adminResolve: buyer wins → full amount refunded (seller fault)", async function () {
    await createOrder();
    await escrow.connect(buyer).raiseDispute(orderId("order-1"));

    const buyerBefore = await usdc.balanceOf(buyer.address);
    await escrow.connect(owner).adminResolve(orderId("order-1"), true);

    // Buyer gets everything back including fees they paid
    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + AMOUNT);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("dispute + adminResolve: seller wins → seller gets sellerPayout, DepMi gets rest (buyer fault)", async function () {
    await createOrder();
    await escrow.connect(buyer).raiseDispute(orderId("order-1"));

    const sellerBefore = await usdc.balanceOf(seller.address);
    const feeBefore = await usdc.balanceOf(feeRecipient.address);
    await escrow.connect(owner).adminResolve(orderId("order-1"), false);

    expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + SELLER_PAYOUT);
    expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore + DEPMI_CUT);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  // ── cancelOrder ────────────────────────────────────────────────────────────

  it("cancelOrder buyer fault: buyer gets 95%, DepMi gets 5%", async function () {
    await createOrder();
    const buyerBefore = await usdc.balanceOf(buyer.address);
    const feeBefore = await usdc.balanceOf(feeRecipient.address);

    await escrow.connect(owner).cancelOrder(orderId("order-1"), true);

    const cancelFee = (AMOUNT * CANCEL_FEE_BPS) / BPS_DENOM;
    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + AMOUNT - cancelFee);
    expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore + cancelFee);
  });

  it("cancelOrder seller fault: buyer gets 100%, no fee", async function () {
    await createOrder();
    const buyerBefore = await usdc.balanceOf(buyer.address);
    const feeBefore = await usdc.balanceOf(feeRecipient.address);

    await escrow.connect(owner).cancelOrder(orderId("order-1"), false);

    expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + AMOUNT);
    expect(await usdc.balanceOf(feeRecipient.address)).to.equal(feeBefore);
  });

  // ── teamEmergencyDrain ─────────────────────────────────────────────────────

  it("teamEmergencyDrain: drains all USDC to recipient after 48h pause", async function () {
    await createOrder();

    await escrow.connect(owner).pause();

    // Simulate 48h passing
    await ethers.provider.send("evm_increaseTime", [48 * 3600 + 1]);
    await ethers.provider.send("evm_mine");

    const recipientBefore = await usdc.balanceOf(feeRecipient.address);
    await escrow.connect(owner).teamEmergencyDrain(feeRecipient.address);

    expect(await usdc.balanceOf(feeRecipient.address)).to.equal(recipientBefore + AMOUNT);
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(0);
  });

  it("teamEmergencyDrain: cannot drain before 48h", async function () {
    await createOrder();
    await escrow.connect(owner).pause();

    await expect(
      escrow.connect(owner).teamEmergencyDrain(feeRecipient.address)
    ).to.be.revertedWith("48h timelock not expired");
  });

  it("teamEmergencyDrain: cannot drain without pause", async function () {
    await createOrder();
    await expect(
      escrow.connect(owner).teamEmergencyDrain(feeRecipient.address)
    ).to.be.reverted; // reverts with whenPaused
  });

  // ── Access control ─────────────────────────────────────────────────────────

  it("non-owner cannot call cancelOrder", async function () {
    await createOrder();
    await expect(
      escrow.connect(other).cancelOrder(orderId("order-1"), true)
    ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
  });

  it("non-owner cannot call adminResolve", async function () {
    await createOrder();
    await escrow.connect(buyer).raiseDispute(orderId("order-1"));
    await expect(
      escrow.connect(other).adminResolve(orderId("order-1"), true)
    ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
  });

  // ── sellerPayout validation ────────────────────────────────────────────────

  it("rejects order where sellerPayout >= amount", async function () {
    await usdc.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await expect(
      escrow.connect(buyer).createOrder(orderId("bad"), seller.address, AMOUNT, AMOUNT)
    ).to.be.revertedWith("Seller payout must be less than amount");
  });

  it("rejects order where sellerPayout is zero", async function () {
    await usdc.connect(buyer).approve(await escrow.getAddress(), AMOUNT);
    await expect(
      escrow.connect(buyer).createOrder(orderId("bad"), seller.address, AMOUNT, 0)
    ).to.be.revertedWith("Seller payout must be > 0");
  });

  // ── Cancel fee update ──────────────────────────────────────────────────────

  it("owner can update cancel fee", async function () {
    await escrow.connect(owner).setCancelFeeBps(100); // 1%
    expect(await escrow.cancelFeeBps()).to.equal(100);
  });

  it("cancel fee cannot exceed 10%", async function () {
    await expect(
      escrow.connect(owner).setCancelFeeBps(1001)
    ).to.be.revertedWith("Fee cannot exceed 10%");
  });
});
