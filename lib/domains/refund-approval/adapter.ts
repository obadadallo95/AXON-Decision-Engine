import type { DecisionRequest, JsonObject } from "@/lib/axon-core";
import type { DomainScenario } from "@/lib/domains/common";
import { RefundApprovalInputSchema, type RefundApprovalInput } from "./schema";

function blastRadius(input: RefundApprovalInput): DecisionRequest["context"]["blastRadius"] {
  if (input.refundAmount >= input.autoRefundThreshold * 5) return "high";
  if (input.refundAmount >= input.autoRefundThreshold) return "medium";
  return "low";
}
function costOfWrong(input: RefundApprovalInput): DecisionRequest["context"]["costOfWrong"] {
  if (input.refundAmount >= 5_000 || input.chargebackCount >= 3) return "critical";
  if (input.refundAmount >= input.autoRefundThreshold) return "high";
  return "medium";
}

export function adaptRefundApproval(
  inputValue: RefundApprovalInput,
  evidence: DomainScenario<RefundApprovalInput>["evidence"],
): DecisionRequest {
  const input = RefundApprovalInputSchema.parse(inputValue);
  const duplicatePayout =
    input.paymentStatus === "refunded" || input.disputeStatus === "refunded";
  const clearlyFraudulent = input.fraudSignals.includes("confirmed_fraud");
  const requiresHumanApproval =
    input.refundAmount > input.autoRefundThreshold ||
    input.merchantPolicyTier === "restricted" ||
    input.chargebackCount >= 3;
  const requiredFacts = [
    ...(input.orderId === null ? ["orderId"] : []),
    ...(input.refundReason === null ? ["refundReason"] : []),
    ...(input.paymentStatus === "unknown" ? ["paymentStatus"] : []),
  ];
  const requiredApprovals = requiresHumanApproval ? ["finance-approval"] : [];
  const parameters: JsonObject = {
    orderId: input.orderId,
    refundAmount: input.refundAmount,
    currency: input.currency,
    refundReason: input.refundReason,
    paymentStatus: input.paymentStatus,
    captureObservedAt: input.captureObservedAt,
    fraudSignals: input.fraudSignals,
    chargebackCount: input.chargebackCount,
    customerHistory: input.customerHistory,
    approvalId: input.approvalId,
    merchantPolicyTier: input.merchantPolicyTier,
    deliveryStatus: input.deliveryStatus,
    disputeStatus: input.disputeStatus,
    autoRefundThreshold: input.autoRefundThreshold,
    processorStatusAvailable: input.processorStatusAvailable,
    requiresHumanApproval,
    duplicatePayout,
    clearlyFraudulent,
    destructive: true,
    privileged: false,
    externallyVisible: true,
  };

  return {
    requestId: input.requestId,
    action: {
      domain: "refund-approval",
      operation: "issue-refund",
      target: input.orderId ?? "unspecified-order",
      parameters,
    },
    context: {
      environment: "production",
      actor: { id: "scenario-operator", role: "refund-analyst" },
      approvals: input.approvalId ? [input.approvalId] : [],
      requiredApprovals,
      requiredFacts,
      reversibility: "irreversible",
      blastRadius: blastRadius(input),
      costOfWrong: costOfWrong(input),
      requestedAt: input.requestedAt,
      additionalFacts: {
        orderId: input.orderId,
        refundReason: input.refundReason,
        paymentStatus: input.paymentStatus,
      },
      evidence: { stale: false, conflicting: false },
      evidenceItems: evidence,
    },
  };
}
