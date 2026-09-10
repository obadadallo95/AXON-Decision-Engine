# Overview

**AXON** is a bilingual challenge prototype for evaluating and recording AI-proposed actions against server-owned safety policies before an external system could execute them.

## The Challenge
*"Can you build an AI system that knows when it is allowed to act?"*

Modern AI agents and IDEs (Cursor, Claude Code, Antigravity) have powerful capabilities to write code, install dependencies, and run terminal commands. However, they lack organizational awareness. They do not know if a package is forbidden by the company's security policy, or if modifying a specific database schema requires senior engineering review.

## The Solution
AXON serves as an external, objective Decision Engine. Before an agent executes a risky action, it consults AXON. AXON can use Google's Gemini models to interpret bounded action data and supplied evidence, while the server-owned deterministic kernel decides if the agent should proceed.

This decoupling keeps the agent separate from governance rules while AXON returns one of five canonical states: `EXECUTE`, `ASK`, `DEFER`, `ESCALATE`, or `REFUSE`. AXON records decisions but does not execute real actions; evidence is synthetic, reviewer identity is simulated, and audit storage is process-local.
