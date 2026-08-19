import { describe, expect, it } from "vitest";
import { HeuristicEvaluator } from "../src/eval/heuristics.js";
import { MarkdownRenderer } from "../src/renderer/markdown.js";
import { TerminalRenderer } from "../src/renderer/terminal.js";
import type { SubagentSession } from "../src/types/index.js";

describe("Renderer", () => {
  const evaluator = new HeuristicEvaluator();
  const terminalRenderer = new TerminalRenderer();
  const markdownRenderer = new MarkdownRenderer();

  const dummySession: SubagentSession = {
    sessionId: "s-render",
    agentId: "reviewer",
    agentName: "Reviewer Agent",
    filePath: "/dummy.jsonl",
    startTime: "2026-08-19T00:00:00Z",
    endTime: "2026-08-19T00:05:00Z",
    events: [
      { id: "1", timestamp: "2026-08-19T00:00:00Z", type: "user_message", content: "Review code" },
      { id: "2", timestamp: "2026-08-19T00:00:05Z", type: "agent_message", content: "Review complete" },
    ],
  };

  it("should render terminal output properly in en and ja", () => {
    const result = evaluator.evaluateSessions([dummySession]);

    const outputEn = terminalRenderer.render(result, { lang: "en" });
    expect(outputEn).toContain("AGENT PERFORMANCE REVIEW");
    expect(outputEn).toContain("Reviewer Agent");

    const outputJa = terminalRenderer.render(result, { lang: "ja", showEvidence: true });
    expect(outputJa).toContain("AIエージェント 人事評価シート");
    expect(outputJa).toContain("行動パターン・ワーキングスタイル (Work Pattern)");
    expect(outputJa).toContain("主な強み (Key Strengths)");
  });

  it("should render markdown output properly in en and ja", () => {
    const result = evaluator.evaluateSessions([dummySession]);
    const mdEn = markdownRenderer.render(result, "en");
    expect(mdEn).toContain("# 📋 AGENT PERFORMANCE REVIEW");
    expect(mdEn).toContain("## 🎭 Observed Work Pattern");

    const mdJa = markdownRenderer.render(result, "ja");
    expect(mdJa).toContain("# 📋 AIエージェント 人事評価シート");
    expect(mdJa).toContain("## 🎭 行動パターン・ワーキングスタイル (Work Pattern)");
  });
});
