import type { DecisionRequest, EvidenceItem } from "@/lib/axon-core";
import { codeDeploymentScenarios } from "./code-deployment/fixtures";
import type { CodeDeploymentInput } from "./code-deployment/schema";
import { refundApprovalScenarios } from "./refund-approval/fixtures";
import type { RefundApprovalInput } from "./refund-approval/schema";
import { supportTicketTriageScenarios } from "./support-ticket-triage/fixtures";
import type { SupportTicketTriageInput } from "./support-ticket-triage/schema";
import { metadataOf, type DomainScenario, type ScenarioMetadata } from "./common";

export * from "./common";
export * from "./code-deployment/schema";
export * from "./refund-approval/schema";
export * from "./support-ticket-triage/schema";

export type ScenarioDefinition =
  | DomainScenario<CodeDeploymentInput>
  | DomainScenario<RefundApprovalInput>
  | DomainScenario<SupportTicketTriageInput>;

export const scenarioCatalog: ScenarioDefinition[] = [
  ...codeDeploymentScenarios,
  ...refundApprovalScenarios,
  ...supportTicketTriageScenarios,
];

export function listScenarioMetadata(): ScenarioMetadata[] {
  return scenarioCatalog.map(metadataOf);
}
export function getScenario(id: string): ScenarioDefinition | null {
  return scenarioCatalog.find((scenario) => scenario.id === id) ?? null;
}

export function adaptScenario(scenario: ScenarioDefinition): DecisionRequest {
  const adapter = scenario.adapt as unknown as (
    input: unknown,
    evidence: EvidenceItem[],
  ) => DecisionRequest;
  return adapter(scenario.input, scenario.evidence);
}
