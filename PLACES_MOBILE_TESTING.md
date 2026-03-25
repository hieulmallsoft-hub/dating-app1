# Places API - Hướng Dẫn Mobile Test (Backend)

Tài liệu này mô tả luồng chạy và cách test chức năng **Places** cho mobile dựa trên backend hiện tại.

## 1) Điều Kiện Trước Khi Test
- Mobile đã login và có `access_token` (JWT).
- User **đã có couple**. Nếu chưa, các API `/places` sẽ trả `404 Not Found` với message kiểu "You are not in a couple".

## 2) Danh Sách API
- `GET /places`
- `POST /places`
- `PATCH /places/:id`
- `DELETE /places/:id`
- `GET /places/search?q=...`

Tất cả API đều yêu cầu header:
```
Authorization: Bearer <access_token>
```

## 3) Luồng Test Đề Xuất

### Bước A — Lấy list ban đầu
**Request**
```
GET /places
```

**Kỳ vọng**
- Trả về danh sách place `isDeleted=false`

### Bước B — Tạo place mới
**Request**
```
POST /places
```

**Body mẫu**
```json
{
  "name": "Home",
  "address": "123 Nguyen Trai, Q1",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "radius": 200,
  "placeType": "HOME",
  "iconResName": "ic_home",
  "isSynced": true,
  "isDeleted": false
}
```

**Kỳ vọng**
- Trả về object place có `id`

### Bước C — Update place
**Request**
```
PATCH /places/{id}
```

**Body mẫu**
```json
{
  "name": "Home Updated",
  "radius": 300
}
```

**Kỳ vọng**
- Trả về place với dữ liệu mới

### Bước D — Soft delete place
**Request**
```
DELETE /places/{id}
```

**Kỳ vọng**
- Backend set `isDeleted=true`, `isSynced=true`

### Bước E — Sync incremental (quan trọng cho mobile)
**Request**
```
GET /places?since=<epoch_ms>
```

**Kỳ vọng**
- Trả về các place có `updatedAt >= since`, bao gồm cả item đã `isDeleted=true`

### Bước F — Search địa điểm ngoài
**Request**
```
GET /places/search?q=coffee
```

**Kỳ vọng**
- Trả list `{ id, name, address, latitude, longitude, placeType }`
- Nếu `q` < 2 ký tự thì trả `[]`

## 4) Realtime Places (Socket.IO)
- Kết nối socket.io vào root namespace `/`
- Gửi access token trong `auth.token` hoặc `Authorization: Bearer <token>`
- Emit event `places:join` để vào room couple
- Lắng nghe:
  - `places:created`
  - `places:updated`
  - `places:deleted`

**Ví dụ join**
```json
event: "places:join"
payload: {}
```

**Kỳ vọng**
- Server trả `{ event: "places:joined", data: { coupleId } }`

## 5) Lưu Ý Quan Trọng

## 5) Lưu Ý Quan Trọng
- `latitude/longitude` có thể `null` (backend cho phép), nhưng nếu dùng geofence thì nên có đủ.
- Xóa là **soft delete** (không xóa DB).
- Mobile nên dùng `since` để sync incremental và xử lý item đã xóa.

## 6) Gợi Ý Checklist Test Nhanh
1. `GET /places` -> rỗng
2. `POST /places` -> tạo 1 place
3. `GET /places` -> thấy place mới
4. `PATCH /places/:id` -> cập nhật
5. `DELETE /places/:id` -> soft delete
6. `GET /places` -> không còn thấy
7. `GET /places?since=<t0>` -> thấy item đã xóa (để sync)
