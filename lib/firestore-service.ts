import { 
  collection, 
  getDocs, 
  doc,
  setDoc
} from 'firebase/firestore';
import { db, isFirebaseAvailable } from './firebase';

export interface AuditLog {
  id: string;
  prompt: string;
  category: string;
  timestamp: any;
  decision: 'ALLOW' | 'DENY' | 'NEEDS_CLARIFICATION' | 'ESCALATE_TO_HUMAN';
  riskScore: number;
  reasonEn: string;
  reasonAr: string;
  mitigationEn: string;
  mitigationAr: string;
  groundingEn: string;
  groundingAr: string;
  citations: string[];
  matchedPolicyCodes?: string[];
  requestClassificationEn?: string;
  requestClassificationAr?: string;
  reviewerOverride?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: any;
}

export interface EscalatedItem {
  id: string;
  requestId?: string;
  decisionEventId?: string;
  prompt: string;
  category: string;
  timestamp: any;
  riskScore: number;
  reasonEn: string;
  reasonAr: string;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  reviewerComment?: string;
  reviewedAt?: any;
}

export interface SecurityPolicy {
  code: string;
  descriptionEn: string;
  descriptionAr: string;
  sourceType?: 'manual' | 'json' | 'pdf' | 'text';
  originalFilename?: string;
  importedAt?: string;
}

const DEFAULT_POLICIES: SecurityPolicy[] = [
  {
    code: "R1",
    descriptionEn: "Never upgrade core dependencies without a vulnerability check.",
    descriptionAr: "يُحظر تماماً ترقية الاعتمادات الأساسية قبل إجراء فحص للثغرات الأمنية."
  },
  {
    code: "R2",
    descriptionEn: "Freeze period active. Only emergency security patches allowed.",
    descriptionAr: "فترة تجميد النظام نشطة. يُسمح فقط بالرقع الأمنية الطارئة لثغرات النظام."
  },
  {
    code: "R3",
    descriptionEn: "Modifying production database tables requires manual multi-reviewer sign-off.",
    descriptionAr: "تعديل مخطط بيانات الإنتاج يتطلب اعتماداً يدوياً من عدة مراجعين معتمدين."
  },
  {
    code: "R4",
    descriptionEn: "Bypassing dual SSH authorization is strictly prohibited.",
    descriptionAr: "يُحظر تماماً تجاوز تفويض SSH الثنائي للدخول إلى السيرفرات الحساسة."
  }
];

// Helper to safely get from localStorage
function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const val = localStorage.getItem(key);
  if (!val) return defaultValue;
  try {
    return JSON.parse(val);
  } catch (e) {
    return defaultValue;
  }
}

// Helper to safely set to localStorage
function setLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

interface ServerAuditRecord {
  eventId: string;
  requestId: string;
  timestamp: string;
  normalizedRequest: {
    action: { domain: string; operation: string; target: string; parameters: Record<string, unknown> };
  };
  authoritativeOutcome: {
    state: 'EXECUTE' | 'ASK' | 'DEFER' | 'ESCALATE' | 'REFUSE';
    riskScore: number;
    matchedRuleCodes: string[];
  };
}

interface ServerAuditTrail {
  decision: ServerAuditRecord;
  reviews: Array<{ action: 'APPROVE' | 'REJECT'; reason: string; timestamp: string }>;
}

function legacyDecision(state: ServerAuditRecord['authoritativeOutcome']['state']): AuditLog['decision'] {
  if (state === 'EXECUTE') return 'ALLOW';
  if (state === 'REFUSE') return 'DENY';
  if (state === 'ASK') return 'NEEDS_CLARIFICATION';
  return 'ESCALATE_TO_HUMAN';
}

function promptFromRecord(record: ServerAuditRecord): string {
  const legacyPrompt = record.normalizedRequest.action.parameters.legacyPrompt;
  return typeof legacyPrompt === 'string'
    ? legacyPrompt
    : `${record.normalizedRequest.action.operation} ${record.normalizedRequest.action.target}`;
}

function auditLogFromRecord(record: ServerAuditRecord): AuditLog {
  return {
    id: record.eventId,
    prompt: promptFromRecord(record),
    category: record.normalizedRequest.action.domain,
    timestamp: new Date(record.timestamp),
    decision: legacyDecision(record.authoritativeOutcome.state),
    riskScore: record.authoritativeOutcome.riskScore,
    reasonEn: `Server audit record ${record.eventId} preserves the authoritative ${record.authoritativeOutcome.state} decision.`,
    reasonAr: `يحفظ سجل الخادم القرار الحتمي ${record.authoritativeOutcome.state}.`,
    mitigationEn: 'Use the authoritative server decision and audit record before acting.',
    mitigationAr: 'استخدم قرار الخادم وسجل التدقيق الموثوق قبل التنفيذ.',
    groundingEn: 'Loaded from the server-owned AXON audit repository.',
    groundingAr: 'تم تحميله من مستودع تدقيق أكسون المملوك للخادم.',
    citations: [],
    matchedPolicyCodes: record.authoritativeOutcome.matchedRuleCodes,
    requestClassificationEn: record.normalizedRequest.action.domain,
    requestClassificationAr: 'غير محدد',
    reviewerOverride: null,
    reviewedBy: null,
  };
}

export async function fetchAuditHistory(): Promise<AuditLog[]> {
  const response = await fetch('/api/audit?limit=100', { cache: 'no-store' });
  if (!response.ok) throw new Error('SERVER_AUDIT_READ_FAILED');
  const data = (await response.json()) as { records: ServerAuditRecord[] };
  return data.records.map(auditLogFromRecord);
}

export async function fetchEscalatedQueue(): Promise<EscalatedItem[]> {
  const response = await fetch('/api/audit?limit=100', { cache: 'no-store' });
  if (!response.ok) throw new Error('SERVER_AUDIT_READ_FAILED');
  const data = (await response.json()) as {
    audits?: ServerAuditTrail[];
    records: ServerAuditRecord[];
  };
  const trails = data.audits ?? data.records.map((record) => ({ decision: record, reviews: [] }));
  return trails
    .filter(({ decision }) => decision.authoritativeOutcome.state === 'ESCALATE')
    .map(({ decision, reviews }) => {
      const lastReview = reviews[reviews.length - 1];
      return {
        id: decision.eventId,
        requestId: decision.requestId,
        decisionEventId: decision.eventId,
        prompt: promptFromRecord(decision),
        category: decision.normalizedRequest.action.domain,
        timestamp: new Date(decision.timestamp),
        riskScore: decision.authoritativeOutcome.riskScore,
        reasonEn: `Authoritative server decision: ${decision.authoritativeOutcome.state}.`,
        reasonAr: `قرار الخادم الموثوق: ${decision.authoritativeOutcome.state}.`,
        status: lastReview?.action === 'APPROVE' ? 'approved' : lastReview?.action === 'REJECT' ? 'rejected' : 'pending',
        reviewerComment: lastReview?.reason,
        reviewedAt: lastReview ? new Date(lastReview.timestamp) : undefined,
      } satisfies EscalatedItem;
    });
}

/** Decision audit creation is server-only in Stage 3. */
export async function addAuditLog(_log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
  throw new Error('SERVER_AUDIT_ONLY');
}

/** Escalation records are created by /api/decide, never by the browser. */
export async function addEscalatedQueue(_item: Omit<EscalatedItem, 'id' | 'timestamp'>): Promise<string> {
  throw new Error('SERVER_AUDIT_ONLY');
}

export async function updateEscalatedDecision(
  id: string, 
  status: 'approved' | 'rejected' | 'resolved', 
  comment: string,
  requestId = id,
): Promise<void> {
  if (status === 'resolved') throw new Error('REVIEW_ACTION_UNSUPPORTED');
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId,
      decisionEventId: id,
      action: status === 'approved' ? 'APPROVE' : 'REJECT',
      reviewer: { id: 'dashboard-reviewer', role: 'reviewer' },
      reason: comment,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data.error === 'string' ? data.error : 'SERVER_REVIEW_FAILED');
  }
}

export async function fetchPolicies(): Promise<SecurityPolicy[]> {
  if (!isFirebaseAvailable) {
    return getLocal<SecurityPolicy[]>('axon_policies', DEFAULT_POLICIES);
  }
  try {
    const snapshot = await getDocs(collection(db, 'policies'));
    if (snapshot.empty) {
      // Seed default policies
      await savePolicies(DEFAULT_POLICIES);
      return DEFAULT_POLICIES;
    }
    return snapshot.docs.map(doc => doc.data() as SecurityPolicy);
  } catch (error) {
    console.error("Firebase fetchPolicies error, falling back to localStorage", error);
    return getLocal<SecurityPolicy[]>('axon_policies', DEFAULT_POLICIES);
  }
}

export async function savePolicies(policies: SecurityPolicy[]): Promise<void> {
  if (!isFirebaseAvailable) {
    setLocal('axon_policies', policies);
    return;
  }
  try {
    for (const policy of policies) {
      await setDoc(doc(db, 'policies', policy.code), policy);
    }
  } catch (error) {
    console.error("Firebase savePolicies error, falling back to localStorage", error);
    setLocal('axon_policies', policies);
  }
}
