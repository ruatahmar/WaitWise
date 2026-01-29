# Controller Docs

All controllers are transactional

## 1 `joinQueue()`

**Purpose:** Join queue and promote if slot available.

**Steps:**

1. Validate queue existence
2. Validate not already joined
3. Validate `maxSize` not exceeded
4. Create QueueUser with status `WAITING`
5. Call `promoteIfAvailableSlot()`

---

## 2 `leaveQueue()`

**Purpose:** Cancel user from queue.

**Steps:**

1. Validate queue exists
2. Validate user exists in queue
3. Validate not already `COMPLETED`
4. Update status to `CANCELLED`
5. If user was `SERVING`, call `promoteIfAvailableSlot()`

---

## 3 `getQueueStatus()`

**Purpose:** Return ticket status + queue metadata + position.

**Steps:**

1. Validate user is in queue
2. Compute position by counting waiting users ahead
3. Return status + metadata + position

---

## 4 `lateRejoin()`

**Purpose:** Rejoin a queue after being late.

**Steps:**

1. Validate queue exists
2. Validate user exists
3. Validate status is `LATE`
4. If `now <= expiresAt` → mark `MISSED`
5. Else → mark `WAITING` with `priorityBoost=1`

---

## 5 `markComplete()`

**Purpose:** Mark a serving user as completed.

**Steps:**

1. Validate queue exists and admin is owner
2. Validate selected user exists and is `SERVING`
3. Update status to `COMPLETED`
4. Call `promoteIfAvailableSlot()`

---

## 6 `markLate()`

**Purpose:** Mark a serving user as late.

**Steps:**

1. Validate queue exists and admin is owner
2. Validate selected user exists and is `SERVING`
3. Update status to `LATE` and set `expiresAt`
4. Call `promoteIfAvailableSlot()`

---

## 7 `removeQueueUser()`

**Purpose:** Admin cancels a user from queue.

**Steps:**

1. Validate queue exists and admin is owner
2. Validate user exists in queue
3. Update status to `CANCELLED`
4. If user was `SERVING`, call `promoteIfAvailableSlot()`

---

## 8 `updateQueue()`

**Purpose:** Update queue metadata.

**Steps:**

1. Validate queue exists and admin is owner
2. Update queue fields
3. If `serviceSlots` changed, call `promoteIfAvailableSlot()`

---

# Notes

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

### State Transition Machine

All state transitions **must be carried out throught the state transition machine**

- This ensures only valid transitions.
- This provides a central source of truth.

---
