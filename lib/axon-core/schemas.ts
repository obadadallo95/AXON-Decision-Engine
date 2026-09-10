import { z } from "zod";
import {
  DECISION_STATES,
  FAILURE_STATES,
  type JsonObject,
  type JsonValue,
} from "./types";

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const JsonObjectSchema: z.ZodType<JsonObject> = z.record(
  z.string(),
  JsonValueSchema,
);

export const DecisionStateSchema = z.enum(DECISION_STATES);
export const FailureStateSchema = z.enum(FAILURE_STATES);

export const EnvironmentSchema = z.enum([
  "development",
  "staging",
  "production",
]);

export const EnvironmentInputSchema = z.enum([
  "development",
  "staging",
  "production",
  "dev",
  "stage",
  "prod",
]);

export const ActorContextSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    role: z.string().trim().min(1).max(80),
  })
  .strict();

export const ProposedActionSchema = z
  .object({
    domain: z.string().trim().min(1).max(80),
    operation: z.string().trim().min(1).max(160),
    target: z.string().trim().min(1).max(500),
    parameters: JsonObjectSchema.default({}),
  })
  .strict();

const DecisionContextShape = {
  actor: ActorContextSchema,
  approvals: z.array(z.string().trim().min(1).max(128)).max(100).default([]),
  requiredApprovals: z
    .array(z.string().trim().min(1).max(128))
    .max(100)
    .default([]),
  requiredFacts: z.array(z.string().trim().min(1).max(128)).max(100).default([]),
  reversibility: z.enum([
    "reversible",
    "partially_reversible",
    "irreversible",
  ]),
  blastRadius: z.enum(["low", "medium", "high"]),
  costOfWrong: z.enum(["low", "medium", "high", "critical"]),
  requestedAt: z.string().trim().min(1).max(80),
  additionalFacts: JsonObjectSchema.default({}),
  evidence: z
    .object({
      stale: z.boolean().default(false),
      conflicting: z.boolean().default(false),
    })
    .strict()
    .default({ stale: false, conflicting: false }),
};

export const DecisionContextSchema = z
  .object({
    environment: EnvironmentSchema,
    ...DecisionContextShape,
  })
  .strict();

export const DecisionContextInputSchema = z
  .object({
    environment: EnvironmentInputSchema,
    ...DecisionContextShape,
  })
  .strict();

export const DecisionRequestSchema = z
  .object({
    requestId: z.string().trim().min(1).max(128),
    action: ProposedActionSchema,
    context: DecisionContextSchema,
  })
  .strict();

export const DecisionRequestInputSchema = z
  .object({
    requestId: z.string().trim().min(1).max(128),
    action: ProposedActionSchema,
    context: DecisionContextInputSchema,
  })
  .strict();

export const DecisionSignalsSchema = z
  .object({
    confidence: z.number().finite().min(0).max(1),
    riskScore: z.number().int().min(0).max(100),
    uncertainty: z.array(z.string().trim().min(1).max(200)).max(100),
    missingInformation: z
      .array(z.string().trim().min(1).max(128))
      .max(100),
    reversibility: z.enum([
      "reversible",
      "partially_reversible",
      "irreversible",
    ]),
    blastRadius: z.enum(["low", "medium", "high"]),
    costOfWrong: z.enum(["low", "medium", "high", "critical"]),
    requiredApprovalMissing: z.boolean(),
    staleEvidence: z.boolean(),
    conflictingEvidence: z.boolean(),
    privileged: z.boolean(),
    destructive: z.boolean(),
    externallyVisible: z.boolean(),
  })
  .strict();

const PolicyConditionSchema = z
  .object({
    field: z.string().regex(/^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/),
    operator: z.enum([
      "equals",
      "not_equals",
      "contains",
      "gte",
      "lte",
      "exists",
    ]),
    value: JsonValueSchema.optional(),
  })
  .strict()
  .superRefine((condition, context) => {
    if (condition.operator !== "exists" && condition.value === undefined) {
      context.addIssue({
        code: "custom",
        path: ["value"],
        message: "This operator requires a value",
      });
    }
  });

export const PolicyRuleSchema = z
  .object({
    code: z.string().regex(/^[A-Z][A-Z0-9_-]{1,31}$/),
    description: z.string().trim().min(1).max(1000),
    priority: z.number().int().min(0).max(10000),
    enabled: z.boolean().default(true),
    hard: z.boolean().default(false),
    effect: DecisionStateSchema,
    conditions: z.array(PolicyConditionSchema).min(1).max(20),
    requiredEvidence: z
      .array(z.string().trim().min(1).max(128))
      .max(20)
      .optional(),
  })
  .strict()
  .superRefine((rule, context) => {
    if (rule.hard && rule.effect !== "REFUSE") {
      context.addIssue({
        code: "custom",
        path: ["effect"],
        message: "Hard rules must have REFUSE effect",
      });
    }
  });

export const PolicyEvaluationSchema = z
  .object({
    ruleCode: z.string().min(1),
    matched: z.boolean(),
    effect: DecisionStateSchema,
    reason: z.string().min(1),
    deterministic: z.literal(true),
  })
  .strict();

export const DecisionOutcomeSchema = z
  .object({
    state: DecisionStateSchema,
    riskScore: z.number().int().min(0).max(100),
    confidence: z.number().finite().min(0).max(1),
    uncertainty: z.array(z.string().min(1)).max(100),
    missingInformation: z.array(z.string().min(1)).max(100),
    reversibility: z.enum([
      "reversible",
      "partially_reversible",
      "irreversible",
    ]),
    blastRadius: z.enum(["low", "medium", "high"]),
    costOfWrong: z.enum(["low", "medium", "high", "critical"]),
    matchedRuleCodes: z.array(z.string().min(1)).max(100),
    policyEvaluations: z.array(PolicyEvaluationSchema).max(100),
    reasonCodes: z.array(z.string().min(1)).max(100),
    failureState: FailureStateSchema.nullable(),
    authoritative: z.literal("deterministic"),
  })
  .strict();

export { JsonValueSchema, PolicyConditionSchema };
