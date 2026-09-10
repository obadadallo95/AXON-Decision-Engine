import type { PolicyRule } from "@/lib/axon-core";

export const CODE_DEPLOYMENT_POLICY_VERSION = "code-deployment.v2";

export const codeDeploymentPolicies: PolicyRule[] = [
  {
    code: "CD-UNSIGNED-ARTIFACT",
    description: "Production artifacts must have a verifiable signature.",
    priority: 100,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      { field: "context.environment", operator: "equals", value: "production" },
      { field: "action.parameters.artifactSigned", operator: "equals", value: false },
    ],
  },
  {
    code: "CD-FAILED-TESTS",
    description: "An artifact with failed release checks cannot be deployed.",
    priority: 99,
    enabled: true,
    hard: true,
    effect: "REFUSE",
    conditions: [
      { field: "context.environment", operator: "equals", value: "production" },
      { field: "action.parameters.testsPassed", operator: "equals", value: false },
    ],
  },
  {
    code: "CD-FREEZE-WINDOW",
    description: "A deployment freeze defers non-exempt changes until the window reopens.",
    priority: 80,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      { field: "action.parameters.freezeActive", operator: "equals", value: true },
      { field: "action.parameters.emergencyException", operator: "equals", value: false },
    ],
  },
  {
    code: "CD-RELEASE-APPROVAL",
    description: "High-impact production releases require a release approver.",
    priority: 70,
    enabled: true,
    hard: false,
    effect: "ESCALATE",
    conditions: [
      { field: "signals.requiredApprovalMissing", operator: "equals", value: true },
    ],
  },
  {
    code: "CD-MISSING-TICKET",
    description: "Every deployment must reference a change ticket.",
    priority: 60,
    enabled: true,
    hard: false,
    effect: "ASK",
    conditions: [
      { field: "action.parameters.changeTicketId", operator: "equals", value: null },
    ],
  },
  {
    code: "CD-CLOSED-WINDOW",
    description: "Deployment waits until the deployment window opens.",
    priority: 85,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      {
        field: "action.parameters.deploymentWindowOpen",
        operator: "equals",
        value: false
      }
    ]
  },
  {
    code: "CD-DEPENDENCY-NOT-HEALTHY",
    description: "Deployment waits for required dependencies to be healthy.",
    priority: 85,
    enabled: true,
    hard: false,
    effect: "DEFER",
    conditions: [
      {
        field: "action.parameters.dependencyHealth",
        operator: "not_equals",
        value: "healthy"
      }
    ]
  },
];
