import { DecisionRequestSchema, DecisionSignalsSchema } from "./schemas";
import { deriveDecisionSignals } from "./signals";
import type {
  AdvisoryInterpretation,
  AdvisoryInferredSignals,
  DecisionRequest,
  DecisionSignals,
  InferredValue,
} from "./types";

export interface ReconciledDecisionInput {
  request: DecisionRequest;
  signals: DecisionSignals;
  conflicts: string[];
}

function usable<T>(inference: InferredValue<T>, minimum = 0.5): boolean {
  return inference.provenance.confidence >= minimum;
}

function isLegacyRequest(request: DecisionRequest): boolean {
  return request.context.additionalFacts.__axonLegacy === true;
}

function isPlaceholder(value: string, kind: "domain" | "operation" | "target") {
  return (
    (kind === "domain" && value === "general") ||
    (kind === "operation" && value === "legacy.evaluate") ||
    (kind === "target" && value === "unspecified")
  );
}

function addUnique(values: string[], additions: string[]): string[] {
  return [...new Set([...values, ...additions])];
}

function appendConflict(conflicts: string[], field: string): void {
  conflicts.push(`MODEL_CONTRADICTS_EXPLICIT:${field}`);
}

function applyBooleanInference(
  parameters: Record<string, unknown>,
  field: "destructive" | "privileged" | "externallyVisible",
  inference: InferredValue<boolean>,
  conflicts: string[],
): void {
  const existing = parameters[field];
  if (typeof existing === "boolean") {
    if (existing !== inference.value) appendConflict(conflicts, field);
    return;
  }
  parameters[field] = inference.value;
}

function applyStringInference(
  value: string,
  field: "domain" | "operation" | "target",
  inference: InferredValue<string>,
  conflicts: string[],
): string {
  if (!usable(inference) || inference.value === "unknown") return value;
  if (!isPlaceholder(value, field)) {
    if (value.toLowerCase() !== inference.value.toLowerCase()) {
      appendConflict(conflicts, field);
    }
    return value;
  }
  return inference.value;
}

function applyContextInference<T extends string>(
  current: T,
  field: "environment" | "reversibility" | "blastRadius" | "costOfWrong",
  inference: InferredValue<T | "unknown">,
  allowLegacyInference: boolean,
  conflicts: string[],
): T {
  if (!usable(inference) || inference.value === "unknown") return current;
  if (!allowLegacyInference) {
    if (current !== inference.value) appendConflict(conflicts, field);
    return current;
  }
  return inference.value as T;
}

function highImpactInference(
  signals: AdvisoryInferredSignals,
  request: DecisionRequest,
  allowLegacyInference: boolean,
): string[] {
  const fields: Array<[string, InferredValue<unknown>, boolean]> = [
    ["destructive", signals.destructive, request.action.parameters.destructive === undefined],
    ["privileged", signals.privileged, request.action.parameters.privileged === undefined],
    [
      "irreversible",
      signals.inferredReversibility,
      allowLegacyInference && request.context.reversibility !== "irreversible",
    ],
    [
      "high-blast-radius",
      signals.inferredBlastRadius,
      allowLegacyInference && request.context.blastRadius !== "high",
    ],
    [
      "critical-cost-of-wrong",
      signals.inferredCostOfWrong,
      allowLegacyInference && request.context.costOfWrong !== "critical",
    ],
  ];

  return fields
    .filter(([field, inference, wasMissing]) => {
      const value = inference.value;
      const highImpact =
        value === true || value === "irreversible" || value === "high" || value === "critical";
      return wasMissing && highImpact && inference.provenance.confidence < 0.7;
    })
    .map(([field]) => `confirm_model_inference:${field}`);
}

export function applyAdvisoryToRequest(
  requestInput: DecisionRequest,
  advisory: AdvisoryInterpretation,
  allowLegacyInference = false,
): { request: DecisionRequest; conflicts: string[] } {
  const request = DecisionRequestSchema.parse(requestInput);
  const conflicts: string[] = [];
  const inferred = advisory.status === "success" ? advisory.inferredSignals : null;
  if (!inferred) return { request, conflicts };

  const legacy = allowLegacyInference && isLegacyRequest(request);
  const parameters = { ...request.action.parameters };
  applyBooleanInference(parameters, "destructive", inferred.destructive, conflicts);
  applyBooleanInference(parameters, "privileged", inferred.privileged, conflicts);
  applyBooleanInference(
    parameters,
    "externallyVisible",
    inferred.externallyVisible,
    conflicts,
  );

  const action = {
    ...request.action,
    domain: applyStringInference(
      request.action.domain,
      "domain",
      inferred.inferredDomain,
      conflicts,
    ),
    operation: applyStringInference(
      request.action.operation,
      "operation",
      inferred.inferredOperation,
      conflicts,
    ),
    target: applyStringInference(
      request.action.target,
      "target",
      inferred.inferredTarget,
      conflicts,
    ),
    parameters,
  };

  const environment = applyContextInference(
    request.context.environment,
    "environment",
    inferred.inferredEnvironment,
    legacy,
    conflicts,
  );
  const reversibility = applyContextInference(
    request.context.reversibility,
    "reversibility",
    inferred.inferredReversibility,
    legacy,
    conflicts,
  );
  const blastRadius = applyContextInference(
    request.context.blastRadius,
    "blastRadius",
    inferred.inferredBlastRadius,
    legacy,
    conflicts,
  );
  const costOfWrong = applyContextInference(
    request.context.costOfWrong,
    "costOfWrong",
    inferred.inferredCostOfWrong,
    legacy,
    conflicts,
  );

  const additionalFacts = { ...request.context.additionalFacts };
  const requiredFacts = [...request.context.requiredFacts];
  if (legacy && environment !== request.context.environment) {
    additionalFacts.environment = environment;
  }
  if (legacy && action.target !== request.action.target) {
    additionalFacts.target = action.target;
  }
  const remainingRequiredFacts = requiredFacts.filter((fact) => {
    const value = additionalFacts[fact];
    return value === undefined || value === null || value === "";
  });

  return {
    request: DecisionRequestSchema.parse({
      ...request,
      action,
      context: {
        ...request.context,
        environment,
        reversibility,
        blastRadius,
        costOfWrong,
        requiredFacts: remainingRequiredFacts,
        additionalFacts,
      },
    }),
    conflicts,
  };
}

export function reconcileDecisionSignals(
  requestInput: DecisionRequest,
  advisory: AdvisoryInterpretation,
  allowLegacyInference = false,
): ReconciledDecisionInput {
  const request = DecisionRequestSchema.parse(requestInput);
  const baseline = deriveDecisionSignals(request);
  const applied = applyAdvisoryToRequest(request, advisory, allowLegacyInference);
  const candidate = deriveDecisionSignals(applied.request);
  const inferred = advisory.status === "success" ? advisory.inferredSignals : null;
  const lowConfidence = inferred
    ? highImpactInference(inferred, request, allowLegacyInference)
    : [];
  const modelMissing = advisory.status === "success" ? advisory.missingInformation : [];
  const modelUncertainty = [
    ...(advisory.status === "success" && advisory.ambiguities.length
      ? ["MODEL_AMBIGUITY"]
      : []),
    ...(advisory.status === "success" && advisory.conflictingFacts.length
      ? ["MODEL_CONFLICTING_FACTS"]
      : []),
    ...(applied.conflicts.length ? ["MODEL_CONFLICT"] : []),
    ...(lowConfidence.length ? ["LOW_CONFIDENCE_HIGH_IMPACT_INFERENCE"] : []),
  ];
  const missingInformation = addUnique(
    candidate.missingInformation,
    [...modelMissing, ...lowConfidence],
  );
  const uncertainty = addUnique(candidate.uncertainty, [
    ...modelUncertainty,
    ...(advisory.status === "success" && advisory.evidenceAssessment.some(
      (assessment) => assessment.assessment === "contradicts",
    )
      ? ["MODEL_EVIDENCE_CONTRADICTION"]
      : []),
  ]);
  const confidence = Number(
    Math.max(
      0,
      Math.min(
        candidate.confidence,
        1 -
          missingInformation.length * 0.2 -
          (candidate.staleEvidence ? 0.15 : 0) -
          (candidate.conflictingEvidence ? 0.2 : 0),
      ),
    ).toFixed(2),
  );

  return {
    request: applied.request,
    conflicts: applied.conflicts,
    signals: DecisionSignalsSchema.parse({
      ...candidate,
      confidence,
      riskScore: Math.max(baseline.riskScore, candidate.riskScore),
      missingInformation,
      uncertainty,
    }),
  };
}
