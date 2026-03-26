# API_TEST_FLOW_FOR_BOSS

Tài liệu này dùng để gửi sếp, mô tả thứ tự test API theo mức ưu tiên, dễ theo dõi trạng thái Pass/Fail.

Cập nhật: 09-03-2026

## 1. Mục tiêu

1. Kiểm tra nhanh hệ thống chạy được end-to-end.
2. Kiểm tra đầy đủ luồng nghiệp vụ chính cho mobile.
3. Có mẫu báo cáo rõ ràng để ra quyết định GO/NO-GO.

## 2. Phạm vi

- Bao gồm: Auth, Couple, Users (các API cần thiết), Settings, Security, Locations, Events, Moments, Media, Trips, Notifications, Uploads, WebSocket.
- Không bao gồm: route UI Swagger (`/api/docs`).
- Lược bỏ khỏi phạm vi test mobile các API user không cần thiết:
  - `GET /users`
  - `GET /users/email/:email`
  - `GET /users/:id`
  - `DELETE /users/:id`

## 3. Chuẩn bị trước test

1. Chạy backend:
   - `cd backend`
   - `npm install`
   - `npm run start:dev`
2. Swagger:
   - `http://localhost:3000/api/docs`
3. Tài khoản test:
   - `USER_A_EMAIL`, `USER_A_PASSWORD`
   - `USER_B_EMAIL`, `USER_B_PASSWORD`
4. Biến cần lưu:
   - `ACCESS_A`, `REFRESH_A`
   - `ACCESS_B`, `REFRESH_B`
   - `INVITE_CODE`, `COUPLE_ID`
   - `EVENT_ID`, `MOMENT_ID`, `PLACE_ID`, `MEDIA_ID`, `TRIP_ID`, `NOTIFICATION_ID`

## 4. Thứ tự test đề xuất

## Giai đoạn A - Smoke test nhanh (20-30 phút)

Mục tiêu: xác nhận toàn bộ dependency chính đều thông.

1. `POST /auth/register` (A, B)
2. `POST /auth/login` (A, B) hoặc `POST /auth/google` (nếu social mobile)
3. `POST /couple/invite` (A)
4. `POST /couple/join` (B, dùng `INVITE_CODE`)
5. `GET /users/me`
6. `PUT /users/me`
7. `PUT /profile/location`
8. `POST /locations`
9. `POST /events`
10. `POST /moments`
11. `POST /uploads/file`
12. `POST /media`
13. `GET /chat/messages`
14. `GET /notifications`
15. `GET /trips`
16. `POST /security/pin`
17. `POST /security/verify-pin`
18. `POST /auth/refresh`
19. `POST /auth/logout`

Điều kiện PASS Smoke:
- Tối thiểu 95% bước thành công.
- Không có lỗi `5xx`.
- Token flow chạy ổn định: `login -> authorize -> profile -> refresh -> logout`.

## Giai đoạn B - Full functional theo module (1.5 - 3 giờ)

Mục tiêu: test đủ happy path + auth fail + validation fail + business fail.

1. Auth
   - Register/Login/Profile/Refresh/Logout
   - Google mobile login: `POST /auth/google` với `idToken` thật
2. Users (chỉ phần cần thiết mobile)
   - `GET /users/me`
   - `PUT /users/me`
   - `PUT /profile/location`
   - Legacy compatibility: `PUT /users/me/location`
3. Couple
   - `GET /couple`
   - `GET /couple/locations`
   - `GET /couple/location-history`
   - `POST /couple/invite`
   - `POST /couple/join`
   - `POST /couple/connect-new`
   - `POST /couple/disconnect`
   - `PUT /couple/start-date`
   - `PUT /couple/theme`
4. Core couple features
   - Events: list/create/update/delete
   - Moments: list/create/update/delete
   - Locations: list/create/update/delete/search
   - Geofence: `POST /geofence/event`
   - Chat: `GET /chat/messages`, `POST /chat/clear`
   - Media: list/changes/create/get/download/update/status/delete
   - Trips: list/detail/sync
5. Settings + Security + Notifications + Uploads
   - `GET/PUT /settings`
   - `POST /security/pin`, `POST /security/verify-pin`
   - `GET /notifications`, `PUT /notifications/:id/read`, `POST /notifications/test`
   - `POST /uploads/file`, `POST /uploads/presign` (nếu còn dùng)
6. WebSocket
   - Chat gateway: `join`, `message:send`
   - Media gateway: `album:join`, verify `album:changed`

Điều kiện PASS Full:
- 100% endpoint trong phạm vi được gọi ít nhất 1 lần.
- Mỗi endpoint có đủ 4 nhóm case: happy/auth/validation/business.
- Không còn bug blocker `P0/P1`.

## 5. Ưu tiên xử lý lỗi khi fail

1. Auth/JWT/Refresh/Cookie
2. Couple mapping (invite/join/disconnect)
3. Upload/Media/Realtime Chat
4. Các module còn lại

## 6. Mẫu báo cáo gửi sếp (copy nhanh)

```text
[API Test Report - <date>]

1) Environment
- Base URL: <...>
- Swagger: <...>
- Build status: PASS/FAIL

2) Smoke Test
- Total steps: 19
- Passed: <x>/19
- Failed: <y>/19
- 5xx count: <n>
- Result: PASS/FAIL

3) Full Functional
- Total endpoints tested: <x>
- Pass rate: <x>%
- Blocker bugs (P0/P1): <n>
- Major bugs (P2): <n>
- Minor bugs (P3): <n>

4) Top issues
- [ID-01] <mô tả ngắn> | Impact: <...> | Owner: <...>
- [ID-02] <mô tả ngắn> | Impact: <...> | Owner: <...>

5) Release recommendation
- GO / NO-GO
- Lý do: <...>
```

## 7. Checklist trước khi chốt

1. Đã retest các endpoint fail sau khi fix.
2. Đã xác nhận không còn lỗi `5xx` trong luồng chính.
3. Đã lưu request/response mẫu cho bug quan trọng.
4. Đã attach evidence token flow.
5. Đã ghi rõ endpoint nào chưa test và lý do.
