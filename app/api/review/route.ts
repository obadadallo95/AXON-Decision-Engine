import { NextResponse } from "next/server";
import { z } from "zod";
import { ActorContextSchema } from "@/lib/axon-core";
import {
  AuditRepositoryError,
  serverAuditRepository,
} from "@/server/audit-repository";

const ReviewRequestSchema = z
  .object({
    requestId: z.string().trim().min(1).max(128),
    decisionEventId: z.string().trim().min(1).max(128),
    action: z.enum(["APPROVE", "REJECT"]),
    reviewer: ActorContextSchema,
    reason: z.string().trim().min(1).max(2000),
  })
  .strict();

function authorized(request: Request): boolean {
  const expectedKey = process.env.AXON_API_KEY;
  return !expectedKey || request.headers.get("authorization") === `Bearer ${expectedKey}`;
}

function errorStatus(code: string): number {
  if (code === "AUDIT_NOT_FOUND") return 404;
  if (code === "AUDIT_WRITE_FAILED") return 503;
  return 409;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API Key." },
      { status: 401 },
    );
  }

  try {
    const input = ReviewRequestSchema.parse(await request.json());
    const reviewEvent = await serverAuditRepository.appendReviewEvent({
      requestId: input.requestId,
      decisionEventId: input.decisionEventId,
      reviewer: input.reviewer,
      action: input.action,
      reason: input.reason,
      timestamp: new Date().toISOString(),
    });
    const audit = await serverAuditRepository.getDecisionAudit(input.requestId);
    return NextResponse.json({
      requestId: input.requestId,
      decisionEventId: input.decisionEventId,
      reviewEvent,
      effectiveReviewStatus: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
      audit,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "INVALID_REVIEW_REQUEST" },
        { status: 400 },
      );
    }
    if (error instanceof AuditRepositoryError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: errorStatus(error.code) },
      );
    }
    console.error(
      "AXON review API error:",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
