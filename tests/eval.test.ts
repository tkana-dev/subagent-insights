import { describe, expect, it } from "vitest";
import { HeuristicEvaluator } from "../src/eval/heuristics.js";
import type { SubagentSession } from "../src/types/index.js";

describe("Evaluation Engine & 16 Work Styles", () => {
  const evaluator = new HeuristicEvaluator();

  it("should evaluate arbitrary custom agent with high edits and low tests as Speedrunner / Pragmatic Shipper", () => {
    const arbitraryAgentSession: SubagentSession = {
      sessionId: "s1",
      agentId: "custom-worker-99",
      agentName: "Custom Worker 99",
      filePath: "/fake/agent-custom-worker-99.jsonl",
      startTime: "2026-08-19T00:00:00Z",
      endTime: "2026-08-19T00:01:00Z",
      events: [
        {
          id: "1",
          timestamp: "2026-08-19T00:00:00Z",
          type: "user_message",
          content: "Change text to hello world",
        },
        {
          id: "2",
          timestamp: "2026-08-19T00:00:05Z",
          type: "tool_call",
          toolCall: { name: "Edit", input: { file: "msg.ts" } },
        },
        {
          id: "3",
          timestamp: "2026-08-19T00:00:10Z",
          type: "tool_result",
          toolCall: { name: "Edit", input: {}, output: "Done" },
        },
        {
          id: "4",
          timestamp: "2026-08-19T00:00:15Z",
          type: "agent_message",
          content: "I have updated the message.",
        },
      ],
    };

    const result = evaluator.evaluateSessions([arbitraryAgentSession]);

    expect(result.agent.id).toBe("custom-worker-99");
    expect(["speedrunner", "pragmatic_shipper", "minimalist_patcher"]).toContain(result.workStyle.id);
    expect(result.interventions.length).toBe(1);
    expect(result.interventions[0].targetFile).toBe(".claude/agents/custom-worker-99.md");
  });

  it("should evaluate inspection agent (zero edits, high tests) as Rigorous Verifier", () => {
    const scannerSession: SubagentSession = {
      sessionId: "s2",
      agentId: "security-scanner",
      agentName: "Security Scanner",
      filePath: "/fake/agent-security-scanner.jsonl",
      startTime: "2026-08-19T00:00:00Z",
      endTime: "2026-08-19T00:05:00Z",
      events: [
        { id: "1", timestamp: "2026-08-19T00:00:00Z", type: "user_message", content: "Audit vulnerabilities" },
        { id: "2", timestamp: "2026-08-19T00:00:05Z", type: "tool_call", toolCall: { name: "Grep", input: { pattern: "eval" } } },
        { id: "3", timestamp: "2026-08-19T00:00:10Z", type: "tool_result", toolCall: { name: "Grep", input: {}, output: "clean" } },
        { id: "4", timestamp: "2026-08-19T00:00:15Z", type: "tool_call", toolCall: { name: "View", input: { file: "auth.ts" } } },
        { id: "5", timestamp: "2026-08-19T00:00:20Z", type: "tool_result", toolCall: { name: "View", input: {}, output: "code" } },
        { id: "6", timestamp: "2026-08-19T00:00:25Z", type: "tool_call", toolCall: { name: "Bash", input: { command: "npm test" } } },
        { id: "7", timestamp: "2026-08-19T00:00:30Z", type: "tool_result", toolCall: { name: "Bash", input: {}, output: "PASS" } },
        { id: "8", timestamp: "2026-08-19T00:00:35Z", type: "agent_message", content: "Is the cookie secure flag enabled in production environment?" },
      ],
    };

    const result = evaluator.evaluateSessions([scannerSession]);

    expect(result.dimensions.verification.score).toBeGreaterThanOrEqual(90);
    expect(result.interventions.length).toBe(1);
    expect(result.interventions[0].targetFile).toBe(".claude/agents/security-scanner.md");
  });
});
