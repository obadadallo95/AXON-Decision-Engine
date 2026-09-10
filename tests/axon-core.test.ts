import { describe, expect, it } from "vitest";
import {
  DecisionOutcomeSchema,
  DecisionSignalsSchema,
  evaluateDecision,
  deriveDecisionSignals,
  normalizeDecisionRequest,
  PolicyRuleSchema,
  safeEvaluateDecision,
} from "@/lib/axon-core";
import type { DecisionRequest, PolicyRule } from "@/lib/axon-core";

const request = (overrides: Partial<DecisionRequest> = {}): DecisionRequest => ({
  requestId: "req-001",
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
  },
  ...overrides,
});

const hardRefuse: PolicyRule = {
  code: "BLOCK-001",
  description: "Explicitly prohibited actions cannot execute.",
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

describe("AXON deterministic core", () => {
  it("returns EXECUTE for a complete low-risk action", () => {
    const result = evaluateDecision(request(), [hardRefuse]);
    expect(result.state).toBe("EXECUTE");
    expect(result.authoritative).toBe("deterministic");
    expect(DecisionOutcomeSchema.parse(result)).toEqual(result);
  });

  it("returns ASK when requester-supplied facts are missing", () => {
    const result = evaluateDecision(
      request({
        context: {
          ...request().context,
          requiredFacts: ["changeWindow"],
        },
      }),
      [hardRefuse],
    );
    expect(result.state).toBe("ASK");
    expect(result.missingInformation).toEqual(["changeWindow"]);
  });

  it("returns DEFER for stale evidence", () => {
    const result = evaluateDecision(
      request({
        context: {
          ...request().context,
          evidence: { stale: true, conflicting: false },
        },
      }),
      [hardRefuse],
    );
    expect(result.state).toBe("DEFER");
    expect(result.reasonCodes).toContain("STALE_EVIDENCE");
  });

  it("returns ESCALATE when mandatory human approval is missing", () => {
    const result = evaluateDecision(
      request({
        context: {
          ...request().context,
          environment: "production",
          blastRadius: "high",
          requiredApprovals: ["security-review"],
        },
      }),
      [hardRefuse],
    );
    expect(result.state).toBe("ESCALATE");
    expect(result.riskScore).toBeGreaterThan(0);
  });

  it("returns REFUSE for a hard prohibited policy", () => {
    const result = evaluateDecision(
      request({
        action: { ...request().action, parameters: { prohibited: true } },
      }),
      [hardRefuse],
    );
    expect(result.state).toBe("REFUSE");
    expect(result.matchedRuleCodes).toEqual(["BLOCK-001"]);
  });

  it("makes REFUSE beat confidence, low risk, and favorable rules", () => {
    const favorable: PolicyRule = {
      code: "ALLOW-001",
      description: "A matching allow rule is lower authority.",
      priority: 1,
      enabled: true,
      hard: false,
      effect: "EXECUTE",
      conditions: [{ field: "action.domain", operator: "equals", value: "deployment" }],
    };
    const result = evaluateDecision(
      request({
        action: { ...request().action, parameters: { prohibited: true } },
      }),
      [favorable, hardRefuse],
    );
    expect(result.state).toBe("REFUSE");
    expect(result.confidence).toBe(1);
    expect(result.riskScore).toBe(0);
  });

  it("makes ESCALATE beat DEFER and ASK", () => {
    const result = evaluateDecision(
      request({
        context: {
          ...request().context,
          requiredFacts: ["changeWindow"],
          evidence: { stale: true, conflicting: false },
          requiredApprovals: ["security-review"],
        },
      }),
      [hardRefuse],
    );
    expect(result.state).toBe("ESCALATE");
  });

  it("makes DEFER beat ASK", () => {
    const result = evaluateDecision(
      request({
        context: {
          ...request().context,
          requiredFacts: ["changeWindow"],
          evidence: { stale: false, conflicting: true },
        },
      }),
      [hardRefuse],
    );
    expect(result.state).toBe("DEFER");
  });

  it("rejects invalid signal values and malformed policy rules", () => {
    const signals = deriveDecisionSignals(request());
    expect(() =>
      DecisionSignalsSchema.parse({ ...signals, riskScore: 101 }),
    ).toThrow();
    expect(() =>
      DecisionSignalsSchema.parse({ ...signals, confidence: 1.1 }),
    ).toThrow();
    expect(() =>
      PolicyRuleSchema.parse({
        ...hardRefuse,
        conditions: [{ field: "signals.riskScore", operator: "gte" }],
      }),
    ).toThrow();
    expect(() =>
      normalizeDecisionRequest({ requestId: "bad", action: {}, context: {} }),
    ).toThrow();
  });

  it("normalizes equivalent structured input deterministically", () => {
    const normalized = normalizeDecisionRequest({
      ...request(),
      action: { ...request().action, domain: "  DEPLOYMENT  " },
      context: { ...request().context, environment: "stage" },
    });
    const same = normalizeDecisionRequest({
      ...request(),
      action: { ...request().action, domain: "deployment" },
      context: { ...request().context, environment: "staging" },
    });
    expect(normalized).toEqual(same);
    expect(evaluateDecision(normalized, [hardRefuse])).toEqual(
      evaluateDecision(same, [hardRefuse]),
    );
  });

  it("never defaults to EXECUTE on a core failure", () => {
    const result = safeEvaluateDecision(request(), [{ malformed: true }]);
    expect(result.state).not.toBe("EXECUTE");
    expect(result.failureState).not.toBeNull();
  });

  it("treats policy conditions as data, never executable code", () => {
    const rule: PolicyRule = {
      code: "DATA-001",
      description: "A string resembling code is only data.",
      priority: 1,
      enabled: true,
      hard: false,
      effect: "REFUSE",
      conditions: [
        {
          field: "action.operation",
          operator: "equals",
          value: "(() => { throw new Error('executed') })()",
        },
      ],
    };
    expect(() => evaluateDecision(request(), [rule])).not.toThrow();
    expect(evaluateDecision(request(), [rule]).state).toBe("EXECUTE");
  });

  it("ignores disabled rules", () => {
    const result = evaluateDecision(request(), [
      { ...hardRefuse, enabled: false },
      { ...hardRefuse, code: "ACTIVE-BOUNDARY", priority: 0 },
    ]);
    expect(result.state).toBe("EXECUTE");
    expect(result.policyEvaluations[0]).toMatchObject({
      ruleCode: "BLOCK-001",
      matched: false,
    });
  });

  it("keeps deterministic risk bounded", () => {
    const combinations: DecisionRequest[] = [
      request(),
      request({
        action: {
          ...request().action,
          parameters: {
            destructive: true,
            privileged: true,
            externallyVisible: true,
          },
        },
        context: {
          ...request().context,
          environment: "production",
          reversibility: "irreversible",
          blastRadius: "high",
          costOfWrong: "critical",
          requiredApprovals: ["security-review"],
          requiredFacts: ["changeWindow", "rollbackPlan"],
          evidence: { stale: true, conflicting: true },
        },
      }),
    ];
    for (const candidate of combinations) {
      const result = deriveDecisionSignals(candidate);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    }
  });
});
