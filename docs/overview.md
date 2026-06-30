# AXON Decision Engine: Architecture & Technical Overview

This document provides a detailed breakdown of the technical design, architectural principles, data flows, and security model of AXON, a serious enterprise-grade decision support platform.

---

## 1. Executive Summary

In high-assurance organizations, executing infrastructure actions (like software library upgrades, database schema migrations, and access privilege updates) carries immense operational and security risks. Standard deployment templates do not check compliance, whereas traditional human approval boards are slow bottlenecks. 

**AXON** bridges this gap by acting as an **AI-powered Decision and Policy Governance Engine**. It analyzes operational requests against defined guardrails in real-time. By utilizing **Google Search Grounding**, the engine verifies third-party information (such as vulnerability lists, changelogs, and security advisories) before outputting clear, explainable rulings.

---

## 2. Decision Pipeline Flow

When an operator submits a system action request via text or voice, the request travels through the following lifecycle:

```
  [ Operator Request ]  --> (Speech Transcript Sync)
          │
          ▼
   [ AXON Front-End ]   --> Displays Bilingual Alignment & Preview
          │
          ▼  (HTTPS POST /api/decide with active policies)
   [ AXON API Server ]
          │
          ├──► (Initialize Google GenAI client securely)
          ├──► (Retrieve Active compliance rules)
          ├──► (Trigger Gemini 3.5 model)
          │         │
          │         ▼ (Google Search Tool invocation)
          ├──► [ Google Search Grounding ] --> Retreive CVEs/Changelog
          │
          ▼ (Strict JSON Response Parse)
   [ Decision Output ]  --> ALLOW, DENY, NEEDS_CLARIFICATION, ESCALATE
          │
          ├──► [ Write Audit History Log ] --> (Firestore / LocalStorage)
          └──► (If Escalate) [ Human Review Queue ]
```

---

## 3. API Contract & Schema Definitions

### POST `/api/decide` Request Contract
```json
{
  "prompt": "Upgrade production payment-gateway from v2.4 to v3.0.1 immediately.",
  "policies": [
    {
      "code": "R1",
      "descriptionEn": "Never upgrade core dependencies without a vulnerability check.",
      "descriptionAr": "يُحظر تماماً ترقية الاعتمادات الأساسية قبل إجراء فحص للثغرات الأمنية."
    }
  ]
}
```

### POST `/api/decide` Response Contract
```json
{
  "decision": "ESCALATE_TO_HUMAN",
  "riskScore": 85,
  "reasonEn": "The requested version (v3.0.1) contains breaking changes to the ProcessTransaction signature...",
  "reasonAr": "تحتوي النسخة المطلوبة (v3.0.1) على تغييرات جذرية في توقيع ProcessTransaction...",
  "mitigationEn": "Apply minor patch v2.4.8 instead.",
  "mitigationAr": "قم بتطبيق الرقعة الطفيفة v2.4.8 بدلاً من ذلك.",
  "groundingEn": "v3.0.0 introduced a significant change to PCI-DSS compliance handling...",
  "groundingAr": "قدم الإصدار v3.0.0 تغييراً جوهرياً في معالجة امتثال PCI-DSS...",
  "citations": [
    "https://nvd.nist.gov/vuln",
    "https://github.com/advisories"
  ]
}
```

---

## 4. Bilingual Localization Strategy

Bilingualism in AXON is treated as a core design priority. It avoids the pitfall of literal machine translation, which often fails to capture technical, corporate, and regulatory nuances in Arabic. 

- **Technical Arabic Adaptations**: Sentences are crafted to align with formal business Arabic standards. For example, "vulnerability scan" is translated as "فحص للثغرات الأمنية" rather than a word-for-word translation, ensuring the copy is suitable for executive reviews.
- **Dynamic RTL Flexbox Layouts**: CSS layouts utilize logical parameters to adjust spacing automatically based on text direction. Containers switch orientation cleanly, and alignment remains visually balanced in both English and Arabic views.

---

## 5. Database Schema & Persistence

AXON operates on a dual-persistence architecture. If Firebase credentials are not fully configured, the system gracefully falls back to secure client-side `localStorage`, maintaining complete interactivity and usability.

### Entities in Firestore
1. **`audit_logs`**: Represents historical evaluations.
   ```typescript
   interface AuditLog {
     id: string;
     prompt: string;
     category: string;
     timestamp: Timestamp;
     decision: 'ALLOW' | 'DENY' | 'NEEDS_CLARIFICATION' | 'ESCALATE_TO_HUMAN';
     riskScore: number;
     reasonEn: string;
     reasonAr: string;
     mitigationEn: string;
     mitigationAr: string;
     groundingEn: string;
     groundingAr: string;
     reviewerOverride?: 'ALLOW' | 'DENY' | null;
     reviewedBy?: string | null;
     reviewedAt?: Timestamp;
   }
   ```

2. **`escalated_queue`**: High-risk tasks flagged for manual clearance.
   ```typescript
   interface EscalatedItem {
     id: string;
     prompt: string;
     category: string;
     timestamp: Timestamp;
     riskScore: number;
     reasonEn: string;
     reasonAr: string;
     status: 'pending' | 'approved' | 'rejected' | 'resolved';
     reviewerComment?: string;
     reviewedAt?: Timestamp;
   }
   ```

3. **`policies`**: Active security guidelines.
   ```typescript
   interface SecurityPolicy {
     code: string; // e.g., "R1"
     descriptionEn: string;
     descriptionAr: string;
   }
   ```

---

## 6. Enterprise Threat Model & Safety Goals

AXON is designed against a zero-trust model where client actions are checked server-side.

- **Vulnerability Checks (Shadow Updates)**: Client requests cannot spoof audit logs or bypass review queues because all classification results are evaluated and logged directly from the server-side API.
- **Identity Integrity**: Simulated roles allow testing operator actions and review overrides. In production, these are locked down using Firebase Auth rules to enforce that only verified `reviewer` accounts can modify state or submit manual decision clearances.
- **Safe Alternatives First**: Rulings emphasize safe rollbacks and alternative paths to keep deployment teams unblocked.
