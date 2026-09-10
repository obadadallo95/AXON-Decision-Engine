import { syntheticEvidence } from "@/lib/domains/common";
import type { DomainScenario } from "@/lib/domains/common";
import { adaptCodeDeployment } from "./adapter";
import { codeDeploymentPolicies, CODE_DEPLOYMENT_POLICY_VERSION } from "./policies";
import { CodeDeploymentInputSchema, type CodeDeploymentInput } from "./schema";

const now = "2026-09-10T10:00:00.000Z";
const validUntil = "2026-09-10T18:00:00.000Z";

function evidence(id: string, summary: string) {
  return syntheticEvidence({
    id,
    kind: "deployment-control",
    source: "release-control-plane",
    summary,
    observedAt: now,
    validUntil,
    supports: ["deploy-artifact"],
  });
}

function scenario(
  metadata: Omit<DomainScenario<CodeDeploymentInput>, "input" | "evidence" | "policies" | "adapt">,
  input: CodeDeploymentInput,
  evidenceItems: DomainScenario<CodeDeploymentInput>["evidence"],
): DomainScenario<CodeDeploymentInput> {
  return {
    ...metadata,
    input: CodeDeploymentInputSchema.parse(input),
    evidence: evidenceItems,
    policies: codeDeploymentPolicies,
    adapt: adaptCodeDeployment,
  };
}

const base: CodeDeploymentInput = {
  requestId: "deploy-base",
  service: "checkout-api",
  environment: "staging",
  changeType: "bugfix",
  artifactSigned: true,
  testsPassed: true,
  rollbackAvailable: true,
  deploymentWindowOpen: true,
  freezeActive: false,
  emergencyException: false,
  approverIds: [],
  incidentId: null,
  changeTicketId: "CHG-2048",
  dependencyHealth: "healthy",
  changeSize: "small",
  productionImpact: "none",
  requestedAt: now,
};

export const codeDeploymentScenarios: DomainScenario<CodeDeploymentInput>[] = [
  scenario(
    {
      id: "deploy-safe-release",
      domain: "code-deployment",
      titleEn: "Safe staging release",
      titleAr: "إصدار آمن إلى بيئة التجربة",
      descriptionEn: "A signed, tested, reversible staging bug fix with a change ticket.",
      descriptionAr: "إصلاح مختبر وموقّع وقابل للتراجع في بيئة التجربة مع تذكرة تغيير.",
      previewEn: "Deploy the signed checkout API bug fix to staging.",
      previewAr: "نشر إصلاح checkout API الموقّع إلى بيئة التجربة.",
      expectedState: "EXECUTE",
      expectedExplanationEn: "All required release facts are present and no blocking policy matches.",
      expectedExplanationAr: "جميع حقائق الإصدار المطلوبة موجودة ولا توجد سياسة مانعة.",
      policyVersion: CODE_DEPLOYMENT_POLICY_VERSION,
    },
    { ...base, requestId: "deploy-safe-release" },
    [evidence("deploy-safe-artifact", "Artifact signature and release checks verified.")],
  ),
  scenario(
    {
      id: "deploy-missing-context",
      domain: "code-deployment",
      titleEn: "Deployment missing release context",
      titleAr: "نشر يفتقد سياق الإصدار",
      descriptionEn: "The service, environment, and change ticket are not supplied.",
      descriptionAr: "لم يتم توفير الخدمة أو البيئة أو تذكرة التغيير.",
      previewEn: "Deploy an artifact without a service, environment, or change ticket.",
      previewAr: "نشر أثر برمجي دون خدمة أو بيئة أو تذكرة تغيير.",
      expectedState: "ASK",
      expectedExplanationEn: "AXON asks for the missing facts before evaluating deployment safety.",
      expectedExplanationAr: "يطلب أكسون الحقائق الناقصة قبل تقييم أمان النشر.",
      policyVersion: CODE_DEPLOYMENT_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "deploy-missing-context",
      service: null,
      environment: null,
      changeTicketId: null,
    },
    [evidence("deploy-context-request", "Release control plane could not resolve deployment context.")],
  ),
  scenario(
    {
      id: "deploy-freeze-window",
      domain: "code-deployment",
      titleEn: "Production freeze window",
      titleAr: "نافذة تجميد الإنتاج",
      descriptionEn: "A routine production deployment is requested while the freeze is active.",
      descriptionAr: "تم طلب نشر إنتاج روتيني أثناء تفعيل التجميد.",
      previewEn: "Deploy a routine production patch during the release freeze.",
      previewAr: "نشر تصحيح إنتاج روتيني أثناء تجميد الإصدار.",
      expectedState: "DEFER",
      expectedExplanationEn: "The release is held until the freeze window reopens or an exception is recorded.",
      expectedExplanationAr: "يؤجل الإصدار حتى انتهاء التجميد أو تسجيل استثناء.",
      policyVersion: CODE_DEPLOYMENT_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "deploy-freeze-window",
      environment: "production",
      freezeActive: true,
      changeType: "security_patch",
      productionImpact: "low",
    },
    [evidence("deploy-freeze-status", "Release calendar reports an active production freeze.")],
  ),
  scenario(
    {
      id: "deploy-human-approval",
      domain: "code-deployment",
      titleEn: "High-impact release awaiting approval",
      titleAr: "إصدار عالي التأثير بانتظار الموافقة",
      descriptionEn: "A large production change is complete but has no release approver.",
      descriptionAr: "تغيير إنتاج كبير مكتمل لكنه لا يملك موافق إصدار.",
      previewEn: "Deploy a large checkout API change to production without approval.",
      previewAr: "نشر تغيير كبير في checkout API إلى الإنتاج دون موافقة.",
      expectedState: "ESCALATE",
      expectedExplanationEn: "The missing release approval requires the real review queue.",
      expectedExplanationAr: "تتطلب موافقة الإصدار الناقصة قائمة المراجعة الفعلية.",
      policyVersion: CODE_DEPLOYMENT_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "deploy-human-approval",
      environment: "production",
      changeSize: "large",
      productionImpact: "high",
    },
    [evidence("deploy-approval-status", "Change checks passed; no release approval is recorded.")],
  ),
  scenario(
    {
      id: "deploy-unsigned-artifact",
      domain: "code-deployment",
      titleEn: "Unsigned production artifact",
      titleAr: "أثر إنتاج غير موقّع",
      descriptionEn: "A production artifact lacks a verifiable signature even though other checks passed.",
      descriptionAr: "يفتقد أثر الإنتاج توقيعاً قابلاً للتحقق رغم نجاح الفحوصات الأخرى.",
      previewEn: "Deploy an unsigned artifact to production.",
      previewAr: "نشر أثر غير موقّع إلى الإنتاج.",
      expectedState: "REFUSE",
      expectedExplanationEn: "The hard artifact-signature policy prevents execution.",
      expectedExplanationAr: "تمنع سياسة توقيع الأثر الصارمة التنفيذ.",
      policyVersion: CODE_DEPLOYMENT_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "deploy-unsigned-artifact",
      environment: "production",
      artifactSigned: false,
      productionImpact: "low",
    },
    [evidence("deploy-signature-check", "Artifact registry reports no trusted signature." )],
  ),
];
