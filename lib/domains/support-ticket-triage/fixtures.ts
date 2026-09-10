import { syntheticEvidence } from "@/lib/domains/common";
import type { DomainScenario } from "@/lib/domains/common";
import type { EvidenceItem } from "@/lib/axon-core";
import { adaptSupportTicketTriage } from "./adapter";
import { SUPPORT_TICKET_POLICY_VERSION, supportTicketTriagePolicies } from "./policies";
import { SupportTicketTriageInputSchema, type SupportTicketTriageInput } from "./schema";

const now = "2026-09-10T10:00:00.000Z";
const freshUntil = "2026-09-10T18:00:00.000Z";

function evidence(
  id: string,
  summary: string,
  options: { validUntil?: string; trust?: EvidenceItem["trust"] } = {},
) {
  return syntheticEvidence({
    id,
    kind: "support-control",
    source: "support-platform",
    summary,
    observedAt: now,
    validUntil: options.validUntil ?? freshUntil,
    trust: options.trust,
    supports: ["route"],
  });
}

function scenario(
  metadata: Omit<DomainScenario<SupportTicketTriageInput>, "input" | "evidence" | "policies" | "adapt">,
  input: SupportTicketTriageInput,
  evidenceItems: DomainScenario<SupportTicketTriageInput>["evidence"],
): DomainScenario<SupportTicketTriageInput> {
  return {
    ...metadata,
    input: SupportTicketTriageInputSchema.parse(input),
    evidence: evidenceItems,
    policies: supportTicketTriagePolicies,
    adapt: adaptSupportTicketTriage,
  };
}

const base: SupportTicketTriageInput = {
  requestId: "ticket-base",
  ticketId: "TCK-1001",
  category: "billing",
  tenantId: "tenant-acme",
  severity: "low",
  customerTier: "business",
  accountImpact: "single_user",
  securitySensitive: false,
  reproductionAvailable: true,
  requesterIdentityVerified: true,
  slaMinutes: 240,
  destinationQueue: "billing-tier-1",
  autoRouteAllowed: true,
  duplicateOf: null,
  incidentStatus: "none",
  routingSystemAvailable: true,
  requestedOperation: "route",
  authorizedToRequest: true,
  prohibitedAction: false,
  ticketBody: "Customer needs help understanding a duplicate invoice line.",
  requestedAt: now,
};

export const supportTicketTriageScenarios: DomainScenario<SupportTicketTriageInput>[] = [
  scenario(
    {
      id: "ticket-routine-route",
      domain: "support-ticket-triage",
      titleEn: "Routine billing route",
      titleAr: "توجيه فوترة روتيني",
      descriptionEn: "A verified low-severity billing ticket has complete routing context.",
      descriptionAr: "تذكرة فوترة منخفضة الخطورة وموثقة مع سياق توجيه مكتمل.",
      previewEn: "Route a verified routine billing ticket to tier-one support.",
      previewAr: "توجيه تذكرة فوترة روتينية موثقة إلى دعم المستوى الأول.",
      expectedState: "EXECUTE",
      expectedExplanationEn: "The ticket has complete facts, an available router, and an authorized reversible operation.",
      expectedExplanationAr: "تحتوي التذكرة على حقائق مكتملة وموجه متاح وعملية قابلة للتراجع ومصرح بها.",
      policyVersion: SUPPORT_TICKET_POLICY_VERSION,
    },
    { ...base, requestId: "ticket-routine-route" },
    [
      evidence("ticket-routine-context", "Support platform verified tenant, category, identity, and destination queue."),
      evidence("ticket-routine-body", "Customer-submitted ticket body describes an invoice question.", { trust: "untrusted" }),
    ],
  ),
  scenario(
    {
      id: "ticket-missing-context",
      domain: "support-ticket-triage",
      titleEn: "Ticket missing triage context",
      titleAr: "تذكرة تفتقد سياق الفرز",
      descriptionEn: "The ticket has no tenant or severity, and its technical reproduction details are absent.",
      descriptionAr: "لا تملك التذكرة مستأجراً أو درجة خطورة، كما تفتقد تفاصيل إعادة الإنتاج التقنية.",
      previewEn: "Route a technical ticket without tenant, severity, or reproduction details.",
      previewAr: "توجيه تذكرة تقنية دون مستأجر أو خطورة أو تفاصيل إعادة إنتاج.",
      expectedState: "ASK",
      expectedExplanationEn: "AXON asks for the missing triage facts before routing.",
      expectedExplanationAr: "يطلب أكسون حقائق الفرز الناقصة قبل التوجيه.",
      policyVersion: SUPPORT_TICKET_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "ticket-missing-context",
      category: "technical",
      tenantId: null,
      severity: null,
      reproductionAvailable: false,
    },
    [evidence("ticket-missing-context", "Support intake contains an incomplete technical report.")],
  ),
  scenario(
    {
      id: "ticket-system-pending",
      domain: "support-ticket-triage",
      titleEn: "Routing system pending",
      titleAr: "نظام التوجيه بانتظار الاستجابة",
      descriptionEn: "The ticket is complete, but the routing system is unavailable.",
      descriptionAr: "التذكرة مكتملة لكن نظام التوجيه غير متاح.",
      previewEn: "Route a complete billing ticket while the queue service is unavailable.",
      previewAr: "توجيه تذكرة فوترة مكتملة بينما خدمة الطوابير غير متاحة.",
      expectedState: "DEFER",
      expectedExplanationEn: "Routing waits for the system dependency to recover.",
      expectedExplanationAr: "ينتظر التوجيه تعافي تبعية النظام.",
      policyVersion: SUPPORT_TICKET_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "ticket-system-pending",
      routingSystemAvailable: false,
      incidentStatus: "unknown",
    },
    [evidence("ticket-routing-health", "Queue service health check is unavailable.", { validUntil: "2026-09-10T09:00:00.000Z" })],
  ),
  scenario(
    {
      id: "ticket-security-escalation",
      domain: "support-ticket-triage",
      titleEn: "Security-sensitive ticket",
      titleAr: "تذكرة حساسة أمنياً",
      descriptionEn: "A verified security ticket is complete but requires security review before routing.",
      descriptionAr: "تذكرة أمنية موثقة ومكتملة لكنها تتطلب مراجعة أمنية قبل التوجيه.",
      previewEn: "Route a high-severity security ticket without a security review.",
      previewAr: "توجيه تذكرة أمنية عالية الخطورة دون مراجعة أمنية.",
      expectedState: "ESCALATE",
      expectedExplanationEn: "The security review is a real escalation, not a client-side approval shortcut.",
      expectedExplanationAr: "المراجعة الأمنية تصعيد فعلي وليست اختصار موافقة من الواجهة.",
      policyVersion: SUPPORT_TICKET_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "ticket-security-escalation",
      category: "security",
      severity: "high",
      securitySensitive: true,
      accountImpact: "multiple_users",
    },
    [evidence("ticket-security-classification", "Security classifier marked the ticket as credential-related.", { trust: "derived" })],
  ),
  scenario(
    {
      id: "ticket-unauthorized-request",
      domain: "support-ticket-triage",
      titleEn: "Unauthorized ticket operation",
      titleAr: "عملية تذكرة غير مصرح بها",
      descriptionEn: "A requester attempts an access-grant operation without authorization.",
      descriptionAr: "يحاول مقدم الطلب منح صلاحية دون تفويض.",
      previewEn: "Grant account access from a support ticket without requester authorization.",
      previewAr: "منح وصول للحساب من تذكرة دعم دون تفويض مقدم الطلب.",
      expectedState: "REFUSE",
      expectedExplanationEn: "The hard authorization policy prevents a privileged ticket operation.",
      expectedExplanationAr: "تمنع سياسة التفويض الصارمة عملية تذكرة ذات امتيازات.",
      policyVersion: SUPPORT_TICKET_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "ticket-unauthorized-request",
      requestedOperation: "grant_access",
      authorizedToRequest: false,
      prohibitedAction: true,
    },
    [evidence("ticket-authorization-check", "Identity service reports that the requester lacks authorization.")],
  ),
];
