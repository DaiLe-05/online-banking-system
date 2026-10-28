# Online Banking System

Ứng dụng gửi tiết kiệm chạy trên blockchain local. Người dùng kết nối MetaMask, chọn gói tiết kiệm, gửi MockUSDC và nhận chứng chỉ cho khoản gửi. Quản trị viên có thể tạo gói mới và nạp quỹ dùng để trả lãi.

## Chức năng đã hoàn thành

### Người dùng

- Kết nối MetaMask với mạng Hardhat Local.
- Xem số dư, quỹ trả lãi và các gói tiết kiệm.
- Gửi MockUSDC và nhận chứng chỉ NFT.
- Xem tiền gốc, lãi dự kiến, ngày đáo hạn và trạng thái.
- Rút trước hạn và tự động trừ phí.
- Rút tiền gốc cùng tiền lãi khi đến hạn.
- Gia hạn thủ công hoặc tự động gia hạn.
- Xem và sao chép mã giao dịch sau khi thao tác thành công.

### Quản trị viên

- Tạo, bật và tắt gói tiết kiệm.
- Thiết lập kỳ hạn, lãi suất, giới hạn tiền gửi và phí rút sớm.
- Nạp hoặc rút tiền từ quỹ trả lãi.
- Thay đổi địa chỉ nhận phí.
- Tạm dừng và mở lại hệ thống.

## Thông số phiên bản cá nhân

Giá trị cá nhân: **A = 4**, **B = 1**.

| Thông số | Công thức | Kết quả |
|---|---|---:|
| Grace period | `(A mod 3) + 2` ngày | **3 ngày** |
| APR mặc định | `200 + A × 25` bps | **300 bps = 3%/năm** |
| Phí rút sớm | `300 + B × 50` bps | **350 bps = 3,5%** |
| Kỳ hạn mặc định | B lẻ: 180 ngày; B chẵn: 90 ngày | **180 ngày** |

MockUSDC sử dụng **6 chữ số thập phân**.

Bốn tham số cá nhân được khai báo trực tiếp trong `SavingCore.sol`: kỳ hạn `180 ngày`, APR `300 bps`, phí rút sớm `350 bps` và grace period `3 ngày`.

## Công nghệ

- Solidity, OpenZeppelin, Hardhat 3, TypeScript, Mocha và ethers.js.
- React, TypeScript, Vite và MetaMask.
- Hardhat Local: `http://127.0.0.1:8545`, chain ID `31337`.

## Kiến trúc

```text
MetaMask + React frontend
          │
          ├── MockUSDC ───── token mô phỏng 6 decimals
          │
          ├── SavingCore ─── gói tiết kiệm, tiền gốc và NFT chứng chỉ
          │          │
          │          └────── yêu cầu trả lãi
          │
          └── VaultManager ─ quỹ trả lãi, phí và quyền quản trị
```

Tiền gốc của người dùng và quỹ trả lãi được giữ ở hai hợp đồng khác nhau. Frontend luôn đọc dữ liệu hiện tại từ blockchain local thay vì lưu số dư riêng.

## Cấu trúc chính

```text
contracts/       Ba smart contract chính
scripts/         Deploy, dữ liệu mẫu và auto-renew
test/            Các bài kiểm tra tự động
frontend/        Giao diện React và MetaMask
docs/            Hướng dẫn, Design Answers và tài liệu báo cáo
deployments/     Địa chỉ hợp đồng của lần chạy local hiện tại
```

- `MockUSDC`: đồng tiền mô phỏng dùng để kiểm thử.
- `SavingCore`: quản lý gói tiết kiệm, khoản gửi và chứng chỉ NFT.
- `VaultManager`: quản lý quỹ dùng để trả lãi.

## Cài đặt

Yêu cầu Node.js và MetaMask.

```powershell
git clone <repository-url>
cd online-banking-system
npm install
cd frontend
npm install
cd ..
```

## Chạy dự án local

Mở ba terminal tại thư mục dự án.

### Terminal 1 — Khởi động blockchain

```powershell
npx hardhat node
```

### Terminal 2 — Deploy và tạo dữ liệu mẫu

```powershell
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/seed.ts --network localhost
```

### Terminal 3 — Chạy giao diện

```powershell
cd frontend
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, thường là `http://localhost:5173`.

### Kết nối MetaMask

- Network name: `Hardhat Local`.
- RPC URL: `http://127.0.0.1:8545`.
- Chain ID: `31337`.
- Currency symbol: `ETH`.

Chỉ nhập tài khoản kiểm thử do Hardhat node tạo. Không dùng ví có tài sản thật.

> Blockchain local không lưu dữ liệu sau khi tắt node. Mỗi lần khởi động lại node, phải chạy lại cả `deploy.ts` và `seed.ts`.

## Chạy auto-renew

```powershell
npx hardhat run scripts/auto-renew.ts --network localhost
```

## Kiểm tra dự án

### Smart contract

```powershell
npx hardhat test
npx hardhat test --coverage
```

Kết quả gần nhất:

- **60/60 bài kiểm tra nghiệp vụ đạt**.
- Coverage: **98,60% dòng lệnh**, **98,50% câu lệnh**.

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

Cả kiểm tra mã và build production hiện đều thành công. Cảnh báo gói JavaScript lớn hơn 500 kB không làm build thất bại.

## Design Answers

### 1. Nếu Alice chuyển NFT chứng chỉ cho Bob, ai được rút tiền?

Bob là người được rút vì các hàm rút và gia hạn kiểm tra `ownerOf(depositId) == msg.sender` trong modifier `onlyCertificateOwner` của [`SavingCore.sol`](contracts/SavingCore.sol). Thiết kế này hữu ích vì chứng chỉ tiết kiệm có thể chuyển nhượng và quyền nhận tiền đi cùng NFT. Tuy nhiên, nó cũng nguy hiểm nếu người mua không kiểm tra trạng thái, ngày đáo hạn và điều kiện của chứng chỉ trước khi nhận. Bài test `Should allow current NFT owner to withdraw` chứng minh Alice không còn quyền và Bob rút được sau khi nhận NFT.

### 2. Điều gì xảy ra nếu quỹ lãi không đủ tiền?

`VaultManager.payInterest` sẽ revert với lỗi `Insufficient vault`, vì vậy thao tác rút khi đáo hạn hoặc gia hạn không hoàn thành. Do giao dịch có tính nguyên tử, trạng thái deposit và số dư tiền gốc đều quay về như trước, nên người dùng không bị mất tiền nhưng phải chờ admin nạp thêm quỹ. Một phương án khác là trả tiền gốc ngay và ghi nhận phần lãi còn nợ để nhận sau. Dự án chọn cách hủy toàn bộ giao dịch vì đơn giản, dễ kiểm tra và đúng yêu cầu cơ bản; phương án ghi nợ lãi được ghi nhận là bonus C1 chưa triển khai.

### 3. Nếu bot auto-renew ngừng chạy một tháng thì sao?

Khoản gửi vẫn ở trạng thái `Active`; người dùng vẫn có thể rút gốc và lãi bằng `withdrawAtMaturity`, nên không mất tiền. Trong thời gian bot ngừng, hệ thống không tự tạo kỳ hạn mới và người dùng không nhận thêm lợi suất cho tháng chậm đó. Khi có người gọi `autoRenewDeposit`, khoản mới bắt đầu tại `block.timestamp` hiện tại chứ không được tính lùi về ngày đáo hạn cũ. Một cải tiến phù hợp là cho khoản mới bắt đầu từ mốc đáo hạn cũ, hoặc vận hành keeper dự phòng có cơ chế khuyến khích người gọi.

### 4. Phần lẻ do phép chia số nguyên được xử lý thế nào?

Solidity chia số nguyên theo hướng làm tròn xuống, nên phần nhỏ hơn đơn vị thấp nhất của mUSDC không được trả và vẫn nằm trong vault. Phần lẻ này không làm sai số dư và không tự gây revert; giao dịch chỉ revert khi vault không đủ số tiền lãi đã được làm tròn. Với khoản rất nhỏ, lãi có thể làm tròn thành 0 nhưng tiền gốc vẫn xử lý bình thường. Test `Should round interest down and leave rounding dust in the vault` kiểm tra cả số lãi làm tròn và số dư còn lại của vault.

### 5. Đúng thời điểm đáo hạn và đúng cuối grace period thuộc nhánh nào?

Rút sớm chỉ hợp lệ khi `block.timestamp < maturityAt`, còn rút đáo hạn hợp lệ khi `block.timestamp >= maturityAt`; vì vậy đúng giây đáo hạn thuộc nhánh đáo hạn. Gia hạn thủ công dùng khoảng `maturityAt <= time < maturityAt + GRACE_PERIOD`. Auto-renew dùng `time >= maturityAt + GRACE_PERIOD`. Vì vậy đúng giây cuối grace period thì manual renew bị từ chối và auto-renew bắt đầu hợp lệ; các ranh giới này đều có test tự động.

### 6. Nếu admin tắt một gói đang có khoản gửi hoạt động thì sao?

Tắt gói chỉ chặn việc mở khoản gửi mới và chặn manual renew vào gói đó. Các khoản gửi đã mở vẫn giữ điều kiện đã chốt và vẫn được rút sớm hoặc rút khi đáo hạn. Auto-renew vẫn có thể dùng lại bản chụp điều kiện cũ vì hàm này không đọc trạng thái `enabled` hiện tại của gói. Các test `Should let an existing deposit withdraw after its plan is disabled` và `Should reject manual renewal into a disabled plan` chứng minh hành vi này.

### 7. Một cách tấn công và cơ chế ngăn chặn chính xác là gì?

Kẻ tấn công có thể thử gọi rút hai lần hoặc dùng callback của token để gọi lặp hàm rút trước khi giao dịch đầu kết thúc. Modifier `onlyActiveDeposit` chỉ cho phép deposit ở trạng thái `Active`, và hàm đổi trạng thái sang `Withdrawn` trước khi gọi chuyển token. `nonReentrant` chặn việc quay lại hàm trong lúc giao dịch đang chạy, còn `SafeERC20` giúp gọi token an toàn. Các test rút hai lần và gọi khi trạng thái không còn hoạt động xác nhận giao dịch thứ hai bị từ chối.

Phiên bản trình bày chi tiết kèm đoạn code thật nằm trong [`docs/submission/DESIGN_ANSWERS.md`](docs/submission/DESIGN_ANSWERS.md).

## Tài liệu dự án

- [Chỉ mục tài liệu](docs/README.md)
- [Hướng dẫn chạy local](docs/guides/LOCAL_DEVELOPMENT.md)
- [Design Answers](docs/submission/DESIGN_ANSWERS.md)
- [Kịch bản video demo](docs/submission/DEMO_SCRIPT.md)
- [Câu hỏi vấn đáp](docs/submission/VIVA_QUESTIONS.md)
- [Checklist nộp bài](docs/submission/SUBMISSION_CHECKLIST.md)

## Lưu ý bảo mật

- Đây là dự án học tập và demo local, chưa dùng cho tiền thật.
- Không commit `.env`, private key, seed phrase hoặc thông tin đăng nhập.
- Không sử dụng tài khoản MetaMask chính với dự án.
- Địa chỉ trong `deployments/localhost.json` chỉ có giá trị với lần chạy local hiện tại.

## Giới hạn hiện tại

- Nếu vault thiếu tiền lãi, giao dịch rút khi đáo hạn sẽ bị hủy toàn bộ. Bonus C1 trả gốc trước và ghi nợ lãi chưa được triển khai.
- Chưa có solvency guard C2 để khóa phần quỹ lãi đã cam kết; admin local vẫn có thể rút quỹ trong phạm vi số dư hiện có.
- Auto-renew cần một script hoặc người bên ngoài gọi; chưa có dịch vụ bot chạy liên tục và chưa có phí khuyến khích người gọi.
- Dữ liệu Hardhat Local bị xóa khi node dừng, vì vậy phải deploy và seed lại.
- Frontend build thành công nhưng hiện vẫn có cảnh báo gói JavaScript lớn hơn 500 kB.
