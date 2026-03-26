# DOC.md - C?u trúc d? án `dating-app`

## 1. T?ng quan

D? án hi?n t?i du?c tách thành 2 ph?n chính:
- `backend/`: API server dùng **NestJS** (TypeORM, Swagger, Socket.IO, JWT/OAuth).
- `frontend/`: giao di?n dùng **React + Vite + TypeScript**.

Ghi chú:
- Tài li?u này mô t? c?u trúc hi?n t?i trong repo.
- Cây thu m?c bên du?i dã **b? qua** `.git`, `node_modules`, `dist` d? d? d?c.

## 2. C?u trúc thu m?c g?c (root)

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
- Backend API cho ?ng d?ng dating app.
- Entry point: `backend/src/main.ts`
- Root module: `backend/src/app.module.ts`
- C?u hình: `backend/src/config/*`
- Dùng middleware/guards/decorators chung trong `backend/src/common/*`

### 3.2 Công ngh? chính (t? `backend/package.json`)
- Runtime/framework: NestJS (`@nestjs/*`)
- Database ORM: TypeORM + PostgreSQL (`typeorm`, `pg`)
- Auth: JWT + Passport (Google/Apple strategies)
- Realtime: Socket.IO (`@nestjs/websockets`, `socket.io`)
- API docs: Swagger (`@nestjs/swagger`)

### 3.3 Các module nghi?p v? chính
- `admin`
- `auth`
- `chat`
- `couple`
- `events`
- `invites`
- `media`
- `moments`
- `notifications`
- `Locations`
- `security`
- `settings`
- `uploads`
- `user`

### 3.4 C?u trúc backend (rút g?n)

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
|   |   |-- locations/
|   |   |   |-- application/
|   |   |   |   `-- locations.service.ts
|   |   |   |-- domain/
|   |   |   |   `-- entities/
|   |   |   |       `-- Location.entity.ts
|   |   |   |-- infrastructure/
|   |   |   |   `-- persistence/
|   |   |   |       `-- Location.repository.ts
|   |   |   |-- presentation/
|   |   |   |   |-- dto/
|   |   |   |   |   `-- Location-ops.dto.ts
|   |   |   |   `-- locations.controller.ts
|   |   |   `-- locations.module.ts
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

### 3.5 Pattern thu m?c backend
Ph?n l?n module trong `backend/src/modules/*` di theo pattern nhi?u l?p:
- `application/`: service x? lý nghi?p v?
- `domain/`: entity/model/repository contract
- `infrastructure/`: persistence/strategy tích h?p k? thu?t
- `presentation/`: controller, gateway, DTO

## 4. Frontend (`frontend/`)

### 4.1 Vai trò
- Giao di?n web cho ngu?i dùng.
- Entry point: `frontend/src/main.tsx`
- Component g?c: `frontend/src/App.tsx`
- Component màn hình chính: `frontend/src/components/Home.tsx`

### 4.2 Công ngh? chính (t? `frontend/package.json`)
- React 19 + React DOM
- Vite
- TypeScript
- Axios
- `lucide-react` (icon)

### 4.3 C?u trúc frontend (rút g?n)

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

## 5. G?i ý b?o trì tài li?u
Khi thêm module m?i (ví d? `backend/src/modules/...`) ho?c component l?n ? frontend, hãy c?p nh?t file này d? gi? tài li?u d?ng b? v?i mã ngu?n.
