# Kịch bản video demo 3–5 phút

## Chuẩn bị trước khi quay

- Mở sẵn frontend tại `http://localhost:5173`.
- MetaMask đang ở mạng Hardhat Local, chain ID `31337`.
- Chuẩn bị một tài khoản người dùng có mUSDC và tài khoản admin.
- Đóng terminal đang hiển thị private key của Hardhat.
- Tắt thông báo cá nhân trên máy tính.
- Không mở file `.env` hoặc dùng ví có tài sản thật.

## 0:00–0:30 — Giới thiệu

> Đây là dự án Online Banking System của em. Hệ thống mô phỏng chức năng gửi tiết kiệm trên blockchain. Người dùng có thể kết nối MetaMask, chọn gói tiết kiệm, gửi tiền, theo dõi khoản gửi, rút tiền và gia hạn. Quản trị viên có thể tạo gói mới và nạp quỹ dùng để trả lãi.

## 0:30–1:10 — Tổng quan giao diện

Thao tác:

1. Chỉ vào địa chỉ ví và trạng thái Localhost.
2. Chỉ vào bốn ô: số dư ví, tiền đang gửi, lãi dự kiến và quỹ trả lãi.
3. Cuộn xuống danh sách gói tiết kiệm.

Lời nói:

> Giao diện đang kết nối với MetaMask trên mạng Hardhat Local. Tại đây người dùng xem được số dư, tổng tiền đang gửi, lãi dự kiến và số tiền còn trong quỹ trả lãi. Bên dưới là các gói tiết kiệm với kỳ hạn, lãi suất, phí rút sớm và mức gửi tối thiểu.

## 1:10–2:10 — Mở một khoản gửi

Thao tác:

1. Chọn một gói tiết kiệm.
2. Nhập số tiền, ví dụ `100` mUSDC.
3. Nhấn **Approve & deposit**.
4. Xác nhận các yêu cầu trong MetaMask.
5. Chỉ vào thông báo thành công và mã giao dịch.
6. Sao chép mã giao dịch nếu cần.

Lời nói:

> Em chọn một gói, nhập số tiền muốn gửi và xác nhận bằng MetaMask. Lần đầu, người dùng cho phép hệ thống sử dụng đúng số token cần thiết, sau đó xác nhận giao dịch gửi tiền. Khi hoàn thành, giao diện hiển thị thông báo và mã giao dịch để người dùng có thể sao chép làm minh chứng.

## 2:10–2:50 — Xem chứng chỉ và rút tiền

Thao tác:

1. Cuộn đến **My deposits**.
2. Chỉ vào tiền gốc, lãi dự kiến, ngày đáo hạn và trạng thái.
3. Chỉ vào nút **Withdraw early** nhưng không nhất thiết phải bấm nếu muốn giữ dữ liệu.

Lời nói:

> Sau khi gửi, hệ thống tạo một chứng chỉ NFT cho khoản gửi. Người dùng có thể xem tiền gốc, lãi dự kiến, ngày đáo hạn và trạng thái. Nếu rút sớm, hệ thống tự tính phí. Khi đến hạn, nút sẽ chuyển thành rút toàn bộ và trong thời gian cho phép người dùng có thể gia hạn.

## 2:50–3:35 — Chức năng quản trị

Thao tác:

1. Chuyển MetaMask sang tài khoản admin.
2. Mở mục **Admin**.
3. Cho xem các ô tạo gói và nạp quỹ.
4. Có thể tạo một gói nhỏ hoặc chỉ trình bày nếu không muốn thay đổi dữ liệu.

Lời nói:

> Khi chuyển sang tài khoản quản trị, giao diện xuất hiện mục Admin. Quản trị viên có thể tạo gói tiết kiệm mới, đặt kỳ hạn, lãi suất, mức gửi và phí rút sớm. Quản trị viên cũng có thể nạp thêm tiền vào quỹ để bảo đảm có đủ tiền trả lãi.

## 3:35–4:20 — Kết quả kiểm thử

Thao tác:

1. Chuyển sang VS Code.
2. Cho xem kết quả `56 passing`.
3. Cho xem coverage `98,51%`.

Lời nói:

> Em đã kiểm tra các trường hợp bình thường và các trường hợp lỗi như rút hai lần, sai chủ sở hữu, chưa đến hạn, quỹ thiếu tiền và hệ thống bị tạm dừng. Hiện tại 56 trên 56 bài kiểm tra nghiệp vụ đều đạt. Độ bao phủ mã nguồn khoảng 98,51%, cao hơn mục tiêu 90%.

## 4:20–4:40 — Kết luận

> Kết quả hiện tại là các chức năng chính đã hoạt động từ giao diện đến smart contract. Dự án có hướng dẫn cài đặt lại, dữ liệu mẫu, kiểm thử tự động và kịch bản demo. Phần còn lại là đưa đầy đủ mã nguồn lên GitHub và hoàn thiện việc nộp bài.

## Phương án nếu demo gặp lỗi

- Nếu frontend báo không tìm thấy contract: chạy lại `deploy.ts` và `seed.ts`.
- Nếu MetaMask sai mạng: chuyển về Hardhat Local, chain ID `31337`.
- Nếu không thấy tài khoản: mở danh sách tài khoản MetaMask và chọn lại tài khoản local.
- Nếu giao dịch bị từ chối: mở lại thao tác và bấm xác nhận trong MetaMask.
- Nếu hết mUSDC: chạy lại seed hoặc dùng chức năng mint trong môi trường local.

