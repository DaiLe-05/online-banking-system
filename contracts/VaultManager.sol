
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VaultManager
 * @notice Manages the bank's interest liquidity.
 * @dev User principal is held separately by SavingCore.
 */
contract VaultManager is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    address public savingCore;
    address public feeReceiver;

    event VaultFunded(address indexed admin, uint256 amount);
    event VaultWithdrawn(address indexed admin, uint256 amount);
    event InterestPaid(address indexed receiver, uint256 amount);
    event FeeReceiverUpdated(address indexed oldReceiver, address indexed newReceiver);
    event SavingCoreConfigured(address indexed savingCore);

    modifier onlySavingCore() {
        require(msg.sender == savingCore, "Only SavingCore");
        _;
    }

    constructor(
        address tokenAddress,
        address initialFeeReceiver
    ) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token");
        require(initialFeeReceiver != address(0), "Invalid fee receiver");

        token = IERC20(tokenAddress);
        feeReceiver = initialFeeReceiver;
    }

    /**
     * @notice Connects SavingCore to this vault.
     * @dev Can only be configured once.
     */
    function setSavingCore(address core) external onlyOwner {
        require(core != address(0), "Invalid SavingCore");
        require(savingCore == address(0), "SavingCore already set");

        savingCore = core;

        emit SavingCoreConfigured(core);
    }

    /**
     * @notice Admin deposits tokens to fund interest payments.
     */
    function fundVault(uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(amount > 0, "Amount must be positive");

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit VaultFunded(msg.sender, amount);
    }

    /**
     * @notice Admin withdraws available interest liquidity.
     * @dev Base assignment behavior; no solvency guard (C2 bonus).
     */
    function withdrawVault(uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        require(amount > 0, "Amount must be positive");
        require(amount <= token.balanceOf(address(this)), "Insufficient vault");

        token.safeTransfer(msg.sender, amount);

        emit VaultWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Pays interest requested by SavingCore.
     */
    function payInterest(address receiver, uint256 amount)
        external
        onlySavingCore
        whenNotPaused
        nonReentrant
    {
        require(receiver != address(0), "Invalid receiver");
        require(amount <= token.balanceOf(address(this)), "Insufficient vault");

        if (amount > 0) {
            token.safeTransfer(receiver, amount);
        }

        emit InterestPaid(receiver, amount);
    }

    /**
     * @notice Updates the penalty fee receiver.
     */
    function setFeeReceiver(address newReceiver)
        external
        onlyOwner
    {
        require(newReceiver != address(0), "Invalid receiver");

        address oldReceiver = feeReceiver;
        feeReceiver = newReceiver;

        emit FeeReceiverUpdated(oldReceiver, newReceiver);
    }

    /**
     * @notice Emergency pause.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Restore normal operation.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Returns current interest liquidity.
     */
    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
