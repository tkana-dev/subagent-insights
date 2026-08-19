import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type { CanonicalEvent, CanonicalToolCall, EventType, SubagentSession } from "../types/index.js";

/**
 * Normalizes Claude Code transcript JSONL into canonical SubagentSession format.
 */
export class ClaudeTranscriptNormalizer {
  /**
   * Parse a single JSONL transcript file into a SubagentSession.
   */
  public async parseFile(filePath: string): Promise<SubagentSession> {
    const fileStream = fs.createReadStream(filePath, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Number.POSITIVE_INFINITY,
    });

    const events: CanonicalEvent[] = [];
    // Maps tool_use_id -> tool name so tool_result blocks (emitted on a later
    // line) can be attributed back to the tool that produced them.
    const toolUseNames = new Map<string, string>();
    let detectedAgentType: string | undefined;
    let detectedAgentName: string | undefined;
    let rawAgentId: string | undefined;
    let startTime = "";
    let endTime = "";

    // Extract agentId from fileName (e.g. agent-adfc07c115feac21e.jsonl or agent-implementer.jsonl)
    const baseName = path.basename(filePath, ".jsonl");
    const match = baseName.match(/^agent-(.+)$/);
    if (match && match[1]) {
      rawAgentId = match[1];
    } else {
      rawAgentId = baseName;
    }

    let lineIndex = 0;
    for await (const rawLine of rl) {
      const line = rawLine.trim();
      if (!line) continue;

      try {
        const json = JSON.parse(line);
        lineIndex++;

        const timestamp =
          json.timestamp ||
          json.time ||
          json.createdAt ||
          new Date(Date.now() - (1000 - lineIndex) * 1000).toISOString();

        if (!startTime) startTime = timestamp;
        endTime = timestamp;

        // Inspect attribution and agent metadata
        if (json.attributionAgent && !detectedAgentType) {
          detectedAgentType = String(json.attributionAgent);
        }
        if (json.agentType && !detectedAgentType) {
          detectedAgentType = String(json.agentType);
        }
        if (json.subagentType && !detectedAgentType) {
          detectedAgentType = String(json.subagentType);
        }
        if (json.role && !detectedAgentType) {
          detectedAgentType = String(json.role);
        }
        if (json.agentName && !detectedAgentName) {
          detectedAgentName = String(json.agentName);
        }
        if (json.agentId && !rawAgentId) {
          rawAgentId = String(json.agentId);
        }

        const normalizedEvents = this.normalizeLine(
          json,
          lineIndex,
          timestamp,
          detectedAgentType || rawAgentId,
          toolUseNames
        );
        events.push(...normalizedEvents);
      } catch {
        // Skip malformed JSON lines
        continue;
      }
    }

    // Determine finalized agent ID and human-friendly name
    let agentId = detectedAgentType || rawAgentId || "general-purpose";
    
    // If agentId is a random hash/UUID (e.g. adfc07c115feac21e or 8ed55946-...) without attributionAgent
    const isRandomHash = /^[a-f0-9-]{12,}$/i.test(agentId);
    if (isRandomHash && !detectedAgentType) {
      agentId = "general-purpose";
    }

    let agentName = detectedAgentName;
    if (!agentName) {
      agentName = this.formatAgentName(agentId);
    }

    const sessionId = path.basename(path.dirname(path.dirname(filePath))) || path.basename(path.dirname(filePath));

    return {
      sessionId,
      agentId,
      agentName,
      filePath,
      startTime: startTime || new Date().toISOString(),
      endTime: endTime || new Date().toISOString(),
      events,
    };
  }

  /**
   * Format human readable agent name from ID.
   */
  private formatAgentName(id: string): string {
    const cleanId = id.replace(/[-_]/g, " ").trim();
    const formatted = cleanId
      .split(" ")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
      .join(" ");

    if (formatted.toLowerCase().includes("agent")) {
      return formatted;
    }
    return `${formatted} Agent`;
  }

  /**
   * Build a CanonicalToolCall from a `tool_result` content block.
   * The tool name is recovered via tool_use_id, since the block itself
   * only carries the id of the call it answers.
   */
  private buildToolResult(
    block: Record<string, unknown>,
    toolUseNames: Map<string, string>
  ): CanonicalToolCall {
    const toolUseId = typeof block.tool_use_id === "string" ? block.tool_use_id : undefined;
    const name = (toolUseId && toolUseNames.get(toolUseId)) || "unknown";

    let output = "";
    if (typeof block.content === "string") {
      output = block.content;
    } else if (Array.isArray(block.content)) {
      // Content can be a list of blocks (text / image / tool_reference).
      output = block.content
        .filter((c): c is { type: string; text?: string } => Boolean(c) && typeof c === "object")
        .map((c) => (c.type === "text" && typeof c.text === "string" ? c.text : `[${c.type}]`))
        .join("\n");
    }

    return {
      name,
      input: {},
      output,
      isError: Boolean(block.is_error),
    };
  }

  /**
   * Normalize an individual raw JSON record into one or more CanonicalEvents.
   */
  private normalizeLine(
    raw: Record<string, unknown>,
    index: number,
    timestamp: string,
    agentId: string,
    toolUseNames: Map<string, string>
  ): CanonicalEvent[] {
    const results: CanonicalEvent[] = [];

    // Format 1: Claude Code transcript format with message objects
    if (raw.type === "user" || raw.type === "assistant") {
      const type: EventType = raw.type === "user" ? "user_message" : "agent_message";
      let content = "";
      const toolCalls: CanonicalToolCall[] = [];
      const toolResults: CanonicalToolCall[] = [];

      if (typeof raw.message === "string") {
        content = raw.message;
      } else if (raw.message && typeof raw.message === "object") {
        const msg = raw.message as Record<string, unknown>;
        if (typeof msg.content === "string") {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block.type === "text" && typeof block.text === "string") {
              content += (content ? "\n" : "") + block.text;
            } else if (block.type === "tool_use") {
              const toolName = block.name || "unknown";
              if (typeof block.id === "string") {
                toolUseNames.set(block.id, toolName);
              }
              toolCalls.push({
                name: toolName,
                input: (block.input as Record<string, unknown>) || {},
              });
            } else if (block.type === "tool_result") {
              toolResults.push(this.buildToolResult(block, toolUseNames));
            }
          }
        }
      } else if (typeof raw.content === "string") {
        content = raw.content;
      }

      if (content) {
        results.push({
          id: `evt-${index}-msg`,
          timestamp,
          type,
          agentId,
          content,
          tokens: raw.usage as CanonicalEvent["tokens"],
        });
      }

      for (let i = 0; i < toolCalls.length; i++) {
        results.push({
          id: `evt-${index}-tool-${i}`,
          timestamp,
          type: "tool_call",
          agentId,
          toolCall: toolCalls[i],
        });
      }

      for (let i = 0; i < toolResults.length; i++) {
        const tr = toolResults[i];
        results.push({
          id: `evt-${index}-result-${i}`,
          timestamp,
          type: tr.isError ? "error" : "tool_result",
          agentId,
          content: tr.output,
          toolCall: tr,
        });
      }
    }

    // Format 2: Direct tool_use / tool_result
    else if (raw.type === "tool_use" || raw.tool_name || raw.tool) {
      const toolName = (raw.name || raw.tool_name || raw.tool || "unknown") as string;
      const input = (raw.input || raw.args || raw.parameters || {}) as Record<string, unknown>;

      results.push({
        id: `evt-${index}`,
        timestamp,
        type: "tool_call",
        agentId,
        toolCall: {
          name: toolName,
          input,
        },
      });
    } else if (raw.type === "tool_result" || raw.tool_result) {
      const toolName = (raw.name || raw.tool_name || "unknown") as string;
      const output = typeof raw.content === "string" ? raw.content : JSON.stringify(raw.content || raw.result || "");
      const isError = Boolean(raw.is_error || raw.isError || raw.status === "error");

      results.push({
        id: `evt-${index}`,
        timestamp,
        type: isError ? "error" : "tool_result",
        agentId,
        content: output,
        toolCall: {
          name: toolName,
          input: {},
          output,
          isError,
        },
      });
    }

    // Fallback: Generic content
    if (results.length === 0 && (raw.text || raw.content || raw.prompt)) {
      results.push({
        id: `evt-${index}`,
        timestamp,
        type: "agent_message",
        agentId,
        content: String(raw.text || raw.content || raw.prompt),
      });
    }

    return results;
  }
}
