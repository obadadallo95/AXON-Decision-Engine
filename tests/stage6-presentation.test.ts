import { describe, expect, it } from "vitest";
import { riskBand } from "@/lib/risk";
import { adaptScenario, getScenario } from "@/lib/domains";
import { POST as decide } from "@/app/api/decide/route";

describe("Stage 6 presentation data", () => {
  it("maps risk scores to non-misleading display buckets", () => {
    expect([0, 24].map(riskBand)).toEqual(["LOW", "LOW"]);
    expect([25, 49].map(riskBand)).toEqual(["MODERATE", "MODERATE"]);
    expect([50, 74].map(riskBand)).toEqual(["HIGH", "HIGH"]);
    expect([75, 100].map(riskBand)).toEqual(["CRITICAL", "CRITICAL"]);
  });

  it("returns a server-derived decision trace for the documented API path", async () => {
    const response = await decide(
      new Request("http://localhost:3000/api/decide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...adaptScenario(getScenario("refund-stale-conflicting")!),
          requestId: "stage6-trace-request",
        }),
      }) as never,
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.state).toBe("ESCALATE");
    expect(result.decisionTrace.input.action.operation).toBe("issue-refund");
    expect(result.decisionTrace.signals.reconciled.requiredApprovalMissing).toBe(true);
    expect(result.decisionTrace.reasoning.reasonCodes).toContain("MISSING_APPROVAL");
    expect(result.decisionTrace.outcome.auditEventId).toBe(result.auditEventId);
  });
});
