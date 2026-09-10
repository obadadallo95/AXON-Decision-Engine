import {
  DecisionOutcomeSchema,
  DecisionRequestSchema,
  DecisionSignalsSchema,
  PolicyRuleSchema,
} from "./schemas";
import { normalizeDecisionRequest, normalizePolicyRules } from "./normalize";
import { evaluatePolicyRules } from "./policies";
import { applyPolicyRequirements } from "./requirements";
import { selectDecisionState } from "./precedence";
import { deriveDecisionSignals } from "./signals";
import type {
  DecisionOutcome,
  DecisionRequest,
  DecisionSignals,
  FailureState,
  PolicyRule,
} from "./types";

function failureOutcome(failureState: FailureState): DecisionOutcome {
  const state = failureState === "INVALID_REQUEST" ? "ASK" : "DEFER";
  return DecisionOutcomeSchema.parse({
    state,
    riskScore: 100,
    confidence: 0,
    uncertainty: [failureState],
    missingInformation: failureState === "INVALID_REQUEST" ? ["valid request"] : [],
    reversibility: "partially_reversible",
    blastRadius: "high",
    costOfWrong: "critical",
    matchedRuleCodes: [],
    policyEvaluations: [],
    reasonCodes: [failureState],
    failureState,
    authoritative: "deterministic",
  });
}

export function evaluateDecision(
  requestInput: DecisionRequest,
  inputRules: PolicyRule[],
): DecisionOutcome {
  const request = DecisionRequestSchema.parse(requestInput);
  const rules = inputRules.map((rule) => PolicyRuleSchema.parse(rule));
  const signals = deriveDecisionSignals(request);
  return evaluateDecisionWithSignals(request, rules, signals);
}

export function evaluateDecisionWithSignals(
  requestInput: DecisionRequest,
  inputRules: PolicyRule[],
  signalsInput: DecisionSignals,
): DecisionOutcome {
  const request = DecisionRequestSchema.parse(requestInput);
  const rules = inputRules.map((rule) => PolicyRuleSchema.parse(rule));
  const signals = DecisionSignalsSchema.parse(applyPolicyRequirements(request, rules, signalsInput));
  const policyEvaluations = evaluatePolicyRules(request, signals, rules);
  const state = selectDecisionState(policyEvaluations, signals);
  const matchedRuleCodes = policyEvaluations
    .filter((evaluation) => evaluation.matched)
    .map((evaluation) => evaluation.ruleCode);
  const reasonCodes = [
    ...matchedRuleCodes,
    ...signals.uncertainty,
    ...(state === "EXECUTE" ? ["POLICY_ALLOW"] : []),
  ];

  return DecisionOutcomeSchema.parse({
    state,
    riskScore: signals.riskScore,
    confidence: signals.confidence,
    uncertainty: signals.uncertainty,
    missingInformation: signals.missingInformation,
    reversibility: signals.reversibility,
    blastRadius: signals.blastRadius,
    costOfWrong: signals.costOfWrong,
    matchedRuleCodes,
    policyEvaluations,
    reasonCodes,
    failureState: null,
    authoritative: "deterministic",
  });
}

export function safeEvaluateDecision(
  requestInput: unknown,
  rulesInput: unknown,
): DecisionOutcome {
  try {
    const request = normalizeDecisionRequest(requestInput);
    const rules = normalizePolicyRules(rulesInput);
    return evaluateDecision(request, rules);
  } catch (error) {
    const failureState: FailureState =
      error instanceof Error && /request|expected|invalid/i.test(error.message)
        ? "INVALID_REQUEST"
        : "INTERNAL_ERROR";
    return failureOutcome(failureState);
  }
}
