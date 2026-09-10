# SDK & API Reference

AXON provides a REST decision API and a source TypeScript client in this repository. There is no published npm package in the challenge prototype.

---

## 1. The Core API

**Endpoint**: `POST /api/decide`  
**Auth**: `Bearer <AXON_API_KEY>` (Optional if disabled)

### Legacy Request Payload (`application/json`)
```typescript
interface DecisionRequest {
  prompt: string;                      // The action to execute (e.g. "npm install lodash")
  idempotencyKey?: string;             // Replays the same audit identity for the same normalized input
  context?: Record<string, any>;       // Optional: Contextual metadata (environment, user, etc.)
  policies?: SecurityPolicy[];         // Legacy prose only; never executable policy authority.
}
```

### Response Payload (`application/json`)
```typescript
interface DecisionResult {
  state: 'EXECUTE' | 'ASK' | 'DEFER' | 'ESCALATE' | 'REFUSE';
  decision?: 'ALLOW' | 'DENY' | 'NEEDS_CLARIFICATION' | 'ESCALATE_TO_HUMAN'; // compatibility projection
  authoritativeDecision: { state: DecisionResult['state']; /* plus deterministic outcome fields */ };
  auditEventId: string | null;
  idempotencyKey: string;
  replayed: boolean;
  integrity: {
    inputHash: string;
    signalsHash: string;
    policyHash: string;
    outcomeHash: string;
    advisoryHash: string;
    eventHash: string | null;
  };
  riskScore: number;           // 0-100 score indicating calculated risk severity
  reasonEn: string;            // English explanation of the ruling
  reasonAr: string;            // Arabic explanation of the ruling
  mitigationEn: string;        // Suggested next steps in English
  mitigationAr: string;        // Suggested next steps in Arabic
  groundingEn: string;         // Advisory/evidence status; not an authority signal
  groundingAr: string;         // Advisory/evidence status in Arabic
  citations: string[];         // Legacy field; current bounded provider does not add web citations
}
```

The legacy payload is compatibility-oriented and cannot authorize execution, even with favorable advisory output or prose policies. It returns `DEFER` for unresolved coverage unless a stronger blocker applies. Structured callers should include a stable `requestId`, full typed context, and an `idempotencyKey`; the canonical `state`, `decisionTrace`, and integrity metadata are the server-owned result. Gemini interpretation is advisory only. `POST /api/review` and `GET /api/audit` expose the append-only review trail and audit history.

Structured requests accept `action`, full typed `context`, `requestId`, optional `idempotencyKey`, and optional `policySetId` (a registered domain or current version). The server validates domain parameters and resolves its own rules. A `policies` property in structured input returns HTTP 400 `CALLER_POLICY_AUTHORITY_NOT_ALLOWED`. Unknown domains, invalid domain coverage, or mismatched selectors cannot execute. See [Decision authority](decision-authority.md) for schemas, evidence requirements, and outage behavior.

### Multi-domain scenario API

The demo layer exposes three real challenge domains through the same kernel:

- `code-deployment`: signed artifacts, release checks, freeze windows, change tickets, and production approvals.
- `refund-approval`: order identity, payment status, refund thresholds, duplicate payouts, fraud signals, and finance approval.
- `support-ticket-triage`: ticket/tenant context, severity, routing availability, authorization, and security review.

`GET /api/scenarios` returns metadata without fixture internals. `POST /api/scenarios/run` accepts `{ "scenarioId": "..." }` and returns the actual decision response plus `scenario`, `evidence`, `policyCodes`, `policyVersion`, `expectedState`, `expectedStateMatches`, and `auditEventId`.

```bash
curl -X POST http://localhost:3000/api/scenarios/run \
  -H "Content-Type: application/json" \
  -d '{"scenarioId":"deploy-human-approval"}'
```

The scenario's `expectedState` is demo validation metadata only. It is not read by the policy kernel and cannot select an outcome. `ESCALATE` results enter the normal append-only review flow; other states do not expose approval shortcuts. The `refund-stale-conflicting` fixture is intentionally safe: it models a €4,800 refund for order `4815` with stale/conflicting evidence, three chargebacks, and missing approval, and must never execute.

---

## 2. Source TypeScript client

The `lib/axon-sdk.ts` file exports an `AxonDecisionEngine` class and a pre-instantiated `axon` singleton. It provides robust error handling, typed responses, and environment-aware endpoint resolution.

### Quickstart Example

```typescript
import { axon, DecisionRequest } from './lib/axon-sdk';

async function executeAgentCommand(command: string) {
  const request: DecisionRequest = {
    prompt: `Execute terminal command: ${command}`,
    context: {
      environment: 'production',
      userRole: 'autonomous-agent'
    }
  };

  try {
    const result = await axon.evaluateAction(request);

    switch(result.state) {
      case 'EXECUTE':
        console.log("AXON returned EXECUTE.");
        return runCommand(command);
        
      case 'ESCALATE':
        console.log(`AXON requires human authority. Reason: ${result.reasonEn}`);
        return requestHumanApproval();
        
      case 'ASK':
        console.log(`AXON Prompt: ${result.mitigationEn}`);
        return requestAgentRefinement();
        
      case 'DEFER':
        console.log(`AXON is waiting for changed conditions. Reason: ${result.reasonEn}`);
        return requestAgentRefinement();

      case 'REFUSE':
        throw new Error(`AXON Blocked: ${result.reasonEn}`);
    }
  } catch (err) {
    console.error("Failed to verify action with AXON", err);
    throw err;
  }
}
```

---

## 3. Integrations deferred

Cursor, Claude Code, Antigravity, MCP, shell gateways, and real execution adapters are intentionally deferred until after the challenge submission. The repository contains development notes for those future surfaces, but they are not part of the 90-second demo or a claim of an operational integration.
