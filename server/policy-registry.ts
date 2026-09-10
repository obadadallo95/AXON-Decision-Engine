import type { DecisionRequest, JsonObject, PolicyRule } from "@/lib/axon-core";
import { adaptCodeDeployment } from "@/lib/domains/code-deployment/adapter";
import { CodeDeploymentInputSchema } from "@/lib/domains/code-deployment/schema";
import { codeDeploymentPolicies, CODE_DEPLOYMENT_POLICY_VERSION } from "@/lib/domains/code-deployment/policies";
import { adaptRefundApproval } from "@/lib/domains/refund-approval/adapter";
import { RefundApprovalInputSchema } from "@/lib/domains/refund-approval/schema";
import { refundApprovalPolicies, REFUND_APPROVAL_POLICY_VERSION } from "@/lib/domains/refund-approval/policies";
import { adaptSupportTicketTriage } from "@/lib/domains/support-ticket-triage/adapter";
import { SupportTicketTriageInputSchema } from "@/lib/domains/support-ticket-triage/schema";
import { supportTicketTriagePolicies, SUPPORT_TICKET_POLICY_VERSION } from "@/lib/domains/support-ticket-triage/policies";

export interface ResolvedPolicyAuthority {
  request: DecisionRequest;
  policies: PolicyRule[];
  version: string | null;
}

function pick(parameters: JsonObject, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, parameters[key]]));
}

function stronger<T extends string>(a: T, b: T, order: readonly T[]): T {
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/** Re-derive governance from typed domain facts. Derived flags and required
 * approvals supplied by a caller never replace adapter-owned requirements. */
export function resolvePolicyAuthority(
  request: DecisionRequest,
  policySetId?: string,
): ResolvedPolicyAuthority {
  const unresolved = { request, policies: [], version: null };
  const evidence = request.context.evidenceItems ?? [];
  const common = { requestId: request.requestId, requestedAt: request.context.requestedAt };
  let governed: DecisionRequest;
  let policies: PolicyRule[];
  let version: string;
  try {
    switch (request.action.domain) {
      case "code-deployment": {
        const input = CodeDeploymentInputSchema.parse({
          ...pick(request.action.parameters, Object.keys(CodeDeploymentInputSchema.shape)),
          ...common, approverIds: request.context.approvals,
        });
        if (input.environment !== null && input.environment !== request.context.environment) return unresolved;
        governed = adaptCodeDeployment(input, evidence);
        policies = codeDeploymentPolicies;
        version = CODE_DEPLOYMENT_POLICY_VERSION;
        break;
      }
      case "refund-approval": {
        const input = RefundApprovalInputSchema.parse({
          ...pick(request.action.parameters, Object.keys(RefundApprovalInputSchema.shape)), ...common,
        });
        // The public client may tighten, but never raise, the demo authority cap.
        input.autoRefundThreshold = Math.min(input.autoRefundThreshold, 500);
        governed = adaptRefundApproval(input, evidence);
        policies = refundApprovalPolicies;
        version = REFUND_APPROVAL_POLICY_VERSION;
        break;
      }
      case "support-ticket-triage": {
        const input = SupportTicketTriageInputSchema.parse({
          ...pick(request.action.parameters, Object.keys(SupportTicketTriageInputSchema.shape)), ...common,
        });
        governed = adaptSupportTicketTriage(input, evidence);
        policies = supportTicketTriagePolicies;
        version = SUPPORT_TICKET_POLICY_VERSION;
        break;
      }
      default: return unresolved;
    }
  } catch {
    return unresolved;
  }
  if ((policySetId && policySetId !== version && policySetId !== request.action.domain) ||
      request.action.operation !== governed.action.operation || request.action.target !== governed.action.target) {
    return unresolved;
  }
  const context = request.context;
  const derived = governed.context;
  return {
    policies, version,
    request: {
      ...governed,
      action: {
        ...governed.action,
        parameters: {
          ...request.action.parameters, ...governed.action.parameters,
          destructive: request.action.parameters.destructive === true || governed.action.parameters.destructive === true,
          privileged: request.action.parameters.privileged === true || governed.action.parameters.privileged === true,
          externallyVisible: request.action.parameters.externallyVisible === true || governed.action.parameters.externallyVisible === true,
        },
      },
      context: {
        ...context,
        environment: stronger(context.environment, derived.environment, ["development", "staging", "production"]),
        reversibility: stronger(context.reversibility, derived.reversibility, ["reversible", "partially_reversible", "irreversible"]),
        blastRadius: stronger(context.blastRadius, derived.blastRadius, ["low", "medium", "high"]),
        costOfWrong: stronger(context.costOfWrong, derived.costOfWrong, ["low", "medium", "high", "critical"]),
        requiredApprovals: [...new Set([...context.requiredApprovals, ...derived.requiredApprovals])],
        requiredFacts: [...new Set([...context.requiredFacts, ...derived.requiredFacts])],
        additionalFacts: { ...context.additionalFacts, ...derived.additionalFacts },
      },
    },
  };
}
