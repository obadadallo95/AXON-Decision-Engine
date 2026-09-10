import {
  DecisionRequestInputSchema,
  DecisionRequestSchema,
  PolicyRuleSchema,
} from "./schemas";
import type { DecisionRequest, PolicyRule } from "./types";

function normalizeEnvironment(
  environment: "development" | "staging" | "production" | "dev" | "stage" | "prod",
): "development" | "staging" | "production" {
  if (environment === "dev") return "development";
  if (environment === "stage") return "staging";
  if (environment === "prod") return "production";
  return environment;
}

export function normalizeDecisionRequest(input: unknown): DecisionRequest {
  const parsed = DecisionRequestInputSchema.parse(input);
  const normalized = {
    requestId: parsed.requestId.trim(),
    action: {
      domain: parsed.action.domain.trim().toLowerCase(),
      operation: parsed.action.operation.trim(),
      target: parsed.action.target.trim(),
      parameters: parsed.action.parameters ?? {},
    },
    context: {
      environment: normalizeEnvironment(parsed.context.environment),
      actor: {
        id: parsed.context.actor.id.trim(),
        role: parsed.context.actor.role.trim(),
      },
      approvals: (parsed.context.approvals ?? []).map((value) => value.trim()),
      requiredApprovals: (parsed.context.requiredApprovals ?? []).map((value) =>
        value.trim(),
      ),
      requiredFacts: (parsed.context.requiredFacts ?? []).map((value) =>
        value.trim(),
      ),
      reversibility: parsed.context.reversibility,
      blastRadius: parsed.context.blastRadius,
      costOfWrong: parsed.context.costOfWrong,
      requestedAt: parsed.context.requestedAt.trim(),
      additionalFacts: parsed.context.additionalFacts ?? {},
      evidence: {
        stale: parsed.context.evidence?.stale ?? false,
        conflicting: parsed.context.evidence?.conflicting ?? false,
      },
    },
  } satisfies DecisionRequest;

  return DecisionRequestSchema.parse(normalized);
}

export function normalizePolicyRules(input: unknown): PolicyRule[] {
  const rules = Array.isArray(input) ? input : [];
  return rules.map((rule) => {
    const parsed = PolicyRuleSchema.parse(rule);
    return PolicyRuleSchema.parse({
      ...parsed,
      code: parsed.code.trim().toUpperCase(),
      description: parsed.description.trim(),
      conditions: parsed.conditions.map((condition) => ({
        ...condition,
        field: condition.field.trim(),
      })),
    });
  });
}
