import type { DecisionRequest, DecisionSignals, PolicyRule } from "./types";

/** Named evidence IDs are prerequisites of every enabled rule in a policy set,
 * not just rules that happen to match. Missing evidence cannot disable a rule. */
export function applyPolicyRequirements(
  request: DecisionRequest,
  rules: PolicyRule[],
  signals: DecisionSignals,
): DecisionSignals {
  const active = rules.filter((rule) => rule.enabled);
  const missing = new Set(signals.missingInformation);
  const uncertainty = new Set(signals.uncertainty);
  if (!active.length) uncertainty.add("POLICY_COVERAGE_UNRESOLVED");
  const evidence = request.context.evidenceItems ?? [];
  for (const id of new Set(active.flatMap((rule) => rule.requiredEvidence ?? []))) {
    const items = evidence.filter((item) => item.id === id);
    if (!items.length) {
      missing.add(`evidence:${id}`);
      uncertainty.add("REQUIRED_EVIDENCE_MISSING");
      continue;
    }
    const item = items[0];
    const now = Date.parse(request.context.requestedAt);
    const expires = item.validUntil === null ? Infinity : Date.parse(item.validUntil);
    if (items.length !== 1 || !Number.isFinite(now) || Number.isNaN(expires) ||
        !Number.isFinite(Date.parse(item.observedAt)) || expires < now ||
        signals.staleEvidence || signals.conflictingEvidence ||
        item.contradicts.length || evidence.some((other) => other.contradicts.includes(id))) {
      uncertainty.add("REQUIRED_EVIDENCE_UNAVAILABLE");
    }
  }
  return {
    ...signals,
    missingInformation: [...missing],
    uncertainty: [...uncertainty],
    confidence: Math.min(signals.confidence, Math.max(0, 1 - missing.size * 0.2)),
  };
}
