import type { PolicyRule } from "@/lib/axon-core";

export const REFUND_APPROVAL_POLICY_VERSION = "refund-approval.v2";

export const refundApprovalPolicies: PolicyRule[] = [
  {
    code: "FR-DUPLICATE-PAYOUT",
    description: "A refund already recorded by the payment or dispute system cannot be paid again.",
    priority: 100,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      { field: "action.parameters.duplicatePayout", operator: "equals", value: true },
    ],
  },
  {
    code: "FR-CONFIRMED-FRAUD",
    description: "Confirmed fraudulent refund requests are prohibited.",
    priority: 99,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      { field: "action.parameters.clearlyFraudulent", operator: "equals", value: true },
    ],
  },
  {
    code: "FR-PROCESSOR-UNAVAILABLE",
    description: "Refund decisions defer while payment processor status is unavailable.",
    priority: 80,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      { field: "action.parameters.processorStatusAvailable", operator: "equals", value: false },
    ],
  },
  {
    code: "FR-MISSING-ORDER",
    description: "A refund must identify the order and reason before evaluation.",
    priority: 70,
    enabled: true,
    hard: false,
    effect: "ASK",
    conditions: [
      { field: "action.parameters.orderId", operator: "equals", value: null },
    ],
  },
  {
    code: "FR-HUMAN-THRESHOLD",
    description: "Refunds above the automatic threshold require finance approval.",
    priority: 60,
    enabled: true,
    hard: false,
    effect: "ESCALATE",
    conditions: [
      { field: "signals.requiredApprovalMissing", operator: "equals", value: true },
    ],
  },
  {
    code: "FR-PAYMENT-FAILED",
    description: "A failed payment was not captured and cannot be refunded.",
    priority: 85,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      {
        field: "action.parameters.paymentStatus",
        operator: "equals",
        value: "failed"
      }
    ]
  },
  {
    code: "FR-PAYMENT-PENDING",
    description: "Pending settlement must complete before a refund.",
    priority: 85,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      {
        field: "action.parameters.paymentStatus",
        operator: "equals",
        value: "pending"
      }
    ]
  },
  {
    code: "FR-PAYMENT-UNKNOWN",
    description: "Refunds wait until processor payment status is known.",
    priority: 85,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      {
        field: "action.parameters.paymentStatus",
        operator: "equals",
        value: "unknown"
      }
    ]
  },
];
