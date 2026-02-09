# WaitWise API (V1)

This document defines the public API surface of WaitWise.

The API is transition-driven — endpoints trigger validated state changes within transactions rather than directly mutating records.

All operations respect:

- INVARIANTS.md
- TRANSITIONS.md
- CONCURRENCY.md

Invalid transitions are rejected even if the endpoint is called correctly.

---

## 1. API Structure

Endpoints are grouped by role:

- Auth → identity & session management
- Queue → queue creation and configuration
- User → joining and interacting with queues
- Admin → service progression and moderation

---

## 2. Auth

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/logoutAll
POST /api/v1/auth/refresh
```

Handles authentication, session lifecycle, and refresh token rotation.

---

## 3. Queues

```
GET /api/v1/queues/
POST /api/v1/queues/
GET /api/v1/queues/:queueId
PUT /api/v1/queues/:queueId
DELETE /api/v1/queues/:queueId
GET /api/v1/queues/tickets
```

### Queue Create / Update Payload

Fields:

- `name` (string)
- `maxSize` (int | null)
- `serviceSlots` (int)
- `graceTime` (int, default: 5)

Queues define:

- service capacity
- ordering behavior
- time constraints

---

## 4. User Queue Actions

```
POST /api/v1/queues/:queueId/join
POST /api/v1/queues/:queueId/leave
GET /api/v1/queues/:queueId/status
POST /api/v1/queues/:queueId/rejoin
```

These endpoints trigger QueueUser state transitions:

- **join**
  - creates `QueueUser` in `WAITING`
- **leave**
  - transitions active state → `CANCELLED`
- **rejoin**
  - transitions `MISSED / CANCELLED / LATE` → `WAITING`
- **status**
  - returns current queue state and position

All operations are validated against the state machine.

---

## 5. Admin Actions

```
POST /api/v1/queues/:queueId/users/:targetUserId/complete
POST /api/v1/queues/:queueId/users/:targetUserId/late
POST /api/v1/queues/:queueId/users/:targetUserId/remove
GET /api/v1/queues/:queueId/users?page
```

Admin endpoints drive service progression:

- **complete**
  - `SERVING → COMPLETED`
- **late**
  - `SERVING → LATE`
- **remove**
  - active state → `CANCELLED`
- **users**
  - paginated queue view

All actions execute within transactions and respect service slot invariants.

---

## 6. Transition Safety

Every endpoint:

- validates current QueueUser state
- executes inside a transaction
- enforces capacity and ordering rules
- rejects invalid transitions

Endpoints cannot force state changes that violate system invariants.

---

## 7. Realtime Updates

Queue changes emit WebSocket events after successful transitions:

- promotions
- completions
- cancellations
- expiry updates
- position changes

Sockets reflect state — they do not control it.

Clients must treat events as hints and re-fetch authoritative state when needed.

---

## 8. Versioning

All endpoints are versioned under:

```
/api/v1/
```

Future versions may introduce:

- new transition types
- expanded admin controls
- scheduling and automation features

Backward compatibility will be preserved where possible.

---

## 9. Postman Collection

[Postman link](https://ruata7.postman.co/workspace/WaitWise~9178691e-63b7-4f6b-96c0-fa0c74c68215/collection/40210596-b726433f-d395-4216-8f82-3901b5092404?action=share&creator=40210596&active-environment=40210596-c105d9d1-9b7e-4cca-9847-88d176fcd662)
