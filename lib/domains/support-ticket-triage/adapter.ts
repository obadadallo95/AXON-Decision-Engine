import type { DecisionRequest, JsonObject } from "@/lib/axon-core";
import type { DomainScenario } from "@/lib/domains/common";
import { SupportTicketTriageInputSchema, type SupportTicketTriageInput } from "./schema";

function blastRadius(input: SupportTicketTriageInput): DecisionRequest["context"]["blastRadius"] {
  if (input.accountImpact === "tenant_wide") return "high";
  if (input.accountImpact === "multiple_users") return "medium";
  return "low";
}
function costOfWrong(input: SupportTicketTriageInput): DecisionRequest["context"]["costOfWrong"] {
  if (input.securitySensitive || input.accountImpact === "tenant_wide") return "critical";
  if (input.severity === "high" || input.severity === "critical") return "high";
  return "medium";
}

export function adaptSupportTicketTriage(
  inputValue: SupportTicketTriageInput,
  evidence: DomainScenario<SupportTicketTriageInput>["evidence"],
): DecisionRequest {
  const input = SupportTicketTriageInputSchema.parse(inputValue);
  const requiredFacts = [
    ...(input.ticketId === null ? ["ticketId"] : []),
    ...(input.tenantId === null ? ["tenantId"] : []),
    ...(input.category === null ? ["category"] : []),
    ...(input.severity === null ? ["severity"] : []),
    ...(input.ticketBody === null ? ["ticketBody"] : []),
    ...(input.category === "technical" && !input.reproductionAvailable
      ? ["reproductionDetails"]
      : []),
  ];
  const requiredApprovals = input.securitySensitive ? ["security-review"] : [];
  const parameters: JsonObject = {
    ticketId: input.ticketId,
    category: input.category,
    tenantId: input.tenantId,
    severity: input.severity,
    customerTier: input.customerTier,
    accountImpact: input.accountImpact,
    securitySensitive: input.securitySensitive,
    reproductionAvailable: input.reproductionAvailable,
    requesterIdentityVerified: input.requesterIdentityVerified,
    slaMinutes: input.slaMinutes,
    destinationQueue: input.destinationQueue,
    autoRouteAllowed: input.autoRouteAllowed,
    duplicateOf: input.duplicateOf,
    incidentStatus: input.incidentStatus,
    routingSystemAvailable: input.routingSystemAvailable,
    requestedOperation: input.requestedOperation,
    authorizedToRequest: input.authorizedToRequest,
    prohibitedAction: input.prohibitedAction,
    ticketBody: input.ticketBody,
    destructive: input.requestedOperation !== "route",
    privileged: input.requestedOperation === "grant_access",
    externallyVisible: true,
  };

  return {
    requestId: input.requestId,
    action: {
      domain: "support-ticket-triage",
      operation: input.requestedOperation,
      target: input.ticketId ?? "unspecified-ticket",
      parameters,
    },
    context: {
      environment: "production",
      actor: { id: "scenario-operator", role: "support-triage-agent" },
      approvals: [],
      requiredApprovals,
      requiredFacts,
      reversibility: "reversible",
      blastRadius: blastRadius(input),
      costOfWrong: costOfWrong(input),
      requestedAt: input.requestedAt,
      additionalFacts: {
        ticketId: input.ticketId,
        tenantId: input.tenantId,
        category: input.category,
        severity: input.severity,
        ticketBody: input.ticketBody,
        reproductionDetails: input.reproductionAvailable ? "provided" : null,
      },
      evidence: { stale: false, conflicting: false },
      evidenceItems: evidence,
    },
  };
}
