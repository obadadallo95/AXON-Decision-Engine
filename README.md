# AXON Decision Engine

> **Challenge prototype using synthetic data. AXON evaluates and records decisions but does not execute real refunds, deployments, or tool actions.**

AXON is a server-owned decision boundary for AI-proposed actions. Its core question is:

> **Should this proposed action execute, ask, defer, escalate, or refuse?**

Gemini can interpret bounded action language and evidence, but it never authorizes an action. AXON normalizes the request, reconciles explicit signals, applies server-owned policy, chooses the outcome, and writes the audit record before returning.

## The five canonical states

- `EXECUTE` — safe to proceed autonomously.
- `ASK` — the requester must provide missing information.
- `DEFER` — wait for evidence, timing, or system conditions to change.
- `ESCALATE` — human authority is required.
- `REFUSE` — the action is prohibited.

`DEFER` is a waiting state, not human escalation. Legacy response projections remain in the API for compatibility, but the canonical `state` is the primary model.

## Architecture

```text
Proposed Action + Context
          ↓
Validation / Normalization
          ↓
Explicit Signals
          ↓
Bounded Gemini Interpretation (optional)
          ↓
Signal Reconciliation
          ↓
Server-Owned Policy Authority
          ↓
Five-State Decision
          ↓
Server Audit Record
          └──────── ESCALATE → Review Event
```

**Gemini reasons. AXON authorizes.** The runtime audit repository is process-local and server-owned; it is not Firestore and is not durable across restarts or multiple instances. See [the architecture notes](docs/architecture.md) and [the architecture snapshot](assets/architecture.svg).

## Submission package

- [Judge-facing submission notes](docs/submission.md)
- [90-second demo script](docs/demo-script.md)
- [Deliberate failure: €4,800 refund](docs/deliberate-failure.md)
- [Two-year thesis](THESIS.md)
- [Deployment plan](docs/deployment.md)
- [Submission checklist](docs/submission-checklist.md)

## Challenge demo

The dashboard has three domains and fifteen typed scenarios:

- Code Deployment
- Refund Approval
- Support Ticket Triage

For a fast 90-second path, run:

1. Safe staging release → `EXECUTE`
2. Missing ticket context → `ASK`
3. Routing system pending → `DEFER`
4. Duplicate refund payout → `REFUSE`
5. The deliberate €4,800 refund → `ESCALATE`

The failure case is `refund-stale-conflicting`: order `4815`, a €4,800 refund, stale payment evidence, conflicting fraud evidence, three chargebacks, critical cost of wrong, and missing finance approval. It returns `ESCALATE`; it never executes a payout. Favorable or unavailable Gemini advisory output cannot clear deterministic blockers, and review records do not rewrite the original decision.

## Local setup

Tested with Node `20.19.6` (see `.nvmrc` and `package.json` engines).

```bash
git clone https://github.com/obadadallo95/AXON-Decision-Engine.git
cd AXON-Decision-Engine
npm ci
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. `GEMINI_API_KEY` is optional; without it, the deterministic kernel still runs and the advisory is recorded as unavailable. `AXON_API_KEY` is also optional for the browser demo. If set, external API calls must send `Authorization: Bearer <key>`; do not expose that key in browser code.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | Enables optional bounded Gemini interpretation. |
| `GEMINI_ADVISORY_MODEL` | No | Model name; defaults to `gemini-3.5-flash` and remains environment-configurable. |
| `GEMINI_ADVISORY_TIMEOUT_MS` | No | Provider timeout; defaults to `8000`. |
| `AXON_API_KEY` | No | Optional Bearer protection for API callers. Leave empty for the browser demo. |

## Run a real scenario

The dashboard and this command use the same server workflow:

```bash
curl -X POST http://localhost:3000/api/scenarios/run \
  -H 'Content-Type: application/json' \
  -d '{"scenarioId":"refund-stale-conflicting"}'
```

The response includes the canonical `state`, evidence, advisory status, `decisionTrace`, expected-state comparison, integrity metadata, and `auditEventId`.

The source TypeScript client is available at [`lib/axon-sdk.ts`](lib/axon-sdk.ts). AXON exposes a REST decision API and a source TypeScript client for prototype integration; there is no published npm SDK in this stage.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
git diff --check
npm audit
```

The current audit leaves 2 advisories after the targeted same-major Next.js 15.5.25 upgrade: 1 high PostCSS advisory and 1 moderate Next.js advisory. npm offers a Next 16 breaking upgrade for the remaining chain; it is intentionally deferred until behavior can be migrated safely.

## Key engineering decisions

- The five-state kernel is deterministic and fail-closed.
- Server-owned policy sets are authoritative; caller prose and caller policies cannot grant authority.
- Explicit safety context dominates model inference.
- Evidence freshness, required evidence, and material conflicts are enforced before `EXECUTE`.
- Audit is written before a normal decision is returned.
- Idempotency and append-only review events are server-side concerns.
- Gemini is bounded, optional, timeout-limited, and advisory-only.

## Current limitations

- Scenario evidence is synthetic and reviewer identity is simulated.
- Audit storage is process-local and not durable across restarts or horizontally scaled instances.
- AXON records decisions but has no execution adapter for refunds, deployments, or tools.
- Gemini availability depends on the configured provider and model name.
- The visible policy editor is intentionally not part of the challenge flow; the scenario runner uses server-owned policies.

## Intentionally out of scope

Durable Firestore/Postgres audit storage, a published npm package, Codex or Claude integrations, MCP/shell gateways, Agent Relay, and real execution adapters are intentionally out of scope for this challenge prototype.

## AI tools used

Google Gemini is the optional runtime advisory provider. OpenAI Codex assisted repository implementation, evaluation, and submission packaging. Neither model is an authorization source; the server-owned deterministic kernel is.

More detail is available in [decision authority](docs/decision-authority.md), [setup notes](docs/setup.md), and [the SDK/API reference](docs/sdk-reference.md).
