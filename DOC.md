# DOC.md - Cấu trúc dự án `dating-app`

## 1. Tổng quan

Dự án hiện tại được tách thành 2 phần chính:
- `backend/`: API server dùng **NestJS** (TypeORM, Swagger, Socket.IO, JWT/OAuth).
- `frontend/`: giao diện dùng **React + Vite + TypeScript**.

Ghi chú:
- Tài liệu này mô tả cấu trúc hiện tại trong repo.
- Cây thư mục bên dưới đã **bỏ qua** `.git`, `node_modules`, `dist` để dễ đọc.

## 2. Cấu trúc thư mục gốc (root)

```text
backend/
frontend/
.gitignore
CONTRIBUTING.md
DOC.md
README.md
TESTING.md
```

## 3. Backend (`backend/`)

### 3.1 Vai trò
- Backend API cho ứng dụng dating app.
- Entry point: `backend/src/main.ts`
- Root module: `backend/src/app.module.ts`
- Cấu hình: `backend/src/config/*`
- Dùng middleware/guards/decorators chung trong `backend/src/common/*`

### 3.2 Công nghệ chính (từ `backend/package.json`)
- Runtime/framework: NestJS (`@nestjs/*`)
- Database ORM: TypeORM + PostgreSQL (`typeorm`, `pg`)
- Auth: JWT + Passport (Google/Apple strategies)
- Realtime: Socket.IO (`@nestjs/websockets`, `socket.io`)
- API docs: Swagger (`@nestjs/swagger`)

### 3.3 Các module nghiệp vụ chính
- `admin`
- `auth`
- `chat`
- `couple`
- `events`
- `invites`
- `media`
- `moments`
- `notifications`
- `places`
- `security`
- `settings`
- `uploads`
- `user`

### 3.4 Cấu trúc backend (rút gọn)

```text
backend/
|-- src/
|   |-- common/
|   |   |-- decorators/
|   |   |   `-- customize.ts
|   |   |-- guards/
|   |   |   |-- jwt-auth.guard.ts
|   |   |   `-- roles.guard.ts
|   |   |-- middleware/
|   |   |   `-- http-logger.middleware.ts
|   |   `-- utils/
|   |       `-- utils.ts
|   |-- config/
|   |   |-- app.config.ts
|   |   |-- auth.config.ts
|   |   |-- database.config.ts
|   |   `-- jwt.config.ts
|   |-- env/
|   |   `-- .env
|   |-- modules/
|   |   |-- admin/
|   |   |   |-- application/
|   |   |   |   `-- admin.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- admin.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- admin.repository.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- admin.dto.ts
|   |   |   |   |-- admin.controller.ts
|   |   |   |   `-- admin-users.controller.ts
|   |   |   `-- admin.module.ts
|   |   |-- auth/
|   |   |   |-- application/
|   |   |   |   `-- auth.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- repositories/
|   |   |   |       `-- auth.repository.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- strategies/
|   |   |   |       |-- apple.strategy.ts
|   |   |   |       |-- google.strategy.ts
|   |   |   |       |-- jwt.strategy.ts
|   |   |   |       |-- jwt-auth-guard.ts
|   |   |   |       `-- ws-jwt.guard.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   |-- auth-ops.dto.ts
|   |   |   |   |   |-- login.dto.ts
|   |   |   |   |   `-- register.dto.ts
|   |   |   |   `-- auth.controller.ts
|   |   |   |-- strategies/
|   |   |   `-- auth.module.ts
|   |   |-- chat/
|   |   |   |-- application/
|   |   |   |   `-- chat.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- message.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- message.repository.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- send-message.dto.ts
|   |   |   |   |-- chat.controller.ts
|   |   |   |   `-- chat.gateway.ts
|   |   |   `-- chat.module.ts
|   |   |-- couple/
|   |   |   |-- application/
|   |   |   |   `-- couple.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- couple.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- couple.repository.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- couple-ops.dto.ts
|   |   |   |   `-- couple.controller.ts
|   |   |   `-- couple.module.ts
|   |   |-- events/
|   |   |   |-- application/
|   |   |   |   `-- events.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- event.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- event.repository.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- event-ops.dto.ts
|   |   |   |   `-- events.controller.ts
|   |   |   `-- events.module.ts
|   |   |-- invites/
|   |   |   |-- application/
|   |   |   |   `-- invite.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- invite.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- invite.repository.ts
|   |   |   `-- invites.module.ts
|   |   |-- media/
|   |   |   |-- application/
|   |   |   |   `-- media.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- media.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- media.repository.ts
|   |   |   |-- presentation/
|   |   |   |   `-- media.controller.ts
|   |   |   `-- media.module.ts
|   |   |-- moments/
|   |   |   |-- application/
|   |   |   |   `-- moments.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- moment.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- moment.repository.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- moment-ops.dto.ts
|   |   |   |   `-- moments.controller.ts
|   |   |   `-- moments.module.ts
|   |   |-- notifications/
|   |   |   |-- application/
|   |   |   |   `-- notifications.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- notification.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- notification.repository.ts
|   |   |   |-- presentation/
|   |   |   |   `-- notifications.controller.ts
|   |   |   `-- notifications.module.ts
|   |   |-- places/
|   |   |   |-- application/
|   |   |   |   `-- places.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- place.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- place.repository.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- place-ops.dto.ts
|   |   |   |   `-- places.controller.ts
|   |   |   `-- places.module.ts
|   |   |-- security/
|   |   |   |-- application/
|   |   |   |   `-- security.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- security.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- security.repository.ts
|   |   |   |-- presentation/
|   |   |   |   `-- security.controller.ts
|   |   |   `-- security.module.ts
|   |   |-- settings/
|   |   |   |-- application/
|   |   |   |   `-- settings.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- setting.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- setting.repository.ts
|   |   |   |-- presentation/
|   |   |   |   `-- settings.controller.ts
|   |   |   `-- settings.module.ts
|   |   |-- uploads/
|   |   |   |-- application/
|   |   |   |   `-- uploads.service.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- presign.dto.ts
|   |   |   |   `-- uploads.controller.ts
|   |   |   `-- uploads.module.ts
|   |   `-- user/
|   |       |-- application/
|   |       |   `-- user.service.ts
|   |       |-- domain/
|   |       |   `-- entities/
|   |       |       `-- users.model.ts
|   |       |-- infrastructure/
|   |       |   `-- persistence/
|   |       |       `-- user.repository.ts
|   |       |-- presentation/
|   |       |   |-- dto/
|   |       |   |   |-- create-user.dto.ts
|   |       |   |   `-- update-user.dto.ts
|   |       |   `-- users.controller.ts
|   |       `-- user.module.ts
|   |-- scripts/
|   |   |-- create-admin.ts
|   |   `-- generate-token.ts
|   |-- app.controller.ts
|   |-- app.module.ts
|   |-- app.service.ts
|   `-- main.ts
|-- tmp/
|   `-- query-app.bat
|-- .dockerignore
|-- .env.example
|-- .eslintrc.js
|-- .prettierignore
|-- .prettierrc
|-- docker-compose.yml
|-- Dockerfile
|-- nest-cli.json
|-- nodemon.json
|-- package.json
|-- package-lock.json
`-- tsconfig.json
```

### 3.5 Pattern thư mục backend
Phần lớn module trong `backend/src/modules/*` đi theo pattern nhiều lớp:
- `application/`: service xử lý nghiệp vụ
- `domain/`: entity/model/repository contract
- `infrastructure/`: persistence/strategy tích hợp kỹ thuật
- `presentation/`: controller, gateway, DTO

## 4. Frontend (`frontend/`)

### 4.1 Vai trò
- Giao diện web cho người dùng.
- Entry point: `frontend/src/main.tsx`
- Component gốc: `frontend/src/App.tsx`
- Component màn hình chính: `frontend/src/components/Home.tsx`

### 4.2 Công nghệ chính (từ `frontend/package.json`)
- React 19 + React DOM
- Vite
- TypeScript
- Axios
- `lucide-react` (icon)

### 4.3 Cấu trúc frontend (rút gọn)

```text
frontend/
|-- public/
|   `-- vite.svg
|-- src/
|   |-- assets/
|   |   `-- react.svg
|   |-- components/
|   |   `-- Home.tsx
|   |-- App.css
|   |-- App.tsx
|   |-- index.css
|   `-- main.tsx
|-- .gitignore
|-- eslint.config.js
|-- index.html
|-- package.json
|-- package-lock.json
|-- README.md
|-- tsconfig.app.json
|-- tsconfig.json
|-- tsconfig.node.json
`-- vite.config.ts
```

## 5. Gợi ý bảo trì tài liệu
Khi thêm module mới (ví dụ `backend/src/modules/...`) hoặc component lớn ở frontend, hãy cập nhật file này để giữ tài liệu đồng bộ với mã nguồn.
