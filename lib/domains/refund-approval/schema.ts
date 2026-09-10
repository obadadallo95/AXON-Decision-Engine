import { z } from "zod";

export const RefundApprovalInputSchema = z
  .object({
    requestId: z.string().trim().min(1).max(128),
    orderId: z.string().trim().min(1).max(128).nullable(),
    refundAmount: z.number().finite().positive().max(1_000_000),
    currency: z.enum(["EUR", "USD"]),
    refundReason: z.string().trim().min(1).max(500).nullable(),
    paymentStatus: z.enum(["settled", "pending", "failed", "refunded", "unknown"]),
    captureObservedAt: z.string().trim().min(1).max(80).nullable(),
    fraudSignals: z.array(z.string().trim().min(1).max(160)).max(30),
    chargebackCount: z.number().int().min(0).max(100),
    customerHistory: z.enum(["new", "good", "repeat", "unknown"]),
    approvalId: z.string().trim().min(1).max(128).nullable(),
    merchantPolicyTier: z.enum(["standard", "premium", "restricted"]),
    deliveryStatus: z.enum(["delivered", "in_transit", "not_delivered", "unknown"]),
    disputeStatus: z.enum(["none", "open", "refunded", "unknown"]),
    autoRefundThreshold: z.number().finite().positive().max(1_000_000),
    processorStatusAvailable: z.boolean(),
    requestedAt: z.string().trim().min(1).max(80),
  })
  .strict();

export type RefundApprovalInput = z.infer<typeof RefundApprovalInputSchema>;
