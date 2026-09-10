export const DECISION_STATES = [
  "EXECUTE",
  "ASK",
  "DEFER",
  "ESCALATE",
  "REFUSE",
] as const;

export type DecisionState = (typeof DECISION_STATES)[number];

export const FAILURE_STATES = [
  "INVALID_REQUEST",
  "POLICY_UNAVAILABLE",
  "SIGNALS_UNAVAILABLE",
  "EVIDENCE_STALE",
  "EVIDENCE_CONFLICT",
  "MODEL_UNAVAILABLE",
  "MODEL_INVALID",
  "AUDIT_WRITE_FAILED",
  "IDEMPOTENCY_CONFLICT",
  "REVIEW_NOT_ALLOWED",
  "REVIEW_ALREADY_RECORDED",
  "REVIEW_CONFLICT",
  "AUDIT_NOT_FOUND",
  "AUTH_REQUIRED",
  "IDEMPOTENCY_REPLAY",
  "INTERNAL_ERROR",
] as const;

export type FailureState = (typeof FAILURE_STATES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type Environment = "development" | "staging" | "production";
export type Reversibility =
  | "reversible"
  | "partially_reversible"
  | "irreversible";
export type BlastRadius = "low" | "medium" | "high";
export type CostOfWrong = "low" | "medium" | "high" | "critical";

export type InferenceSource = "explicit" | "model_inference" | "evidence";

export interface InferenceProvenance {
  source: InferenceSource;
  confidence: number;
  rationale: string;
  supportingEvidenceIds: string[];
}

export interface InferredValue<T> {
  value: T;
  provenance: InferenceProvenance;
}

export type EvidenceTrust = "trusted" | "untrusted" | "derived";

export interface EvidenceItem {
  id: string;
  kind: string;
  source: string;
  summary: string;
  observedAt: string;
  validUntil: string | null;
  trust: EvidenceTrust;
  contentHash: string;
  supports: string[];
  contradicts: string[];
}

export type EvidenceAssessmentKind = "supports" | "contradicts" | "uncertain";

export interface EvidenceAssessment {
  conflictsWithEvidenceIds?: string[];
  evidenceId: string;
  assessment: EvidenceAssessmentKind;
  confidence: number;
  rationale: string;
}

export interface ProposedAction {
  domain: string;
  operation: string;
  target: string;
  parameters: JsonObject;
}

export interface ActorContext {
  id: string;
  role: string;
}

export interface DecisionContext {
  environment: Environment;
  actor: ActorContext;
  approvals: string[];
  requiredApprovals: string[];
  requiredFacts: string[];
  reversibility: Reversibility;
  blastRadius: BlastRadius;
  costOfWrong: CostOfWrong;
  requestedAt: string;
  additionalFacts: JsonObject;
  evidence: {
    stale: boolean;
    conflicting: boolean;
  };
  evidenceItems?: EvidenceItem[];
}

export interface DecisionRequest {
  requestId: string;
  action: ProposedAction;
  context: DecisionContext;
}

export interface DecisionSignals {
  confidence: number;
  riskScore: number;
  uncertainty: string[];
  missingInformation: string[];
  reversibility: Reversibility;
  blastRadius: BlastRadius;
  costOfWrong: CostOfWrong;
  requiredApprovalMissing: boolean;
  staleEvidence: boolean;
  conflictingEvidence: boolean;
  privileged: boolean;
  destructive: boolean;
  externallyVisible: boolean;
}

export type PolicyConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "gte"
  | "lte"
  | "exists";

export interface PolicyCondition {
  field: string;
  operator: PolicyConditionOperator;
  value?: JsonValue;
}

export interface PolicyRule {
  code: string;
  description: string;
  priority: number;
  enabled: boolean;
  hard: boolean;
  effect: DecisionState;
  conditions: PolicyCondition[];
  requiredEvidence?: string[];
}

export interface PolicyEvaluation {
  ruleCode: string;
  matched: boolean;
  effect: DecisionState;
  reason: string;
  deterministic: true;
}

export interface DecisionOutcome {
  state: DecisionState;
  riskScore: number;
  confidence: number;
  uncertainty: string[];
  missingInformation: string[];
  reversibility: Reversibility;
  blastRadius: BlastRadius;
  costOfWrong: CostOfWrong;
  matchedRuleCodes: string[];
  policyEvaluations: PolicyEvaluation[];
  reasonCodes: string[];
  failureState: FailureState | null;
  authoritative: "deterministic";
}

export interface AdvisoryInferredSignals {
  normalizedAction: InferredValue<string>;
  inferredDomain: InferredValue<string>;
  inferredOperation: InferredValue<string>;
  inferredTarget: InferredValue<string>;
  inferredEnvironment: InferredValue<Environment | "unknown">;
  destructive: InferredValue<boolean>;
  privileged: InferredValue<boolean>;
  externallyVisible: InferredValue<boolean>;
  inferredReversibility: InferredValue<Reversibility | "unknown">;
  inferredBlastRadius: InferredValue<BlastRadius | "unknown">;
  inferredCostOfWrong: InferredValue<CostOfWrong | "unknown">;
}

export interface AdvisoryInterpretation {
  provider: "gemini" | string;
  model: string | null;
  status: "success" | "unavailable" | "invalid" | "failed" | "not_requested";
  interpretationConfidence: number;
  inferredSignals: AdvisoryInferredSignals | null;
  missingInformation: string[];
  ambiguities: string[];
  conflictingFacts: string[];
  evidenceAssessment: EvidenceAssessment[];
  saferAlternatives: string[];
  reasoningSummary: string;
  unknownEvidenceIds: string[];
}
