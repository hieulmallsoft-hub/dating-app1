# Mobile Google Login (POST-only)

Tài liệu này chỉ giữ **1 flow social login duy nhất** để test và tích hợp:

- `POST /auth/google`

## 1) Route cần gọi

```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "<GOOGLE_ID_TOKEN>"
}
```

## 2) Bắt buộc phải có gì

1. `idToken` là bắt buộc.
2. `idToken` phải do Google cấp từ SDK (không tự fake).
3. `GOOGLE_CLIENT_ID` phía backend phải đúng với client tạo ra token.

## 3) Kết quả mong đợi

- Thành công: `200 OK`, trả `user`, `tokens`.
- Thất bại:
  - `401 Invalid Google token` (token sai/hết hạn/không đúng audience).
  - `400` nếu body sai định dạng.

## 4) Lấy idToken để test nhanh

1. Chạy frontend.
2. Mở trang lab: `http://localhost:5173/google-idtoken-lab`
3. Đăng nhập Google trên trang lab để lấy token.
4. Dùng token đó gọi `POST /auth/google` trên Swagger/Postman.

## 5) Không dùng trong flow rút gọn này

Không dùng luồng OAuth redirect/callback trong tài liệu rút gọn này.
