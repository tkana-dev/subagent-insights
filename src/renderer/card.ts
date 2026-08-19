import { EN_LOCALE } from "../locales/en.js";
import { JA_LOCALE } from "../locales/ja.js";
import type { AgentReviewResult, DimensionKey, WorkStyleId } from "../types/index.js";
import { PROJECT_URL, displayWidth } from "./share.js";

/** 1200x630 is what X, Slack and GitHub previews crop to. */
const W = 1200;
const H = 630;

const DIMENSIONS: DimensionKey[] = [
  "task_completion",
  "instruction_following",
  "quality",
  "verification",
  "efficiency",
  "critical_thinking",
];

const INK = {
  bg: "#16161a",
  panel: "#1e1e24",
  rule: "#2f2f38",
  primary: "#e9e9e4",
  muted: "#8f8f88",
  good: "#7cc98f",
  fair: "#e0b354",
  poor: "#e07a7a",
};

/** Agent names come from the user's own config and can contain anything. */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function scoreInk(score: number): string {
  if (score >= 85) return INK.good;
  if (score >= 70) return INK.fair;
  return INK.poor;
}

/**
 * A shareable summary card.
 *
 * SVG on purpose: it needs no dependency, so the card can never be the reason
 * the CLI fails to install. PNG is produced by rasterising this, when the
 * optional renderer is present.
 *
 * Carries the same facts as the other share outputs — scores, observed rates
 * and the agent's name. No transcript text, no paths, no repository names.
 */
export function buildCardSvg(result: AgentReviewResult, lang: "en" | "ja" = "en"): string {
  const loc = lang === "ja" ? JA_LOCALE : EN_LOCALE;
  const ws = loc.workStyles[result.workStyle.id as WorkStyleId] || loc.workStyles.balanced_generalist;
  const pattern =
    loc.failurePatterns[result.failurePattern.key as keyof typeof loc.failurePatterns]?.name ??
    result.failurePattern.name;

  const labels = DIMENSIONS.map((key) => loc.dimensions[key] || key);
  const observed = DIMENSIONS.map((key) => {
    const metric = result.dimensions[key].metric;
    return metric ? ((lang === "ja" && metric.displayJa) || metric.display) : "";
  });

  // Monospace advance is a fixed fraction of the size, so the row can be laid
  // out from measured text instead of guessed at. Japanese labels are roughly
  // twice as wide per character, which is what overflowed the first version.
  const LEFT = 80;
  const RIGHT = W - 80;
  const advance = (size: number) => size * 0.62;

  let labelSize = 26;
  let rateSize = 22;
  let scoreX = 0;

  for (let attempt = 0; attempt < 8; attempt++) {
    const labelPx = Math.max(...labels.map(displayWidth)) * advance(labelSize);
    const ratePx = Math.max(...observed.map(displayWidth)) * advance(rateSize);
    scoreX = Math.round(LEFT + labelPx + 48);
    if (scoreX + 24 + ratePx <= RIGHT) break;
    labelSize -= 2;
    rateSize -= 2;
  }

  const rows = DIMENSIONS.map((key, i) => {
    const dim = result.dimensions[key];
    const y = 248 + i * 46;
    return `
  <text x="${LEFT}" y="${y}" fill="${INK.primary}" font-size="${labelSize}">${esc(labels[i])}</text>
  <text x="${scoreX}" y="${y}" fill="${scoreInk(dim.score)}" font-size="${labelSize + 2}" text-anchor="end">${dim.score}</text>
  <text x="${scoreX + 24}" y="${y}" fill="${INK.muted}" font-size="${rateSize}">${esc(observed[i])}</text>`;
  }).join("");

  const subtitle = lang === "ja" ? "Claude Code サブエージェント" : "Claude Code subagent";
  const patternLabel = lang === "ja" ? "失敗パターン" : "Failure pattern";
  const mono = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'DejaVu Sans Mono', monospace";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${mono}">
  <rect width="${W}" height="${H}" fill="${INK.bg}"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="18" fill="${INK.panel}"/>

  <text x="${LEFT}" y="128" fill="${INK.primary}" font-size="40">${esc(ws.label)}</text>
  <text x="${LEFT}" y="168" fill="${INK.muted}" font-size="24">${esc(subtitle)} · ${esc(result.agent.id)}</text>

  <text x="${RIGHT}" y="134" fill="${scoreInk(result.overallScore)}" font-size="72" text-anchor="end">${esc(result.overallGrade)}</text>
  <text x="${RIGHT}" y="170" fill="${INK.muted}" font-size="24" text-anchor="end">${result.overallScore} / 100</text>

  <line x1="${LEFT}" y1="200" x2="${RIGHT}" y2="200" stroke="${INK.rule}" stroke-width="2"/>
${rows}
  <line x1="${LEFT}" y1="508" x2="${RIGHT}" y2="508" stroke="${INK.rule}" stroke-width="2"/>

  <text x="${LEFT}" y="546" fill="${INK.primary}" font-size="24">${esc(patternLabel)} · ${esc(pattern)}</text>
  <text x="${LEFT}" y="580" fill="${INK.muted}" font-size="20">npx subagent-insights · ${esc(PROJECT_URL.replace("https://", ""))}</text>
</svg>
`;
}
