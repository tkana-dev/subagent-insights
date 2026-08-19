import { describe, expect, it } from "vitest";
import { ClaudeTranscriptNormalizer } from "../src/parser/claude-normalizer.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("ClaudeTranscriptNormalizer", () => {
  const normalizer = new ClaudeTranscriptNormalizer();

  it("should normalize sample Claude Code JSONL transcript correctly", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "subagent-test-"));
    const filePath = path.join(tmpDir, "agent-coder.jsonl");

    const sampleLines = [
      JSON.stringify({
        type: "user",
        timestamp: "2026-08-19T10:00:00Z",
        message: { content: "Fix bug in calculation" },
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-08-19T10:00:05Z",
        message: {
          content: [
            { type: "text", text: "Let me check the code." },
            {
              type: "tool_use",
              name: "Edit",
              input: { file: "calc.ts" },
            },
          ],
        },
      }),
      JSON.stringify({
        type: "tool_result",
        timestamp: "2026-08-19T10:00:10Z",
        name: "Edit",
        content: "File modified",
      }),
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-08-19T10:00:15Z",
        message: {
          content: [
            {
              type: "tool_use",
              name: "Bash",
              input: { command: "npm test" },
            },
          ],
        },
      }),
      JSON.stringify({
        type: "tool_result",
        timestamp: "2026-08-19T10:00:20Z",
        name: "Bash",
        content: "PASS: 5 tests passed",
      }),
    ];

    fs.writeFileSync(filePath, sampleLines.join("\n"), "utf-8");

    const session = await normalizer.parseFile(filePath);

    expect(session.agentId).toBe("coder");
    expect(session.agentName).toBe("Coder Agent");
    expect(session.events.length).toBe(6); // user_msg, text, tool_call, tool_result, tool_call, tool_result
    expect(session.events[0].type).toBe("user_message");
    expect(session.events[2].type).toBe("tool_call");
    expect(session.events[2].toolCall?.name).toBe("Edit");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
