import type { DecisionState } from "@/lib/axon-core";

export type EnforcementWorld = {
  treasuryBalance: number;
  deploymentVersions: { staging: number; production: number };
  ticketQueues: string[];
  deletedRecords: string[];
};

export type EnforcementResult = {
  simulated: true;
  attempted: boolean;
  executed: boolean;
  operation: string;
  summary: string;
  worldStateChanged: boolean;
  before: EnforcementWorld;
  after: EnforcementWorld;
  changes: string[];
};

const initialWorld: EnforcementWorld = {
  treasuryBalance: 10_000,
  deploymentVersions: { staging: 41, production: 18 },
  ticketQueues: ["general"],
  deletedRecords: [],
};

function cloneWorld(): EnforcementWorld {
  return {
    treasuryBalance: initialWorld.treasuryBalance,
    deploymentVersions: { ...initialWorld.deploymentVersions },
    ticketQueues: [...initialWorld.ticketQueues],
    deletedRecords: [...initialWorld.deletedRecords],
  };
}

/**
 * Challenge-safe enforcement proof. This is intentionally a deterministic,
 * in-memory simulation: AXON records what an executor may do, but does not
 * touch real refunds, deployments, or customer data.
 */
export function simulateEnforcement(
  scenarioId: string,
  state: DecisionState,
): EnforcementResult {
  const before = cloneWorld();
  const after = cloneWorld();
  const executable = state === "EXECUTE";
  let operation = "no-op";
  let summary = executable
    ? "Execution proof is available for this scenario."
    : "No downstream action was permitted.";
  const changes: string[] = [];

  if (scenarioId.startsWith("deploy-")) {
    operation = "deploy-artifact";
    if (executable && scenarioId === "deploy-safe-release") {
      after.deploymentVersions.staging += 1;
      changes.push(`staging version ${before.deploymentVersions.staging} → ${after.deploymentVersions.staging}`);
      summary = "Signed staging release simulated through the controlled executor.";
    }
  } else if (scenarioId.startsWith("refund-")) {
    operation = "issue-refund";
    if (executable && scenarioId === "refund-small-approved") {
      after.treasuryBalance -= 24;
      changes.push(`treasury €${before.treasuryBalance} → €${after.treasuryBalance}`);
      summary = "Small refund simulated after AXON authorized the operation.";
    }
  } else if (scenarioId.startsWith("ticket-")) {
    operation = "route-ticket";
    if (executable && scenarioId === "ticket-routine-route") {
      after.ticketQueues.push("technical");
      changes.push("ticket routed to technical queue");
      summary = "Ticket routing simulated through the controlled executor.";
    }
  }

  return {
    simulated: true,
    attempted: executable,
    executed: changes.length > 0,
    operation,
    summary,
    worldStateChanged: changes.length > 0,
    before,
    after,
    changes,
  };
}
