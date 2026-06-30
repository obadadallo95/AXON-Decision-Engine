# Privacy Policy

**Last Updated: June 30, 2026**

AXON ("we," "our," or "us") is committed to protecting the data privacy, security, and integrity of our organizational clients and operators. This Privacy Policy describes how we collect, process, and protect action requests and operational data evaluated through our Decision Engine.

---

## 1. Information Collection and Processing

To perform safety, compliance, and governance evaluations, the AXON Decision Engine processes the following information:
- **System Action Prompts**: High-level descriptions of requested infrastructure operations (e.g., software upgrades, patch deployments, or access modifications).
- **Voice input data**: Audio recordings captured via the client's Web Speech API are processed locally on the client's device to extract textual transcripts; AXON does not record or transmit raw audio files to external servers.
- **Active Operational Policies**: Custom organizational guardrails configured within the Policy Engine.

---

## 2. Server-Side Processing & AI Grounding

To protect operational confidentiality:
- All decision logic and model calls are handled strictly **server-side** (`/api/decide`). 
- Data sent to the Gemini API is governed by enterprise safety controls.
- Web search queries triggered during **Google Search Grounding** do not include user-identifiable keys, IP addresses, or internal network topology diagrams. Queries are generalized to software identifiers, vulnerability codes, or library names to fetch safety advisories.

---

## 3. Data Storage and Retention

AXON retains evaluation records to maintain an immutable compliance trail:
- **Audit Logs**: Stored securely in Google Cloud Firestore (or locally on client browser storage under sandbox modes) to provide team transparency.
- **Escalated Tasks**: Retained until cleared or resolved by an authorized Human Governance Reviewer.
- Data can be purged or archived according to organizational retention guidelines.

---

## 4. Enterprise Security Controls

We employ standard technical measures to protect transaction data:
- TLS 1.3 encryption for all data-in-transit.
- AES-256 encryption-at-rest within cloud databases.
- Multi-role simulation constraints to restrict administrative overrides.

---

## 5. Contact Information
For compliance inquiries, please contact your organization's internal safety officer or reach our team at `governance@axon-security.ai`.
