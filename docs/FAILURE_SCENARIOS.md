# WaitWise Failure Scenarios (V1)

This document describes known failure scenarios and how WaitWise prevents them from breaking queue correctness.  
All protections assume the system uses:

- transactions for state transitions
- background workers for expiry and late handling
- the state machine for validation

---

## 1. Partial Failures

### Scenario

- A process crashes mid-transition (e.g., completing a user).

### Protection

- Transactions roll back partial state changes
- Service slot counts remain consistent
- Invariants (capacity, ordering) are preserved

---

## 2. Duplicate Requests / Retries

### Scenario

- Client retries a request due to timeout or network issues
- Multiple identical requests hit the server concurrently

### Protection

- Operations are **idempotent**:
  - Join → cannot create duplicate QueueUser
  - Leave / Remove → repeated requests have no side effects
- State machine validation prevents invalid transitions

---

## 3. Concurrency Conflicts

### Scenario

- Multiple users join or leave the same queue at the same time
- Admin completes or promotes users simultaneously

### Protection

- Database transactions + row-level locking prevent slot over-allocation
- Promotions and completions validate current state before applying changes
- Ordering remains deterministic
- Tested via **joinStorm.ts** and **leaveStorm.ts**

---

## 4. Background Worker Failures

### Scenario

- Worker crashes while processing expiries or promotions
- Worker is restarted while jobs are still queued

### Protection

- Jobs use **unique `jobId` per queue** to avoid duplication
- Retries: 5 attempts with exponential backoff (5s)
- Successful jobs are removed automatically; failed jobs remain for inspection
- Jobs are idempotent — repeated or overlapping execution cannot corrupt state
- Queue invariants remain valid even if a worker fails mid-job

---

## 5. Clock Skew / Time Drift

### Scenario

- Server clock is inaccurate
- `expiresAt` comparisons are inconsistent

### Protection

- WaitWise relies on a **single source of time** (server timestamp)
- All expiry and LATE/MISSED logic uses the same clock
- Client clocks do not affect queue correctness

---

## 6. Data Loss / Partial Writes

### Scenario

- DB connection drops mid-transition
- Crash occurs before commit

### Protection

- Transactions ensure no partial writes
- State remains consistent
- Failed operations can safely be retried without violating invariants

---

## 7. Summary of Guarantees

- Queue integrity is never compromised by crashes, retries, or worker failures
- Service slot limits are always enforced
- State transitions are only applied if valid and complete
- Background workers and concurrent requests cannot break ordering or capacity

> WaitWise is designed so that **correctness is guaranteed**, even in the presence of failures. Realtime updates, UX, or client retries do not affect this guarantee.
