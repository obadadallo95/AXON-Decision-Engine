# Architecture & System Design

AXON serves as an external, objective verification layer, decoupling security governance from AI agent execution logic.

## 1. System Topology

```mermaid
graph TD
    A[AI Agents / Developer IDEs] -->|HTTP POST Request| B(AXON Decision API: /api/decide)
    B -->|Normalize + hash + idempotency| C[Decision Service]
    C -->|Bounded interpretation only| D[Google Gemini]
    C -->|Deterministic reconciliation + policy evaluation| E[Decision Kernel]
    C -->|Append decision record| F[(Server Audit Repository)]
    G[Human Reviewer] -->|POST /api/review| H[Review API]
    H -->|Append review event| F
    I[AXON Web UI] -->|GET /api/audit| J[Audit API]
    J --> F
    C -->|Decision + audit identity| A
```

The current repository uses a process-local server-owned repository. It is suitable for local and single-instance demonstrations, but it is not durable across restarts or safe as a shared store across multiple instances.

## 2. The Core Workflow (`server/decision-service.ts`)

The Next.js route is intentionally thin. `server/decision-service.ts` owns the request lifecycle and writes the audit record before returning the decision.

- **Normalization and idempotency**: Requests and policy rules are normalized and hashed. A structured request may supply an idempotency key; legacy requests receive a request-scoped compatibility key.
- **Bounded interpretation**: Gemini receives the request, explicit signals, evidence, and policy summaries. Its output is advisory and cannot select the final state.
- **Deterministic authority**: Explicit signals are reconciled with advisory interpretation, then the policy kernel selects `EXECUTE`, `ASK`, `DEFER`, `ESCALATE`, or `REFUSE`.
- **Audit-before-return**: The service appends a decision record containing normalized input, signals, policy authority, outcome, model metadata, and integrity hashes before returning a normal result.
- **Failure safety**: If the audit write fails, normal `EXECUTE` is withheld and the response exposes `AUDIT_WRITE_FAILED`.

## 3. Server-Owned Audit and Review (`server/audit-repository.ts`)

`server/audit-repository.ts` exposes append-only decision and review operations. It enforces idempotency conflicts, first-review-wins behavior, review eligibility, and hash linkage from each review event to its parent decision event. There are no authoritative browser writes and no localStorage fallback for decisions.

`lib/firestore-service.ts` remains a browser adapter for policy display/storage and for reading server audit data through `/api/audit`. A durable server-side Firestore/Admin adapter is intentionally deferred; it must provide transactions or equivalent atomic compare-and-set semantics before being used for multi-instance deployment.

## 4. API Boundaries

- **`POST /api/decide`**: Validates structured or legacy input and returns the deterministic outcome plus `auditEventId`, `idempotencyKey`, replay status, and integrity metadata.
- **`POST /api/review`**: Accepts only `APPROVE` or `REJECT` for an existing `ESCALATE` decision. It appends an immutable review event and never changes the original decision record.
- **`GET /api/audit`**: Reads a decision audit trail by `requestId` or lists recent server-owned records for the dashboard.

## 5. The UI Dashboard (`app/page.tsx`)

A React/Next.js interface designed to give human operators visibility into the system.
- **Policy Management**: Operators can write, toggle, and delete security guardrails.
- **Live Simulator**: A terminal-like interface to directly hit the API endpoint and visualize how the decision engine interprets different payloads.
- **Audit visibility**: The dashboard reads audit and review history from the server API; it does not create or mutate authoritative decision records in the browser.
- **Bilingual Interface**: Absolute RTL-compliant rendering utilizing advanced Tailwind CSS configurations to support both English and Arabic natively.
