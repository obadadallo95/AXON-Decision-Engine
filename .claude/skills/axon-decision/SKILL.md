---
name: axon-decision
description: Use AXON Decision Engine to evaluate the safety and compliance of proposed actions before executing them.
---

# AXON Decision Engine

This skill connects Claude Code to the AXON Decision Engine, serving as an organizational safeguard. 

## Instructions

When the user asks you to perform an action that modifies state, installs new dependencies, or changes system configurations, you MUST first evaluate the action via the AXON API if the AXON engine is running.

### 1. Formulate the Request
Prepare a JSON payload describing your intended action.

### 2. Check the Engine
Send a POST request to the AXON endpoint (e.g., `http://localhost:3000/api/decide` or the deployed API URL).

```bash
curl -X POST http://localhost:3000/api/decide \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Install a new npm package: lodash"}'
```

### 3. Interpret the Decision
Read the `decision` field from the JSON response:
- `ALLOW`: Execute the task.
- `DENY`: Refuse the task and output the `reasonEn` to the user.
- `NEEDS_CLARIFICATION`: Prompt the user for more information based on `mitigationEn`.
- `ESCALATE_TO_HUMAN`: Halt operations and instruct the user to execute this action manually.
