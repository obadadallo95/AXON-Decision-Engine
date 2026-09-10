# Setup & Deployment

This guide covers how to run the AXON Decision Engine locally, test it with AI agents, and deploy it to a production environment.

## 1. Local Development Environment

### Prerequisites
- **Node.js**: `v18.17.0` or higher.
- **Package Manager**: `npm`, `yarn`, or `pnpm`.
- **Google Gemini API Key**: Optional; acquire one via [Google AI Studio](https://aistudio.google.com/) to enable bounded interpretation. Deterministic evaluation remains available without it.
- **(Optional) Firebase Account**: Used by the browser policy adapter. It is not the authoritative Stage 3 audit store.

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/obadadallo95/axon-decision-engine.git
   cd axon-decision-engine
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` at the root of your project:
   ```env
   # [OPTIONAL] Enables bounded Gemini interpretation
   GEMINI_API_KEY=your_gemini_api_key

   # [OPTIONAL] Bearer token required when hitting the API externally.
   # If omitted, the local API accepts requests without authentication.
   AXON_API_KEY=your_secure_random_key
   ```

4. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   Access the dashboard at `http://localhost:3000`.

---

## 2. Testing the Engine Locally

To ensure the decision kernel is running properly, open a new terminal and fire a test curl command to your local instance:

```bash
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AXON_API_KEY}" \
  -d '{
    "prompt": "Run an update on all database schemas via Prisma",
    "policies": [
      {
        "id": "1",
        "title": "DB Protection",
        "description": "Database schema modifications require human review."
      }
    ]
  }'
```

You should receive a structured JSON response containing the legacy projection and server-owned audit metadata:
```json
{
  "decision": "ESCALATE_TO_HUMAN",
  "authoritativeDecision": "ESCALATE",
  "auditEventId": "decision_...",
  "idempotencyKey": "request_...",
  "integrity": {
    "inputHash": "...",
    "signalsHash": "...",
    "policyHash": "...",
    "outcomeHash": "...",
    "advisoryHash": "...",
    "eventHash": "..."
  },
  ...
}
```

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

## 3. Production Deployment

AXON is built on Next.js App Router and deploys seamlessly to Vercel, or any Node-compatible hosting provider (Render, Railway, AWS Amplify).

The included audit repository is process-local demo storage. It is not durable across restarts and does not coordinate multiple server instances. Use a server-side transactional adapter before deploying the audit workflow behind a load balancer. Do not treat browser Firestore or localStorage as authoritative decision storage.

### Deploying to Vercel
1. Push your repository to GitHub.
2. Import the project in Vercel.
3. In the Vercel Dashboard, go to **Settings > Environment Variables**.
4. Add `GEMINI_API_KEY` and `AXON_API_KEY`.
5. Deploy.

### Building as a Docker Container or Standard Node App
If deploying to a traditional VPS or Container Registry:
```bash
# Build the Next.js optimized payload
npm run build

# Start the production server
npm start
```
*Note: Ensure your environment variables are injected into the container environment prior to running `npm start`.*
