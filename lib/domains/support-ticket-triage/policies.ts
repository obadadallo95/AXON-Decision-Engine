import type { PolicyRule } from "@/lib/axon-core";

export const SUPPORT_TICKET_POLICY_VERSION = "support-ticket-triage.v1";

export const supportTicketTriagePolicies: PolicyRule[] = [
  {
    code: "TT-UNAUTHORIZED-ACTION",
    description: "A requester who has not been authorized cannot perform the requested ticket operation.",
    priority: 100,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      { field: "action.parameters.authorizedToRequest", operator: "equals", value: false },
    ],
  },
  {
    code: "TT-PROHIBITED-TICKET-ACTION",
    description: "Ticket operations explicitly marked as prohibited cannot execute.",
    priority: 99,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      { field: "action.parameters.prohibitedAction", operator: "equals", value: true },
    ],
  },
  {
    code: "TT-ROUTING-SYSTEM-UNAVAILABLE",
    description: "Ticket routing defers while the routing system is unavailable.",
    priority: 80,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      { field: "action.parameters.routingSystemAvailable", operator: "equals", value: false },
    ],
  },
  {
    code: "TT-SECURITY-REVIEW",
    description: "Security-sensitive tickets require review before routing or action.",
    priority: 70,
    enabled: true,
    hard: false,
    effect: "ESCALATE",
    conditions: [
      { field: "action.parameters.securitySensitive", operator: "equals", value: true },
    ],
  },
  {
    code: "TT-MISSING-TENANT",
    description: "A support ticket must identify its tenant before routing.",
    priority: 60,
    enabled: true,
    hard: false,
    effect: "ASK",
    conditions: [
      { field: "action.parameters.tenantId", operator: "equals", value: null },
    ],
  },
];
