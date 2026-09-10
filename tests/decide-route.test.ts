import { describe, expect, it } from "vitest";
import { adaptScenario, getScenario } from "@/lib/domains";
import { POST } from "@/app/api/decide/route";

const context = {
  environment: "production",
  actor: { id: "operator-001", role: "operator" },
  approvals: [],
  requiredApprovals: [],
  requiredFacts: [],
  reversibility: "irreversible",
  blastRadius: "high",
  costOfWrong: "critical",
  requestedAt: "2026-09-10T10:00:00.000Z",
  additionalFacts: {},
  evidence: { stale: false, conflicting: false },
};

describe("/api/decide deterministic boundary", () => {
  it("returns the kernel state and keeps legacy fields as a projection", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...adaptScenario(getScenario("deploy-unsigned-artifact")!),
          requestId: "req-route-001",
        }),
      }) as never,
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.state).toBe("REFUSE");
    expect(result.decision).toBe("DENY");
    expect(result.execute).toBe(false);
    expect(result.outcome.authoritative).toBe("deterministic");
    expect(result.groundingEn).toContain("Gemini is not authoritative");
    expect(result.authoritativeDecision.state).toBe("REFUSE");
    expect(result.auditEventId).toMatch(/^decision_/);
    expect(result.integrity.inputHash).toHaveLength(64);
  });

  it("keeps legacy prompt requests safe when structured context is absent", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: "restart the server", policies: [] }),
      }) as never,
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.state).toBe("DEFER");
    expect(result.outcome.reasonCodes).toContain("POLICY_COVERAGE_UNRESOLVED");
    expect(result.execute).toBe(false);
    expect(result.auditEventId).toMatch(/^decision_/);
    expect(result.idempotencyKey).toMatch(/^legacy-/);
  });

  it("replays the same server audit identity for a structured idempotency key", async () => {
    const body = {
      ...adaptScenario(getScenario("deploy-safe-release")!),
      requestId: "req-route-idempotency-001",
      idempotencyKey: "route-idempotency-001",
    };
    const firstResponse = await POST(
      new Request("http://localhost:3000/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }) as never,
    );
    const secondResponse = await POST(
      new Request("http://localhost:3000/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }) as never,
    );

    const first = await firstResponse.json();
    const second = await secondResponse.json();
    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(second.replayed).toBe(true);
    expect(second.auditEventId).toBe(first.auditEventId);
    expect(second.integrity).toEqual(first.integrity);
  });
});
