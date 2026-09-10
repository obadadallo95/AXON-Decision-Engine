export type RiskBand = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export function riskBand(score: number): RiskBand {
  if (score < 25) return "LOW";
  if (score < 50) return "MODERATE";
  if (score < 75) return "HIGH";
  return "CRITICAL";
}
