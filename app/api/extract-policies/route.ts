import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

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
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "application/pdf";

    const ai = getGeminiClient();

    const systemInstruction = `
You are an expert Security and Compliance Policy Extraction engine for AXON.
Your task is to read the attached corporate policy document (handbook, security rules, compliance manual) and extract all actionable security policies and guardrails into a structured format.

For each policy, you must extract:
1. A concise, uppercase policy code (e.g., "SEC-001", "DB-RESTRICT-01").
2. A clear, precise description in English.
3. An accurate, professional translation of the description in Arabic.

Ignore generic company history or fluff. Focus ONLY on actionable rules, restrictions, governance protocols, and security guardrails.

You must respond strictly with a JSON array conforming to the specified response schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        "Please extract all security policies and rules from this document into structured JSON."
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: {
                type: Type.STRING
              },
              descriptionEn: {
                type: Type.STRING
              },
              descriptionAr: {
                type: Type.STRING
              }
            },
            required: ["code", "descriptionEn", "descriptionAr"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const policies = JSON.parse(text);

    return NextResponse.json({ policies });

  } catch (error: any) {
    console.error("AXON Policy Extraction API Error:", error);
    return NextResponse.json({
      error: error.message || "An internal error occurred during document extraction."
    }, { status: 500 });
  }
}
