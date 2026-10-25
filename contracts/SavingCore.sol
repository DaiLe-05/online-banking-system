
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IInterestVault {
    function token() external view returns (address);
    function feeReceiver() external view returns (address);
    function paused() external view returns (bool);
    function payInterest(address receiver, uint256 amount) external;
}

/**
 * @title SavingCore
 * @notice Blockchain term deposits represented by ERC721 NFTs.
 * @dev Holds user principal; bank interest is held by VaultManager.
 */
contract SavingCore is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant YEAR_SECONDS = 365 days;

    // Personal variant: student ID ends in 14.
    uint256 public constant GRACE_PERIOD = 3 days;
    uint256 public constant DEFAULT_APR_BPS = 300;
    uint256 public constant DEFAULT_PENALTY_BPS = 350;
    uint256 public constant DEFAULT_TENOR_DAYS = 180;

    IERC20 public immutable token;
    IInterestVault public immutable vault;

    uint256 public nextPlanId = 1;
    uint256 public nextDepositId = 1;

    enum DepositStatus {
        Active,
        Withdrawn,
        ManualRenewed,
        AutoRenewed
    }

    struct SavingPlan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }

    struct Deposit {
        uint256 planId;
        uint256 principal;
        uint256 startAt;
        uint256 maturityAt;
        uint256 tenorDays;
        uint256 aprBpsAtOpen;
        uint256 penaltyBpsAtOpen;
        DepositStatus status;
    }

    mapping(uint256 => SavingPlan) public plans;
    mapping(uint256 => Deposit) public deposits;

    event PlanCreated(
        uint256 indexed planId,
        uint256 tenorDays,
        uint256 aprBps
    );

    event PlanUpdated(
        uint256 indexed planId,
        uint256 newAprBps
    );

    event PlanEnabled(uint256 indexed planId, bool enabled);

    event DepositOpened(
        uint256 indexed depositId,
        address indexed owner,
        uint256 indexed planId,
        uint256 principal,
        uint256 maturityAt,
        uint256 aprBpsAtOpen
    );

    event Withdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 principal,
        uint256 interest,
        bool isEarly
    );

    event Renewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        uint256 newPrincipal,
        uint256 newPlanId
    );

    constructor(
        address tokenAddress,
        address vaultAddress
    ) ERC721("Saving Deposit Certificate", "SDC")
      Ownable(msg.sender)
    {
        require(tokenAddress != address(0), "Invalid token");
        require(vaultAddress != address(0), "Invalid vault");
        require(
            IInterestVault(vaultAddress).token() == tokenAddress,
            "Vault token mismatch"
        );

        token = IERC20(tokenAddress);
        vault = IInterestVault(vaultAddress);

        plans[nextPlanId] = SavingPlan({
            tenorDays: DEFAULT_TENOR_DAYS,
            aprBps: DEFAULT_APR_BPS,
            minDeposit: 0,
            maxDeposit: 0,
            earlyWithdrawPenaltyBps: DEFAULT_PENALTY_BPS,
            enabled: true
        });

        emit PlanCreated(
            nextPlanId,
            DEFAULT_TENOR_DAYS,
            DEFAULT_APR_BPS
        );

        nextPlanId++;
    }

    modifier whenSystemActive() {
        require(!vault.paused(), "System paused");
        _;
    }

    modifier onlyCertificateOwner(uint256 depositId) {
        require(
            ownerOf(depositId) == msg.sender,
            "Not certificate owner"
        );
        _;
    }

    modifier onlyActiveDeposit(uint256 depositId) {
        require(
            deposits[depositId].status == DepositStatus.Active,
            "Deposit not active"
        );
        _;
    }

    // ------------------------------------------------------------
    // ADMIN: SAVING PLANS
    // ------------------------------------------------------------

    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 penaltyBps
    ) external onlyOwner returns (uint256) {
        require(tenorDays > 0, "Invalid tenor");
        require(aprBps <= BPS_DENOMINATOR, "Invalid APR");
        require(penaltyBps <= BPS_DENOMINATOR, "Invalid penalty");
        require(
            maxDeposit == 0 || minDeposit <= maxDeposit,
            "Invalid deposit limits"
        );

        uint256 planId = nextPlanId++;

        plans[planId] = SavingPlan({
            tenorDays: tenorDays,
            aprBps: aprBps,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            earlyWithdrawPenaltyBps: penaltyBps,
            enabled: true
        });

        emit PlanCreated(planId, tenorDays, aprBps);

        return planId;
    }

    function updatePlan(
        uint256 planId,
        uint256 newAprBps
    ) external onlyOwner {
        require(_planExists(planId), "Plan not found");
        require(newAprBps <= BPS_DENOMINATOR, "Invalid APR");

        plans[planId].aprBps = newAprBps;

        emit PlanUpdated(planId, newAprBps);
    }

    function enablePlan(uint256 planId) external onlyOwner {
        _setPlanEnabled(planId, true);
    }

    function disablePlan(uint256 planId) external onlyOwner {
        _setPlanEnabled(planId, false);
    }

    function _setPlanEnabled(
        uint256 planId,
        bool enabled
    ) internal {
        require(_planExists(planId), "Plan not found");

        plans[planId].enabled = enabled;

        emit PlanEnabled(planId, enabled);
    }

    function _planExists(uint256 planId)
        internal
        view
        returns (bool)
    {
        return planId > 0 && planId < nextPlanId;
    }

    // ------------------------------------------------------------
    // OPEN DEPOSIT
    // ------------------------------------------------------------

    function openDeposit(
        uint256 planId,
        uint256 amount
    ) external nonReentrant whenSystemActive returns (uint256) {
        require(_planExists(planId), "Plan not found");

        SavingPlan memory plan = plans[planId];

        require(plan.enabled, "Plan disabled");
        require(amount > 0, "Zero deposit");
        require(amount >= plan.minDeposit, "Below minimum");

        if (plan.maxDeposit != 0) {
            require(amount <= plan.maxDeposit, "Above maximum");
        }

        token.safeTransferFrom(msg.sender, address(this), amount);

        return _mintDeposit(
            msg.sender,
            planId,
            amount,
            plan.tenorDays,
            plan.aprBps,
            plan.earlyWithdrawPenaltyBps
        );
    }

    function _mintDeposit(
        address receiver,
        uint256 planId,
        uint256 amount,
        uint256 tenorDays,
        uint256 aprBps,
        uint256 penaltyBps
    ) internal returns (uint256) {
        uint256 depositId = nextDepositId++;
        uint256 maturity = block.timestamp + tenorDays * 1 days;

        deposits[depositId] = Deposit({
            planId: planId,
            principal: amount,
            startAt: block.timestamp,
            maturityAt: maturity,
            tenorDays: tenorDays,
            aprBpsAtOpen: aprBps,
            penaltyBpsAtOpen: penaltyBps,
            status: DepositStatus.Active
        });

        _safeMint(receiver, depositId);

        emit DepositOpened(
            depositId,
            receiver,
            planId,
            amount,
            maturity,
            aprBps
        );

        return depositId;
    }

    // ------------------------------------------------------------
    // INTEREST
    // ------------------------------------------------------------

    function calculateInterest(uint256 depositId)
        public
        view
        returns (uint256)
    {
        ownerOf(depositId);

        Deposit storage dep = deposits[depositId];

        return (
            dep.principal *
            dep.aprBpsAtOpen *
            dep.tenorDays *
            1 days
        ) / (YEAR_SECONDS * BPS_DENOMINATOR);
    }

    // ------------------------------------------------------------
    // WITHDRAW AT MATURITY
    // ------------------------------------------------------------

    function withdrawAtMaturity(uint256 depositId)
        external
        nonReentrant
        whenSystemActive
        onlyCertificateOwner(depositId)
        onlyActiveDeposit(depositId)
    {
        Deposit storage dep = deposits[depositId];

        require(block.timestamp >= dep.maturityAt, "Not matured");

        uint256 principal = dep.principal;
        uint256 interest = calculateInterest(depositId);

        dep.status = DepositStatus.Withdrawn;

        // Interest comes from the bank vault.
        vault.payInterest(msg.sender, interest);

        // Principal comes from SavingCore.
        token.safeTransfer(msg.sender, principal);

        emit Withdrawn(
            depositId,
            msg.sender,
            principal,
            interest,
            false
        );
    }

    // ------------------------------------------------------------
    // EARLY WITHDRAWAL
    // ------------------------------------------------------------

    function earlyWithdraw(uint256 depositId)
        external
        nonReentrant
        whenSystemActive
        onlyCertificateOwner(depositId)
        onlyActiveDeposit(depositId)
    {
        Deposit storage dep = deposits[depositId];

        require(block.timestamp < dep.maturityAt, "Already matured");

        uint256 principal = dep.principal;

        uint256 penalty = (
            principal * dep.penaltyBpsAtOpen
        ) / BPS_DENOMINATOR;

        uint256 payout = principal - penalty;

        dep.status = DepositStatus.Withdrawn;

        if (penalty > 0) {
            token.safeTransfer(vault.feeReceiver(), penalty);
        }

        token.safeTransfer(msg.sender, payout);

        emit Withdrawn(
            depositId,
            msg.sender,
            principal,
            0,
            true
        );
    }

    // ------------------------------------------------------------
    // MANUAL RENEW
    // ------------------------------------------------------------

    function renewDeposit(
        uint256 depositId,
        uint256 newPlanId
    )
        external
        nonReentrant
        whenSystemActive
        onlyCertificateOwner(depositId)
        onlyActiveDeposit(depositId)
        returns (uint256)
    {
        Deposit storage oldDeposit = deposits[depositId];

        require(block.timestamp >= oldDeposit.maturityAt, "Not matured");

        require(
            block.timestamp < oldDeposit.maturityAt + GRACE_PERIOD,
            "Grace period ended"
        );

        require(_planExists(newPlanId), "Plan not found");

        SavingPlan memory newPlan = plans[newPlanId];

        require(newPlan.enabled, "Plan disabled");

        uint256 interest = calculateInterest(depositId);
        uint256 newPrincipal = oldDeposit.principal + interest;

        require(
            newPrincipal >= newPlan.minDeposit,
            "Below minimum"
        );

        if (newPlan.maxDeposit != 0) {
            require(
                newPrincipal <= newPlan.maxDeposit,
                "Above maximum"
            );
        }

        oldDeposit.status = DepositStatus.ManualRenewed;

        // Capitalize interest into the new principal.
        vault.payInterest(address(this), interest);

        uint256 newDepositId = _mintDeposit(
            msg.sender,
            newPlanId,
            newPrincipal,
            newPlan.tenorDays,
            newPlan.aprBps,
            newPlan.earlyWithdrawPenaltyBps
        );

        emit Renewed(
            depositId,
            newDepositId,
            newPrincipal,
            newPlanId
        );

        return newDepositId;
    }

    // ------------------------------------------------------------
    // AUTO RENEW
    // ------------------------------------------------------------

    function autoRenewDeposit(uint256 depositId)
        external
        nonReentrant
        whenSystemActive
        onlyActiveDeposit(depositId)
        returns (uint256)
    {
        Deposit storage oldDeposit = deposits[depositId];

        require(
            block.timestamp >= oldDeposit.maturityAt + GRACE_PERIOD,
            "Grace period not ended"
        );

        address certificateOwner = ownerOf(depositId);

        uint256 interest = calculateInterest(depositId);
        uint256 newPrincipal = oldDeposit.principal + interest;

        // Snapshot original terms before modifying status.
        uint256 planId = oldDeposit.planId;
        uint256 tenorDays = oldDeposit.tenorDays;
        uint256 aprBps = oldDeposit.aprBpsAtOpen;
        uint256 penaltyBps = oldDeposit.penaltyBpsAtOpen;

        oldDeposit.status = DepositStatus.AutoRenewed;

        vault.payInterest(address(this), interest);

        uint256 newDepositId = _mintDeposit(
            certificateOwner,
            planId,
            newPrincipal,
            tenorDays,
            aprBps,
            penaltyBps
        );

        emit Renewed(
            depositId,
            newDepositId,
            newPrincipal,
            planId
        );

        return newDepositId;
    }
}
