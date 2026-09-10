# Setup & Deployment

This guide covers the AXON challenge prototype locally and describes the current single-process deployment boundary.

## 1. Local Development Environment

### Prerequisites
- **Node.js**: `20.19.0` or higher (the repository is tested with Node `20.19.6`).
- **Package Manager**: `npm`, `yarn`, or `pnpm`.
- **Google Gemini API Key**: Optional; acquire one via [Google AI Studio](https://aistudio.google.com/) to enable bounded interpretation. Deterministic evaluation remains available without it.
- **(Optional) Firebase Account**: Used by the browser policy adapter. It is not the authoritative Stage 3 audit store.

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/obadadallo95/AXON-Decision-Engine.git
   cd axon-decision-engine
   ```

2. **Install dependencies:**
   ```bash
   npm ci
   ```

3. **Configure Environment Variables:**
   Create `.env.local` at the root of your project:
   ```env
   # [OPTIONAL] Enables bounded Gemini interpretation
   GEMINI_API_KEY=your_gemini_api_key

   # [OPTIONAL] Bearer token for external API callers. Leave empty for the browser demo.
   AXON_API_KEY=your_secure_random_key

   GEMINI_ADVISORY_MODEL=gemini-3.5-flash
   GEMINI_ADVISORY_TIMEOUT_MS=8000
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Access the dashboard at `http://localhost:3000`.

---

## 2. Testing the Engine Locally

To ensure the decision kernel is running properly, open a new terminal and run a typed challenge scenario:

```bash
curl -X POST http://localhost:3000/api/scenarios/run \
  -H 'Content-Type: application/json' \
  -d '{"scenarioId":"refund-stale-conflicting"}'
```

The deliberate refund should return canonical `ESCALATE`, and the response includes the real server trace and audit metadata (excerpt):
```json
{
  "state": "ESCALATE",
  "expectedStateMatches": true,
  "decisionTrace": { "...": "input, signals, reasoning, outcome" },
  "auditEventId": "decision_...",
  "evidence": ["..."],
  ...
}
```

For structured external requests, use the server-owned `policySetId` semantics described in [Decision authority](decision-authority.md). Do not send caller-supplied `policies` to `/api/decide`; that is rejected by design. Legacy prose remains compatibility-only and cannot authorize execution.

Repeat structured requests with the same `idempotencyKey` to replay the original decision and audit identity. Reusing that key with different normalized input or policies returns `IDEMPOTENCY_CONFLICT`. Requests using the legacy payload without a key receive a request-scoped compatibility key.

Audit records are written on the server before a normal decision is returned. If that write is unavailable, AXON withholds `EXECUTE` and returns `AUDIT_WRITE_FAILED`. Only `ESCALATE` decisions can receive an append-only `APPROVE` or `REJECT` event through `POST /api/review`; the original decision is never mutated.

### Run the multi-domain fixtures

The dashboard's scenario selector calls the same server workflow as external callers. The read-only catalog can also be inspected directly:

```bash
curl http://localhost:3000/api/scenarios
```

Run a fixture by ID. The response includes the actual canonical state, advisory status, evidence, policy codes, expected-state comparison, and `auditEventId`:

```bash
curl -X POST http://localhost:3000/api/scenarios/run \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"refund-stale-conflicting"}'
```

The deliberate refund fixture should return `ESCALATE`, not `EXECUTE`, and should expose stale/conflicting evidence, missing approval, critical cost of wrong, and a server audit identity. A Gemini outage is represented as an unavailable advisory; it cannot authorize a scenario.

---

## 3. Single-process deployment

AXON is built on Next.js App Router and can run on a Node-compatible single-process host.

The included audit repository is process-local demo storage. It is not durable across restarts and does not coordinate multiple server instances. Use a server-side transactional adapter before deploying the audit workflow behind a load balancer. Do not treat browser Firestore or localStorage as authoritative decision storage.

### Deploying to a Node host
Install the locked dependencies, inject environment variables, then:
```bash
npm ci
npm run build
npm start
```
This challenge runtime uses process-local audit storage. Do not put it behind a load balancer or claim durable audit retention without adding a transactional server-side repository in a later stage.
