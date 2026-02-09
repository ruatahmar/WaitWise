# WaitWise System Overview

This document describes how WaitWise operates as a system — its architecture, behavioral model, and the interaction between state, time, and concurrency.

It is intended to give engineers a mental model of the system before diving into implementation details.

<!-- For correctness rules, see:
- INVARIANTS.md
- TRANSITIONS.md
- TIME_MODEL.md
- FAILURE_SCENARIOS.md -->

---

## 1. System Identity

WaitWise is a correctness-first virtual queue management system.

It is designed around:

- transactional state progression
- strict invariants
- time-aware queue behavior
- concurrency-safe promotion and serving

The system prioritizes **integrity over convenience**.  
Every queue action must preserve ordering, capacity limits, and valid state transitions.

---

## 2. Core Model

The system revolves around three primary entities:

### Queue

Represents a service line with:

- queue capacity (`maxSize`)
- serving capacity (`serviceSlots`)
- ordering rules
- time constraints (`graceTime`)

### QueueUser

Represents a user's participation in a queue.

QueueUser is modeled as a **state machine**, not a record:

- WAITING
- SERVING
- LATE
- MISSED
- CANCELLED
- COMPLETED

State transitions define queue behavior.

### User

Actors that:

- own queues
- join queues
- administer service progression

---

## 3. System Philosophy

### 3.1 Database as Authority

The database is the source of truth.

- state correctness enforced transactionally
- uniqueness enforced via constraints
- ordering derived from stored timestamps

Application logic coordinates behavior.  
The database enforces truth.

---

### 3.2 State Machine–Driven Behavior

Queue progression is governed by a strict state machine.

- no direct status mutation
- all transitions validated
- invalid transitions rejected

This guarantees:

- predictability
- debuggability
- concurrency safety

---

### 3.3 Time as an External Actor

Time does not directly mutate state.

Instead:

- timestamps define eligibility
- background processes evaluate time
- valid transitions applied afterward

This prevents:

- timer-based corruption
- restart inconsistencies
- race-driven expiry bugs

---

### 3.4 Realtime as a Visibility Layer

WaitWise uses WebSockets to deliver realtime queue updates to clients.

This includes:

- queue position changes
- promotions
- service completion
- cancellations
- expiry updates

WebSockets act purely as a state broadcast mechanism, not a source of truth.

- Events are emitted only after successful state transitions
- Queue correctness never depends on socket delivery
- Dropped events do not affect system integrity
- Clients must treat socket updates as hints and re-fetch state when needed

The system remains fully correct without realtime delivery; WebSockets exist to improve user experience and multi-client synchronization.

---

## 4. Queue Lifecycle

### Join

User joins queue → QueueUser created in `WAITING` state.

### Promotion

System selects next eligible `WAITING` user:

- slot available
- ordering preserved

User transitions:
`WAITING → SERVING`

### Service

User occupies a service slot.

Service may:

- complete → `COMPLETED`
- timeout → `LATE`
- cancel → `CANCELLED`

### Late Handling

Late users enter grace window.

They may:

- rejoin → `WAITING` (priorityBoost)
- expire → `MISSED`

### Queue Continuation

Queue continues advancing regardless of unresolved LATE users.

---

## 5. Concurrency Model

WaitWise is designed to remain correct under:

- simultaneous joins
- simultaneous promotions
- retries
- duplicate requests
- partial failures

This is achieved through:

- DB transactions
- slot enforcement
- deterministic promotion logic
- state validation before mutation

No operation assumes single-threaded execution.

---

## 6. Ordering Model

Serving order is derived from:

1. priorityBoost
2. join timestamp

This ensures:

- fairness
- determinism
- reproducibility

LATE users do not block queue progression.

---

## 7. Temporal Behavior

Time influences eligibility but does not directly change state.

Key timestamps:

- `servedAt`
- `expiresAt`

Expiry results in:

`LATE → MISSED`

Handled through:

- background jobs
- lazy evaluation during reads

All time-based transitions are idempotent.

---

## 8. Failure Tolerance

System remains correct under:

- retries
- duplicate requests
- background job delays
- server restarts
- network failures

Correctness is guaranteed through:

- invariant enforcement
- transactional transitions
- idempotent operations
- reconciliation workers

---

## 9. Architectural Components

WaitWise consists of:

### API & Realtime Layer

- HTTP request handling
- authentication
- orchestration
- WebSocket event broadcasting

### State Machine Layer

- transition validation
- invariant checks
- promotion logic

### Database Layer

- relational integrity
- transactions
- ordering persistence

### Time & Background Processing

- expiry checks
- reconciliation
- retry-safe jobs

---

## 10. Design Goals

- Preserve queue fairness
- Prevent invalid transitions
- Maintain consistency under concurrency
- Survive retries and failures
- Make system behavior explainable and auditable
- Provide realtime visibility without compromising correctness

---

## 11. Non-Goals

WaitWise is not designed for:

- real-time correctness guarantees via socket delivery
- high-frequency streaming workloads
- event-sourced replay systems
- distributed multi-region consensus

Realtime updates exist to improve UX, not to drive system state.

The focus is correctness of queue state under concurrency and time, not scale extremes or realtime infrastructure complexity.

---

<!-- ## 12. Reading Order

To understand WaitWise deeply:

1. SYSTEM.md
2. INVARIANTS.md
3. TRANSITIONS.md
4. TIME_MODEL.md
5. FAILURE_SCENARIOS.md
6. API.md -->
