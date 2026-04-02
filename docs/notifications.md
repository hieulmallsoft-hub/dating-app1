# Notifications - Tài liệu nghiệp vụ

## 1) Tổng quan
- Notification được lưu vào bảng `notifications`, đồng thời phát realtime qua Socket.IO và (nếu có FCM token) gửi push qua Firebase.
- Danh sách trả về được sắp xếp mới nhất trước (`createdAt DESC`).
- Trạng thái đọc: `isRead`.

## 2) API REST liên quan
- `GET /notifications`: lấy danh sách thông báo của user hiện tại.
- `PATCH /notifications/:id/read`: đánh dấu 1 thông báo đã đọc, đồng thời bắn realtime `notification:read`.
- `POST /auth/fcm-token/register`: đăng ký FCM token (khuyến nghị).
- `POST /auth/fcm-token/unregister`: xoá FCM token.
- Legacy (không khuyến nghị): `POST /notifications/push-tokens/register`, `POST /notifications/push-tokens/unregister`.

## 3) Realtime (Socket.IO)
- Join room: emit `notification:join` (WS JWT). Server trả `notification:joined` với `room = user:<userId>`.
- Leave room: emit `notification:leave`. Server trả `notification:left`.
- Khi có thông báo mới: server emit `notification:new`.
- Khi đánh dấu đọc: server emit `notification:read`.

## 4) Notification Types & Triggers

### `GENERAL`
- Dùng làm default khi type bị thiếu hoặc không hợp lệ.

### `CHAT`
- Khi user gửi tin nhắn chat cho partner.
- Nội dung preview phụ thuộc loại tin nhắn:
`IMAGE`, `VOICE`, `LOCATION` sẽ có message mô tả cố định; text sẽ cắt ngắn nếu dài.

### `COUPLE`
- Khi ghép đôi thành công (cả 2 người đều nhận).

### `COUPLE_DISCONNECT`
- Khi một người ngắt kết nối ghép đôi.

### `COUPLE_START_DATE`
- Khi cập nhật ngày bắt đầu yêu (có `startDate` + `updateTime` hợp lệ).

### `EVENT`
- Khi tạo/sửa/xóa sự kiện.
- Nếu `isAnniversary=true` thì tiêu đề sẽ là “Kỷ niệm mới”.

### `MOMENT`
- Khi tạo/sửa/xóa moment với `privacy = COUPLE` (kể cả có ảnh).

### `MEDIA` (không dùng)
- Type này đang **không bắn thông báo**. Album chỉ là tổng hợp từ Moment.

### `GEOFENCE`
- Khi partner ENTER/EXIT một vị trí geofence.

### `INVITE`
- Khi lời mời ghép đôi được chấp nhận.
- Có cơ chế gộp thông báo trong 900s để tránh spam.

### `TRIP`
- Khi đồng bộ lộ trình (sync trips).
- Có cơ chế gộp thông báo trong 600s, nội dung sẽ tăng số lượng chuyến.

### `TEST`
- Dùng cho mục đích test nội bộ.

## 5) Push payload (FCM)
- Payload gửi lên FCM có:
`title`, `body`, `data.notificationId`, `data.type`, `ttlSeconds = 86400`.
- Nếu user không có token thì push sẽ bị skip.
