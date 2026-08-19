import type {
  AgentInfo,
  DimensionKey,
  DimensionScore,
  FailurePattern,
  Intervention,
  WorkStyle,
} from "../types/index.js";
import type { BehavioralFingerprint } from "./work-styles.js";

export interface InterventionContext {
  agent: AgentInfo;
  workStyle: WorkStyle;
  failurePattern: FailurePattern;
  scores: Record<DimensionKey, DimensionScore>;
  fingerprint: BehavioralFingerprint;
}

interface ScoredIntervention {
  intervention: Intervention;
  priority: number;
}

/**
 * Universal & Language-Agnostic Intervention Engine.
 * Selects the single highest-impact, tailored instruction for CLAUDE.md / subagent definition.
 */
export function generateInterventions(context: InterventionContext): Intervention[] {
  const { agent, workStyle, scores, fingerprint } = context;
  const scoredList: ScoredIntervention[] = [];

  const targetAgentDoc =
    agent.id && agent.id !== "general-purpose" && agent.id !== "unknown"
      ? `.claude/agents/${agent.id}.md`
      : "CLAUDE.md";

  // Priority Case 1: Heavy Code Modification with Low Test-to-Write Ratio (Risk of breaking production)
  if (fingerprint.writeCount > 5 && fingerprint.testToWriteRatio < 0.5) {
    scoredList.push({
      priority: 100,
      intervention: {
        key: "verification",
        title: "Enforce Unit-Test Pairing per Modified Module",
        titleJa: "コード変更とテスト実行の 1:1 ペアリングを義務化",
        reason:
          `Observed ${fingerprint.writeCount} file modifications against only ${fingerprint.testCount} test executions (ratio: ${fingerprint.testToWriteRatio.toFixed(2)}). Batched edits increase regression risks.`,
        reasonJa:
          `コード変更（${fingerprint.writeCount}回）に対してテスト実行（${fingerprint.testCount}回、比率: ${(fingerprint.testToWriteRatio * 100).toFixed(0)}%）となっており、複数ファイル変更後のテストで手戻りリスクがあります。`,
        suggestedInstruction:
          `## Verification Rule\n` +
          `- Run relevant unit tests immediately after modifying any core logic file before proceeding to the next file.\n` +
          `- Run \`git diff\` or \`git status\` between major changes to ensure clean commits.`,
        suggestedInstructionJa:
          `## 検証ルール\n` +
          `- コアファイルを修正した直後は、次のファイルに着手する前に関連する単体テストを実行すること。\n` +
          `- 大きな変更の合間に \`git diff\` または \`git status\` で作業差分を確認すること。`,
        targetFile: targetAgentDoc,
      },
    });
  }

  // Priority Case 2: Read-Only Inspection Specialist (Zero Writes, High Views/Tests)
  if (fingerprint.writeCount === 0 && (fingerprint.viewCount > 5 || fingerprint.testCount > 5)) {
    if (fingerprint.readToWriteRatio > 8.0 && fingerprint.testCount <= 2) {
      scoredList.push({
        priority: 95,
        intervention: {
          key: "efficiency",
          title: "Structured Trade-Off Comparison Deliverable",
          titleJa: "調査成果物のトレードオフ比較マトリクス化",
          reason:
            `Deep research performed (${fingerprint.viewCount} reads). Compressing findings into a structured Pros/Cons matrix accelerates human decision-making.`,
          reasonJa:
            `広範なコード精読（${fingerprint.viewCount}回のファイル閲覧）が行われています。調査結果をトレードオフ比較表（Pros/Cons）で要約させると後続の意思決定が迅速化します。`,
          suggestedInstruction:
            `## Research Deliverable Format\n` +
            `- When presenting architectural findings, include a concise table comparing Option A vs Option B with Pros/Cons and trade-offs.\n` +
            `- Explicitly list exact file paths and symbols targeted for modification.`,
          suggestedInstructionJa:
            `## 調査成果物のフォーマット\n` +
            `- アーキテクチャや設計方針を提案する際は、A案とB案の比較表（Pros/Cons、工数、リスク）を必ず含めること。\n` +
            `- 採用案に対して修正が必要となる具体的なファイルパスとシンボル名を箇条書きで明記すること。`,
          targetFile: targetAgentDoc,
        },
      });
    } else {
      scoredList.push({
        priority: 95,
        intervention: {
          key: "verification",
          title: "Exhaustive Boundary & Edge-Case Assertion Checklist",
          titleJa: "境界値 & 異常系マトリクス検証の義務化",
          reason:
            "Specializes in verification and inspection. Can systematically expand test assertions to cover null, boundary, and timeout states.",
          reasonJa:
            "読み取り専用での検査・検証に特化しています。正常系だけでなく境界値や null/undefined、異常系の網羅チェックを指示すると検証精度がさらに高まります。",
          suggestedInstruction:
            `## Inspection & Verification Guidelines\n` +
            `- In addition to standard assertion checks, explicitly test edge-cases: null, empty values, boundary inputs, and error states.\n` +
            `- Assert that domain invariants and schema typings remain intact after operations.`,
          suggestedInstructionJa:
            `## 検査・検証ガイドライン\n` +
            `- 正常系シナリオに加えて、null/空文字/最大最小境界値/タイムアウト等の異常系テストケースを必ず検証項目に含めること。\n` +
            `- ドメイン不変条件（スキーマ制約や型定義、トランザクション整合性）が破壊されていないかを明示的にアサーションすること。`,
          targetFile: targetAgentDoc,
        },
      });
    }
  }

  // Priority Case 3: Work-Style tailored behavioral adjustments
  switch (workStyle.id) {
    case "critical_analyst":
      scoredList.push({
        priority: 85,
        intervention: {
          key: "critical_thinking",
          title: "Actionable Alternative Proposals with Code Snippets",
          titleJa: "疑問提示から具体的代替パッチへの昇華",
          reason:
            "High critical thinking. Prompting the agent to provide ready-to-merge alternative code snippets alongside questions speeds up resolution.",
          reasonJa:
            "要件の矛盾やリスクを発見する能力に優れています。疑問提起と同時に具体的な代替コード案を提示させると意思決定がスムーズになります。",
          suggestedInstruction:
            `## When Questioning Requirements\n` +
            `- When identifying an architectural contradiction, provide Option 1 (Recommended) and Option 2 with concrete code snippets.`,
          suggestedInstructionJa:
            `## 要件への疑問・提案フロー\n` +
            `- 要件の矛盾やリスクを指摘する際は、問題点の要約に加えて「推奨案（Option 1）」と「代替案（Option 2）」のコードスニペットを添えて提示すること。`,
          targetFile: targetAgentDoc,
        },
      });
      break;

    case "cautious_builder":
    case "deep_explorer":
      scoredList.push({
        priority: 80,
        intervention: {
          key: "efficiency",
          title: "Targeted Investigation Scope for Minor Tasks",
          titleJa: "軽微タスクにおけるピンポイント調査ガイドライン",
          reason:
            "Strong verification habits. Setting narrow search bounds on localized tasks prevents over-investigation overhead.",
          reasonJa:
            "高い検証意識を持っています。局所的なバグ修正時に探索範囲を絞り込む基準を設けると作業効率がさらに高まります。",
          suggestedInstruction:
            `## Investigation Bounds\n` +
            `- For localized single-file fixes, target queries narrowly using exact symbol names before reading wider directories.`,
          suggestedInstructionJa:
            `## 調査範囲の絞り込み\n` +
            `- 局所的な修正時は、ディレクトリ全体の走査を避け、シンボル定義と直近の呼び出し元に絞って探索すること。`,
          targetFile: targetAgentDoc,
        },
      });
      break;

    case "speedrunner":
    case "pragmatic_shipper":
      scoredList.push({
        priority: 88,
        intervention: {
          key: "verification",
          title: "Mandatory Pre-Completion Diff Inspection Gate",
          titleJa: "完了前 git diff 確認チェックリストの義務化",
          reason:
            "High implementation velocity. Requiring a final diff check ensures no unintended side-effects or formatting changes slip in.",
          reasonJa:
            "高い実装速度を誇ります。完了直前に \`git diff\` による差分確認を義務化することで、意図しない変更の混入を防止できます。",
          suggestedInstruction:
            `## Pre-Completion Gate\n` +
            `- Always execute \`git diff\` to inspect all modifications before reporting task completion.`,
          suggestedInstructionJa:
            `## 完了前ゲート\n` +
            `- タスク完了を宣言する直前に必ず \`git diff\` を実行し、変更差分を最終確認すること。`,
          targetFile: targetAgentDoc,
        },
      });
      break;

    case "autonomous_troubleshooter":
    case "iterative_prototyper":
      scoredList.push({
        priority: 85,
        intervention: {
          key: "quality",
          title: "Add Dedicated Regression Test for Resolved Errors",
          titleJa: "再発防止用リグレッションテストの追加",
          reason:
            "Outstanding debugging ability. Ensuring every fixed bug has a corresponding regression test creates a lasting safety net.",
          reasonJa:
            "優れたデバッグ力を持っています。解決したエラーに対して再現テストケースを1件追加するルールを設けると品質が持続します。",
          suggestedInstruction:
            `## Regression Testing\n` +
            `- For every bug or test failure resolved, add a dedicated unit test covering the exact failure scenario before closing the task.`,
          suggestedInstructionJa:
            `## 回帰テスト\n` +
            `- 解決したエラーやバグに対して、その失敗条件を再現する単体テストケースを必ず1件追加してから完了とすること。`,
          targetFile: targetAgentDoc,
        },
      });
      break;

    case "quality_gatekeeper":
    case "systematic_architect":
      scoredList.push({
        priority: 75,
        intervention: {
          key: "quality",
          title: "Document Architectural Invariants & Domain Constraints",
          titleJa: "アーキテクチャ不変条件と制約のドキュメント化",
          reason:
            "High attention to code quality. Adding comments on critical domain invariants enhances long-term maintainability across any language.",
          reasonJa:
            "細部への品質意識が高いエージェントです。重要な設計意図や制約を簡潔なコメント・docstringとして残すルールを追加すると効果的です。",
          suggestedInstruction:
            `## Architectural Invariants\n` +
            `- When creating new utility functions or types, document non-obvious domain constraints in concise docstrings/comments.`,
          suggestedInstructionJa:
            `## アーキテクチャ不変条件の記録\n` +
            `- 重要な共通型やユーティリティを新設した際は、設計意図と非自明な制約事項を簡潔なコメント・docstringとして残すこと。`,
          targetFile: targetAgentDoc,
        },
      });
      break;

    default:
      break;
  }

  // Fallback for general compliance / excellent benchmarks
  if (scoredList.length === 0) {
    scoredList.push({
      priority: 50,
      intervention: {
        key: "best_practice",
        title: "Maintain Excellence with Continuous Baseline Tracking",
        titleJa: "現在の優れた仕事水準を維持",
        reason: "The agent is performing exceptionally well across all standard benchmarks.",
        reasonJa: "すべての主要指標において極めて優秀なパフォーマンスを発揮しています。",
        suggestedInstruction:
          `## Best Practices\n` +
          `- Continue documenting rationale in concise summaries when proposing major refactors.`,
        suggestedInstructionJa:
          `## ベストプラクティス\n` +
          `- 大きなリファクタリングを提案する際は、簡潔な設計意図をあわせて記録すること。`,
        targetFile: targetAgentDoc,
      },
    });
  }

  scoredList.sort((a, b) => b.priority - a.priority);
  return [scoredList[0].intervention];
}
