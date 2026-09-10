import { randomUUID } from "node:crypto";
import {
  DecisionOutcomeSchema,
  deriveDecisionSignals,
  evaluateDecisionWithSignals,
  normalizeDecisionRequest,
  normalizePolicyRules,
  reconcileDecisionSignals,
} from "@/lib/axon-core";
import type {
  AdvisoryInterpretation,
  DecisionOutcome,
  DecisionRequest,
  DecisionSignals,
  PolicyRule,
} from "@/lib/axon-core";
import {
  advisoryFromProviderFailure,
  geminiAdvisoryProvider,
} from "./advisory-provider";
import type { AdvisoryProvider, PolicySummary } from "./advisory-provider";
import {
  AuditRepositoryError,
  serverAuditRepository,
} from "./audit-repository";
import type { AuditIntegrityMetadata, AuditRecord } from "./audit-types";
import { hashObject, sha256 } from "./hash";

const DEFAULT_MODEL = "gemini-3.5-flash";

export class DecisionServiceError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "DecisionServiceError";
  }
}

export interface DecisionServiceInput {
  request: DecisionRequest;
  policies: PolicyRule[];
  idempotencyKey?: string;
  legacy?: boolean;
  policyVersion?: string | null;
  policySummaries?: PolicySummary[];
}

export interface DecisionServiceResult {
  request: DecisionRequest;
  outcome: DecisionOutcome;
  advisory: AdvisoryInterpretation;
  idempotencyKey: string;
  auditEventId: string | null;
  auditRecord: AuditRecord | null;
  integrity: AuditIntegrityMetadata;
  replayed: boolean;
}

export interface DecisionServiceDependencies {
  repository: import("./audit-repository").AuditRepository;
  advisoryProvider: AdvisoryProvider;
  now: () => string;
  randomId: () => string;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function policyHash(rules: PolicyRule[]): string {
  const ordered = normalizedRules(rules);
  return hashObject(ordered);
}

function normalizedRules(rules: PolicyRule[]): PolicyRule[] {
  return [...rules].sort(
    (left, right) =>
      left.code.localeCompare(right.code) ||
      left.priority - right.priority ||
      left.description.localeCompare(right.description),
  );
}

function policyAuthorityHash(
  rules: PolicyRule[],
  summaries: PolicySummary[] | undefined,
): string {
  if (!summaries?.length) return policyHash(rules);
  const normalizedSummaries = summaries
    .map((summary) => ({
      code: summary.code.trim().toUpperCase(),
      description: summary.description.trim(),
    }))
    .sort(
      (left, right) =>
        left.code.localeCompare(right.code) ||
        left.description.localeCompare(right.description),
    );
  return hashObject({ rules: normalizedRules(rules), summaries: normalizedSummaries });
}

function advisoryFailureState(advisory: AdvisoryInterpretation) {
  if (advisory.status === "unavailable") return "MODEL_UNAVAILABLE" as const;
  if (advisory.status === "invalid") return "MODEL_INVALID" as const;
  if (advisory.status === "failed") return "INTERNAL_ERROR" as const;
  return null;
}

function modelMetadata(
  advisory: AdvisoryInterpretation,
  advisoryHash: string,
) {
  return {
    provider: advisory.provider,
    requestedModel: process.env.GEMINI_ADVISORY_MODEL ?? DEFAULT_MODEL,
    actualModel: advisory.status === "success" ? advisory.model : null,
    status: advisory.status,
    interpretationConfidence: advisory.interpretationConfidence,
    advisoryHash,
    failureState: advisoryFailureState(advisory),
  };
}

function failureOutcome(outcome: DecisionOutcome): DecisionOutcome {
  const state = outcome.state === "REFUSE" ? "REFUSE" : "DEFER";
  return DecisionOutcomeSchema.parse({
    ...outcome,
    state,
    confidence: Math.min(outcome.confidence, 0.5),
    uncertainty: unique([...outcome.uncertainty, "AUDIT_WRITE_FAILED"]),
    reasonCodes: unique([...outcome.reasonCodes, "AUDIT_WRITE_FAILED"]),
    failureState: "AUDIT_WRITE_FAILED",
  });
}

function failureIntegrity(
  inputHash: string,
  signalsHash: string,
  policyHashValue: string,
  outcome: DecisionOutcome,
  advisory: AdvisoryInterpretation,
): AuditIntegrityMetadata {
  return {
    inputHash,
    signalsHash,
    policyHash: policyHashValue,
    outcomeHash: hashObject(outcome),
    advisoryHash: hashObject(advisory),
    eventHash: null,
  };
}

function resultFromRecord(record: AuditRecord, replayed: boolean): DecisionServiceResult {
  return {
    request: record.reconciledRequest ?? record.normalizedRequest,
    outcome: record.authoritativeOutcome,
    advisory: record.advisoryInterpretation,
    idempotencyKey: record.idempotencyKey,
    auditEventId: record.eventId,
    auditRecord: record,
    integrity: record.integrity,
    replayed,
  };
}

export class DecisionService {
  private readonly dependencies: DecisionServiceDependencies;

  constructor(
    dependencies: Partial<DecisionServiceDependencies> = {},
  ) {
    this.dependencies = {
      repository: dependencies.repository ?? serverAuditRepository,
      advisoryProvider: dependencies.advisoryProvider ?? geminiAdvisoryProvider,
      now: dependencies.now ?? (() => new Date().toISOString()),
      randomId: dependencies.randomId ?? randomUUID,
    };
  }

  async decide(input: DecisionServiceInput): Promise<DecisionServiceResult> {
    const request = normalizeDecisionRequest(input.request);
    const rules = normalizePolicyRules(input.policies);
    const inputHash = hashObject(request);
    const policyHashValue = policyAuthorityHash(rules, input.policySummaries);
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      (input.legacy
        ? `legacy-${this.dependencies.randomId()}`
        : `request-${request.requestId}-${inputHash.slice(0, 24)}`);

    let existing: AuditRecord | null;
    try {
      existing = await this.dependencies.repository.findByIdempotencyKey(
        idempotencyKey,
      );
    } catch (error) {
      return this.evaluateWithoutAudit(
        request,
        rules,
        idempotencyKey,
        inputHash,
        policyHashValue,
        error,
      );
    }

    if (existing) {
      if (
        existing.integrity.inputHash !== inputHash ||
        existing.policyAuthority.hash !== policyHashValue
      ) {
        throw new DecisionServiceError(
          "IDEMPOTENCY_CONFLICT",
          "The idempotency key is already bound to different normalized input or policies.",
        );
      }
      return resultFromRecord(existing, true);
    }

    const explicitSignals = deriveDecisionSignals(request);
    let advisory: AdvisoryInterpretation;
    try {
      advisory = await this.dependencies.advisoryProvider.interpret({
        request,
        explicitSignals,
        evidence: request.context.evidenceItems ?? [],
        policySummaries:
          input.policySummaries ??
          rules.map((rule) => ({ code: rule.code, description: rule.description })),
      });
    } catch (error) {
      advisory = advisoryFromProviderFailure(error);
    }

    const reconciled = reconcileDecisionSignals(
      request,
      advisory,
      input.legacy ?? false,
    );
    const outcome = evaluateDecisionWithSignals(
      reconciled.request,
      rules,
      reconciled.signals,
    );
    const advisoryHash = hashObject(advisory);
    const integrityBase: AuditIntegrityMetadata = {
      inputHash,
      signalsHash: hashObject(reconciled.signals),
      policyHash: policyHashValue,
      outcomeHash: hashObject(outcome),
      advisoryHash,
      eventHash: null,
    };
    const eventId = `decision_${sha256(idempotencyKey).slice(0, 32)}`;
    const recordBase = {
      eventId,
      eventType: "DECISION" as const,
      requestId: reconciled.request.requestId,
      idempotencyKey,
      timestamp: this.dependencies.now(),
      actor: reconciled.request.context.actor,
      normalizedRequest: request,
      reconciledRequest: reconciled.request,
      explicitSignals,
      reconciledSignals: reconciled.signals,
      advisoryInterpretation: advisory,
      policyAuthority: {
        version: input.policyVersion ?? null,
        codes: [
          ...rules.map((rule) => rule.code),
          ...(input.policySummaries ?? []).map((summary) => summary.code.trim().toUpperCase()),
        ].sort(),
        hash: policyHashValue,
      },
      policyEvaluations: outcome.policyEvaluations,
      matchedRuleCodes: outcome.matchedRuleCodes,
      authoritativeOutcome: outcome,
      failureState: outcome.failureState ?? advisoryFailureState(advisory),
      model: modelMetadata(advisory, advisoryHash),
      integrity: integrityBase,
    };
    const record: AuditRecord = {
      ...recordBase,
      integrity: {
        ...integrityBase,
        eventHash: hashObject(recordBase),
      },
    };

    try {
      const appended = await this.dependencies.repository.appendDecisionRecord(record);
      return resultFromRecord(appended.record, !appended.created);
    } catch (error) {
      if (error instanceof AuditRepositoryError && error.code === "IDEMPOTENCY_CONFLICT") {
        throw new DecisionServiceError(error.code, error.message);
      }
      if (error instanceof AuditRepositoryError || error instanceof Error) {
        const safeOutcome = failureOutcome(outcome);
        return {
          request: reconciled.request,
          outcome: safeOutcome,
          advisory,
          idempotencyKey,
          auditEventId: null,
          auditRecord: null,
          integrity: failureIntegrity(
            inputHash,
            integrityBase.signalsHash,
            policyHashValue,
            safeOutcome,
            advisory,
          ),
          replayed: false,
        };
      }
      throw error;
    }
  }

  private async evaluateWithoutAudit(
    request: DecisionRequest,
    rules: PolicyRule[],
    idempotencyKey: string,
    inputHash: string,
    policyHashValue: string,
    error: unknown,
  ): Promise<DecisionServiceResult> {
    const explicitSignals = deriveDecisionSignals(request);
    const advisory = advisoryFromProviderFailure(
      new Error(
        error instanceof Error
          ? `Audit lookup failed: ${error.message}`
          : "The server-owned audit repository is unavailable.",
      ),
    );
    const outcome = failureOutcome(
      evaluateDecisionWithSignals(request, rules, explicitSignals),
    );
    return {
      request,
      outcome,
      advisory,
      idempotencyKey,
      auditEventId: null,
      auditRecord: null,
      integrity: failureIntegrity(
        inputHash,
        hashObject(explicitSignals),
        policyHashValue,
        outcome,
        advisory,
      ),
      replayed: false,
    };
  }
}

export const decisionService = new DecisionService();

export { policyHash };
