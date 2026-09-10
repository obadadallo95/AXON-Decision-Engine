import { hashObject } from "./hash";
import type { ActorContext } from "@/lib/axon-core";
import type {
  AuditRecord,
  AuditTrail,
  ReviewAction,
  ReviewEvent,
} from "./audit-types";

export class AuditRepositoryError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "AuditRepositoryError";
  }
}

export interface ReviewEventInput {
  requestId: string;
  decisionEventId: string;
  reviewer: ActorContext;
  action: ReviewAction;
  reason: string;
  timestamp: string;
}

export interface AppendDecisionResult {
  record: AuditRecord;
  created: boolean;
}

export interface AuditRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<AuditRecord | null>;
  appendDecisionRecord(record: AuditRecord): Promise<AppendDecisionResult>;
  appendReviewEvent(input: ReviewEventInput): Promise<ReviewEvent>;
  getDecisionAudit(requestId: string): Promise<AuditTrail | null>;
  listRecentAuditRecords(limit?: number): Promise<AuditRecord[]>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface InMemoryAuditRepositoryOptions {
  available?: boolean;
}

/**
 * Server-owned demo persistence. It is process-local and intentionally does
 * not fall back to browser storage. A durable multi-instance adapter belongs
 * in a later deployment stage.
 */
export class InMemoryAuditRepository implements AuditRepository {
  private readonly recordsByEventId = new Map<string, AuditRecord>();
  private readonly eventIdByIdempotencyKey = new Map<string, string>();
  private readonly reviewsByDecisionEventId = new Map<string, ReviewEvent[]>();
  private available: boolean;

  constructor(options: InMemoryAuditRepositoryOptions = {}) {
    this.available = options.available ?? true;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  clear(): void {
    this.recordsByEventId.clear();
    this.eventIdByIdempotencyKey.clear();
    this.reviewsByDecisionEventId.clear();
  }

  private ensureAvailable(): void {
    if (!this.available) {
      throw new AuditRepositoryError(
        "AUDIT_WRITE_FAILED",
        "The server-owned audit repository is unavailable.",
      );
    }
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<AuditRecord | null> {
    this.ensureAvailable();
    const eventId = this.eventIdByIdempotencyKey.get(idempotencyKey);
    if (!eventId) return null;
    const record = this.recordsByEventId.get(eventId);
    return record ? clone(record) : null;
  }

  async appendDecisionRecord(record: AuditRecord): Promise<AppendDecisionResult> {
    this.ensureAvailable();
    const existingEventId = this.eventIdByIdempotencyKey.get(record.idempotencyKey);
    if (existingEventId) {
      const existing = this.recordsByEventId.get(existingEventId);
      if (
        existing &&
        existing.integrity.inputHash === record.integrity.inputHash &&
        existing.policyAuthority.hash === record.policyAuthority.hash
      ) {
        return { record: clone(existing), created: false };
      }
      throw new AuditRepositoryError(
        "IDEMPOTENCY_CONFLICT",
        "The idempotency key is already bound to different normalized input or policies.",
      );
    }
    if (this.recordsByEventId.has(record.eventId)) {
      throw new AuditRepositoryError(
        "IDEMPOTENCY_CONFLICT",
        "The decision event identity is already recorded.",
      );
    }
    const stored = clone(record);
    this.recordsByEventId.set(stored.eventId, stored);
    this.eventIdByIdempotencyKey.set(stored.idempotencyKey, stored.eventId);
    return { record: clone(stored), created: true };
  }

  async appendReviewEvent(input: ReviewEventInput): Promise<ReviewEvent> {
    this.ensureAvailable();
    const decision = this.recordsByEventId.get(input.decisionEventId);
    if (!decision || decision.requestId !== input.requestId) {
      throw new AuditRepositoryError(
        "AUDIT_NOT_FOUND",
        "The referenced decision audit record was not found.",
      );
    }
    if (decision.authoritativeOutcome.state !== "ESCALATE") {
      throw new AuditRepositoryError(
        "REVIEW_NOT_ALLOWED",
        "Only an authoritative ESCALATE decision may receive a review event.",
      );
    }
    const existingReviews = this.reviewsByDecisionEventId.get(input.decisionEventId) ?? [];
    if (existingReviews.length) {
      const existing = existingReviews[existingReviews.length - 1];
      throw new AuditRepositoryError(
        existing.action === input.action
          ? "REVIEW_ALREADY_RECORDED"
          : "REVIEW_CONFLICT",
        existing.action === input.action
          ? "A review with this action has already been recorded."
          : "A conflicting review has already been recorded; the first valid review wins.",
      );
    }

    const previousEventHash =
      existingReviews[existingReviews.length - 1]?.eventHash ??
      decision.integrity.eventHash ??
      "";
    const reviewEventId = `review_${decision.eventId}_${existingReviews.length + 1}`;
    const eventBase = {
      reviewEventId,
      eventType: "REVIEW" as const,
      requestId: input.requestId,
      parentDecisionEventId: input.decisionEventId,
      reviewer: clone(input.reviewer),
      action: input.action,
      reason: input.reason,
      timestamp: input.timestamp,
      previousEventHash,
    };
    const event: ReviewEvent = {
      ...eventBase,
      eventHash: hashObject(eventBase),
    };
    this.reviewsByDecisionEventId.set(input.decisionEventId, [clone(event)]);
    return clone(event);
  }

  async getDecisionAudit(requestId: string): Promise<AuditTrail | null> {
    this.ensureAvailable();
    const record = [...this.recordsByEventId.values()]
      .filter((item) => item.requestId === requestId)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0];
    if (!record) return null;
    return {
      decision: clone(record),
      reviews: clone(this.reviewsByDecisionEventId.get(record.eventId) ?? []),
    };
  }

  async listRecentAuditRecords(limit = 100): Promise<AuditRecord[]> {
    this.ensureAvailable();
    return [...this.recordsByEventId.values()]
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, Math.max(0, limit))
      .map((record) => clone(record));
  }
}

type AxonProcessGlobal = typeof globalThis & {
  __axonServerAuditRepository?: AuditRepository;
};

// Next can load route handlers in separate module contexts during development.
// A process-global reference keeps the intentionally process-local demo store
// coherent across /api/scenarios/run, /api/audit, and /api/review without
// pretending to provide durable or multi-instance persistence.
const processGlobal = globalThis as AxonProcessGlobal;
export const serverAuditRepository: AuditRepository =
  processGlobal.__axonServerAuditRepository ??
  (processGlobal.__axonServerAuditRepository = new InMemoryAuditRepository());
