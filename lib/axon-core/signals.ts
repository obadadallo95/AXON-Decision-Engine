import { DecisionSignalsSchema } from "./schemas";
import type { DecisionRequest, DecisionSignals } from "./types";

function booleanParameter(
  request: DecisionRequest,
  key: string,
): boolean {
  const value = request.action.parameters[key];
  return typeof value === "boolean" ? value : false;
}

function missingFacts(request: DecisionRequest): string[] {
  return request.context.requiredFacts.filter((fact) => {
    const value = request.context.additionalFacts[fact];
    return value === undefined || value === null || value === "";
  });
}

function evidenceState(request: DecisionRequest): {
  stale: boolean;
  conflicting: boolean;
} {
  const requestedAt = Date.parse(request.context.requestedAt);
  const staleByValidity = (request.context.evidenceItems ?? []).some((item) => {
    if (!item.validUntil || Number.isNaN(requestedAt)) return false;
    const validUntil = Date.parse(item.validUntil);
    return !Number.isNaN(validUntil) && validUntil < requestedAt;
  });
  const conflictByRelationship = (request.context.evidenceItems ?? []).some(
    (item) => item.contradicts.length > 0,
  );
  return {
    stale: request.context.evidence.stale || staleByValidity,
    conflicting: request.context.evidence.conflicting || conflictByRelationship,
  };
}

function boundedRisk(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function deriveDecisionSignals(
  request: DecisionRequest,
): DecisionSignals {
  const missingInformation = missingFacts(request);
  const evidence = evidenceState(request);
  const staleEvidence = evidence.stale;
  const conflictingEvidence = evidence.conflicting;
  const requiredApprovalMissing = request.context.requiredApprovals.some(
    (required) => !request.context.approvals.includes(required),
  );
  const destructive = booleanParameter(request, "destructive");
  const privileged = booleanParameter(request, "privileged");
  const externallyVisible = booleanParameter(request, "externallyVisible");

  // These are intentionally conservative operational weights, not calibrated
  // probabilities. The result is a bounded explanation aid for policy review.
  let risk = 0;
  if (request.context.environment === "production") risk += 20;
  if (request.context.reversibility === "partially_reversible") risk += 12;
  if (request.context.reversibility === "irreversible") risk += 25;
  if (request.context.blastRadius === "medium") risk += 10;
  if (request.context.blastRadius === "high") risk += 20;
  if (request.context.costOfWrong === "medium") risk += 6;
  if (request.context.costOfWrong === "high") risk += 12;
  if (request.context.costOfWrong === "critical") risk += 20;
  if (destructive) risk += 15;
  if (privileged) risk += 10;
  if (externallyVisible) risk += 5;
  if (requiredApprovalMissing) risk += 15;
  if (staleEvidence) risk += 10;
  if (conflictingEvidence) risk += 15;
  risk += Math.min(20, missingInformation.length * 10);

  const uncertainty: string[] = [];
  if (missingInformation.length) uncertainty.push("MISSING_INFORMATION");
  if (staleEvidence) uncertainty.push("STALE_EVIDENCE");
  if (conflictingEvidence) uncertainty.push("CONFLICTING_EVIDENCE");
  if (requiredApprovalMissing) uncertainty.push("MISSING_APPROVAL");

  // This is deterministic completeness confidence, not model confidence or a
  // statistical guarantee about whether an action is safe.
  const confidence = Number(
    Math.max(
      0,
      1 -
        missingInformation.length * 0.2 -
        (staleEvidence ? 0.15 : 0) -
        (conflictingEvidence ? 0.2 : 0),
    ).toFixed(2),
  );

  return DecisionSignalsSchema.parse({
    confidence,
    riskScore: boundedRisk(risk),
    uncertainty,
    missingInformation,
    reversibility: request.context.reversibility,
    blastRadius: request.context.blastRadius,
    costOfWrong: request.context.costOfWrong,
    requiredApprovalMissing,
    staleEvidence,
    conflictingEvidence,
    privileged,
    destructive,
    externallyVisible,
  });
}
