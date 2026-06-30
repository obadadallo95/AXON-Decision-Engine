import { SecurityPolicy } from './firestore-service';

export interface AxonConfig {
  /**
   * The endpoint for the AXON Decision Engine.
   * Defaults to 'https://api.axon.internal/decide'
   */
  endpoint?: string;
  /**
   * API Key for authentication.
   */
  apiKey?: string;
  /**
   * Default security policies to apply if none are provided in the request.
   */
  defaultPolicies?: SecurityPolicy[];
}

export interface DecisionRequest {
  /**
   * The natural language prompt or system command that the AI intends to execute.
   */
  prompt: string;
  /**
   * Optional context for the action (e.g. environment, user role).
   */
  context?: Record<string, any>;
  /**
   * Specific policies to apply for this request.
   */
  policies?: SecurityPolicy[];
}

export interface DecisionResult {
  decision: 'ALLOW' | 'DENY' | 'NEEDS_CLARIFICATION' | 'ESCALATE_TO_HUMAN';
  riskScore: number;
  reasonEn: string;
  reasonAr: string;
  mitigationEn: string;
  mitigationAr: string;
  groundingEn: string;
  groundingAr: string;
  citations: string[];
}

/**
 * AXON Decision Engine SDK
 * 
 * Provides a robust interface for AI agents and developer tools to verify
 * actions against organizational security policies before execution.
 */
export class AxonDecisionEngine {
  private config: AxonConfig;

  constructor(config: AxonConfig = {}) {
    this.config = {
      endpoint: config.endpoint || 'https://api.axon.internal/decide',
      apiKey: config.apiKey || '',
      defaultPolicies: config.defaultPolicies || [],
    };
  }

  /**
   * Evaluates an intended action against active organizational policies.
   * Calling this method before code execution acts as a security guardrail.
   * 
   * @param request The action definition and optional context.
   * @returns A structured decision outlining safety and mitigation.
   */
  async evaluateAction(request: DecisionRequest): Promise<DecisionResult> {
    const policiesToApply = request.policies || this.config.defaultPolicies || [];
    
    // In a browser environment during local development, fallback to local API route
    // if the default internal endpoint is used.
    let url = this.config.endpoint as string;
    if (url === 'https://api.axon.internal/decide' && typeof window !== 'undefined') {
      url = '/api/decide';
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: request.prompt,
          policies: policiesToApply,
          context: request.context
        })
      });

      if (!response.ok) {
        throw new Error(`AXON SDK Evaluation failed with status: ${response.status}`);
      }

      const result = await response.json();
      return result as DecisionResult;
    } catch (error) {
      console.error("[AXON SDK Error]", error);
      throw error;
    }
  }

  /**
   * Helper function to quickly verify if an action can be safely executed
   * automatically without human intervention.
   */
  async isSafeToExecute(request: DecisionRequest): Promise<boolean> {
    try {
      const result = await this.evaluateAction(request);
      return result.decision === 'ALLOW';
    } catch (error) {
      // Fail secure: If engine is down, execution is not safe.
      return false;
    }
  }
}

// Export a singleton instance for quick use
export const axon = new AxonDecisionEngine();
