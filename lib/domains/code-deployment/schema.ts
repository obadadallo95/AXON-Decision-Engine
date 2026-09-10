import { z } from "zod";

export const CodeDeploymentInputSchema = z
  .object({
    requestId: z.string().trim().min(1).max(128),
    service: z.string().trim().min(1).max(160).nullable(),
    environment: z
      .enum(["development", "staging", "production"])
      .nullable(),
    changeType: z.enum(["feature", "bugfix", "security_patch", "dependency", "schema"]),
    artifactSigned: z.boolean(),
    testsPassed: z.boolean(),
    rollbackAvailable: z.boolean(),
    deploymentWindowOpen: z.boolean(),
    freezeActive: z.boolean(),
    emergencyException: z.boolean(),
    approverIds: z.array(z.string().trim().min(1).max(128)).max(20),
    incidentId: z.string().trim().min(1).max(128).nullable(),
    changeTicketId: z.string().trim().min(1).max(128).nullable(),
    dependencyHealth: z.enum(["healthy", "degraded", "unknown", "blocked"]),
    changeSize: z.enum(["small", "medium", "large"]),
    productionImpact: z.enum(["none", "low", "high", "critical"]),
    requestedAt: z.string().trim().min(1).max(80),
  })
  .strict();

export type CodeDeploymentInput = z.infer<typeof CodeDeploymentInputSchema>;
