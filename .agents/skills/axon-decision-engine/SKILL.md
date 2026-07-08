---
name: axon-decision-engine
description: Integrates the AXON Decision Engine to verify code execution and terminal actions against organizational security policies before applying changes.
---

# AXON Decision Engine Skill

This skill enables Antigravity to act as a secure, policy-compliant agent by verifying sensitive actions through the AXON Decision Engine API.

## When to Use

Use this skill whenever you are about to:
1. Execute a command that modifies production state or infrastructure.
2. Read, modify, or delete sensitive data (credentials, user databases).
3. Change global configuration files.
4. Interact with external APIs that incur costs or risks.

## Usage

Before executing a high-risk action, query the local AXON API (`/api/decide`) using your preferred HTTP client or fetch snippet if working inside a node environment.

If you have a terminal, you can verify via curl:

```bash
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AXON_API_KEY}" \
  -d '{"prompt": "Your proposed action here"}'
```

Parse the JSON response. If `decision` is:
- **ALLOW**: Proceed with the action.
- **DENY**: Do NOT execute the action. Inform the user of the denial reason.
- **NEEDS_CLARIFICATION**: Ask the user for more context.
- **ESCALATE_TO_HUMAN**: Ask the user to execute the command themselves.
