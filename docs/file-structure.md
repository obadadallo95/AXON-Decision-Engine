# File Structure

The repository is structured to prioritize a clean separation between the server-side AI evaluation layer, the web-based simulation client, and the external SDK interfaces.

```text
├── app/
│   ├── api/
│   │   └── decide/
│   │       └── route.ts         # The core Next.js Serverless Route. Houses the Gemini SDK and handles all evaluations.
│   ├── globals.css              # Global styles, Tailwind v4 theme configurations, and custom CSS variables.
│   ├── layout.tsx               # Root Layout providing React Context wrappers, font loading, and HTML framing.
│   └── page.tsx                 # The primary AXON Dashboard UI. Contains the visual simulator, policy manager, and system logs.
│
├── docs/
│   ├── architecture.md          # Systems architecture, diagrams, and design philosophy.
│   ├── file-structure.md        # This file.
│   ├── overview.md              # High-level product pitch and challenge framing.
│   ├── roadmap.md               # Future feature projections and enterprise ambitions.
│   ├── sdk-reference.md         # API schema, SDK TypeScript documentation, and code examples.
│   └── setup.md                 # Local installation and production deployment guide.
│
├── hooks/
│   └── use-speech.ts            # A custom React Hook interfacing with the browser Web Speech API for voice dictation.
│
├── lib/
│   ├── auth-context.tsx         # React Context managing the active User Profile (e.g. Operator vs. Reviewer).
│   ├── axon-sdk.ts              # The external developer SDK exposing `AxonDecisionEngine` for programmatic use.
│   ├── firebase.ts              # Firebase client initialization.
│   ├── firestore-service.ts     # The dual-layer storage module (Firestore with robust `localStorage` failover).
│   ├── i18n.tsx                 # Core translation dictionaries and RTL logic for bilingual support.
│   ├── scenarios.ts             # Static mocked scenarios used for rapid UI testing and demonstrations.
│   └── utils.ts                 # Utility functions (e.g. Tailwind class mergers).
│
├── .agents/skills/              # Integration folder: Contains the `SKILL.md` file for Google Antigravity agents.
├── .claude/skills/              # Integration folder: Contains the `SKILL.md` file for Anthropic's Claude Code CLI.
├── .cursor/rules/               # Integration folder: Contains the `axon-decision.mdc` file for the Cursor IDE.
│
├── package.json                 # Core Node/Next.js dependencies and run scripts.
├── tsconfig.json                # Strict TypeScript configuration.
├── tailwind.config.js           # Standard Tailwind setup.
├── PRIVACY.md                   # Mock privacy standards and system compliance notes.
└── TERMS.md                     # Mock governance liability disclaimers.
```
