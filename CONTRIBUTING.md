# Hướng dẫn đóng góp (Contributing Guidelines)

## 1. Branching Strategy

### Protected Branches

- `main` → **production** (🚫 cấm push trực tiếp)
- `develop` → **staging** (nếu sử dụng)

### Branch Naming Convention

| Type         | Format                | Example                 |
| :----------- | :-------------------- | :---------------------- |
| **Feature**  | `feature/<task-name>` | `feature/login-api`     |
| **Bugfix**   | `bugfix/<task-name>`  | `bugfix/login-crash`    |
| **Hotfix**   | `hotfix/<task-name>`  | `hotfix/payment-error`  |
| **Refactor** | `refactor/<scope>`    | `refactor/user-service` |

> ❌ **Lưu ý:** Không đặt tên branch tuỳ tiện như `Main`, `Test`, `Update`, v.v.

---

## 2. Pull Request Rules

### Correct PR Direction

- `feature/*` → `develop` (hoặc `main` nếu không dùng `develop`)
- `bugfix/*` → `develop`
- `hotfix/*` → `main`

> ❌ **Không tạo PR:** `main` → `feature/*`

### PR Title Format

Sử dụng **Conventional Commit** style.

✅ **Đúng:**

- `feat: add login api`
- `fix: prevent null user crash`
- `refactor: optimize user service`

❌ **Sai:**

- `Main`
- `update`
- `done`

### PR Description (BẮT BUỘC)

Mỗi PR phải tuân thủ template sau. PR không có mô tả có thể bị _request changes_.

```markdown
## What

Mô tả thay đổi.

## Why

Lý do cần thay đổi.

## How to test

Hướng dẫn test.
```

---

## 3. PR Size Limitation

- Mỗi PR nên có **< 300–400 dòng** thay đổi.
- PR quá lớn **phải** được tách nhỏ thành nhiều PR.
- **Không mix** nhiều mục đích vào chung một PR (VD: vừa code `feature` mới, vừa `refactor` code cũ, vừa `fix` bug khác).

---

## 4. Self Review Checklist

_Vui lòng tự kiểm tra trước khi tạo PR:_

- [ ] Code build & chạy local thành công.
- [ ] Không còn `console.log` / code debug thừa.
- [ ] Không commit file chứa thông tin nhạy cảm (`.env`, secrets).
- [ ] Đã test các cases chính.
- [ ] Không hardcode các value quan trọng.
- [ ] Đã resolve conflict (nếu có).

---

## 5. Code Review Policy

- Mỗi PR cần có ít nhất **1 reviewer** (người duyệt).
- Người tạo PR **không tự merge** PR của chính mình (trừ khi được thống nhất).
- Reviewer có quyền:
  - Cập nhật yêu cầu thay đổi (Request changes).
  - Yêu cầu tách PR nếu quá lớn.
  - Từ chối PR sai hướng merge.

---

## 6. Sensitive Files (Cần chú ý đặc biệt)

Nếu tạo PR thay đổi những phần sau, **phải ghi chú thật rõ ràng** trong PR:

- Authentication / Authorization
- Database schema / migration
- Config / environment
- Payment logic
- Security-related logic

---

## 7. Commit Guidelines

Nội dung commit cần rõ nghĩa, nhỏ gọn.

✅ **Ví dụ tốt:**

- `feat: create login endpoint`
- `fix: validate email format`

❌ **Tránh:**

- `update`
- `fix bug`
- `done`

---

## 8. Conflict Handling

Nếu branch của bạn bị conflict với branch đích:

1. **Developer phải tự chịu trách nhiệm** resolve trên branch của mình.
2. Không tạo PR chỉ để update branch.
3. Sau khi resolve → push lại và notify reviewer.

---

## 9. Responsibility

- **Người mở PR chịu trách nhiệm** theo dõi PR đó cho đến khi được merge.
- PR bị _request changes_ phải phản hồi trong vòng **24–48h**.
- PR quá lâu không hoạt động có thể bị đóng.

---

## 🔄 Development Workflow (Example)

1. Pull latest `develop`
2. Create feature branch
3. Code & commit
4. Self review
5. Create PR to `develop`
6. Reviewer approve
7. Merge
