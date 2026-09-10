import { NextRequest, NextResponse } from "next/server";
import { listScenarioMetadata } from "@/lib/domains";

function authorized(request: NextRequest): boolean {
  const expectedKey = process.env.AXON_API_KEY;
  return !expectedKey || request.headers.get("authorization") === `Bearer ${expectedKey}`;
}
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing API Key." },
      { status: 401 },
    );
  }

  return NextResponse.json({ scenarios: listScenarioMetadata() });
}
