import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { DecisionState } from "@/lib/axon-core";
import { adaptScenario, getScenario, metadataOf } from "@/lib/domains";
import { DecisionServiceError, decisionService } from "@/server/decision-service";

const ScenarioRunRequestSchema = z
  .object({
    scenarioId: z.string().trim().min(1).max(128),
    idempotencyKey: z.string().trim().min(1).max(128).optional(),
  })
  .strict();

function authorized(request: NextRequest): boolean {
  const expectedKey = process.env.AXON_API_KEY;
  return !expectedKey || request.headers.get("authorization") === `Bearer ${expectedKey}`;
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

export async function POST(request: NextRequest) {
  try {
    if (!authorized(request)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing API Key." },
        { status: 401 },
      );
    }

    const body = ScenarioRunRequestSchema.parse(await request.json());
    const scenario = getScenario(body.scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { error: "SCENARIO_NOT_FOUND", message: "The requested scenario does not exist." },
        { status: 404 },
      );
    }

    const scenarioRequest = adaptScenario(scenario);
    const evaluated = await decisionService.decide({
      request: scenarioRequest,
      policies: scenario.policies,
      idempotencyKey: body.idempotencyKey ?? `scenario-${scenario.id}`,
      policyVersion: scenario.policyVersion,
    });
    const reasonCodes = evaluated.outcome.reasonCodes.length
      ? evaluated.outcome.reasonCodes.join(", ")
      : "NONE";
    const metadata = metadataOf(scenario);
    const executable = evaluated.outcome.state === "EXECUTE";

    return NextResponse.json(
      {
        scenario: metadata,
        requestId: evaluated.request.requestId,
        state: evaluated.outcome.state,
        outcome: evaluated.outcome,
        authoritativeDecision: evaluated.outcome,
        advisoryInterpretation: evaluated.advisory,
        auditEventId: evaluated.auditEventId,
        idempotencyKey: evaluated.idempotencyKey,
        replayed: evaluated.replayed,
        integrity: evaluated.integrity,
        decision: legacyDecision(evaluated.outcome.state),
        execute: executable,
        riskScore: evaluated.outcome.riskScore,
        confidence: evaluated.outcome.confidence,
        uncertainty: evaluated.outcome.uncertainty,
        missingInformation: evaluated.outcome.missingInformation,
        reversibility: evaluated.outcome.reversibility,
        blastRadius: evaluated.outcome.blastRadius,
        costOfWrong: evaluated.outcome.costOfWrong,
        reasonEn: `Deterministic AXON decision: ${evaluated.outcome.state}. Reason codes: ${reasonCodes}.`,
        reasonAr: `قرار أكسون المحدد حتمياً: ${evaluated.outcome.state}.`,
        mitigationEn: executable
          ? "Proceed only through the controlled domain executor after this audit record is accepted."
          : "Do not execute until the returned state requirements are satisfied and, when escalated, a reviewer records a decision.",
        mitigationAr: executable
          ? "تابع فقط عبر منفذ المجال الخاضع للضبط بعد قبول سجل التدقيق."
          : "لا تنفذ الإجراء حتى استيفاء متطلبات الحالة وتسجيل قرار المراجع عند التصعيد.",
        groundingEn:
          evaluated.advisory.status === "success"
            ? "Gemini supplied advisory interpretation only; deterministic domain policy evaluation remains authoritative."
            : "Gemini was unavailable or invalid; deterministic domain policy evaluation remains authoritative and fail-closed.",
        groundingAr:
          evaluated.advisory.status === "success"
            ? "قدم Gemini تفسيراً استشارياً فقط؛ يظل تقييم سياسة المجال الحتمي هو المرجع."
            : "تعذرت استشارة Gemini أو كانت غير صالحة؛ يظل تقييم سياسة المجال الحتمي هو المرجع وبنهج آمن.",
        citations: [],
        matchedPolicyCodes: evaluated.outcome.matchedRuleCodes,
        policyCodes: scenario.policies.map((policy) => policy.code),
        policyVersion: scenario.policyVersion,
        requestClassificationEn: scenario.domain,
        requestClassificationAr: "غير محدد",
        evidence: evaluated.request.context.evidenceItems ?? [],
        expectedState: scenario.expectedState,
        expectedStateMatches: evaluated.outcome.state === scenario.expectedState,
      },
      { status: evaluated.outcome.failureState === "AUDIT_WRITE_FAILED" ? 503 : 200 },
    );
  } catch (error) {
    if (error instanceof DecisionServiceError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.code === "IDEMPOTENCY_CONFLICT" ? 409 : 400 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "scenarioId is required." },
        { status: 400 },
      );
    }
    console.error(
      "AXON scenario runner error:",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    return NextResponse.json(
      { error: "INTERNAL_ERROR", state: "DEFER", execute: false },
      { status: 500 },
    );
  }
}
