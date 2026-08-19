import { EN_LOCALE } from "../locales/en.js";
import { JA_LOCALE } from "../locales/ja.js";
import type { AgentReviewResult, DimensionKey, WorkStyleId } from "../types/index.js";

export const PROJECT_URL = "https://github.com/tkana-dev/subagent-insights";

const DIMENSION_ORDER: DimensionKey[] = [
  "task_completion",
  "instruction_following",
  "quality",
  "verification",
  "efficiency",
  "critical_thinking",
];

/**
 * Display width in terminal columns.
 *
 * String.padEnd counts UTF-16 code units, so a Japanese label lands at half the
 * width it actually occupies and the pasted table comes out ragged. Full-width
 * and wide ranges (CJK, kana, full-width forms) count as two columns.
 */
export function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    const wide =
      (cp >= 0x1100 && cp <= 0x115f) ||
      (cp >= 0x2e80 && cp <= 0xa4cf) ||
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) ||
      (cp >= 0xfe30 && cp <= 0xfe6f) ||
      (cp >= 0xff00 && cp <= 0xff60) ||
      (cp >= 0xffe0 && cp <= 0xffe6);
    width += wide ? 2 : 1;
  }
  return width;
}

function padTo(text: string, columns: number): string {
  return text + " ".repeat(Math.max(1, columns - displayWidth(text)));
}

/**
 * A Discord-ready message.
 *
 * Discord has no share-intent URL — there is no public scheme for posting into
 * a channel the way X exposes /intent/tweet — so the useful thing to hand an
 * engineer is a block they can paste. Discord renders fenced blocks as
 * monospace, which is what keeps the score table aligned.
 *
 * Carries the same facts as the X text: scores and observed rates only, never
 * transcript content, file paths or repository names.
 */
export function buildDiscordMessage(result: AgentReviewResult, lang: "en" | "ja" = "en"): string {
  const loc = lang === "ja" ? JA_LOCALE : EN_LOCALE;
  const ws = loc.workStyles[result.workStyle.id as WorkStyleId] || loc.workStyles.balanced_generalist;

  const names = DIMENSION_ORDER.map((key) => loc.dimensions[key] || key);
  const nameColumn = Math.max(...names.map(displayWidth)) + 2;

  const rows = DIMENSION_ORDER.map((key, i) => {
    const dim = result.dimensions[key];
    const score = String(dim.score).padStart(3);
    const observed = dim.metric
      ? (lang === "ja" && dim.metric.displayJa) || dim.metric.display
      : "";
    return `${padTo(names[i], nameColumn)}${score}   ${observed}`;
  });

  const headline =
    lang === "ja"
      ? `**Claude Code サブエージェント分析** — ${ws.badge}`
      : `**Claude Code Subagent Report** — ${ws.badge}`;

  const summary =
    lang === "ja"
      ? `総合 **${result.overallGrade}** (${result.overallScore}/100) ・ ${result.period.totalSessions} セッション ・ 自律回復率 ${Math.round(result.failurePattern.recoveryRate * 100)}%`
      : `Grade **${result.overallGrade}** (${result.overallScore}/100) · ${result.period.totalSessions} sessions · ${Math.round(result.failurePattern.recoveryRate * 100)}% autonomous recovery`;

  return [headline, summary, "```", ...rows, "```", PROJECT_URL].join("\n");
}
