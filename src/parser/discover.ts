import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { SubagentSession } from "../types/index.js";
import { ClaudeTranscriptNormalizer } from "./claude-normalizer.js";

export interface DiscoverOptions {
  periodDays?: number;
  agentFilter?: string;
  explicitPath?: string;
  limit?: number;
}

export class TranscriptDiscoverer {
  private normalizer = new ClaudeTranscriptNormalizer();

  /**
   * Search and load all matching subagent sessions from the system.
   */
  public async discoverSessions(options: DiscoverOptions = {}): Promise<SubagentSession[]> {
    const candidateFiles: string[] = [];

    if (options.explicitPath) {
      if (fs.existsSync(options.explicitPath)) {
        const stat = fs.statSync(options.explicitPath);
        if (stat.isDirectory()) {
          this.collectSubagentFiles(options.explicitPath, candidateFiles, true);
        } else if (options.explicitPath.endsWith(".jsonl")) {
          candidateFiles.push(options.explicitPath);
        }
      }
    } else {
      // Look strictly for subagent logs in ~/.claude and ./.claude
      const homeDir = os.homedir();
      const searchDirs = [
        path.join(homeDir, ".claude", "projects"),
        path.join(process.cwd(), ".claude", "projects"),
      ];

      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          this.collectSubagentFiles(dir, candidateFiles, false);
        }
      }
    }

    if (candidateFiles.length === 0) {
      return [];
    }

    // Filter by modified time if periodDays is provided
    let filteredFiles = candidateFiles;
    if (options.periodDays && options.periodDays > 0) {
      const cutoffTime = Date.now() - options.periodDays * 24 * 60 * 60 * 1000;
      filteredFiles = candidateFiles.filter((filePath) => {
        try {
          const stat = fs.statSync(filePath);
          return stat.mtimeMs >= cutoffTime;
        } catch {
          return false;
        }
      });
    }

    // Sort by recent first
    filteredFiles.sort((a, b) => {
      const timeA = fs.statSync(a).mtimeMs;
      const timeB = fs.statSync(b).mtimeMs;
      return timeB - timeA;
    });

    const sessions: SubagentSession[] = [];
    // No implicit cap: silently analysing a subset makes the report claim a
    // coverage it does not have. Callers opt into a limit explicitly.
    const limit = options.limit && options.limit > 0 ? options.limit : filteredFiles.length;

    for (const filePath of filteredFiles.slice(0, limit)) {
      try {
        const session = await this.normalizer.parseFile(filePath);
        if (session.events.length === 0) continue;

        if (options.agentFilter) {
          const filter = options.agentFilter.toLowerCase();
          if (
            !session.agentId.toLowerCase().includes(filter) &&
            !session.agentName?.toLowerCase().includes(filter)
          ) {
            continue;
          }
        }

        sessions.push(session);
      } catch {
        // Skip unparseable files
      }
    }

    return sessions;
  }

  /**
   * Group sessions by agent ID.
   */
  public groupSessionsByAgent(sessions: SubagentSession[]): Map<string, SubagentSession[]> {
    const groups = new Map<string, SubagentSession[]>();
    for (const s of sessions) {
      const key = s.agentId || "general-purpose";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(s);
    }
    return groups;
  }

  private collectSubagentFiles(dir: string, fileList: string[], isExplicitDir: boolean): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== ".git") {
            this.collectSubagentFiles(fullPath, fileList, isExplicitDir);
          }
        } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          // If in automatic discovery, only pick subagent files: agent-*.jsonl or inside a /subagents/ folder
          if (isExplicitDir) {
            fileList.push(fullPath);
          } else if (entry.name.startsWith("agent-") || fullPath.includes("/subagents/")) {
            fileList.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }
}
