# Concurrency Model

This document explains how WaitWise maintains correctness when multiple users interact with the same queue at the same time.

WaitWise assumes concurrency by default:

- multiple joins
- simultaneous leaves
- retries

Correctness is preserved using transactions, constraints, and state validation.

---

## Core Approach

- The database acts as the synchronization layer
- All state transitions occur inside transactions
- Invariants are validated before commit
- Duplicate or conflicting operations fail safely

Application servers do not coordinate concurrency directly.

---

## Concurrency-Sensitive Operations

### Joining a Queue

Risks:

- duplicate joins
- race between multiple join requests

Protection:

- uniqueness constraint per (user, queue)
- transactional creation

Tested via:

- **script/concurrency/joinStorm.ts**

---

### Leaving a Queue

Risks:

- multiple cancellations at once
- leave during promotion or serving

Protection:

- state validation before mutation
- transactional removal

Tested via:

- **script/concurrency/leaveStorm.ts**

---

## Promotion Safety

Promotion (WAITING → SERVING) is executed transactionally:

- slot availability validated
- next eligible user selected
- status updated atomically

This prevents:

- exceeding serviceSlots
- double SERVING states

---

## Retry Safety

Requests may be retried due to:

- network failures
- client timeouts

System guarantees:

- no duplicate QueueUsers
- no invalid transitions
- consistent final state

---

## Failure Safety

If a process fails mid-operation:

- transaction rolls back
- no partial state persists

Queue integrity remains intact.
