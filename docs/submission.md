# Challenge Submission Notes

## Core idea

AXON is a server-owned decision boundary for AI-proposed actions. It exists so a capable model can propose and explain an action without silently becoming the authority that permits it. AXON evaluates explicit context, evidence, and policy, then records the result before an external system could act.

## How it works

```text
Proposed Action + Context
→ Validation / Normalization
→ Explicit Signals
→ Bounded Gemini Interpretation
→ Reconciliation
→ Server-Owned Policy Authority
→ EXECUTE / ASK / DEFER / ESCALATE / REFUSE
→ Audit
```

Gemini reasons. AXON authorizes. Gemini is optional and cannot clear deterministic blockers.

## Three domains

- Code Deployment
- Refund Approval
- Support Ticket Triage

Each domain has five typed scenarios, for fifteen total.

## Deliberate failure test

The `refund-stale-conflicting` fixture proposes a €4,800 refund for order 4815. It contains stale payment evidence, conflicting fraud evidence, three previous chargebacks, missing finance approval, an irreversible/high-impact action, and critical cost of wrong. AXON returns `ESCALATE`. The demo exposes the signals and audit record; it does not execute a real refund.

## Key engineering decisions

- Intelligence and authority are separate layers.
- Server-owned policy sets, not caller rules, grant decision authority.
- Explicit safety facts and evidence conditions dominate model inference.
- Missing facts, temporary blockers, human authority, and prohibition map to distinct states.
- Audit is created before a normal decision is returned.
- Model outages cannot create authorization.

## Intentionally out of scope

Real refunds, deployments, or tool execution; verified external evidence acquisition; production identity/RBAC; durable multi-instance audit storage; a published SDK/package; and production Codex, Claude, MCP, or agent integrations.

## Limitations

Evidence is synthetic, reviewer identity is simulated, audit storage is process-local, and execution remains outside AXON. The optional Gemini advisory depends on the configured provider and model.

## AI tools used

- Runtime: Google Gemini, bounded optional advisory interpretation only.
- Development/evaluation: OpenAI Codex assisted repository implementation, testing, and submission packaging.

No other tool is claimed as used by this repository’s submission record.

## Integration position

```text
Agent → proposes action → AXON decision API → integration/execution gateway
                                      → tool executes only when state = EXECUTE
```

The gateway must enforce the decision. The current challenge build evaluates and records decisions; it does not intercept Codex, Claude, or real tools.
