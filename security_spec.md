# Security Specification and Threat Model: AXON Decision Engine

## 1. Data Invariants
- **Audit Logs (`audit_logs`)**:
  - Must represent immutable history logs of AI evaluation decisions.
  - Can be read by authenticated users (for auditing), but can only be created by operators/system services.
  - No client-side modification (updates or deletes) is allowed.
  - Timestamp must match the server timestamp (`request.time`).
  
- **Escalated Queue (`escalated_queue`)**:
  - Contains high-risk tasks requiring human-in-the-loop validation.
  - Creation requires valid fields (`prompt`, `category`, `riskScore`, `reasonEn`, `reasonAr`, `status: "pending"`).
  - Updates are strictly reserved for authorized reviewers. Only the `status`, `reviewerComment`, and `reviewedAt` fields can be updated, and only if the item is in `pending` status.
  - Document IDs must conform to alphanumeric formatting (`^[a-zA-Z0-9_\-]+$`).

- **Policies (`policies`)**:
  - Custom rules defined by governance admins.
  - Document ID is equal to the custom policy code (e.g., "R1", "R2").
  - Can be read by any authenticated user.
  - Modification or creation is restricted to authorized operators/admins. No delete/write allowed by unauthenticated users.

---

## 2. The "Dirty Dozen" Payloads (Exploit Verification Vectors)

### Payload 1: Unauthorized Audit Deletion (Identity Breach)
- **Path**: `/audit_logs/log-123`
- **Operation**: `DELETE`
- **Impact**: Attackers trying to erase audit logs to hide policy-bypassing actions.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Client-side Audit Modification (Integrity Breach)
- **Path**: `/audit_logs/log-123`
- **Operation**: `UPDATE`
- **Payload**: `{ "decision": "ALLOW", "riskScore": 0 }`
- **Impact**: Attackers modifying an existing evaluation from DENY to ALLOW.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Spoofed Audit Author (Identity Poisoning)
- **Path**: `/audit_logs/log-123`
- **Operation**: `CREATE`
- **Payload**: `{ "prompt": "Dangerous script", "reviewedBy": "Sarah Chen", "reviewerOverride": "ALLOW" }`
- **Impact**: Operators attempting to pre-approve their own dangerous requests.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Invalid Document ID Poisoning (Resource Exhaustion)
- **Path**: `/escalated_queue/VERY_LONG_GARBAGE_ID_REPEATED_TO_EXCEED_1024_BYTES_AND_POISON_THE_INDEX_WITH_JUNK`
- **Operation**: `CREATE`
- **Payload**: `{ "prompt": "Upgrade pkg", "category": "dependency", "riskScore": 85, "status": "pending" }`
- **Impact**: Attackers attempting to poison DB indexes.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Skip Escalation Status Gate (State Shortcut)
- **Path**: `/escalated_queue/esc-123`
- **Operation**: `CREATE`
- **Payload**: `{ "prompt": "Upgrade gateway", "category": "dependency", "riskScore": 90, "status": "approved", "reviewerComment": "Auto-approved by hacker script" }`
- **Impact**: Self-approving high-risk requests by inserting them pre-approved.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: Modifying immutable fields in Review Queue (State Corruption)
- **Path**: `/escalated_queue/esc-123`
- **Operation**: `UPDATE`
- **Payload**: `{ "prompt": "Malicious payload replacement during review", "status": "approved" }`
- **Impact**: Changing the original request prompt to something completely different after escalation has been filed.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Client-side Client Timestamp Hijack (Temporal Breach)
- **Path**: `/audit_logs/log-123`
- **Operation**: `CREATE`
- **Payload**: `{ "prompt": "Verify", "timestamp": "2020-01-01T00:00:00.000Z" }`
- **Impact**: Faking historical action timestamps.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Unauthorized Policy Modification (Guardrail Bypass)
- **Path**: `/policies/R1`
- **Operation**: `UPDATE`
- **Payload**: `{ "descriptionEn": "Hacker policy bypass", "descriptionAr": "مخترق" }`
- **Impact**: Overwriting security policies to make dangerous actions pass.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: Empty Policy Injection (Integrity Attack)
- **Path**: `/policies/R5`
- **Operation**: `CREATE`
- **Payload**: `{ "code": "" }`
- **Impact**: Injecting empty policy documents that break validation parsers.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Modifying Terminal Approved Queue (Double Approval Guard)
- **Path**: `/escalated_queue/esc-completed`
- **Operation**: `UPDATE`
- **Payload**: `{ "status": "rejected", "reviewerComment": "Glitched" }`
- **Condition**: Existing document is already `approved`.
- **Impact**: Re-updating a finalized ticket to create visual inconsistencies in logs.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Non-Reviewer Approval (Privilege Escalation)
- **Path**: `/escalated_queue/esc-123`
- **Operation**: `UPDATE`
- **Payload**: `{ "status": "approved" }`
- **User Role**: Standard Operator (`sarah.chen@axon-governance.ai` with no reviewer credentials)
- **Impact**: Operator approving their own request.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: Injection of Massive String payload (Denial of Wallet)
- **Path**: `/audit_logs/log-123`
- **Operation**: `CREATE`
- **Payload**: `{ "prompt": "<10MB garbage string>", "category": "dependency" }`
- **Impact**: Injecting oversized fields to trigger Firestore storage quota limits.
- **Expected Outcome**: `PERMISSION_DENIED`

---

## 3. The Test Runner Script (Mock Reference)

```typescript
// firestore.rules.test.ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('AXON Firestore Rules Threat Test', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'axon-decision-engine-test'
    });
  });

  it('blocks anonymous access completely (Global Safety Net)', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.collection('audit_logs').get());
  });

  it('prevents operators from deleting audit logs', async () => {
    const operatorDb = testEnv.authenticatedContext('user-001').firestore();
    await assertFails(operatorDb.doc('audit_logs/log-123').delete());
  });

  it('prevents operators from changing existing audits', async () => {
    const operatorDb = testEnv.authenticatedContext('user-001').firestore();
    await assertFails(operatorDb.doc('audit_logs/log-123').update({ decision: 'ALLOW' }));
  });
});
```
