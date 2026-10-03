import { describe, expect, it } from "vitest";
import { simulateEnforcement } from "@/lib/enforcement";

describe("controlled enforcement proof", () => {
  it("shows a bounded mutation only for an authorized staging release", () => {
    const result = simulateEnforcement("deploy-safe-release", "EXECUTE");

    expect(result.simulated).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.worldStateChanged).toBe(true);
    expect(result.before.deploymentVersions.staging).toBe(41);
    expect(result.after.deploymentVersions.staging).toBe(42);
  });

  it.each(["ASK", "DEFER", "ESCALATE", "REFUSE"] as const)(
    "never mutates the world for %s",
    (state) => {
      const result = simulateEnforcement("refund-small-approved", state);

      expect(result.attempted).toBe(false);
      expect(result.executed).toBe(false);
      expect(result.worldStateChanged).toBe(false);
      expect(result.after).toEqual(result.before);
    },
  );

  it("preserves the treasury when a high-value refund is escalated", () => {
    const result = simulateEnforcement("refund-stale-conflicting", "ESCALATE");

    expect(result.operation).toBe("issue-refund");
    expect(result.after.treasuryBalance).toBe(result.before.treasuryBalance);
    expect(result.changes).toEqual([]);
  });
});
