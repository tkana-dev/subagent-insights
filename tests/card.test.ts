import { describe, expect, it } from "vitest";
import { HeuristicEvaluator } from "../src/eval/heuristics.js";
import { buildCardSvg } from "../src/renderer/card.js";
import { displayWidth } from "../src/renderer/share.js";
import type { SubagentSession } from "../src/types/index.js";

function report(agentId: string, content: string) {
  const session: SubagentSession = {
    sessionId: "s",
    agentId,
    agentName: agentId,
    filePath: "/Users/someone/secret-repo/.claude/agent.jsonl",
    startTime: "2026-08-12T00:00:00Z",
    endTime: "2026-08-12T00:10:00Z",
    events: [
      { id: "1", timestamp: "2026-08-12T00:00:00Z", type: "agent_message", content },
      { id: "2", timestamp: "2026-08-12T00:00:01Z", type: "tool_call", toolCall: { name: "Edit", input: {} } },
      { id: "3", timestamp: "2026-08-12T00:00:02Z", type: "tool_result", toolCall: { name: "Edit", input: {}, output: "ok" } },
    ],
  };
  return new HeuristicEvaluator().evaluateSessions([session]);
}

describe("buildCardSvg", () => {
  it("escapes agent names, which come from user config and can contain anything", () => {
    const svg = buildCardSvg(report('</text><script>alert(1)</script>', "done"), "en");
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;/text&gt;");
  });

  it("carries no transcript text, paths or repository names", () => {
    const svg = buildCardSvg(
      report("implementer", "Patched /Users/someone/secret-repo/src/billing.ts — retry the cache?"),
      "en"
    );
    expect(svg).not.toMatch(/secret-repo|\/Users\/|billing\.ts/);
  });

  it("keeps every row inside the canvas in both languages", () => {
    // Japanese labels are twice as wide per character, which is what pushed the
    // rate column off the right edge in the first version.
    for (const lang of ["en", "ja"] as const) {
      const svg = buildCardSvg(report("implementer", "done"), lang);

      const rowFont = Number(svg.match(/<text x="80" y="248" [^>]*font-size="(\d+)"/)![1]);
      const rates = [...svg.matchAll(/<text x="(\d+)" y="(?:248|294|340|386|432|478)" fill="#8f8f88" font-size="(\d+)">([^<]*)<\/text>/g)];
      expect(rates.length, `${lang}: no rate cells found`).toBeGreaterThanOrEqual(6);

      for (const [, x, size, text] of rates) {
        const right = Number(x) + displayWidth(text) * Number(size) * 0.62;
        expect(right, `${lang}: "${text}" overflows the panel`).toBeLessThanOrEqual(1120);
      }
      expect(rowFont).toBeGreaterThanOrEqual(14);
    }
  });

  it("puts the last row above the divider rule", () => {
    const svg = buildCardSvg(report("implementer", "done"), "en");
    const lastRowY = 248 + 5 * 46;
    const dividerY = Number(svg.match(/y1="(\d+)"[^>]*stroke-width="2"\/>\s*\n\s*<text[^>]*Failure/s)?.[1] ?? 0);
    expect(lastRowY).toBeLessThan(508);
    expect(dividerY === 0 || dividerY > lastRowY).toBe(true);
  });
});
