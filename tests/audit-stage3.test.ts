import { afterEach, describe, expect, it } from "vitest";
import {
  AdvisoryInterpretationSchema,
  evaluateDecision,
} from "@/lib/axon-core";
import type {
  AdvisoryInterpretation,
  DecisionRequest,
  PolicyRule,
} from "@/lib/axon-core";
import { POST as reviewPost } from "@/app/api/review/route";
import { InMemoryAuditRepository } from "@/server/audit-repository";
import type { AdvisoryProvider } from "@/server/advisory-provider";
import { DecisionService } from "@/server/decision-service";
import { hashObject } from "@/server/hash";

const request = (overrides: Partial<DecisionRequest> = {}): DecisionRequest => ({
  requestId: "req-audit-001",
  action: {
    domain: "deployment",
    operation: "publish-canary",
    target: "staging/checkout",
    parameters: {},
  },
  context: {
    environment: "staging",
    actor: { id: "operator-001", role: "operator" },
    approvals: [],
    requiredApprovals: [],
    requiredFacts: [],
    reversibility: "reversible",
    blastRadius: "low",
    costOfWrong: "low",
    requestedAt: "2026-09-10T10:00:00.000Z",
    additionalFacts: {},
    evidence: { stale: false, conflicting: false },
    evidenceItems: [],
  },
  ...overrides,
});

function advisory(): AdvisoryInterpretation {
  const provenance = {
    source: "model_inference" as const,
    confidence: 0.9,
    rationale: "The bounded action data supports this interpretation.",
    supportingEvidenceIds: [],
  };
  return AdvisoryInterpretationSchema.parse({
    provider: "gemini",
    model: "gemini-test",
    status: "success",
    interpretationConfidence: 0.9,
    inferredSignals: {
      normalizedAction: { value: "publish a canary", provenance },
      inferredDomain: { value: "deployment", provenance },
      inferredOperation: { value: "publish-canary", provenance },
      inferredTarget: { value: "staging/checkout", provenance },
      inferredEnvironment: { value: "staging", provenance },
      destructive: { value: false, provenance },
      privileged: { value: false, provenance },
      externallyVisible: { value: false, provenance },
      inferredReversibility: { value: "reversible", provenance },
      inferredBlastRadius: { value: "low", provenance },
      inferredCostOfWrong: { value: "low", provenance },
    },
    missingInformation: [],
    ambiguities: [],
    conflictingFacts: [],
    evidenceAssessment: [],
    saferAlternatives: [],
    reasoningSummary: "Bounded test advisory.",
    unknownEvidenceIds: [],
  });
}

function providerFor(
  value: AdvisoryInterpretation = advisory(),
  calls: { count: number } = { count: 0 },
): AdvisoryProvider {
  return {
    interpret: async () => {
      calls.count += 1;
      return value;
    },
  };
}

function serviceFor(
  repository: InMemoryAuditRepository,
  value?: AdvisoryInterpretation,
  calls?: { count: number },
) {
  return new DecisionService({
    repository,
    advisoryProvider: providerFor(value, calls),
    now: () => "2026-09-10T10:00:00.000Z",
    randomId: () => "legacy-test-key",
  });
}

const hardRefuse: PolicyRule = {
  code: "BLOCK-001",
  description: "Prohibited actions cannot execute.",
  priority: 100,
  enabled: true,
  hard: true,
  effect: "REFUSE",
  conditions: [
    {
      field: "action.parameters.prohibited",
      operator: "equals",
      value: true,
    },
  ],
};

const reviewableRequest = request({
  context: {
    ...request().context,
    requiredApprovals: ["security-review"],
  },
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_ADVISORY_MODEL;
});

describe("Stage 3 server-owned audit workflow", () => {
  it("creates an authoritative server audit record for a decision", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: request(),
      policies: [],
      idempotencyKey: "idem-create-001",
    });

    expect(result.auditEventId).toBeTruthy();
    expect(result.auditRecord?.eventType).toBe("DECISION");
    expect(result.auditRecord?.authoritativeOutcome.state).toBe("EXECUTE");
  });

  it("stores the normalized request in the audit record", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: request({ action: { ...request().action, domain: " DEPLOYMENT " } }),
      policies: [],
      idempotencyKey: "idem-normalized-001",
    });

    expect(result.auditRecord?.normalizedRequest.action.domain).toBe("deployment");
    expect(result.integrity.inputHash).toBe(hashObject(result.auditRecord?.normalizedRequest));
  });

  it("stores both explicit and reconciled signals", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: request(),
      policies: [],
      idempotencyKey: "idem-signals-001",
    });

    expect(result.auditRecord?.explicitSignals).toBeDefined();
    expect(result.auditRecord?.reconciledSignals).toEqual(result.auditRecord?.explicitSignals);
  });

  it("stores a deterministic policy set hash and policy codes", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: request(),
      policies: [hardRefuse],
      idempotencyKey: "idem-policy-001",
      policyVersion: "policy-demo-v1",
    });

    expect(result.auditRecord?.policyAuthority.codes).toEqual(["BLOCK-001"]);
    expect(result.auditRecord?.policyAuthority.version).toBe("policy-demo-v1");
    expect(result.auditRecord?.policyAuthority.hash).toHaveLength(64);
  });

  it("stores an outcome hash linked to the authoritative outcome", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: request(),
      policies: [],
      idempotencyKey: "idem-outcome-001",
    });

    expect(result.auditRecord?.integrity.outcomeHash).toBe(
      hashObject(result.auditRecord?.authoritativeOutcome),
    );
    expect(result.auditRecord?.integrity.eventHash).toHaveLength(64);
  });

  it("returns the same authoritative record for the same idempotency key and input", async () => {
    const repository = new InMemoryAuditRepository();
    const calls = { count: 0 };
    const service = serviceFor(repository, advisory(), calls);
    const first = await service.decide({ request: request(), policies: [], idempotencyKey: "idem-replay-001" });
    const second = await service.decide({ request: request(), policies: [], idempotencyKey: "idem-replay-001" });

    expect(second.replayed).toBe(true);
    expect(second.auditEventId).toBe(first.auditEventId);
    expect(second.integrity).toEqual(first.integrity);
    expect(calls.count).toBe(1);
  });

  it("rejects the same idempotency key for different normalized input", async () => {
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    await service.decide({ request: request(), policies: [], idempotencyKey: "idem-conflict-001" });

    await expect(
      service.decide({
        request: request({ action: { ...request().action, operation: "delete-records" } }),
        policies: [],
        idempotencyKey: "idem-conflict-001",
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("includes legacy policy summaries in the idempotency policy fingerprint", async () => {
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    await service.decide({
      request: request(),
      policies: [],
      idempotencyKey: "idem-legacy-policy-conflict-001",
      legacy: true,
      policySummaries: [{ code: "LEGACY-1", description: "Original summary." }],
    });

    await expect(
      service.decide({
        request: request(),
        policies: [],
        idempotencyKey: "idem-legacy-policy-conflict-001",
        legacy: true,
        policySummaries: [{ code: "LEGACY-1", description: "Changed summary." }],
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("does not create a second authoritative event on replay", async () => {
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    await service.decide({ request: request(), policies: [], idempotencyKey: "idem-single-event-001" });
    await service.decide({ request: request(), policies: [], idempotencyKey: "idem-single-event-001" });

    expect(await repository.listRecentAuditRecords()).toHaveLength(1);
  });

  it("prevents normal EXECUTE authorization when audit persistence is unavailable", async () => {
    const repository = new InMemoryAuditRepository({ available: false });
    const result = await serviceFor(repository).decide({
      request: request(),
      policies: [],
      idempotencyKey: "idem-audit-failure-001",
    });

    expect(result.outcome.state).toBe("DEFER");
    expect(result.outcome.failureState).toBe("AUDIT_WRITE_FAILED");
    expect(result.auditEventId).toBeNull();
  });

  it("keeps REFUSE authoritative when audit persistence fails", async () => {
    const repository = new InMemoryAuditRepository({ available: false });
    const result = await serviceFor(repository).decide({
      request: request({ action: { ...request().action, parameters: { prohibited: true } } }),
      policies: [hardRefuse],
      idempotencyKey: "idem-refuse-audit-failure-001",
    });

    expect(result.outcome.state).toBe("REFUSE");
    expect(result.outcome.failureState).toBe("AUDIT_WRITE_FAILED");
  });

  it("appends an APPROVE review event only for ESCALATE", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: reviewableRequest,
      policies: [],
      idempotencyKey: "idem-review-approve-001",
    });
    const review = await repository.appendReviewEvent({
      requestId: result.request.requestId,
      decisionEventId: result.auditEventId!,
      reviewer: { id: "reviewer-001", role: "reviewer" },
      action: "APPROVE",
      reason: "Reviewed the escalation context.",
      timestamp: "2026-09-10T10:01:00.000Z",
    });

    expect(review.action).toBe("APPROVE");
    expect(review.parentDecisionEventId).toBe(result.auditEventId);
    expect(review.previousEventHash).toBe(result.integrity.eventHash);
  });

  it("appends a REJECT review event only for ESCALATE", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: reviewableRequest,
      policies: [],
      idempotencyKey: "idem-review-reject-001",
    });
    const review = await repository.appendReviewEvent({
      requestId: result.request.requestId,
      decisionEventId: result.auditEventId!,
      reviewer: { id: "reviewer-001", role: "reviewer" },
      action: "REJECT",
      reason: "The requested change is not justified.",
      timestamp: "2026-09-10T10:02:00.000Z",
    });

    expect(review.action).toBe("REJECT");
  });

  it("does not allow review approval to override REFUSE", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: request({ action: { ...request().action, parameters: { prohibited: true } } }),
      policies: [hardRefuse],
      idempotencyKey: "idem-review-refuse-001",
    });

    await expect(
      repository.appendReviewEvent({
        requestId: result.request.requestId,
        decisionEventId: result.auditEventId!,
        reviewer: { id: "reviewer-001", role: "reviewer" },
        action: "APPROVE",
        reason: "Attempted bypass.",
        timestamp: "2026-09-10T10:03:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "REVIEW_NOT_ALLOWED" });
  });

  it.each([
    ["EXECUTE", request()],
    ["ASK", request({ context: { ...request().context, requiredFacts: ["changeWindow"] } })],
    ["DEFER", request({ context: { ...request().context, evidence: { stale: true, conflicting: false } } })],
  ] as const)("rejects review approval for %s", async (_state, input) => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: input,
      policies: [],
      idempotencyKey: `idem-review-${_state.toLowerCase()}`,
    });
    expect(result.outcome.state).toBe(_state);

    await expect(
      repository.appendReviewEvent({
        requestId: result.request.requestId,
        decisionEventId: result.auditEventId!,
        reviewer: { id: "reviewer-001", role: "reviewer" },
        action: "APPROVE",
        reason: "Not semantically reviewable.",
        timestamp: "2026-09-10T10:04:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "REVIEW_NOT_ALLOWED" });
  });

  it("rejects duplicate approvals and preserves the first review", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: reviewableRequest,
      policies: [],
      idempotencyKey: "idem-review-duplicate-001",
    });
    const input = {
      requestId: result.request.requestId,
      decisionEventId: result.auditEventId!,
      reviewer: { id: "reviewer-001", role: "reviewer" },
      action: "APPROVE" as const,
      reason: "First review.",
      timestamp: "2026-09-10T10:05:00.000Z",
    };
    await repository.appendReviewEvent(input);
    await expect(repository.appendReviewEvent({ ...input, reason: "Replay." })).rejects.toMatchObject({
      code: "REVIEW_ALREADY_RECORDED",
    });
    expect((await repository.getDecisionAudit(result.request.requestId))?.reviews).toHaveLength(1);
  });

  it("lets the first concurrent review win and rejects the conflicting review", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: reviewableRequest,
      policies: [],
      idempotencyKey: "idem-review-race-001",
    });
    const base = {
      requestId: result.request.requestId,
      decisionEventId: result.auditEventId!,
      reviewer: { id: "reviewer-001", role: "reviewer" },
      reason: "Concurrent review.",
      timestamp: "2026-09-10T10:06:00.000Z",
    };
    const outcomes = await Promise.allSettled([
      repository.appendReviewEvent({ ...base, action: "APPROVE" }),
      repository.appendReviewEvent({ ...base, action: "REJECT" }),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "rejected")).toHaveLength(1);
    expect((await repository.getDecisionAudit(result.request.requestId))?.reviews).toHaveLength(1);
  });

  it("keeps the original decision unchanged after appending a review", async () => {
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: reviewableRequest,
      policies: [],
      idempotencyKey: "idem-review-immutable-001",
    });
    const originalHash = result.integrity.outcomeHash;
    await repository.appendReviewEvent({
      requestId: result.request.requestId,
      decisionEventId: result.auditEventId!,
      reviewer: { id: "reviewer-001", role: "reviewer" },
      action: "APPROVE",
      reason: "Review is separate from the decision.",
      timestamp: "2026-09-10T10:07:00.000Z",
    });
    const audit = await repository.getDecisionAudit(result.request.requestId);

    expect(audit?.decision.authoritativeOutcome.state).toBe("ESCALATE");
    expect(audit?.decision.integrity.outcomeHash).toBe(originalHash);
  });

  it("orders recent decision history and links review history to the parent hash", async () => {
    const repository = new InMemoryAuditRepository();
    const service = new DecisionService({
      repository,
      advisoryProvider: providerFor(),
      now: (() => {
        let index = 0;
        return () => `2026-09-10T10:0${index++}:00.000Z`;
      })(),
    });
    const first = await service.decide({ request: request({ requestId: "req-history-1", context: { ...request().context, requiredApprovals: ["security-review"] } }), policies: [], idempotencyKey: "idem-history-1" });
    await service.decide({ request: request({ requestId: "req-history-2", context: { ...request().context, requiredApprovals: ["security-review"] } }), policies: [], idempotencyKey: "idem-history-2" });
    const records = await repository.listRecentAuditRecords();

    expect(records.map((record) => record.requestId)).toEqual(["req-history-2", "req-history-1"]);
    const review = await repository.appendReviewEvent({
      requestId: first.request.requestId,
      decisionEventId: first.auditEventId!,
      reviewer: { id: "reviewer-001", role: "reviewer" },
      action: "APPROVE",
      reason: "Ordered review event.",
      timestamp: "2026-09-10T10:08:00.000Z",
    });
    expect(review.previousEventHash).toBe(first.integrity.eventHash);
    expect((await repository.getDecisionAudit(first.request.requestId))?.reviews).toEqual([review]);
  });

  it("produces deterministic hashes independent of object key order", () => {
    expect(hashObject({ b: 2, a: { d: false, c: true } })).toBe(
      hashObject({ a: { c: true, d: false }, b: 2 }),
    );
  });

  it("changes the input hash when normalized input changes", async () => {
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    const first = await service.decide({ request: request(), policies: [], idempotencyKey: "idem-hash-input-1" });
    const second = await service.decide({ request: request({ action: { ...request().action, operation: "read-status" } }), policies: [], idempotencyKey: "idem-hash-input-2" });

    expect(first.integrity.inputHash).not.toBe(second.integrity.inputHash);
  });

  it("changes the policy hash when the active policy set changes", async () => {
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    const first = await service.decide({ request: request(), policies: [], idempotencyKey: "idem-hash-policy-1" });
    const second = await service.decide({ request: request(), policies: [hardRefuse], idempotencyKey: "idem-hash-policy-2" });

    expect(first.integrity.policyHash).not.toBe(second.integrity.policyHash);
  });

  it("does not store API secrets in Gemini metadata", async () => {
    process.env.GEMINI_API_KEY = "super-secret-test-key";
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({ request: request(), policies: [], idempotencyKey: "idem-secret-001" });

    expect(JSON.stringify(result.auditRecord)).not.toContain("super-secret-test-key");
    expect(JSON.stringify(result.auditRecord?.model)).not.toContain("GEMINI_API_KEY");
  });

  it("returns an explicit missing-record error from the review API", async () => {
    const response = await reviewPost(
      new Request("http://localhost:3000/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: "missing-request",
          decisionEventId: "missing-event",
          action: "APPROVE",
          reviewer: { id: "reviewer-001", role: "reviewer" },
          reason: "Review a missing record.",
        }),
      }),
    );
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe("AUDIT_NOT_FOUND");
  });

  it("rejects malformed review payloads before repository access", async () => {
    const response = await reviewPost(
      new Request("http://localhost:3000/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      }),
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("INVALID_REVIEW_REQUEST");
  });

  it("retains deterministic Stage 1 semantics while recording the audit", () => {
    const outcome = evaluateDecision(request(), []);
    expect(outcome.state).toBe("EXECUTE");
    expect(outcome.authoritative).toBe("deterministic");
  });
});
