import { NextResponse } from "next/server";
import { AuditRepositoryError, serverAuditRepository } from "@/server/audit-repository";

function authorized(request: Request): boolean {
  const expectedKey = process.env.AXON_API_KEY;
  return !expectedKey || request.headers.get("authorization") === `Bearer ${expectedKey}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API Key." },
      { status: 401 },
    );
  }

  try {
    const url = new URL(request.url);
    const requestId = url.searchParams.get("requestId");
    if (requestId) {
      const audit = await serverAuditRepository.getDecisionAudit(requestId);
      if (!audit) return NextResponse.json({ error: "AUDIT_NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ audit });
    }

    const parsedLimit = Number(url.searchParams.get("limit") ?? "100");
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(100, Math.max(1, Math.floor(parsedLimit)))
      : 100;
    const records = await serverAuditRepository.listRecentAuditRecords(limit);
    const audits = await Promise.all(
      records.map((record) => serverAuditRepository.getDecisionAudit(record.requestId)),
    );
    return NextResponse.json({
      records,
      audits: audits.filter((audit): audit is NonNullable<typeof audit> => audit !== null),
    });
  } catch (error) {
    if (error instanceof AuditRepositoryError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 503 },
      );
    }
    console.error(
      "AXON audit API error:",
      error instanceof Error ? error.message : "UNKNOWN",
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
