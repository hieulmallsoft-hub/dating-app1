# API_FLOW_THEO_CHUC_NANG

Tài liệu này mô tả flow test theo **từng chức năng**, để FE/mobile hoặc QA chỉ cần đi đúng thứ tự API là chạy được.

Cập nhật theo code hiện tại: 09-03-2026

## 1. Quy ước chung

1. Base URL: `http://localhost:3000`
2. Swagger: `http://localhost:3000/api/docs`
3. Header auth:
   - `Authorization: Bearer <access_token>`
4. Token:
   - Nhận từ `POST /auth/login` hoặc `POST /auth/google`
   - Refresh bằng `POST /auth/refresh`

## 2. Flow chức năng

## Flow A - Đăng ký/đăng nhập tài khoản thường

Mục tiêu: tạo user và lấy token.

1. `POST /auth/register`
   - Body tối thiểu: `email`
   - Nên có thêm: `password`, `fullName`
2. `POST /auth/login`
   - Body bắt buộc: `email`, `password`
3. `GET /auth/profile`
   - Cần Bearer token
   - Kỳ vọng: trả thông tin user từ token

## Flow B - Đăng nhập Google cho mobile

Mục tiêu: đăng nhập social bằng `idToken`.

1. Mobile lấy Google `idToken` từ SDK
2. `POST /auth/google`
   - Body bắt buộc: `idToken`
3. `GET /auth/profile`
   - Verify token vừa nhận dùng được

Ghi chú:
- Flow mobile dùng `POST /auth/google`
- Các route OAuth redirect GET đang ẩn khỏi Swagger

## Flow C - Ghép đôi (Couple)

Mục tiêu: tạo quan hệ couple để dùng tính năng cặp đôi.

1. A gọi `POST /couple/invite`
   - Nhận `inviteCode`
2. B gọi `POST /couple/join`
   - Body: `inviteCode`
3. A hoặc B gọi `GET /couple`
   - Kỳ vọng: có dữ liệu couple + partner

Lưu ý:
- Nếu chưa invite/join mà gọi `GET /couple` sẽ `404`

## Flow D - Hồ sơ người dùng (chỉ API cần thiết)

Mục tiêu: đọc/sửa profile của chính mình.

1. `GET /users/me`
2. `PUT /users/me`
   - Body: `fullName`, `bio`, `avatar`, `gender`, ...
3. `PUT /users/me/location`
   - Body bắt buộc: `lat`, `lng`
   - Optional: `accuracy`, `batteryLevel`, `isCharging`, `speed`

Ghi chú:
- Không dùng flow mobile:
  - `GET /users`
  - `GET /users/:id`
  - `GET /users/email/:email`
  - `DELETE /users/:id`

## Flow E - Cài đặt & bảo mật

Mục tiêu: chỉnh setting và PIN.

1. `GET /settings`
2. `PUT /settings`
   - Body: `notificationEnabled`, `theme`, `privacy`
3. `POST /security/pin`
   - Body: `pin` (4 chữ số)
4. `POST /security/verify-pin`
   - Body: `pin`

## Flow F - Địa điểm & geofence

Mục tiêu: quản lý places và gửi sự kiện vào/ra.

1. `GET /places`
2. `POST /places`
3. `PUT /places/:id`
4. `DELETE /places/:id`
5. `GET /places/search?q=...`
6. `POST /geofence/event`
   - Body: `placeId`, `transition` (`ENTER`/`EXIT`)

## Flow G - Sự kiện cặp đôi (Events)

Mục tiêu: CRUD sự kiện.

1. `GET /events`
2. `POST /events`
   - Body bắt buộc: `title`, `date`
3. `PUT /events/:id`
4. `DELETE /events/:id`

## Flow H - Kỷ niệm (Moments)

Mục tiêu: CRUD moment.

1. `GET /moments`
2. `POST /moments`
   - Body: `content`, `photos[]`, `privacy`
3. `PUT /moments/:id`
4. `DELETE /moments/:id`

## Flow I - Upload & Media album

Mục tiêu: upload file rồi tạo media record.

1. `POST /uploads/file`
   - `multipart/form-data`, field `file`
2. `POST /media`
   - Body bắt buộc: `url` (lấy từ bước upload)
3. `GET /media`
4. `GET /media/:id`
5. `GET /media/:id/download`
6. `PATCH /media/:id`
7. `PATCH /media/:id/status`
8. `DELETE /media/:id`
9. `GET /media/changes`

## Flow J - Chat

Mục tiêu: lấy lịch sử chat và clear chat.

1. `GET /chat/messages?limit=&offset=`
2. `POST /chat/clear`

WebSocket (nếu test realtime):
1. Kết nối socket với token
2. Emit `join`
3. Emit `message:send`
4. Nhận `message:received`

## Flow K - Notifications

Mục tiêu: đọc và đánh dấu đã đọc thông báo.

1. `GET /notifications`
2. `PUT /notifications/:id/read`
3. `POST /notifications/test` (tạo dữ liệu test nhanh)

## Flow L - Trips

Mục tiêu: sync và đọc lịch sử di chuyển.

1. `POST /trips/sync`
   - Body: `trips[]`
2. `GET /trips?userId=&page=&limit=`
3. `GET /trips/:id/detail`

## Flow M - Refresh và đăng xuất

Mục tiêu: hoàn tất vòng đời phiên đăng nhập.

1. `POST /auth/refresh`
   - Body `refreshToken` hoặc dùng cookie
2. `POST /auth/logout`

---

## 3. Smoke flow ngắn để demo sếp

1. `POST /auth/register` (A, B)
2. `POST /auth/login` (A, B)
3. `POST /couple/invite` (A)
4. `POST /couple/join` (B)
5. `GET /couple`
6. `PUT /users/me/location`
7. `POST /places`
8. `POST /events`
9. `POST /moments`
10. `POST /uploads/file`
11. `POST /media`
12. `GET /chat/messages`
13. `GET /notifications`
14. `GET /trips`
15. `POST /auth/refresh`
16. `POST /auth/logout`

Nếu 16 bước này pass (không có 5xx), có thể kết luận luồng chính đang ổn.
