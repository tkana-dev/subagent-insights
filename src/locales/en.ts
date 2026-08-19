import type { DimensionKey, WorkStyleId } from "../types/index.js";

export const EN_LOCALE = {
  header: {
    title: "AGENT PERFORMANCE REVIEW",
    subtitle: "Subagent Insights for Claude Code",
  },
  tableHeaders: {
    dimension: "Dimension",
    score: "Score",
    distribution: "Distribution",
    observed: "Observed Rate",
  },
  dimensions: {
    task_completion: "Task Completion",
    instruction_following: "Instruction Following",
    quality: "Quality",
    verification: "Verification",
    efficiency: "Efficiency",
    critical_thinking: "Critical Thinking",
  } as Record<DimensionKey, string>,
  sections: {
    overview: "Overview",
    workStyle: "Observed Work Pattern",
    dimensions: "Performance Dimensions",
    strengths: "Key Strengths",
    areasToImprove: "Areas to Improve",
    interestingBehaviors: "Interesting Behaviors",
    failurePattern: "Failure Pattern & Recovery",
    suggestedInterventions: "Suggested Interventions for CLAUDE.md",
    trend: "Historical Trend",
    evidence: "Evidence Checklist",
    keyTraits: "Observed Behavioral Traits:",
  },
  labels: {
    agent: "Agent",
    overallGrade: "Overall Grade",
    overallScore: "Overall Score",
    sessions: "Sessions Analyzed",
    events: "Total Events",
    period: "Evaluation Period",
    confidence: "Confidence",
    recoveryRate: "Recovery Rate",
    pattern: "Pattern",
    sequence: "Sequence",
    insufficientData: "Not enough evidence for a reliable assessment yet. Run more tasks to generate insights.",
  },
  workStyles: {
    cautious_builder: {
      label: "The Cautious Builder",
      badge: "🛡️ The Cautious Builder",
      summary: "Thinks deeply before acting, conducts thorough investigations, and has strong verification habits.",
      traits: [
        "Always runs tests and checks diffs after code modifications",
        "Investigates thoroughly before touching critical files",
        "May spend extra steps over-exploring simple tasks",
      ],
    },
    speedrunner: {
      label: "The Speedrunner",
      badge: "⚡ The Speedrunner",
      summary: "Blazing fast execution with minimal tool hops. Gets changes out immediately.",
      traits: [
        "Extremely high efficiency and low step counts",
        "Executes direct edits with minimal preamble",
        "Occasionally skips verification steps or edge-case testing",
      ],
    },
    deep_explorer: {
      label: "The Deep Explorer",
      badge: "🔍 The Deep Explorer",
      summary: "Explores wide branches of possibility and reads extensive files before deciding on an approach.",
      traits: [
        "Deeply analyzes code architecture and historical commits",
        "High critical thinking score and broad context awareness",
        "Can spend excessive turns on straightforward tasks",
      ],
    },
    quality_gatekeeper: {
      label: "The Quality Gatekeeper",
      badge: "✨ The Quality Gatekeeper",
      summary: "Maintains high code quality, consistent formatting, and exhaustive multi-stage verification.",
      traits: [
        "Zero tolerance for untracked side-effects or lint warnings",
        "Rigorous verification across tests, diffs, and assertions",
        "High quality score with polished outputs",
      ],
    },
    critical_analyst: {
      label: "The Critical Analyst",
      badge: "🧐 The Critical Analyst",
      summary: "Never blindly follows prompts. Actively questions assumptions and verifies requirements against reality.",
      traits: [
        "Identifies contradictory requirements before writing code",
        "Proposes alternative architectural approaches when appropriate",
        "Strong critical thinking with high confidence",
      ],
    },
    autonomous_troubleshooter: {
      label: "The Autonomous Troubleshooter",
      badge: "🔧 The Autonomous Troubleshooter",
      summary: "Relentless when facing errors and broken tests. Excellent recovery and debugging instincts.",
      traits: [
        "Exceptional error recovery rate (>90% on failing tests)",
        "Pinpoints root causes through systematic diagnostic logging",
        "Resilient when confronted with unexpected tool failures",
      ],
    },
    direct_implementer: {
      label: "The Direct Implementer",
      badge: "🫡 The Direct Implementer",
      summary: "Faithfully follows instructions down to the letter without questioning user premises.",
      traits: [
        "Near-perfect instruction following scores",
        "Executes user commands without hesitation",
        "Rarely challenges flawed requirements or offers alternatives",
      ],
    },
    balanced_generalist: {
      label: "The Balanced Generalist",
      badge: "⚖️ The Balanced Generalist",
      summary: "Well-rounded performance across efficiency, verification, and critical thinking.",
      traits: [
        "Balanced score distribution across all 6 dimensions",
        "Adapts execution speed based on task complexity",
        "Dependable generalist agent",
      ],
    },
    systematic_architect: {
      label: "The Systematic Architect",
      badge: "🏛️ The Systematic Architect",
      summary: "Emphasizes modular boundaries, clear interface contracts, and global architectural consistency.",
      traits: [
        "Carefully inspects type definitions and dependency graphs",
        "Ensures new features adhere to domain invariants",
        "Prefers structured refactoring over quick tactical patches",
      ],
    },
    minimalist_patcher: {
      label: "The Minimalist Patcher",
      badge: "🎯 The Minimalist Patcher",
      summary: "Specializes in localized, surgical edits with the absolute smallest diff footprint.",
      traits: [
        "Zero unnecessary file modifications or cosmetic rewrites",
        "Highly targeted grep and file navigation",
        "Minimizes blast radius of changes",
      ],
    },
    rigorous_verifier: {
      label: "The Rigorous Verifier",
      badge: "🔬 The Rigorous Verifier",
      summary: "Dedicated verification specialist running comprehensive assertions and test suites without modifying code.",
      traits: [
        "Extensive command and test execution volume",
        "Validates edge-cases, nullability, and return types",
        "Leaves source tree completely clean and untouched",
      ],
    },
    pragmatic_shipper: {
      label: "The Pragmatic Shipper",
      badge: "🚀 The Pragmatic Shipper",
      summary: "Prioritizes delivering working end-to-end functionality rapidly over theoretical perfection.",
      traits: [
        "Quickly verifies working happy path",
        "High momentum with low hesitation",
        "Focuses on user-facing deliverables first",
      ],
    },
    defensive_gardener: {
      label: "The Defensive Gardener",
      badge: "🌿 The Defensive Gardener",
      summary: "Treats existing codebase with utmost care, adding safety nets and guarding against legacy pitfalls.",
      traits: [
        "Frequently checks git diff and status during intermediate steps",
        "Validates backwards compatibility on existing endpoints",
        "Adds defensive checks around fragile logic",
      ],
    },
    iterative_prototyper: {
      label: "The Iterative Prototyper",
      badge: "🔄 The Iterative Prototyper",
      summary: "Discovers the optimal solution through rapid trial-and-error, quick spikes, and iterative adjustments.",
      traits: [
        "High test and command execution cadence",
        "Learns from intermediate runtime outputs dynamically",
        "Adapts implementation approach as new findings emerge",
      ],
    },
    proactive_optimizer: {
      label: "The Proactive Optimizer",
      badge: "📈 The Proactive Optimizer",
      summary: "Relentlessly cuts redundant queries, duplicate file reads, and unnecessary tool calls.",
      traits: [
        "Near-zero duplicate or redundant tool executions",
        "Pinpoint symbol navigation with maximum step economy",
        "Consistently achieves top-tier efficiency scores",
      ],
    },
    thorough_auditor: {
      label: "The Thorough Auditor",
      badge: "📋 The Thorough Auditor",
      summary: "Scrutinizes permission bounds, security implications, and edge-case contracts across modules.",
      traits: [
        "Strict adherence to sandbox and authorization constraints",
        "Validates boundary conditions and error handlers",
        "Documents detailed audit findings with evidence",
      ],
    },
  } as Record<WorkStyleId, { label: string; badge: string; summary: string; traits: string[] }>,
  failurePatterns: {
    flawless: {
      name: "The Flawless Driver",
      description: "Encountered zero blocking errors or failing tool calls during observed period.",
    },
    resilient: {
      name: "The Resilient Debugger",
      description: "Frequently encounters initial test failures but systematically diagnoses and fixes them.",
    },
    overconfident: {
      name: "The Overconfident Leap",
      description: "Assumes implementation is correct and concludes task without validating against test suites.",
    },
    looper: {
      name: "The Looper",
      description: "Gets caught in repeated trial-and-error cycles before stepping back.",
    },
    verification_specialist: {
      name: "The Verification Specialist",
      description: "Inspects and validates without touching the source tree, reporting findings instead of applying fixes.",
    },
    hesitant: {
      name: "The Hesitant Investigator",
      description: "Spends excessive turns inspecting surrounding code before attempting the actual modification.",
    },
  },
  evidence: {
    completed_sessions: (n: number) => `All ${n} recorded session(s) ended on a clean result`,
    stalled_sessions: (n: number, total: number) =>
      `${n} of ${total} session(s) ended while a tool call was still failing`,
    protocol_violations: (n: number, total: number) =>
      `${n} of ${total} tool call(s) were rejected for misuse or a blocked action`,
    resolved_errors: "Successfully resolved intermediate errors",
    unresolved_errors: "Left unresolved tool execution failures",
    authorized_tools: "Stayed strictly within authorized tool capabilities",
    permission_violation: "Encountered permission boundary violations",
    sandbox_respected: "Respected workspace sandbox boundaries",
    clean_modifications: "Produced clean, structured file modifications",
    zero_errors: "Zero runtime or syntax errors during execution",
    recovered_errors: (n: number) => `Recovered smoothly from ${n} test failure(s)`,
    repetitive_failures: "Suffered repetitive tool failure loops",
    ran_tests: (n: number) => `Ran test suites ${n} time(s) after code changes`,
    skipped_tests: "Modified code without executing relevant test suite",
    checked_diff: "Inspected git diff / repository status before completion",
    no_diff_check: "Did not run explicit git diff verification",
    read_only_task: "Read-only inspection task completed without unverified state",
    redundant_calls: (n: number) => `Repeated identical tool calls ${n} times`,
    minimal_redundancy: "Minimal redundant queries or duplicate file reads",
    error_loop: "Got stuck in error loop before finding solution",
    smooth_steps: "Smooth step progression with low hop overhead",
    questioned_premises: (n: number) => `Questioned premises or proposed alternatives (${n} instance(s))`,
    accepted_prompt: "Accepted user prompt directly without questioning edge-cases",
    investigated_codebase: "Investigated existing codebase patterns prior to implementation",
  },
};
