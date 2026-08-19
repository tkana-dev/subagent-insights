import { describe, expect, it } from "vitest";
import { HeuristicEvaluator } from "../src/eval/heuristics.js";
import { WORK_STYLES_CATALOG } from "../src/eval/work-styles.js";
import type { CanonicalEvent, SubagentSession, WorkStyleId } from "../src/types/index.js";

/**
 * The README advertises 16 archetypes and a set of failure patterns. A branch
 * that can never fire turns that into a false claim, and nothing else catches
 * it: the code compiles, the tests pass, the archetype simply never appears.
 *
 * `direct_implementer` was dead exactly this way — its guard read `crit < 70`
 * while critical_thinking bottoms out at exactly 70.
 */
function buildSession(p: {
  reads: number; writes: number; tests: number; diffs: number;
  errors: number; recovered: number; questions: number;
}): SubagentSession {
  let seq = 0;
  const ev = (type: CanonicalEvent["type"], toolCall?: CanonicalEvent["toolCall"], content?: string): CanonicalEvent =>
    ({ id: `e${++seq}`, timestamp: "2026-08-12T00:00:00Z", type, toolCall, content });

  const events: CanonicalEvent[] = [];
  for (let i = 0; i < p.reads; i++) {
    events.push(ev("tool_call", { name: "Read", input: { path: `f${i}.ts` } }));
    events.push(ev("tool_result", { name: "Read", input: {}, output: "x" }));
  }
  for (let i = 0; i < p.writes; i++) {
    events.push(ev("tool_call", { name: "Edit", input: { file_path: `f${i}.ts` } }));
    events.push(ev("tool_result", { name: "Edit", input: {}, output: "ok" }));
  }
  for (let i = 0; i < p.tests; i++) {
    events.push(ev("tool_call", { name: "Bash", input: { command: "npm test" } }));
    events.push(ev("tool_result", { name: "Bash", input: {}, output: "PASS" }));
  }
  for (let i = 0; i < p.diffs; i++) {
    events.push(ev("tool_call", { name: "Bash", input: { command: "git diff" } }));
    events.push(ev("tool_result", { name: "Bash", input: {}, output: "d" }));
  }
  for (let i = 0; i < p.errors; i++) {
    events.push(ev("tool_call", { name: "Bash", input: { command: `run-${i}` } }));
    events.push(ev("error", { name: "Bash", input: {}, output: "Exit code 1", isError: true }, "Exit code 1"));
    if (i < p.recovered) {
      events.push(ev("tool_call", { name: "Bash", input: { command: `run-${i}` } }));
      events.push(ev("tool_result", { name: "Bash", input: {}, output: "ok" }));
    }
  }
  for (let i = 0; i < p.questions; i++) {
    events.push(ev("agent_message", undefined, "Should we do A or B instead?"));
  }
  if (events.length === 0) events.push(ev("agent_message", undefined, "done"));

  return {
    sessionId: `s${events.length}-${p.writes}-${p.tests}`,
    agentId: "a", agentName: "A", filePath: "/tmp/a.jsonl",
    startTime: "2026-08-12T00:00:00Z", endTime: "2026-08-12T01:00:00Z", events,
  };
}

function sweep() {
  const evaluator = new HeuristicEvaluator();
  const styles = new Set<string>();
  const patterns = new Set<string>();

  const READS = [0, 2, 10, 25, 80];
  const WRITES = [0, 1, 3, 10, 30];
  const TESTS = [0, 1, 4, 15];
  const DIFFS = [0, 3];
  const ERRORS = [0, 1, 3, 10];
  const QUESTIONS = [0, 1, 4, 12];

  for (const reads of READS)
    for (const writes of WRITES)
      for (const tests of TESTS)
        for (const diffs of DIFFS)
          for (const errors of ERRORS)
            for (const questions of QUESTIONS)
              for (const recovered of [0, errors]) {
                const session = buildSession({ reads, writes, tests, diffs, errors, recovered, questions });
                const result = evaluator.evaluateSessions([session]);
                styles.add(result.workStyle.id);
                patterns.add(result.failurePattern.key);
              }

  return { styles, patterns };
}

describe("advertised classifications are actually reachable", () => {
  const { styles, patterns } = sweep();

  it("produces every one of the 16 documented archetypes", () => {
    const missing = (Object.keys(WORK_STYLES_CATALOG) as WorkStyleId[]).filter((id) => !styles.has(id));
    expect(missing, `unreachable archetypes: ${missing.join(", ")}`).toEqual([]);
  });

  it("produces every documented failure pattern", () => {
    const expected = ["flawless", "resilient", "overconfident", "looper", "hesitant", "verification_specialist"];
    const missing = expected.filter((p) => !patterns.has(p));
    expect(missing, `unreachable failure patterns: ${missing.join(", ")}`).toEqual([]);
  });
});
