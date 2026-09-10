# Privacy Policy

**Last Updated: June 30, 2026**

AXON is a challenge prototype using synthetic data. This document describes the prototype’s intended data boundaries; it is not a production privacy commitment or compliance certification.

---

## 1. Information Collection and Processing

To perform safety, compliance, and governance evaluations, the AXON Decision Engine processes the following information:
- **System Action Prompts**: High-level descriptions of requested infrastructure operations (e.g., software upgrades, patch deployments, or access modifications).
- **Voice input data**: Audio recordings captured via the client's Web Speech API are processed locally on the client's device to extract textual transcripts; AXON does not record or transmit raw audio files to external servers.
- **Server-owned scenario policies**: The challenge fixtures use registered domain policies. Free-text policy editing is not an active authorization surface.

---

## 2. Server-Side Processing & AI Grounding

To protect operational confidentiality:
- All decision logic and model calls are handled strictly **server-side** (`/api/decide`). 
- Data sent to the optional Gemini API is limited to the bounded advisory request used by the configured runtime.
- The challenge build does not claim Google Search Grounding, external evidence ingestion, or production enterprise controls.

---

## 3. Data Storage and Retention

AXON records decisions and append-only review events in a server-owned, process-local repository for the challenge demo:
- **Audit Logs**: Not durable across restarts or coordinated across multiple instances; the runtime does not use Firestore as authoritative audit storage.
- **Review identity**: Simulated for the prototype.
- Do not use this storage model for production retention or compliance evidence.

---

## 4. Enterprise Security Controls

The prototype does not make production encryption, identity, RBAC, or compliance claims. It provides simulated reviewer roles and server-side decision boundaries for demonstration only.

---

## 5. Contact Information
For challenge questions, use the repository issue or project contact maintained by its owner.
