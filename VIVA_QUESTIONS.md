# Câu hỏi vấn đáp và cách trả lời

## 1. Dự án của em giải quyết vấn đề gì?

> Dự án mô phỏng một hệ thống gửi tiết kiệm trên blockchain. Người dùng có thể gửi token, nhận chứng chỉ, xem lãi, rút tiền hoặc gia hạn. Quản trị viên quản lý gói tiết kiệm và quỹ trả lãi.

## 2. Vì sao phải dùng MetaMask?

> MetaMask xác định tài khoản người dùng và dùng để xác nhận giao dịch. Hệ thống không giữ private key của người dùng.

## 3. Chứng chỉ NFT dùng để làm gì?

> Mỗi NFT đại diện cho một khoản gửi riêng. Người sở hữu NFT hiện tại là người có quyền rút hoặc gia hạn khoản gửi đó.

## 4. Tiền gốc và tiền lãi nằm ở đâu?

> Tiền gốc nằm trong hợp đồng quản lý khoản gửi. Tiền trả lãi nằm trong một quỹ riêng. Việc tách riêng giúp quản lý rõ ràng và tránh dùng nhầm tiền gốc để trả lãi.

## 5. Nếu quản trị viên đổi lãi suất thì khoản gửi cũ có bị đổi không?

> Không. Khi người dùng gửi tiền, hệ thống lưu lại lãi suất và phí của thời điểm đó. Việc cập nhật gói chỉ ảnh hưởng đến khoản gửi mới.

## 6. Nếu quỹ không đủ tiền trả lãi thì sao?

> Giao dịch bị hủy và trạng thái khoản gửi không thay đổi. Quản trị viên cần nạp thêm quỹ rồi người dùng thực hiện lại.

## 7. Làm sao ngăn người dùng rút tiền hai lần?

> Mỗi khoản gửi có trạng thái. Chỉ khoản đang hoạt động mới được rút hoặc gia hạn. Sau lần xử lý đầu tiên, trạng thái được đổi nên lần tiếp theo sẽ bị từ chối.

## 8. Rút trước hạn được tính như thế nào?

> Hệ thống tính phí dựa trên tiền gốc và mức phí đã lưu khi mở khoản gửi. Phiên bản của em dùng phí 3,5%. Phần còn lại được trả cho người dùng.

## 9. Gia hạn thủ công và tự động khác nhau thế nào?

> Gia hạn thủ công do người dùng thực hiện trong ba ngày sau đáo hạn. Nếu hết thời gian đó mà chưa xử lý, script có thể gọi tự động gia hạn và giữ lại điều kiện của khoản gửi cũ.

## 10. Vì sao dùng thời gian blockchain?

> Smart contract chỉ có thể tin vào thời gian của block. Vì vậy cả việc xác định đáo hạn và thời gian chờ đều dựa trên timestamp của blockchain.

## 11. Em đã kiểm tra dự án như thế nào?

> Em có 61 bài kiểm tra cho token, khoản gửi, quỹ trả lãi và các trường hợp lỗi. Tất cả đều đạt. Độ bao phủ mã nguồn khoảng 98,54%.

## 12. Nếu tắt Hardhat node thì chuyện gì xảy ra?

> Blockchain local bị xóa dữ liệu. Khi mở lại, em phải deploy hợp đồng và chạy seed lại trước khi sử dụng frontend.

## 13. Dự án đã có thể dùng tiền thật chưa?

> Chưa. Đây là dự án học tập chạy local. Muốn dùng thật cần audit bảo mật, kiểm tra pháp lý, quản lý quyền nâng cao và triển khai trên mạng phù hợp.

## 14. Thông số cá nhân của em là gì?

> Em có A bằng 4 và B bằng 1. Bốn tham số được áp dụng là kỳ hạn 180 ngày, lãi suất 3%, phí rút sớm 3,5% và thời gian chờ 3 ngày.

## 15. Phần nào em thấy quan trọng nhất?

> Phần quan trọng nhất là bảo đảm quyền lợi của khoản gửi cũ không thay đổi, chỉ đúng chủ sở hữu được thao tác và không thể rút hoặc gia hạn hai lần.

