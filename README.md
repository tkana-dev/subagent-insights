# Subagent Insights 🔍

**Understand how your AI subagents actually work.**

[![npm](https://img.shields.io/npm/v/subagent-insights.svg)](https://www.npmjs.com/package/subagent-insights)
[![CI](https://github.com/tkana-dev/subagent-insights/actions/workflows/ci.yml/badge.svg)](https://github.com/tkana-dev/subagent-insights/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Review your Claude Code subagents from the transcripts they already leave behind: how they actually work, where they fall down, and one concrete rule to put in `CLAUDE.md`. Deterministic, no LLM involved.

<p align="center">
  <img src="https://raw.githubusercontent.com/tkana-dev/subagent-insights/main/assets/demo.gif" alt="Subagent Insights running against a sample transcript" width="820">
</p>

> 🔒 **100% Local, Offline & Zero API Cost**: Subagent Insights runs purely on deterministic heuristics directly against your local transcripts. No API keys, no LLM calls, no network telemetry, and no private code leakage.

---

## ✨ Features

- **🔍 Automatic Log Discovery**: Scans `~/.claude/projects/` and groups every subagent transcript by agent — built-ins like `general-purpose`, `Explore` and `Plan`, plus any custom agents you have defined. No configuration.
- **📊 6-Dimension Engineering Metrics**: Evaluates Task Completion, Instruction Following, Quality, Verification, Efficiency, and Critical Thinking.
- **🎭 16 Work Style Archetypes**: Classifies each subagent from its observed behaviour — read/write balance, test-to-edit ratio, recovery rate, how often it pushes back.
- **⚠️ Failure Mode & Recovery Analysis**: Uncovers looping behaviors, hesitation, and tracks autonomous error recovery rates.
- **🚀 CLAUDE.md Rule Suggestions**: Picks the single highest-priority rule for the weakest observed area, with the rationale quoting your actual numbers.
- **🔒 Shareable Without Leaking**: Share output is plain text carrying scores, observed rates and your agent's name — no transcript content, file paths or repository names.
- **🌐 Bilingual CLI & Export**: Full English and Japanese support with terminal and Markdown reports.

---

## 🚀 Quick Start

Run directly via `npx` (no installation or API key required):

```bash
# Evaluate recent subagents across all local projects
npx subagent-insights

# Try with built-in sample demo data
npx subagent-insights --demo

# Japanese output
npx subagent-insights --lang ja

# Target a specific subagent
npx subagent-insights --agent implementer --lang ja

# Export evaluation as Markdown report
npx subagent-insights --markdown > agent-review.md
```

---

## 🎭 16 Work Style Archetypes

| Archetype | Key Engineering Characteristic |
| :--- | :--- |
| **🛡️ The Cautious Builder** | Thinks deeply before acting, strong verification habits, double-checks diffs. |
| **⚡ The Speedrunner** | Blazing fast execution with minimal tool hops; edits code directly. |
| **🔍 The Deep Explorer** | Reads extensive files & explores architectural branches before touching code. |
| **✨ The Quality Gatekeeper** | Rigorous multi-stage verification (tests, diff, assertions) and clean outputs. |
| **🧐 The Critical Analyst** | Questions ambiguous requirements and proposes alternative patterns. |
| **🔧 The Autonomous Troubleshooter** | High recovery rate from test failures; relentless debugging instinct. |
| **🫡 The Direct Implementer** | Strictly executes user instructions to the letter without hesitation. |
| **⚖️ The Balanced Generalist** | Balanced generalist adapting to task complexity. |
| **🏛️ The Systematic Architect** | Emphasizes modular boundaries, clear interface contracts, and domain invariants. |
| **🎯 The Minimalist Patcher** | Localized, surgical edits with the absolute smallest diff footprint. |
| **🔬 The Rigorous Verifier** | Dedicated verification specialist running comprehensive assertions without edits. |
| **🚀 The Pragmatic Shipper** | Prioritizes rapid end-to-end working functionality over theoretical perfection. |
| **🌿 The Defensive Gardener** | Adds safety nets, intermediate diff checks, and preserves backwards compatibility. |
| **🔄 The Iterative Prototyper** | Discovers optimal solutions through rapid spikes, trial-and-error, and telemetry. |
| **📈 The Proactive Optimizer** | Relentlessly eliminates redundant queries and duplicate tool executions. |
| **📋 The Thorough Auditor** | Scrutinizes sandbox constraints, security boundaries, and edge-case contracts. |

---

## 📢 Sharing a Report

```bash
# A block ready to paste into Discord (renders as an aligned table there)
npx subagent-insights share

# The X (Twitter) intent link instead
npx subagent-insights share --x
```

Shared output carries **scores, observed rates and the agent's name** — never transcript text, file paths or repository names. The same holds for the terminal and Markdown reports.

> Note: the agent name comes from your own configuration. If you have named a subagent after a client or an internal project, that name travels with the report — rename it or edit the text before posting.

---

## 📐 How Scoring Works

Scores come from a **fixed, published rubric applied to observed rates** — not from ranking you against other users. Nothing is uploaded, so there is no population to rank against, and a grade here is not a percentile.

Every dimension therefore reports the raw rate it was derived from, and **that rate is the number worth comparing** when two people put their reports side by side:

| Dimension | Observed rate | Scored on |
| :--- | :--- | :--- |
| Task Completion | sessions that ended while a tool call was still failing | stall rate + unrecovered failures |
| Instruction Following | tool calls rejected for misuse or a blocked action | rejection rate |
| Quality | failing calls and how many were recovered | recovery rate |
| Verification | test runs per edit | test-to-edit ratio |
| Efficiency | repeated calls and steps per session | redundancy rate |
| Critical Thinking | clarifying questions per session | question rate |

A failing test suite counts as **work failing, not the agent disobeying** — only tool misuse, protocol violations (`File has not been read yet`), hook rejections and permission denials count against Instruction Following.

> ⚠️ The thresholds were calibrated on a single user's transcripts. They are a reasonable starting rubric, not a validated benchmark. Compare the observed rates rather than the letter grades.

---

## 📄 License

MIT License. Contributions and feedback are welcome!
