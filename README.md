# AXON // The Decision Engine

<p align="center">
  <img src="assets/animation.svg" alt="AXON Decision Engine Animation" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Gemini_AI-818CF8?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firestore" />
  <img src="https://img.shields.io/badge/Bilingual-EN%20%7C%20AR-059669?style=for-the-badge" alt="Bilingual" />
</p>

> **"Can you build an AI system that knows when it is allowed to act?"**  
> — *DOO Builders League Challenge: The Decision Engine*

## Overview

**AXON** is an operational decision safety engine. It acts as an external policy verification layer for autonomous AI agents (such as Cursor, Claude Code, and Antigravity) and automated infrastructure pipelines.

Rather than offering conversational interfaces, AXON serves a single purpose: **deterministic action verification**. Gemini can interpret bounded action language and supplied evidence, but the server-owned deterministic kernel decides if the system should proceed.

### Why AXON Matters
Modern AI agents have powerful capabilities to write code, install dependencies, and run terminal commands. However, they lack institutional awareness. They do not naturally know if a specific package is forbidden by your company's security policy, or if modifying a database schema requires senior engineering review. 

By offloading authorization logic to AXON, your agents remain decoupled from corporate governance rules, while AXON maintains an objective verification record. 

## ⚡️ Core Capabilities

- **Multi-Format Policy Ingestion Pipeline:** Non-technical managers and security teams can directly upload their company's official security handbooks or structured exports (`.json`, `.pdf`, `.txt`, `.md`, `.html`). AXON will automatically extract, structure, and stage the security rules for human review before enforcing them, using Gemini's native document comprehension capabilities.
- **Agent Integration (SDK):** Seamless integration with AI workflows via minimal SDKs and pre-built skills for Antigravity, Cursor, and Claude Code.
- **Bounded Gemini Interpretation:** Structures natural-language intent and evidence without granting the model decision or policy authority.
- **Server-Owned Audit Trail:** Persists the normalized request, signals, policy hash, outcome hash, and append-only review events before returning a decision.
- **Bilingual Reasoning:** Generates objective analyses and reasoning in both English and native Arabic.
- **Three-domain scenario runner:** Demonstrates code deployment, refund approval, and support-ticket triage through the same server decision kernel.

## The Decision Output

Every request sent to AXON yields one of five canonical states, along with technical reasoning, integrity metadata, and mitigation strategies:
- `EXECUTE`: Deterministic policy evaluation permits the action.
- `ASK`: Requester-owned information is missing.
- `DEFER`: Evidence or timing is stale, conflicting, or unavailable.
- `ESCALATE`: A legitimate human review boundary is required.
- `REFUSE`: A hard policy prohibits the action.

Legacy clients still receive `ALLOW`, `DENY`, `NEEDS_CLARIFICATION`, and `ESCALATE_TO_HUMAN` projections.

---

## 🧭 Demo Path

To quickly evaluate the core Decision Engine, follow these steps:
1. **Open the Workspace:** Launch the local server and navigate to `http://localhost:3000`.
2. **Choose a domain:** Use the focused selector for Code Deployment, Refund Approval, or Support Ticket Triage, then choose one of its five typed fixtures.
3. **Compare boundaries:** The fixture catalog demonstrates `EXECUTE`, `ASK`, `DEFER`, `ESCALATE`, and `REFUSE` without selecting outcomes by scenario ID.
4. **Inspect the trace:** Each run displays the canonical outcome, risk/completeness, reversibility, blast radius, cost of wrong, missing information, matched policies, evidence, advisory status, and audit event ID.
5. **Review escalations:** `ESCALATE` scenarios appear in the real Review Queue and can only be approved or rejected through the append-only review API.

The deliberately difficult `refund-stale-conflicting` fixture models order `4815` and a €4,800 refund with stale payment evidence, contradictory fraud evidence, three prior chargebacks, and missing finance approval. It safely returns `ESCALATE`; it never executes a payout.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js 18+
- npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/obadadallo95/axon-decision-engine.git
cd axon-decision-engine

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | No | Enables bounded Gemini interpretation; deterministic decisions remain available without it. |
| `AXON_API_KEY` | No | Optional static Bearer token. Secures the `/api/decide` route for external SDK/Agent integration. |

### Launch the Engine
```bash
npm run dev
```
The AXON UI dashboard and the `/api/decide` kernel are now live at `http://localhost:3000`.

---

## 💻 Developer Integrations

AXON is built to be integrated directly into your existing AI workflows. We provide a native SDK, raw API access, and drop-in integration skills for leading AI IDEs and agents.

### 1. API Usage
Use a registered scenario to exercise the server-owned policy boundary. For structured `/api/decide` requests, supply the full typed domain parameters described in [Decision authority](docs/decision-authority.md); caller-supplied `policies` are rejected.

```bash
curl -X POST http://localhost:3000/api/scenarios/run \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"deploy-safe-release"}'
```

**Example JSON Response:**
```json
{
  "decision": "ALLOW",
  "state": "EXECUTE",
  "authoritativeDecision": { "state": "EXECUTE", "authoritative": "deterministic" },
  "auditEventId": "decision_...",
  "idempotencyKey": "request_...",
  "replayed": false,
  "integrity": { "inputHash": "...", "signalsHash": "...", "policyHash": "...", "outcomeHash": "...", "advisoryHash": "...", "eventHash": "..." }
}
```

### 2. TypeScript SDK
The SDK currently sends the legacy prose payload. It remains compatible for interpretation, but cannot authorize execution: unresolved policy coverage returns `DEFER` (or a stronger blocker).

```typescript
import { axon } from './lib/axon-sdk';

const result = await axon.evaluateAction({
  prompt: "Drop the users table from the staging database"
});

if (result.decision === 'ALLOW') {
  // Execute database drop
} else {
  console.warn(`Action blocked: ${result.reasonEn}`);
  // Handle DENY, ESCALATE, or CLARIFY
}
```

### 3. Agent Integration Skills
We provide pre-configured rules to instantly inject AXON policy awareness into popular developer tools.

#### Cursor IDE
Forces Cursor's Composer to consult AXON before applying codebase refactors.
1. Create a `.cursor/rules` directory in your target project.
2. Copy the AXON rule:
   ```bash
   cp .cursor/rules/axon-decision.mdc /path/to/your/project/.cursor/rules/
   ```

#### Claude Code
Binds AXON to Claude Code's terminal execution layer.
1. Ensure your target project is initialized with Claude Code.
2. Copy the AXON skill:
   ```bash
   mkdir -p /path/to/your/project/.claude/skills/axon-decision
   cp .claude/skills/axon-decision/SKILL.md /path/to/your/project/.claude/skills/axon-decision/
   ```

#### Antigravity
Enforces policy-compliant execution for Antigravity autonomous agents.
1. Ensure your target project uses Antigravity.
2. Copy the AXON skill:
   ```bash
   mkdir -p /path/to/your/project/.agents/skills/axon-decision-engine
   cp .agents/skills/axon-decision-engine/SKILL.md /path/to/your/project/.agents/skills/axon-decision-engine/
   ```

---

## 📂 Project Structure Overview

- `app/api/decide/route.ts`: Thin decision API preserving legacy fields while calling the server decision service.
- `app/api/audit/route.ts`: Server-owned audit read endpoint.
- `app/api/review/route.ts`: Strict append-only review endpoint for ESCALATE decisions.
- `app/api/scenarios/route.ts`: Read-only metadata catalog for the three demo domains.
- `app/api/scenarios/run/route.ts`: Loads a fixture, adapts it to `DecisionRequest`, and runs the normal decision/audit workflow.
- `server/decision-service.ts`: Validation, idempotency, bounded advisory orchestration, deterministic evaluation, and audit persistence.
- `server/audit-repository.ts`: Process-local server-owned demo repository with atomic idempotency/review behavior.
- `server/hash.ts`: Stable canonical JSON and SHA-256 artifact hashing.
- `lib/domains/`: Strict domain schemas, adapters, policies, evidence, and scenario fixtures.
- `app/page.tsx`: The localized (EN/AR), real-time visualization and simulation dashboard.
- `lib/axon-sdk.ts`: The minimal TypeScript SDK for external consumption.
- `lib/firestore-service.ts`: Browser read adapter for server audit data and existing policy display storage; it cannot create authoritative decision records.
- `.cursor/rules/`: Cursor IDE integration assets.
- `.claude/skills/`: Claude Code integration assets.
- `.agents/skills/`: Antigravity integration assets.

---

## 📚 Documentation

For deep-dive technical details, explore the documentation:
- [System Architecture](docs/architecture.md)
- [SDK & API Reference](docs/sdk-reference.md)
- [Decision authority and evidence requirements](docs/decision-authority.md)
- [Complete Setup Guide](docs/setup.md)
- [Detailed File Structure](docs/file-structure.md)
- [Product Roadmap](docs/roadmap.md)

The scenario API is documented with examples in [SDK & API Reference](docs/sdk-reference.md).

---

## License & Compliance
AXON is an advisory decision-support system. While it evaluates operational safety risks, its recommendations do not constitute formal legal or regulatory advice. Always maintain Human-in-the-Loop clearance for tier-0 production modifications.

### Audit and review behavior

Structured requests may include an `idempotencyKey`. Reusing it with the same normalized request and policy set returns the original audit identity; reusing it with different input or policies returns `IDEMPOTENCY_CONFLICT`. Legacy requests without a key receive a request-scoped compatibility key and are not replay-deduplicated across calls.

The `/api/decide` workflow writes the server-owned audit record before returning. A failed audit write prevents normal `EXECUTE` authorization and returns `AUDIT_WRITE_FAILED`; a `REFUSE` remains `REFUSE` while exposing the failure. `/api/review` appends an `APPROVE` or `REJECT` event only to an `ESCALATE` decision. It never mutates the original decision, and hard `REFUSE` cannot be approved.

The current repository is demo-grade process-local memory. It is server-owned and has no browser localStorage fallback for decisions, but it is not durable across restarts or horizontally scaled instances. A transactional server-side Firestore adapter is a later deployment concern.

Developed by **Obada Dallo**.
