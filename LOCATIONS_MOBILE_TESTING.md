# Locations API - Hướng Dẫn Mobile Test (Backend)

Tài liệu này mô tả luồng chạy và cách test chức năng **Locations** cho mobile dựa trên backend hiện tại.

## 1) Điều Kiện Trước Khi Test
- Mobile đã login và có `access_token` (JWT).
- User **đã có couple**. Nếu chưa, các API `/Locations` sẽ trả `404 Not Found` với message kiểu "You are not in a couple".

## 2) Danh Sách API
- `GET /Locations`
- `POST /Locations`
- `PATCH /Locations/:id`
- `DELETE /Locations/:id`
- `GET /Locations/search?q=...`

Tất cả API đều yêu cầu header:
```
Authorization: Bearer <access_token>
```

## 3) Luồng Test Đề Xuất

### Bước A — Lấy list ban đầu
**Request**
```
GET /Locations
```

**Kỳ vọng**
- Trả về danh sách location `isDeleted=false`

### Bước B — Tạo location mới
**Request**
```
POST /Locations
```

**Body mẫu**
```json
{
  "name": "Home",
  "address": "123 Nguyen Trai, Q1",
  "latitude": 10.762622,
  "longitude": 106.660172,
  "radius": 200,
  "locationType": "HOME",
  "iconResName": "ic_home",
  "isSynced": true,
  "isDeleted": false
}
```

**Kỳ vọng**
- Trả về object location có `id`

### Bước C — Update location
**Request**
```
PATCH /Locations/{id}
```

**Body mẫu**
```json
{
  "name": "Home Updated",
  "radius": 300
}
```

**Kỳ vọng**
- Trả về location với dữ liệu mới

### Bước D — Soft delete location
**Request**
```
DELETE /Locations/{id}
```

**Kỳ vọng**
- Backend set `isDeleted=true`, `isSynced=true`

### Bước E — Sync incremental (quan trọng cho mobile)
**Request**
```
GET /Locations?since=<epoch_ms>
```

**Kỳ vọng**
- Trả về các location có `updatedAt >= since`, bao gồm cả item đã `isDeleted=true`

### Bước F — Search địa điểm ngoài
**Request**
```
GET /Locations/search?q=coffee
```

**Kỳ vọng**
- Trả list `{ id, name, address, latitude, longitude, locationType }`
- Nếu `q` < 2 ký tự thì trả `[]`

## 4) Realtime Locations (Socket.IO)
- Kết nối socket.io vào root namespace `/`
- Gửi access token trong `auth.token` hoặc `Authorization: Bearer <token>`
- Emit event `locations:join` để vào room couple
- Lắng nghe:
  - `locations:created`
  - `locations:updated`
  - `locations:deleted`

**Ví dụ join**
```json
event: "locations:join"
payload: {}
```

**Kỳ vọng**
- Server trả `{ event: "locations:joined", data: { coupleId } }`

## 5) Lưu Ý Quan Trọng

## 5) Lưu Ý Quan Trọng
- `latitude/longitude` có thể `null` (backend cho phép), nhưng nếu dùng geofence thì nên có đủ.
- Xóa là **soft delete** (không xóa DB).
- Mobile nên dùng `since` để sync incremental và xử lý item đã xóa.

## 6) Gợi Ý Checklist Test Nhanh
1. `GET /Locations` -> rỗng
2. `POST /Locations` -> tạo 1 location
3. `GET /Locations` -> thấy location mới
4. `PATCH /Locations/:id` -> cập nhật
5. `DELETE /Locations/:id` -> soft delete
6. `GET /Locations` -> không còn thấy
7. `GET /Locations?since=<t0>` -> thấy item đã xóa (để sync)
