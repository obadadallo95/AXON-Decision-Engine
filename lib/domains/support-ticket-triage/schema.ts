import { z } from "zod";

export const SupportTicketTriageInputSchema = z
  .object({
    requestId: z.string().trim().min(1).max(128),
    ticketId: z.string().trim().min(1).max(128).nullable(),
    category: z.enum(["billing", "account_access", "technical", "security", "general"]).nullable(),
    tenantId: z.string().trim().min(1).max(128).nullable(),
    severity: z.enum(["low", "medium", "high", "critical"]).nullable(),
    customerTier: z.enum(["standard", "business", "enterprise"]).nullable(),
    accountImpact: z.enum(["none", "single_user", "multiple_users", "tenant_wide"]),
    securitySensitive: z.boolean(),
    reproductionAvailable: z.boolean(),
    requesterIdentityVerified: z.boolean(),
    slaMinutes: z.number().int().positive().max(1_000_000).nullable(),
    destinationQueue: z.string().trim().min(1).max(128).nullable(),
    autoRouteAllowed: z.boolean(),
    duplicateOf: z.string().trim().min(1).max(128).nullable(),
    incidentStatus: z.enum(["none", "active", "unknown"]),
    routingSystemAvailable: z.boolean(),
    requestedOperation: z.enum(["route", "close", "export", "grant_access"]),
    authorizedToRequest: z.boolean(),
    prohibitedAction: z.boolean(),
    ticketBody: z.string().trim().min(1).max(5000).nullable(),
    requestedAt: z.string().trim().min(1).max(80),
  })
  .strict();

export type SupportTicketTriageInput = z.infer<typeof SupportTicketTriageInputSchema>;
