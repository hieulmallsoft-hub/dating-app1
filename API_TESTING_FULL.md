# Tài li?u test toàn b? API (Swagger) - Dating App Backend

C?p nh?t theo source code hi?n t?i ngày **09/03/2026**.

N?u team mobile/frontend ch? c?n flow Google login b?ng `POST`, xem nhanh:
- `MOBILE_GOOGLE_LOGIN_POST_ONLY.md`

## 0. K?t qu? rà soát API tru?c khi vi?t tài li?u

Ðã rà l?i backend tru?c khi c?p nh?t docs:

- `npm run build`: **PASS**
- `npm test`: **PASS** (9/9 test)

Các di?m c?n luu ý (r?i ro/l?i ti?m ?n t? code hi?n t?i):

1. `POST /security/pin` và `POST /security/verify-pin` dang nh?n `pin` tr?c ti?p t? `@Body("pin")` (không DTO validation). N?u không g?i `pin`, service có th? phát sinh l?i runtime (500) thay vì tr? 400 chu?n.
2. `POST /auth/register` cho phép thi?u `password` (DTO dang `@IsOptional()`), có th? t?o user local không dang nh?p du?c b?ng m?t kh?u.
3. `GET /users/:id` và `DELETE /users/:id` chua có ki?m soát role/ownership; ngu?i dùng dã login có th? truy c?p/xóa user khác.
4. `GET /` không `@Public()`, nên hi?n t?i c?n JWT (n?u dùng làm health-check thì chua h?p lý).

Luu ý: Tài li?u bên du?i mô t? dúng hành vi API **dang ch?y theo code hi?n t?i** (k? c? các di?m chua t?i uu ? trên).

---

## 1. Chu?n b? môi tru?ng test

### 1.1 Ch?y backend

1. M? terminal t?i thu m?c d? án.
2. Ch?y:

```bash
cd backend
npm install
npm run start:dev
```

3. M? Swagger: `http://localhost:3000/api/docs`

### 1.2 Luu ý quan tr?ng

- D? án **không** set global prefix `api`, nên endpoint th?c t? là:
  - `/auth/login`
  - `/users/me`
  - ...
- JWT Guard dang b?t toàn c?c. M?c d?nh endpoint nào không có `@Public()` d?u c?n token.
- Trong Swagger:
  - B?m **Authorize**.
  - Dán `access_token` vào ô Bearer token.

### 1.3 D? li?u test nên chu?n b?

- 2 tài kho?n:
  - `USER_A_EMAIL`, `USER_A_PASSWORD`
  - `USER_B_EMAIL`, `USER_B_PASSWORD`
- Token:
  - `ACCESS_A`, `REFRESH_A`
  - `ACCESS_B`, `REFRESH_B`
- ID dùng l?i:
  - `USER_A_ID`, `USER_B_ID`
  - `INVITE_CODE`, `COUPLE_ID`
  - `EVENT_ID`, `MOMENT_ID`, `PLACE_ID`, `MEDIA_ID`, `TRIP_ID`, `NOTIFICATION_ID`

---

## 1.4 Lu?ng dang nh?p dùng cho tài li?u này (dã rút g?n)

Ð? team d? tích h?p và test, tài li?u này ch? gi? **1 flow social login chính**:

1. Mobile/client l?y `idToken` t? Google SDK.
2. G?i `POST /auth/google` v?i body `{ "idToken": "..." }`.
3. Backend verify token v?i Google và tr? `user`, `tokens`.

Lu?ng OAuth redirect không dùng trong flow test rút g?n này.

---

## 2. Quy u?c test cho m?i API

V?i m?i API nên test t?i thi?u 4 nhóm ca:

1. **Happy path**: request h?p l?, dúng precondition.
2. **Auth fail**: thi?u token/sai token (n?u endpoint c?n auth).
3. **Validation fail**: sai ki?u d? li?u, thi?u field b?t bu?c, enum sai.
4. **Business fail**: không d? di?u ki?n nghi?p v? (không thu?c quy?n, không t?n t?i d? li?u, chua ghép dôi...).

---

## 3. Hu?ng d?n test chi ti?t t?ng API

## 3.1 Root

### GET `/`

M?c dích: API test nhanh server.

Ti?n di?u ki?n:
- Có JWT h?p l? (do route này dang b? b?o v?).

Các bu?c test (Swagger):
1. Authorize b?ng token.
2. M? endpoint `GET /`.
3. B?m `Try it out` -> `Execute`.

K? v?ng:
- `200 OK`
- Body: `Hello World!11111`

Ca l?i nên test:
- Không token -> `401`.

---

## 3.2 Auth module (`/auth`)

### POST `/auth/register`

M?c dích: dang ký tài kho?n m?i.

Các bu?c test:
1. M? `POST /auth/register`.
2. `Try it out`.
3. Dùng payload:

```json
{
  "email": "usera_test@example.com",
  "password": "123456",
  "fullName": "Nguy?n A"
}
```

4. `Execute`.

K? v?ng:
- `201 Created`
- Response có `user`, `tokens`
- Set-Cookie: `access_token`, `refresh_token`

Ca l?i nên test:
1. Email trùng -> `409`.
2. Email sai format -> `400`.
3. Thi?u password (do DTO dang optional) -> có th? v?n t?o user, c?n ghi nh?n hành vi hi?n t?i.

### POST `/auth/login`

M?c dích: dang nh?p local account.

Payload m?u:

```json
{
  "email": "usera_test@example.com",
  "password": "123456"
}
```

K? v?ng:
- `200 OK`
- Có `user`, `tokens`
- Có cookie token

Ca l?i:
1. Sai email/password -> `401`.
2. Password < 6 ký t? -> `400`.
3. Account b? khóa/inactive -> `401`.

### GET `/auth/profile`

M?c dích: l?y thông tin user t? access token hi?n t?i.

Các bu?c:
1. Authorize b?ng token.
2. Execute `GET /auth/profile`.

K? v?ng:
- `200 OK`
- Tr? payload user dã xác th?c.

Ca l?i:
- Token sai/h?t h?n -> `401`.

### POST `/auth/google`

M?c dích: login Google ki?u mobile/API b?ng `idToken` (flow social login chính).

Payload m?u:

```json
{
  "idToken": "<GOOGLE_ID_TOKEN>"
}
```

K? v?ng:
- `200 OK`
- Có `user`, `tokens`

Ca l?i:
- Token Google sai/h?t h?n -> `401`.

### POST `/auth/refresh`

M?c dích: c?p l?i access token b?ng refresh token.

Cách test 1 (body):

```json
{
  "refreshToken": "<REFRESH_TOKEN>"
}
```

Cách test 2 (cookie):
- Không c?n body, dùng cookie `refresh_token`.

K? v?ng:
- `200 OK`
- Tr? token m?i + set l?i cookie.

Ca l?i:
1. Thi?u refresh token -> `401`.
2. Refresh token sai/h?t h?n -> `401`.

### POST `/auth/logout`

M?c dích: dang xu?t và xóa session token.

Các bu?c:
1. Authorize.
2. Execute `POST /auth/logout`.

K? v?ng:
- `200 OK`
- `{ "success": true }`
- Cookie token du?c clear.

Ca l?i:
- Token không h?p l? -> `401`.

---

## 3.3 Users module (`/users`)

### GET `/users`

M?c dích: l?y danh sách user.

Bu?c test:
1. M? endpoint.
2. Execute tr?c ti?p (public).

K? v?ng:
- `200 OK`
- M?ng user.

### GET `/users/me`

M?c dích: l?y profile user hi?n t?i.

Bu?c test:
1. Authorize.
2. Execute.

K? v?ng: `200`.

Ca l?i: thi?u/sai token -> `401`.

### GET `/users/email/:email`

M?c dích: tìm user theo email.

Ví d? param:
- `email = usera_test@example.com` (nên URL encode n?u c?n).

K? v?ng:
- `200 OK`
- Tr? user ho?c `null`.

### GET `/users/:id`

M?c dích: l?y user theo id.

Ti?n di?u ki?n: có token.

K? v?ng:
- `200` n?u t?n t?i.
- `404` n?u không t?n t?i.

### PUT `/users/me`

M?c dích: c?p nh?t thông tin cá nhân.

Payload m?u:

```json
{
  "fullName": "Nguy?n Van A",
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

K? v?ng:
- `200 OK`
- Tr? user dã c?p nh?t.

Ca l?i:
1. G?i field b? c?m (`role`, `isBanned`, ...) -> `400`.
2. `fullName` > 15 ký t? -> `400`.
3. `avatar` không dúng URL -> `400`.

### PUT `/profile/location`

M?c dích: c?p nh?t v? trí hi?n t?i.
- Legacy compatibility endpoint: `PUT /users/me/location`.

Payload m?u:

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

K? v?ng:
- `200 OK`
- Tr? object location dã normalize.

Ca l?i:
1. `lat` ngoài [-90,90] -> `400`.
2. `lng` ngoài [-180,180] -> `400`.
3. `batteryLevel` ngoài [0,100] -> `400`.

### DELETE `/users/:id`

M?c dích: xóa user theo id.

Bu?c test:
1. Authorize.
2. Ði?n `id` user test.
3. Execute.

K? v?ng:
- `200 OK`
- `{ "message": "User deleted successfully" }`

Ca l?i:
- ID không t?n t?i -> `404`.

Luu ý b?o m?t:
- Hi?n chua có role guard cho API này.

---

## 3.4 Settings module (`/settings`)

### GET `/settings`

M?c dích: l?y cài d?t c?a user.

K? v?ng:
- `200 OK`
- N?u chua có settings, h? th?ng t? t?o m?c d?nh.

### PUT `/settings`

M?c dích: c?p nh?t cài d?t.

Payload m?u:

```json
{
  "notificationEnabled": true,
  "theme": "light",
  "privacy": "friends"
}
```

K? v?ng: `200 OK`.

Ca l?i:
1. `theme` không thu?c `light|dark|system` -> `400`.
2. `privacy` không thu?c `public|friends|private` -> `400`.

---

## 3.5 Security module (`/security`)

### POST `/security/pin`

M?c dích: d?t PIN 4 ch? s?.

Payload m?u:

```json
{
  "pin": "1234"
}
```

K? v?ng:
- `200 OK`
- Tr? security record.

Ca l?i:
1. `pin = "12"` -> `400`.
2. `pin = "abcd"` -> `400`.
3. Thi?u `pin` -> hi?n có th? gây l?i 500 (di?m c?n s?a code).

### POST `/security/verify-pin`

M?c dích: xác th?c PIN.

Payload m?u:

```json
{
  "pin": "1234"
}
```

K? v?ng:
- `200 OK`
- `{ "success": true }`

Ca l?i:
1. Chua set PIN -> `400`.
2. PIN sai -> `400`.
3. Thi?u `pin` -> có th? phát sinh l?i runtime (c?n harden validation).

---

## 3.6 Notifications module (`/notifications`)

### GET `/notifications`

M?c dích: l?y danh sách thông báo c?a user hi?n t?i.

K? v?ng: `200 OK`, danh sách theo th?i gian gi?m d?n.

### PUT `/notifications/:id/read`

M?c dích: dánh d?u dã d?c.

Bu?c test:
1. T?o notification tru?c (dùng `/notifications/test`).
2. L?y `NOTIFICATION_ID`.
3. G?i `/notifications/{id}/read`.

K? v?ng:
- `200 OK`
- `isRead = true`.

Ca l?i:
- ID không t?n t?i/không thu?c user -> `404`.

### POST `/notifications/test`

M?c dích: t?o thông báo test.

Payload m?u:

```json
{
  "title": "Thông báo th?",
  "content": "N?i dung th?",
  "type": "test"
}
```

K? v?ng:
- `200 OK`
- T?o notification thành công.

Ca ki?m tra thêm:
- Ð? tr?ng body -> v?n t?o du?c v?i giá tr? fallback.

---

## 3.7 Uploads module (`/uploads`)

### POST `/uploads/presign`

M?c dích: endpoint cu cho presigned upload.

Payload m?u:

```json
{
  "fileName": "photo.jpg",
  "type": "image"
}
```

Hành vi hi?n t?i theo code:
- Tr? `400` v?i thông báo presigned upload dang b? t?t trong local mode.

### POST `/uploads/file`

M?c dích: upload file tr?c ti?p (multipart/form-data).

Các bu?c test trên Swagger:
1. Authorize.
2. M? `POST /uploads/file`.
3. `Try it out`.
4. Ch?n file t?i field `file`.
5. Execute.

K? v?ng:
- `200 OK`
- Tr? `fileUrl`, `type`, `mimeType`, `size`, `fileName`.

Gi?i h?n:
- T?i da 50MB.
- MIME h? tr?:
  - Image: jpeg/png/webp/gif
  - Audio: mpeg/wav/ogg/webm
  - Video: mp4/webm/quicktime

Ca l?i:
1. Không g?i file -> `400`.
2. File type không h? tr? -> `400`.
3. Quá 50MB -> `400`.

---

## 3.8 Couple module (`/couple`)

### GET `/couple`

M?c dích: l?y thông tin c?p dôi hi?n t?i + partner.

K? v?ng:
- `200` n?u user dang trong couple.
- `404` n?u chua ghép dôi.

### GET `/couple/locations`

M?c dích: l?y v? trí hi?n t?i c?a `me` và `partner`.

K? v?ng:
- `200` v?i object `{ me, partner }`.

### GET `/couple/location-history?limit=`

M?c dích: l?y l?ch s? v? trí c?a hai ngu?i.

Ví d?:
- `limit=100`

K? v?ng:
- `200`
- `limit` du?c clamp trong [1..500], m?c d?nh 120.

### POST `/couple/invite`

M?c dích: t?o mã m?i ghép dôi.

Bu?c test:
1. Ðang nh?p b?ng user A (chua có couple).
2. G?i endpoint.

K? v?ng:
- `200`
- Tr? invite có `inviteCode` (HEX 8 ký t?), h?t h?n sau 7 ngày.

Ca l?i:
- User dã có couple -> `409`.

### POST `/couple/join`

M?c dích: user B tham gia b?ng mã m?i.

Payload m?u:

```json
{
  "inviteCode": "A1B2C3D4"
}
```

K? v?ng:
- `200` t?o couple m?i.

Ca l?i:
1. Sai format code -> `400`.
2. Code không t?n t?i -> `404`.
3. Code h?t h?n/dã dùng -> `400`.
4. Join code c?a chính mình -> `400`.
5. User dã có couple -> `409`.

### POST `/couple/connect-new`

M?c dích: ng?t couple hi?n t?i (n?u có) và k?t n?i couple m?i t? invite code.

Payload gi?ng `/couple/join`.

K? v?ng:
- `200`.

### POST `/couple/disconnect`

M?c dích: ng?t k?t n?i couple hi?n t?i.

K? v?ng:
- `200`, status couple chuy?n `DISCONNECTED`.

Ca l?i:
- Chua có couple -> `404`.

### PUT `/couple/start-date`

M?c dích: c?p nh?t ngày b?t d?u yêu.

Payload m?u:

```json
{
  "startDate": "2025-02-14"
}
```

K? v?ng: `200`.

Ca l?i: sai d?nh d?ng date -> `400`.

### PUT `/couple/theme`

M?c dích: c?p nh?t theme couple.

Payload m?u:

```json
{
  "theme": "sunset"
}
```

K? v?ng: `200`.

---

## 3.9 Chat module (`/chat`)

### GET `/chat/messages?limit=&offset=`

M?c dích: l?y l?ch s? chat.

Ví d?:
- `limit=50`
- `offset=0`

K? v?ng:
- `200`, danh sách message theo `createdAt DESC`.

Ca l?i:
- Chua có couple -> `404`.

### POST `/chat/clear`

M?c dích: xóa toàn b? chat c?a couple.

K? v?ng:
- `200`
- `{ "success": true }`

Ca l?i:
- Chua có couple -> `404`.

---

## 3.10 Moments module (`/moments`)

### GET `/moments`

M?c dích: l?y feed moments c?a couple.

K? v?ng: `200`.

### POST `/moments`

M?c dích: t?o moment.

Payload m?u:

```json
{
  "content": "K? ni?m hôm nay",
  "photos": [
    "http://localhost:3000/uploads/image/abc.jpg"
  ],
  "privacy": "COUPLE"
}
```

K? v?ng:
- `201 Created`
- N?u có `photos`, m?i ?nh s? du?c sync sang media album.

Ca l?i:
1. `privacy` sai enum -> `400`.
2. Chua có couple -> `404`.

### PUT `/moments/:id`

M?c dích: c?p nh?t moment.

K? v?ng:
- `200` n?u là creator.

Ca l?i:
1. Không t?n t?i -> `404`.
2. Không ph?i creator -> `403`.

### DELETE `/moments/:id`

M?c dích: xóa moment.

K? v?ng:
- `200`, `{ "success": true }`.

Ca l?i:
- `404` / `403` tuong t? update.

---

## 3.11 Events module (`/events`)

### GET `/events`

M?c dích: l?y danh sách s? ki?n c?a couple.

K? v?ng:
- `200`
- S?p x?p theo ngày tang d?n.

### POST `/events`

M?c dích: t?o s? ki?n.

Payload m?u:

```json
{
  "title": "K? ni?m 1 nam",
  "description": "Ði an t?i",
  "date": "2026-12-24",
  "isAnniversary": true
}
```

K? v?ng:
- `201`.

Ca l?i:
1. Thi?u `title` ho?c `date` -> `400`.
2. Chua có couple -> `404`.

### PUT `/events/:id`

M?c dích: s?a s? ki?n.

K? v?ng:
- `200`.

Ca l?i:
1. Event không t?n t?i -> `404`.
2. Event không thu?c couple c?a user -> `403`.

### DELETE `/events/:id`

M?c dích: xóa s? ki?n.

K? v?ng:
- `200`, `{ "success": true }`.

Ca l?i:
- `404` / `403` tuong t? update.

---

## 3.12 Trips module (`/trips`)

### GET `/trips?userId=&page=&limit=`

M?c dích: l?y danh sách hành trình.

Ví d? query:
- `userId=<USER_A_ID>`
- `page=1`
- `limit=20`

K? v?ng:
- `200`
- Response d?ng:

```json
{
  "data": [],
  "page": 1,
  "limit": 20,
  "total": 0
}
```

Ca l?i:
- `userId` không thu?c 2 ngu?i trong couple -> `404`.

### GET `/trips/:id/detail`

M?c dích: l?y chi ti?t 1 trip (có `routeFull`).

K? v?ng:
- `200` n?u trip h?p l? và thu?c couple.

Ca l?i:
- Trip không t?n t?i/không thu?c couple -> `404`.

### POST `/trips/sync`

M?c dích: d?ng b? danh sách trip t? client.

Payload m?u:

```json
{
  "trips": [
    {
      "id": "trip_001",
      "startTime": 1760000000000,
      "endTime": 1760003600000,
      "distanceKm": 12.5,
      "startAddress": "Qu?n 1",
      "endAddress": "Qu?n 7",
      "routePoints": [
        { "lat": 10.7769, "lng": 106.7009 },
        { "lat": 10.7820, "lng": 106.7100 }
      ]
    }
  ]
}
```

K? v?ng:
- `201 Created`
- `{ "success": true, "count": 1 }`

Ca l?i:
1. `routePoints` r?ng -> `400`.
2. Sai ki?u `lat/lng/startTime...` -> `400`.

---

## 3.13 Locations module (`/locations`)

### GET `/locations?since=`

M?c dích: l?y danh sách d?a di?m c?a couple.

Ví d?:
- Không `since`: l?y b?n ghi chua xóa m?m.
- Có `since=1760000000000`: l?y b?n ghi c?p nh?t t? th?i di?m dó.

K? v?ng: `200`.

### POST `/locations`

M?c dích: t?o d?a di?m.

Payload m?u:

```json
{
  "name": "Nhà",
  "address": "Qu?n 1, TP.HCM",
  "latitude": 10.7769,
  "longitude": 106.7009,
  "locationType": "HOME",
  "radius": 200,
  "iconResName": "ic_home",
  "isSynced": true,
  "isDeleted": false
}
```

K? v?ng:
- `201 Created`.

Ca l?i:
1. Thi?u `name` -> `400`.
2. `latitude/longitude/radius` ngoài range -> `400`.

### PUT `/locations/:id`

M?c dích: c?p nh?t d?a di?m.

Payload m?u:

```json
{
  "name": "Nhà m?i",
  "radius": 300
}
```

K? v?ng: `200`.

Ca l?i:
- Location không t?n t?i ho?c không thu?c couple -> `404`.

### DELETE `/locations/:id`

M?c dích: xóa m?m d?a di?m.

K? v?ng:
- `200`
- B?n ghi chuy?n `isDeleted=true`.

Ca l?i:
- Location không t?n t?i -> `404`.

### GET `/locations/search?q=`

M?c dích: tìm d?a di?m t? Nominatim.

Ví d? query:
- `q=highlands`

K? v?ng:
- `200`, tr? danh sách d?a di?m g?i ý.
- N?u `q` du?i 2 ký t? -> `[]`.
- N?u d?ch v? ngoài l?i -> `[]` (không throw).

---

## 3.14 Geofence module (`/geofence`)

### POST `/geofence/event`

M?c dích: nh?n s? ki?n vào/ra geofence d? t?o thông báo cho partner.

Payload m?u:

```json
{
  "placeId": "11111111-2222-3333-4444-555555555555",
  "transition": "ENTER",
  "timestamp": 1760000000000
}
```

K? v?ng:
- `201`
- `{ "success": true, "placeId": "...", "transition": "ENTER", "timestamp": 1760000000000 }`

Ca l?i:
1. `placeId` sai format UUID -> `400`.
2. Location không t?n t?i/không thu?c couple -> `404`.
3. Chua có partner -> `400`.

---

## 3.15 Media module (`/media`)

### GET `/media?filter=&limit=&cursor=`

M?c dích: l?y album media có phân trang cursor.

Ví d? query:
- `filter=all|me|partner`
- `limit=20`
- `cursor=2026-03-02T01:29:44.575Z|<MEDIA_ID>`

K? v?ng:
- `200`

```json
{
  "items": [],
  "nextCursor": null
}
```

Ca l?i:
1. Cursor sai d?nh d?ng date -> `400`.
2. `filter=partner` nhung chua có partner -> `400`.

### GET `/media/changes?since=&timeoutMs=`

M?c dích: long-poll ch? thay d?i album.

Ví d?:
- `since=0`
- `timeoutMs=25000`

K? v?ng:
- `200` v?i event thay d?i ho?c timeout event theo service realtime.

### POST `/media`

M?c dích: t?o media m?i cho couple.

Payload m?u:

```json
{
  "url": "http://localhost:3000/uploads/image/abc.jpg",
  "type": "image",
  "caption": "?nh m?i",
  "visibility": "couple_only",
  "thumbUrl": "http://localhost:3000/uploads/image/thumb_abc.jpg"
}
```

K? v?ng:
- `201`.

Ca l?i:
1. `url` không h?p l? -> `400`.
2. `type` sai -> `400`.
3. `visibility` sai -> `400`.
4. Chua có couple -> `404`.

### GET `/media/:id`

M?c dích: l?y chi ti?t media.

K? v?ng:
- `200` n?u media t?n t?i và thu?c couple c?a user.

Ca l?i:
1. Không t?n t?i -> `404`.
2. Không thu?c couple -> `403`.

### GET `/media/:id/download`

M?c dích: l?y `downloadUrl` media.

K? v?ng:
- `200`

```json
{
  "downloadUrl": "..."
}
```

Ca l?i:
- nhu `/media/:id`.

### PATCH `/media/:id`

M?c dích: c?p nh?t caption/visibility/thumbUrl.

Payload m?u:

```json
{
  "caption": "Caption m?i",
  "visibility": "friends",
  "thumbUrl": "http://localhost:3000/uploads/image/new_thumb.jpg"
}
```

K? v?ng: `200`.

Ca l?i:
1. `visibility` sai -> `400`.
2. Media không t?n t?i -> `404`.

### PATCH `/media/:id/status`

M?c dích: c?p nh?t tr?ng thái media.

Payload m?u:

```json
{
  "status": "active"
}
```

Giá tr? h?p l?:
- `processing`
- `active`
- `flagged`
- `synced`

K? v?ng: `200`.

Ca l?i:
- Status sai -> `400`.

### DELETE `/media/:id`

M?c dích: xóa m?m media.

K? v?ng:
- `200`
- `{ "success": true }`

Ca l?i:
- Media không t?n t?i -> `404`.

---

## 4. WebSocket API c?n test

## 4.1 Chu?n b?

1. K?t n?i socket t?i backend.
2. G?i access token qua:
   - `handshake.auth.token`
   - ho?c header `authorization`.

N?u token không h?p l? -> server tr? `Unauthorized` (WsException).

## 4.2 Chat gateway

### Event `join`

M?c dích: tham gia phòng `couple:<coupleId>`.

Cách test:
1. K?t n?i socket b?ng token user trong couple.
2. Emit event `join` v?i payload r?ng.

K? v?ng ack:

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

Payload m?u:

```json
{
  "type": "TEXT",
  "content": "Xin chào",
  "tempId": "tmp-001"
}
```

K? v?ng:
1. Ack tr? message dã luu.
2. Room couple nh?n event `message:received`.

Ca l?i:
- `type` sai enum.
- Không token/chua có couple.

## 4.3 Media gateway

### Event `album:join`

M?c dích: join room album c?a couple.

K? v?ng ack:

```json
{
  "event": "album:joined",
  "data": {
    "coupleId": "..."
  }
}
```

### Server event `album:changed`

M?c dích: server push khi t?o/s?a/xóa media.

Cách test:
1. Socket A emit `album:join`.
2. G?i REST `POST /media` ho?c `PATCH /media/:id` ho?c `DELETE /media/:id`.
3. Quan sát socket A nh?n event `album:changed`.

---

## 5. K?ch b?n smoke test end-to-end khuy?n ngh?

1. `POST /auth/register` t?o A, B.
2. `POST /auth/login` A, B.
3. `POST /couple/invite` b?ng A.
4. `POST /couple/join` b?ng B.
5. `PUT /profile/location` cho c? A và B.
6. `POST /locations` t?o d?a di?m.
7. `POST /events` t?o s? ki?n.
8. `POST /moments` t?o moment có ?nh.
9. `POST /uploads/file` upload file media.
10. `POST /media` t?o media.
11. `GET /chat/messages` ki?m tra chat.
12. `GET /notifications` ki?m tra thông báo.
13. `GET /trips` và `POST /trips/sync` ki?m tra trips.
14. `POST /security/pin` + `POST /security/verify-pin`.
15. `POST /auth/refresh` + `POST /auth/logout`.

N?u toàn b? pass, h? th?ng dã du?c ki?m tra d?y d? các lu?ng chính.
