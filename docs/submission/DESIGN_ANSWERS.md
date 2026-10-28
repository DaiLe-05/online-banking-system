# Design Answers

Tài liệu này trả lời bảy quyết định thiết kế bằng chính cách dự án đã triển khai. Phiên bản cá nhân sử dụng **A = 4**, **B = 1** với bốn tham số: kỳ hạn **180 ngày**, APR **300 bps (3%)**, phí rút trước hạn **350 bps (3,5%)** và thời gian chờ **3 ngày**.

## 1. Ai có quyền rút hoặc gia hạn một khoản gửi?

Người đang sở hữu NFT của khoản gửi là người có quyền thao tác. Vì NFT có thể được chuyển sang ví khác, hợp đồng kiểm tra chủ sở hữu hiện tại thay vì chỉ nhớ người tạo ban đầu.

Code thật tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L147):

```solidity
modifier onlyCertificateOwner(uint256 depositId) {
    require(
        ownerOf(depositId) == msg.sender,
        "Not certificate owner"
    );
    _;
}
```

Các hàm rút và manual renew đều dùng `onlyCertificateOwner`. Bài test chuyển NFT cho người khác rồi rút tiền nằm trong [`test/SavingCore.test.ts`](../../test/SavingCore.test.ts).

## 2. Điều kiện của khoản gửi có bị thay đổi khi admin sửa gói không?

Không. Khi mở khoản gửi, hệ thống lưu lại kỳ hạn, APR và phí rút sớm vào chính deposit. Vì vậy, việc admin sửa gói chỉ áp dụng cho các khoản gửi mới.

Code thật tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L280):

```solidity
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
```

## 3. Tiền gốc và tiền dùng để trả lãi được giữ ở đâu?

Tiền gốc của người dùng được chuyển vào `SavingCore`. Quỹ dùng để trả lãi được nạp riêng vào `VaultManager`. Khi đáo hạn, tiền lãi đi từ vault còn tiền gốc đi từ core.

Code thật tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L344):

```solidity
dep.status = DepositStatus.Withdrawn;
vault.payInterest(msg.sender, interest);
token.safeTransfer(msg.sender, principal);
```

Cách tách này giúp không nhầm tiền gốc của khách hàng với quỹ lãi của hệ thống.

## 4. Nếu quỹ không đủ tiền trả lãi thì xử lý thế nào?

`VaultManager` kiểm tra số dư trước khi trả. Nếu không đủ, giao dịch bị hủy. Vì giao dịch blockchain có tính nguyên tử, trạng thái deposit cũng quay lại như trước và người dùng có thể thực hiện lại sau khi admin nạp thêm quỹ.

Code thật tại [`contracts/VaultManager.sol`](../../contracts/VaultManager.sol#L94):

```solidity
function payInterest(address receiver, uint256 amount)
    external
    onlySavingCore
    whenNotPaused
    nonReentrant
{
    require(amount <= token.balanceOf(address(this)), "Insufficient vault");

    if (amount > 0) {
        token.safeTransfer(receiver, amount);
    }
}
```

## 5. Hệ thống tính lãi và phí như thế nào?

APR và phí được lưu theo basis point: `10.000 bps = 100%`. Phép tính dùng số nguyên và MockUSDC có 6 chữ số thập phân, vì vậy kết quả được làm tròn xuống ở phần nhỏ nhất của token.

Code tính lãi tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L310):

```solidity
return (
    dep.principal *
    dep.aprBpsAtOpen *
    dep.tenorDays *
    1 days
) / (YEAR_SECONDS * BPS_DENOMINATOR);
```

Code tính phí rút sớm tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L376):

```solidity
uint256 penalty = (
    principal * dep.penaltyBpsAtOpen
) / BPS_DENOMINATOR;
```

## 6. Manual renew và auto-renew hoạt động khác nhau thế nào?

Manual renew do chủ NFT gọi từ khi đáo hạn đến trước khi hết 3 ngày. Khoản mới dùng điều kiện hiện tại của gói được chọn. Auto-renew có thể được script gọi từ đúng thời điểm hết 3 ngày và giữ lại điều kiện đã chốt của khoản cũ.

Ranh giới manual renew tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L418):

```solidity
require(block.timestamp >= oldDeposit.maturityAt, "Not matured");
require(
    block.timestamp < oldDeposit.maturityAt + GRACE_PERIOD,
    "Grace period ended"
);
```

Ranh giới auto-renew tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L482):

```solidity
require(
    block.timestamp >= oldDeposit.maturityAt + GRACE_PERIOD,
    "Grace period not ended"
);
```

Script tự động quét các khoản đủ điều kiện nằm tại [`scripts/auto-renew.ts`](../../scripts/auto-renew.ts#L64).

## 7. Làm sao tránh rút hai lần và hạn chế giao dịch gọi lặp nguy hiểm?

Mỗi deposit có trạng thái. Chỉ deposit ở trạng thái `Active` mới được xử lý. Trạng thái được đổi trước khi chuyển token. Ngoài ra các hàm chuyển tiền dùng `nonReentrant` để ngăn một hợp đồng bên ngoài gọi lặp vào giữa giao dịch.

Code kiểm tra trạng thái tại [`contracts/SavingCore.sol`](../../contracts/SavingCore.sol#L155):

```solidity
modifier onlyActiveDeposit(uint256 depositId) {
    require(
        deposits[depositId].status == DepositStatus.Active,
        "Deposit not active"
    );
    _;
}
```

Ví dụ trong hàm rút khi đáo hạn, trạng thái được cập nhật trước khi trả tiền:

```solidity
dep.status = DepositStatus.Withdrawn;
vault.payInterest(msg.sender, interest);
token.safeTransfer(msg.sender, principal);
```

Các trường hợp rút hai lần, gia hạn hai lần, sai chủ sở hữu, quỹ thiếu tiền và hệ thống đang tạm dừng đều đã có bài test tự động.

