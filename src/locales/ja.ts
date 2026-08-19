import type { DimensionKey, WorkStyleId } from "../types/index.js";

export const JA_LOCALE = {
  header: {
    title: "AIエージェント 人事評価シート",
    subtitle: "Claude Code サブエージェント行動分析",
  },
  tableHeaders: {
    dimension: "評価軸",
    score: "スコア",
    distribution: "評価バー",
    observed: "実測値",
  },
  dimensions: {
    task_completion: "タスク完遂力 (Task Completion)",
    instruction_following: "指示遵守力 (Instruction Following)",
    quality: "成果物品質 (Quality)",
    verification: "検証徹底度 (Verification)",
    efficiency: "作業効率性 (Efficiency)",
    critical_thinking: "前提を疑う力 (Critical Thinking)",
  } as Record<DimensionKey, string>,
  sections: {
    overview: "基本情報",
    workStyle: "行動パターン・ワーキングスタイル (Work Pattern)",
    dimensions: "6次元評価スコア",
    strengths: "主な強み (Key Strengths)",
    areasToImprove: "改善が期待される点 (Areas to Improve)",
    interestingBehaviors: "注目すべき行動 (Interesting Behaviors)",
    failurePattern: "失敗の傾向とリカバリー能力 (Failure Pattern)",
    suggestedInterventions: "CLAUDE.md への改善指示 (Suggested Interventions)",
    trend: "過去との成長トレンド",
    evidence: "評価の根拠 (Evidence Checklist)",
    keyTraits: "観測された行動傾向:",
  },
  labels: {
    agent: "対象エージェント",
    overallGrade: "総合評価グレード",
    overallScore: "総合スコア",
    sessions: "分析セッション数",
    events: "総イベント数",
    period: "評価対象期間",
    confidence: "評価信頼度",
    recoveryRate: "エラー自律リカバリー率",
    pattern: "失敗パターン",
    sequence: "典型的な行動フロー",
    insufficientData: "十分なログデータがまだありません。エージェントをさらに稼働させると正確な分析が可能です。",
  },
  workStyles: {
    cautious_builder: {
      label: "The Cautious Builder (慎重な設計・検証型)",
      badge: "🛡️ 慎重な設計・検証型 (The Cautious Builder)",
      summary: "作業前に深く考え、コード調査とテスト・差分確認を徹底する堅実なワークスタイル。",
      traits: [
        "コード修正後は必ずテストを実行し、git diff を確認する徹底ぶり",
        "重要ファイルを編集する前に周辺の依存関係をしっかり調査",
        "シンプルなタスクに対しても調査にステップ数を割く傾向がある",
      ],
    },
    speedrunner: {
      label: "The Speedrunner (高速実装・即応型)",
      badge: "⚡ 高速実装・即応型 (The Speedrunner)",
      summary: "最小限の手数で即座に変更を反映させるスピード重視のワークスタイル。",
      traits: [
        "極めて高い作業効率と最小限のステップ数で完了",
        "前置きなしに直接編集を行い、すばやく成果物を提出",
        "テストやエッジケースの検証をスキップしがちな傾向がある",
      ],
    },
    deep_explorer: {
      label: "The Deep Explorer (深層探索・調査型)",
      badge: "🔍 深層探索・調査型 (The Deep Explorer)",
      summary: "広範なファイルを読み込み、全体構造を把握してから着手する理論派ワークスタイル。",
      traits: [
        "コードの全体設計や過去の履歴を深く読み込む高い文脈把握力",
        "高いクリティカル・シンキングスコアを持ち、前提を疑う",
        "局所的な変更でも選択肢を吟味しすぎてステップ数が増えがち",
      ],
    },
    quality_gatekeeper: {
      label: "The Quality Gatekeeper (厳格品質管理型)",
      badge: "✨ 厳格品質管理型 (The Quality Gatekeeper)",
      summary: "高いコード品質と網羅的なテスト・フォーマットを維持する品質重視のワークスタイル。",
      traits: [
        "意図しない副作用やリント警告を見逃さない徹底した品質意識",
        "テスト実行、diff確認、ビルド検証の多段階チェックを必ず通す",
        "成果物のクオリティが極めて高く、安定感がある",
      ],
    },
    critical_analyst: {
      label: "The Critical Analyst (批判的思考・設計精査型)",
      badge: "🧐 批判的思考・設計精査型 (The Critical Analyst)",
      summary: "指示を鵜呑みにせず、要件の矛盾や設計上のリスクを積極的に指摘・質問する分析型スタイル。",
      traits: [
        "コードを書く前に、矛盾した要件やリスクを先回りして発見",
        "指示された方法より優れたアーキテクチャ代替案を自ら提示",
        "高い洞察力と根拠のある自信を持って意思決定する",
      ],
    },
    autonomous_troubleshooter: {
      label: "The Autonomous Troubleshooter (トラブルシューティング・自律復旧型)",
      badge: "🔧 自律復旧・トラブルシューター (The Autonomous Troubleshooter)",
      summary: "エラーやテスト失敗に直面しても、系統的な原因究明とデバッグで解決する自律復旧スタイル。",
      traits: [
        "テスト失敗からの自律リカバリー率が極めて高い（90%以上）",
        "エラーログから的確に根本原因を特定し、ピンポイントで修正",
        "想定外のツール失敗や未知の挙動にも冷静に対応できる粘り強さ",
      ],
    },
    direct_implementer: {
      label: "The Direct Implementer (直接実行・忠実型)",
      badge: "🫡 直接実行・忠実型 (The Direct Implementer)",
      summary: "ユーザーの指示を一言一句忠実に守り、迷うことなく素早く実行するスタイル。",
      traits: [
        "指示遵守スコアがほぼ満点で、指定されたルールを厳格に守る",
        "ユーザーからの要望に対して迷わず即座に着手",
        "指示自体の矛盾や改善点にはあまり口を挟まない傾向がある",
      ],
    },
    balanced_generalist: {
      label: "The Balanced Generalist (汎用・適応型)",
      badge: "⚖️ 汎用・適応型 (The Balanced Generalist)",
      summary: "作業効率・検証・思考力のバランスが取れた頼れるオールラウンダー。",
      traits: [
        "全6評価軸で偏りなくバランスの取れたスコアを獲得",
        "タスクの難易度や重要度に応じて柔軟にスピードを調整",
        "どんな種類のタスクでも安定してこなせる汎用性の高さ",
      ],
    },
    systematic_architect: {
      label: "The Systematic Architect (体系的アーキテクト型)",
      badge: "🏛️ 体系的アーキテクト型 (The Systematic Architect)",
      summary: "モジュール境界、明確なインターフェース契約、グローバルな設計整合性を最優先する構造重視スタイル。",
      traits: [
        "型定義や依存関係グラフを注意深く照合してから着手",
        "新機能がドメインの不変条件を破壊していないか検証",
        "場当たり的なパッチよりも構造的なリファクタリングを好む",
      ],
    },
    minimalist_patcher: {
      label: "The Minimalist Patcher (最小限差分パッチ型)",
      badge: "🎯 最小限差分パッチ型 (The Minimalist Patcher)",
      summary: "不要なコード変更を一切行わず、極限まで最小の diff 差分で問題を外科手術的に解決するスタイル。",
      traits: [
        "不要なリフォーマットや無関係なファイル編集を厳格に排除",
        "ピンポイントなシンボル検索で最短距離の修正を実現",
        "変更による影響範囲（ブラスト・ラディウス）を最小化",
      ],
    },
    rigorous_verifier: {
      label: "The Rigorous Verifier (仕様適合・厳密検証型)",
      badge: "🔬 仕様適合・厳密検証型 (The Rigorous Verifier)",
      summary: "ソースコードを直接汚さず、大量のテスト実行と仕様アサーションで正当性を保証する検証専任スタイル。",
      traits: [
        "膨大なコマンド実行・テストスイート実行回数を誇る",
        "境界値、null可能性、戻り値の型不整合を徹底検証",
        "ソースコードを一切変更せずクリーンな状態を保つ",
      ],
    },
    pragmatic_shipper: {
      label: "The Pragmatic Shipper (実用主義・早期デプロイ型)",
      badge: "🚀 実用主義・早期デプロイ型 (The Pragmatic Shipper)",
      summary: "机上の完全性よりも、実際に動作するエンドツーエンドの価値提供を素早く達成する実践派スタイル。",
      traits: [
        "正常系シナリオの動作確認を最優先で素早く完了",
        "迷いや躊躇が少なく、高い作業モメンタムを維持",
        "ユーザーに見える成果物の完成度を何よりも重視",
      ],
    },
    defensive_gardener: {
      label: "The Defensive Gardener (防御的コード保守型)",
      badge: "🌿 防御的コード保守型 (The Defensive Gardener)",
      summary: "既存コードの壊れやすさに細心の注意を払い、中間 diff 確認と安全ネットを張り巡らせる保守派スタイル。",
      traits: [
        "作業途中でこまめに git diff / status を確認する慎重さ",
        "既存のエンドポイントや関数の後方互換性を厳重に維持",
        "壊れやすいエッジケースに防御的アサーションを追加",
      ],
    },
    iterative_prototyper: {
      label: "The Iterative Prototyper (反復プロトタイプ型)",
      badge: "🔄 反復プロトタイプ型 (The Iterative Prototyper)",
      summary: "頭の中で悩み続ける代わりに、小さな動作コードを素早く試行しながら最適解へ収束させるアジャイル型スタイル。",
      traits: [
        "高いコマンド実行頻度で実行時ログから動的に学習",
        "新たな発見に応じて柔軟に実装方針をアップデート",
        "理論よりも実際のランタイム挙動を根拠に前進",
      ],
    },
    proactive_optimizer: {
      label: "The Proactive Optimizer (先行最適化・効率追求型)",
      badge: "📈 先行最適化・効率追求型 (The Proactive Optimizer)",
      summary: "冗長なクエリ、重複ファイル閲覧、無駄なツール呼び出しを徹底的に排除する効率至上主義スタイル。",
      traits: [
        "重複した同一ツール呼び出しや無駄な再読み込みがほぼゼロ",
        "ピンポイントなシンボル指定で最小ステップ数を叩き出す",
        "常にトップクラスの作業効率性スコアを獲得",
      ],
    },
    thorough_auditor: {
      label: "The Thorough Auditor (網羅的セキュリティ・監査型)",
      badge: "📋 網羅的セキュリティ・監査型 (The Thorough Auditor)",
      summary: "権限境界、セキュリティ上の影響、エッジケースの契約違反をくまなくスキャンする監査型スタイル。",
      traits: [
        "サンドボックスや認可制約の境界を極めて厳格に遵守",
        "境界条件やエラーハンドラーの漏れを体系的に洗い出す",
        "詳細なエビデンスと根拠を添えて分析レポートを提示",
      ],
    },
  } as Record<WorkStyleId, { label: string; badge: string; summary: string; traits: string[] }>,
  failurePatterns: {
    flawless: {
      name: "エラーゼロの模範飛行 (The Flawless Driver)",
      description: "観測期間中にブロッキングエラーや失敗を一度も出さず、完璧に完遂しました。",
    },
    resilient: {
      name: "不屈のデバッガー (The Resilient Debugger)",
      description: "初期テストでエラーに遭遇しても、エラーログを分析して系統的に自律解決しました。",
    },
    overconfident: {
      name: "即時反映ジャンプ (The Overconfident Leap)",
      description: "修正が正しいと思い込み、テスト実行や差分確認をスキップして完了報告してしまいます。",
    },
    looper: {
      name: "試行錯誤ループ (The Looper)",
      description: "根本原因を特定する前に類似のツール呼び出しを何度も繰り返す傾向があります。",
    },
    verification_specialist: {
      name: "検証専門型 (The Verification Specialist)",
      description: "ソースツリーを一切変更せず、仕様との照合と検証に徹して所見を報告します。",
    },
    hesitant: {
      name: "慎重調査型 (The Hesitant Investigator)",
      description: "実際の修正に着手する前に、周辺コードの閲覧に多くのターンを費やしがちです。",
    },
  },
  evidence: {
    completed_sessions: (n: number) => `全 ${n} セッションがクリーンな結果で終了`,
    stalled_sessions: (n: number, total: number) =>
      `${total} セッション中 ${n} 件がツール呼び出しの失敗を残したまま終了`,
    protocol_violations: (n: number, total: number) =>
      `${total} 件のツール呼び出しのうち ${n} 件が誤用・ブロックにより拒否`,
    resolved_errors: "発生したエラーを自律的にすべて解決",
    unresolved_errors: "未解決のツール実行エラーが残存",
    authorized_tools: "許可されたツールの範囲内で適切に動作",
    permission_violation: "サンドボックスや権限境界の違反が発生",
    sandbox_respected: "ワークスペースのサンドボックス境界を遵守",
    clean_modifications: "クリーンで整ったファイル修正を実施",
    zero_errors: "実行中に構文エラーやランタイムエラーが一切なし",
    recovered_errors: (n: number) => `${n}件のテスト失敗からスムーズに自律リカバリー`,
    repetitive_failures: "同一ツールのエラー試行ループが発生",
    ran_tests: (n: number) => `コード修正後にテストスイートを${n}回実行`,
    skipped_tests: "コードを修正したにもかかわらずテストスイートを実行しなかった",
    checked_diff: "完了前に git diff またはリポジトリ状態を確認",
    no_diff_check: "明示的な git diff の差分確認を行わなかった",
    read_only_task: "読み取り専用タスクを未検証状態を残さず完遂",
    redundant_calls: (n: number) => `全く同一のツール呼び出しを${n}回反復`,
    minimal_redundancy: "重複したクエリや無駄なファイル再読み込みが最小限",
    error_loop: "解決策を見つける前にエラーの反復ループが発生",
    smooth_steps: "ステップ間のオーバーヘッドが少なくスムーズに進行",
    questioned_premises: (n: number) => `前提への質問や代替案の提案を実施（${n}件）`,
    accepted_prompt: "エッジケースや矛盾を検証せずプロンプトをそのまま受け入れた",
    investigated_codebase: "実装前に既存コードベースの構造や設計パターンを調査",
  },
};
