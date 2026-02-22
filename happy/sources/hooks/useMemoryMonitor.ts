import * as React from 'react';
import { machineBash } from '@/sync/ops';
import { AsyncLock } from '@/utils/lock';

/**
 * Memory monitoring hook for remote Claude Code sessions.
 *
 * Polls the remote machine every 30s to check Claude process RSS and system memory.
 * Computes a memory level (normal/elevated/high/critical) and trend (stable/increasing/decreasing).
 *
 * Thresholds based on documented Claude Code memory leak patterns (Jan 2026):
 *   - Normal: < 2 GB RSS
 *   - Elevated: 2-5 GB RSS (early leak indicator)
 *   - High: 5-10 GB RSS (significant leak, should restart soon)
 *   - Critical: > 10 GB RSS (imminent OOM, offer restart now)
 *
 * Returns null for all fields if the remote machine doesn't support the monitoring commands.
 * Never throws or shows errors — silently retries on next interval.
 */

const POLL_INTERVAL_MS = 30_000;
const MAX_HISTORY = 20; // ~10 minutes of history
const TREND_MIN_SAMPLES = 6;
const TREND_THRESHOLD = 0.20; // 20% change = significant

const GB = 1024 * 1024 * 1024;
const LEVEL_ELEVATED = 2 * GB;
const LEVEL_HIGH = 5 * GB;
const LEVEL_CRITICAL = 10 * GB;

// Single command that outputs:
// Line 1: total RSS of all Claude processes in KB (0 if none found)
// Line 2: system total memory and available memory in bytes
const MEMORY_CMD = `ps -o rss= -p $(pgrep -f "claude" 2>/dev/null || echo 0) 2>/dev/null | awk '{s+=$1} END {print s+0}'; free -b 2>/dev/null | awk '/^Mem:/ {print $2, $7}'`;

export type MemoryLevel = 'normal' | 'elevated' | 'high' | 'critical';
export type MemoryTrend = 'stable' | 'increasing' | 'decreasing' | 'unknown';

export interface MemorySnapshot {
    timestamp: number;
    claudeRssBytes: number;
    systemTotalBytes: number;
    systemAvailableBytes: number;
}

export interface MemoryStatus {
    current: MemorySnapshot | null;
    trend: MemoryTrend;
    level: MemoryLevel;
    history: Array<{ timestamp: number; rssBytes: number }>;
}

const INITIAL_STATUS: MemoryStatus = {
    current: null,
    trend: 'unknown',
    level: 'normal',
    history: [],
};

function computeLevel(rssBytes: number): MemoryLevel {
    if (rssBytes >= LEVEL_CRITICAL) return 'critical';
    if (rssBytes >= LEVEL_HIGH) return 'high';
    if (rssBytes >= LEVEL_ELEVATED) return 'elevated';
    return 'normal';
}

function computeTrend(history: Array<{ timestamp: number; rssBytes: number }>): MemoryTrend {
    if (history.length < TREND_MIN_SAMPLES) return 'unknown';
    const firstAvg = history.slice(0, 3).reduce((s, h) => s + h.rssBytes, 0) / 3;
    const lastAvg = history.slice(-3).reduce((s, h) => s + h.rssBytes, 0) / 3;
    if (firstAvg === 0) return 'unknown';
    const change = (lastAvg - firstAvg) / firstAvg;
    if (change > TREND_THRESHOLD) return 'increasing';
    if (change < -TREND_THRESHOLD) return 'decreasing';
    return 'stable';
}

function parseMemoryOutput(stdout: string): MemorySnapshot | null {
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) return null;

    const rssKb = parseInt(lines[0].trim(), 10);
    if (isNaN(rssKb)) return null;

    const memParts = lines[1].trim().split(/\s+/);
    if (memParts.length < 2) return null;

    const totalBytes = parseInt(memParts[0], 10);
    const availableBytes = parseInt(memParts[1], 10);
    if (isNaN(totalBytes) || isNaN(availableBytes)) return null;

    return {
        timestamp: Date.now(),
        claudeRssBytes: rssKb * 1024, // KB → bytes
        systemTotalBytes: totalBytes,
        systemAvailableBytes: availableBytes,
    };
}

export function useMemoryMonitor(
    machineId: string | undefined,
    isConnected: boolean
): MemoryStatus {
    const [status, setStatus] = React.useState<MemoryStatus>(INITIAL_STATUS);
    const lockRef = React.useRef(new AsyncLock());
    const historyRef = React.useRef<Array<{ timestamp: number; rssBytes: number }>>([]);

    const poll = React.useCallback(async () => {
        if (!machineId) return;

        await lockRef.current.inLock(async () => {
            try {
                const result = await machineBash(machineId, MEMORY_CMD, '/tmp');
                if (!result.success || !result.stdout) return;

                const snapshot = parseMemoryOutput(result.stdout);
                if (!snapshot) return;

                // Update history
                historyRef.current = [
                    ...historyRef.current.slice(-(MAX_HISTORY - 1)),
                    { timestamp: snapshot.timestamp, rssBytes: snapshot.claudeRssBytes },
                ];

                const history = historyRef.current;
                setStatus({
                    current: snapshot,
                    level: computeLevel(snapshot.claudeRssBytes),
                    trend: computeTrend(history),
                    history,
                });
            } catch {
                // Silently ignore — will retry next interval
            }
        });
    }, [machineId]);

    React.useEffect(() => {
        if (!machineId || !isConnected) {
            setStatus(INITIAL_STATUS);
            historyRef.current = [];
            return;
        }

        // Initial poll
        poll();

        const interval = setInterval(poll, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [machineId, isConnected, poll]);

    return status;
}
