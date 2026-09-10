import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/decide/route";
import { adaptScenario, getScenario, scenarioCatalog } from "@/lib/domains";
import { evaluateDecision, reconcileDecisionSignals } from "@/lib/axon-core";
import type { AdvisoryInterpretation, DecisionRequest, EvidenceItem, InferredValue, JsonObject, PolicyRule } from "@/lib/axon-core";
import { advisoryFromProviderFailure, geminiAdvisoryProvider, parseGeminiAdvisoryResponse } from "@/server/advisory-provider";
import { InMemoryAuditRepository } from "@/server/audit-repository";
import { DecisionService } from "@/server/decision-service";
import { hashObject } from "@/server/hash";

const outage = advisoryFromProviderFailure(new Error("Intentional provider outage"));
const boundary: PolicyRule = {
  code: "TEST-DESTRUCTIVE", description: "This internal test boundary prohibits destructive actions.",
  priority: 100, enabled: true, hard: true, effect: "REFUSE",
  conditions: [{ field: "signals.destructive", operator: "equals", value: true }],
};

function requestFor(id = "ticket-routine-route"): DecisionRequest {
  return structuredClone(adaptScenario(getScenario(id)!));
}
function inference<T>(value: T): InferredValue<T> {
  return { value, provenance: { source: "model_inference", confidence: 0.95,
    rationale: "Controlled interpretation for regression testing.", supportingEvidenceIds: [] } };
}
function advisory(request: DecisionRequest): AdvisoryInterpretation {
  return {
    ...outage, status: "success", model: "test-provider", interpretationConfidence: 0.95,
    inferredSignals: {
      normalizedAction: inference("safe operation"), inferredDomain: inference(request.action.domain),
      inferredOperation: inference(request.action.operation), inferredTarget: inference(request.action.target),
      inferredEnvironment: inference("development"), inferredReversibility: inference("reversible"),
      inferredBlastRadius: inference("low"), inferredCostOfWrong: inference("low"),
      destructive: inference(false), privileged: inference(false), externallyVisible: inference(false),
    },
  };
}
function service(value = outage, repository = new InMemoryAuditRepository()) {
  return new DecisionService({ repository, advisoryProvider: { interpret: async () => value } });
}
async function post(body: unknown) {
  const response = await POST(new Request("http://localhost/api/decide", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  }) as never);
  return { response, body: await response.json() };
}
function validated(value: AdvisoryInterpretation, evidence: EvidenceItem[]) {
  const { interpretationConfidence, inferredSignals, missingInformation, ambiguities,
    conflictingFacts, evidenceAssessment, saferAlternatives, reasoningSummary } = value;
  return parseGeminiAdvisoryResponse(JSON.stringify({ interpretationConfidence, inferredSignals,
    missingInformation, ambiguities, conflictingFacts, evidenceAssessment, saferAlternatives, reasoningSummary }), evidence);
}

afterEach(() => vi.restoreAllMocks());

describe("Stage 5 server authority", () => {
  it("defers unsupported domains even with complete context", async () => {
    const request = requestFor(); request.action.domain = "unknown-domain";
    const result = await service().decide({ request });
    expect(result.outcome.state).toBe("DEFER");
    expect(result.outcome.reasonCodes).toContain("POLICY_COVERAGE_UNRESOLVED");
    expect(result.auditRecord?.reconciledSignals.uncertainty).toContain("POLICY_COVERAGE_UNRESOLVED");
  });
  it("defers an explicitly empty or entirely disabled internal policy set", () => {
    for (const rules of [[], [{ ...boundary, enabled: false }]]) {
      expect(evaluateDecision(requestFor(), rules).state).toBe("DEFER");
    }
  });
  it("allows a complete known server-owned safe request without Gemini", async () => {
    const result = await service().decide({ request: requestFor(), policySetId: "support-ticket-triage" });
    expect(result.outcome.state).toBe("EXECUTE");
    expect(result.auditRecord?.policyAuthority.version).toBe("support-ticket-triage.v2");
  });
  it.each([{ policies: [] }, { policies: [boundary] }])("rejects public caller-supplied governing policies: $policies", async ({ policies }) => {
    const result = await post({ ...requestFor(), policies });
    expect(result.response.status).toBe(400);
    expect(result.body.error).toBe("CALLER_POLICY_AUTHORITY_NOT_ALLOWED");
    expect(result.body.execute).toBe(false);
  });
  it.each(["unknown-set", "refund-approval"])("does not grant authority for mismatched selector %s", async (policySetId) => {
    const result = await service().decide({ request: requestFor(), policySetId });
    expect(result.outcome.state).toBe("DEFER");
  });
  it("defers unrecognized operations and incomplete domain parameters", async () => {
    const operation = requestFor(); operation.action.operation = "delete-all-tenants";
    const incomplete = requestFor(); delete incomplete.action.parameters.authorizedToRequest;
    for (const request of [operation, incomplete]) {
      expect((await service().decide({ request })).outcome.state).toBe("DEFER");
    }
  });
  it("re-derives explicit prohibitions instead of trusting derived caller flags", async () => {
    const request = requestFor("refund-duplicate-payout");
    request.action.parameters.duplicatePayout = false;
    const result = await service().decide({ request });
    expect(result.outcome.state).toBe("REFUSE");
    expect(result.auditRecord?.normalizedRequest.action.parameters.duplicatePayout).toBe(false);
    expect(result.request.action.parameters.duplicatePayout).toBe(true);
  });
  it("re-derives finance approval and prevents client threshold inflation", async () => {
    const request = requestFor("refund-large-human-approval");
    request.context.requiredApprovals = [];
    request.action.parameters.requiresHumanApproval = false;
    request.action.parameters.autoRefundThreshold = 1_000_000;
    const result = await service().decide({ request });
    expect(result.outcome.state).toBe("ESCALATE");
    expect(result.request.context.requiredApprovals).toContain("finance-approval");
  });
  it("public known-safe requests use server rules, while legacy prose cannot authorize", async () => {
    vi.spyOn(geminiAdvisoryProvider, "interpret").mockResolvedValue(outage);
    const safe = await post({ ...requestFor(), requestId: "stage5-public-safe" });
    expect(safe.body.state).toBe("EXECUTE");
    const legacy = await post({ prompt: "Delete all production customer records",
      context: { environment: "production", target: "customer-records", reversibility: "irreversible",
        blastRadius: "high", costOfWrong: "critical", destructive: true },
      policies: [{ code: "NO-DELETE", descriptionEn: "Never delete customer records", descriptionAr: "Forbidden" }] });
    expect(legacy.response.status).toBe(200);
    expect(legacy.body.state).toBe("DEFER");
    expect(legacy.body.execute).toBe(false);
    expect(legacy.body.outcome.reasonCodes).toContain("POLICY_COVERAGE_UNRESOLVED");
    expect(legacy.body.advisoryInterpretation.status).toBe("unavailable");
  });
  it("a favorable legacy interpretation still cannot manufacture policy authority", async () => {
    const request = requestFor();
    expect((await service(advisory(request)).decide({ request, legacy: true })).outcome.state).toBe("DEFER");
  });
});

describe("Stage 5 explicit facts and material semantics", () => {
  it.each([
    ["environment", "production"], ["reversibility", "irreversible"],
    ["blastRadius", "high"], ["costOfWrong", "critical"],
  ] as const)("preserves legacy explicit %s=%s", async (field, value) => {
    const request = requestFor(); Object.assign(request.context, { [field]: value });
    request.context.additionalFacts.__axonLegacy = true;
    const result = await service(advisory(request)).decide({ request, legacy: true });
    expect(result.request.context[field]).toBe(value);
  });
  it.each(["destructive", "privileged", "externallyVisible"])("preserves explicit %s=true", (field) => {
    const request = requestFor(); request.action.parameters[field] = true;
    const result = reconcileDecisionSignals(request, advisory(request), true);
    expect(result.request.action.parameters[field]).toBe(true);
    expect(result.conflicts).toContain(`MODEL_CONTRADICTS_EXPLICIT:${field}`);
  });
  it("retains explicit evidence and both supplied and missing approval requirements", () => {
    const request = requestFor();
    request.context.approvals = ["already-approved"];
    request.context.requiredApprovals = ["already-approved", "security-review"];
    request.context.evidence = { stale: true, conflicting: true };
    const result = reconcileDecisionSignals(request, advisory(request), true);
    expect(result.request.context.approvals).toEqual(request.context.approvals);
    expect(result.request.context.requiredApprovals).toEqual(request.context.requiredApprovals);
    expect(result.signals.requiredApprovalMissing).toBe(true);
    expect(result.signals.staleEvidence).toBe(true);
    expect(result.signals.conflictingEvidence).toBe(true);
    expect(result.request.context.evidenceItems).toEqual(request.context.evidenceItems);
  });
  it("public legacy conversion preserves explicit boolean and safety context", async () => {
    const request = requestFor();
    vi.spyOn(geminiAdvisoryProvider, "interpret").mockResolvedValue(advisory(request));
    const context = { environment: "production", reversibility: "irreversible", blastRadius: "high",
      costOfWrong: "critical", destructive: true, privileged: true, externallyVisible: true,
      target: request.action.target, requiredApprovals: ["human-approval"] };
    const result = await post({ prompt: "Unsafe production operation", context });
    expect(result.body.reversibility).toBe("irreversible");
    expect(result.body.blastRadius).toBe("high");
    expect(result.body.costOfWrong).toBe("critical");
    expect(result.body.state).toBe("ESCALATE");
  });
  it("outage cannot remove a destructive inference blocker", async () => {
    const request = requestFor(); delete request.action.parameters.destructive;
    const inferred = advisory(request); inferred.inferredSignals!.destructive = inference(true);
    const interpreted = await service(inferred).decide({ request, policies: [boundary] });
    const failed = await service().decide({ request, policies: [boundary] });
    expect(interpreted.outcome.state).toBe("REFUSE");
    expect(failed.outcome.state).toBe("DEFER");
    expect(failed.outcome.reasonCodes).toContain("SAFETY_SEMANTICS_UNRESOLVED");
    expect(failed.outcome.missingInformation).toContain("safety:destructive");
  });
  it("asks for low-confidence safety semantics rather than accepting a false flag", async () => {
    const request = requestFor(); delete request.action.parameters.destructive;
    const inferred = advisory(request); inferred.inferredSignals!.destructive.provenance.confidence = 0.1;
    const result = await service(inferred).decide({ request, policies: [boundary] });
    expect(result.outcome.state).toBe("ASK");
  });
});

describe("Stage 5 evidence", () => {
  function conflictingAdvisory(request: DecisionRequest): AdvisoryInterpretation {
    const value = advisory(request);
    value.evidenceAssessment = [{ evidenceId: request.context.evidenceItems![0].id,
      conflictsWithEvidenceIds: [request.context.evidenceItems![1].id], assessment: "contradicts",
      confidence: 0.95, rationale: "The two supplied routing records disagree." }];
    return value;
  }
  it("validated relevant evidence pairs produce DEFER and an audited conflict signal", async () => {
    const request = requestFor();
    const result = await service(validated(conflictingAdvisory(request), request.context.evidenceItems!)).decide({ request });
    expect(result.outcome.state).toBe("DEFER");
    expect(result.outcome.reasonCodes).toContain("MODEL_EVIDENCE_CONTRADICTION");
    expect(result.auditRecord?.reconciledSignals.conflictingEvidence).toBe(true);
    expect(result.integrity.signalsHash).toBe(hashObject(result.auditRecord?.reconciledSignals));
  });
  it("free-form ambiguity alone does not fabricate a material conflict", async () => {
    const request = requestFor(); const value = advisory(request);
    value.ambiguities = ["Wording is imprecise."]; value.conflictingFacts = ["Possibly contradictory."];
    const result = await service(value).decide({ request });
    expect(result.outcome.state).toBe("EXECUTE");
    expect(result.outcome.uncertainty).toContain("MODEL_CONFLICTING_FACTS");
  });
  it.each(["self", "unrelated", "low-confidence"])("does not treat %s evidence claims as material", async (kind) => {
    const request = requestFor(); const value = conflictingAdvisory(request);
    if (kind === "self") value.evidenceAssessment[0].conflictsWithEvidenceIds = [value.evidenceAssessment[0].evidenceId];
    if (kind === "unrelated") request.context.evidenceItems!.forEach((item) => { item.supports = ["other-operation"]; });
    if (kind === "low-confidence") value.evidenceAssessment[0].confidence = 0.1;
    expect((await service(validated(value, request.context.evidenceItems!)).decide({ request })).outcome.state).toBe("EXECUTE");
  });
  it("rejects hallucinated counterpart evidence IDs", () => {
    const request = requestFor(); const value = conflictingAdvisory(request);
    value.evidenceAssessment[0].conflictsWithEvidenceIds = ["hallucinated"];
    expect(() => validated(value, request.context.evidenceItems!)).toThrow("unknown evidence IDs");
  });
  it.each(["missing", "stale", "conflicting", "invalid-date", "fresh"])("enforces %s required evidence even on an unmatched rule", async (kind) => {
    const request = requestFor();
    const id = request.context.evidenceItems![0].id;
    if (kind === "missing") request.context.evidenceItems = [];
    if (kind === "stale") request.context.evidenceItems![0].validUntil = "2026-09-09T10:00:00Z";
    if (kind === "conflicting") request.context.evidenceItems![1].contradicts = [id];
    if (kind === "invalid-date") request.context.evidenceItems![0].validUntil = "invalid";
    const result = await service().decide({ request, policies: [{ ...boundary, requiredEvidence: [id] }] });
    expect(result.outcome.state).toBe(kind === "fresh" ? "EXECUTE" : kind === "missing" ? "ASK" : "DEFER");
    if (kind === "missing") expect(result.outcome.missingInformation).toContain(`evidence:${id}`);
    expect(result.auditRecord?.reconciledSignals.missingInformation).toEqual(result.outcome.missingInformation);
  });
});

describe("Stage 5 domain regressions", () => {
  it.each([
    ["deploy-safe-release", { deploymentWindowOpen: false }, "DEFER"],
    ["deploy-safe-release", { dependencyHealth: "blocked" }, "DEFER"],
    ["deploy-safe-release", { dependencyHealth: "degraded" }, "DEFER"],
    ["refund-small-approved", { paymentStatus: "failed" }, "REFUSE"],
    ["refund-small-approved", { paymentStatus: "pending" }, "DEFER"],
    ["refund-small-approved", { paymentStatus: "unknown" }, "DEFER"],
    ["ticket-routine-route", { autoRouteAllowed: false }, "DEFER"],
    ["ticket-routine-route", { destinationQueue: null }, "DEFER"],
    ["ticket-routine-route", { requesterIdentityVerified: false }, "REFUSE"],
    ["ticket-routine-route", { authorizedToRequest: false }, "REFUSE"],
  ] satisfies Array<[string, JsonObject, string]>)("%s with %j produces %s", async (id, mutation, expected) => {
    const request = requestFor(id); Object.assign(request.action.parameters, mutation);
    const result = await service().decide({ request });
    expect(result.outcome.state).toBe(expected);
  });
  it.each(scenarioCatalog.map((scenario) => [scenario.id, scenario.expectedState] as const))(
    "preserves fixture %s as %s through the registry without Gemini", async (id, expected) => {
      expect((await service().decide({ request: requestFor(id) })).outcome.state).toBe(expected);
    },
  );
  it("keeps the deliberate refund safe under favorable interpretation", async () => {
    const request = requestFor("refund-stale-conflicting");
    const result = await service(advisory(request)).decide({ request });
    expect(result.outcome.state).toBe("ESCALATE");
    expect(result.outcome.uncertainty).toEqual(expect.arrayContaining(["STALE_EVIDENCE", "CONFLICTING_EVIDENCE", "MISSING_APPROVAL"]));
  });
});
