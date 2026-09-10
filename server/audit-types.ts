import type {
  AdvisoryInterpretation,
  ActorContext,
  DecisionOutcome,
  DecisionRequest,
  DecisionSignals,
  FailureState,
  PolicyEvaluation,
} from "@/lib/axon-core";

export interface AuditIntegrityMetadata {
  inputHash: string;
  signalsHash: string;
  policyHash: string;
  outcomeHash: string;
  advisoryHash: string;
  eventHash: string | null;
}

export interface AuditPolicyAuthority {
  version: string | null;
  codes: string[];
  hash: string;
}

export interface AuditModelMetadata {
  provider: string;
  requestedModel: string | null;
  actualModel: string | null;
  status: AdvisoryInterpretation["status"];
  interpretationConfidence: number;
  advisoryHash: string;
  failureState: FailureState | null;
}

export interface AuditRecord {
  eventId: string;
  eventType: "DECISION";
  requestId: string;
  idempotencyKey: string;
  timestamp: string;
  actor: ActorContext;
  normalizedRequest: DecisionRequest;
  reconciledRequest?: DecisionRequest;
  explicitSignals: DecisionSignals;
  reconciledSignals: DecisionSignals;
  advisoryInterpretation: AdvisoryInterpretation;
  policyAuthority: AuditPolicyAuthority;
  policyEvaluations: PolicyEvaluation[];
  matchedRuleCodes: string[];
  authoritativeOutcome: DecisionOutcome;
  failureState: FailureState | null;
  model: AuditModelMetadata;
  integrity: AuditIntegrityMetadata;
}

export type DecisionEvent = AuditRecord;

export type ReviewAction = "APPROVE" | "REJECT";

export interface ReviewEvent {
  reviewEventId: string;
  eventType: "REVIEW";
  requestId: string;
  parentDecisionEventId: string;
  reviewer: ActorContext;
  action: ReviewAction;
  reason: string;
  timestamp: string;
  previousEventHash: string;
  eventHash: string;
}

export interface AuditTrail {
  decision: AuditRecord;
  reviews: ReviewEvent[];
}
