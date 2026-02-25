# Hướng Dẫn Test API Với Swagger

Tài liệu này hướng dẫn cách kiểm tra toàn bộ các chức năng của Dating App Backend thông qua Swagger UI.

# Hướng Dẫn Test API `GET /auth/google` là luồng web, sẽ chuyển hướng sang trang đăng nhập Google.

> [!WARNING]
> **Không test được `GET /auth/google` trực tiếp trên Swagger bằng nút "Execute"**.
> Swagger sẽ báo lỗi **"Failed to fetch"** hoặc **CORS** do chặn redirect.
> 👉 **Cách test**: Copy link `http://localhost:3001/auth/google` dán thẳng vào thanh địa chỉ trình duyệt.

## 1. Chuẩn Bị

- **URL**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Authorize**: Đăng nhập và copy `access_token` (không có chữ `Bearer`) vào nút **Authorize**.

---

## 2. Authentication (Module Auth)

| Method | Endpoint         | Mô tả                          | Body / Note                     |
| :----- | :--------------- | :----------------------------- | :------------------------------ |
| `POST` | `/auth/register` | Đăng ký tài khoản mới          | `{ email, password, fullName }` |
| `POST` | `/auth/login`    | Đăng nhập                      | `{ email, password }`           |
| `POST` | `/auth/refresh`  | Lấy token mới từ refresh token | `{ refreshToken }`              |
| `GET`  | `/auth/profile`  | Lấy thông tin user hiện tại    | Cần Authorize                   |
| `POST` | `/auth/logout`   | Đăng xuất                      | Xóa cookie token                |

---

## 3. Quản Lý User (Module User)

| Method   | Endpoint              | Mô tả                   | Note |
| :------- | :-------------------- | :---------------------- | :--- |
| `GET`    | `/users`              | Lấy danh sách user      |      |
| `GET`    | `/users/:id`          | Lấy chi tiết user       |      |
| `GET`    | `/users/email/:email` | Tìm user theo email     |      |
| `PUT`    | `/users/:id`          | Cập nhật thông tin user |      |
| `DELETE` | `/users/:id`          | Xóa user                |      |

---

## 4. Cặp Đôi (Module Couple & Invites)

| Method | Endpoint             | Mô tả                          | Body / Note         |
| :----- | :------------------- | :----------------------------- | :------------------ |
| `GET`  | `/couple`            | Xem thông tin cặp đôi hiện tại |                     |
| `POST` | `/couple/invite`     | Tạo mã lời mời                 | Trả về `inviteCode` |
| `POST` | `/couple/join`       | Tham gia cặp đôi               | `{ inviteCode }`    |
| `POST` | `/couple/disconnect` | Hủy kết nối cặp đôi            |                     |
| `PUT`  | `/couple/start-date` | Cập nhật ngày bắt đầu yêu      | `{ startDate }`     |
| `PUT`  | `/couple/theme`      | Cập nhật theme app             | `{ theme }`         |

---

## 5. Chat & Tin Nhắn (Module Chat)

| Method | Endpoint         | Mô tả                    | Params               |
| :----- | :--------------- | :----------------------- | :------------------- |
| `GET`  | `/chat/messages` | Lấy lịch sử tin nhắn     | `?limit=50&offset=0` |
| `POST` | `/chat/clear`    | Xóa toàn bộ lịch sử chat |                      |

---

## 6. Kỷ Niệm & Bảng Tin (Module Moments)

| Method   | Endpoint       | Mô tả               | Body                     |
| :------- | :------------- | :------------------ | :----------------------- |
| `GET`    | `/moments`     | Xem bảng tin (Feed) |                          |
| `POST`   | `/moments`     | Đăng bài viết mới   | `{ content, imageUrls }` |
| `PUT`    | `/moments/:id` | Sửa bài viết        |                          |
| `DELETE` | `/moments/:id` | Xóa bài viết        |                          |

---

## 7. Sự Kiện & Địa Điểm (Module Events & Places)

### Events

| Method   | Endpoint      | Mô tả                 | Body                        |
| :------- | :------------ | :-------------------- | :-------------------------- |
| `GET`    | `/events`     | Lấy danh sách sự kiện |                             |
| `POST`   | `/events`     | Tạo sự kiện mới       | `{ title, date, location }` |
| `PUT`    | `/events/:id` | Cập nhật sự kiện      |                             |
| `DELETE` | `/events/:id` | Xóa sự kiện           |                             |

### Places

| Method | Endpoint         | Mô tả                         | Params            |
| :----- | :--------------- | :---------------------------- | :---------------- |
| `GET`  | `/places`        | Lấy danh sách địa điểm đã lưu |                   |
| `GET`  | `/places/search` | Tìm kiếm địa điểm             | `?q=ten_dia_diem` |
| `POST` | `/places`        | Lưu địa điểm mới              |                   |

---

## 8. Media & Uploads

| Method | Endpoint           | Mô tả                         | Note                     |
| :----- | :----------------- | :---------------------------- | :----------------------- |
| `GET`  | `/media`           | Xem thư viện ảnh/video        | `?filter=all/me/partner` |
| `POST` | `/uploads/presign` | Lấy URL upload ảnh (S3/Cloud) | `{ fileName, type }`     |

---

## 9. Cài Đặt & Bảo Mật (Settings & Security)

| Method | Endpoint               | Mô tả               | Body      |
| :----- | :--------------------- | :------------------ | :-------- |
| `GET`  | `/settings`            | Lấy cài đặt cá nhân |           |
| `PUT`  | `/settings`            | Cập nhật cài đặt    |           |
| `POST` | `/security/pin`        | Đặt mã PIN bảo mật  | `{ pin }` |
| `POST` | `/security/verify-pin` | Xác thực mã PIN     | `{ pin }` |

---

## 10. Admin (Module Admin)

> **Yêu cầu**: User phải có role `ADMIN`.

| Method | Endpoint                 | Mô tả                     | Note |
| :----- | :----------------------- | :------------------------ | :--- |
| `GET`  | `/admin/users`           | Quản lý danh sách user    |      |
| `PUT`  | `/admin/users/:id/ban`   | Khóa tài khoản user       |      |
| `PUT`  | `/admin/users/:id/unban` | Mở khóa tài khoản         |      |
| `GET`  | `/admin/couples`         | Xem danh sách các cặp đôi |      |
| `GET`  | `/admin/stats`           | Xem thống kê hệ thống     |      |
