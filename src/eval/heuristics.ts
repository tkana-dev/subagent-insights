import { EN_LOCALE } from "../locales/en.js";
import { JA_LOCALE } from "../locales/ja.js";
import type {
  AgentInfo,
  AgentReviewResult,
  CanonicalEvent,
  DimensionKey,
  DimensionScore,
  FailurePattern,
  InterestingBehavior,
  ReviewPeriod,
  ScoreEvidence,
  SubagentSession,
} from "../types/index.js";
import { generateInterventions } from "./interventions.js";
import { type BehavioralFingerprint, determineWorkStyle } from "./work-styles.js";

/**
 * True when a shell command actually runs a test suite or a type check.
 *
 * Substring matching on "test" is not good enough: `grep -r "test" src`,
 * `cat foo.test.ts` and `ls tests/` all contain it while running nothing.
 * Each pipeline segment is judged by the program it invokes.
 */
export function isTestCommand(cmdLower: string): boolean {
  const RUNNERS =
    /^(npx |npm exec |pnpm |yarn |bun |uv run |poetry run |bundle exec )*(vitest|jest|mocha|ava|pytest|tox|rspec|phpunit|deno test)\b/;
  const SCRIPTS = /^(npm|pnpm|yarn|bun)\s+(run\s+)?(test|typecheck|type-check|check|lint)\b/;
  const TOOLCHAINS =
    /^(cargo test|go test|swift test|dotnet test|mvn test|gradle test|make test|xcodebuild .*\btest\b|tsc\b|mix test|rake test)/;
  // Programs that merely read files whose names contain "test".
  const READERS = /^(grep|rg|cat|ls|find|head|tail|wc|sed|awk|less|bat|fd|echo|git)\b/;

  return cmdLower
    .split(/&&|\|\||;|\|/)
    .map((seg) => seg.trim().replace(/^\(+\s*/, ""))
    .some((seg) => {
      if (!seg || READERS.test(seg)) return false;
      return RUNNERS.test(seg) || SCRIPTS.test(seg) || TOOLCHAINS.test(seg);
    });
}

/**
 * True when an agent message questions the request or offers an alternative.
 *
 * Code is stripped first: a bare `?` also appears in ternaries, query strings
 * and regexes, which previously made almost every message look like a question.
 */
export function isQuestionOrAlternative(content: string): boolean {
  const prose = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .trim();
  const proseLower = prose.toLowerCase();

  // A question mark that ends a clause, not one embedded in an expression.
  if (/[?？](\s|$)/m.test(prose)) return true;

  return [
    "instead of",
    "are you sure",
    "contradiction",
    "would you prefer",
    "an alternative",
    "代替案",
    "矛盾",
    "確認させてください",
    "のどちらにしますか",
  ].some((phrase) => proseLower.includes(phrase));
}

export type ToolErrorKind =
  /** The agent used the tool wrongly, or broke a rule the harness enforces. */
  | "protocol_violation"
  /** The work itself failed: a test went red, a build broke, a file was missing. */
  | "work_failure";

/**
 * Split failing tool calls into "the agent misbehaved" and "the work failed".
 *
 * A red test suite says nothing about discipline — reaching for a tool with
 * unparseable input, writing a file before reading it, or getting blocked by a
 * project hook does. Only the latter should count against instruction following.
 */
export function classifyToolError(output: string | undefined): ToolErrorKind {
  const text = (output || "").toLowerCase();

  const PROTOCOL = [
    "inputvalidationerror",
    "input that could not be parsed",
    "file has not been read yet",
    "has been modified since",
    "string not found",
    "no changes to make",
    "hook error",
    "permission",
    "denied",
    "not allowed",
    "requires approval",
    "blocked by",
  ];

  return PROTOCOL.some((marker) => text.includes(marker)) ? "protocol_violation" : "work_failure";
}

/**
 * Identical tool calls that could not have returned anything new.
 *
 * Scoped per session, because the same file legitimately gets read again in a
 * later session. Within a session, a repeat only counts when nothing was
 * written in between: re-running a command after an edit is a re-check, while
 * re-running it with nothing changed is wasted work. Comparing against only
 * the immediately preceding call — as this once did — missed alternating
 * loops (A B A B), which is the shape that actually burns turns.
 */
export function countRedundantCalls(sessions: SubagentSession[]): number {
  let redundant = 0;

  for (const session of sessions) {
    const lastSeenAtWrites = new Map<string, number>();
    let writes = 0;

    for (const evt of session.events) {
      if (evt.type !== "tool_call" || !evt.toolCall) continue;

      const name = evt.toolCall.name.toLowerCase();
      const signature = `${name}:${JSON.stringify(evt.toolCall.input || "")}`;
      const seenAt = lastSeenAtWrites.get(signature);

      if (seenAt !== undefined && seenAt === writes) redundant++;
      lastSeenAtWrites.set(signature, writes);

      if (/edit|write|patch|replace/.test(name)) writes++;
    }
  }

  return redundant;
}

/**
 * Heuristic & Deterministic Evaluation Engine for Claude Code Subagents
 */
export class HeuristicEvaluator {
  /**
   * Evaluate one or multiple SubagentSessions into a unified AgentReviewResult.
   */
  public evaluateSessions(sessions: SubagentSession[]): AgentReviewResult {
    if (!sessions || sessions.length === 0) {
      return this.createEmptyResult();
    }

    const allEvents: CanonicalEvent[] = [];
    const agentId = sessions[0].agentId || "subagent";
    const agentName = sessions[0].agentName || "Subagent";
    let earliestTime = sessions[0].startTime;
    let latestTime = sessions[0].endTime;

    for (const session of sessions) {
      allEvents.push(...session.events);
      if (session.startTime < earliestTime) earliestTime = session.startTime;
      if (session.endTime > latestTime) latestTime = session.endTime;
    }

    const period: ReviewPeriod = {
      from: earliestTime.slice(0, 10),
      to: latestTime.slice(0, 10),
      totalSessions: sessions.length,
      totalEvents: allEvents.length,
    };

    const agent: AgentInfo = {
      id: agentId,
      name: agentName,
    };

    // Calculate raw metrics
    let writeCount = 0;
    let viewCount = 0;
    let testCount = 0;
    let diffCheckCount = 0;
    let errorCount = 0;
    let recoveredErrorCount = 0;
    let protocolViolationCount = 0;
    let questionCount = 0;
    let toolCallCount = 0;
    let redundantCallCount = 0;


    const interestingBehaviors: InterestingBehavior[] = [];
    let firstQuestionAt: string | undefined;

    let consecutiveErrors = 0;
    let maxConsecutiveErrors = 0;

    redundantCallCount = countRedundantCalls(sessions);

    for (let i = 0; i < allEvents.length; i++) {
      const evt = allEvents[i];

      if (evt.type === "tool_call" && evt.toolCall) {
        toolCallCount++;
        const toolName = evt.toolCall.name.toLowerCase();

        // Edit / Write detection
        if (
          toolName.includes("edit") ||
          toolName.includes("write") ||
          toolName.includes("patch") ||
          toolName.includes("replace")
        ) {
          writeCount++;
        }

        // View / Read detection
        if (
          toolName.includes("view") ||
          toolName.includes("read") ||
          toolName.includes("cat") ||
          toolName.includes("grep") ||
          toolName.includes("find") ||
          toolName.includes("glob")
        ) {
          viewCount++;
        }

        // Test / Verification detection in bash / commands
        if (
          toolName.includes("bash") ||
          toolName.includes("command") ||
          toolName.includes("terminal") ||
          toolName.includes("exec")
        ) {
          const cmd = (evt.toolCall.input.command ||
            evt.toolCall.input.cmd ||
            evt.toolCall.input.CommandLine ||
            "") as string;
          const cmdLower = cmd.toLowerCase();

          if (isTestCommand(cmdLower)) {
            testCount++;
          }

          if (cmdLower.includes("git diff") || cmdLower.includes("git status")) {
            diffCheckCount++;
          }
        }
      }

      if (evt.type === "error" || (evt.toolCall && evt.toolCall.isError)) {
        errorCount++;
        if (classifyToolError(evt.toolCall?.output ?? evt.content) === "protocol_violation") {
          protocolViolationCount++;
        }
        consecutiveErrors++;
        if (consecutiveErrors > maxConsecutiveErrors) {
          maxConsecutiveErrors = consecutiveErrors;
        }

        // Recovery = the agent retried THIS tool and got a clean result.
        // A success from some unrelated concurrent tool call does not count,
        // otherwise every error looks recovered.
        const failedTool = evt.toolCall?.name;
        let recovered = false;
        for (let j = i + 1; j < Math.min(i + 12, allEvents.length); j++) {
          const nextEvt = allEvents[j];
          if (!nextEvt.toolCall || nextEvt.toolCall.name !== failedTool) continue;
          if (nextEvt.type === "tool_result" && !nextEvt.toolCall.isError) {
            recovered = true;
          }
          // First subsequent result from the same tool decides it, pass or fail.
          if (nextEvt.type === "tool_result" || nextEvt.type === "error") break;
        }
        if (recovered) {
          recoveredErrorCount++;
        }
      } else if (evt.type === "tool_result") {
        consecutiveErrors = 0;
      }

      if (evt.type === "agent_message" && evt.content) {
        if (isQuestionOrAlternative(evt.content)) {
          questionCount++;
          if (!firstQuestionAt) firstQuestionAt = evt.timestamp;
        }
      }
    }

    const recoveryRate = errorCount > 0 ? recoveredErrorCount / errorCount : 1.0;
    const avgStepsPerSession = sessions.length > 0 ? allEvents.length / sessions.length : allEvents.length;

    // Construct Universal Behavioral Fingerprint
    const fingerprint: BehavioralFingerprint = {
      totalToolCalls: toolCallCount,
      writeCount,
      viewCount,
      testCount,
      diffCheckCount,
      errorCount,
      recoveredErrorCount,
      questionCount,
      avgStepsPerSession,
      writeRatio: toolCallCount > 0 ? writeCount / toolCallCount : 0,
      readToWriteRatio: viewCount / (writeCount + 1),
      testToWriteRatio: testCount / (writeCount + 1),
      recoveryRate,
      questionRate: sessions.length > 0 ? questionCount / sessions.length : 0,
    };

    // Build 6 Dimensions with dynamic ranges
    const dimensions: Record<DimensionKey, DimensionScore> = {
      task_completion: this.calcTaskCompletion(sessions, errorCount, recoveredErrorCount),
      instruction_following: this.calcInstructionFollowing(protocolViolationCount, toolCallCount),
      quality: this.calcQuality(writeCount, viewCount, errorCount, recoveryRate),
      verification: this.calcVerification(writeCount, testCount, diffCheckCount, viewCount),
      efficiency: this.calcEfficiency(toolCallCount, redundantCallCount, maxConsecutiveErrors, avgStepsPerSession),
      critical_thinking: this.calcCriticalThinking(questionCount, viewCount, sessions.length),
    };

    // Calculate Overall Score and Grade
    const dimensionList = Object.values(dimensions);
    const overallScore = Math.round(
      dimensionList.reduce((acc, cur) => acc + cur.score, 0) / dimensionList.length
    );
    const overallGrade = this.scoreToGrade(overallScore);

    // Determine Work Style purely via Universal Behavioral Fingerprint
    const workStyle = determineWorkStyle(dimensions, fingerprint);

    // Identify Strengths and Areas to Improve
    const strengths: string[] = [];
    const strengthsJa: string[] = [];
    const areasToImprove: string[] = [];
    const areasToImproveJa: string[] = [];

    for (const dim of Object.values(dimensions)) {
      if (dim.score >= 82) {
        const topEvidence = dim.evidence.find((e) => e.passed);
        if (topEvidence) {
          strengths.push(topEvidence.message);
          strengthsJa.push(topEvidence.messageJa || topEvidence.message);
        }
      } else if (dim.score <= 75) {
        const topFail = dim.evidence.find((e) => !e.passed);
        if (topFail) {
          areasToImprove.push(topFail.message);
          areasToImproveJa.push(topFail.messageJa || topFail.message);
        }
      }
    }

    if (strengths.length === 0) {
      strengths.push("Consistently processes tasks to completion");
      strengthsJa.push("タスクを完了まで着実に進行");
    }
    if (areasToImprove.length === 0) {
      if (fingerprint.writeCount === 0) {
        areasToImprove.push("Can expand cross-module assertion coverage");
        areasToImproveJa.push("モジュール間をまたぐ統合アサーションの網羅性をさらに強化可能");
      } else {
        areasToImprove.push("Continue expanding test coverage on complex flows");
        areasToImproveJa.push("複雑なフローにおけるテスト網羅率をさらに拡充推奨");
      }
    }

    // Failure Pattern analysis
    const failurePattern = this.analyzeFailurePattern(
      errorCount,
      recoveryRate,
      maxConsecutiveErrors,
      writeCount,
      testCount,
      fingerprint.writeCount === 0 && (fingerprint.viewCount > 0 || fingerprint.testCount > 0)
    );

    // Behaviors are derived from aggregate counts only. Raw transcript text is
    // never surfaced here: this output is meant to be shareable, and agent
    // messages routinely contain source code, file paths and repository names.
    if (questionCount > 0) {
      interestingBehaviors.push({
        title: "Proactively Questioned Assumptions / Proposed Alternative",
        titleJa: "要件の前提を疑問視し、代替案・確認質問を提示",
        description: `Raised clarifying questions or proposed alternatives in ${questionCount} response(s) instead of executing the request as-is.`,
        descriptionJa: `${questionCount} 件の応答で、指示をそのまま実行せず確認質問や代替案を提示しました。`,
        timestamp: firstQuestionAt,
      });
    }

    if (errorCount > 0) {
      interestingBehaviors.push({
        title: "Recovered From Failing Tool Calls",
        titleJa: "失敗したツール呼び出しからの自律回復",
        description: `Hit ${errorCount} failing tool call(s) and recovered from ${recoveredErrorCount} of them by retrying the same tool successfully.`,
        descriptionJa: `${errorCount} 件のツール呼び出し失敗のうち ${recoveredErrorCount} 件を、同じツールの再実行で自力回復しました。`,
      });
    }

    if (interestingBehaviors.length === 0) {
      if (fingerprint.writeCount === 0 && fingerprint.viewCount > 0) {
        interestingBehaviors.push({
          title: "Exhaustive Inspection Routine",
          titleJa: "網羅的な仕様照合と検証ルーティン",
          description: `Conducted extensive inspection across ${viewCount} file reads and ${testCount} verification commands without intrusive edits.`,
          descriptionJa: `${viewCount} 回のファイル読み取りと ${testCount} 回の検証コマンドを実行し、コードには一切手を加えませんでした。`,
        });
      } else if (testCount > 0 && writeCount > 0) {
        interestingBehaviors.push({
          title: "Rigorous Double-Check Routine",
          titleJa: "徹底した多重検証ルーティン",
          description: `Consistently verified changes across ${testCount} separate test executions before reporting completion.`,
          descriptionJa: `完了報告の前に ${testCount} 回のテスト実行で変更を検証しました。`,
        });
      } else {
        interestingBehaviors.push({
          title: "Direct Implementation Trajectory",
          titleJa: "直線的で無駄のない実装軌跡",
          description: "Followed a streamlined execution path from initial prompt to final response.",
          descriptionJa: "最初の指示から最終応答まで、無駄のない一直線の実行経路をたどりました。",
        });
      }
    }

    // Interventions (Role & Work-Style Tailored via Universal Fingerprint)
    const interventions = generateInterventions({
      agent,
      workStyle,
      failurePattern,
      scores: dimensions,
      fingerprint,
    });

    // Confidence Calculation
    const confidence = Math.min(1.0, Number((0.4 + (sessions.length * 0.15) + (allEvents.length * 0.005)).toFixed(2)));
    const hasEnoughData = sessions.length >= 1 && allEvents.length >= 3;

    return {
      schemaVersion: "1.0.0",
      agent,
      period,
      overallGrade,
      overallScore,
      workStyle,
      dimensions,
      strengths,
      strengthsJa,
      areasToImprove,
      areasToImproveJa,
      interestingBehaviors,
      failurePattern,
      interventions,
      confidence,
      hasEnoughData,
    };
  }

  /**
   * How often work actually landed, rather than how many sessions were started.
   *
   * Two observable quantities: sessions whose last tool result was still an
   * error (the agent stopped on a failure), and failures it never got past.
   */
  private calcTaskCompletion(
    sessions: SubagentSession[],
    errorCount: number,
    recoveredErrorCount: number
  ): DimensionScore {
    const evidence: ScoreEvidence[] = [];

    let sessionsEndingInError = 0;
    for (const session of sessions) {
      const lastResult = [...session.events]
        .reverse()
        .find((e) => e.type === "tool_result" || e.type === "error");
      if (lastResult?.type === "error") sessionsEndingInError++;
    }

    const stalledRate = sessions.length > 0 ? sessionsEndingInError / sessions.length : 0;
    const unrecoveredRate = errorCount > 0 ? (errorCount - recoveredErrorCount) / errorCount : 0;

    let score = Math.round(100 - stalledRate * 55 - unrecoveredRate * 30);

    if (sessionsEndingInError > 0) {
      evidence.push({
        key: "stalled_sessions",
        passed: false,
        message: EN_LOCALE.evidence.stalled_sessions(sessionsEndingInError, sessions.length),
        messageJa: JA_LOCALE.evidence.stalled_sessions(sessionsEndingInError, sessions.length),
      });
    } else {
      evidence.push({
        key: "completed_sessions",
        passed: true,
        message: EN_LOCALE.evidence.completed_sessions(sessions.length),
        messageJa: JA_LOCALE.evidence.completed_sessions(sessions.length),
      });
    }

    if (errorCount === 0) {
      evidence.push({
        key: "resolved_errors",
        passed: true,
        message: EN_LOCALE.evidence.resolved_errors,
        messageJa: JA_LOCALE.evidence.resolved_errors,
      });
    } else if (unrecoveredRate > 0.3) {
      evidence.push({
        key: "unresolved_errors",
        passed: false,
        message: EN_LOCALE.evidence.unresolved_errors,
        messageJa: JA_LOCALE.evidence.unresolved_errors,
      });
    }

    score = Math.min(100, Math.max(20, score));
    return {
      key: "task_completion",
      score,
      confidence: 0.9,
      evidence,
      metric: {
        value: Number(stalledRate.toFixed(4)),
        display: `${sessionsEndingInError} of ${sessions.length} sessions stalled`,
        displayJa: `${sessions.length}セッション中${sessionsEndingInError}件が失敗のまま終了`,
      },
    };
  }

  /**
   * Tool discipline: the share of calls rejected because the agent misused the
   * tool or broke a project rule. A failing test suite is not counted here —
   * that is the work failing, not the agent disobeying.
   */
  private calcInstructionFollowing(
    protocolViolationCount: number,
    toolCallCount: number
  ): DimensionScore {
    const evidence: ScoreEvidence[] = [];
    const violationRate = toolCallCount > 0 ? protocolViolationCount / toolCallCount : 0;

    // Calibrated against observed runs, where the rate ranged from 0% to ~0.5%
    // of tool calls. 2% — one rejected call in fifty — is treated as the floor.
    // NOTE: this is tuned on a single-user sample and should be revisited once
    // rates from more setups are available.
    const BAD_RUN_RATE = 0.02;
    let score = Math.round(100 - Math.min(1, violationRate / BAD_RUN_RATE) * 45);

    if (protocolViolationCount > 0) {
      evidence.push({
        key: "protocol_violations",
        passed: false,
        message: EN_LOCALE.evidence.protocol_violations(protocolViolationCount, toolCallCount),
        messageJa: JA_LOCALE.evidence.protocol_violations(protocolViolationCount, toolCallCount),
      });
    } else {
      evidence.push({
        key: "sandbox_respected",
        passed: true,
        message: EN_LOCALE.evidence.sandbox_respected,
        messageJa: JA_LOCALE.evidence.sandbox_respected,
      });
    }

    score = Math.min(100, Math.max(30, score));
    return {
      key: "instruction_following",
      score,
      confidence: 0.88,
      evidence,
      metric: {
        value: Number(violationRate.toFixed(5)),
        display:
          protocolViolationCount > 0
            ? `1 rejected call in ${Math.round(1 / violationRate)}`
            : `0 rejected calls in ${toolCallCount}`,
        displayJa:
          protocolViolationCount > 0
            ? `${Math.round(1 / violationRate)}回に1回が拒否`
            : `${toolCallCount}回中 拒否0回`,
      },
    };
  }

  private calcQuality(
    writeCount: number,
    viewCount: number,
    errorCount: number,
    recoveryRate: number
  ): DimensionScore {
    let score = 82;
    const evidence: ScoreEvidence[] = [];

    if (writeCount > 0) {
      score += 6;
      evidence.push({
        key: "clean_modifications",
        passed: true,
        message: EN_LOCALE.evidence.clean_modifications,
        messageJa: JA_LOCALE.evidence.clean_modifications,
      });
    } else if (viewCount > 0) {
      score += 8;
      evidence.push({
        key: "read_only_task",
        passed: true,
        message: EN_LOCALE.evidence.read_only_task,
        messageJa: JA_LOCALE.evidence.read_only_task,
      });
    }

    if (errorCount === 0) {
      score += 8;
      evidence.push({
        key: "zero_errors",
        passed: true,
        message: EN_LOCALE.evidence.zero_errors,
        messageJa: JA_LOCALE.evidence.zero_errors,
      });
    } else if (recoveryRate >= 0.8) {
      score += 4;
      evidence.push({
        key: "recovered_errors",
        passed: true,
        message: EN_LOCALE.evidence.recovered_errors(errorCount),
        messageJa: JA_LOCALE.evidence.recovered_errors(errorCount),
      });
    } else {
      score -= 20;
      evidence.push({
        key: "repetitive_failures",
        passed: false,
        message: EN_LOCALE.evidence.repetitive_failures,
        messageJa: JA_LOCALE.evidence.repetitive_failures,
      });
    }

    score = Math.min(100, Math.max(30, score));
    return {
      key: "quality",
      score,
      confidence: 0.85,
      evidence,
      metric: {
        value: Number(recoveryRate.toFixed(3)),
        display: `${errorCount} failing calls, ${Math.round(recoveryRate * 100)}% recovered`,
        displayJa: `失敗${errorCount}件、うち${Math.round(recoveryRate * 100)}%を自力回復`,
      },
    };
  }

  private calcVerification(
    writeCount: number,
    testCount: number,
    diffCheckCount: number,
    _viewCount: number
  ): DimensionScore {
    let score = 70;
    const evidence: ScoreEvidence[] = [];

    if (writeCount === 0) {
      // Pure verifier / inspection agent
      score = 92;
      if (testCount > 0) score += 6;
      evidence.push({
        key: "ran_tests",
        passed: true,
        message: EN_LOCALE.evidence.ran_tests(testCount),
        messageJa: JA_LOCALE.evidence.ran_tests(testCount),
      });
      evidence.push({
        key: "read_only_task",
        passed: true,
        message: EN_LOCALE.evidence.read_only_task,
        messageJa: JA_LOCALE.evidence.read_only_task,
      });
    } else {
      // Implementation agent: ratio of tests to writes matters
      const testRatio = writeCount > 0 ? testCount / writeCount : 0;
      if (testRatio >= 0.8) {
        score = 94;
      } else if (testRatio >= 0.4) {
        score = 82;
      } else if (testRatio > 0) {
        score = 72;
      } else {
        score = 54;
      }

      if (testCount > 0) {
        evidence.push({
          key: "ran_tests",
          passed: true,
          message: EN_LOCALE.evidence.ran_tests(testCount),
          messageJa: JA_LOCALE.evidence.ran_tests(testCount),
        });
      } else {
        evidence.push({
          key: "skipped_tests",
          passed: false,
          message: EN_LOCALE.evidence.skipped_tests,
          messageJa: JA_LOCALE.evidence.skipped_tests,
        });
      }

      if (diffCheckCount > 0) {
        score += 4;
        evidence.push({
          key: "checked_diff",
          passed: true,
          message: EN_LOCALE.evidence.checked_diff,
          messageJa: JA_LOCALE.evidence.checked_diff,
        });
      } else if (writeCount > 5) {
        score -= 5;
        evidence.push({
          key: "no_diff_check",
          passed: false,
          message: EN_LOCALE.evidence.no_diff_check,
          messageJa: JA_LOCALE.evidence.no_diff_check,
        });
      }
    }

    const testsPerEdit = writeCount > 0 ? testCount / writeCount : testCount;
    score = Math.min(100, Math.max(20, score));
    return {
      key: "verification",
      score,
      confidence: 0.9,
      evidence,
      metric: {
        value: Number(testsPerEdit.toFixed(3)),
        display:
          writeCount > 0
            ? `${testsPerEdit.toFixed(2)} test runs per edit`
            : `${testCount} test runs, no edits`,
        displayJa:
          writeCount > 0
            ? `編集1件あたり${testsPerEdit.toFixed(2)}回のテスト実行`
            : `テスト実行${testCount}回、編集なし`,
      },
    };
  }

  private calcEfficiency(
    toolCallCount: number,
    redundantCallCount: number,
    maxConsecutiveErrors: number,
    avgStepsPerSession: number
  ): DimensionScore {
    const evidence: ScoreEvidence[] = [];
    const redundantRate = toolCallCount > 0 ? redundantCallCount / toolCallCount : 0;

    // Rate, not raw count. An absolute threshold rewarded volume: 18 repeats in
    // 11,573 calls scored worse than 1 repeat in 265, which is backwards.
    // 2% of calls repeated with nothing changed is treated as the floor.
    // NOTE: tuned on a single-user sample; revisit with wider data.
    const WASTEFUL_RATE = 0.02;
    let score = 100 - Math.round(Math.min(1, redundantRate / WASTEFUL_RATE) * 22);

    if (redundantRate >= WASTEFUL_RATE / 2) {
      evidence.push({
        key: "redundant_calls",
        passed: false,
        message: EN_LOCALE.evidence.redundant_calls(redundantCallCount),
        messageJa: JA_LOCALE.evidence.redundant_calls(redundantCallCount),
      });
    } else {
      evidence.push({
        key: "minimal_redundancy",
        passed: true,
        message: EN_LOCALE.evidence.minimal_redundancy,
        messageJa: JA_LOCALE.evidence.minimal_redundancy,
      });
    }

    if (maxConsecutiveErrors > 2) {
      score -= 15;
      evidence.push({
        key: "error_loop",
        passed: false,
        message: EN_LOCALE.evidence.error_loop,
        messageJa: JA_LOCALE.evidence.error_loop,
      });
    } else {
      evidence.push({
        key: "smooth_steps",
        passed: true,
        message: EN_LOCALE.evidence.smooth_steps,
        messageJa: JA_LOCALE.evidence.smooth_steps,
      });
    }

    // Long sessions are not waste by themselves, but very long ones cost turns.
    if (avgStepsPerSession > 120) {
      score -= 12;
    } else if (avgStepsPerSession > 60) {
      score -= 6;
    }

    score = Math.min(100, Math.max(25, score));
    return {
      key: "efficiency",
      score,
      confidence: 0.85,
      evidence,
      metric: {
        value: Number(redundantRate.toFixed(4)),
        display: `${redundantCallCount} repeat${redundantCallCount === 1 ? "" : "s"}, ${Math.round(avgStepsPerSession)} steps/session`,
        displayJa: `重複${redundantCallCount}回、1セッション${Math.round(avgStepsPerSession)}ステップ`,
      },
    };
  }

  private calcCriticalThinking(
    questionCount: number,
    viewCount: number,
    sessionCount: number
  ): DimensionScore {
    let score = 75;
    const evidence: ScoreEvidence[] = [];

    if (questionCount > 5) {
      score += 18;
      evidence.push({
        key: "questioned_premises",
        passed: true,
        message: EN_LOCALE.evidence.questioned_premises(questionCount),
        messageJa: JA_LOCALE.evidence.questioned_premises(questionCount),
      });
    } else if (questionCount > 0) {
      score += 10;
      evidence.push({
        key: "questioned_premises",
        passed: true,
        message: EN_LOCALE.evidence.questioned_premises(questionCount),
        messageJa: JA_LOCALE.evidence.questioned_premises(questionCount),
      });
    } else {
      score -= 5;
      evidence.push({
        key: "accepted_prompt",
        passed: false,
        message: EN_LOCALE.evidence.accepted_prompt,
        messageJa: JA_LOCALE.evidence.accepted_prompt,
      });
    }

    if (viewCount > 10) {
      score += 8;
      evidence.push({
        key: "investigated_codebase",
        passed: true,
        message: EN_LOCALE.evidence.investigated_codebase,
        messageJa: JA_LOCALE.evidence.investigated_codebase,
      });
    }

    const perSession = sessionCount > 0 ? questionCount / sessionCount : questionCount;
    score = Math.min(100, Math.max(20, score));
    return {
      key: "critical_thinking",
      score,
      confidence: 0.82,
      evidence,
      metric: {
        value: Number(perSession.toFixed(3)),
        display: `${perSession.toFixed(2)} clarifying questions per session`,
        displayJa: `1セッションあたり${perSession.toFixed(2)}件の確認・代替案`,
      },
    };
  }

  private analyzeFailurePattern(
    errorCount: number,
    recoveryRate: number,
    maxConsecutiveErrors: number,
    writeCount: number,
    testCount: number,
    isVerificationSpecialist: boolean
  ): FailurePattern {
    if (isVerificationSpecialist) {
      return {
        key: "verification_specialist",
        name: EN_LOCALE.failurePatterns.verification_specialist.name,
        description: EN_LOCALE.failurePatterns.verification_specialist.description,
        frequency: "low",
        steps: ["1. Read target files", "2. Run verification commands", "3. Assert specifications"],
        stepsJa: ["1. 対象ファイルの精読", "2. 検証コマンドの実行", "3. 仕様適合性の判定"],
        recoveryRate: 1.0,
      };
    }

    if (errorCount === 0) {
      return {
        key: "flawless",
        name: EN_LOCALE.failurePatterns.flawless.name,
        description: EN_LOCALE.failurePatterns.flawless.description,
        frequency: "low",
        steps: ["1. Read context", "2. Execute changes", "3. Complete task cleanly"],
        stepsJa: ["1. 文脈把握", "2. 修正実行", "3. エラーなしで完了"],
        recoveryRate: 1.0,
      };
    }

    if (recoveryRate >= 0.8) {
      return {
        key: "resilient",
        name: EN_LOCALE.failurePatterns.resilient.name,
        description: EN_LOCALE.failurePatterns.resilient.description,
        frequency: "medium",
        steps: [
          "1. Applies initial fix",
          "2. Observes test / command failure",
          "3. Inspects error trace",
          "4. Applies targeted correction successfully",
        ],
        stepsJa: [
          "1. 初回修正を実施",
          "2. テスト/コマンド失敗を検知",
          "3. エラートレースを解析",
          "4. ピンポイント修正で自律解決",
        ],
        recoveryRate,
      };
    }

    if (writeCount > 0 && testCount === 0) {
      return {
        key: "overconfident",
        name: EN_LOCALE.failurePatterns.overconfident.name,
        description: EN_LOCALE.failurePatterns.overconfident.description,
        frequency: "high",
        steps: [
          "1. Reads request",
          "2. Modifies code immediately",
          "3. Skips integration test",
          "4. Reports completion",
        ],
        stepsJa: [
          "1. 要件確認",
          "2. 即座にコード修正",
          "3. テスト実行をスキップ",
          "4. 完了報告",
        ],
        recoveryRate,
      };
    }

    if (maxConsecutiveErrors >= 3) {
      return {
        key: "looper",
        name: EN_LOCALE.failurePatterns.looper.name,
        description: EN_LOCALE.failurePatterns.looper.description,
        frequency: "medium",
        steps: [
          "1. Makes assumption",
          "2. Tool errors",
          "3. Repeats similar tool call with minor tweak",
          "4. Eventually discovers root cause",
        ],
        stepsJa: [
          "1. 推測で実行",
          "2. ツールエラー発生",
          "3. 類似ツール呼び出しを反復",
          "4. 試行錯誤の末に根本原因を特定",
        ],
        recoveryRate,
      };
    }

    return {
      key: "hesitant",
      name: EN_LOCALE.failurePatterns.hesitant.name,
      description: EN_LOCALE.failurePatterns.hesitant.description,
      frequency: "low",
      steps: ["1. Broad code search", "2. Deep file reads", "3. Cautious edit", "4. Verification"],
      stepsJa: ["1. 広範なコード検索", "2. 複数ファイルの深読み", "3. 慎重な修正", "4. 検証"],
      recoveryRate,
    };
  }

  private scoreToGrade(score: number): AgentReviewResult["overallGrade"] {
    if (score >= 95) return "A+";
    if (score >= 90) return "A";
    if (score >= 85) return "A-";
    if (score >= 80) return "B+";
    if (score >= 75) return "B";
    if (score >= 70) return "B-";
    if (score >= 65) return "C+";
    if (score >= 60) return "C";
    return "D";
  }

  private createEmptyResult(): AgentReviewResult {
    return {
      schemaVersion: "1.0.0",
      agent: { id: "unknown", name: "Unknown Agent" },
      period: { from: "N/A", to: "N/A", totalSessions: 0, totalEvents: 0 },
      overallGrade: "C",
      overallScore: 60,
      workStyle: {
        id: "balanced_generalist",
        label: "The Balanced Generalist",
        badge: "⚖️ The Balanced Generalist",
        summary: "Not enough transcript data available.",
        traits: ["Requires more session transcripts to establish personality profile."],
      },
      dimensions: {
        task_completion: { key: "task_completion", score: 60, confidence: 0.1, evidence: [] },
        instruction_following: { key: "instruction_following", score: 60, confidence: 0.1, evidence: [] },
        quality: { key: "quality", score: 60, confidence: 0.1, evidence: [] },
        verification: { key: "verification", score: 60, confidence: 0.1, evidence: [] },
        efficiency: { key: "efficiency", score: 60, confidence: 0.1, evidence: [] },
        critical_thinking: { key: "critical_thinking", score: 60, confidence: 0.1, evidence: [] },
      },
      strengths: ["Waiting for more session data..."],
      areasToImprove: ["Execute more subagent sessions to unlock insights."],
      interestingBehaviors: [],
      failurePattern: {
        key: "no_data",
        name: "No Data",
        description: "Insufficient session logs found.",
        frequency: "low",
        steps: [],
        recoveryRate: 0,
      },
      interventions: [],
      confidence: 0,
      hasEnoughData: false,
    };
  }
}
