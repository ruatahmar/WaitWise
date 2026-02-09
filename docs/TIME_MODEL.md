# WaitWise Time & Expiry Model (V1)

WaitWise uses background workers to manage **time-driven state transitions**.  
These ensure that turns expire and users transition correctly even without user or admin actions.

---

## 1. Philosophy

- Time drives state transitions like `LATE` → `MISSED`.
- Background jobs enforce these transitions.
- Transactions ensure correctness under concurrency.
- Clients (UI) never drive state; they only reflect it.

---

## 2. Expiry Behavior

Each `LATE` QueueUser has:

- `expiresAt` timestamp
- `graceTime` per queue

When `now > expiresAt`:

- **Automatic transition:** `LATE` → `MISSED`
- Triggered by background jobs (workers) or lazy checks during queue operations.

---

## 3. Background Worker Execution

- Workers scan queues for expired users.
- Each transition is transactional:
  - Validate current state
  - Update state atomically
  - Emit WebSocket events after commit

- Jobs are idempotent — repeated execution cannot corrupt the queue.

---

## 4. Safety Guarantees

- **Concurrency-safe:** multiple workers acting on the same queue cannot violate invariants.
- **Deterministic:** `MISSED` status is consistent with `expiresAt`.
- **Transactional:** partial transitions cannot occur.

---

## 5. Notes

- Late users may rejoin within the grace window (`graceTime`).
- MISSED users can rejoin at the end of the queue.
- All expiry-driven transitions respect the state machine and capacity invariants.
