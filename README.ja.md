# Subagent Insights 🔍

**AI サブエージェントの「実際の働き方」を可視化する。**

[![npm](https://img.shields.io/npm/v/subagent-insights.svg)](https://www.npmjs.com/package/subagent-insights)
[![CI](https://github.com/tkana-dev/subagent-insights/actions/workflows/ci.yml/badge.svg)](https://github.com/tkana-dev/subagent-insights/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Claude Code のサブエージェント（ビルトイン・自作を問わず）が残した実行ログを解析し、行動パターン・強み・弱み・失敗傾向を診断。さらに `CLAUDE.md` や `.claude/agents/*.md` に追加できる改善ルールを 1 件提案します。LLM を使わない確定的な解析です。

<p align="center">
  <img src="https://raw.githubusercontent.com/tkana-dev/subagent-insights/main/assets/demo.gif" alt="Subagent Insights running against a sample transcript" width="820">
</p>

> 🔒 **完全ローカル・オフライン・APIコストゼロ**: Subagent Insights はローカルの実行ログに対する確定的なルールベース（ヒューリスティクス）解析で動作します。APIキー不要、外部へのLLM通信なし。ネットワーク通信を一切行わないため、ログ本文や社内コードが外部に送信されることはありません。

---

## ✨ 主な機能

- **🔍 自動ログ探索**: `~/.claude/projects/` を探索し、サブエージェントのログをエージェント単位に集約。ビルトイン（`general-purpose` / `Explore` / `Plan` など）も自作エージェントも設定不要で対象になります。
- **📊 6次元エンジニアリング評価**: タスク完遂力・指示遵守力・成果物品質・検証徹底度・作業効率性・前提を疑う力（Critical Thinking）を算出。
- **🎭 16種類のワークスタイル**: 観測された行動（編集比率・テスト比率・閲覧深度・リカバリー率・指示への反問頻度）だけを根拠に 16 パターンへ分類します。
- **⚠️ 失敗傾向と自律復旧率**: 試行錯誤ループや過剰探索などの失敗パターンを検知し、自律的なエラー復旧率を算出。
- **🚀 ルールベースの CLAUDE.md 最適化**: ボトルネックとなった行動データから、即効性のある改善ルールを 1 件厳選して抽出。
- **🔒 共有時に中身が漏れない**: 共有出力に含まれるのはスコア・実測値・エージェント名のみ。ログ本文・ファイルパス・リポジトリ名は含まれません。
- **🌐 完全日英バイリンガル対応**: ターミナルでの直感的な表示および Markdown レポート出力に対応。

---

## 🚀 クイックスタート

インストールや API キー設定不要で、`npx` から直接実行可能です：

```bash
# 全プロジェクトのサブエージェントを一括レビュー
npx subagent-insights

# サンプルデータでデモ実行
npx subagent-insights --demo

# 日本語出力
npx subagent-insights --lang ja

# 特定のエージェントのみを診断
npx subagent-insights --agent implementer --lang ja

# Markdown レポートとして出力
npx subagent-insights --markdown --lang ja > agent-review.md
```

---

## 🎭 16 種類のワークスタイル一覧

| タイプ | 行動特徴 |
| :--- | :--- |
| **🛡️ 慎重な設計・検証型 (The Cautious Builder)** | 作業前に深く考え、コード調査とテスト・差分確認を徹底する堅実派。 |
| **⚡ 高速実装・即応型 (The Speedrunner)** | 最小限の手数で即座に変更を反映させるスピード重視派。 |
| **🔍 深層探索・調査型 (The Deep Explorer)** | 広範なファイルを読み込み、全体構造を把握してから着手する理論派。 |
| **✨ 厳格品質管理型 (The Quality Gatekeeper)** | テスト実行・diff確認の多段階チェックを必ず通す品質重視派。 |
| **🧐 批判的思考・設計精査型 (The Critical Analyst)** | 指示を鵜呑みにせず、要件の矛盾やリスクを積極的に指摘・質問する。 |
| **🔧 自律復旧・トラブルシューター (The Autonomous Troubleshooter)** | テスト失敗からの自律リカバリー率が高く、デバッグに強い。 |
| **🫡 直接実行・忠実型 (The Direct Implementer)** | ユーザーの指示に忠実に従い、指示通りに素早く実行する。 |
| **⚖️ 汎用・適応型 (The Balanced Generalist)** | タスクの難易度に応じてバランスよく立ち回るオールラウンダー。 |
| **🏛️ 体系的アーキテクト型 (The Systematic Architect)** | モジュール境界、明確なインターフェース契約、全体整合性を重視。 |
| **🎯 最小限差分パッチ型 (The Minimalist Patcher)** | 不要なコード変更を排除し、極小の diff 差分で外科手術的に解決。 |
| **🔬 仕様適合・厳密検証型 (The Rigorous Verifier)** | コードを変更せず、大量のテストとアサーションで正当性を保証。 |
| **🚀 実用主義・早期デプロイ型 (The Pragmatic Shipper)** | 机上の完全性より、実際に動く価値提供を素早く達成する実践派。 |
| **🌿 防御的コード保守型 (The Defensive Gardener)** | 既存コードの壊れやすさに配慮し、中間 diff 確認と安全ネットを維持。 |
| **🔄 反復プロトタイプ型 (The Iterative Prototyper)** | 小さな動作コードを素早く試行しながら最適解へ収束させる。 |
| **📈 先行最適化・効率追求型 (The Proactive Optimizer)** | 冗長なクエリや重複ファイル閲覧を徹底排除する効率至上主義。 |
| **📋 網羅的セキュリティ・監査型 (The Thorough Auditor)** | 権限境界、セキュリティ上の影響、エッジケース契約をスキャン。 |


---

## 🖼 シェアカード

```bash
npx subagent-insights card          # SVG（追加依存なし・どこでも動く）
npx subagent-insights card --png    # PNG（画像として投稿する用）
```

<p align="center">
  <img src="https://raw.githubusercontent.com/tkana-dev/subagent-insights/main/assets/card-example.png" alt="シェアカードの例" width="620">
</p>

PNG は optional 依存の `@resvg/resvg-js` を使います。お使いの環境に入っていない場合は SVG を書き出して理由を表示します。CLI 本体がこの依存で壊れることはありません。

---

## 📢 レポートの共有

```bash
# Discord にそのまま貼れるブロックを出力（Discord 側で整形されて表示されます）
npx subagent-insights share

# X (Twitter) の投稿リンクを出力
npx subagent-insights share --x
```

共有される内容は**スコア・実測値・エージェント名**です。ログ本文・ファイルパス・リポジトリ名は含まれません（端末出力・Markdown 出力も同様）。

> 注意: エージェント名はあなた自身の設定に由来します。顧客名や社内プロジェクト名をサブエージェント名に使っている場合、その名前はレポートに載ります。名前を変えるか、投稿前に文面を編集してください。

---

## 📐 採点の仕組み

スコアは**実測された比率に、固定の公開ルーブリックを当てたもの**です。他ユーザーとの相対順位ではありません。データは一切アップロードされないため比較対象の母集団が存在せず、**グレードは偏差値ではありません**。

そのため各次元は、点数の根拠になった生の比率を必ず併記します。2人がレポートを並べたとき、**比較する価値があるのはこの比率のほう**です。

| 次元 | 実測値 | 採点の根拠 |
| :--- | :--- | :--- |
| タスク完遂力 | ツール失敗を残したまま終わったセッション数 | 停止率 + 未回復エラー率 |
| 指示遵守 | 誤用・ブロックで拒否されたツール呼び出し | 拒否率 |
| 品質 | 失敗した呼び出しと自力回復した数 | 回復率 |
| 検証徹底度 | 編集1件あたりのテスト実行回数 | テスト/編集比 |
| 作業効率性 | 重複呼び出しとセッションあたりステップ数 | 冗長率 |
| 批判的思考 | セッションあたりの確認・代替案提示 | 質問率 |

テストが赤いことは**作業の失敗であって不服従ではない**ため、指示遵守には数えません。ツール誤用・プロトコル違反(`File has not been read yet`)・フックによる拒否・権限拒否のみを対象とします。

> ⚠️ 閾値は単一ユーザーのトランスクリプトで較正したものです。妥当な出発点ではありますが、検証済みのベンチマークではありません。**グレードよりも実測値を比較してください**。

---

## 📄 ライセンス

MIT License
