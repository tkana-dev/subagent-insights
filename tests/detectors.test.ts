import { describe, expect, it } from "vitest";
import { classifyToolError, isQuestionOrAlternative, isTestCommand } from "../src/eval/heuristics.js";

describe("isTestCommand", () => {
  it.each([
    "npm test",
    "npm run test:unit",
    "pnpm run typecheck",
    "npx vitest run",
    "pytest -q",
    "cargo test",
    "go test ./...",
    "swift test",
    "tsc --noemit",
    "npm run build && npm test",
  ])("counts %s", (cmd) => expect(isTestCommand(cmd)).toBe(true));

  // These merely read files whose names contain "test" — they run nothing.
  it.each([
    'grep -r "test" src',
    "cat src/auth.test.ts",
    "ls tests/",
    "rg test",
    'find . -name "*.test.ts"',
    "head -50 foo_test.py",
    "git status",
    "echo test",
  ])("does not count %s", (cmd) => expect(isTestCommand(cmd)).toBe(false));
});

describe("isQuestionOrAlternative", () => {
  it.each([
    "Should I use A or B?",
    "この方針でよろしいですか？",
    "代替案を提示します",
    "Use a queue instead of a cron job.",
  ])("detects %s", (t) => expect(isQuestionOrAlternative(t)).toBe(true));

  // A bare "?" is not a question: it shows up in ternaries, URLs and regexes.
  it.each([
    "const p = a?'pro':'free'",
    "See https://example.com/a?b=1",
    "```js\nx = a ? b : c\n```\nDone.",
    "`foo?.bar` は安全です",
    "All done. Not committing per instructions.",
  ])("ignores %s", (t) => expect(isQuestionOrAlternative(t)).toBe(false));
});

describe("classifyToolError", () => {
  // Misuse of the tool, or an action the harness refused.
  it.each([
    "<tool_use_error>InputValidationError: Read was called with input that could not be parsed as JSON.",
    "<tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>",
    "PreToolUse:Bash hook error: [docs-first-check.sh]: 設計書の更新が必要です",
    "Permission denied",
    "String not found in file",
  ])("flags %s as a protocol violation", (o) =>
    expect(classifyToolError(o)).toBe("protocol_violation")
  );

  // The work failed. That is not a discipline problem.
  it.each([
    "Exit code 1\nFAIL src/auth.test.ts",
    "File does not exist.",
    "error TS2345: Argument of type 'string' is not assignable",
  ])("flags %s as a work failure", (o) => expect(classifyToolError(o)).toBe("work_failure"));
});

describe("dimension metrics", () => {
  // The raw rate is what makes two people's reports comparable, since scores
  // come from a fixed rubric rather than a ranking. Every dimension must carry
  // one, or a shared report silently loses its only comparable number.
  it("attaches an observed rate to every dimension", async () => {
    const { HeuristicEvaluator } = await import("../src/eval/heuristics.js");
    const { ClaudeTranscriptNormalizer } = await import("../src/parser/claude-normalizer.js");
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "si-metric-"));
    const file = path.join(dir, "agent-x.jsonl");
    fs.writeFileSync(
      file,
      [
        { type: "user", message: { role: "user", content: "go" } },
        {
          type: "assistant",
          message: {
            role: "assistant",
            content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "npm test" } }],
          },
        },
        {
          type: "user",
          message: {
            role: "user",
            content: [{ type: "tool_result", tool_use_id: "t1", content: "PASS" }],
          },
        },
      ]
        .map((l) => JSON.stringify(l))
        .join("\n")
    );

    const session = await new ClaudeTranscriptNormalizer().parseFile(file);
    const result = new HeuristicEvaluator().evaluateSessions([session]);

    for (const [key, dim] of Object.entries(result.dimensions)) {
      expect(dim.metric, `${key} has no observed rate`).toBeDefined();
      expect(Number.isFinite(dim.metric!.value), `${key} rate is not finite`).toBe(true);
      expect(dim.metric!.display.length).toBeGreaterThan(0);
      expect(dim.metric!.displayJa?.length ?? 1).toBeGreaterThan(0);
    }

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("buildDiscordMessage", () => {
  it("aligns the score column in Japanese, where labels are double-width", async () => {
    const { buildDiscordMessage } = await import("../src/renderer/share.js");
    const { HeuristicEvaluator } = await import("../src/eval/heuristics.js");

    const result = new HeuristicEvaluator().evaluateSessions([
      {
        sessionId: "s",
        agentId: "implementer",
        agentName: "Implementer",
        filePath: "/tmp/agent-implementer.jsonl",
        startTime: "2026-08-12T00:00:00Z",
        endTime: "2026-08-12T00:10:00Z",
        events: [
          { id: "1", timestamp: "2026-08-12T00:00:00Z", type: "tool_call", toolCall: { name: "Edit", input: {} } },
          { id: "2", timestamp: "2026-08-12T00:00:01Z", type: "tool_result", toolCall: { name: "Edit", input: {}, output: "ok" } },
        ],
      },
    ]);

    for (const lang of ["en", "ja"] as const) {
      const rows = buildDiscordMessage(result, lang)
        .split("\n")
        .filter((l) => /\s{3}\S/.test(l) && !l.startsWith("`") && !l.startsWith("*") && !l.startsWith("http"));

      expect(rows.length).toBe(6);

      // Column width is measured in terminal columns, not UTF-16 units, so the
      // scores must line up at the same visual offset in every row.
      const width = (t: string) =>
        [...t].reduce((n, c) => {
          const cp = c.codePointAt(0) ?? 0;
          const wide =
            (cp >= 0x1100 && cp <= 0x115f) ||
            (cp >= 0x2e80 && cp <= 0xa4cf) ||
            (cp >= 0xac00 && cp <= 0xd7a3) ||
            (cp >= 0xff00 && cp <= 0xff60);
          return n + (wide ? 2 : 1);
        }, 0);

      // Scores are right-aligned, so the digits start at different columns for
      // 2- and 3-digit values. What must line up is where the score field ends
      // and the observed rate begins.
      const offsets = new Set(
        rows.map((r) => {
          const m = r.match(/^(.*?\s+\d{1,3})   \S/);
          expect(m, `${lang} row not in expected shape: ${r}`).not.toBeNull();
          return width(m![1]);
        })
      );
      expect(offsets.size, `${lang} score column is ragged`).toBe(1);
    }
  });

  it("carries no transcript text, paths or repository names", async () => {
    const { buildDiscordMessage } = await import("../src/renderer/share.js");
    const { HeuristicEvaluator } = await import("../src/eval/heuristics.js");

    const result = new HeuristicEvaluator().evaluateSessions([
      {
        sessionId: "s",
        agentId: "implementer",
        agentName: "Implementer",
        filePath: "/Users/someone/secret-repo/.claude/agent.jsonl",
        startTime: "2026-08-12T00:00:00Z",
        endTime: "2026-08-12T00:10:00Z",
        events: [
          {
            id: "1",
            timestamp: "2026-08-12T00:00:00Z",
            type: "agent_message",
            content: "Patched /Users/someone/secret-repo/src/billing.ts — should I also update the cache?",
          },
        ],
      },
    ]);

    const message = buildDiscordMessage(result, "en");
    expect(message).not.toMatch(/secret-repo|\/Users\/|billing\.ts/);
  });
});

describe("countRedundantCalls", () => {
  const call = (name: string, input: Record<string, unknown>) =>
    ({ id: Math.random().toString(36), timestamp: "2026-08-12T00:00:00Z", type: "tool_call" as const, toolCall: { name, input } });

  const session = (events: ReturnType<typeof call>[]) => ({
    sessionId: "s", agentId: "a", agentName: "A", filePath: "/tmp/a.jsonl",
    startTime: "2026-08-12T00:00:00Z", endTime: "2026-08-12T01:00:00Z", events,
  });

  it("counts alternating loops, not just back-to-back repeats", async () => {
    const { countRedundantCalls } = await import("../src/eval/heuristics.js");
    // A B A B — the shape that actually burns turns, and the one a
    // compare-with-previous-call check cannot see.
    const n = countRedundantCalls([
      session([
        call("Read", { path: "a.ts" }),
        call("Grep", { pattern: "x" }),
        call("Read", { path: "a.ts" }),
        call("Grep", { pattern: "x" }),
      ]),
    ]);
    expect(n).toBe(2);
  });

  it("does not count a re-run after an edit", async () => {
    const { countRedundantCalls } = await import("../src/eval/heuristics.js");
    // Running the suite again after changing code is a re-check, not waste.
    const n = countRedundantCalls([
      session([
        call("Bash", { command: "npm test" }),
        call("Edit", { file_path: "a.ts" }),
        call("Bash", { command: "npm test" }),
      ]),
    ]);
    expect(n).toBe(0);
  });

  it("counts a re-run when nothing changed in between", async () => {
    const { countRedundantCalls } = await import("../src/eval/heuristics.js");
    const n = countRedundantCalls([
      session([call("Bash", { command: "npm test" }), call("Bash", { command: "npm test" })]),
    ]);
    expect(n).toBe(1);
  });

  it("does not count the same call made in a different session", async () => {
    const { countRedundantCalls } = await import("../src/eval/heuristics.js");
    // Read-only agents never write, so a corpus-wide check would flag every
    // file they open twice across weeks of unrelated sessions.
    const n = countRedundantCalls([
      session([call("Read", { path: "a.ts" })]),
      session([call("Read", { path: "a.ts" })]),
    ]);
    expect(n).toBe(0);
  });
});

describe("isUnderSubagentsDir", () => {
  it("matches a subagents directory using the platform separator", async () => {
    const { isUnderSubagentsDir } = await import("../src/parser/discover.js");
    const path = await import("node:path");
    const inside = ["a", "b", "subagents", "agent-x.jsonl"].join(path.sep);
    const outside = ["a", "b", "agent-x.jsonl"].join(path.sep);
    // A file literally named "subagents" is not a directory match.
    const named = ["a", "b", "subagents"].join(path.sep);

    expect(isUnderSubagentsDir(inside)).toBe(true);
    expect(isUnderSubagentsDir(outside)).toBe(false);
    expect(isUnderSubagentsDir(named)).toBe(false);
  });
});

describe("CLI version", () => {
  it("reports the version from package.json", async () => {
    const { execFileSync } = await import("node:child_process");
    const fs = await import("node:fs");
    const url = await import("node:url");
    const path = await import("node:path");

    const root = path.dirname(url.fileURLToPath(import.meta.url)).replace(/\/tests$/, "");
    const declared = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8")).version;
    const reported = execFileSync("node", [path.join(root, "dist/cli.js"), "--version"], {
      encoding: "utf-8",
    }).trim();

    // A hardcoded string here drifts silently and makes --version lie.
    expect(reported).toBe(declared);
  });
});
