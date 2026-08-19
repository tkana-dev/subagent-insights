#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { HeuristicEvaluator } from "./eval/heuristics.js";
import { TranscriptDiscoverer } from "./parser/discover.js";
import { MarkdownRenderer } from "./renderer/markdown.js";
import { buildDiscordMessage } from "./renderer/share.js";
import { TerminalRenderer } from "./renderer/terminal.js";
import type { CanonicalEvent, SubagentSession } from "./types/index.js";

const program = new Command();

program
  .name("subagent-insights")
  .description("Review your Claude Code subagents from their local transcripts: work patterns, strengths, weaknesses, failure modes, and a suggested CLAUDE.md rule.")
  .version("0.1.0")
  .option("-d, --demo", "Run with sample demo subagent transcript")
  .option("-p, --period <days>", "Evaluation period in days (e.g. 7 or 7d)", "14")
  .option("-a, --agent <name>", "Filter by agent ID or name")
  .option("-f, --file <path>", "Evaluate a specific JSONL transcript file")
  .option("--dir <path>", "Search in a specific directory for transcripts")
  .option("-l, --lang <lang>", "Language for output (en | ja)", "en")
  .option("--json", "Output results as raw structured JSON")
  .option("-m, --markdown", "Output results as Markdown")
  .option("-e, --evidence", "Display detailed evidence checklist for each dimension")
  .option("--limit <n>", "Max transcript files to analyze (default: all in period)")
  .action(async (options) => {
    await runReview(options);
  });

program
  .command("share")
  .description("Print a ready-to-paste report block for Discord, or the X link")
  .option("-p, --period <days>", "Evaluation period in days", "14")
  .option("-a, --agent <name>", "Filter by agent ID or name")
  .option("-l, --lang <lang>", "Language (en | ja)", "en")
  .option("-d, --demo", "Use demo sample")
  .option("--limit <n>", "Max transcript files to analyze (default: all in period)")
  .option("-x, --x", "Print the X (Twitter) intent link instead of a Discord block")
  .action(async (_options, command) => {
    await runShare({
      demo: resolveOption<boolean>(command, "demo"),
      period: resolveOption<string>(command, "period"),
      agent: resolveOption<string>(command, "agent"),
      lang: resolveOption<string>(command, "lang"),
      limit: resolveOption<string>(command, "limit"),
      x: resolveOption<boolean>(command, "x"),
    });
  });

program
  .command("improve")
  .description("Generate actionable instructions for CLAUDE.md from recent agent performance")
  .option("-p, --period <days>", "Evaluation period in days", "14")
  .option("-a, --agent <name>", "Filter by agent ID or name")
  .option("-l, --lang <lang>", "Language (en | ja)", "en")
  .option("-d, --demo", "Use demo sample")
  .option("--limit <n>", "Max transcript files to analyze (default: all in period)")
  .action(async (_options, command) => {
    await runImprove({
      demo: resolveOption<boolean>(command, "demo"),
      period: resolveOption<string>(command, "period"),
      agent: resolveOption<string>(command, "agent"),
      lang: resolveOption<string>(command, "lang"),
      limit: resolveOption<string>(command, "limit"),
    });
  });

/**
 * Read an option that is declared on both the root command and a subcommand.
 *
 * Commander routes each flag to the FIRST command that declares it, so the
 * root-level -d/-p/-a/-l flags swallow their subcommand twins and the
 * subcommand only ever sees its own defaults. Comparing value *sources* — not
 * the values, which are non-empty defaults either way — picks the one the user
 * actually typed.
 */
function resolveOption<T>(command: Command, name: string): T | undefined {
  const parent = command.parent;
  if (command.getOptionValueSource(name) === "cli") {
    return command.getOptionValue(name) as T;
  }
  if (parent?.getOptionValueSource(name) === "cli") {
    return parent.getOptionValue(name) as T;
  }
  return (command.getOptionValue(name) ?? parent?.getOptionValue(name)) as T | undefined;
}

async function runReview(options: {
  demo?: boolean;
  period?: string;
  agent?: string;
  file?: string;
  dir?: string;
  lang?: string;
  json?: boolean;
  markdown?: boolean;
  evidence?: boolean;
  limit?: string;
}) {
  const evaluator = new HeuristicEvaluator();
  const terminalRenderer = new TerminalRenderer();
  const markdownRenderer = new MarkdownRenderer();
  const discoverer = new TranscriptDiscoverer();

  let agentGroups = new Map<string, SubagentSession[]>();

  if (options.demo) {
    const demoSessions = getDemoSessions();
    agentGroups.set("implementer", demoSessions);
  } else {
    const periodDays = parseInt(options.period?.replace(/d$/, "") || "14", 10);
    const sessions = await discoverer.discoverSessions({
      periodDays,
      agentFilter: options.agent,
      explicitPath: options.file || options.dir,
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });

    if (sessions.length === 0) {
      console.log(
        `\n⚠️  No subagent transcripts found in ~/.claude/projects/ or the specified path.`
      );
      console.log(`💡 Try running with demo data: \`subagent-insights --demo\`\n`);
      return;
    }

    agentGroups = discoverer.groupSessionsByAgent(sessions);
  }

  const lang = options.lang === "ja" ? "ja" : "en";
  const allResults = [];

  for (const [_, agentSessions] of agentGroups.entries()) {
    allResults.push(evaluator.evaluateSessions(agentSessions));
  }

  if (options.json) {
    if (allResults.length === 1) {
      console.log(JSON.stringify(allResults[0], null, 2));
    } else {
      console.log(JSON.stringify(allResults, null, 2));
    }
    return;
  }

  if (options.markdown) {
    for (const res of allResults) {
      console.log(markdownRenderer.render(res, lang));
      console.log("\n---\n");
    }
    return;
  }

  // Terminal Output
  const isMultiple = allResults.length > 1;

  if (isMultiple) {
    // Render single top overview dashboard table
    console.log(terminalRenderer.renderOverviewTable(allResults, { lang }));
  }

  for (let i = 0; i < allResults.length; i++) {
    const res = allResults[i];
    console.log(
      terminalRenderer.render(res, {
        lang,
        showEvidence: Boolean(options.evidence),
        showHeader: !isMultiple, // Only show header if single agent
        agentIndex: i + 1,
        totalAgents: allResults.length,
      })
    );
    console.log("\n");
  }
}

async function runImprove(options: {
  demo?: boolean;
  period?: string;
  agent?: string;
  lang?: string;
  limit?: string;
}) {
  const evaluator = new HeuristicEvaluator();
  const discoverer = new TranscriptDiscoverer();
  let agentGroups = new Map<string, SubagentSession[]>();

  if (options.demo) {
    agentGroups.set("implementer", getDemoSessions());
  } else {
    const periodDays = parseInt(options.period?.replace(/d$/, "") || "14", 10);
    const sessions = await discoverer.discoverSessions({
      periodDays,
      agentFilter: options.agent,
      limit: options.limit ? parseInt(options.limit, 10) : undefined,
    });
    if (sessions.length === 0) {
      agentGroups.set("implementer", getDemoSessions());
    } else {
      agentGroups = discoverer.groupSessionsByAgent(sessions);
    }
  }

  const lang = options.lang === "ja" ? "ja" : "en";

  for (const [_, agentSessions] of agentGroups.entries()) {
    const result = evaluator.evaluateSessions(agentSessions);

    if (lang === "ja") {
      console.log(`\n🚀 ${result.agent.name} 向けの改善提案 (${result.workStyle.badge}):\n`);
      for (const item of result.interventions) {
        const title = item.titleJa || item.title;
        const reason = item.reasonJa || item.reason;
        const instruction = item.suggestedInstructionJa || item.suggestedInstruction;
        console.log(`### ${title}`);
        console.log(`理由: ${reason}\n`);
        console.log(`\`${item.targetFile || "CLAUDE.md"}\` に追加推奨:\n`);
        console.log("```markdown");
        console.log(instruction);
        console.log("```\n");
      }
    } else {
      console.log(`\n🚀 Suggested Interventions for ${result.agent.name} (${result.workStyle.badge}):\n`);
      for (const item of result.interventions) {
        console.log(`### ${item.title}`);
        console.log(`Reason: ${item.reason}\n`);
        console.log(`Add this block to \`${item.targetFile || "CLAUDE.md"}\`:\n`);
        console.log("```markdown");
        console.log(item.suggestedInstruction);
        console.log("```\n");
      }
    }
  }
}

async function runShare(options: {
  demo?: boolean;
  period?: string;
  agent?: string;
  lang?: string;
  limit?: string;
  x?: boolean;
}) {
  const lang = options.lang === "ja" ? "ja" : "en";
  const results = await collectResults(options);

  for (const result of results) {
    if (options.x) {
      console.log(new TerminalRenderer().generateSystematicShareUrl(result, lang));
    } else {
      console.log(buildDiscordMessage(result, lang));
    }
    console.log("");
  }
}

/**
 * Resolve the requested transcripts down to evaluated reports.
 * Shared by every subcommand so they cannot drift in how they discover logs.
 */
async function collectResults(options: {
  demo?: boolean;
  period?: string;
  agent?: string;
  limit?: string;
}) {
  const evaluator = new HeuristicEvaluator();
  const discoverer = new TranscriptDiscoverer();

  if (options.demo) {
    return [evaluator.evaluateSessions(getDemoSessions())];
  }

  const sessions = await discoverer.discoverSessions({
    periodDays: parseInt(options.period?.replace(/d$/, "") || "14", 10),
    agentFilter: options.agent,
    limit: options.limit ? parseInt(options.limit, 10) : undefined,
  });

  if (sessions.length === 0) return [];

  return [...discoverer.groupSessionsByAgent(sessions).values()].map((s) =>
    evaluator.evaluateSessions(s)
  );
}

/**
 * Built-in sample used by `--demo`.
 *
 * Deliberately shows an agent with real problems: nine edits shipped without a
 * single test run, a write attempted before the file was read, and a build left
 * red at the end of a session. A demo where everything scores an A teaches
 * nobody what the tool actually detects.
 */
function getDemoSessions(): SubagentSession[] {
  const base = Date.parse("2026-08-12T09:00:00.000Z");
  let elapsed = 0;
  let seq = 0;
  const at = () => new Date(base + (elapsed += 45_000)).toISOString();

  const user = (content: string): CanonicalEvent => ({
    id: `demo-${++seq}`, timestamp: at(), type: "user_message", content,
  });
  const agent = (content: string): CanonicalEvent => ({
    id: `demo-${++seq}`, timestamp: at(), type: "agent_message", content,
  });
  const call = (name: string, input: Record<string, unknown>): CanonicalEvent => ({
    id: `demo-${++seq}`, timestamp: at(), type: "tool_call", toolCall: { name, input },
  });
  const ok = (name: string, output: string): CanonicalEvent => ({
    id: `demo-${++seq}`, timestamp: at(), type: "tool_result", toolCall: { name, input: {}, output },
  });
  const failed = (name: string, output: string): CanonicalEvent => ({
    id: `demo-${++seq}`, timestamp: at(), type: "error", content: output,
    toolCall: { name, input: {}, output, isError: true },
  });

  const session = (sessionId: string, events: CanonicalEvent[]): SubagentSession => ({
    sessionId,
    agentId: "implementer",
    agentName: "Implementer Agent",
    filePath: `/demo/${sessionId}/subagents/agent-implementer.jsonl`,
    startTime: events[0].timestamp,
    endTime: events[events.length - 1].timestamp,
    events,
  });

  return [
    // Ships the feature, never verifies it.
    session("demo-rate-limiting", [
      user("Add rate limiting to the public API endpoints."),
      agent("I'll add a rate limit middleware and wire it into the router."),
      call("Write", { file_path: "src/middleware/rateLimit.ts" }),
      failed("Write", "<tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>"),
      call("Read", { file_path: "src/middleware/rateLimit.ts" }),
      ok("Read", "export {};"),
      call("Write", { file_path: "src/middleware/rateLimit.ts" }),
      ok("Write", "File created successfully."),
      call("Edit", { file_path: "src/router.ts" }),
      ok("Edit", "Applied 1 edit."),
      call("Write", { file_path: "src/config/limits.ts" }),
      ok("Write", "File created successfully."),
      call("Edit", { file_path: "src/server.ts" }),
      ok("Edit", "Applied 1 edit."),
      agent("Rate limiting is now in place across all public endpoints."),
    ]),

    // Stops while the build is still failing.
    session("demo-checkout-fix", [
      user("The checkout flow is failing in staging. Fix it."),
      agent("The session token isn't being forwarded. I'll patch the client."),
      call("Edit", { file_path: "src/checkout/client.ts" }),
      ok("Edit", "Applied 2 edits."),
      call("Edit", { file_path: "src/checkout/session.ts" }),
      ok("Edit", "Applied 1 edit."),
      call("Write", { file_path: "src/checkout/token.ts" }),
      ok("Write", "File created successfully."),
      call("Bash", { command: "npm run build" }),
      failed("Bash", "Exit code 1\nsrc/checkout/token.ts(14,3): error TS2322: Type 'string | undefined' is not assignable to type 'string'."),
      call("Edit", { file_path: "src/checkout/token.ts" }),
      ok("Edit", "Applied 1 edit."),
      call("Bash", { command: "npm run build" }),
      failed("Bash", "Exit code 1\nsrc/checkout/token.ts(21,7): error TS2532: Object is possibly 'undefined'."),
      agent("The build is still red on a type error in the token helper."),
    ]),
  ];
}

program.parse(process.argv);
