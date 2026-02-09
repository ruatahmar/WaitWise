# QueueUser State Transition Table (V1)

QueueUser uses state transitions to ensure only valid status changes occur, keeping queue integrity consistent and making it easier to enforce invariants (like service slot limits) within transactions.

This document defines **allowed state transitions**, **who can trigger them**, and **required invariants** for `QueueUser` in WaitWise.

This table is the **source of truth**. Any transition not listed here is **invalid** and must be rejected at the controller or transaction layer.

---

## States

- `WAITING` – User is queued, waiting to be served
- `SERVING` – User is actively being served (occupies a service slot)
- `LATE` – User was called but did not respond within allowed time
- `MISSED` – User failed to rejoin before `expiresAt`
- `CANCELLED` – User/admin removed the user
- `COMPLETED` – Service finished successfully (terminal)

Terminal states: **COMPLETED**

Exit states: **MISSED**, **CANCELLED**

---

## Transition Table

| From State | To State  | Trigger           | Actor  | Conditions               | Side Effects           |
| ---------- | --------- | ----------------- | ------ | ------------------------ | ---------------------- |
| —          | WAITING   | Join queue        | User   | Queue open               | Create QueueUser entry |
| WAITING    | SERVING   | Promote           | System | `serving < serviceSlots` | Set `servedAt`         |
| SERVING    | COMPLETED | Complete          | Admin  | —                        | Free service slot      |
| SERVING    | LATE      | Mark late         | Admin  | —                        | Set `expiresAt`        |
| LATE       | WAITING   | Rejoin            | User   | `now <= expiresAt`       | Set `priorityBoost`    |
| LATE       | MISSED    | Auto / Lazy check | System | `now > expiresAt`        | Rejoinable             |
| WAITING    | CANCELLED | Leave             | User   | —                        | —                      |
| SERVING    | CANCELLED | Leave             | User   | —                        | Free service slot      |
| WAITING    | CANCELLED | Remove            | Admin  | —                        | —                      |
| SERVING    | CANCELLED | Remove            | Admin  | —                        | Free service slot      |
| CANCALLED  | WAITING   | Rejoin            | User   | Queue open               | Update QueueUser entry |
| MISSED     | WAITING   | Rejoin            | User   | Queue open               | Update QueueUser entry |

---

## Invalid Transitions (Must Reject)

<!-- maybe udpate to include all rejections -->

- `WAITING → COMPLETED`
- `WAITING → LATE`
- `COMPLETED → *`
- `CANCELLED → SERVING`
- `CANCELLED → MISSED`
- `CANCELLED → LATE`
- `CANCELLED → COMPLETED`
- `MISSED → SERVING`
- `MISSED → LATE`
- `MISSED → COMPLETED`
- `LATE → SERVING`

---

## Global Invariants

1. At any time:
   - The number of `SERVING` users **must never exceed** `queue.serviceSlots`, enforced transactionally.

2. A QueueUser has **exactly one** state

3. `COMPLETED` is **immutable** and cannot transition to any other state.

4. `expiresAt`:
   - `expiresAt` is assigned when `SERVING → LATE` transition occurs.
   - MUST be non-null **only** when `status = LATE` or `status = MISSED`
   - MUST be null otherwise

5. Promotion MUST happen inside a transaction

---

## Design Notes

### Priority Boost

- Applied only when `LATE → WAITING`
- Must not violate serving slot invariant

---

## Enforcement Strategy

### State Transition Machine

#### State Machine Authority

- All state transitions must pass through the QueueUser state machine.
- Direct status mutation is forbidden.

#### Transactional Guarantees

- Every transition executes inside a DB transaction.
- Slot availability and state validity are checked atomically.

#### Background Reconciliation

- Background workers may correct time-derived inconsistencies.
- User requests must not rely on reconciliation for correctness.

---
