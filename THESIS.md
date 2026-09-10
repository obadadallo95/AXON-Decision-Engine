# The Separation of Intelligence from Authority

Over the next two years, models will become capable of proposing increasingly consequential actions faster than organizations can safely expand their authority. The winning pattern will not be one universal agent framework. It will be a reusable boundary:

```text
proposed action + context → decision + evidence
```

AXON is a concrete version of that boundary. Models can reason probabilistically about bounded language and evidence, while independently evaluated facts and server-owned policies retain authorization. That separation makes model capability useful without making model confidence a permission system.

Authorization will also become temporal. Fresh evidence may permit an action; the same evidence after expiry should invalidate that authorization. This is why AXON treats `ASK`, `DEFER`, `ESCALATE`, and `REFUSE` as different operational contracts rather than softer versions of human review: missing facts need a requester, unstable conditions need time, authority gaps need a person, and prohibited actions need a hard stop.

Machine-readable evidence, reason codes, and audit events will matter more than persuasive model prose. Across heterogeneous agents and tools, a decision layer could become shared trust infrastructure: each agent proposes, the boundary evaluates, and an external gateway enforces the result before execution.

AXON demonstrates this protocol with synthetic evidence, a process-local audit repository, simulated review identity, and no real execution. It does not yet solve trustworthy external evidence acquisition or the enforcement problem at every downstream tool. Those limits are part of the thesis: intelligence can scale quickly, but authority must remain explicit, bounded, time-aware, and inspectable.
