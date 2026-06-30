# AXON Decision Engine SDK

The **AXON AI Guardrail SDK** allows developers of AI agents, coding assistants (e.g., Copilot, Antigravity, Cursor), and operational bots to verify the compliance and safety of an intended action *before* it is executed.

By integrating AXON into your agent's reasoning loop, you empower the AI with a "brain" that prevents destructive commands, configuration drifts, and unapproved production changes.

## Installation

Currently, the SDK is available for internal integrations. To use it in a Node.js or TypeScript environment, simply import the module:

```typescript
import { axon, DecisionRequest } from '@axon/sdk';
```

*(Note: In a standard deployment, this would be published as `npm install @axon-security/sdk`)*

## Authentication & Configuration

The SDK defaults to hitting your local API route (`/api/decide`). For production usage, configure the client with a remote endpoint and API key:

```typescript
import { AxonDecisionEngine } from '@axon/sdk';

const axon = new AxonDecisionEngine({
  endpoint: "https://api.axon.internal/decide",
  apiKey: process.env.AXON_API_KEY
});
```

## Basic Usage

Before executing an action, pass the AI's intended prompt to the `isSafeToExecute` helper:

```typescript
const request: DecisionRequest = {
  prompt: "Drop the temporary users table in the production database.",
  context: { 
    userRole: "AI_AGENT", 
    environment: "production" 
  }
};

const isSafe = await axon.isSafeToExecute(request);

if (!isSafe) {
  console.log("AXON Guardrail blocked this action. Aborting execution.");
  process.exit(1);
}
```

## Advanced Decision Analysis

If you need to read the technical mitigation steps or the exact reason why the action was blocked, use `evaluateAction`:

```typescript
const result = await axon.evaluateAction({
  prompt: "Upgrade the payment gateway library from v2.4 to v3.0.1",
});

if (result.decision === 'ESCALATE_TO_HUMAN') {
  console.log("Risk Score:", result.riskScore);
  console.log("Reason (EN):", result.reasonEn);
  console.log("Mitigation (AR):", result.mitigationAr);
  
  // Forward to an approval queue...
}
```

## The Response Object (`DecisionResult`)

```typescript
interface DecisionResult {
  decision: 'ALLOW' | 'DENY' | 'NEEDS_CLARIFICATION' | 'ESCALATE_TO_HUMAN';
  riskScore: number;       // 0 to 100 severity scale
  reasonEn: string;        // Executive summary of the decision (English)
  reasonAr: string;        // Executive summary of the decision (Arabic)
  mitigationEn: string;    // Recommended safe alternative (English)
  mitigationAr: string;    // Recommended safe alternative (Arabic)
  groundingEn: string;     // Factual citations from Google Search (English)
  groundingAr: string;     // Factual citations from Google Search (Arabic)
  citations: string[];     // Array of URLs referenced
}
```

## Integration Patterns for AI Agents

When building a system like **Antigravity**, you should inject the AXON evaluation call directly into the tool-calling loop:

1. **AI decides to use `shell_exec`** with command `rm -rf /var/www/html`
2. **Execution wrapper intercepts** the intended command.
3. Wrapper calls `axon.evaluateAction({ prompt: command })`.
4. AXON returns `DENY`.
5. Wrapper blocks the tool call and returns the `reasonEn` back to the AI model so the AI knows *why* it failed and can adjust its behavior.
