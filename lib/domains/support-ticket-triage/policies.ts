import type { PolicyRule } from "@/lib/axon-core";

export const SUPPORT_TICKET_POLICY_VERSION = "support-ticket-triage.v2";

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
  {
    code: "TT-AUTO-ROUTE-DISABLED",
    description: "Automatic routing is disabled; wait for routing eligibility.",
    priority: 85,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      {
        field: "action.operation",
        operator: "equals",
        value: "route"
      },
      {
        field: "action.parameters.autoRouteAllowed",
        operator: "equals",
        value: false
      }
    ]
  },
  {
    code: "TT-DESTINATION-UNRESOLVED",
    description: "Wait for the routing system to resolve a destination queue.",
    priority: 85,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      {
        field: "action.operation",
        operator: "equals",
        value: "route"
      },
      {
        field: "action.parameters.destinationQueue",
        operator: "equals",
        value: null
      }
    ]
  },
  {
    code: "TT-IDENTITY-UNVERIFIED",
    description: "An explicitly unverified requester cannot authorize a ticket operation.",
    priority: 85,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      {
        field: "action.parameters.requesterIdentityVerified",
        operator: "equals",
        value: false
      }
    ]
  },
];
