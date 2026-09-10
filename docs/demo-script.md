# 90-Second Demo Script

Use the dashboard at `http://localhost:3000`. Keep the scenario runner visible and run each fixture from the matching domain selector.

| Time | Click / show | Spoken line |
| --- | --- | --- |
| 0–15s | Choose **Code Deployment** → **Safe staging release** → **Run**. | “AXON sits between an AI proposal and execution. It asks one question: should this action execute? A complete, low-risk staging release returns **EXECUTE**.” |
| 15–30s | Choose **Support Ticket Triage** → **Missing ticket context** → **Run**. | “Missing facts are not a risk score. They are **ASK**: the requester must provide the tenant, severity, and reproduction details.” |
| 30–45s | Choose **Routing system pending** → **Run**. | “A temporary system condition is different. The routing system is unavailable, so AXON returns **DEFER** and waits for conditions to change.” |
| 45–58s | Choose **Refund Approval** → **Duplicate payout** → **Run**. | “A prohibited duplicate payout is a hard **REFUSE**. It is not a review queue and it is not a model preference.” |
| 58–78s | Choose **High-value refund — stale/conflicting** → **Run**. | “This is the deliberate failure: a €4,800 refund, stale payment evidence, conflicting fraud evidence, three chargebacks, and missing finance approval. AXON returns **ESCALATE**. Approval alone does not repair stale or conflicting evidence.” |
| 78–90s | Expand **Evidence** and **Decision Trace**; point to the audit ID. | “The trace is input, signals, reasoning, and outcome. Gemini may advise, but AXON’s server-owned policy decides and records the result. **ASK is not DEFER, and neither is ESCALATE.**” |

If time is tight, run the five scenarios without opening the review queue. The refund result is the proof point; evidence details and the audit ID are the final close.
