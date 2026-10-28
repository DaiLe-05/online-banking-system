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

- Giá trị cá nhân: **A = 4**, **B = 1**.
- Kỳ hạn mặc định: **180 ngày**.
- Lãi suất mặc định: **3%/năm**.
- Phí rút trước hạn: **3,5%**.
- Thời gian chờ trước tự động gia hạn: **3 ngày**.
- MockUSDC sử dụng **6 chữ số thập phân**.

Bốn tham số cá nhân được khai báo trực tiếp trong `SavingCore.sol`: kỳ hạn `180 ngày`, APR `300 bps`, phí rút sớm `350 bps` và grace period `3 ngày`.

## Công nghệ

- Solidity, OpenZeppelin, Hardhat 3, TypeScript, Mocha và ethers.js.
- React, TypeScript, Vite và MetaMask.
- Hardhat Local: `http://127.0.0.1:8545`, chain ID `31337`.

## Cấu trúc chính

```text
contracts/       Ba smart contract chính
scripts/         Deploy, dữ liệu mẫu và auto-renew
test/            Các bài kiểm tra tự động
frontend/        Giao diện React và MetaMask
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

- **61/61 bài kiểm tra đạt**.
- Coverage: **98,54% dòng lệnh**, **98,55% câu lệnh**.

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

Cả kiểm tra mã và build production hiện đều thành công. Cảnh báo gói JavaScript lớn hơn 500 kB không làm build thất bại.

## Các quyết định thiết kế chính

1. Người đang sở hữu chứng chỉ NFT là người được thao tác với khoản gửi.
2. Lãi suất và phí được lưu lại lúc mở khoản gửi nên không bị thay đổi về sau.
3. Tiền gốc được giữ trong `SavingCore`; quỹ trả lãi được giữ trong `VaultManager`.
4. Nếu quỹ lãi không đủ, giao dịch bị hủy và trạng thái không thay đổi.
5. Chỉ khoản gửi đang hoạt động mới được rút hoặc gia hạn, tránh xử lý hai lần.
6. Gia hạn thủ công do người dùng thực hiện; tự động gia hạn do script gọi sau thời gian chờ.
7. Thời điểm đáo hạn được kiểm tra bằng thời gian của blockchain.

Phần giải thích chi tiết kèm đoạn code thật nằm trong [`DESIGN_ANSWERS.md`](DESIGN_ANSWERS.md).

## Lưu ý bảo mật

- Đây là dự án học tập và demo local, chưa dùng cho tiền thật.
- Không commit `.env`, private key, seed phrase hoặc thông tin đăng nhập.
- Không sử dụng tài khoản MetaMask chính với dự án.
- Địa chỉ trong `deployments/localhost.json` chỉ có giá trị với lần chạy local hiện tại.
