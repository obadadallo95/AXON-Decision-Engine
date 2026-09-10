# Challenge Deployment Plan

This is a documentation-only deployment plan. No deployment is performed by this repository stage.

## Recommended shape

Use one stable Node process or container on a host such as Railway, Render, Fly.io, or a small VPS. The provider is not mandatory. The important constraint is that the process-local audit repository and review continuity remain in one process.

Serverless or multi-instance deployment can lose audit and review continuity across restarts or instances. Do not put this prototype behind a load balancer and present its audit as durable. A future deployment can replace the repository with a transactional server-side store before horizontal scaling.

## Configuration

Set these environment variables:

- `GEMINI_API_KEY` — optional; omit it for a deterministic demo.
- `GEMINI_ADVISORY_MODEL` — optional; defaults to the repository’s configured model.
- `GEMINI_ADVISORY_TIMEOUT_MS` — optional; defaults to `8000`.
- `AXON_API_KEY` — optional Bearer protection for external API callers; leave empty for the browser demo.

Do not expose `AXON_API_KEY` in browser code.

## Build and start

```bash
npm ci
npm run build
npm start
```

## Post-deploy smoke checks

Run the five scenario IDs and confirm the canonical states:

```text
deploy-safe-release       → EXECUTE
ticket-missing-context    → ASK
ticket-system-pending     → DEFER
refund-duplicate-payout  → REFUSE
refund-stale-conflicting → ESCALATE
```

Then confirm the returned `auditEventId` can be read through `/api/audit`, and submit `APPROVE` or `REJECT` through `/api/review` only for the `ESCALATE` record. Verify that the review is appended and the original decision remains unchanged.
