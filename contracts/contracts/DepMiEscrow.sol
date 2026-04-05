// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DepMiEscrow
 * @notice Single master escrow contract for all DepMi USDC orders on Base chain.
 *
 * Fee model (computed off-chain, enforced on-chain via sellerPayout):
 *   Buyer deposits:  ngnTotal × 1.05 / bufferedRate  (5% gateway fee + 1.5% slippage buffer)
 *   Seller receives: ngnTotal × 0.95 / bufferedRate  (5% seller fee deducted)
 *   DepMi keeps:     deposit - sellerPayout           (~10% + slippage buffer captured)
 *
 * Cancel policy (still percentage-based, simpler for penalty scenarios):
 *   - Seller fault: buyer gets 100%
 *   - Buyer fault:  buyer gets (amount - cancelFee), DepMi gets cancelFee (default 5%)
 *
 * Emergency:
 *   - Per-order: requestEmergencyWithdraw → executeEmergencyWithdraw (to buyer, 48h lock)
 *   - Full drain: pause() first, then teamEmergencyDrain() after 48h — sends ALL USDC to owner
 */
contract DepMiEscrow is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ── Constants ────────────────────────────────────────────────────────────

    IERC20 public immutable USDC;
    uint256 public cancelFeeBps = 500;           // 5% penalty on buyer-fault cancels
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DISPUTE_WINDOW = 7 days;
    uint256 public constant EMERGENCY_TIMELOCK = 48 hours;

    // ── State ────────────────────────────────────────────────────────────────

    address public feeRecipient; // DepMi treasury — receives all platform cuts

    uint256 public pausedAt;     // Timestamp when contract was paused (for team drain timelock)

    enum OrderStatus {
        NONE,
        HELD,       // Funds locked, awaiting delivery confirmation
        DISPUTED,   // Buyer opened dispute — frozen
        RELEASED,   // Released to seller
        REFUNDED    // Refunded to buyer
    }

    struct Order {
        address buyer;
        address seller;
        uint256 amount;        // Total USDC deposited by buyer (includes all fees + buffer)
        uint256 sellerPayout;  // Pre-computed amount seller receives on delivery (< amount)
        OrderStatus status;
        uint256 createdAt;
        uint256 confirmedAt;   // When shipped — starts dispute window for auto-release
    }

    mapping(bytes32 => Order) public orders;

    // Emergency withdraw per-order (timelocked, routes to buyer)
    struct EmergencyRequest {
        bytes32 orderId;
        uint256 requestedAt;
        bool executed;
    }
    mapping(bytes32 => EmergencyRequest) public emergencyRequests;

    // ── Events ───────────────────────────────────────────────────────────────

    event OrderCreated(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 amount, uint256 sellerPayout);
    event OrderConfirmed(bytes32 indexed orderId, uint256 sellerAmount, uint256 depmiAmount);
    event DisputeRaised(bytes32 indexed orderId, address indexed buyer);
    event DisputeResolved(bytes32 indexed orderId, bool refundedBuyer);
    event OrderCancelled(bytes32 indexed orderId, bool buyerFault);
    event EmergencyRequested(bytes32 indexed orderId, uint256 executeAfter);
    event EmergencyExecuted(bytes32 indexed orderId, address recipient);
    event TeamDrainExecuted(address indexed recipient, uint256 amount);

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdc, address _feeRecipient) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Buyer creates an escrow order. Must approve USDC spend first.
     * @param orderId      Unique ID from DepMi backend (keccak256 of DB order UUID)
     * @param seller       Seller's wallet address
     * @param amount       Total USDC deposited by buyer (6-decimal units)
     * @param sellerPayout USDC amount seller will receive on delivery (< amount)
     *                     DepMi captures: amount - sellerPayout (fees + slippage buffer)
     */
    function createOrder(
        bytes32 orderId,
        address seller,
        uint256 amount,
        uint256 sellerPayout
    ) external nonReentrant whenNotPaused {
        require(orders[orderId].status == OrderStatus.NONE, "Order already exists");
        require(seller != address(0), "Invalid seller");
        require(seller != msg.sender, "Cannot buy from yourself");
        require(amount > 0, "Amount must be > 0");
        require(sellerPayout < amount, "Seller payout must be less than amount");
        require(sellerPayout > 0, "Seller payout must be > 0");

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            sellerPayout: sellerPayout,
            status: OrderStatus.HELD,
            createdAt: block.timestamp,
            confirmedAt: 0
        });

        USDC.safeTransferFrom(msg.sender, address(this), amount);

        emit OrderCreated(orderId, msg.sender, seller, amount, sellerPayout);
    }

    /**
     * @notice Buyer confirms delivery — releases funds.
     *         Seller gets sellerPayout; DepMi gets the rest (fees + buffer).
     */
    function confirmDelivery(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.HELD, "Order not in HELD state");
        require(
            msg.sender == order.buyer ||
            (order.confirmedAt > 0 && block.timestamp >= order.confirmedAt + DISPUTE_WINDOW),
            "Only buyer can confirm, or dispute window must have passed"
        );

        uint256 depmiAmount = order.amount - order.sellerPayout;
        order.status = OrderStatus.RELEASED;

        USDC.safeTransfer(order.seller, order.sellerPayout);
        USDC.safeTransfer(feeRecipient, depmiAmount);

        emit OrderConfirmed(orderId, order.sellerPayout, depmiAmount);
    }

    /**
     * @notice Marks order shipped (called server-side). Starts the dispute window.
     */
    function markShipped(bytes32 orderId) external onlyOwner {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.HELD, "Order not in HELD state");
        require(order.confirmedAt == 0, "Already marked shipped");
        order.confirmedAt = block.timestamp;
    }

    /**
     * @notice Buyer raises a dispute — freezes the order until admin resolves.
     */
    function raiseDispute(bytes32 orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.HELD, "Order not in HELD state");
        require(msg.sender == order.buyer, "Only buyer can dispute");
        require(
            order.confirmedAt == 0 ||
            block.timestamp < order.confirmedAt + DISPUTE_WINDOW,
            "Dispute window expired"
        );

        order.status = OrderStatus.DISPUTED;
        emit DisputeRaised(orderId, msg.sender);
    }

    /**
     * @notice Admin resolves a dispute. Owner should be a Gnosis Safe multisig at scale.
     * @param refundBuyer  true = seller fault → 100% back to buyer
     *                     false = buyer fault → seller gets sellerPayout, DepMi gets rest
     */
    function adminResolve(bytes32 orderId, bool refundBuyer) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.DISPUTED, "Order not disputed");

        if (refundBuyer) {
            // Seller fault: buyer gets full amount (including buffer they paid)
            order.status = OrderStatus.REFUNDED;
            USDC.safeTransfer(order.buyer, order.amount);
        } else {
            // Buyer fault: seller gets their agreed payout, DepMi gets the rest
            uint256 depmiAmount = order.amount - order.sellerPayout;
            order.status = OrderStatus.RELEASED;
            USDC.safeTransfer(order.seller, order.sellerPayout);
            USDC.safeTransfer(feeRecipient, depmiAmount);
        }

        emit DisputeResolved(orderId, refundBuyer);
    }

    /**
     * @notice Owner cancels an order (buyer/seller cancellations after payment).
     * @param buyerFault  true = buyer cancelled → buyer gets (amount - cancelFee), DepMi gets fee
     *                    false = seller fault / seller cancelled → buyer gets 100%, no fee
     */
    function cancelOrder(bytes32 orderId, bool buyerFault) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.HELD, "Order not in HELD state");

        order.status = OrderStatus.REFUNDED;

        if (buyerFault) {
            uint256 cancelFee = (order.amount * cancelFeeBps) / BPS_DENOMINATOR;
            uint256 buyerRefund = order.amount - cancelFee;
            USDC.safeTransfer(order.buyer, buyerRefund);
            if (cancelFee > 0) USDC.safeTransfer(feeRecipient, cancelFee);
        } else {
            USDC.safeTransfer(order.buyer, order.amount);
        }

        emit OrderCancelled(orderId, buyerFault);
    }

    // ── Emergency Functions ───────────────────────────────────────────────────

    /**
     * @notice Initiates a 48-hour timelocked per-order emergency withdrawal.
     *         On execution, funds go to the order's buyer (not DepMi).
     *         Use for stuck orders due to contract bugs.
     */
    function requestEmergencyWithdraw(bytes32 orderId) external onlyOwner {
        require(orders[orderId].status == OrderStatus.HELD, "Only HELD orders");
        require(!emergencyRequests[orderId].executed, "Already executed");
        emergencyRequests[orderId] = EmergencyRequest({
            orderId: orderId,
            requestedAt: block.timestamp,
            executed: false
        });
        emit EmergencyRequested(orderId, block.timestamp + EMERGENCY_TIMELOCK);
    }

    /**
     * @notice Executes emergency withdrawal after timelock. Always returns funds to BUYER.
     */
    function executeEmergencyWithdraw(bytes32 orderId) external onlyOwner nonReentrant whenPaused {
        EmergencyRequest storage req = emergencyRequests[orderId];
        require(!req.executed, "Already executed");
        require(block.timestamp >= req.requestedAt + EMERGENCY_TIMELOCK, "Timelock not expired");

        Order storage order = orders[orderId];
        require(order.status == OrderStatus.HELD, "Order not in HELD state");

        req.executed = true;
        order.status = OrderStatus.REFUNDED;
        USDC.safeTransfer(order.buyer, order.amount);

        emit EmergencyExecuted(orderId, order.buyer);
    }

    /**
     * @notice TEAM EMERGENCY DRAIN — drains ALL USDC from this contract to `recipient`.
     *         Use only when the contract needs to be retired/migrated or a critical bug found.
     *
     *         Requirements:
     *           1. Contract must be paused (call pause() first)
     *           2. 48 hours must have elapsed since pause() — prevents hasty mistakes
     *           3. Only owner (should be DepMi multisig at scale)
     *
     *         After drain, manually redistribute funds to users off-chain.
     *         Emits TeamDrainExecuted for a permanent on-chain record.
     */
    function teamEmergencyDrain(address recipient) external onlyOwner nonReentrant whenPaused {
        require(recipient != address(0), "Invalid recipient");
        require(pausedAt > 0, "pausedAt not set: call pause() first");
        require(block.timestamp >= pausedAt + EMERGENCY_TIMELOCK, "48h timelock not expired");

        uint256 balance = USDC.balanceOf(address(this));
        require(balance > 0, "Nothing to drain");

        USDC.safeTransfer(recipient, balance);
        emit TeamDrainExecuted(recipient, balance);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function pause() external onlyOwner {
        pausedAt = block.timestamp; // Record when pause started (for drain timelock)
        _pause();
    }

    function unpause() external onlyOwner {
        pausedAt = 0;
        _unpause();
    }

    function setCancelFeeBps(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 1000, "Fee cannot exceed 10%");
        cancelFeeBps = newFeeBps;
    }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }

    // ── View Helpers ─────────────────────────────────────────────────────────

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /**
     * @notice Convert a DepMi DB UUID string to bytes32 orderId (call off-chain).
     */
    function toOrderId(string calldata uuid) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(uuid));
    }
}
