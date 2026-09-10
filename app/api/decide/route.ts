import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DecisionContextInputSchema,
  deriveDecisionSignals,
  evaluateDecisionWithSignals,
  normalizeDecisionRequest,
  ProposedActionSchema,
  PolicyRuleSchema,
  reconcileDecisionSignals,
  safeEvaluateDecision,
} from "@/lib/axon-core";
import type {
  AdvisoryInterpretation,
  DecisionRequest,
  DecisionState,
  JsonObject,
  PolicyRule,
} from "@/lib/axon-core";
import {
  advisoryFromProviderFailure,
  geminiAdvisoryProvider,
  policySummaries,
} from "@/server/advisory-provider";

const LegacyPolicySchema = z
  .object({
    code: z.string().min(1).max(32),
    descriptionEn: z.string().max(2000),
    descriptionAr: z.string().max(2000),
  })
  .passthrough();

const StructuredRequestSchema = z
  .object({
    requestId: z.string().min(1).max(128),
    action: ProposedActionSchema,
    context: DecisionContextInputSchema,
    policies: z.array(PolicyRuleSchema).max(100).default([]),
  })
  .strict();

const LegacyRequestSchema = z
  .object({
    requestId: z.string().min(1).max(128).optional(),
    prompt: z.string().trim().min(1).max(10000),
    policies: z.array(LegacyPolicySchema).max(100).default([]),
    context: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

const LEGACY_EPOCH = "1970-01-01T00:00:00.000Z";

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      )
    : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function legacyRequest(input: z.infer<typeof LegacyRequestSchema>): unknown {
  const context = input.context;
  const environment = stringValue(context.environment, "development");
  const target = stringValue(context.target, "unspecified");
  const hasEnvironment = [
    "development",
    "staging",
    "production",
    "dev",
    "stage",
    "prod",
  ].includes(environment);
  const hasTarget = target !== "unspecified";
  const actorValue = context.actor;
  const actor =
    actorValue && typeof actorValue === "object"
      ? (actorValue as Record<string, unknown>)
      : {};
  const evidence = objectValue(context.evidence);

  return {
    requestId: input.requestId ?? "legacy-request",
    action: {
      domain: stringValue(context.domain, "general"),
      operation: stringValue(context.operation, "legacy.evaluate"),
      target,
      parameters: { legacyPrompt: input.prompt },
    },
    context: {
      environment: hasEnvironment ? environment : "development",
      actor: {
        id: stringValue(actor.id, "legacy-client"),
        role: stringValue(actor.role, "operator"),
      },
      approvals: stringList(context.approvals),
      requiredApprovals: stringList(context.requiredApprovals),
      requiredFacts: [
        ...(!hasEnvironment ? ["environment"] : []),
        ...(!hasTarget ? ["target"] : []),
        ...stringList(context.requiredFacts),
      ],
      reversibility: stringValue(
        context.reversibility,
        "partially_reversible",
      ),
      blastRadius: stringValue(context.blastRadius, "medium"),
      costOfWrong: stringValue(context.costOfWrong, "high"),
      requestedAt: stringValue(context.requestedAt, LEGACY_EPOCH),
      additionalFacts: {
        ...(context as unknown as JsonObject),
        __axonLegacy: true,
      },
      evidence: {
        stale: evidence.stale === true,
        conflicting: evidence.conflicting === true,
      },
      evidenceItems: Array.isArray(evidence.items) ? evidence.items : [],
    },
  };
}

function legacyDecision(
  state: DecisionState,
): "ALLOW" | "DENY" | "NEEDS_CLARIFICATION" | "ESCALATE_TO_HUMAN" {
  switch (state) {
    case "EXECUTE":
      return "ALLOW";
    case "REFUSE":
      return "DENY";
    case "ASK":
      return "NEEDS_CLARIFICATION";
    case "DEFER":
    case "ESCALATE":
      return "ESCALATE_TO_HUMAN";
  }
}

function responseFor(
  outcome: ReturnType<typeof safeEvaluateDecision>,
  request: DecisionRequest,
  advisory: AdvisoryInterpretation,
  legacyPolicyCount = 0,
) {
  const legacy = legacyDecision(outcome.state);
  const reasonCodes = outcome.reasonCodes.length
    ? outcome.reasonCodes.join(", ")
    : "NONE";
  const executable = outcome.state === "EXECUTE";

  return {
    state: outcome.state,
    outcome,
    authoritativeDecision: outcome,
    advisoryInterpretation: advisory,
    decision: legacy,
    execute: executable,
    riskScore: outcome.riskScore,
    confidence: outcome.confidence,
    uncertainty: outcome.uncertainty,
    missingInformation: outcome.missingInformation,
    reversibility: outcome.reversibility,
    blastRadius: outcome.blastRadius,
    costOfWrong: outcome.costOfWrong,
    reasonEn: `Deterministic AXON decision: ${outcome.state}. Reason codes: ${reasonCodes}.`,
    reasonAr: `قرار أكسون المحدد حتمياً: ${outcome.state}.`,
    mitigationEn: executable
      ? "Proceed only through the caller's controlled execution boundary."
      : "Do not execute until the returned state requirements are satisfied.",
    mitigationAr: executable
      ? "تابع فقط عبر حدود التنفيذ الخاضعة للضبط لدى المستدعي."
      : "لا تنفذ الإجراء حتى استيفاء متطلبات الحالة المحددة.",
    groundingEn:
      advisory.status === "success"
        ? "Gemini is not authoritative; it interpreted bounded action data as an advisory. Deterministic AXON policy evaluation remains authoritative."
        : "Gemini is not authoritative; its advisory was unavailable or invalid. Deterministic AXON policy evaluation remains authoritative and fail-closed.",
    groundingAr:
      advisory.status === "success"
        ? "قام Gemini بتفسير بيانات الإجراء المحدودة كاستشارة. يظل تقييم أكسون الحتمي للسياسات هو المرجع."
        : "تعذرت استشارة Gemini أو كانت غير صالحة؛ يظل تقييم أكسون الحتمي للسياسات هو المرجع وبنهج آمن.",
    citations: [],
    matchedPolicyCodes: outcome.matchedRuleCodes,
    requestClassificationEn: request.action.domain,
    requestClassificationAr: "غير محدد",
    legacyPolicyCount,
  };
}

async function evaluateWithAdvisory(
  request: DecisionRequest,
  rules: PolicyRule[],
  legacyPolicySummaries: { code: string; description: string }[],
  allowLegacyInference: boolean,
): Promise<{
  outcome: ReturnType<typeof safeEvaluateDecision>;
  request: DecisionRequest;
  advisory: AdvisoryInterpretation;
}> {
  const explicitSignals = deriveDecisionSignals(request);
  let advisory: AdvisoryInterpretation;
  try {
    advisory = await geminiAdvisoryProvider.interpret({
      request,
      explicitSignals,
      evidence: request.context.evidenceItems ?? [],
      policySummaries: legacyPolicySummaries,
    });
  } catch (error) {
    advisory = advisoryFromProviderFailure(error);
  }

  const reconciled = reconcileDecisionSignals(
    request,
    advisory,
    allowLegacyInference,
  );
  try {
    return {
      outcome: evaluateDecisionWithSignals(
        reconciled.request,
        rules,
        reconciled.signals,
      ),
      request: reconciled.request,
      advisory,
    };
  } catch (error) {
    return {
      outcome: safeEvaluateDecision(reconciled.request, rules),
      request: reconciled.request,
      advisory: advisoryFromProviderFailure(error),
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const expectedKey = process.env.AXON_API_KEY;
    if (expectedKey) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${expectedKey}`) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid or missing API Key." },
          { status: 401 },
        );
      }
    }

    const body: unknown = await req.json();
    const structured = StructuredRequestSchema.safeParse(body);
    if (structured.success) {
      const request = normalizeDecisionRequest({
        requestId: structured.data.requestId,
        action: structured.data.action,
        context: structured.data.context,
      });
      const evaluated = await evaluateWithAdvisory(
        request,
        structured.data.policies,
        policySummaries(structured.data.policies),
        false,
      );
      return NextResponse.json(
        responseFor(evaluated.outcome, evaluated.request, evaluated.advisory),
      );
    }

    const legacy = LegacyRequestSchema.parse(body);
    const request = normalizeDecisionRequest(legacyRequest(legacy));
    const evaluated = await evaluateWithAdvisory(
      request,
      [],
      legacy.policies.map((policy) => ({
        code: policy.code,
        description: policy.descriptionEn,
      })),
      true,
    );
    return NextResponse.json(
      responseFor(
        evaluated.outcome,
        evaluated.request,
        evaluated.advisory,
        legacy.policies.length,
      ),
    );
  } catch (error) {
    console.error(
      "AXON deterministic decision API error:",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        state: "ASK",
        decision: "NEEDS_CLARIFICATION",
        execute: false,
      },
      { status: 400 },
    );
  }
}
