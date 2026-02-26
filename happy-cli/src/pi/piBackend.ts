/**
 * Pi Agent Backend
 *
 * Wraps the Pi SDK (`@mariozechner/pi-coding-agent`) into the Happy CLI
 * AgentBackend interface. Pi runs **in-process** — no child process spawn,
 * no MCP stdio bridge, no ACP HTTP — making it the simplest backend.
 *
 * Events emitted by the Pi AgentSession are translated to AgentMessage and
 * forwarded to the registered handler which ultimately pushes them to the
 * mobile app via the Happy server.
 */

import { randomUUID } from 'node:crypto';
import { logger } from '@/ui/logger';
import type {
  AgentBackend,
  AgentMessage,
  AgentMessageHandler,
  SessionId,
  StartSessionResult,
  McpServerConfig,
} from '@/agent/core/AgentBackend';

// Pi SDK types — imported dynamically so the module fails gracefully
// if the package isn't installed yet.
type PiAgentSession = Awaited<ReturnType<typeof import('@mariozechner/pi-coding-agent').createAgentSession>>['session'];

export interface PiBackendOptions {
  /** Working directory for Pi tools (read, bash, edit, write) */
  cwd: string;
  /** MCP servers to expose (e.g. Happy MCP for change_title) */
  mcpServers?: Record<string, McpServerConfig>;
}

export class PiBackend implements AgentBackend {
  private session: PiAgentSession | null = null;
  private unsubscribe: (() => void) | null = null;
  private handlers: AgentMessageHandler[] = [];
  private readonly cwd: string;
  private responseCompleteResolver: (() => void) | null = null;

  constructor(private readonly opts: PiBackendOptions) {
    this.cwd = opts.cwd;
  }

  /* ------------------------------------------------------------------ */
  /*  AgentBackend interface                                             */
  /* ------------------------------------------------------------------ */

  async startSession(): Promise<StartSessionResult> {
    const {
      createAgentSession,
      SessionManager,
      AuthStorage,
      ModelRegistry,
      DefaultResourceLoader,
      SettingsManager,
    } = await import('@mariozechner/pi-coding-agent');

    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);
    const settingsManager = SettingsManager.create(this.cwd);

    // Lightweight resource loader — skip heavy skill/extension discovery
    // to keep startup fast when running inside Happy CLI.
    const loader = new DefaultResourceLoader({
      cwd: this.cwd,
      settingsManager,
    });
    await loader.reload();

    const { session } = await createAgentSession({
      cwd: this.cwd,
      sessionManager: SessionManager.inMemory(),
      authStorage,
      modelRegistry,
      settingsManager,
      resourceLoader: loader,
    });

    this.session = session;
    this.subscribeToEvents();

    const sessionId = session.sessionId;
    logger.debug(`[pi] Session created: ${sessionId}`);
    return { sessionId };
  }

  async sendPrompt(sessionId: SessionId, prompt: string): Promise<void> {
    if (!this.session) throw new Error('[pi] Session not started');

    // Create a promise that resolves when agent_end fires
    const done = new Promise<void>((resolve) => {
      this.responseCompleteResolver = resolve;
    });

    // Kick off the prompt (returns when the agent loop finishes)
    await this.session.prompt(prompt);

    // Resolve in case agent_end didn't fire (safety)
    this.responseCompleteResolver?.();
    this.responseCompleteResolver = null;
  }

  async cancel(_sessionId: SessionId): Promise<void> {
    if (!this.session) return;
    await this.session.abort();
  }

  onMessage(handler: AgentMessageHandler): void {
    this.handlers.push(handler);
  }

  offMessage(handler: AgentMessageHandler): void {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  async waitForResponseComplete(timeoutMs = 120_000): Promise<void> {
    if (!this.responseCompleteResolver) return;
    await Promise.race([
      new Promise<void>((resolve) => {
        const prev = this.responseCompleteResolver;
        this.responseCompleteResolver = () => { prev?.(); resolve(); };
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('[pi] Response timeout')), timeoutMs),
      ),
    ]);
  }

  async dispose(): Promise<void> {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.session?.dispose();
    this.session = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Pi SDK event → AgentMessage translation                           */
  /* ------------------------------------------------------------------ */

  private emit(msg: AgentMessage): void {
    for (const h of this.handlers) {
      try { h(msg); } catch (e) { logger.debug('[pi] handler error', e); }
    }
  }

  private subscribeToEvents(): void {
    if (!this.session) return;

    this.unsubscribe = this.session.subscribe((event) => {
      switch (event.type) {
        /* ── Streaming text ─────────────────────────────────────── */
        case 'message_update': {
          const sub = event.assistantMessageEvent;
          if (sub.type === 'text_delta') {
            this.emit({ type: 'model-output', textDelta: sub.delta });
          } else if (sub.type === 'thinking_delta') {
            this.emit({ type: 'event', name: 'thinking', payload: { text: sub.delta } });
          }
          break;
        }

        /* ── Tool lifecycle ─────────────────────────────────────── */
        case 'tool_execution_start':
          this.emit({
            type: 'tool-call',
            toolName: event.toolName,
            callId: event.toolCallId ?? randomUUID(),
            args: (event as any).params ?? {},
          });
          break;

        case 'tool_execution_end':
          this.emit({
            type: 'tool-result',
            toolName: event.toolName,
            callId: event.toolCallId ?? randomUUID(),
            result: event.isError
              ? { error: event.result }
              : event.result,
          });
          break;

        /* ── Agent lifecycle ────────────────────────────────────── */
        case 'agent_start':
          this.emit({ type: 'status', status: 'running' });
          break;

        case 'agent_end':
          this.emit({ type: 'status', status: 'idle' });
          this.responseCompleteResolver?.();
          this.responseCompleteResolver = null;
          break;

        /* ── Turn boundaries ────────────────────────────────────── */
        case 'turn_start':
          // Could be used for keepalive thinking state
          break;

        case 'turn_end':
          break;

        /* ── Auto-compaction / retry ────────────────────────────── */
        case 'auto_compaction_start':
        case 'auto_compaction_end':
        case 'auto_retry_start':
        case 'auto_retry_end':
          break;

        default:
          break;
      }
    });
  }
}
