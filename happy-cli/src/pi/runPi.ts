/**
 * Pi CLI Entry Point
 *
 * Main entry point for running the Pi agent through Happy CLI.
 * Manages agent lifecycle, session state, and communication with
 * the Happy server and mobile app.
 *
 * Pattern follows runGemini.ts / runCodex.ts — the three phases are:
 *   1. Auth + machine setup + Happy session creation
 *   2. Happy MCP server + Pi backend creation
 *   3. Message loop: mobile → Pi → mobile
 */

import { render } from 'ink';
import React from 'react';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { ApiClient } from '@/api/api';
import { logger } from '@/ui/logger';
import { Credentials, readSettings } from '@/persistence';
import { createSessionMetadata } from '@/utils/createSessionMetadata';
import { initialMachineMetadata } from '@/daemon/run';
import { MessageQueue2 } from '@/utils/MessageQueue2';
import { hashObject } from '@/utils/deterministicJson';
import { projectPath } from '@/projectPath';
import { startHappyServer } from '@/claude/utils/startHappyServer';
import { MessageBuffer } from '@/ui/ink/messageBuffer';
import { notifyDaemonSessionStarted } from '@/daemon/controlClient';
import { registerKillSessionHandler } from '@/claude/registerKillSessionHandler';
import { stopCaffeinate } from '@/utils/caffeinate';
import { connectionState } from '@/utils/serverConnectionErrors';
import { setupOfflineReconnection } from '@/utils/setupOfflineReconnection';
import { spawnHappyCLI } from '@/utils/spawnHappyCLI';
import { isDaemonRunningCurrentlyInstalledHappyVersion } from '@/daemon/controlClient';
import type { ApiSessionClient } from '@/api/apiSession';
import type { PermissionMode } from '@/api/types';
import type { AgentMessage } from '@/agent/core/AgentBackend';

import { PiBackend } from './piBackend';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CHANGE_TITLE_INSTRUCTION = `
After the very first message, call the change_title tool to set a short
descriptive title (max 50 chars) for this session.
`.trim();

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PiMode {
  permissionMode: PermissionMode;
}

/* ------------------------------------------------------------------ */
/*  Entry point                                                        */
/* ------------------------------------------------------------------ */

export async function runPi(opts: {
  credentials: Credentials;
  startedBy?: 'daemon' | 'terminal';
}): Promise<void> {

  /* ── 1. Auth / machine / session ────────────────────────────────── */

  const sessionTag = randomUUID();
  connectionState.setBackend('Pi');

  const api = await ApiClient.create(opts.credentials);

  const settings = await readSettings();
  const machineId = settings?.machineId;
  if (!machineId) {
    console.error('[pi] No machine ID found. Run `happy auth login` first.');
    process.exit(1);
  }
  logger.debug(`[pi] machineId: ${machineId}`);
  await api.getOrCreateMachine({ machineId, metadata: initialMachineMetadata });

  const { state, metadata } = createSessionMetadata({
    flavor: 'pi',
    machineId,
    startedBy: opts.startedBy,
  });

  const response = await api.getOrCreateSession({ tag: sessionTag, metadata, state });

  let session: ApiSessionClient;

  const { session: initialSession, reconnectionHandle } = setupOfflineReconnection({
    api,
    sessionTag,
    metadata,
    state,
    response,
    onSessionSwap: (newSession) => { session = newSession; },
  });
  session = initialSession;

  // Report to daemon
  if (response) {
    try {
      await notifyDaemonSessionStarted(response.id, metadata);
    } catch { /* daemon may not be running */ }
  }

  /* ── 2. Message queue ───────────────────────────────────────────── */

  const messageQueue = new MessageQueue2<PiMode>((mode) =>
    hashObject({ permissionMode: mode.permissionMode }),
  );

  let currentPermissionMode: PermissionMode = 'default';
  let isFirstMessage = true;

  session.onUserMessage((message) => {
    // Permission mode from mobile
    if (message.meta?.permissionMode) {
      const valid: PermissionMode[] = ['default', 'read-only', 'safe-yolo', 'yolo'];
      if (valid.includes(message.meta.permissionMode as PermissionMode)) {
        currentPermissionMode = message.meta.permissionMode as PermissionMode;
      }
    }

    let fullPrompt = message.content.text;
    if (isFirstMessage && message.meta?.appendSystemPrompt) {
      fullPrompt = message.meta.appendSystemPrompt + '\n\n' + fullPrompt + '\n\n' + CHANGE_TITLE_INSTRUCTION;
      isFirstMessage = false;
    }

    messageQueue.push(fullPrompt, { permissionMode: currentPermissionMode });
  });

  /* ── 3. Keep-alive ──────────────────────────────────────────────── */

  let thinking = false;
  session.keepAlive(thinking, 'remote');
  const keepAliveInterval = setInterval(() => {
    session.keepAlive(thinking, 'remote');
  }, 2000);

  const sendReady = () => {
    session.sendSessionEvent({ type: 'ready' });
    try {
      api.push().sendToAllDevices(
        "It's ready!",
        'Pi is waiting for your command',
        { sessionId: session.sessionId },
      );
    } catch (e) { logger.debug('[pi] push error', e); }
  };

  /* ── 4. Abort / kill ────────────────────────────────────────────── */

  let abortController = new AbortController();
  let shouldExit = false;
  let piBackend: PiBackend | null = null;

  const handleAbort = async () => {
    logger.debug('[pi] Abort requested');
    session.sendAgentMessage('pi', { type: 'turn_aborted', id: randomUUID() });
    try {
      abortController.abort();
      messageQueue.reset();
      if (piBackend) await piBackend.cancel('');
    } catch (e) { logger.debug('[pi] abort error', e); }
    abortController = new AbortController();
  };

  const handleKillSession = async () => {
    logger.debug('[pi] Kill session');
    await handleAbort();
    try {
      session.updateMetadata((m) => ({
        ...m,
        lifecycleState: 'archived',
        lifecycleStateSince: Date.now(),
        archivedBy: 'cli',
        archiveReason: 'User terminated',
      }));
      session.sendSessionDeath();
      await session.flush();
      await session.close();
      stopCaffeinate();
      happyServer.stop();
      if (piBackend) await piBackend.dispose();
      process.exit(0);
    } catch { process.exit(1); }
  };

  session.rpcHandlerManager.registerHandler('abort', handleAbort);
  registerKillSessionHandler(session.rpcHandlerManager, handleKillSession);

  /* ── 5. Ink UI ──────────────────────────────────────────────────── */

  const messageBuffer = new MessageBuffer();
  const hasTTY = process.stdout.isTTY && process.stdin.isTTY;

  if (hasTTY) {
    console.clear();
    // Reuse CodexDisplay — it's generic enough for any agent that streams text
    const { CodexDisplay } = await import('@/ui/ink/CodexDisplay');
    render(
      React.createElement(CodexDisplay, {
        messageBuffer,
        logPath: process.env.DEBUG ? logger.getLogPath() : undefined,
        onExit: async () => {
          shouldExit = true;
          await handleAbort();
        },
      }),
      { exitOnCtrlC: false, patchConsole: false },
    );
    process.stdin.resume();
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
  }

  /* ── 6. Happy MCP server + Pi backend ───────────────────────────── */

  const happyServer = await startHappyServer(session);
  const bridgeCommand = join(projectPath(), 'bin', 'happy-mcp.mjs');

  piBackend = new PiBackend({ cwd: process.cwd() });

  // Wire Pi events → mobile
  let accumulatedResponse = '';
  let isResponseInProgress = false;

  piBackend.onMessage((msg: AgentMessage) => {
    switch (msg.type) {
      case 'model-output':
        if (msg.textDelta) {
          if (!isResponseInProgress) {
            messageBuffer.addMessage(msg.textDelta, 'assistant');
            isResponseInProgress = true;
          } else {
            messageBuffer.updateLastMessage(msg.textDelta, 'assistant');
          }
          accumulatedResponse += msg.textDelta;
        }
        break;

      case 'status':
        if (msg.status === 'running') {
          thinking = true;
          session.keepAlive(thinking, 'remote');
          session.sendAgentMessage('pi', { type: 'task_started', id: randomUUID() });
          messageBuffer.addMessage('Thinking...', 'system');
        } else if (msg.status === 'idle') {
          thinking = false;
          session.keepAlive(thinking, 'remote');

          // Send accumulated text
          if (accumulatedResponse) {
            session.sendAgentMessage('pi', {
              type: 'message',
              message: accumulatedResponse,
            });
          }

          session.sendAgentMessage('pi', { type: 'task_complete', id: randomUUID() });
          accumulatedResponse = '';
          isResponseInProgress = false;
        } else if (msg.status === 'error') {
          thinking = false;
          session.keepAlive(thinking, 'remote');
          const detail = typeof msg.detail === 'string' ? msg.detail : 'Unknown error';
          messageBuffer.addMessage(`Error: ${detail}`, 'status');
          session.sendAgentMessage('pi', { type: 'message', message: `Error: ${detail}` });
          accumulatedResponse = '';
          isResponseInProgress = false;
        }
        break;

      case 'tool-call':
        messageBuffer.addMessage(`Executing: ${msg.toolName}`, 'tool');
        session.sendAgentMessage('pi', {
          type: 'tool-call',
          name: msg.toolName,
          callId: msg.callId,
          input: msg.args,
          id: randomUUID(),
        });
        break;

      case 'tool-result':
        const resultText = typeof msg.result === 'string'
          ? msg.result.substring(0, 200)
          : JSON.stringify(msg.result).substring(0, 200);
        messageBuffer.addMessage(`Result: ${resultText}`, 'result');
        session.sendAgentMessage('pi', {
          type: 'tool-result',
          callId: msg.callId,
          output: msg.result,
          id: randomUUID(),
        });
        break;

      case 'event':
        if (msg.name === 'thinking') {
          const text = (msg.payload as any)?.text ?? '';
          if (text) {
            session.sendAgentMessage('pi', { type: 'thinking', text });
          }
        }
        break;

      case 'fs-edit':
        session.sendAgentMessage('pi', {
          type: 'file-edit',
          description: msg.description,
          diff: msg.diff,
          filePath: msg.path || 'unknown',
          id: randomUUID(),
        });
        break;

      default:
        break;
    }
  });

  // Start the Pi session
  await piBackend.startSession();
  logger.debug('[pi] Backend session started');

  /* ── 7. Main loop ───────────────────────────────────────────────── */

  sendReady();

  try {
    while (!shouldExit) {
      const waitSignal = abortController.signal;
      const batch = await messageQueue.waitForMessagesAndGetAsString(waitSignal);
      if (!batch) {
        if (waitSignal.aborted && !shouldExit) continue;
        break;
      }

      logger.debug(`[pi] Received prompt (${batch.message.length} chars)`);
      messageBuffer.addMessage(batch.message.substring(0, 200), 'user');

      try {
        accumulatedResponse = '';
        isResponseInProgress = false;

        await piBackend.sendPrompt('', batch.message);

        if (piBackend.waitForResponseComplete) {
          await piBackend.waitForResponseComplete(120_000);
        }
      } catch (error) {
        const isAbort = error instanceof Error && error.name === 'AbortError';
        if (isAbort) {
          messageBuffer.addMessage('Aborted by user', 'status');
        } else {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.debug('[pi] Prompt error:', error);
          messageBuffer.addMessage(`Error: ${errMsg}`, 'status');
          session.sendAgentMessage('pi', { type: 'message', message: `Error: ${errMsg}` });
        }
      }

      // Emit ready if nothing left in queue
      if (!shouldExit && messageQueue.size() === 0) {
        sendReady();
      }
    }
  } finally {
    clearInterval(keepAliveInterval);
    reconnectionHandle?.cancel();
    happyServer.stop();
    if (piBackend) await piBackend.dispose();

    session.updateMetadata((m) => ({
      ...m,
      lifecycleState: 'archived',
      lifecycleStateSince: Date.now(),
    }));
    session.sendSessionDeath();
    await session.flush();
    await session.close();
    stopCaffeinate();

    logger.debug('[pi] Session ended');
  }
}
