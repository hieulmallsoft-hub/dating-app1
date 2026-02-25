# Dating App - Clean Architecture Structure

Tài liệu này giải thích cấu trúc thư mục của dự án sau khi refactor theo mô hình **Clean Architecture / DDD (Domain-Driven Design)**.

## Tổng quan cấu trúc `src/`

```text
src/
├── main.ts                # File chạy dự án (Bootstrap)
├── app.module.ts          # Module chính của ứng dụng, kết nối các module con và cấu hình global
├── app.controller.ts      # Controller mặc định (thường để check health)
├── app.service.ts         # Service mặc định
│
├── config/                # Cấu hình hệ thống (Environment variables)
│   ├── app.config.ts      # Cấu hình chung cho App (port, env)
│   ├── database.config.ts # Cấu hình kết nối Database (PostgreSQL/TypeORM)
│   └── jwt.config.ts      # Cấu hình cho xác thực JWT (secretKey, expiresIn)
│
├── common/                # Tài nguyên dùng chung toàn hệ thống
│   ├── decorators/        # Custom decorators (VD: @CurrentUser, @Public)
│   ├── filters/           # Xử lý lỗi tập trung (VD: HttpExceptionFilter)
│   ├── guards/            # Bảo vệ API (VD: JwtAuthGuard, RolesGuard)
│   ├── interceptors/      # Chặn và xử lý request/response (VD: TransformInterceptor)
│   ├── pipes/             # Validate và chuyển đổi dữ liệu (VD: ValidationPipe)
│   ├── constants/         # Các hằng số toàn hệ thống
│   └── utils/             # Các hàm tiện ích bổ trợ
│
└── modules/               # Các module nghiệp vụ chính
    ├── user/              # Module quản lý người dùng
    └── auth/              # Module xác thực (Login, Register...)
```

## Giải thích các lớp trong một module (VD: `modules/user/`)

Dự án áp dụng mô hình 4 lớp để tách biệt trách nhiệm:

### 1. Presentation Layer (`presentation/`) - Tầng giao diện API

- **Chức năng**: Tiếp nhận yêu cầu từ client (HTTP Request) và trả về dữ liệu (HTTP Response).
- **Files**:
  - `user.controller.ts`: Định nghĩa các endpoint (GET, POST...).
  - `dto/`: Định nghĩa các Data Transfer Object đầu vào/đầu ra (VD: `create-user.dto.ts`).

### 2. Application Layer (`application/`) - Tầng xử lý nghiệp vụ

- **Chức năng**: Điều phối các hoạt động của ứng dụng, thực thi các Use Cases. Không quan tâm dữ liệu lưu trữ ở đâu.
- **Files**:
  - `users.service.ts`: Chứa logic điều hướng, kết nối giữa domain và infrastructure.
  - `use-cases/`: (Tùy chọn) Chia nhỏ các nghiệp vụ phức tạp thành nhiều file riêng biệt.

### 3. Domain Layer (`domain/`) - Tầng lõi nghiệp vụ (Business Core)

- **Chức năng**: Chứa các quy tắc nghiệp vụ quan trọng nhất. Đây là tầng quan trọng nhất và không phụ thuộc vào bất kỳ công nghệ nào bên ngoài.
- **Files**:
  - `entities/`: Các thực thể kinh doanh (VD: `users.model.ts`).
  - `repositories/`: Định nghĩa **Interface** cho việc truy xuất dữ liệu (VD: `user.repository.ts`).

### 4. Infrastructure Layer (`infrastructure/`) - Tầng hạ tầng kỹ thuật

- **Chức năng**: Triển khai cụ thể các công nghệ bên ngoài (Database, Mail Service, Payment Gateway...).
- **Files**:
  - `persistence/`: Lưu trữ dữ liệu.
    - `user.repository.impl.ts`: Triển khai các phương thức truy vấn từ Domain Interface (sử dụng TypeORM, Mongoose...).

---

## Lợi ích của cấu trúc này

- **Dễ bảo trì**: Thay đổi Database hoặc công nghệ bên ngoài không ảnh hưởng đến Business Logic.
- **Dễ kiểm thử**: Có thể viết Unit Test cho từng lớp riêng biệt.
- **Khả năng mở rộng**: Khi dự án lớn hơn, việc tìm kiếm và thêm tính năng mới rất rõ ràng.
