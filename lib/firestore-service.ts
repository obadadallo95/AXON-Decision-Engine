import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
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

export async function fetchAuditHistory(): Promise<AuditLog[]> {
  if (!isFirebaseAvailable) {
    return getLocal<AuditLog[]>('axon_audit_logs', []);
  }
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as AuditLog[];
  } catch (error) {
    console.error("Firebase fetchAuditHistory error, falling back to localStorage", error);
    return getLocal<AuditLog[]>('axon_audit_logs', []);
  }
}

export async function addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<string> {
  const newLog = {
    ...log,
    timestamp: new Date()
  };

  if (!isFirebaseAvailable) {
    const logs = getLocal<AuditLog[]>('axon_audit_logs', []);
    const id = 'log-' + Math.random().toString(36).substr(2, 9);
    const savedLog = { id, ...newLog };
    setLocal('axon_audit_logs', [savedLog, ...logs]);
    return id;
  }

  try {
    const docRef = await addDoc(collection(db, 'audit_logs'), {
      ...newLog,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Firebase addAuditLog error, falling back to localStorage", error);
    const logs = getLocal<AuditLog[]>('axon_audit_logs', []);
    const id = 'log-' + Math.random().toString(36).substr(2, 9);
    const savedLog = { id, ...newLog };
    setLocal('axon_audit_logs', [savedLog, ...logs]);
    return id;
  }
}

export async function fetchEscalatedQueue(): Promise<EscalatedItem[]> {
  if (!isFirebaseAvailable) {
    return getLocal<EscalatedItem[]>('axon_escalated_queue', []);
  }
  try {
    const q = query(collection(db, 'escalated_queue'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date(),
    })) as EscalatedItem[];
  } catch (error) {
    console.error("Firebase fetchEscalatedQueue error, falling back to localStorage", error);
    return getLocal<EscalatedItem[]>('axon_escalated_queue', []);
  }
}

export async function addEscalatedQueue(item: Omit<EscalatedItem, 'id' | 'timestamp'>): Promise<string> {
  const newItem = {
    ...item,
    timestamp: new Date()
  };

  if (!isFirebaseAvailable) {
    const queue = getLocal<EscalatedItem[]>('axon_escalated_queue', []);
    const id = 'esc-' + Math.random().toString(36).substr(2, 9);
    const savedItem = { id, ...newItem };
    setLocal('axon_escalated_queue', [savedItem, ...queue]);
    return id;
  }

  try {
    const docRef = await addDoc(collection(db, 'escalated_queue'), {
      ...newItem,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Firebase addEscalatedQueue error, falling back to localStorage", error);
    const queue = getLocal<EscalatedItem[]>('axon_escalated_queue', []);
    const id = 'esc-' + Math.random().toString(36).substr(2, 9);
    const savedItem = { id, ...newItem };
    setLocal('axon_escalated_queue', [savedItem, ...queue]);
    return id;
  }
}

export async function updateEscalatedDecision(
  id: string, 
  status: 'approved' | 'rejected' | 'resolved', 
  comment: string
): Promise<void> {
  if (!isFirebaseAvailable) {
    const queue = getLocal<EscalatedItem[]>('axon_escalated_queue', []);
    const updated = queue.map(item => {
      if (item.id === id) {
        return { ...item, status, reviewerComment: comment, reviewedAt: new Date() };
      }
      return item;
    });
    setLocal('axon_escalated_queue', updated);
    
    // Also update audit log if matched
    const logs = getLocal<AuditLog[]>('axon_audit_logs', []);
    const updatedLogs = logs.map(log => {
      if (log.prompt === queue.find(q => q.id === id)?.prompt) {
        return { 
          ...log, 
          reviewerOverride: status === 'approved' ? 'ALLOW' : 'DENY',
          reviewedBy: 'Governance Reviewer',
          reviewedAt: new Date()
        };
      }
      return log;
    });
    setLocal('axon_audit_logs', updatedLogs);
    return;
  }

  try {
    const docRef = doc(db, 'escalated_queue', id);
    await updateDoc(docRef, {
      status,
      reviewerComment: comment,
      reviewedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Firebase updateEscalatedDecision error, falling back to localStorage", error);
    const queue = getLocal<EscalatedItem[]>('axon_escalated_queue', []);
    const updated = queue.map(item => {
      if (item.id === id) {
        return { ...item, status, reviewerComment: comment, reviewedAt: new Date() };
      }
      return item;
    });
    setLocal('axon_escalated_queue', updated);
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
