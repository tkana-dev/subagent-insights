import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HeuristicEvaluator } from "../src/eval/heuristics.js";
import { ClaudeTranscriptNormalizer } from "../src/parser/claude-normalizer.js";
import { MarkdownRenderer } from "../src/renderer/markdown.js";

/**
 * Regression fixtures in the REAL Claude Code transcript shape.
 *
 * Real transcripts never emit a top-level `{type:"tool_result"}` record: tool
 * results arrive as `tool_result` blocks inside a `type:"user"` message. An
 * earlier version only handled the synthetic shape, so every error in every
 * real log was invisible and every agent scored a flawless 100% recovery.
 */
function writeRealTranscript(dir: string): string {
  const filePath = path.join(dir, "agent-implementer.jsonl");
  const lines = [
    {
      type: "user",
      isSidechain: true,
      attributionAgent: "implementer",
      timestamp: "2026-08-19T10:00:00Z",
      message: { role: "user", content: "Fix the failing auth test." },
    },
    {
      type: "assistant",
      attributionAgent: "implementer",
      timestamp: "2026-08-19T10:00:05Z",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Should I run the suite in /Users/someone/secret-repo/src/auth.ts instead?" },
          { type: "tool_use", id: "toolu_1", name: "Bash", input: { command: "npm test" } },
        ],
      },
    },
    {
      type: "user",
      attributionAgent: "implementer",
      timestamp: "2026-08-19T10:00:09Z",
      message: {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_1",
            is_error: true,
            content: "Exit code 1\nFAIL src/auth.test.ts",
          },
        ],
      },
    },
    {
      type: "assistant",
      attributionAgent: "implementer",
      timestamp: "2026-08-19T10:00:20Z",
      message: {
        role: "assistant",
        content: [{ type: "tool_use", id: "toolu_2", name: "Bash", input: { command: "npm test" } }],
      },
    },
    {
      type: "user",
      attributionAgent: "implementer",
      timestamp: "2026-08-19T10:00:25Z",
      message: {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "toolu_2", content: "PASS 12 tests" },
        ],
      },
    },
  ];
  fs.writeFileSync(filePath, lines.map((l) => JSON.stringify(l)).join("\n"), "utf-8");
  return filePath;
}

describe("real Claude Code transcript format", () => {
  it("extracts tool_result blocks nested in user messages, including errors", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "si-real-"));
    const session = await new ClaudeTranscriptNormalizer().parseFile(writeRealTranscript(dir));

    expect(session.agentId).toBe("implementer");

    const errors = session.events.filter((e) => e.type === "error");
    const results = session.events.filter((e) => e.type === "tool_result");
    expect(errors).toHaveLength(1);
    expect(results).toHaveLength(1);

    // tool_result blocks carry only a tool_use_id; the name must be recovered.
    expect(errors[0].toolCall?.name).toBe("Bash");
    expect(results[0].toolCall?.name).toBe("Bash");

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reports a recovery only when the same tool is retried successfully", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "si-real-"));
    const session = await new ClaudeTranscriptNormalizer().parseFile(writeRealTranscript(dir));
    const result = new HeuristicEvaluator().evaluateSessions([session]);

    expect(result.failurePattern.key).not.toBe("flawless");
    expect(result.failurePattern.recoveryRate).toBe(1);

    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("never leaks transcript text, paths or identifiers into rendered output", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "si-real-"));
    const session = await new ClaudeTranscriptNormalizer().parseFile(writeRealTranscript(dir));
    const result = new HeuristicEvaluator().evaluateSessions([session]);

    for (const behavior of result.interestingBehaviors) {
      expect(behavior.description).not.toMatch(/secret-repo|\/Users\/|auth\.ts/);
    }

    const md = new MarkdownRenderer().render(result, "en");
    expect(md).not.toMatch(/secret-repo/);
    expect(md).not.toMatch(/\/Users\//);
    expect(md).not.toMatch(/auth\.test\.ts/);

    fs.rmSync(dir, { recursive: true, force: true });
  });
});
