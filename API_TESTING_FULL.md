# Tài liệu test toàn bộ API (Swagger) - Dating App Backend

Cập nhật theo source code hiện tại ngày **09/03/2026**.

Nếu team mobile/frontend chỉ cần flow Google login bằng `POST`, xem nhanh:
- `MOBILE_GOOGLE_LOGIN_POST_ONLY.md`

## 0. Kết quả rà soát API trước khi viết tài liệu

Đã rà lại backend trước khi cập nhật docs:

- `npm run build`: **PASS**
- `npm test`: **PASS** (9/9 test)

Các điểm cần lưu ý (rủi ro/lỗi tiềm ẩn từ code hiện tại):

1. `POST /security/pin` và `POST /security/verify-pin` đang nhận `pin` trực tiếp từ `@Body("pin")` (không DTO validation). Nếu không gửi `pin`, service có thể phát sinh lỗi runtime (500) thay vì trả 400 chuẩn.
2. `POST /auth/register` cho phép thiếu `password` (DTO đang `@IsOptional()`), có thể tạo user local không đăng nhập được bằng mật khẩu.
3. `GET /users/:id` và `DELETE /users/:id` chưa có kiểm soát role/ownership; người dùng đã login có thể truy cập/xóa user khác.
4. `GET /` không `@Public()`, nên hiện tại cần JWT (nếu dùng làm health-check thì chưa hợp lý).

Lưu ý: Tài liệu bên dưới mô tả đúng hành vi API **đang chạy theo code hiện tại** (kể cả các điểm chưa tối ưu ở trên).

---

## 1. Chuẩn bị môi trường test

### 1.1 Chạy backend

1. Mở terminal tại thư mục dự án.
2. Chạy:

```bash
cd backend
npm install
npm run start:dev
```

3. Mở Swagger: `http://localhost:3000/api/docs`

### 1.2 Lưu ý quan trọng

- Dự án **không** set global prefix `api`, nên endpoint thực tế là:
  - `/auth/login`
  - `/users/me`
  - ...
- JWT Guard đang bật toàn cục. Mặc định endpoint nào không có `@Public()` đều cần token.
- Trong Swagger:
  - Bấm **Authorize**.
  - Dán `access_token` vào ô Bearer token.

### 1.3 Dữ liệu test nên chuẩn bị

- 2 tài khoản:
  - `USER_A_EMAIL`, `USER_A_PASSWORD`
  - `USER_B_EMAIL`, `USER_B_PASSWORD`
- Token:
  - `ACCESS_A`, `REFRESH_A`
  - `ACCESS_B`, `REFRESH_B`
- ID dùng lại:
  - `USER_A_ID`, `USER_B_ID`
  - `INVITE_CODE`, `COUPLE_ID`
  - `EVENT_ID`, `MOMENT_ID`, `PLACE_ID`, `MEDIA_ID`, `TRIP_ID`, `NOTIFICATION_ID`

---

## 1.4 Luồng đăng nhập dùng cho tài liệu này (đã rút gọn)

Để team dễ tích hợp và test, tài liệu này chỉ giữ **1 flow social login chính**:

1. Mobile/client lấy `idToken` từ Google SDK.
2. Gọi `POST /auth/google` với body `{ "idToken": "..." }`.
3. Backend verify token với Google và trả `user`, `tokens`.

Luồng OAuth redirect không dùng trong flow test rút gọn này.

---

## 2. Quy ước test cho mọi API

Với mỗi API nên test tối thiểu 4 nhóm ca:

1. **Happy path**: request hợp lệ, đúng precondition.
2. **Auth fail**: thiếu token/sai token (nếu endpoint cần auth).
3. **Validation fail**: sai kiểu dữ liệu, thiếu field bắt buộc, enum sai.
4. **Business fail**: không đủ điều kiện nghiệp vụ (không thuộc quyền, không tồn tại dữ liệu, chưa ghép đôi...).

---

## 3. Hướng dẫn test chi tiết từng API

## 3.1 Root

### GET `/`

Mục đích: API test nhanh server.

Tiền điều kiện:
- Có JWT hợp lệ (do route này đang bị bảo vệ).

Các bước test (Swagger):
1. Authorize bằng token.
2. Mở endpoint `GET /`.
3. Bấm `Try it out` -> `Execute`.

Kỳ vọng:
- `200 OK`
- Body: `Hello World!11111`

Ca lỗi nên test:
- Không token -> `401`.

---

## 3.2 Auth module (`/auth`)

### POST `/auth/register`

Mục đích: đăng ký tài khoản mới.

Các bước test:
1. Mở `POST /auth/register`.
2. `Try it out`.
3. Dùng payload:

```json
{
  "email": "usera_test@example.com",
  "password": "123456",
  "fullName": "Nguyễn A"
}
```

4. `Execute`.

Kỳ vọng:
- `201 Created`
- Response có `user`, `tokens`
- Set-Cookie: `access_token`, `refresh_token`

Ca lỗi nên test:
1. Email trùng -> `409`.
2. Email sai format -> `400`.
3. Thiếu password (do DTO đang optional) -> có thể vẫn tạo user, cần ghi nhận hành vi hiện tại.

### POST `/auth/login`

Mục đích: đăng nhập local account.

Payload mẫu:

```json
{
  "email": "usera_test@example.com",
  "password": "123456"
}
```

Kỳ vọng:
- `200 OK`
- Có `user`, `tokens`
- Có cookie token

Ca lỗi:
1. Sai email/password -> `401`.
2. Password < 6 ký tự -> `400`.
3. Account bị khóa/inactive -> `401`.

### GET `/auth/profile`

Mục đích: lấy thông tin user từ access token hiện tại.

Các bước:
1. Authorize bằng token.
2. Execute `GET /auth/profile`.

Kỳ vọng:
- `200 OK`
- Trả payload user đã xác thực.

Ca lỗi:
- Token sai/hết hạn -> `401`.

### POST `/auth/google`

Mục đích: login Google kiểu mobile/API bằng `idToken` (flow social login chính).

Payload mẫu:

```json
{
  "idToken": "<GOOGLE_ID_TOKEN>"
}
```

Kỳ vọng:
- `200 OK`
- Có `user`, `tokens`

Ca lỗi:
- Token Google sai/hết hạn -> `401`.

### POST `/auth/refresh`

Mục đích: cấp lại access token bằng refresh token.

Cách test 1 (body):

```json
{
  "refreshToken": "<REFRESH_TOKEN>"
}
```

Cách test 2 (cookie):
- Không cần body, dùng cookie `refresh_token`.

Kỳ vọng:
- `200 OK`
- Trả token mới + set lại cookie.

Ca lỗi:
1. Thiếu refresh token -> `401`.
2. Refresh token sai/hết hạn -> `401`.

### POST `/auth/logout`

Mục đích: đăng xuất và xóa session token.

Các bước:
1. Authorize.
2. Execute `POST /auth/logout`.

Kỳ vọng:
- `200 OK`
- `{ "success": true }`
- Cookie token được clear.

Ca lỗi:
- Token không hợp lệ -> `401`.

---

## 3.3 Users module (`/users`)

### GET `/users`

Mục đích: lấy danh sách user.

Bước test:
1. Mở endpoint.
2. Execute trực tiếp (public).

Kỳ vọng:
- `200 OK`
- Mảng user.

### GET `/users/me`

Mục đích: lấy profile user hiện tại.

Bước test:
1. Authorize.
2. Execute.

Kỳ vọng: `200`.

Ca lỗi: thiếu/sai token -> `401`.

### GET `/users/email/:email`

Mục đích: tìm user theo email.

Ví dụ param:
- `email = usera_test@example.com` (nên URL encode nếu cần).

Kỳ vọng:
- `200 OK`
- Trả user hoặc `null`.

### GET `/users/:id`

Mục đích: lấy user theo id.

Tiền điều kiện: có token.

Kỳ vọng:
- `200` nếu tồn tại.
- `404` nếu không tồn tại.

### PUT `/users/me`

Mục đích: cập nhật thông tin cá nhân.

Payload mẫu:

```json
{
  "fullName": "Nguyễn Văn A",
  "gender": "MALE",
  "birthDate": "1998-01-20",
  "avatar": "http://localhost:3000/uploads/image/avatar.jpg",
  "photos": [
    "http://localhost:3000/uploads/image/p1.jpg",
    "http://localhost:3000/uploads/image/p2.jpg"
  ],
  "genderPreference": "BOTH",
  "bio": "Xin chào",
  "jobTitle": "Developer",
  "company": "ACME",
  "school": "HCMUT"
}
```

Kỳ vọng:
- `200 OK`
- Trả user đã cập nhật.

Ca lỗi:
1. Gửi field bị cấm (`role`, `isBanned`, ...) -> `400`.
2. `fullName` > 15 ký tự -> `400`.
3. `avatar` không đúng URL -> `400`.

### PUT `/profile/location`

Mục đích: cập nhật vị trí hiện tại.
- Legacy compatibility endpoint: `PUT /users/me/location`.

Payload mẫu:

```json
{
  "lat": 10.7769,
  "lng": 106.7009,
  "accuracy": 12.3,
  "batteryLevel": 88,
  "isCharging": false,
  "speed": 0
}
```

Kỳ vọng:
- `200 OK`
- Trả object location đã normalize.

Ca lỗi:
1. `lat` ngoài [-90,90] -> `400`.
2. `lng` ngoài [-180,180] -> `400`.
3. `batteryLevel` ngoài [0,100] -> `400`.

### DELETE `/users/:id`

Mục đích: xóa user theo id.

Bước test:
1. Authorize.
2. Điền `id` user test.
3. Execute.

Kỳ vọng:
- `200 OK`
- `{ "message": "User deleted successfully" }`

Ca lỗi:
- ID không tồn tại -> `404`.

Lưu ý bảo mật:
- Hiện chưa có role guard cho API này.

---

## 3.4 Settings module (`/settings`)

### GET `/settings`

Mục đích: lấy cài đặt của user.

Kỳ vọng:
- `200 OK`
- Nếu chưa có settings, hệ thống tự tạo mặc định.

### PUT `/settings`

Mục đích: cập nhật cài đặt.

Payload mẫu:

```json
{
  "notificationEnabled": true,
  "theme": "light",
  "privacy": "friends"
}
```

Kỳ vọng: `200 OK`.

Ca lỗi:
1. `theme` không thuộc `light|dark|system` -> `400`.
2. `privacy` không thuộc `public|friends|private` -> `400`.

---

## 3.5 Security module (`/security`)

### POST `/security/pin`

Mục đích: đặt PIN 4 chữ số.

Payload mẫu:

```json
{
  "pin": "1234"
}
```

Kỳ vọng:
- `200 OK`
- Trả security record.

Ca lỗi:
1. `pin = "12"` -> `400`.
2. `pin = "abcd"` -> `400`.
3. Thiếu `pin` -> hiện có thể gây lỗi 500 (điểm cần sửa code).

### POST `/security/verify-pin`

Mục đích: xác thực PIN.

Payload mẫu:

```json
{
  "pin": "1234"
}
```

Kỳ vọng:
- `200 OK`
- `{ "success": true }`

Ca lỗi:
1. Chưa set PIN -> `400`.
2. PIN sai -> `400`.
3. Thiếu `pin` -> có thể phát sinh lỗi runtime (cần harden validation).

---

## 3.6 Notifications module (`/notifications`)

### GET `/notifications`

Mục đích: lấy danh sách thông báo của user hiện tại.

Kỳ vọng: `200 OK`, danh sách theo thời gian giảm dần.

### PUT `/notifications/:id/read`

Mục đích: đánh dấu đã đọc.

Bước test:
1. Tạo notification trước (dùng `/notifications/test`).
2. Lấy `NOTIFICATION_ID`.
3. Gọi `/notifications/{id}/read`.

Kỳ vọng:
- `200 OK`
- `isRead = true`.

Ca lỗi:
- ID không tồn tại/không thuộc user -> `404`.

### POST `/notifications/test`

Mục đích: tạo thông báo test.

Payload mẫu:

```json
{
  "title": "Thông báo thử",
  "content": "Nội dung thử",
  "type": "test"
}
```

Kỳ vọng:
- `200 OK`
- Tạo notification thành công.

Ca kiểm tra thêm:
- Để trống body -> vẫn tạo được với giá trị fallback.

---

## 3.7 Uploads module (`/uploads`)

### POST `/uploads/presign`

Mục đích: endpoint cũ cho presigned upload.

Payload mẫu:

```json
{
  "fileName": "photo.jpg",
  "type": "image"
}
```

Hành vi hiện tại theo code:
- Trả `400` với thông báo presigned upload đang bị tắt trong local mode.

### POST `/uploads/file`

Mục đích: upload file trực tiếp (multipart/form-data).

Các bước test trên Swagger:
1. Authorize.
2. Mở `POST /uploads/file`.
3. `Try it out`.
4. Chọn file tại field `file`.
5. Execute.

Kỳ vọng:
- `200 OK`
- Trả `fileUrl`, `type`, `mimeType`, `size`, `fileName`.

Giới hạn:
- Tối đa 50MB.
- MIME hỗ trợ:
  - Image: jpeg/png/webp/gif
  - Audio: mpeg/wav/ogg/webm
  - Video: mp4/webm/quicktime

Ca lỗi:
1. Không gửi file -> `400`.
2. File type không hỗ trợ -> `400`.
3. Quá 50MB -> `400`.

---

## 3.8 Couple module (`/couple`)

### GET `/couple`

Mục đích: lấy thông tin cặp đôi hiện tại + partner.

Kỳ vọng:
- `200` nếu user đang trong couple.
- `404` nếu chưa ghép đôi.

### GET `/couple/locations`

Mục đích: lấy vị trí hiện tại của `me` và `partner`.

Kỳ vọng:
- `200` với object `{ me, partner }`.

### GET `/couple/location-history?limit=`

Mục đích: lấy lịch sử vị trí của hai người.

Ví dụ:
- `limit=100`

Kỳ vọng:
- `200`
- `limit` được clamp trong [1..500], mặc định 120.

### POST `/couple/invite`

Mục đích: tạo mã mời ghép đôi.

Bước test:
1. Đăng nhập bằng user A (chưa có couple).
2. Gọi endpoint.

Kỳ vọng:
- `200`
- Trả invite có `inviteCode` (HEX 8 ký tự), hết hạn sau 7 ngày.

Ca lỗi:
- User đã có couple -> `409`.

### POST `/couple/join`

Mục đích: user B tham gia bằng mã mời.

Payload mẫu:

```json
{
  "inviteCode": "A1B2C3D4"
}
```

Kỳ vọng:
- `200` tạo couple mới.

Ca lỗi:
1. Sai format code -> `400`.
2. Code không tồn tại -> `404`.
3. Code hết hạn/đã dùng -> `400`.
4. Join code của chính mình -> `400`.
5. User đã có couple -> `409`.

### POST `/couple/connect-new`

Mục đích: ngắt couple hiện tại (nếu có) và kết nối couple mới từ invite code.

Payload giống `/couple/join`.

Kỳ vọng:
- `200`.

### POST `/couple/disconnect`

Mục đích: ngắt kết nối couple hiện tại.

Kỳ vọng:
- `200`, status couple chuyển `DISCONNECTED`.

Ca lỗi:
- Chưa có couple -> `404`.

### PUT `/couple/start-date`

Mục đích: cập nhật ngày bắt đầu yêu.

Payload mẫu:

```json
{
  "startDate": "2025-02-14"
}
```

Kỳ vọng: `200`.

Ca lỗi: sai định dạng date -> `400`.

### PUT `/couple/theme`

Mục đích: cập nhật theme couple.

Payload mẫu:

```json
{
  "theme": "sunset"
}
```

Kỳ vọng: `200`.

---

## 3.9 Chat module (`/chat`)

### GET `/chat/messages?limit=&offset=`

Mục đích: lấy lịch sử chat.

Ví dụ:
- `limit=50`
- `offset=0`

Kỳ vọng:
- `200`, danh sách message theo `createdAt DESC`.

Ca lỗi:
- Chưa có couple -> `404`.

### POST `/chat/clear`

Mục đích: xóa toàn bộ chat của couple.

Kỳ vọng:
- `200`
- `{ "success": true }`

Ca lỗi:
- Chưa có couple -> `404`.

---

## 3.10 Moments module (`/moments`)

### GET `/moments`

Mục đích: lấy feed moments của couple.

Kỳ vọng: `200`.

### POST `/moments`

Mục đích: tạo moment.

Payload mẫu:

```json
{
  "content": "Kỷ niệm hôm nay",
  "photos": [
    "http://localhost:3000/uploads/image/abc.jpg"
  ],
  "privacy": "COUPLE"
}
```

Kỳ vọng:
- `201 Created`
- Nếu có `photos`, mỗi ảnh sẽ được sync sang media album.

Ca lỗi:
1. `privacy` sai enum -> `400`.
2. Chưa có couple -> `404`.

### PUT `/moments/:id`

Mục đích: cập nhật moment.

Kỳ vọng:
- `200` nếu là creator.

Ca lỗi:
1. Không tồn tại -> `404`.
2. Không phải creator -> `403`.

### DELETE `/moments/:id`

Mục đích: xóa moment.

Kỳ vọng:
- `200`, `{ "success": true }`.

Ca lỗi:
- `404` / `403` tương tự update.

---

## 3.11 Events module (`/events`)

### GET `/events`

Mục đích: lấy danh sách sự kiện của couple.

Kỳ vọng:
- `200`
- Sắp xếp theo ngày tăng dần.

### POST `/events`

Mục đích: tạo sự kiện.

Payload mẫu:

```json
{
  "title": "Kỷ niệm 1 năm",
  "description": "Đi ăn tối",
  "date": "2026-12-24",
  "isAnniversary": true
}
```

Kỳ vọng:
- `201`.

Ca lỗi:
1. Thiếu `title` hoặc `date` -> `400`.
2. Chưa có couple -> `404`.

### PUT `/events/:id`

Mục đích: sửa sự kiện.

Kỳ vọng:
- `200`.

Ca lỗi:
1. Event không tồn tại -> `404`.
2. Event không thuộc couple của user -> `403`.

### DELETE `/events/:id`

Mục đích: xóa sự kiện.

Kỳ vọng:
- `200`, `{ "success": true }`.

Ca lỗi:
- `404` / `403` tương tự update.

---

## 3.12 Trips module (`/trips`)

### GET `/trips?userId=&page=&limit=`

Mục đích: lấy danh sách hành trình.

Ví dụ query:
- `userId=<USER_A_ID>`
- `page=1`
- `limit=20`

Kỳ vọng:
- `200`
- Response dạng:

```json
{
  "data": [],
  "page": 1,
  "limit": 20,
  "total": 0
}
```

Ca lỗi:
- `userId` không thuộc 2 người trong couple -> `404`.

### GET `/trips/:id/detail`

Mục đích: lấy chi tiết 1 trip (có `routeFull`).

Kỳ vọng:
- `200` nếu trip hợp lệ và thuộc couple.

Ca lỗi:
- Trip không tồn tại/không thuộc couple -> `404`.

### POST `/trips/sync`

Mục đích: đồng bộ danh sách trip từ client.

Payload mẫu:

```json
{
  "trips": [
    {
      "id": "trip_001",
      "startTime": 1760000000000,
      "endTime": 1760003600000,
      "distanceKm": 12.5,
      "startAddress": "Quận 1",
      "endAddress": "Quận 7",
      "routePoints": [
        { "lat": 10.7769, "lng": 106.7009 },
        { "lat": 10.7820, "lng": 106.7100 }
      ]
    }
  ]
}
```

Kỳ vọng:
- `201 Created`
- `{ "success": true, "count": 1 }`

Ca lỗi:
1. `routePoints` rỗng -> `400`.
2. Sai kiểu `lat/lng/startTime...` -> `400`.

---

## 3.13 Places module (`/places`)

### GET `/places?since=`

Mục đích: lấy danh sách địa điểm của couple.

Ví dụ:
- Không `since`: lấy bản ghi chưa xóa mềm.
- Có `since=1760000000000`: lấy bản ghi cập nhật từ thời điểm đó.

Kỳ vọng: `200`.

### POST `/places`

Mục đích: tạo địa điểm.

Payload mẫu:

```json
{
  "name": "Nhà",
  "address": "Quận 1, TP.HCM",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "placeType": "HOME",
  "radius": 200,
  "iconResName": "ic_home",
  "isSynced": true,
  "isDeleted": false
}
```

Kỳ vọng:
- `201 Created`.

Ca lỗi:
1. Thiếu `name` -> `400`.
2. `latitude/longitude/radius` ngoài range -> `400`.

### PUT `/places/:id`

Mục đích: cập nhật địa điểm.

Payload mẫu:

```json
{
  "name": "Nhà mới",
  "radius": 300
}
```

Kỳ vọng: `200`.

Ca lỗi:
- Place không tồn tại hoặc không thuộc couple -> `404`.

### DELETE `/places/:id`

Mục đích: xóa mềm địa điểm.

Kỳ vọng:
- `200`
- Bản ghi chuyển `isDeleted=true`.

Ca lỗi:
- Place không tồn tại -> `404`.

### GET `/places/search?q=`

Mục đích: tìm địa điểm từ Nominatim.

Ví dụ query:
- `q=highlands`

Kỳ vọng:
- `200`, trả danh sách địa điểm gợi ý.
- Nếu `q` dưới 2 ký tự -> `[]`.
- Nếu dịch vụ ngoài lỗi -> `[]` (không throw).

---

## 3.14 Geofence module (`/geofence`)

### POST `/geofence/event`

Mục đích: nhận sự kiện vào/ra geofence để tạo thông báo cho partner.

Payload mẫu:

```json
{
  "placeId": "11111111-2222-3333-4444-555555555555",
  "transition": "ENTER",
  "timestamp": 1760000000000
}
```

Kỳ vọng:
- `201`
- `{ "success": true, "placeId": "...", "transition": "ENTER", "timestamp": 1760000000000 }`

Ca lỗi:
1. `placeId` sai format UUID -> `400`.
2. Place không tồn tại/không thuộc couple -> `404`.
3. Chưa có partner -> `400`.

---

## 3.15 Media module (`/media`)

### GET `/media?filter=&limit=&cursor=`

Mục đích: lấy album media có phân trang cursor.

Ví dụ query:
- `filter=all|me|partner`
- `limit=20`
- `cursor=2026-03-02T01:29:44.575Z|<MEDIA_ID>`

Kỳ vọng:
- `200`

```json
{
  "items": [],
  "nextCursor": null
}
```

Ca lỗi:
1. Cursor sai định dạng date -> `400`.
2. `filter=partner` nhưng chưa có partner -> `400`.

### GET `/media/changes?since=&timeoutMs=`

Mục đích: long-poll chờ thay đổi album.

Ví dụ:
- `since=0`
- `timeoutMs=25000`

Kỳ vọng:
- `200` với event thay đổi hoặc timeout event theo service realtime.

### POST `/media`

Mục đích: tạo media mới cho couple.

Payload mẫu:

```json
{
  "url": "http://localhost:3000/uploads/image/abc.jpg",
  "type": "image",
  "caption": "Ảnh mới",
  "visibility": "couple_only",
  "thumbUrl": "http://localhost:3000/uploads/image/thumb_abc.jpg"
}
```

Kỳ vọng:
- `201`.

Ca lỗi:
1. `url` không hợp lệ -> `400`.
2. `type` sai -> `400`.
3. `visibility` sai -> `400`.
4. Chưa có couple -> `404`.

### GET `/media/:id`

Mục đích: lấy chi tiết media.

Kỳ vọng:
- `200` nếu media tồn tại và thuộc couple của user.

Ca lỗi:
1. Không tồn tại -> `404`.
2. Không thuộc couple -> `403`.

### GET `/media/:id/download`

Mục đích: lấy `downloadUrl` media.

Kỳ vọng:
- `200`

```json
{
  "downloadUrl": "..."
}
```

Ca lỗi:
- như `/media/:id`.

### PATCH `/media/:id`

Mục đích: cập nhật caption/visibility/thumbUrl.

Payload mẫu:

```json
{
  "caption": "Caption mới",
  "visibility": "friends",
  "thumbUrl": "http://localhost:3000/uploads/image/new_thumb.jpg"
}
```

Kỳ vọng: `200`.

Ca lỗi:
1. `visibility` sai -> `400`.
2. Media không tồn tại -> `404`.

### PATCH `/media/:id/status`

Mục đích: cập nhật trạng thái media.

Payload mẫu:

```json
{
  "status": "active"
}
```

Giá trị hợp lệ:
- `processing`
- `active`
- `flagged`
- `synced`

Kỳ vọng: `200`.

Ca lỗi:
- Status sai -> `400`.

### DELETE `/media/:id`

Mục đích: xóa mềm media.

Kỳ vọng:
- `200`
- `{ "success": true }`

Ca lỗi:
- Media không tồn tại -> `404`.

---

## 4. WebSocket API cần test

## 4.1 Chuẩn bị

1. Kết nối socket tới backend.
2. Gửi access token qua:
   - `handshake.auth.token`
   - hoặc header `authorization`.

Nếu token không hợp lệ -> server trả `Unauthorized` (WsException).

## 4.2 Chat gateway

### Event `join`

Mục đích: tham gia phòng `couple:<coupleId>`.

Cách test:
1. Kết nối socket bằng token user trong couple.
2. Emit event `join` với payload rỗng.

Kỳ vọng ack:

```json
{
  "event": "joined",
  "data": {
    "success": true,
    "coupleId": "..."
  }
}
```

### Event `message:send`

Payload mẫu:

```json
{
  "type": "TEXT",
  "content": "Xin chào",
  "tempId": "tmp-001"
}
```

Kỳ vọng:
1. Ack trả message đã lưu.
2. Room couple nhận event `message:received`.

Ca lỗi:
- `type` sai enum.
- Không token/chưa có couple.

## 4.3 Media gateway

### Event `album:join`

Mục đích: join room album của couple.

Kỳ vọng ack:

```json
{
  "event": "album:joined",
  "data": {
    "coupleId": "..."
  }
}
```

### Server event `album:changed`

Mục đích: server push khi tạo/sửa/xóa media.

Cách test:
1. Socket A emit `album:join`.
2. Gọi REST `POST /media` hoặc `PATCH /media/:id` hoặc `DELETE /media/:id`.
3. Quan sát socket A nhận event `album:changed`.

---

## 5. Kịch bản smoke test end-to-end khuyến nghị

1. `POST /auth/register` tạo A, B.
2. `POST /auth/login` A, B.
3. `POST /couple/invite` bằng A.
4. `POST /couple/join` bằng B.
5. `PUT /profile/location` cho cả A và B.
6. `POST /places` tạo địa điểm.
7. `POST /events` tạo sự kiện.
8. `POST /moments` tạo moment có ảnh.
9. `POST /uploads/file` upload file media.
10. `POST /media` tạo media.
11. `GET /chat/messages` kiểm tra chat.
12. `GET /notifications` kiểm tra thông báo.
13. `GET /trips` và `POST /trips/sync` kiểm tra trips.
14. `POST /security/pin` + `POST /security/verify-pin`.
15. `POST /auth/refresh` + `POST /auth/logout`.

Nếu toàn bộ pass, hệ thống đã được kiểm tra đầy đủ các luồng chính.
