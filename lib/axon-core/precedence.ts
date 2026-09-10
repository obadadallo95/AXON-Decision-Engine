import type { DecisionState, PolicyEvaluation } from "./types";

export const DECISION_PRECEDENCE: Readonly<Record<DecisionState, number>> = {
  EXECUTE: 0,
  ASK: 1,
  DEFER: 2,
  ESCALATE: 3,
  REFUSE: 4,
};

export function selectDecisionState(
  policyEvaluations: PolicyEvaluation[],
  signals: {
    missingInformation: string[];
    uncertainty?: string[];
    staleEvidence: boolean;
    conflictingEvidence: boolean;
    requiredApprovalMissing: boolean;
  },
): DecisionState {
  const candidates: DecisionState[] = [
    ...policyEvaluations
      .filter((evaluation) => evaluation.matched)
      .map((evaluation) => evaluation.effect),
  ];

  if (signals.uncertainty?.some((code) => [
    "POLICY_COVERAGE_UNRESOLVED", "SAFETY_SEMANTICS_UNRESOLVED", "REQUIRED_EVIDENCE_UNAVAILABLE",
  ].includes(code))) candidates.push("DEFER");

  if (signals.missingInformation.length) candidates.push("ASK");
  if (signals.staleEvidence || signals.conflictingEvidence) {
    candidates.push("DEFER");
  }
  if (signals.requiredApprovalMissing) candidates.push("ESCALATE");

  return candidates.reduce<DecisionState>(
    (strongest, candidate) =>
      DECISION_PRECEDENCE[candidate] > DECISION_PRECEDENCE[strongest]
        ? candidate
        : strongest,
    "EXECUTE",
  );
}
