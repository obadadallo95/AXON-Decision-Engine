import { scenarioCatalog } from "./domains";

export interface EvaluationScenario {
  id: string;
  domain: string;
  category: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  expectedState: string;
  expectedExplanationEn: string;
  expectedExplanationAr: string;
  policyVersion: string;
  prompt: string;
  promptEn: string;
  promptAr: string;
}

// The dashboard keeps this small compatibility projection while the server
// owns fixture loading and execution through /api/scenarios/run.
export const evaluationScenarios: EvaluationScenario[] = scenarioCatalog.map((scenario) => ({
  id: scenario.id,
  domain: scenario.domain,
  category: scenario.domain,
  titleEn: scenario.titleEn,
  titleAr: scenario.titleAr,
  descriptionEn: scenario.descriptionEn,
  descriptionAr: scenario.descriptionAr,
  expectedState: scenario.expectedState,
  expectedExplanationEn: scenario.expectedExplanationEn,
  expectedExplanationAr: scenario.expectedExplanationAr,
  policyVersion: scenario.policyVersion,
  prompt: scenario.previewEn,
  promptEn: scenario.previewEn,
  promptAr: scenario.previewAr,
}));
