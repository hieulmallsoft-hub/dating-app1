Tài Liệu Chuẩn Cho Mobile (Chat Realtime)
Phiên bản tóm gọn theo luồng tích hợp thực tế giữa Mobile và Backend
Mục đích: thống nhất cho Mobile cách gọi API, cách connect Socket.IO, các event cần emit/listen, và điều kiện để nhận realtime chat đúng với backend.

Nguồn sự thật (theo code backend)
- Gateway realtime chat: `backend/src/modules/couple-features/chat/presentation/chat.gateway.ts`
- HTTP chat history: `backend/src/modules/couple-features/chat/presentation/chat.controller.ts`
- Payload send message: `backend/src/modules/couple-features/chat/presentation/dto/send-message.dto.ts`
- Message type enum: `backend/src/modules/couple-features/chat/domain/entities/message.entity.ts`
- Payload message received: `backend/src/modules/couple-features/chat/presentation/mappers/chat-response.mapper.ts`

1) Mobile cần làm gì
- Đăng nhập để lấy access_token (JWT).
- Kết nối Socket.IO lên backend, truyền token trong auth.token hoặc auth.accessToken.
- Sau khi socket connect, emit `join` đúng 1 lần cho mỗi phiên kết nối. (theo `chat.gateway.ts`)
- Lắng nghe event server trả xuống: `message:received`. (theo `chat.gateway.ts`)
- Khi user gửi tin nhắn mới, emit `message:send` qua socket. (theo `chat.gateway.ts`)
- Khi mở màn hình chat lần đầu hoặc sau reconnect, gọi GET `/chat/history` để đồng bộ lịch sử. (theo `chat.controller.ts`)

Luồng khởi động đề xuất
Bước | Hành động | Kết quả mong đợi
1 | Login lấy JWT | Có access_token hợp lệ để gọi cả HTTP và Socket
2 | Connect Socket.IO kèm token | Socket authenticate thành công
3 | Emit `join` | Server add client vào room couple
4 | Listen event `message:received` | UI chat cập nhật tức thời
5 | Emit `message:send` khi user gửi | Server lưu DB và emit realtime
6 | Sau reconnect gọi GET `/chat/history` | Client sync lại lịch sử mới nhất

2) Router/Event mobile gọi và mục đích
Tên route / event | Loại | Mục đích | Ghi chú payload / hành vi
GET `/chat/history` | HTTP | Lấy lịch sử tin nhắn của couple hiện tại. | Query `limit`, `offset` (theo `chat.controller.ts`).
POST `/chat/history/clear` | HTTP | Xóa lịch sử chat của couple hiện tại. | Dùng khi user chọn clear history (theo `chat.controller.ts`).
`join` | Socket emit | Join room couple để nhận realtime chat. | Emit 1 lần sau khi socket connect thành công (theo `chat.gateway.ts`).
`message:send` | Socket emit | Gửi tin nhắn mới. | Payload theo `SendMessageDto` (theo `send-message.dto.ts`).

3) Mobile KHÔNG gọi (chỉ listen)
Event | Nhóm | Ý nghĩa
`message:received` | Server emit | Server tự đẩy xuống client khi có tin nhắn mới trong couple (theo `chat.gateway.ts`).
`joined` | Ack | Ack backend trả về sau khi mobile emit `join` (theo `chat.gateway.ts`).

4) Backend sẽ tự làm gì
- Validate JWT cho cả HTTP request và Socket connection (theo `WsJwtGuard`/`JwtAuthGuard` dùng trong gateway/controller).
- Validate dữ liệu message theo rule nội bộ (theo `SendMessageDto`).
- Lưu tin nhắn vào DB (theo `ChatService.saveMessage` gọi trong `chat.gateway.ts`).
- Tự emit `message:received` cho room couple khi có message mới (theo `chat.gateway.ts`).

5) Điều kiện để mobile nhận được realtime
Điều kiện bắt buộc | Giải thích ngắn
User có JWT hợp lệ | Không có token hoặc token sai thì HTTP/Socket sẽ không authenticate được.
Hai user đang couple active | Không có couple hợp lệ thì room couple hoặc dữ liệu partner sẽ không hoạt động đúng.
Socket đã connect và đã emit `join` | Nếu chưa join room thì client sẽ không nhận được event realtime.
Client đang listen `message:received` | Server có emit nhưng client không listen thì UI vẫn không update.
Bên kia có gửi `message:send` hợp lệ | Realtime chỉ phát sinh khi có message mới hợp lệ từ backend.

6) Ghi chú để team khỏi nhầm
- Realtime chat dùng event `message:received`, không dùng HTTP để push (theo `chat.gateway.ts`).
- `join` là event cho chat gateway, khác với `location:join` (theo `chat.gateway.ts`).
- Khi socket reconnect nên gọi GET `/chat/history` để sync lại lịch sử (theo `chat.controller.ts`).

7) Payload chuẩn theo code
`message:send` (SendMessageDto theo `send-message.dto.ts`)
- `type`: enum `MessageType` (`TEXT`, `IMAGE`, `VOICE`, `LOCATION`)
- `content`: string (bắt buộc)
- `lat`: number (optional, chỉ gửi khi có vị trí; nếu có thì phải có `lng`)
- `lng`: number (optional, chỉ gửi khi có vị trí; nếu có thì phải có `lat`)
- `locationName`: string (optional, tên ngắn địa điểm)
- `locationAddress`: string (optional, địa chỉ đầy đủ)
- `tempId`: string (optional, client-side optimistic updates)

`message:received` (theo `chat-response.mapper.ts`)
- `id`: string
- `coupleId`: string
- `senderId`: string
- `type`: `TEXT` | `IMAGE` | `VOICE` | `LOCATION`
- `content`: string | null
- `lat`: number | null
- `lng`: number | null
- `locationName`: string | null
- `locationAddress`: string | null
- `isRead`: boolean
- `createdAt`: ISO string
- `sender`: object | undefined
  - `id`: string
  - `email`: string
  - `fullName`: string | null
  - `avatar`: string | null

Checklist nhanh cho team mobile
- Có JWT và pass được cả HTTP lẫn Socket auth.
- Socket connect xong có emit `join`.
- Client listen `message:received`.
- Khi user gửi tin nhắn, emit `message:send`.
- Sau reconnect có gọi GET `/chat/history` để sync lịch sử.
