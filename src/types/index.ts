/**
 * Subagent Insights Data Types & Schemas
 */

export interface AgentInfo {
  id: string;
  name: string;
  description?: string;
  model?: string;
}

export interface ReviewPeriod {
  from: string;
  to: string;
  totalSessions: number;
  totalEvents: number;
}

export type DimensionKey =
  | "task_completion"
  | "instruction_following"
  | "quality"
  | "verification"
  | "efficiency"
  | "critical_thinking";

export interface ScoreEvidence {
  key: string;
  passed: boolean;
  message: string;
  messageJa?: string;
  count?: number;
  timestamp?: string;
  details?: string;
}

/**
 * The observed rate a dimension score was derived from.
 *
 * Scores are produced by a fixed published rubric, not by ranking against a
 * population, so this raw rate is what two people can meaningfully compare
 * when they put their reports side by side.
 */
export interface DimensionMetric {
  /** Machine-comparable value (a rate or count). */
  value: number;
  /** Human rendering, e.g. "0.12 tests per edit". */
  display: string;
  displayJa?: string;
}

export interface DimensionScore {
  key: DimensionKey;
  score: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  evidence: ScoreEvidence[];
  metric?: DimensionMetric;
}

export type WorkStyleId =
  | "cautious_builder"
  | "speedrunner"
  | "deep_explorer"
  | "quality_gatekeeper"
  | "critical_analyst"
  | "autonomous_troubleshooter"
  | "direct_implementer"
  | "balanced_generalist"
  | "systematic_architect"
  | "minimalist_patcher"
  | "rigorous_verifier"
  | "pragmatic_shipper"
  | "defensive_gardener"
  | "iterative_prototyper"
  | "proactive_optimizer"
  | "thorough_auditor";

export interface WorkStyle {
  id: WorkStyleId;
  label: string;
  badge: string;
  summary: string;
  traits: string[];
}

export interface InterestingBehavior {
  title: string;
  titleJa?: string;
  description: string;
  descriptionJa?: string;
  timestamp?: string;
}

export type FailurePatternKey =
  | "flawless"
  | "resilient"
  | "overconfident"
  | "looper"
  | "hesitant"
  | "verification_specialist"
  | "no_data";

export interface FailurePattern {
  key: FailurePatternKey;
  name: string;
  description: string;
  frequency: "low" | "medium" | "high";
  steps: string[];
  stepsJa?: string[];
  recoveryRate: number; // 0.0 - 1.0
}

export type InterventionKey = "verification" | "efficiency" | "critical_thinking" | "quality" | "best_practice";

export interface Intervention {
  key: InterventionKey;
  title: string;
  titleJa?: string;
  reason: string;
  reasonJa?: string;
  suggestedInstruction: string;
  suggestedInstructionJa?: string;
  targetFile?: string;
}

export interface TrendComparison {
  dimension: DimensionKey;
  previousScore: number;
  currentScore: number;
  direction: "up" | "down" | "flat";
}

export interface AgentReviewResult {
  schemaVersion: "1.0.0";
  agent: AgentInfo;
  period: ReviewPeriod;
  overallGrade: "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "D";
  overallScore: number;
  workStyle: WorkStyle;
  dimensions: Record<DimensionKey, DimensionScore>;
  strengths: string[];
  strengthsJa?: string[];
  areasToImprove: string[];
  areasToImproveJa?: string[];
  interestingBehaviors: InterestingBehavior[];
  failurePattern: FailurePattern;
  interventions: Intervention[];
  trends?: TrendComparison[];
  confidence: number;
  hasEnoughData: boolean;
}

/**
 * Normalized Internal Event Stream for Subagent Transcripts
 */
export type EventType =
  | "user_message"
  | "agent_message"
  | "tool_call"
  | "tool_result"
  | "error"
  | "session_start"
  | "session_end";

export interface CanonicalToolCall {
  name: string;
  input: Record<string, unknown>;
  output?: string;
  isError?: boolean;
  durationMs?: number;
}

export interface CanonicalEvent {
  id: string;
  timestamp: string;
  type: EventType;
  agentId?: string;
  content?: string;
  toolCall?: CanonicalToolCall;
  tokens?: {
    input?: number;
    output?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface SubagentSession {
  sessionId: string;
  agentId: string;
  agentName?: string;
  filePath: string;
  startTime: string;
  endTime: string;
  events: CanonicalEvent[];
}
