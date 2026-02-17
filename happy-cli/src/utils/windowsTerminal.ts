/**
 * Windows Terminal spawn utility
 *
 * Windows equivalent of tmux.ts - spawns Happy CLI sessions in a new
 * Windows Terminal tab instead of a detached headless process.
 *
 * When the daemon spawns a session on Windows, `detached: true` creates
 * a standalone console window. This utility uses `wt.exe` to open
 * a new tab in the user's existing Windows Terminal window, providing
 * a proper terminal experience that can be recovered from the PC.
 *
 * PID tracking: Since wt.exe is a launcher (exits immediately after
 * creating the tab), we can't get the child PID directly. Instead,
 * the Happy CLI writes its PID to a file via the HAPPY_PID_FILE
 * env var, and we poll for it.
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import { basename } from 'node:path';
import os from 'os';
import { join } from 'node:path';
import { logger } from '@/ui/logger';
import { projectPath } from '@/projectPath';
import { existsSync } from 'node:fs';
import { isBun } from './runtime';

export interface WTSpawnResult {
  success: boolean;
  pid?: number;
  error?: string;
}

export interface WTSpawnOptions {
  /** Arguments to pass to the Happy CLI (e.g. ['claude', '--happy-starting-mode', 'remote']) */
  cliArgs: string[];
  /** Working directory for the session */
  directory: string;
  /** Title for the Windows Terminal tab */
  tabTitle: string;
  /** Environment variables to pass to the spawned process */
  env: Record<string, string>;
}

/**
 * Check if Windows Terminal (wt.exe) is available on this system.
 * Cached after first check to avoid repeated `where` calls.
 */
let wtAvailableCache: boolean | null = null;

export function isWindowsTerminalAvailable(): boolean {
  if (process.platform !== 'win32') return false;

  if (wtAvailableCache !== null) return wtAvailableCache;

  try {
    execSync('where wt.exe', { stdio: ['pipe', 'pipe', 'ignore'] });
    wtAvailableCache = true;
    logger.debug('[WINDOWS TERMINAL] wt.exe found in PATH');
  } catch {
    wtAvailableCache = false;
    logger.debug('[WINDOWS TERMINAL] wt.exe not found in PATH');
  }

  return wtAvailableCache;
}

/**
 * Spawn a Happy CLI session in a new Windows Terminal tab.
 *
 * Uses `wt.exe -w 0 new-tab` to open the session in the most recent
 * Windows Terminal window (creates a new one if none exists).
 *
 * The command runs through PowerShell (`pwsh -NoExit`) so that:
 * 1. The user's PowerShell profile is loaded (environment, aliases, etc.)
 * 2. The tab stays open after the session ends (user gets a PS prompt)
 * 3. The node process runs as foreground with proper stdin/stdout
 *
 * PID tracking uses the HAPPY_PID_FILE mechanism: the Happy CLI writes
 * its process.pid to a temp file on startup, and we poll for it here.
 *
 * @returns PID of the spawned node process for daemon tracking
 */
export async function spawnInWindowsTerminal(options: WTSpawnOptions): Promise<WTSpawnResult> {
  const { cliArgs, directory, tabTitle, env } = options;

  // Resolve the CLI entrypoint
  const projectRoot = projectPath();
  const entrypoint = join(projectRoot, 'dist', 'index.mjs');

  if (!existsSync(entrypoint)) {
    return { success: false, error: `Entrypoint ${entrypoint} does not exist` };
  }

  // Generate unique PID file path
  const pidFile = join(os.tmpdir(), `happy-wt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pid`);

  // Build the node command
  const runtime = isBun() ? 'bun' : 'node';
  const nodeArgs = ['--no-warnings', '--no-deprecation', entrypoint, ...cliArgs];

  // Build PowerShell script with embedded env vars and command.
  // We use -EncodedCommand (base64 UTF-16LE) to avoid all escaping issues
  // with wt.exe's argument parsing. wt.exe does NOT forward env vars from
  // spawn() to the new tab process, so we set them explicitly in the script.
  const psLines: string[] = [];

  // Set HAPPY_PID_FILE so the CLI can write its PID for daemon tracking
  psLines.push(`$env:HAPPY_PID_FILE = '${pidFile.replace(/'/g, "''")}'`);

  // Set extra env vars that differ from current process.env
  for (const [key, value] of Object.entries(env)) {
    if (key === 'HAPPY_PID_FILE') continue;
    if (process.env[key] !== value) {
      psLines.push(`$env:${key} = '${value.replace(/'/g, "''")}'`);
    }
  }

  // Run the node command (space-separated args, NOT comma-separated)
  const escapedArgs = nodeArgs.map(arg => `'${arg.replace(/'/g, "''")}'`).join(' ');
  psLines.push(`& '${runtime}' ${escapedArgs}`);

  const psScript = psLines.join('; ');
  const encodedCommand = Buffer.from(psScript, 'utf16le').toString('base64');

  logger.debug(`[WINDOWS TERMINAL] PS script: ${psScript}`);
  logger.debug(`[WINDOWS TERMINAL] Directory: ${directory}`);
  logger.debug(`[WINDOWS TERMINAL] PID file: ${pidFile}`);

  // Spawn via wt.exe
  // -w 0: use the most recent WT window (creates new if none)
  // new-tab: open as a new tab
  // --title: set tab title
  // -d: set working directory
  // -- pwsh -NoLogo -NoExit -EncodedCommand: base64 UTF-16LE encoded script
  const wtProcess = spawn('wt.exe', [
    '-w', '0',
    'new-tab',
    '--title', tabTitle,
    '-d', directory,
    '--',
    'pwsh', '-NoLogo', '-NoExit', '-EncodedCommand', encodedCommand
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });

  wtProcess.unref();

  // wt.exe exits immediately after creating the tab.
  // Poll for PID file written by the Happy CLI on startup.
  let pid: number | undefined;
  const pollIntervalMs = 500;
  const maxAttempts = 60; // 60 x 500ms = 30 seconds max

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, pollIntervalMs));
    try {
      const content = await fs.readFile(pidFile, 'utf-8');
      pid = parseInt(content.trim(), 10);
      if (!isNaN(pid) && pid > 0) {
        await fs.unlink(pidFile).catch(() => {});
        logger.debug(`[WINDOWS TERMINAL] Got PID ${pid} from PID file (attempt ${i + 1})`);
        break;
      }
    } catch {
      // File not yet created, keep polling
    }
  }

  if (!pid) {
    logger.debug(`[WINDOWS TERMINAL] Timeout waiting for PID file after ${maxAttempts * pollIntervalMs}ms`);
    await fs.unlink(pidFile).catch(() => {});
    // Return success without PID - the tab was opened, session is likely running.
    // Returning failure here would cause the daemon to spawn a DUPLICATE session
    // via the regular fallback path, creating extra terminal windows.
    return { success: true };
  }

  return { success: true, pid };
}
