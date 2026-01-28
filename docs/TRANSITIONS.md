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
- `COMPLETED` – Service finished successfully (terminal)
- `CANCELLED` – User/admin removed the user (terminal)

Terminal states: **COMPLETED, CANCELLED, MISSED**

---

## Transition Table

| From State | To State  | Trigger           | Actor  | Conditions               | Side Effects           |
| ---------- | --------- | ----------------- | ------ | ------------------------ | ---------------------- |
| —          | WAITING   | Join queue        | User   | Queue open               | Create QueueUser entry |
| WAITING    | SERVING   | Promote           | System | `serving < serviceSlots` | Set `servedAt`         |
| SERVING    | COMPLETED | Complete          | Admin  | —                        | Free service slot      |
| SERVING    | LATE      | Mark late         | Admin  | —                        | Set `expiresAt`        |
| LATE       | WAITING   | Rejoin            | User   | `now <= expiresAt`       | Set `priorityBoost`    |
| LATE       | MISSED    | Auto / Lazy check | System | `now > expiresAt`        | Terminal               |
| WAITING    | CANCELLED | Leave             | User   | —                        | —                      |
| SERVING    | CANCELLED | Leave             | User   | —                        | Free service slot      |
| WAITING    | CANCELLED | Remove            | Admin  | —                        | —                      |
| SERVING    | CANCELLED | Remove            | Admin  | —                        | Free service slot      |

---

## Invalid Transitions (Must Reject)

- `COMPLETED → *`
- `CANCELLED → *`
- `MISSED → *`
- `WAITING → COMPLETED`
- `WAITING → LATE`
- `LATE → SERVING`

---

## Global Invariants

1. At any time:
   - `COUNT(queueUser WHERE status = SERVING) <= queue.serviceSlots`

2. A QueueUser has **exactly one** state

3. Terminal states are **immutable**

4. `expiresAt`:
   - MUST be non-null **only** when `status = LATE`
   - MUST be null otherwise

5. Promotion MUST happen inside a transaction

---

## Design Notes

### MISSED State

- `MISSED` is treated as **terminal**
- It may be:
  - eagerly written (cron / background job)
  - lazily derived at read-time using `expiresAt`

- Even if lazily derived, the **logical state** is still MISSED

### Priority Boost

- Applied only when `LATE → WAITING`
- Must not violate serving slot invariant

---

## Enforcement Strategy

- Controllers validate **allowed transition**
- Transactions enforce **slot invariants**
- Background workers may reconcile stale states
- No user-facing request may rely on background repair

---
