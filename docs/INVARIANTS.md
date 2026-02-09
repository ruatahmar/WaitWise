# WaitWise Invariants

This document defines the **core invariants** of the WaitWise system.

Invariants are rules that **must always hold true** in the system, regardless of request order, concurrency, retries, crashes, or partial failures. If any invariant is violated, the system is considered **incorrect**, even if no user-visible error occurs.

---

## 1. Core Philosophy

- The **database is the source of truth**
- Invariants should be enforced as close to the database as possible
- Application logic exists to _respect_ invariants, not replace them
- Controllers may fail; invariants must not

---

## 2. Entity-Level Invariants

### 2.1 User

- A User **may own multiple Queues** with **unique names**
- A User **may join multiple Queues**, but **only once per Queue**

---

### 2.2 Queue

- Each Queue is owned by **exactly one admin User**
- Queue names must be **unique per admin**
- A Queue must have:
  - `maxSize > 0`
  - `graceTime > 0`
  <!-- this is implemented at database level -->

---

### 2.3 QueueUser

#### Status Invariant

A QueueUser must always be in **exactly one** of the following states:

- `WAITING`
- `SERVING`
- `LATE`
- `MISSED`
- `CANCELLED`
- `COMPLETED`

The status must never be `NULL` and must never represent multiple states.

### 2.4 Refresh Tokens

#### Ownership Invariants

- A User may own multiple refresh tokens
- A User may own at most one refresh token per device
- Each refresh token belongs to exactly one User
- Each refresh token is associated with exactly one device identifier, `deviceId`
- At no point may two active refresh tokens exist with the same (`userId, deviceId`) pair.\*

### 2.5 Queue Integrity

- A Queue must not exist without an owner.
- A QueueUser must not exist without a Queue.
- Orphaned relational states are invalid.

---

## 3. State Transition Invariants

- QueueUser state transitions must follow a **strict state machine**.
- Every state transition happens through the state machine
- The state machine is the one source of truth

---

## 4. Temporal Invariants

### 4.1 servedAt

- `servedAt` **must be NULL** unless `status === SERVING` or `status === COMPLETED`

### 4.2 expiresAt

- `expiresAt` **must be NULL** unless `status === LATE` or `status === MISSED`
- If the current time exceeds `expiresAt`:
  - Status must eventually transition to `MISSED`

### 4.3 priorityBoost

- `priorityBoost` **must be 0** for normal users in the queue
- `priorityBoost === 1` for late users who rejoin under grace time

### 4.4 Temporal Monotonicity

- `servedAt` must be ≥ join time
- `expiresAt` must be ≥ `servedAt`
- System time regressions must not produce invalid transitions

---

## 5. Capacity & Concurrency Invariants

### 5.1 Active Serving Limit

At any point in time:

- The number of `SERVING` users **must never exceed** `queue.serviceSlots`, enforced transactionally.

This invariant must hold even under:

- Concurrent requests
- Retries
- Race conditions

Violations must be prevented using **transactions and locking**.

---

### 5.2 FIFO Ordering

- QueueUsers must be served in deterministic queue order derived from:
  1. priorityBoost
  2. join timestamp

- Late users who rejoin within grace time are given a priorityboost

### 5.3 Late User Non-Blocking

- `LATE` users must not block progression of the queue.
- Multiple `LATE` users may exist simultaneously.
- Queue promotion must continue while `LATE` users remain unresolved.
- Promotion logic must ignore `LATE` users when selecting the next `SERVING` candidate.

### 5.4 Promotion Atomicity

- Promotion from `WAITING → SERVING` must:
  - validate slot availability
  - select next eligible user
  - update status

  within a single transaction.

- Partial promotion must never occur.

---

## 6. Uniqueness Invariants

- A User may appear **only once per Queue**
- Tokens must be **unique per Queue**
- A QueueUser must belong to **exactly one Queue**

---

## 7. Deletion & Cancellation Invariants

- Cancelling a QueueUser must:
  - Remove them from active consideration
  - Never reduce correctness of ordering

- Deleting a Queue must:
  - Cascade related QueueUsers
  - Never leave orphaned QueueUsers

---

## 8. Failure & Recovery Invariants

- Background workers may correct **eventual violations**, but:
  - No user-visible operation may rely on recovery for correctness

- Idempotent operations must not violate invariants when retried

---

<!--
## 9. Enforcement Strategy

| Invariant Type | Enforcement Layer                    |
| -------------- | ------------------------------------ |
| Uniqueness     | Database (UNIQUE constraints)        |
| Capacity       | Database transactions                |
| State          | Application + DB constraints         |
| Ordering       | Application logic + indexed ordering |
| Temporal       | DB checks + background jobs          |

--- -->

> ## If an invariant is ever violated, the system is broken — even if no error is thrown.

> All future features must be designed **around these invariants**, not the other way around.

# new

- A LATE user should NOT block the queue.

- Allowed Multiple LATE users
- Queue advancing while LATE users exist
