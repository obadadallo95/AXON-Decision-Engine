import { z } from "zod";
import {
  type AdvisoryInterpretation,
  type AdvisoryInferredSignals,
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

export const EvidenceItemSchema = z
  .object({
    id: z.string().trim().min(1).max(128),
    kind: z.string().trim().min(1).max(80),
    source: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(2000),
    observedAt: z.string().trim().min(1).max(80),
    validUntil: z.string().trim().max(80).nullable(),
    trust: z.enum(["trusted", "untrusted", "derived"]),
    contentHash: z.string().trim().min(1).max(256),
    supports: z.array(z.string().trim().min(1).max(128)).max(50).default([]),
    contradicts: z
      .array(z.string().trim().min(1).max(128))
      .max(50)
      .default([]),
  })
  .strict();

export const InferenceProvenanceSchema = z
  .object({
    source: z.enum(["explicit", "model_inference", "evidence"]),
    confidence: z.number().finite().min(0).max(1),
    rationale: z.string().trim().min(1).max(500),
    supportingEvidenceIds: z
      .array(z.string().trim().min(1).max(128))
      .max(20)
      .default([]),
  })
  .strict();

const inferredString = z
  .object({ value: z.string().trim().min(1).max(500), provenance: InferenceProvenanceSchema })
  .strict();
const inferredBoolean = z
  .object({ value: z.boolean(), provenance: InferenceProvenanceSchema })
  .strict();
const inferredEnvironment = z
  .object({
    value: z.enum(["development", "staging", "production", "unknown"]),
    provenance: InferenceProvenanceSchema,
  })
  .strict();
const inferredReversibility = z
  .object({
    value: z.enum(["reversible", "partially_reversible", "irreversible", "unknown"]),
    provenance: InferenceProvenanceSchema,
  })
  .strict();
const inferredBlastRadius = z
  .object({
    value: z.enum(["low", "medium", "high", "unknown"]),
    provenance: InferenceProvenanceSchema,
  })
  .strict();
const inferredCostOfWrong = z
  .object({
    value: z.enum(["low", "medium", "high", "critical", "unknown"]),
    provenance: InferenceProvenanceSchema,
  })
  .strict();

export const AdvisoryInferredSignalsSchema = z
  .object({
    normalizedAction: inferredString,
    inferredDomain: inferredString,
    inferredOperation: inferredString,
    inferredTarget: inferredString,
    inferredEnvironment,
    destructive: inferredBoolean,
    privileged: inferredBoolean,
    externallyVisible: inferredBoolean,
    inferredReversibility,
    inferredBlastRadius,
    inferredCostOfWrong,
  })
  .strict() satisfies z.ZodType<AdvisoryInferredSignals>;

export const EvidenceAssessmentSchema = z
  .object({
    evidenceId: z.string().trim().min(1).max(128),
    assessment: z.enum(["supports", "contradicts", "uncertain"]),
    confidence: z.number().finite().min(0).max(1),
    rationale: z.string().trim().min(1).max(500),
  })
  .strict();

const AdvisoryPayloadShape = {
  interpretationConfidence: z.number().finite().min(0).max(1),
  inferredSignals: AdvisoryInferredSignalsSchema,
  missingInformation: z.array(z.string().trim().min(1).max(200)).max(20),
  ambiguities: z.array(z.string().trim().min(1).max(500)).max(20),
  conflictingFacts: z.array(z.string().trim().min(1).max(500)).max(20),
  evidenceAssessment: z.array(EvidenceAssessmentSchema).max(50),
  saferAlternatives: z.array(z.string().trim().min(1).max(1000)).max(10),
  reasoningSummary: z.string().trim().min(1).max(2000),
};

export const GeminiAdvisoryPayloadSchema = z
  .object(AdvisoryPayloadShape)
  .strict();

export const AdvisoryInterpretationSchema = z
  .object({
    provider: z.string().trim().min(1).max(80),
    model: z.string().trim().max(160).nullable(),
    status: z.enum(["success", "unavailable", "invalid", "failed", "not_requested"]),
    ...AdvisoryPayloadShape,
    inferredSignals: AdvisoryInferredSignalsSchema.nullable(),
    unknownEvidenceIds: z.array(z.string().trim().min(1).max(128)).max(50),
  })
  .strict() satisfies z.ZodType<AdvisoryInterpretation>;

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
  evidenceItems: z.array(EvidenceItemSchema).max(100).default([]),
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
