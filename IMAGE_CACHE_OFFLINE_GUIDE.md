# IMAGE_CACHE_OFFLINE_GUIDE

Mục tiêu:
- Người dùng đã xem ảnh 1 lần thì lần sau mở lại vẫn thấy (kể cả offline).
- Giảm tải server ảnh.

## 1. Những gì đã bật trong code hiện tại

1. Backend đã bật cache header mạnh cho `/uploads/**`:
   - `Cache-Control: public, max-age=31536000, immutable`
2. Frontend web đã có Service Worker cache-first cho `/uploads/**`:
   - File: `frontend/public/offline-image-sw.js`
   - Đăng ký tại: `frontend/src/main.tsx` (chỉ chạy ở production)

## 2. Áp dụng cho mobile app (native)

Service Worker không chạy trong app native. Mobile cần cache riêng ở client:

1. Android:
   - Dùng Coil/Glide.
   - Bật disk cache + memory cache.
2. iOS:
   - Dùng SDWebImage/Kingfisher.
   - Bật disk cache + memory cache.
3. React Native:
   - Dùng `react-native-fast-image`.
   - Dùng policy `immutable` cho URL không đổi nội dung.

## 3. Quy tắc quan trọng để cache hiệu quả

1. URL ảnh nên bất biến:
   - Nếu ảnh thay đổi nội dung thì đổi URL mới.
2. Dùng thumbnail trước:
   - Danh sách dùng ảnh nhỏ.
   - Mở detail mới tải ảnh lớn.
3. Có giới hạn cache:
   - Tránh đầy bộ nhớ máy.
4. Có retry nền:
   - Khi online lại thì refresh ảnh nếu cần.

## 4. Đề xuất để giảm tải server thêm nữa

1. Tạo sẵn thumbnail khi upload (200px/400px).
2. Chuyển ảnh sang WebP/AVIF nếu có thể.
3. Đặt CDN trước `/uploads`.
4. Theo dõi metric:
   - Cache hit ratio
   - Băng thông ảnh
   - Tỉ lệ request ảnh lỗi
