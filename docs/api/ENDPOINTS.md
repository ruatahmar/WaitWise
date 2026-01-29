# API Documentation

This document covers the **endpoint reference** and **controller behavior** for WaitWise V1.

---

# 1. Endpoint Reference (v1)

## 1.1 Auth Endpoints

```
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
POST /api/v1/auth/logoutAll
POST /api/v1/auth/refresh
```

## 1.2 Queue CRUD Endpoints

```
GET /api/v1/queues/
POST /api/v1/queues/
GET /api/v1/queues/:queueId
PUT /api/v1/queues/:queueId
DELETE /api/v1/queues/:queueId
```

### POST and PUT Endpoints require:

**Request Body:**

- `name` (string)
- `maxSize` (int | null)
- `serviceSlots` (int)
- `turnExpiryMinutes` (int) defaults to 5

## 1.3 User Endpoints

```
POST /api/v1/queues/:queueId/join
POST /api/v1/queues/:queueId/leave
GET /api/v1/queues/:queueId/status
POST /api/v1/queues/:queueId/rejoin
```

---

## 1.4 Admin Endpoints

```
POST /api/v1/queues/:queueId/users/:targetUserId/complete
POST /api/v1/queues/:queueId/users/:targetUserId/late
POST /api/v1/queues/:queueId/users/:targetUserId/remove
```

---
