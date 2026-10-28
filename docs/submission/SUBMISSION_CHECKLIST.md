# Checklist nộp bài

## Đã hoàn thành

- [x] Ba smart contract chính: `MockUSDC`, `SavingCore`, `VaultManager`.
- [x] MockUSDC có 6 decimals và public mint phục vụ kiểm thử.
- [x] Năm luồng: mở khoản gửi, rút đáo hạn, rút sớm, manual renew, auto-renew.
- [x] Quản trị gói, quỹ lãi, địa chỉ nhận phí và pause/unpause.
- [x] Các event bắt buộc: `PlanCreated`, `PlanUpdated`, `DepositOpened`, `Withdrawn`, `Renewed`.
- [x] Giá trị cá nhân A = 4, B = 1 và bốn tham số được ghi ở đầu README.
- [x] Bảy câu Design Answers nằm trực tiếp trong README, mỗi câu có liên hệ code và test.
- [x] 60/60 test đạt; line coverage 98,60%, cao hơn yêu cầu 90%.
- [x] Frontend React kết nối MetaMask, gửi/rút/gia hạn và chức năng admin.
- [x] Frontend hiển thị loading, lỗi, thành công và transaction hash.
- [x] Có hướng dẫn cài đặt, deploy, seed và lưu ý phải deploy lại khi restart node.
- [x] Có GitHub Actions tự động cài đặt, test, lint và build.
- [x] Không đưa `.env`, private key, seed phrase, node_modules, build và coverage vào Git.
- [x] Có tài liệu chuẩn bị vấn đáp và kịch bản demo.

## Cần người nộp bài thực hiện

- [ ] Kiểm tra repository GitHub ở chế độ người xem và xác nhận mọi file đã được push.
- [ ] Quay video demo 3–5 phút theo [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).
- [ ] Đưa video vào vị trí nộp bài theo yêu cầu của giảng viên.
- [ ] Kiểm tra lại link repository và video trước khi bấm nộp.

## Lệnh kiểm tra cuối

```powershell
npm ci
npm ci --prefix frontend
npm run check
npm run coverage
```

Kết quả chuẩn hiện tại: **60 passing**, frontend lint/build thành công, **98,60% line coverage**.
