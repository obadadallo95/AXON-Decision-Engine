# SDK & API Reference

AXON provides both a REST API and a native TypeScript SDK, allowing you to wrap critical infrastructure scripts or agent execution loops in policy-aware guardrails.

---

## 1. The Core API

**Endpoint**: `POST /api/decide`  
**Auth**: `Bearer <AXON_API_KEY>` (Optional if disabled)

### Request Payload (`application/json`)
```typescript
interface DecisionRequest {
  prompt: string;                      // The action to execute (e.g. "npm install lodash")
  idempotencyKey?: string;             // Replays the same audit identity for the same normalized input
  context?: Record<string, any>;       // Optional: Contextual metadata (environment, user, etc.)
  policies?: SecurityPolicy[];         // Optional: Dynamic policies. If omitted, uses global policies.
}
```

### Response Payload (`application/json`)
```typescript
interface DecisionResult {
  decision: 'ALLOW' | 'DENY' | 'NEEDS_CLARIFICATION' | 'ESCALATE_TO_HUMAN';
  state: 'EXECUTE' | 'ASK' | 'DEFER' | 'ESCALATE' | 'REFUSE';
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

The legacy payload is compatibility-oriented. Structured callers should include a stable `requestId`, full typed context, and an `idempotencyKey`; the response's `authoritativeDecision` and integrity metadata are the server-owned result. Gemini interpretation is advisory only. `POST /api/review` and `GET /api/audit` expose the append-only review trail and audit history.

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

## 2. TypeScript SDK

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

    switch(result.decision) {
      case 'ALLOW':
        console.log("AXON Approved.");
        return runCommand(command);
        
      case 'ESCALATE_TO_HUMAN':
        console.log(`AXON Flag: Human intervention required. Reason: ${result.reasonEn}`);
        return requestHumanApproval();
        
      case 'NEEDS_CLARIFICATION':
        console.log(`AXON Prompt: ${result.mitigationEn}`);
        return requestAgentRefinement();
        
      case 'DENY':
        throw new Error(`AXON Blocked: ${result.reasonEn}`);
    }
  } catch (err) {
    console.error("Failed to verify action with AXON", err);
    throw err;
  }
}
```

---

## 3. Agent Integration Skills

Rather than using the SDK programmatically, you can inject AXON directly into the "system prompt" or "skill context" of AI Agents. 

We provide the following drag-and-drop skills in the root of the repository:

### Cursor IDE (`.cursor/rules/axon-decision.mdc`)
Cursor Rules instruct the AI editor. By placing `axon-decision.mdc` in your target project's `.cursor/rules/` directory, Cursor's Composer will automatically `curl` your AXON endpoint to verify architectural refactors before applying them.

### Claude Code (`.claude/skills/axon-decision/SKILL.md`)
Claude Code skills grant the CLI agent new capabilities. Placing this file in your target project's `.claude/skills/` directory instructs Claude to consult AXON before making filesystem changes.

### Antigravity (`.agents/skills/axon-decision-engine/SKILL.md`)
Antigravity utilizes YAML-frontmatter markdown skills. By deploying this skill to `.agents/skills/`, Antigravity gains the `evaluate_action` directive, acting as a mandatory organizational safeguard.
