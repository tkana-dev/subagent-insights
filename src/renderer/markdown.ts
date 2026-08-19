import { EN_LOCALE } from "../locales/en.js";
import { JA_LOCALE } from "../locales/ja.js";
import type { AgentReviewResult, DimensionKey, WorkStyleId } from "../types/index.js";

export class MarkdownRenderer {
  public render(result: AgentReviewResult, lang: "en" | "ja" = "en"): string {
    const loc = lang === "ja" ? JA_LOCALE : EN_LOCALE;
    const wsId = result.workStyle.id as WorkStyleId;
    const localizedWs = loc.workStyles[wsId] || loc.workStyles.balanced_generalist;

    const lines: string[] = [];

    lines.push(`# 📋 ${loc.header.title}`);
    lines.push(`> *${loc.header.subtitle}*`);
    lines.push("");
    lines.push(`**${loc.labels.agent}:** \`${result.agent.name}\` (\`${result.agent.id}\`)  `);
    lines.push(`**${loc.labels.overallGrade}:** **${result.overallGrade}** (${result.overallScore}/100)  `);
    lines.push(`**${loc.sections.workStyle}:** **${localizedWs.badge}**  `);
    lines.push(`**${loc.labels.period}:** ${result.period.from} ~ ${result.period.to} (${result.period.totalSessions} ${loc.labels.sessions}, ${result.period.totalEvents} ${loc.labels.events})`);
    lines.push("");

    lines.push(`## 🎭 ${loc.sections.workStyle}`);
    lines.push(`> ${localizedWs.summary}`);
    lines.push("");
    lines.push(`### ${loc.sections.keyTraits}`);
    for (const trait of localizedWs.traits) {
      lines.push(`- ${trait}`);
    }
    lines.push("");

    lines.push(`## 📊 ${loc.sections.dimensions}`);
    lines.push(
      `| ${loc.tableHeaders.dimension} | ${loc.tableHeaders.score} | ${lang === "ja" ? "ステータス" : "Assessment"} | ${loc.tableHeaders.observed} |`
    );
    lines.push("| :--- | :--- | :--- | :--- |");

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
      const status =
        dim.score >= 85 ? (lang === "ja" ? "🟢 優秀 (Excellent)" : "🟢 Excellent") :
        dim.score >= 70 ? (lang === "ja" ? "🟡 良好 (Good)" : "🟡 Good") :
        (lang === "ja" ? "🔴 改善余地あり (Needs Attention)" : "🔴 Needs Attention");

      const metric = dim.metric
        ? (lang === "ja" && dim.metric.displayJa) || dim.metric.display
        : "—";

      lines.push(`| **${dimName}** | \`${dim.score}/100\` | ${status} | ${metric} |`);
    }
    lines.push("");

    const strengthsList = (lang === "ja" && result.strengthsJa && result.strengthsJa.length > 0)
      ? result.strengthsJa
      : result.strengths;

    lines.push(`## ✓ ${loc.sections.strengths}`);
    for (const s of strengthsList) {
      lines.push(`- [x] ${s}`);
    }
    lines.push("");

    const areasList = (lang === "ja" && result.areasToImproveJa && result.areasToImproveJa.length > 0)
      ? result.areasToImproveJa
      : result.areasToImprove;

    lines.push(`## △ ${loc.sections.areasToImprove}`);
    for (const a of areasList) {
      lines.push(`- [ ] ${a}`);
    }
    lines.push("");

    if (result.interestingBehaviors.length > 0) {
      lines.push(`## 💡 ${loc.sections.interestingBehaviors}`);
      for (const b of result.interestingBehaviors) {
        const title = (lang === "ja" && b.titleJa) ? b.titleJa : b.title;
        const body = (lang === "ja" && b.descriptionJa) || b.description;
        lines.push(`- **${title}**: *"${body}"*`);
      }
      lines.push("");
    }

    if (result.failurePattern) {
      const patKey = result.failurePattern.key || "resilient";
      const localizedPat = loc.failurePatterns[patKey as keyof typeof loc.failurePatterns] || {
        name: result.failurePattern.name,
        description: result.failurePattern.description,
      };
      const stepsList = (lang === "ja" && result.failurePattern.stepsJa)
        ? result.failurePattern.stepsJa
        : result.failurePattern.steps;

      lines.push(`## ⚠️ ${loc.sections.failurePattern}`);
      lines.push(`- **${loc.labels.pattern}:** \`${localizedPat.name}\``);
      lines.push(`- **${loc.labels.recoveryRate}:** \`${(result.failurePattern.recoveryRate * 100).toFixed(0)}%\``);
      lines.push(`- **${lang === "ja" ? "概要" : "Description"}:** ${localizedPat.description}`);
      if (stepsList.length > 0) {
        lines.push(`- **${loc.labels.sequence}:** ${stepsList.join(" ➔ ")}`);
      }
      lines.push("");
    }

    if (result.interventions.length > 0) {
      lines.push(`## 🚀 ${loc.sections.suggestedInterventions}`);
      for (const item of result.interventions) {
        const title = (lang === "ja" && item.titleJa) ? item.titleJa : item.title;
        const reason = (lang === "ja" && item.reasonJa) ? item.reasonJa : item.reason;
        const instruction = (lang === "ja" && item.suggestedInstructionJa) ? item.suggestedInstructionJa : item.suggestedInstruction;

        lines.push(`### ${title}`);
        lines.push(`*${reason}*`);
        lines.push("");
        lines.push(`\`\`\`markdown`);
        lines.push(instruction);
        lines.push(`\`\`\``);
        lines.push("");
      }
    }

    return lines.join("\n");
  }
}
