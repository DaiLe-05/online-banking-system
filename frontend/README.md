# Novabank frontend

Giao diện React + TypeScript dùng MetaMask và ethers.js để tương tác với ba smart contract của Online Banking System trên Hardhat Local.

## Cấu trúc

```text
src/
├── contracts/
│   ├── abis/          ABI của MockUSDC, VaultManager và SavingCore
│   ├── addresses.ts   Chain, RPC và địa chỉ hợp đồng
│   └── types.ts       Kiểu dữ liệu dùng trong giao diện
├── App.tsx            Dashboard và các luồng người dùng/admin
├── App.css            Giao diện trang chính
├── index.css          Thiết lập CSS toàn cục
└── main.tsx           Điểm khởi chạy React
```

## Chạy frontend

Blockchain local, deploy và seed phải chạy trước.

```powershell
npm ci
npm run dev
```

## Cấu hình địa chỉ

Các địa chỉ mặc định của Hardhat được đặt trong `src/contracts/addresses.ts`. Nếu lần deploy tạo địa chỉ khác:

```powershell
Copy-Item .env.example .env.local
```

Sau đó cập nhật các biến `VITE_*` trong `.env.local`. File `.env.local` không được commit.

## Kiểm tra

```powershell
npm run lint
npm run build
```

Frontend chỉ dành cho mạng local chain ID `31337`. Không kết nối ví có tài sản thật.

