import boxen from "boxen";
import chalk from "chalk";
import Table from "cli-table3";
import { EN_LOCALE } from "../locales/en.js";
import { JA_LOCALE } from "../locales/ja.js";
import { PROJECT_URL, displayWidth } from "./share.js";
import type { AgentReviewResult, DimensionKey, WorkStyleId } from "../types/index.js";


/** Width of the widest localized dimension label, plus cell padding. */
function dimensionColumnWidth(loc: typeof EN_LOCALE): number {
  const widest = Math.max(
    ...Object.values(loc.dimensions).map((label) => displayWidth(String(label)))
  );
  return widest + 4;
}

/** Width of the widest observed rate, so the column never truncates. */
function observedColumnWidth(result: AgentReviewResult): number {
  const widest = Math.max(
    ...Object.values(result.dimensions).flatMap((dim) =>
      dim.metric ? [displayWidth(dim.metric.display), displayWidth(dim.metric.displayJa ?? "")] : [0]
    )
  );
  return Math.max(24, widest + 4);
}

/** OSC 8 hyperlink: renders `label` as a clickable link to `url`. */
function osc8(url: string, label: string): string {
  return `\u001B]8;;${url}\u001B\\${label}\u001B]8;;\u001B\\`;
}


export interface RenderOptions {
  lang?: "en" | "ja";
  showEvidence?: boolean;
  showInterventions?: boolean;
  showHeader?: boolean;
  agentIndex?: number;
  totalAgents?: number;
}

/**
 * Sanitize absolute file paths to protect sensitive local directory structures.
 */
function sanitizePath(rawPath: string): string {
  if (!rawPath) return rawPath;
  return rawPath
    .replace(/\/Users\/[^\/]+\//g, "~/")
    .replace(/\/home\/[^\/]+\//g, "~/");
}

export class TerminalRenderer {
  /**
   * Render the top overview summary table when multiple subagents are found.
   */
  public renderOverviewTable(results: AgentReviewResult[], options: RenderOptions = {}): string {
    const lang = options.lang === "ja" ? "ja" : "en";
    const loc = lang === "ja" ? JA_LOCALE : EN_LOCALE;
    const lines: string[] = [];

    // Header Box
    const headerContent =
      chalk.bold.cyanBright(`${loc.header.title}\n`) +
      chalk.dim(`${loc.header.subtitle}`);

    lines.push(
      boxen(headerContent, {
        padding: { top: 0, bottom: 0, left: 4, right: 4 },
        margin: { top: 0, bottom: 1 },
        borderStyle: "double",
        borderColor: "cyan",
        textAlignment: "center",
      })
    );

    const titleStr = lang === "ja" ? "📊 検出されたサブエージェント一覧" : "📊 Discovered Subagents Overview";
    lines.push(chalk.bold.white(titleStr));

    const table = new Table({
      head: [
        chalk.bold.cyan(loc.labels.agent),
        chalk.bold.cyan(loc.sections.workStyle),
        chalk.bold.cyan(loc.labels.overallGrade),
        chalk.bold.cyan(loc.labels.sessions),
      ],
      colWidths: [26, 42, 14, 12],
      style: { head: [], border: ["dim"] },
    });

    for (const res of results) {
      const wsId = res.workStyle.id as WorkStyleId;
      const localizedWs = loc.workStyles[wsId] || loc.workStyles.balanced_generalist;

      const gradeColor =
        res.overallGrade.startsWith("A") ? chalk.bold.green :
        res.overallGrade.startsWith("B") ? chalk.bold.cyan :
        res.overallGrade.startsWith("C") ? chalk.bold.yellow : chalk.bold.red;

      table.push([
        chalk.bold.magenta(res.agent.name),
        chalk.yellowBright(localizedWs.badge),
        gradeColor(`${res.overallGrade} (${res.overallScore})`),
        chalk.white(`${res.period.totalSessions}`),
      ]);
    }

    lines.push(table.toString());
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Render individual Agent Review Card.
   */
  public render(result: AgentReviewResult, options: RenderOptions = {}): string {
    const lang = options.lang === "ja" ? "ja" : "en";
    const loc = lang === "ja" ? JA_LOCALE : EN_LOCALE;
    const lines: string[] = [];

    // Header Box (only if showHeader !== false)
    if (options.showHeader !== false) {
      const headerContent =
        chalk.bold.cyanBright(`${loc.header.title}\n`) +
        chalk.dim(`${loc.header.subtitle}`);

      lines.push(
        boxen(headerContent, {
          padding: { top: 0, bottom: 0, left: 4, right: 4 },
          margin: { top: 0, bottom: 1 },
          borderStyle: "double",
          borderColor: "cyan",
          textAlignment: "center",
        })
      );
    }

    // Sub-agent Header with index badge if in batch mode
    const indexPrefix =
      options.agentIndex && options.totalAgents && options.totalAgents > 1
        ? chalk.dim(`[${options.agentIndex}/${options.totalAgents}] `)
        : "";

    const gradeColor =
      result.overallGrade.startsWith("A") ? chalk.bold.green :
      result.overallGrade.startsWith("B") ? chalk.bold.cyan :
      result.overallGrade.startsWith("C") ? chalk.bold.yellow : chalk.bold.red;

    const agentHeader =
      indexPrefix +
      chalk.bold.white(`👤 ${loc.labels.agent}: `) +
      chalk.bold.magenta(result.agent.name) +
      chalk.dim(` (${result.agent.id})`) +
      `   ` +
      chalk.bold.white(`${loc.labels.overallGrade}: `) +
      gradeColor(result.overallGrade) +
      chalk.dim(` (${result.overallScore}/100)`);

    lines.push(agentHeader);

    // Localized Work Style Definition
    const wsId = result.workStyle.id as WorkStyleId;
    const localizedWs = loc.workStyles[wsId] || loc.workStyles.balanced_generalist;

    const workStyleBadge = localizedWs.badge;
    const workStyleSummary = localizedWs.summary;
    const workStyleTraits = localizedWs.traits;

    const workStyleContent =
      chalk.bold.yellowBright(workStyleBadge) +
      "\n\n" +
      chalk.italic.white(workStyleSummary) +
      "\n\n" +
      chalk.bold.dim(`${loc.sections.keyTraits}\n`) +
      workStyleTraits.map((t) => chalk.cyan(` • ${t}`)).join("\n");

    lines.push(
      boxen(workStyleContent, {
        padding: 1,
        margin: { top: 0, bottom: 1 },
        borderStyle: "round",
        borderColor: "magenta",
        title: chalk.bold.magentaBright(` ${loc.sections.workStyle} `),
        titleAlignment: "center",
      })
    );

    // Performance Dimensions Table with Visual Bars
    lines.push(chalk.bold.underline.white(loc.sections.dimensions));
    const table = new Table({
      head: [
        chalk.bold.cyan(loc.tableHeaders.dimension),
        chalk.bold.cyan(loc.tableHeaders.score),
        chalk.bold.cyan(loc.tableHeaders.distribution),
        chalk.bold.cyan(loc.tableHeaders.observed),
      ],
      // Japanese labels are twice as wide per character and were being
      // truncated by a fixed width ("タスク完遂力 (Task Completi…").
      colWidths: [dimensionColumnWidth(loc), 8, 16, observedColumnWidth(result)],
      style: { head: [], border: ["dim"] },
    });

    const dimKeys: DimensionKey[] = [
      "task_completion",
      "instruction_following",
      "quality",
      "verification",
      "efficiency",
      "critical_thinking",
    ];

    for (const key of dimKeys) {
      const dim = result.dimensions[key];
      const dimName = loc.dimensions[key] || key;
      const bar = this.renderProgressBar(dim.score);
      const scoreStr =
        dim.score >= 85 ? chalk.bold.green(`${dim.score}`) :
        dim.score >= 70 ? chalk.bold.yellow(`${dim.score}`) :
        chalk.bold.red(`${dim.score}`);

      const metric = dim.metric
        ? chalk.dim((lang === "ja" && dim.metric.displayJa) || dim.metric.display)
        : chalk.dim("—");

      table.push([dimName, scoreStr, bar, metric]);
    }
    lines.push(table.toString());
    lines.push("");

    // Strengths & Areas to Improve (Bilingual)
    const strengthsList = (lang === "ja" && result.strengthsJa && result.strengthsJa.length > 0)
      ? result.strengthsJa
      : result.strengths;

    lines.push(chalk.bold.green(`✓ ${loc.sections.strengths}`));
    for (const strength of strengthsList) {
      lines.push(chalk.greenBright(`  ✓ ${strength}`));
    }
    lines.push("");

    const areasList = (lang === "ja" && result.areasToImproveJa && result.areasToImproveJa.length > 0)
      ? result.areasToImproveJa
      : result.areasToImprove;

    lines.push(chalk.bold.yellow(`△ ${loc.sections.areasToImprove}`));
    for (const area of areasList) {
      lines.push(chalk.yellowBright(`  △ ${area}`));
    }
    lines.push("");

    // Interesting Behaviors (Sanitized)
    if (result.interestingBehaviors && result.interestingBehaviors.length > 0) {
      lines.push(chalk.bold.magentaBright(`💡 ${loc.sections.interestingBehaviors}`));
      for (const behavior of result.interestingBehaviors) {
        const title = (lang === "ja" && behavior.titleJa) ? behavior.titleJa : behavior.title;
        const body = (lang === "ja" && behavior.descriptionJa) || behavior.description;
        const sanitizedDesc = sanitizePath(body);
        lines.push(chalk.bold.white(`  • ${title}`));
        lines.push(chalk.dim(`    "${sanitizedDesc}"`));
      }
      lines.push("");
    }

    // Failure Style
    if (result.failurePattern) {
      const patKey = result.failurePattern.key || "resilient";
      const localizedPat = loc.failurePatterns[patKey as keyof typeof loc.failurePatterns] || {
        name: result.failurePattern.name,
        description: result.failurePattern.description,
      };

      const stepsList = (lang === "ja" && result.failurePattern.stepsJa)
        ? result.failurePattern.stepsJa
        : result.failurePattern.steps;

      lines.push(chalk.bold.redBright(`⚠️  ${loc.sections.failurePattern}`));
      lines.push(
        chalk.bold.white(`  ${loc.labels.pattern}: `) +
        chalk.red(`${localizedPat.name}`) +
        chalk.dim(` (${loc.labels.recoveryRate}: ${(result.failurePattern.recoveryRate * 100).toFixed(0)}%)`)
      );
      lines.push(chalk.dim(`  ${localizedPat.description}`));
      if (stepsList.length > 0) {
        lines.push(chalk.dim(`  ${loc.labels.sequence}: `) + chalk.cyan(stepsList.join(" → ")));
      }
      lines.push("");
    }

    // Extracted Rule-based Interventions for CLAUDE.md
    if (options.showInterventions !== false && result.interventions.length > 0) {
      lines.push(chalk.bold.cyanBright(`🚀 ${loc.sections.suggestedInterventions}`));
      for (const item of result.interventions) {
        const title = (lang === "ja" && item.titleJa) ? item.titleJa : item.title;
        const reason = (lang === "ja" && item.reasonJa) ? item.reasonJa : item.reason;
        const instruction = (lang === "ja" && item.suggestedInstructionJa) ? item.suggestedInstructionJa : item.suggestedInstruction;
        const targetFile = item.targetFile || "CLAUDE.md";

        const interventionBox =
          chalk.bold.white(`${title}\n`) +
          chalk.dim(`${lang === "ja" ? "理由" : "Reason"}: ${reason}\n\n`) +
          chalk.green(`${lang === "ja" ? `${targetFile} に追加推奨:` : `Add to ${targetFile}:`}\n`) +
          chalk.gray("─────────────────────────────────────\n") +
          chalk.cyan(instruction);

        lines.push(
          boxen(interventionBox, {
            padding: 0.5,
            margin: { top: 0, bottom: 0.5 },
            borderStyle: "single",
            borderColor: "cyan",
          })
        );
      }
      lines.push("");
    }

    // Evidence details (if requested)
    if (options.showEvidence) {
      lines.push(chalk.bold.white(`🔍 ${loc.sections.evidence}`));
      for (const key of dimKeys) {
        const dim = result.dimensions[key];
        lines.push(chalk.bold.cyan(`  [${loc.dimensions[key]} (${dim.score}/100)]`));
        for (const ev of dim.evidence) {
          const icon = ev.passed ? chalk.green("✓") : chalk.red("✗");
          const msg = (lang === "ja" && ev.messageJa) ? ev.messageJa : ev.message;
          lines.push(`    ${icon} ${msg}`);
        }
      }
      lines.push("");
    }

    // Footer stats
    const footer = chalk.dim(
      `📊 ${loc.labels.sessions}: ${result.period.totalSessions} | ${loc.labels.events}: ${result.period.totalEvents} | ${loc.labels.period}: ${result.period.from} ~ ${result.period.to} | ${loc.labels.confidence}: ${(result.confidence * 100).toFixed(0)}%`
    );
    lines.push(footer);

    // Clean, Systematic, Privacy-Safe Share URL (Metric & Fact based)
    const shareUrl = this.generateSystematicShareUrl(result, lang);
    const shareLabel = lang === "ja" ? "📢 シェア:" : "📢 Share:";
    const discordHint =
      lang === "ja"
        ? "Discord に貼る: subagent-insights share"
        : "paste into Discord: subagent-insights share";
    // The raw intent URL is ~400 characters of percent-encoding. Dumping that
    // into the terminal buries the report it is meant to advertise, so render a
    // clickable label when attached to a terminal and keep the plain URL for
    // pipes, where something has to be able to read it.
    lines.push(
      process.stdout.isTTY
        ? `\n${chalk.dim(shareLabel)} X ${chalk.underline.blueBright(osc8(shareUrl, "→ open"))}` +
            chalk.dim(`  ·  ${discordHint}`)
        : `\n${chalk.dim(shareLabel)} X:\n${shareUrl}\n${chalk.dim(discordHint)}`
    );

    return lines.join("\n");
  }

  /**
   * Generates a concise, systematic, fact-based share link.
   * Completely avoids hyperbolic/game titles; presents clean engineering metrics.
   */
  public generateSystematicShareUrl(result: AgentReviewResult, lang: "en" | "ja"): string {
    const loc = lang === "ja" ? JA_LOCALE : EN_LOCALE;
    const wsId = result.workStyle.id as WorkStyleId;
    const localizedWs = loc.workStyles[wsId] || loc.workStyles.balanced_generalist;

    let tweetText = "";
    // Single source of truth: this string previously pointed at a repo that
    // did not exist, and it ships inside every shared tweet.
    if (lang === "ja") {
      tweetText =
        `Claude Code サブエージェント行動分析レポート\n` +
        `・対象: ${result.agent.name}\n` +
        `・ワークスタイル: ${localizedWs.badge}\n` +
        `・総合評価: ${result.overallGrade} (${result.overallScore}/100)\n` +
        `・分析セッション: ${result.period.totalSessions}件 (エラー自律復旧率: ${(result.failurePattern.recoveryRate * 100).toFixed(0)}%)\n\n` +
        `#ClaudeCode #SubagentInsights\n` +
        `${PROJECT_URL}`;
    } else {
      tweetText =
        `Claude Code Subagent Performance Report\n` +
        `• Agent: ${result.agent.name}\n` +
        `• Work Pattern: ${localizedWs.badge}\n` +
        `• Overall Grade: ${result.overallGrade} (${result.overallScore}/100)\n` +
        `• Sessions: ${result.period.totalSessions} (Autonomous Recovery: ${(result.failurePattern.recoveryRate * 100).toFixed(0)}%)\n\n` +
        `#ClaudeCode #SubagentInsights\n` +
        `${PROJECT_URL}`;
    }

    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
  }

  private renderProgressBar(score: number): string {
    const totalBars = 12;
    const filledBars = Math.round((score / 100) * totalBars);
    const emptyBars = totalBars - filledBars;

    const filled = "█".repeat(filledBars);
    const empty = "░".repeat(emptyBars);

    if (score >= 85) {
      return chalk.green(filled) + chalk.dim(empty);
    } else if (score >= 70) {
      return chalk.yellow(filled) + chalk.dim(empty);
    } else {
      return chalk.red(filled) + chalk.dim(empty);
    }
  }
}
