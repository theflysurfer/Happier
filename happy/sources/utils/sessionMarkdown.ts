/**
 * Converts session messages to a GitHub-style markdown document.
 * Used for exporting/sharing session conversations.
 */

import { Session } from '@/sync/storageTypes';
import { Message, ToolCallMessage } from '@/sync/typesMessage';
import { getSessionName, formatPathRelativeToHome } from '@/utils/sessionUtils';

function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

function getFlavorName(flavor: string | null | undefined): string {
    if (!flavor || flavor === 'claude') return 'Claude';
    if (flavor === 'gpt' || flavor === 'openai') return 'Codex';
    if (flavor === 'gemini') return 'Gemini';
    return flavor;
}

function formatToolInput(input: any): string {
    if (input === null || input === undefined) return '';
    try {
        return JSON.stringify(input, null, 2);
    } catch {
        return String(input);
    }
}

function formatToolResult(result: any): string {
    if (result === null || result === undefined) return '';
    if (typeof result === 'string') return result;
    if (Array.isArray(result)) {
        return result.map(item => {
            if (typeof item === 'object' && item.type === 'text') return item.text;
            return JSON.stringify(item);
        }).join('\n');
    }
    try {
        return JSON.stringify(result, null, 2);
    } catch {
        return String(result);
    }
}

function formatToolCall(msg: ToolCallMessage): string {
    const time = formatTime(msg.createdAt);
    const toolName = msg.tool.name;
    const description = msg.tool.description ? ` — ${msg.tool.description}` : '';
    const lines: string[] = [];

    lines.push(`## 🔧 Tool: ${toolName} — ${time}${description}`);
    lines.push('');

    // Input
    const inputStr = formatToolInput(msg.tool.input);
    if (inputStr) {
        lines.push('<details>');
        lines.push('<summary>Input</summary>');
        lines.push('');
        lines.push('```json');
        lines.push(inputStr);
        lines.push('```');
        lines.push('');
        lines.push('</details>');
        lines.push('');
    }

    // Result
    const resultStr = formatToolResult(msg.tool.result);
    if (resultStr) {
        lines.push('<details>');
        lines.push('<summary>Result</summary>');
        lines.push('');
        lines.push('```');
        // Truncate very long results
        const maxResultLength = 5000;
        if (resultStr.length > maxResultLength) {
            lines.push(resultStr.substring(0, maxResultLength) + '\n... (truncated)');
        } else {
            lines.push(resultStr);
        }
        lines.push('```');
        lines.push('');
        lines.push('</details>');
    }

    // Permission status
    if (msg.tool.permission) {
        const status = msg.tool.permission.status;
        if (status === 'denied') {
            lines.push('');
            lines.push('> ⚠️ Permission denied');
        }
    }

    return lines.join('\n');
}

export function formatSessionAsMarkdown(session: Session, messages: Message[]): string {
    const lines: string[] = [];

    // Header
    const sessionName = getSessionName(session);
    lines.push(`# Session: ${sessionName}`);
    lines.push('');
    lines.push(`**Created:** ${formatDateTime(session.createdAt)}`);
    if (session.metadata?.path) {
        const displayPath = formatPathRelativeToHome(session.metadata.path, session.metadata.homeDir);
        lines.push(`**Path:** ${displayPath}`);
    }
    if (session.metadata?.host) {
        lines.push(`**Machine:** ${session.metadata.host}`);
    }
    lines.push(`**Agent:** ${getFlavorName(session.metadata?.flavor)}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Messages
    for (const msg of messages) {
        switch (msg.kind) {
            case 'user-text': {
                const time = formatTime(msg.createdAt);
                lines.push(`## 👤 User — ${time}`);
                lines.push('');
                lines.push(msg.text);
                if (msg.images && msg.images.length > 0) {
                    lines.push('');
                    lines.push(`*[${msg.images.length} image(s) attached]*`);
                }
                lines.push('');
                lines.push('---');
                lines.push('');
                break;
            }

            case 'agent-text': {
                const time = formatTime(msg.createdAt);
                if (msg.isThinking) {
                    lines.push(`## 💭 Thinking — ${time}`);
                } else {
                    lines.push(`## 🤖 Agent — ${time}`);
                }
                lines.push('');
                lines.push(msg.text);
                lines.push('');
                lines.push('---');
                lines.push('');
                break;
            }

            case 'tool-call': {
                lines.push(formatToolCall(msg));
                lines.push('');
                lines.push('---');
                lines.push('');
                break;
            }

            case 'agent-event': {
                const event = msg.event;
                if (event.type === 'switch') {
                    lines.push(`> ⚡ Switched to ${event.mode} mode`);
                } else if (event.type === 'message') {
                    lines.push(`> ⚡ ${event.message}`);
                } else if (event.type === 'limit-reached') {
                    lines.push(`> ⚠️ Limit reached`);
                } else if (event.type === 'ready') {
                    lines.push(`> ✅ Agent ready`);
                }
                lines.push('');
                lines.push('---');
                lines.push('');
                break;
            }
        }
    }

    return lines.join('\n');
}
