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
