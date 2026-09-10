import { syntheticEvidence } from "@/lib/domains/common";
import type { DomainScenario } from "@/lib/domains/common";
import { adaptRefundApproval } from "./adapter";
import { refundApprovalPolicies, REFUND_APPROVAL_POLICY_VERSION } from "./policies";
import { RefundApprovalInputSchema, type RefundApprovalInput } from "./schema";

const now = "2026-09-10T10:00:00.000Z";
const freshUntil = "2026-09-10T18:00:00.000Z";

function evidence(id: string, summary: string, options: { validUntil?: string | null; contradicts?: string[] } = {}) {
  return syntheticEvidence({
    id,
    kind: "refund-control",
    source: "payments-and-risk-ledger",
    summary,
    observedAt: now,
    validUntil: options.validUntil ?? freshUntil,
    supports: ["issue-refund"],
    contradicts: options.contradicts,
  });
}

function scenario(
  metadata: Omit<DomainScenario<RefundApprovalInput>, "input" | "evidence" | "policies" | "adapt">,
  input: RefundApprovalInput,
  evidenceItems: DomainScenario<RefundApprovalInput>["evidence"],
): DomainScenario<RefundApprovalInput> {
  return {
    ...metadata,
    input: RefundApprovalInputSchema.parse(input),
    evidence: evidenceItems,
    policies: refundApprovalPolicies,
    adapt: adaptRefundApproval,
  };
}

const base: RefundApprovalInput = {
  requestId: "refund-base",
  orderId: "ORD-1001",
  refundAmount: 24,
  currency: "EUR",
  refundReason: "Customer returned the item.",
  paymentStatus: "settled",
  captureObservedAt: "2026-09-10T09:30:00.000Z",
  fraudSignals: [],
  chargebackCount: 0,
  customerHistory: "good",
  approvalId: null,
  merchantPolicyTier: "standard",
  deliveryStatus: "delivered",
  disputeStatus: "none",
  autoRefundThreshold: 100,
  processorStatusAvailable: true,
  requestedAt: now,
};

export const refundApprovalScenarios: DomainScenario<RefundApprovalInput>[] = [
  scenario(
    {
      id: "refund-small-approved",
      domain: "refund-approval",
      titleEn: "Small settled refund",
      titleAr: "استرداد صغير مسدد",
      descriptionEn: "A €24 settled order refund is within the automatic threshold.",
      descriptionAr: "استرداد طلب بقيمة 24 يورو مسدد وضمن حد الاسترداد التلقائي.",
      previewEn: "Refund €24 for a settled order with a clean customer history.",
      previewAr: "استرداد 24 يورو لطلب مسدد وسجل عميل سليم.",
      expectedState: "EXECUTE",
      expectedExplanationEn: "The order is identified, processor status is current, and no approval is required.",
      expectedExplanationAr: "الطلب محدد وحالة المعالج حديثة ولا توجد موافقة مطلوبة.",
      policyVersion: REFUND_APPROVAL_POLICY_VERSION,
    },
    { ...base, requestId: "refund-small-approved" },
    [evidence("refund-small-payment", "Processor confirms the payment is settled and not previously refunded.")],
  ),
  scenario(
    {
      id: "refund-missing-order",
      domain: "refund-approval",
      titleEn: "Refund missing order context",
      titleAr: "استرداد يفتقد سياق الطلب",
      descriptionEn: "The refund amount is supplied, but the order and reason are missing.",
      descriptionAr: "تم توفير مبلغ الاسترداد لكن الطلب والسبب مفقودان.",
      previewEn: "Refund €24 without an order identifier or reason.",
      previewAr: "استرداد 24 يورو دون معرّف طلب أو سبب.",
      expectedState: "ASK",
      expectedExplanationEn: "AXON asks for the missing order facts before any payout decision.",
      expectedExplanationAr: "يطلب أكسون حقائق الطلب الناقصة قبل قرار الدفع.",
      policyVersion: REFUND_APPROVAL_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "refund-missing-order",
      orderId: null,
      refundReason: null,
    },
    [evidence("refund-missing-order-context", "The payment record cannot be joined to an order.")],
  ),
  scenario(
    {
      id: "refund-large-human-approval",
      domain: "refund-approval",
      titleEn: "Large refund awaiting approval",
      titleAr: "استرداد كبير بانتظار الموافقة",
      descriptionEn: "A €1,200 settled refund exceeds the automatic threshold and has no finance approval.",
      descriptionAr: "يتجاوز استرداد مسدد بقيمة 1200 يورو الحد التلقائي ولا يملك موافقة مالية.",
      previewEn: "Refund €1,200 for a settled order without finance approval.",
      previewAr: "استرداد 1200 يورو لطلب مسدد دون موافقة مالية.",
      expectedState: "ESCALATE",
      expectedExplanationEn: "The amount exceeds the automatic threshold, so finance authority is required.",
      expectedExplanationAr: "يتجاوز المبلغ الحد التلقائي، لذلك يلزم تفويض المالية.",
      policyVersion: REFUND_APPROVAL_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "refund-large-human-approval",
      refundAmount: 1200,
      autoRefundThreshold: 500,
    },
    [evidence("refund-large-approval-status", "Processor confirms settlement; finance approval is not recorded.")],
  ),
  scenario(
    {
      id: "refund-stale-conflicting",
      domain: "refund-approval",
      titleEn: "High-value refund with stale conflicting evidence",
      titleAr: "استرداد مرتفع القيمة بأدلة قديمة ومتعارضة",
      descriptionEn: "Order 4815 requests €4,800 with stale payment evidence, conflicting fraud signals, three chargebacks, and no approval.",
      descriptionAr: "يطلب الطلب 4815 استرداد 4800 يورو مع دليل دفع قديم وإشارات احتيال متعارضة وثلاث عمليات رد أموال ودون موافقة.",
      previewEn: "Refund €4,800 for order 4815 with stale payment and conflicting fraud evidence.",
      previewAr: "استرداد 4800 يورو للطلب 4815 مع دليل دفع قديم وأدلة احتيال متعارضة.",
      expectedState: "ESCALATE",
      expectedExplanationEn: "Missing finance approval takes precedence over the stale/conflicting evidence defer signal; execution is prohibited until review.",
      expectedExplanationAr: "تتقدم موافقة المالية الناقصة على تأجيل الأدلة القديمة والمتعارضة؛ التنفيذ ممنوع حتى المراجعة.",
      policyVersion: REFUND_APPROVAL_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "refund-stale-conflicting",
      orderId: "4815",
      refundAmount: 4800,
      refundReason: "Manual customer recovery request.",
      fraudSignals: ["velocity_spike", "manual_review"],
      chargebackCount: 3,
      customerHistory: "repeat",
      autoRefundThreshold: 500,
    },
    [
      evidence("refund-4815-payment", "Payment ledger last reported settled, but the status snapshot expired before this request.", { validUntil: "2026-09-09T10:00:00.000Z" }),
      evidence("refund-4815-fraud", "Risk service reports velocity spike and manual review required.", { contradicts: ["refund-4815-payment"] }),
    ],
  ),
  scenario(
    {
      id: "refund-duplicate-payout",
      domain: "refund-approval",
      titleEn: "Duplicate payout attempt",
      titleAr: "محاولة دفع استرداد مكرر",
      descriptionEn: "The payment ledger already records this order as refunded.",
      descriptionAr: "يسجل دفتر الدفع هذا الطلب كمسترد مسبقاً.",
      previewEn: "Refund an order that already has a completed refund.",
      previewAr: "استرداد طلب لديه استرداد مكتمل مسبقاً.",
      expectedState: "REFUSE",
      expectedExplanationEn: "The hard duplicate-payout policy prevents a second payout.",
      expectedExplanationAr: "تمنع سياسة الدفع المكرر الصارمة دفعاً ثانياً.",
      policyVersion: REFUND_APPROVAL_POLICY_VERSION,
    },
    {
      ...base,
      requestId: "refund-duplicate-payout",
      paymentStatus: "refunded",
    },
    [evidence("refund-duplicate-ledger", "Payment ledger contains a completed refund for this order.")],
  ),
];
