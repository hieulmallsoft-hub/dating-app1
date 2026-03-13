# Mobile Google Login + FCM Token (POST-only)

Tai lieu nay dung cho mobile flow ngan gon, khong dung OAuth redirect callback.

## 1) Login route can goi

```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "<GOOGLE_ID_TOKEN>",
  "fcmToken": "<FCM_DEVICE_TOKEN>",
  "platform": "android"
}
```

Bat buoc:
1. `idToken` la bat buoc, lay tu Google Sign-In SDK.
2. `fcmToken` la bat buoc, lay tu Firebase Messaging SDK.
3. `platform` la optional (`android` | `ios` | `web` | `unknown`), mac dinh `android`.

Ket qua thanh cong:
- `200 OK`, tra `user`, `tokens`, `meta`, va them `deviceId` (`idDevice` alias).

## 2) Khi token FCM refresh tren mobile

Sau khi app da login va co access token, goi endpoint nay de cap nhat token moi:

```http
POST /auth/fcm-token/register
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "fcmToken": "<NEW_FCM_DEVICE_TOKEN>",
  "platform": "android"
}
```

Ket qua:
- `200 OK`:

```json
{
  "success": true,
  "deviceId": "<uuid|null>",
  "idDevice": "<uuid|null>"
}
```

## 3) Khi logout/uninstall

```http
POST /auth/fcm-token/unregister
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "fcmToken": "<CURRENT_FCM_DEVICE_TOKEN>"
}
```

## 4) Test nhanh

1. Chay frontend.
2. Mo `http://localhost:5173/google-idtoken-lab`.
3. Dang nhap Google de lay `idToken`.
4. Lay `fcmToken` tu app/mobile.
5. Goi `POST /auth/google` tren Swagger/Postman voi ca `idToken` + `fcmToken`.

