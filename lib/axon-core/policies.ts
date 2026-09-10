import { PolicyRuleSchema } from "./schemas";
import type {
  DecisionRequest,
  DecisionSignals,
  JsonValue,
  PolicyCondition,
  PolicyEvaluation,
  PolicyRule,
} from "./types";

function valueAtPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, root);
}

function jsonEqual(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => jsonEqual(item, right[index]));
  }
  if (
    left &&
    right &&
    typeof left === "object" &&
    typeof right === "object"
  ) {
    const leftKeys = Object.keys(left as object).sort();
    const rightKeys = Object.keys(right as object).sort();
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] &&
          jsonEqual(
            (left as Record<string, unknown>)[key],
            (right as Record<string, unknown>)[key],
          ),
      )
    );
  }
  return false;
}

function conditionMatches(
  condition: PolicyCondition,
  evaluationContext: Record<string, unknown>,
): boolean {
  const actual = valueAtPath(evaluationContext, condition.field);
  if (condition.operator === "exists") {
    return actual !== undefined && actual !== null;
  }

  const expected = condition.value as JsonValue;
  switch (condition.operator) {
    case "equals":
      return jsonEqual(actual, expected);
    case "not_equals":
      return !jsonEqual(actual, expected);
    case "contains":
      if (typeof actual === "string" && typeof expected === "string") {
        return actual.includes(expected);
      }
      if (Array.isArray(actual)) {
        return actual.some((item) => jsonEqual(item, expected));
      }
      return false;
    case "gte":
      return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lte":
      return typeof actual === "number" && typeof expected === "number" && actual <= expected;
  }
}

export function evaluatePolicyRules(
  request: DecisionRequest,
  signals: DecisionSignals,
  inputRules: PolicyRule[],
): PolicyEvaluation[] {
  const rules = inputRules.map((rule) => PolicyRuleSchema.parse(rule));
  const evaluationContext = {
    action: request.action,
    context: request.context,
    signals,
  } satisfies Record<string, unknown>;

  return [...rules]
    .sort((left, right) => right.priority - left.priority || left.code.localeCompare(right.code))
    .map((rule) => {
      if (!rule.enabled) {
        return {
          ruleCode: rule.code,
          matched: false,
          effect: rule.effect,
          reason: "Rule is disabled.",
          deterministic: true as const,
        };
      }

      const matched = rule.conditions.every((condition) =>
        conditionMatches(condition, evaluationContext),
      );
      return {
        ruleCode: rule.code,
        matched,
        effect: rule.effect,
        reason: matched
          ? rule.description
          : "Rule conditions were not satisfied.",
        deterministic: true as const,
      };
    });
}
