# Dating App Backend

Backend API cho ứng dụng hẹn hò được xây dựng với NestJS.

## Yêu cầu hệ thống

- Node.js >= 18.x
- PostgreSQL hoặc MySQL
- npm hoặc yarn

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Tạo file .env từ template
cp .env.example .env
```

## Cấu hình

Chỉnh sửa file `.env` với thông tin database và cấu hình của bạn:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=dating_app
JWT_SECRET=your-secret-key
```

## Chạy ứng dụng

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Documentation

Sau khi chạy server, truy cập Swagger documentation tại:

```
http://localhost:3000/api
```

## Cấu trúc dự án

```
src/
├── auth/              # Authentication module (JWT, login, register)
│   ├── dto/          # Data transfer objects
│   ├── guards/       # Auth guards
│   └── strategies/   # Passport strategies
├── users/            # Users module
│   ├── dto/          # User DTOs
│   └── entities/     # User entity
├── common/           # Common utilities
│   ├── decorators/   # Custom decorators
│   ├── filters/      # Exception filters
│   └── interceptors/ # Response interceptors
├── app.module.ts     # Root module
└── main.ts           # Application entry point
```

## Các lệnh hữu ích

```bash
# Chạy tests
npm run test

# Chạy tests với coverage
npm run test:cov

# Lint code
npm run lint

# Format code
npm run format
```

## API Endpoints

### Authentication

- `POST /auth/register` - Đăng ký tài khoản mới
- `POST /auth/login` - Đăng nhập
- `GET /auth/profile` - Lấy thông tin user hiện tại (cần token)

### Users

- `GET /users` - Lấy danh sách users (cần token)
- `GET /users/:id` - Lấy thông tin user theo ID (cần token)
- `PATCH /users/:id` - Cập nhật thông tin user (cần token)
- `DELETE /users/:id` - Xóa user (cần token)

### Health Check

- `GET /` - Kiểm tra trạng thái server

## Database Schema

### Users Table

- `id` - UUID primary key
- `email` - Email (unique)
- `password` - Hashed password
- `name` - Tên người dùng
- `avatar` - URL ảnh đại diện
- `dateOfBirth` - Ngày sinh
- `gender` - Giới tính
- `bio` - Tiểu sử
- `location` - Vị trí
- `interests` - Sở thích (array)
- `isActive` - Trạng thái hoạt động
- `createdAt` - Ngày tạo
- `updatedAt` - Ngày cập nhật

## License

MIT
