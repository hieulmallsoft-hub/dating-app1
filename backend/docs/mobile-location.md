# Mobile Location Realtime Guide

This document describes the realtime location flow for mobile clients.

## Quick Summary
1. Login and get JWT.
2. Connect Socket.IO with JWT and emit `location:join`.
3. Start heartbeat every 25-30 seconds with `presence:heartbeat`.
4. Send location updates via `PATCH /profile/location`.
5. Listen to `location:updated` and `presence:updated` for partner updates.
6. If socket drops, call `GET /couple/locations` to restore last known data.

## Auth
Send JWT in any of these:
1. Socket auth: `auth.token` or `auth.accessToken`
2. Header: `Authorization: Bearer <token>`

## HTTP Endpoints

### Update Current Location
`PATCH /profile/location`

Body example:
```json
{
  "lat": 21.028511,
  "lng": 105.804817,
  "accuracy": 12.5,
  "speed": 0.8,
  "batteryLevel": 67,
  "isCharging": false,
  "timestamp": 1762677600000
}
```

Notes:
1. `batteryLevel` is expected as 0-100 integer.
2. `timestamp` is Unix epoch in milliseconds.
3. `accuracy` is meters.
4. `speed` is optional and stored as provided by client.

Response example:
```json
{
  "userId": "uuid",
  "accountCode": "123456",
  "latitude": 21.0285,
  "longitude": 105.8048,
  "accuracy": 12.5,
  "batteryLevel": 67,
  "isCharging": false,
  "speed": 0.8
}
```

### Get Current Locations
`GET /couple/locations`

Response example:
```json
{
  "me": {
    "userId": "uuid",
    "latitude": 21.0285,
    "longitude": 105.8048,
    "lastActiveAt": "2026-03-26T03:40:00.000Z",
    "batteryLevel": 67
  },
  "partner": {
    "userId": "uuid",
    "latitude": 21.0312,
    "longitude": 105.8101,
    "lastActiveAt": "2026-03-26T03:39:30.000Z",
    "batteryLevel": 22
  }
}
```

### Get Location History
`GET /couple/location-history?from=...&to=...&limit=...`

Use for route drawing and analytics.

## Socket Events

### Client to Server
1. `location:join`
2. `presence:heartbeat`

`location:join` response:
```json
{ "event": "location:joined", "data": { "coupleId": "uuid" } }
```

### Server to Client
1. `location:updated`
2. `presence:updated`

`location:updated` payload:
```json
{
  "coupleId": "uuid",
  "userId": "uuid",
  "latitude": 21.0285,
  "longitude": 105.8048,
  "accuracy": 12.5,
  "batteryLevel": 67,
  "isCharging": false,
  "speed": 0.8,
  "lastActiveAt": "2026-03-26T03:40:00.000Z"
}
```

`presence:updated` payload:
```json
{
  "userId": "uuid",
  "status": "online",
  "lastSeenAt": "2026-03-26T03:40:05.000Z"
}
```

Status values:
1. `online`
2. `disconnected`

## Realtime Flow
1. Mobile connects socket with JWT.
2. Mobile emits `location:join`.
3. Mobile sends `presence:heartbeat` every 25-30 seconds.
4. Mobile sends `PATCH /profile/location` when GPS updates.
5. Backend validates, rate-limits, stores, then emits `location:updated` to partner.
6. Presence updates are emitted on join, heartbeat, and disconnect.

## Background Updates
If the app is in background but has background location permission and network:
1. Mobile can continue sending location updates.
2. Partner still sees new location updates in realtime.

## Rate Limit and Jump Check
Backend may ignore updates that are too frequent or unrealistic:
1. Minimum interval: 3 seconds
2. Minimum distance: 5 meters
3. Max speed: 300 km/h

## Error Handling
1. If update is stale, server ignores it and returns current location.
2. If socket disconnects, mobile should reconnect and call `GET /couple/locations`.
