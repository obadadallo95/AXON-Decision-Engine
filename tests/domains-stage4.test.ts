import { describe, expect, it } from "vitest";
import {
  DECISION_STATES,
  DecisionOutcomeSchema,
  EvidenceItemSchema,
} from "@/lib/axon-core";
import { GET as scenariosGet } from "@/app/api/scenarios/route";
import { POST as scenariosRunPost } from "@/app/api/scenarios/run/route";
import {
  adaptScenario,
  getScenario,
  scenarioCatalog,
} from "@/lib/domains";
import { advisoryFromProviderFailure } from "@/server/advisory-provider";
import { InMemoryAuditRepository } from "@/server/audit-repository";
import type { AdvisoryProvider } from "@/server/advisory-provider";
import { DecisionService, policyHash } from "@/server/decision-service";

function serviceFor(repository: InMemoryAuditRepository): DecisionService {
  const advisoryProvider: AdvisoryProvider = {
    interpret: async () =>
      advisoryFromProviderFailure(new Error("Gemini is intentionally unavailable in fixture tests.")),
  };
  return new DecisionService({
    repository,
    advisoryProvider,
    now: () => "2026-09-10T10:00:00.000Z",
    randomId: () => "stage4-test-id",
  });
}

describe("Stage 4 multi-domain scenario layer", () => {
  it("registers fifteen typed fixtures across the three challenge domains", () => {
    expect(scenarioCatalog).toHaveLength(15);
    expect(new Set(scenarioCatalog.map((scenario) => scenario.domain))).toEqual(
      new Set(["code-deployment", "refund-approval", "support-ticket-triage"]),
    );
    for (const scenario of scenarioCatalog) {
      expect(scenario.input).toBeDefined();
      expect(scenario.evidence.length).toBeGreaterThan(0);
      scenario.evidence.forEach((item) => expect(EvidenceItemSchema.parse(item)).toEqual(item));
      expect(scenario.policies.length).toBeGreaterThan(0);
    }
});
  it("routes every fixture through the same DecisionService and covers all canonical states", async () => {
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    const states = new Set<string>();

    for (const scenario of scenarioCatalog) {
      const result = await service.decide({
        request: adaptScenario(scenario),
        policies: scenario.policies,
        idempotencyKey: `fixture-${scenario.id}`,
        policyVersion: scenario.policyVersion,
      });
      states.add(result.outcome.state);
      expect(result.outcome.state).toBe(scenario.expectedState);
      expect(result.auditEventId).toBeTruthy();
      expect(result.auditRecord?.policyAuthority.version).toBe(scenario.policyVersion);
      expect(result.auditRecord?.policyAuthority.codes).toEqual(
        scenario.policies.map((policy) => policy.code).sort(),
      );
      expect(DecisionOutcomeSchema.parse(result.outcome)).toEqual(result.outcome);
    }

    expect(states).toEqual(new Set(DECISION_STATES));
    expect(await repository.listRecentAuditRecords()).toHaveLength(scenarioCatalog.length);
  });

  it("keeps the deliberate refund failure safe and fully auditable", async () => {
    const scenario = getScenario("refund-stale-conflicting");
    if (!scenario) throw new Error("Deliberate refund fixture is missing.");
    const repository = new InMemoryAuditRepository();
    const result = await serviceFor(repository).decide({
      request: adaptScenario(scenario),
      policies: scenario.policies,
      idempotencyKey: "fixture-refund-stale-conflicting",
      policyVersion: scenario.policyVersion,
    });

    expect(result.outcome.state).toBe("ESCALATE");
    expect(result.outcome.state).not.toBe("EXECUTE");
    expect(result.outcome.costOfWrong).toBe("critical");
    expect(result.outcome.matchedRuleCodes).toContain("FR-HUMAN-THRESHOLD");
    expect(result.outcome.uncertainty).toEqual(
      expect.arrayContaining(["STALE_EVIDENCE", "CONFLICTING_EVIDENCE", "MISSING_APPROVAL"]),
    );
    expect(result.auditRecord?.reconciledSignals.staleEvidence).toBe(true);
    expect(result.auditRecord?.reconciledSignals.conflictingEvidence).toBe(true);
    expect(result.auditRecord?.reconciledSignals.requiredApprovalMissing).toBe(true);
    expect(result.auditRecord?.normalizedRequest.action.parameters.refundAmount).toBe(4800);
    expect(result.auditRecord?.normalizedRequest.action.parameters.orderId).toBe("4815");
    expect(result.auditRecord?.normalizedRequest.context.evidenceItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "refund-4815-payment", validUntil: "2026-09-09T10:00:00.000Z" }),
        expect.objectContaining({ id: "refund-4815-fraud", contradicts: ["refund-4815-payment"] }),
      ]),
    );
  });

  it("does not turn a Gemini outage into execution for unsafe or incomplete fixtures", async () => {
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    const nonExecutable = scenarioCatalog.filter((scenario) => scenario.expectedState !== "EXECUTE");

    for (const scenario of nonExecutable) {
      const result = await service.decide({
        request: adaptScenario(scenario),
        policies: scenario.policies,
        idempotencyKey: `outage-${scenario.id}`,
        policyVersion: scenario.policyVersion,
      });
      expect(result.advisory.status).toBe("unavailable");
      expect(result.outcome.state).not.toBe("EXECUTE");
    }
  });

  it("preserves policy fingerprints for equivalent scenario adaptations", () => {
    const scenario = getScenario("deploy-safe-release");
    if (!scenario) throw new Error("Deployment fixture is missing.");
    const firstRequest = adaptScenario(scenario);
    const secondRequest = adaptScenario(scenario);
    expect(firstRequest).toEqual(secondRequest);
    expect(policyHash(scenario.policies)).toBe(policyHash([...scenario.policies].reverse()));
  });

  it("uses the append-only review flow for an ESCALATE scenario and rejects it for EXECUTE", async () => {
    const escalation = getScenario("refund-large-human-approval");
    const safe = getScenario("ticket-routine-route");
    if (!escalation || !safe) throw new Error("Review fixtures are missing.");
    const repository = new InMemoryAuditRepository();
    const service = serviceFor(repository);
    const escalationResult = await service.decide({
      request: adaptScenario(escalation),
      policies: escalation.policies,
      idempotencyKey: "review-refund-large",
      policyVersion: escalation.policyVersion,
    });
    const safeResult = await service.decide({
      request: adaptScenario(safe),
      policies: safe.policies,
      idempotencyKey: "review-ticket-safe",
      policyVersion: safe.policyVersion,
    });

    expect(escalationResult.outcome.state).toBe("ESCALATE");
    expect(safeResult.outcome.state).toBe("EXECUTE");
    const review = await repository.appendReviewEvent({
      requestId: escalationResult.request.requestId,
      decisionEventId: escalationResult.auditEventId ?? "",
      reviewer: { id: "reviewer-001", role: "governance-reviewer" },
      action: "APPROVE",
      reason: "Finance reviewed the refund request.",
      timestamp: "2026-09-10T10:05:00.000Z",
    });
    expect(review.parentDecisionEventId).toBe(escalationResult.auditEventId);
    await expect(
      repository.appendReviewEvent({
        requestId: safeResult.request.requestId,
        decisionEventId: safeResult.auditEventId ?? "",
        reviewer: { id: "reviewer-001", role: "governance-reviewer" },
        action: "APPROVE",
        reason: "This must not be an approval workflow.",
        timestamp: "2026-09-10T10:06:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "REVIEW_NOT_ALLOWED" });
  });

  it("serves metadata separately and returns the real deliberate scenario decision", async () => {
    const metadataResponse = await scenariosGet(
      new Request("http://localhost:3000/api/scenarios") as never,
    );
    const metadata = await metadataResponse.json();
    expect(metadataResponse.status).toBe(200);
    expect(metadata.scenarios).toHaveLength(15);
    expect(metadata.scenarios.every((scenario: { input?: unknown }) => !scenario.input)).toBe(true);

    const runResponse = await scenariosRunPost(
      new Request("http://localhost:3000/api/scenarios/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenarioId: "refund-stale-conflicting",
          idempotencyKey: "route-refund-stale-conflicting",
        }),
      }) as never,
    );
    const run = await runResponse.json();
    expect(runResponse.status).toBe(200);
    expect(run.scenario.id).toBe("refund-stale-conflicting");
    expect(run.state).toBe("ESCALATE");
    expect(run.expectedStateMatches).toBe(true);
    expect(run.auditEventId).toMatch(/^decision_/);
    expect(run.evidence).toHaveLength(2);
    expect(run.advisoryInterpretation.status).toBe("unavailable");
  });
});
