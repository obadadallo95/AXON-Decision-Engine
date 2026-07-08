import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Handle lazy initialization as required by next.js guidelines
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    // Basic API Key Auth for external SDK usage
    const expectedKey = process.env.AXON_API_KEY;
    if (expectedKey) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
        return NextResponse.json({ error: "Unauthorized: Invalid or missing API Key." }, { status: 401 });
      }
    }

    const { prompt, policies } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Action request description is required." }, { status: 400 });
    }

    const ai = getGeminiClient();

    const policiesStr = (policies || [])
      .map((p: any) => `[${p.code}] ${p.descriptionEn} (العربية: ${p.descriptionAr})`)
      .join("\n");

    const systemInstruction = `
You are the core of AXON, a serious, high-integrity AI decision and security governance engine.
Your purpose is to evaluate organization-critical system action requests against active operational guardrails (policies) and perform an objective safety analysis.

Active Policies/Guardrails:
${policiesStr}

You must evaluate the user's action request carefully. Use Google Search grounding to verify the safety and context of the request (e.g., look up library versions, vulnerability databases, safe deployment windows, CVE databases, API breaking changes, etc.).
Determine the final decision:
- ALLOW: If the action is completely safe, aligns with policies, and carries zero/low risk.
- DENY: If the action violates an active policy directly or poses an unacceptable, unmitigated critical security risk.
- NEEDS_CLARIFICATION: If the action description is vague, lacks critical parameters (like target servers, versions, or rollback strategies), or lacks enough context to make a definitive ruling.
- ESCALATE_TO_HUMAN: If the action is high risk, requires manual review, contains a minor policy conflict that can be cleared by a Human Governance Reviewer, or is a major infrastructure upgrade that requires dual-signoff.

Ensure you provide:
1. An objective risk score from 0 to 100 representing the security risk.
2. Explanations of reasoning in both English and Arabic.
3. Recommended safety alternative/mitigation in both English and Arabic.
4. Grounding evidence (quotes from Google Search or specific CVE/version facts) in both English and Arabic.

The Arabic translation must be native-quality, serious, professional, and precise. Avoid direct literal translation and avoid machine-like patterns. Keep the Arabic text flow natural, highly technical, and appropriate for corporate executive huddles.

You MUST respond strictly with a single JSON object conforming to the specified response schema. No surrounding markdown, no backticks.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: {
              type: Type.STRING,
              enum: ['ALLOW', 'DENY', 'NEEDS_CLARIFICATION', 'ESCALATE_TO_HUMAN']
            },
            riskScore: {
              type: Type.INTEGER
            },
            reasonEn: {
              type: Type.STRING
            },
            reasonAr: {
              type: Type.STRING
            },
            mitigationEn: {
              type: Type.STRING
            },
            mitigationAr: {
              type: Type.STRING
            },
            groundingEn: {
              type: Type.STRING
            },
            groundingAr: {
              type: Type.STRING
            }
          },
          required: ['decision', 'riskScore', 'reasonEn', 'reasonAr', 'mitigationEn', 'mitigationAr', 'groundingEn', 'groundingAr']
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    // Extract citation URLs if Google Search was utilized
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let citations: string[] = [];
    if (chunks) {
      citations = chunks
        .map((chunk: any) => chunk.web?.uri)
        .filter((uri: any) => !!uri);
    }

    return NextResponse.json({
      ...data,
      citations
    });

  } catch (error: any) {
    console.error("AXON Decision Engine API Error:", error);
    return NextResponse.json({
      error: error.message || "An internal error occurred during decision analysis."
    }, { status: 500 });
  }
}
