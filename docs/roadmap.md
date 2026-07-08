# Product Roadmap

Currently, AXON is designed as a targeted MVP for the **DOO Builders League**. It proves that we can build an AI system that knows when it is allowed to act.

## Future Ambitions

While the MVP is intentionally focused, the long-term vision includes:

1. **Enterprise SSO & RBAC**: Connecting AXON to Okta/Entra ID to verify not just the action, but whether the *user* making the request is authorized.
2. **Automated Rollbacks**: If an action is allowed but causes a crash, automatically restoring the previous state.
3. **Advanced Audit Tracing**: Exporting immutable audit logs to SIEM systems (like Splunk or Datadog).
4. **Agent-Specific Profiles**: Having dedicated profiles and tailored risk thresholds depending on whether Cursor, Claude Code, or an automated CI pipeline is executing the action.
