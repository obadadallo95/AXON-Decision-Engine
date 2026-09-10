# Stage 5 decision authority

AXON distinguishes a known policy boundary that permits an action from an
absence of governance. No enabled policy coverage returns `DEFER` with
`POLICY_COVERAGE_UNRESOLVED`; it never creates permission. Within a known
boundary, complete safe requests can still `EXECUTE` without a matching blocker.

## Public structured requests

`POST /api/decide` accepts `requestId`, `action`, `context`, an optional
`idempotencyKey`, and an optional `policySetId`. It rejects caller-supplied
`policies`, including `[]`, with HTTP 400 `CALLER_POLICY_AUTHORITY_NOT_ALLOWED`.

`server/policy-registry.ts` resolves the three challenge domains. Select a domain
name or its current version: `code-deployment.v2`, `refund-approval.v2`, or
`support-ticket-triage.v2`. Omitting the selector resolves by `action.domain`.
Unknown selectors, mismatched domains/operations/targets, and incomplete domain
payloads have unresolved coverage and cannot execute.

Structured actions use the parameters produced by the existing domain adapters.
The registry validates domain facts against those schemas and runs the adapters
again. This prevents caller-supplied derived flags such as `duplicatePayout` or
`requiresHumanApproval`, and cleared `requiredApprovals`, from weakening the
boundary. The public refund threshold is capped at 500 currency units; a caller
may specify a stricter threshold. Required approvals/facts are combined with
explicit requirements, and explicit higher safety classifications are retained.

The simplest demonstration remains:

```bash
curl -X POST http://localhost:3000/api/scenarios/run \
  -H 'Content-Type: application/json' \
  -d '{"scenarioId":"deploy-safe-release"}'
```

The scenario route uses the same registry and DecisionService. Tests and trusted
in-process code may explicitly inject `PolicyRule[]` into DecisionService. This
is not a public API capability, and an empty injected set is also non-authorizing.

## Legacy prose input

The compatibility payload `{prompt, context, policies}` still accepts descriptive
policy summaries for advisory interpretation and audit. It is **non-authorizing**
in Stage 5, even if Gemini identifies a known domain. No free-text policy compiler
is implemented. Unresolved coverage produces `DEFER`, unless an existing stronger
state such as an explicit approval requirement produces `ESCALATE`.

Legacy four-state response projections remain for compatibility. Always use the
canonical `state` / `authoritativeDecision.state`: `DEFER` is not human review.

## Explicit facts and provider outages

Explicit environment, reversibility, blast radius, cost, boolean safety flags,
approvals, and evidence cannot be erased by model inference. Only the server's
legacy converter identifies genuinely omitted context fields for inference.
Structured evidence contributes freshness/conflict signals; it is not a mechanism
for replacing explicit facts with inferred prose.

A complete typed domain request remains evaluable without Gemini because the
server adapter establishes its material safety semantics. When an internal
request needs interpretation of missing destructive, privileged, or external
visibility semantics, provider unavailability returns `DEFER` with
`SAFETY_SEMANTICS_UNRESOLVED`. Unresolved low-confidence interpretation that the
requester can clarify produces `ASK`. Neither defaults to human escalation.

## Material evidence contradictions

An advisory assessment may supply `conflictsWithEvidenceIds`. A material conflict
requires `assessment: "contradicts"`, confidence at least 0.7, two distinct supplied
evidence IDs, and at least one item's `supports` naming the evaluated operation.
Unknown IDs invalidate the provider response. A validated material pair sets the
conflict signal, is recorded in the audit, and prevents `EXECUTE` (normally `DEFER`).
Free-form ambiguity or `conflictingFacts` alone cannot fabricate a blocking pair.

## Required evidence

`PolicyRule.requiredEvidence` names evidence **IDs**, not kinds or sources. Each
enabled rule's named evidence is a prerequisite of the active policy set, even
when that rule does not match; otherwise absent evidence could disable a blocker.
Missing IDs produce `ASK` and `evidence:<id>` in missing information. Existing but
expired, conflicting, duplicated, or invalidly dated required evidence produces
`DEFER` with `REQUIRED_EVIDENCE_UNAVAILABLE`. Disabled rules add no prerequisites.

## Narrow domain corrections

- Deployment: closed windows and non-healthy required dependencies produce DEFER.
  The existing freeze/exception rule remains separate.
- Refunds: pending/unknown payment state produces DEFER; failed payment is treated
  as not captured and produces REFUSE. Duplicate-payout prohibition remains.
- Tickets: explicitly disabled auto-routing or an unresolved destination waits
  with DEFER; missing intake facts remain ASK; explicitly unverified identity or
  unauthorized action produces REFUSE.

Precedence remains `REFUSE > ESCALATE > DEFER > ASK > EXECUTE`. Risk score alone
never selects a state. All fifteen scenario expectations are unchanged, including
the EUR 4,800 refund's ESCALATE outcome. Domain policy versions move to v2 because
their governing rules changed.

These are prototype decision guarantees, not verified external facts or real
execution. Synthetic evidence, simulated identity, process-local audit storage,
and execution outside AXON remain existing limitations. Stage 6 UI, deployment,
and dependency remediation are intentionally separate.
