import type { DimensionKey, DimensionScore, WorkStyle, WorkStyleId } from "../types/index.js";

export const WORK_STYLES_CATALOG: Record<WorkStyleId, Omit<WorkStyle, "id">> = {
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
};

/**
 * Universal Behavioral Fingerprint calculated strictly from observable events.
 */
export interface BehavioralFingerprint {
  totalToolCalls: number;
  writeCount: number;
  viewCount: number;
  testCount: number;
  diffCheckCount: number;
  errorCount: number;
  recoveredErrorCount: number;
  questionCount: number;
  avgStepsPerSession: number;
  // Derived Ratios
  writeRatio: number;
  readToWriteRatio: number;
  testToWriteRatio: number;
  recoveryRate: number;
  questionRate: number;
}

/**
 * Classify work style into 16 distinct engineering patterns using the Universal Behavioral Fingerprint.
 */
export function determineWorkStyle(
  scores: Record<DimensionKey, DimensionScore>,
  fingerprint: BehavioralFingerprint
): WorkStyle {
  const ver = scores.verification.score;
  const eff = scores.efficiency.score;
  const crit = scores.critical_thinking.score;
  const qual = scores.quality.score;
  const inst = scores.instruction_following.score;

  let chosenId: WorkStyleId = "balanced_generalist";

  const isPureInspection = fingerprint.writeCount === 0 && (fingerprint.viewCount > 0 || fingerprint.testCount > 0);
  const isHeavyWriter = fingerprint.writeRatio > 0.35 || fingerprint.writeCount > 8;
  const isHeavyResearcher = fingerprint.readToWriteRatio > 8.0 || (fingerprint.viewCount > 15 && fingerprint.writeCount <= 2);
  const isQuestioner = fingerprint.questionCount >= 3 || fingerprint.questionRate >= 0.4;
  const isDiffChecker = fingerprint.diffCheckCount >= 2;

  // 1. Troubleshooter & Recovery Specialists
  if (fingerprint.errorCount >= 2 && fingerprint.recoveryRate >= 0.8) {
    if (fingerprint.testCount >= 3) {
      chosenId = "iterative_prototyper";
    } else {
      chosenId = "autonomous_troubleshooter";
    }
  }
  // 2. Pure Inspection & Validation Specialists (Zero writes)
  else if (isPureInspection) {
    if (fingerprint.testCount >= 5) {
      chosenId = "rigorous_verifier";
    } else if (isQuestioner || crit >= 85) {
      chosenId = "critical_analyst";
    } else if (inst >= 90 && ver >= 90) {
      chosenId = "thorough_auditor";
    } else {
      chosenId = "quality_gatekeeper";
    }
  }
  // 3. Deep Research & Architecture Exploration
  else if (isHeavyResearcher) {
    if (isQuestioner || crit >= 82) {
      chosenId = "critical_analyst";
    } else if (qual >= 92 && inst >= 90) {
      chosenId = "systematic_architect";
    } else {
      chosenId = "deep_explorer";
    }
  }
  // 4. Code Implementation Specialists
  else if (isHeavyWriter) {
    // "Cautious" has to be earned. This branch used to fall through to
    // cautious_builder, so an agent that never ran a test and never checked a
    // diff could still be labelled The Cautious Builder.
    const verifies = fingerprint.testToWriteRatio >= 0.45 || isDiffChecker;

    if (isDiffChecker && ver >= 85) {
      chosenId = "defensive_gardener";
    } else if (verifies && qual >= 90) {
      chosenId = "quality_gatekeeper";
    } else if (verifies) {
      chosenId = "cautious_builder";
    } else if (fingerprint.writeCount <= 3 && eff >= 85) {
      chosenId = "minimalist_patcher";
    } else if (qual >= 85) {
      chosenId = "pragmatic_shipper";
    } else {
      chosenId = "speedrunner";
    }
  }
  // 5. Efficiency & Optimization Specialists
  else if (eff >= 92 && fingerprint.totalToolCalls <= 12) {
    chosenId = "proactive_optimizer";
  }
  // 6. Direct Compliers & Generalists
  else if (isQuestioner && crit >= 80) {
    chosenId = "critical_analyst";
  } else if (inst >= 92 && crit <= 70 && !isQuestioner) {
    // critical_thinking bottoms out at exactly 70 (base 75, minus 5 for asking
    // nothing), so the old `crit < 70` could never fire and this archetype was
    // dead. The intent is "follows instructions, never pushes back".
    chosenId = "direct_implementer";
  } else {
    chosenId = "balanced_generalist";
  }

  const catalogEntry = WORK_STYLES_CATALOG[chosenId];
  return {
    id: chosenId,
    label: catalogEntry.label,
    badge: catalogEntry.badge,
    summary: catalogEntry.summary,
    traits: catalogEntry.traits,
  };
}
