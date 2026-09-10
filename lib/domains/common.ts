import type {
  DecisionRequest,
  DecisionState,
  EvidenceItem,
  PolicyRule,
} from "@/lib/axon-core";

export type ScenarioDomain =
  | "code-deployment"
  | "refund-approval"
  | "support-ticket-triage";

export interface ScenarioMetadata {
  id: string;
  domain: ScenarioDomain;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  previewEn: string;
  previewAr: string;
  expectedState: DecisionState;
  expectedExplanationEn: string;
  expectedExplanationAr: string;
  policyVersion: string;
}
export interface DomainScenario<TInput> extends ScenarioMetadata {
  input: TInput;
  evidence: EvidenceItem[];
  policies: PolicyRule[];
  adapt: (input: TInput, evidence: EvidenceItem[]) => DecisionRequest;
}

export function syntheticEvidence(input: {
  id: string;
  kind: string;
  source: string;
  summary: string;
  observedAt: string;
  validUntil?: string | null;
  trust?: EvidenceItem["trust"];
  supports?: string[];
  contradicts?: string[];
}): EvidenceItem {
  return {
    id: input.id,
    kind: input.kind,
    source: input.source,
    summary: input.summary,
    observedAt: input.observedAt,
    validUntil: input.validUntil ?? null,
    trust: input.trust ?? "trusted",
    // Fixtures use stable labels as content hashes. Production adapters should
    // replace these with hashes of the source payload before calling AXON.
    contentHash: `synthetic:${input.id}`,
    supports: input.supports ?? [],
    contradicts: input.contradicts ?? [],
  };
}

export function metadataOf(scenario: ScenarioMetadata): ScenarioMetadata {
  return {
    id: scenario.id,
    domain: scenario.domain,
    titleEn: scenario.titleEn,
    titleAr: scenario.titleAr,
    descriptionEn: scenario.descriptionEn,
    descriptionAr: scenario.descriptionAr,
    previewEn: scenario.previewEn,
    previewAr: scenario.previewAr,
    expectedState: scenario.expectedState,
    expectedExplanationEn: scenario.expectedExplanationEn,
    expectedExplanationAr: scenario.expectedExplanationAr,
    policyVersion: scenario.policyVersion,
  };
}
