# AXON // The Decision Engine

<p align="center">
  <img src="assets/animation.svg" alt="AXON Decision Engine Animation" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Gemini_AI-818CF8?style=for-the-badge&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firestore" />
  <img src="https://img.shields.io/badge/Bilingual-EN%20%7C%20AR-059669?style=for-the-badge" alt="Bilingual" />
</p>

> **"Can you build an AI system that knows when it is allowed to act?"**  
> — *DOO Builders League Challenge: The Decision Engine*

## Overview

**AXON** is an operational decision safety engine. It acts as an external policy verification layer for autonomous AI agents (such as Cursor, Claude Code, and Antigravity) and automated infrastructure pipelines.

Rather than offering conversational interfaces, AXON serves a single purpose: **deterministic action verification**. It evaluates requested actions against live organizational policies using Google's Gemini models and web grounding, and deterministically decides if the system should proceed.

### Why AXON Matters
Modern AI agents have powerful capabilities to write code, install dependencies, and run terminal commands. However, they lack institutional awareness. They do not naturally know if a specific package is forbidden by your company's security policy, or if modifying a database schema requires senior engineering review. 

By offloading authorization logic to AXON, your agents remain decoupled from corporate governance rules, while AXON maintains an objective verification record. 

## ⚡️ Core Capabilities

- **Native PDF Policy Ingestion:** Non-technical managers can directly upload their company's official security handbooks (PDFs). AXON will automatically extract, structure, and enforce the security rules using Gemini's native document comprehension capabilities.
- **Agent Integration (SDK):** Seamless integration with AI workflows via minimal SDKs and pre-built skills for Antigravity, Cursor, and Claude Code.
- **Google Search Grounding:** Verifies facts and technical CVEs in real-time before issuing a decision.
- **Bilingual Reasoning:** Generates objective analyses and reasoning in both English and native Arabic.

## The Decision Output

Every request sent to AXON yields one of four strict states, along with technical reasoning and mitigation strategies:
- `ALLOW`: Action complies with policy. Proceed.
- `DENY`: Action severely violates policy. Execution halted.
- `NEEDS_CLARIFICATION`: Policy is ambiguous regarding the request. Requires user context.
- `ESCALATE_TO_HUMAN`: High-risk action detected. Agent must defer to human execution.

---

## 🧭 Demo Path

To quickly evaluate the core Decision Engine, follow these steps:
1. **Open the Workspace:** Launch the local server and navigate to `http://localhost:3000`.
2. **Run a Safe Request:** Use the Live Simulator or API to request `npm install react`. Verify it returns `ALLOW`.
3. **Run a Risky Request:** Request `drop table users`. Observe it returns `DENY` or `ESCALATE_TO_HUMAN` based on default security rules.
4. **Run an Ambiguous Request:** Request `restart the server` without specifying the environment. Observe it returns `NEEDS_CLARIFICATION` asking if this is production or staging.
5. **Review Audit Trail:** Check the UI dashboard's event ledger to see the immutable log of these decisions and their reasoning.

---

## 🚀 Quickstart & Setup

### Prerequisites
- Node.js 18+
- npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/obadadallo95/axon-decision-engine.git
cd axon-decision-engine

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GEMINI_API_KEY` | Yes | Authenticates with Google AI Studio to power the core decision LLM. |
| `AXON_API_KEY` | No | Optional static Bearer token. Secures the `/api/decide` route for external SDK/Agent integration. |

### Launch the Engine
```bash
npm run dev
```
The AXON UI dashboard and the `/api/decide` kernel are now live at `http://localhost:3000`.

---

## 💻 Developer Integrations

AXON is built to be integrated directly into your existing AI workflows. We provide a native SDK, raw API access, and drop-in integration skills for leading AI IDEs and agents.

### 1. API Usage
If your agent or pipeline can run `curl`, it can use AXON.

```bash
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer axn_live_a1b2c3d4e5f6g7h8" \
  -d '{
    "prompt": "Install the package lodash@4.17.20 via npm",
    "policies": [] 
  }'
```

**Example JSON Response:**
```json
{
  "decision": "DENY",
  "riskScore": 85,
  "reasonEn": "lodash@4.17.20 has known prototype pollution vulnerabilities. Policy forbids installing vulnerable packages.",
  "reasonAr": "تحتوي حزمة lodash@4.17.20 على ثغرات أمنية معروفة. تمنع السياسة تثبيت الحزم المعرضة للخطر.",
  "mitigationEn": "Upgrade to lodash@4.17.21 or higher.",
  "mitigationAr": "الترقية إلى الإصدار 4.17.21 أو أحدث.",
  "groundingEn": "Found CVE-2021-23337 associated with this version.",
  "groundingAr": "تم العثور على CVE-2021-23337 مرتبط بهذا الإصدار.",
  "citations": ["https://nvd.nist.gov/vuln/detail/CVE-2021-23337"]
}
```

### 2. TypeScript SDK
Import the drop-in TypeScript SDK directly into your node applications.

```typescript
import { axon } from './lib/axon-sdk';

const result = await axon.evaluateAction({
  prompt: "Drop the users table from the staging database"
});

if (result.decision === 'ALLOW') {
  // Execute database drop
} else {
  console.warn(`Action blocked: ${result.reasonEn}`);
  // Handle DENY, ESCALATE, or CLARIFY
}
```

### 3. Agent Integration Skills
We provide pre-configured rules to instantly inject AXON policy awareness into popular developer tools.

#### Cursor IDE
Forces Cursor's Composer to consult AXON before applying codebase refactors.
1. Create a `.cursor/rules` directory in your target project.
2. Copy the AXON rule:
   ```bash
   cp .cursor/rules/axon-decision.mdc /path/to/your/project/.cursor/rules/
   ```

#### Claude Code
Binds AXON to Claude Code's terminal execution layer.
1. Ensure your target project is initialized with Claude Code.
2. Copy the AXON skill:
   ```bash
   mkdir -p /path/to/your/project/.claude/skills/axon-decision
   cp .claude/skills/axon-decision/SKILL.md /path/to/your/project/.claude/skills/axon-decision/
   ```

#### Antigravity
Enforces policy-compliant execution for Antigravity autonomous agents.
1. Ensure your target project uses Antigravity.
2. Copy the AXON skill:
   ```bash
   mkdir -p /path/to/your/project/.agents/skills/axon-decision-engine
   cp .agents/skills/axon-decision-engine/SKILL.md /path/to/your/project/.agents/skills/axon-decision-engine/
   ```

---

## 📂 Project Structure Overview

- `app/api/decide/route.ts`: The core AI engine, executing Gemini and applying structured logic.
- `app/page.tsx`: The localized (EN/AR), real-time visualization and simulation dashboard.
- `lib/axon-sdk.ts`: The minimal TypeScript SDK for external consumption.
- `lib/firestore-service.ts`: The persistence layer with offline failover capability.
- `.cursor/rules/`: Cursor IDE integration assets.
- `.claude/skills/`: Claude Code integration assets.
- `.agents/skills/`: Antigravity integration assets.

---

## 📚 Documentation

For deep-dive technical details, explore the documentation:
- [System Architecture](docs/architecture.md)
- [SDK & API Reference](docs/sdk-reference.md)
- [Complete Setup Guide](docs/setup.md)
- [Detailed File Structure](docs/file-structure.md)
- [Product Roadmap](docs/roadmap.md)

---

## License & Compliance
AXON is an advisory decision-support system. While it evaluates operational safety risks, its recommendations do not constitute formal legal or regulatory advice. Always maintain Human-in-the-Loop clearance for tier-0 production modifications. 

Developed by **Obada Dallo**.
