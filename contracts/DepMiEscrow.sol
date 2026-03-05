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
 *         Each order is isolated in its own mapping slot — funds for one order
 *         cannot be accessed via another order's functions.
 *
 * Flow:
 *   1. Buyer calls createOrder() — sends USDC, funds locked in HELD state
 *   2. Seller ships, buyer calls confirmDelivery() — 5% fee to platform, rest to seller
 *   3. If issue: buyer calls raiseDispute() — funds frozen until admin resolves
 *   4. Admin calls adminResolve(orderId, refundBuyer) — either refunds or releases
 *
 * Security:
 *   - ReentrancyGuard on all fund-moving functions
 *   - Pausable: admin can halt new orders on emergency
 *   - Emergency withdraw: timelocked, returns funds to buyer only
 *   - Multisig recommended for owner address (use Gnosis Safe)
 *
 * Deploy to: Base Sepolia (testnet) first, then Base mainnet
 * USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (mainnet)
 *              0x036CbD53842c5426634e7929541eC2318f3dCF7e (Sepolia testnet)
 */
contract DepMiEscrow is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ── Constants ────────────────────────────────────────────────────────────

    IERC20 public immutable USDC;
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5% = 500 basis points
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant DISPUTE_WINDOW = 7 days; // Auto-release if no dispute after 7d
    uint256 public constant EMERGENCY_TIMELOCK = 48 hours;

    // ── State ────────────────────────────────────────────────────────────────

    address public feeRecipient; // Platform wallet (use multisig Gnosis Safe)

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
        uint256 amount;          // USDC amount in 6-decimal units
        uint256 platformFee;     // Pre-computed 5% fee
        OrderStatus status;
        uint256 createdAt;
        uint256 confirmedAt;     // When shipped/delivered — starts dispute window
    }

    mapping(bytes32 => Order) public orders;

    // Emergency withdraw requests (timelocked)
    struct EmergencyRequest {
        bytes32 orderId;
        uint256 requestedAt;
        bool executed;
    }
    mapping(bytes32 => EmergencyRequest) public emergencyRequests;

    // ── Events ───────────────────────────────────────────────────────────────

    event OrderCreated(bytes32 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event OrderConfirmed(bytes32 indexed orderId, uint256 sellerAmount, uint256 fee);
    event DisputeRaised(bytes32 indexed orderId, address indexed buyer);
    event DisputeResolved(bytes32 indexed orderId, bool refundedBuyer);
    event EmergencyRequested(bytes32 indexed orderId, uint256 executeAfter);
    event EmergencyExecuted(bytes32 indexed orderId);

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdc, address _feeRecipient) Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        feeRecipient = _feeRecipient;
    }

    // ── Core Functions ───────────────────────────────────────────────────────

    /**
     * @notice Buyer creates an escrow order. Must approve USDC spend first.
     * @param orderId  Unique ID from DepMi backend (keccak256 of DB order UUID)
     * @param seller   Seller's wallet address
     * @param amount   USDC amount in 6-decimal units (e.g. 60_000_000 = 60 USDC)
     */
    function createOrder(
        bytes32 orderId,
        address seller,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(orders[orderId].status == OrderStatus.NONE, "Order already exists");
        require(seller != address(0), "Invalid seller");
        require(seller != msg.sender, "Cannot buy from yourself");
        require(amount > 0, "Amount must be > 0");

        uint256 platformFee = (amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            platformFee: platformFee,
            status: OrderStatus.HELD,
            createdAt: block.timestamp,
            confirmedAt: 0
        });

        USDC.safeTransferFrom(msg.sender, address(this), amount);

        emit OrderCreated(orderId, msg.sender, seller, amount);
    }

    /**
     * @notice Buyer confirms delivery — releases funds to seller minus platform fee.
     *         Can also auto-trigger after DISPUTE_WINDOW if seller marked shipped.
     */
    function confirmDelivery(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.HELD, "Order not in HELD state");
        require(
            msg.sender == order.buyer ||
            (order.confirmedAt > 0 && block.timestamp >= order.confirmedAt + DISPUTE_WINDOW),
            "Only buyer can confirm, or dispute window must have passed"
        );

        uint256 sellerAmount = order.amount - order.platformFee;
        order.status = OrderStatus.RELEASED;

        USDC.safeTransfer(order.seller, sellerAmount);
        USDC.safeTransfer(feeRecipient, order.platformFee);

        emit OrderConfirmed(orderId, sellerAmount, order.platformFee);
    }

    /**
     * @notice Marks the order as shipped (called by backend/seller via owner or relayer).
     *         Starts the DISPUTE_WINDOW countdown for auto-release.
     */
    function markShipped(bytes32 orderId) external onlyOwner {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.HELD, "Order not in HELD state");
        require(order.confirmedAt == 0, "Already marked shipped");
        order.confirmedAt = block.timestamp;
    }

    /**
     * @notice Buyer raises a dispute — freezes the order.
     *         Must be called before DISPUTE_WINDOW expires.
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
     * @notice Admin resolves a dispute. Owner should be a Gnosis Safe multisig.
     * @param refundBuyer  true = refund buyer, false = release to seller
     */
    function adminResolve(bytes32 orderId, bool refundBuyer) external onlyOwner nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.DISPUTED, "Order not disputed");

        if (refundBuyer) {
            order.status = OrderStatus.REFUNDED;
            USDC.safeTransfer(order.buyer, order.amount);
        } else {
            uint256 sellerAmount = order.amount - order.platformFee;
            order.status = OrderStatus.RELEASED;
            USDC.safeTransfer(order.seller, sellerAmount);
            USDC.safeTransfer(feeRecipient, order.platformFee);
        }

        emit DisputeResolved(orderId, refundBuyer);
    }

    // ── Emergency Functions (timelocked) ─────────────────────────────────────

    /**
     * @notice Initiates a 48-hour timelocked emergency withdrawal.
     *         Emits an on-chain event visible to all users.
     *         Only for critical bugs where funds would otherwise be lost.
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
     * @notice Executes emergency withdrawal after timelock expires.
     *         Always returns funds to BUYER, never to platform.
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

        emit EmergencyExecuted(orderId);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function setFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Invalid address");
        feeRecipient = newRecipient;
    }

    // ── View Helpers ─────────────────────────────────────────────────────────

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    /**
     * @notice Helper: convert a DepMi DB UUID string to bytes32 orderId
     *         Call this off-chain to get the orderId for createOrder().
     */
    function toOrderId(string calldata uuid) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(uuid));
    }
}
