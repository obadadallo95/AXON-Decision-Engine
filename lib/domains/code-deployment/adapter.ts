import type { DecisionRequest, JsonObject } from "@/lib/axon-core";
import type { DomainScenario } from "@/lib/domains/common";
import { CodeDeploymentInputSchema, type CodeDeploymentInput } from "./schema";

function blastRadius(input: CodeDeploymentInput): DecisionRequest["context"]["blastRadius"] {
  return input.productionImpact === "high" || input.productionImpact === "critical"
    ? "high"
    : input.productionImpact === "low"
      ? "medium"
      : "low";
}
function costOfWrong(input: CodeDeploymentInput): DecisionRequest["context"]["costOfWrong"] {
  if (input.productionImpact === "critical") return "critical";
  if (input.productionImpact === "high") return "high";
  if (input.productionImpact === "low") return "medium";
  return "low";
}

export function adaptCodeDeployment(
  inputValue: CodeDeploymentInput,
  evidence: DomainScenario<CodeDeploymentInput>["evidence"],
): DecisionRequest {
  const input = CodeDeploymentInputSchema.parse(inputValue);
  const requiredFacts = [
    ...(input.service === null ? ["service"] : []),
    ...(input.environment === null ? ["environment"] : []),
    ...(input.changeTicketId === null ? ["changeTicketId"] : []),
  ];
  const requiredApprovals =
    input.environment === "production" &&
    (input.productionImpact === "high" || input.productionImpact === "critical")
      ? ["release-approval"]
      : [];
  const parameters: JsonObject = {
    service: input.service,
    environment: input.environment,
    changeType: input.changeType,
    artifactSigned: input.artifactSigned,
    testsPassed: input.testsPassed,
    rollbackAvailable: input.rollbackAvailable,
    deploymentWindowOpen: input.deploymentWindowOpen,
    freezeActive: input.freezeActive,
    emergencyException: input.emergencyException,
    incidentId: input.incidentId,
    changeTicketId: input.changeTicketId,
    dependencyHealth: input.dependencyHealth,
    changeSize: input.changeSize,
    productionImpact: input.productionImpact,
    destructive: true,
    privileged: input.environment === "production",
    externallyVisible: input.environment === "production",
  };

  return {
    requestId: input.requestId,
    action: {
      domain: "code-deployment",
      operation: "deploy-artifact",
      target: input.service ?? "unspecified-service",
      parameters,
    },
    context: {
      environment: input.environment ?? "development",
      actor: { id: "scenario-operator", role: "release-operator" },
      approvals: input.approverIds,
      requiredApprovals,
      requiredFacts,
      reversibility: input.rollbackAvailable ? "reversible" : "irreversible",
      blastRadius: blastRadius(input),
      costOfWrong: costOfWrong(input),
      requestedAt: input.requestedAt,
      additionalFacts: {
        service: input.service,
        environment: input.environment,
        changeTicketId: input.changeTicketId,
      },
      evidence: { stale: false, conflicting: false },
      evidenceItems: evidence,
    },
  };
}
