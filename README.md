# Online Banking System

[![CI](https://github.com/DaiLe-05/online-banking-system/actions/workflows/ci.yml/badge.svg)](https://github.com/DaiLe-05/online-banking-system/actions/workflows/ci.yml)

Ứng dụng gửi tiết kiệm chạy trên Hardhat Local hoặc Ethereum Sepolia. Người dùng kết nối MetaMask, chọn gói tiết kiệm, gửi MockUSDC và nhận chứng chỉ cho khoản gửi. Quản trị viên có thể tạo gói mới và nạp quỹ dùng để trả lãi.

## Video demo

https://drive.google.com/drive/folders/1f4QySe6qnI7iBiPrnhE23MkOJl9UJyF_?usp=drive_link

## Chức năng đã hoàn thành

### Người dùng

- Kết nối MetaMask với mạng Hardhat Local.
- Chuyển đổi giữa Hardhat Local và Ethereum Sepolia.
- Xem số dư, quỹ trả lãi và các gói tiết kiệm.
- Gửi MockUSDC và nhận chứng chỉ NFT.
- Xem tiền gốc, lãi dự kiến, ngày đáo hạn và trạng thái.
- Lọc chứng chỉ theo trạng thái: đang hoạt động, đã rút và đã gia hạn.
- Rút trước hạn và tự động trừ phí.
- Rút tiền gốc cùng tiền lãi khi đến hạn.
- Luôn nhận lại tiền gốc khi đáo hạn; lãi thiếu được ghi nhận để nhận sau.
- Gia hạn thủ công hoặc tự động gia hạn.
- Xem và nhận phần lãi đang chờ thanh toán.
- Xem và sao chép mã giao dịch sau khi thao tác thành công.
- Mint mUSDC thử nghiệm và mở giao dịch Sepolia trên Etherscan.

### Quản trị viên

- Tạo, bật và tắt gói tiết kiệm.
- Thiết lập kỳ hạn, lãi suất, giới hạn tiền gửi và phí rút sớm.
- Nạp hoặc rút tiền từ quỹ trả lãi.
- Chỉ rút phần quỹ chưa được cam kết cho các khoản gửi.
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
  src/components Các khối giao diện độc lập
  src/lib/       Công thức và quy tắc hiển thị có unit test
docs/            Hướng dẫn, Design Answers và tài liệu báo cáo
deployments/     Địa chỉ hợp đồng công khai của mạng Sepolia
```

- `MockUSDC`: đồng tiền mô phỏng dùng để kiểm thử.
- `SavingCore`: quản lý gói tiết kiệm, khoản gửi và chứng chỉ NFT.
- `VaultManager`: quản lý quỹ dùng để trả lãi.

## Cài đặt

Yêu cầu Node.js và MetaMask.

```powershell
git clone https://github.com/DaiLe-05/online-banking-system.git
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

## Chạy trên Ethereum Sepolia

Dự án hỗ trợ Sepolia chain ID `11155111`. Dùng một ví thử nghiệm riêng có
Sepolia ETH; không sử dụng ví chính hoặc commit private key.

Lưu RPC URL và private key trong Hardhat encrypted keystore:

```powershell
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
```

Deploy bằng production compiler profile:

```powershell
npx hardhat --network sepolia --build-profile production run scripts/deploy.ts
```

Script tạo `deployments/sepolia.json` và tự ghi các địa chỉ công khai vào
`frontend/.env.local`. Nếu Vite đang chạy, phải khởi động lại rồi chọn
**Sepolia** trên thanh điều hướng.

Deployment Sepolia hiện tại:

| Hợp đồng | Địa chỉ |
|---|---|
| MockUSDC | [`0xE52A...A373`](https://sepolia.etherscan.io/address/0xE52A9E41B2a76d8b101448eB20d521e70f03A373) |
| VaultManager | [`0xffCd...8871`](https://sepolia.etherscan.io/address/0xffCd7A4B905204514D3E8A81D87547499a7C8871) |
| SavingCore | [`0x97a2...8681`](https://sepolia.etherscan.io/address/0x97a2716Ba2ec46648346d634c654439A5f868681) |

Các địa chỉ này cũng nằm trong `deployments/sepolia.json`. Muốn dùng ngay
deployment đã công bố mà không deploy lại, sao chép file môi trường mẫu rồi
khởi động frontend:

```powershell
Copy-Item frontend/.env.example frontend/.env.local
cd frontend
npm run dev
```

Sepolia dùng thời gian block thật nên không chạy được `evm_increaseTime`. Để
demo ngay trên mạng công khai, bản deploy Sepolia nén thời gian: **1 ngày của
gói = 60 giây** và grace period 3 ngày = 180 giây. Số ngày dùng để tính lãi
vẫn giữ nguyên theo nghiệp vụ. Localhost vẫn dùng 1 ngày = 86.400 giây.
Hướng dẫn demo đáo hạn, gia hạn, auto-renew, C1 và C2 nằm tại
[`docs/guides/SEPOLIA_DEMO.md`](docs/guides/SEPOLIA_DEMO.md).

### Bằng chứng hoạt động trên Sepolia

- Ba liên kết Etherscan trong bảng trên công khai bytecode, lịch sử giao dịch và event của từng hợp đồng.
- Mỗi thao tác thành công trên frontend hiển thị transaction hash, nút sao chép và liên kết **View on explorer**.
- `deployments/sepolia.json` là nguồn địa chỉ công khai; private key và RPC URL chỉ nằm trong Hardhat encrypted keystore và không được commit.

## Chạy auto-renew

Khởi động frontend Sepolia và bot theo dõi tự động bằng một lệnh từ thư mục
gốc của dự án:

```powershell
cd online-banking-system
npm run dev:sepolia
```

Khi terminal hiện dòng sau, nhập mật khẩu của Hardhat keystore rồi nhấn
`Enter`:

```text
[hardhat-keystore] Enter the password:
```

Trong lúc nhập, terminal **không hiển thị ký tự, dấu chấm hoặc dấu `*`**. Đây
là hành vi bảo mật bình thường, không phải lỗi. Không nhập RPC URL, private key
hoặc mật khẩu MetaMask tại bước này.

Chương trình sẽ khởi động theo thứ tự:

1. Bot auto-renew nhận mật khẩu và kết nối Sepolia.
2. Khi terminal báo `Auto-renew watcher started`, frontend Vite tự khởi động.
3. Mở địa chỉ Vite được in trong terminal, thông thường là
   `http://localhost:5173`.

Bot quét mỗi 15 giây và tự gọi `autoRenewDeposit` khi một chứng chỉ đã hết
grace period. Giữ terminal này mở trong lúc chạy ứng dụng; nhấn `Ctrl+C` để
dừng cả frontend và bot.

Nếu Vite báo `Port 5173 is in use, trying another one`, một frontend cũ vẫn
đang chạy. Nhấn `Ctrl+C` trong terminal cũ để dừng nó, sau đó chạy lại
`npm run dev:sepolia`. Có thể dùng cổng mới như `5174`, nhưng nên chỉ giữ một
frontend để tránh mở nhầm phiên bản.

Nếu nhập sai mật khẩu, chạy lại `npm run dev:sepolia` và nhập đúng mật khẩu
đã dùng khi tạo Hardhat keystore. Không chia sẻ hoặc commit mật khẩu, RPC URL
và private key lên GitHub.

Nếu chỉ muốn chạy riêng bot theo dõi:

```powershell
npx hardhat run scripts/auto-renew.ts --network localhost
npx hardhat --network sepolia --build-profile production run scripts/auto-renew.ts
```

## Kiểm tra dự án

### Smart contract

```powershell
npx hardhat test
npx hardhat test --coverage
```

Kết quả gần nhất:

- **69/69 bài kiểm tra smart contract và watcher đạt**.
- Coverage toàn bộ hợp đồng: **98,81% dòng lệnh**, **98,83% câu lệnh**.

### Frontend

```powershell
cd frontend
npm run test
npm run lint
npm run build
```

Frontend có **5/5 unit test đạt** cho công thức lãi, phí rút sớm, trạng thái, nguồn gốc và bộ lọc chứng chỉ. Cả lint và build production hiện đều thành công. Cảnh báo gói JavaScript lớn hơn 500 kB không làm build thất bại.

Chạy toàn bộ kiểm tra của dự án bằng một lệnh:

```powershell
npm run check
```

GitHub Actions cũng tự chạy cùng các nhóm kiểm tra khi có commit mới trên `main`/`master` hoặc khi mở pull request. Trang **Actions** hiển thị riêng kết quả **Smart contracts and watcher** và **Frontend tests, lint and build**, nên có thể xác định nhanh phần nào gặp lỗi. Workflow cũng có nút **Run workflow** để chạy thủ công khi cần.

## Design Answers

### 1. Nếu Alice chuyển NFT chứng chỉ cho Bob, ai được rút tiền?

Bob là người được rút vì các hàm rút và gia hạn kiểm tra `ownerOf(depositId) == msg.sender` trong modifier `onlyCertificateOwner` của [`SavingCore.sol`](contracts/SavingCore.sol). Thiết kế này hữu ích vì chứng chỉ tiết kiệm có thể chuyển nhượng và quyền nhận tiền đi cùng NFT. Tuy nhiên, nó cũng nguy hiểm nếu người mua không kiểm tra trạng thái, ngày đáo hạn và điều kiện của chứng chỉ trước khi nhận. Bài test `Should allow current NFT owner to withdraw` chứng minh Alice không còn quyền và Bob rút được sau khi nhận NFT.

### 2. Điều gì xảy ra nếu quỹ lãi không đủ tiền?

Tại ngày đáo hạn, `SavingCore` luôn trả tiền gốc từ hợp đồng chính và yêu cầu vault trả phần lãi đang có. Nếu vault thiếu, phần lãi chưa trả được ghi vào `pendingInterest` của người dùng thay vì khóa tiền gốc. Sau khi admin nạp lại quỹ, người dùng gọi `claimPendingInterest` để nhận toàn bộ hoặc một phần lãi còn nợ. Đánh đổi của C1 là hợp đồng phải lưu thêm công nợ và người dùng có thể cần thực hiện thêm một giao dịch nhận lãi.

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

## Bonus đã triển khai

### C1 — Principal is always safe

**Vấn đề:** quy tắc cơ bản làm toàn bộ giao dịch revert khi vault thiếu lãi, có thể khiến tiền gốc của người dùng bị khóa. **Giải pháp:** khi đáo hạn, hệ thống trả gốc ngay, trả phần lãi vault đang có và ghi phần còn thiếu vào `pendingInterest`; người dùng nhận lại bằng `claimPendingInterest` sau khi vault được nạp. **Đánh đổi:** tăng trạng thái công nợ, thêm event và có thể cần một giao dịch claim riêng. Test `Should return principal and defer interest when vault is empty` kiểm tra đầy đủ luồng rút gốc, ghi nợ, nạp quỹ và nhận lãi.

### C2 — Solvency guard

**Vấn đề:** nếu admin được rút toàn bộ vault, khoản lãi đã hứa cho deposit đang hoạt động có thể trở thành không thanh toán được. **Giải pháp:** vault theo dõi `totalInterestOwed`; mỗi deposit mới giữ chỗ phần lãi, rút sớm giải phóng phần giữ chỗ, còn trả lãi làm giảm công nợ. `withdrawVault` chỉ cho rút `availableLiquidity = max(vaultBalance - totalInterestOwed, 0)`. **Đánh đổi:** admin có ít thanh khoản tự do hơn và mọi đường xử lý deposit phải cập nhật số lãi cam kết chính xác; các test reservation, release và giới hạn rút bảo vệ tính nhất quán.

## Tài liệu dự án

- [Chỉ mục tài liệu](docs/README.md)
- [Hướng dẫn chạy local](docs/guides/LOCAL_DEVELOPMENT.md)
- [Hướng dẫn deploy và demo Sepolia](docs/guides/SEPOLIA_DEMO.md)
- [Design Answers](docs/submission/DESIGN_ANSWERS.md)

## Lưu ý bảo mật

- Đây là dự án học tập chạy trên Hardhat Local và Sepolia testnet, chưa dùng cho tiền thật.
- Không commit `.env`, private key, seed phrase hoặc thông tin đăng nhập.
- Không sử dụng tài khoản MetaMask chính với dự án.
- Địa chỉ trong `deployments/localhost.json` chỉ có giá trị với lần chạy local hiện tại.
- Địa chỉ Sepolia là thông tin công khai; private key và RPC URL chỉ được lưu trong Hardhat encrypted keystore.

## Giới hạn hiện tại

- C1 bảo vệ tiền gốc nhưng phần lãi còn thiếu vẫn phụ thuộc vào việc vault được nạp thêm.
- C2 ngăn admin rút phần lãi đã cam kết, nhưng không bắt buộc vault phải có đủ 100% tiền ngay lúc mở deposit; nếu tổng cam kết lớn hơn số dư, thanh khoản an toàn của admin bằng 0.
- Auto-renew cần một script hoặc người bên ngoài gọi; chưa có dịch vụ bot chạy liên tục và chưa có phí khuyến khích người gọi.
- NFT hiện thể hiện quyền sở hữu chứng chỉ và vòng đời khoản gửi nhưng chưa có metadata hình ảnh riêng; bổ sung metadata sẽ làm tăng bytecode và yêu cầu deploy lại hợp đồng Sepolia.
- Dữ liệu Hardhat Local bị xóa khi node dừng, vì vậy phải deploy và seed lại.
- Frontend build thành công nhưng hiện vẫn có cảnh báo gói JavaScript lớn hơn 500 kB.
