# WaitWise (V1) — API Documentation

This document covers the **endpoint reference** and **controller behavior** for WaitWise V1.

It is designed to be **short, structured, and accurate**, reflecting the state transitions and invariants enforced by the system.

---

# 1. Endpoint Reference (v1)

## 1.1 Queue CRUD Endpoints

```
    GET /api/v1/queues/

```

---

### `GET /api/v1/queues/:queueId`

**Auth:** JWT (User)

**Description:** Returns details for a specific queue.

**Success:** `200` → queue object

**Errors:**

- `404` Queue not found
- `401` Unauthorized

---

### `POST /api/v1/queues/create`

**Auth:** JWT (User)

**Description:** Creates a new queue owned by the authenticated user.

**Request Body:**

- `name` (string)
- `maxSize` (int | null)
- `serviceSlots` (int)
- `turnExpiryMinutes` (int)

**Success:** `201` → created queue

**Errors:**

- `400` Validation errors
- `401` Unauthorized

---

### `PUT /api/v1/queues/:queueId`

**Auth:** JWT (User - Admin)

**Description:** Updates queue metadata.

**Request Body:**

- `name` (string)
- `maxSize` (int | null)
- `serviceSlots` (int)
- `tokenTTL` (int)

**Side Effects:**

- May call `promoteIfAvailableSlot()` if `serviceSlots` changes.

**Success:** `200` → updated queue

**Errors:**

- `404` Queue not found
- `401` Unauthorized

---

### `DELETE /api/v1/queues/:queueId`

**Auth:** JWT (User - Admin)

**Description:** Deletes a queue and all associated QueueUser entries.

**Success:** `200` → deletion result

**Errors:**

- `404` Queue not found
- `401` Unauthorized

---

## 1.2 User Endpoints

### `POST /api/v1/queues/:queueId/join`

**Auth:** JWT (User)

**Description:** Join a queue.

**Behavior:**

- Creates a `QueueUser` entry with status `WAITING`.
- If service slot available, auto-promotes to `SERVING`.

**Success:** `201` → created QueueUser

**Errors:**

- `404` Queue not found
- `400` Already joined
- `400` Queue full

---

### `POST /api/v1/queues/:queueId/leave`

**Auth:** JWT (User)

**Description:** User leaves a queue.

**Behavior:**

- Updates status to `CANCELLED`.
- If user was `SERVING`, frees slot and promotes next waiting.

**Success:** `200` → updated QueueUser

**Errors:**

- `404` Queue not found
- `400` User not in queue
- `400` Already completed

---

### `GET /api/v1/queues/:queueId/status`

**Auth:** JWT (User)

**Description:** Returns the user’s current ticket status.

**Response Includes:**

- `status`, `token`, `servedAt`, `expiresAt`
- queue metadata (`name`, `serviceSlots`, `turnExpiryMinutes`)
- `position` (relative to other waiting users)

**Success:** `200` → ticket status

**Errors:**

- `404` Not in queue

---

### `POST /api/v1/queues/:queueId/rejoin`

**Auth:** JWT (User)

**Description:** Rejoin after being marked `LATE`.

**Behavior:**

- If `now <= expiresAt` → status becomes `MISSED` (cannot rejoin)
- Else → status becomes `WAITING` with `priorityBoost = 1`

**Success:** `200` → success message

**Errors:**

- `404` Queue not found
- `400` Not in queue
- `400` Not late

---

## 1.3 Admin Endpoints

### `POST /api/v1/queues/:queueId/users/:targetUserId/complete`

**Auth:** JWT (Admin)

**Description:** Marks a serving user as completed.

**Behavior:**

- Updates status to `COMPLETED`.
- Promotes next waiting user if slot available.

**Success:** `200` → updated user

**Errors:**

- `404` Queue not found
- `400` User not in queue
- `400` User not serving

---

### `POST /api/v1/queues/:queueId/users/:targetUserId/late`

**Auth:** JWT (Admin)

**Description:** Marks a serving user as late.

**Behavior:**

- Updates status to `LATE` and sets `expiresAt`.
- Promotes next waiting user if slot available.

**Success:** `200` → updated user

**Errors:**

- `404` Queue not found
- `400` User not in queue
- `400` User not serving

---

### `POST /api/v1/queues/:queueId/users/:targetUserId/remove`

**Auth:** JWT (Admin)

**Description:** Removes a user from queue (cancel).

**Behavior:**

- Updates status to `CANCELLED`.
- If user was `SERVING`, frees slot and promotes next waiting.

**Success:** `200` → updated user

**Errors:**

- `404` Queue not found
- `400` User not in queue

---

---

# 2. Controller Docs (v1)

## 2.1 `joinQueue()`

**Purpose:** Join queue and promote if slot available.

**Steps:**

1. Validate queue existence
2. Validate not already joined
3. Validate `maxSize` not exceeded
4. Create QueueUser with status `WAITING`
5. Call `promoteIfAvailableSlot()`

**Transaction:** yes (to prevent race conditions)

---

## 2.2 `leaveQueue()`

**Purpose:** Cancel user from queue.

**Steps:**

1. Validate queue exists
2. Validate user exists in queue
3. Validate not already `COMPLETED`
4. Update status to `CANCELLED`
5. If user was `SERVING`, call `promoteIfAvailableSlot()`

**Transaction:** yes

---

## 2.3 `getQueueStatus()`

**Purpose:** Return ticket status + queue metadata + position.

**Steps:**

1. Validate user is in queue
2. Compute position by counting waiting users ahead
3. Return status + metadata + position

**Transaction:** recommended

---

## 2.4 `lateRejoin()`

**Purpose:** Rejoin a queue after being late.

**Steps:**

1. Validate queue exists
2. Validate user exists
3. Validate status is `LATE`
4. If `now <= expiresAt` → mark `MISSED`
5. Else → mark `WAITING` with `priorityBoost=1`

**Transaction:** yes

---

## 2.5 `markComplete()`

**Purpose:** Mark a serving user as completed.

**Steps:**

1. Validate queue exists and admin is owner
2. Validate selected user exists and is `SERVING`
3. Update status to `COMPLETED`
4. Call `promoteIfAvailableSlot()`

**Transaction:** yes

---

## 2.6 `markLate()`

**Purpose:** Mark a serving user as late.

**Steps:**

1. Validate queue exists and admin is owner
2. Validate selected user exists and is `SERVING`
3. Update status to `LATE` and set `expiresAt`
4. Call `promoteIfAvailableSlot()`

**Transaction:** yes

---

## 2.7 `removeQueueUser()`

**Purpose:** Admin cancels a user from queue.

**Steps:**

1. Validate queue exists and admin is owner
2. Validate user exists in queue
3. Update status to `CANCELLED`
4. If user was `SERVING`, call `promoteIfAvailableSlot()`

**Transaction:** yes

---

## 2.8 `updateQueue()`

**Purpose:** Update queue metadata.

**Steps:**

1. Validate queue exists and admin is owner
2. Update queue fields
3. If `serviceSlots` changed, call `promoteIfAvailableSlot()`

**Transaction:** recommended

---

# 3. Notes

### Transactions

All state-changing operations **must be executed inside transactions** to guarantee:

- serving slot invariants
- race-free promotions
- consistent state transitions

---

### Promotion Logic

`promoteIfAvailableSlot()` must:

- calculate open slots
- select top waiting candidates by `priorityBoost` + `joinedAt`
- update them to `SERVING`

---

_Last updated: V1 API lock_
