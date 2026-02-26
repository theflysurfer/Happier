# Feature Implementation Status

## Complete Feature Matrix

| Feature | Description | Android | Browser | Key Files |
|---------|-------------|:-------:|:-------:|-----------|
| **Chat Interface** | Real-time chat with Claude AI sessions | Yes | Yes | `sources/-session/SessionView.tsx`, `components/ChatList.tsx` |
| **Session List** | Browse sessions, filter by project/machine | Yes | Yes | `sources/app/(app)/index.tsx`, `session/list.tsx` |
| **Project Sessions** | Sessions scoped by machine+path, expandable transcripts | Yes | Yes | `session/project-sessions.tsx` |
| **Session Transcript** | Full markdown rendering of conversation history | Yes | Yes | `session/[id]/transcript.tsx` |
| **File Manager** | Arborescent tree view with CRUD operations | Yes | Yes | `session/[id]/file-manager.tsx`, `hooks/useFileManager.ts` |
| **Browse Files (Search)** | Search files by name/path with git status | Yes | Yes | `session/[id]/files.tsx`, `utils/searchFiles.ts` |
| **Git Changes** | Staged/unstaged file changes view | Yes | Yes | `session/[id]/files.tsx` |
| **Code Editor** | TextInput IDE with line numbers, syntax highlight | Yes | Yes | `components/editor/CodeEditor.tsx` |
| **Markdown Preview** | Split/edit/preview modes with save | Yes | Yes | `session/[id]/markdown-preview.tsx` |
| **CSV Viewer** | WebView + PapaParse table with sort/filter/annotations | Yes | Yes | `components/viewers/CsvViewer.tsx` |
| **SQLite Viewer** | WebView + sql.js WASM DB browser with SQL query | Yes | Yes | `components/viewers/SqliteViewer.tsx` |
| **Mermaid Diagrams** | Flowcharts, sequence diagrams rendering | Yes | Yes* | `components/MermaidRenderer.tsx`, `.web.tsx` |
| **Plannotator** | File annotations with review tags (@FIX, @TODO, @OK) | Yes | Yes | `session/[id]/annotate.tsx`, `plannotator/` |
| **Tabular Annotations** | Cell-level annotations on SQLite/CSV data | Yes | Yes | `plannotator/storage/tabularAnnotationStorage.ts` |
| **Folder Browser** | Tree-based directory picker for sessions | Yes | Yes | `components/FolderBrowser.tsx` |
| **Clickable File Paths** | Click file paths in chat messages to open | Yes | Yes | Chat message rendering |
| **Image/PDF Viewers** | Preview images and PDFs inline | Yes | Yes | `session/[id]/files.tsx` |
| **Artifacts** | Save and manage content from conversations | Yes | Yes | `app/(app)/artifacts/index.tsx` |
| **Zen (Tasks)** | Task/todo management interface | Yes | Yes | `app/(app)/zen/index.tsx` |
| **QR Code Auth** | Ed25519 keypair QR code auth | Yes | Yes* | `app/(app)/restore/index.tsx`, `QRCode.web.tsx` |
| **Manual Secret Key** | Paste base32 secret key to authenticate | Yes | Yes | `app/(app)/restore/manual.tsx` |
| **Auto-Login (Hardcoded)** | Auto-connect with hardcoded secret on first launch | Yes | Yes | `app/_layout.tsx` |
| **Real-time Sync** | WebSocket bidirectional sync with auto-reconnect | Yes | Yes | `sync/sync.ts`, `SyncSocket.ts`, `SyncSession.ts` |
| **MMKV Session Cache** | Cached sessions for instant startup | Yes | Yes | `sync/` |
| **E2E Encryption** | tweetnacl encryption for all sensitive data | Yes | Yes | `sync/` |
| **i18n (9 languages)** | Full internationalization (en, ru, pl, es + 5 more) | Yes | Yes | `sources/text/` |
| **Voice Assistant** | Real-time voice with ElevenLabs SDK | Yes | **No** | `realtime/RealtimeVoiceSession.tsx`, `.web.tsx` (stub) |
| **Deep Link Terminal** | Connect via `happy://` protocol | Yes | **No** | `app/(app)/terminal/index.tsx` |
| **OTA Updates** | Over-the-air JS bundle updates via EAS | Yes | N/A | `app.config.js`, `eas.json` |

\* = Platform-specific implementation (`.web.tsx` with different rendering approach)

## Platform-Specific Files (`.web.tsx`)

| Component | Purpose |
|-----------|---------|
| `AvatarSkia.web.tsx` | Canvas-based avatar (vs Skia native) |
| `MermaidRenderer.web.tsx` | Direct DOM rendering (vs WebView) |
| `MultiTextInput.web.tsx` | Web multiline input |
| `QRCode.web.tsx` | Web QR handling (vs expo-camera) |
| `Shaker.web.tsx` | Web shake gesture |
| `RealtimeProvider.web.tsx` | Web realtime setup |
| `RealtimeVoiceSession.web.tsx` | Stub (voice not implemented on web) |

## Native Module Dependencies

| Module | Used By | Android | Web Fallback |
|--------|---------|:-------:|:------------:|
| `expo-secure-store` | Auth token storage | Yes | localStorage |
| `expo-camera` | QR code scanning | Yes | Web QR reader |
| `@elevenlabs/react-native` | Voice assistant | Yes | None (stub) |
| `react-native-mmkv` | Session cache, annotations | Yes | AsyncStorage |

## Pending
- Auto-update "play store style" via EAS Update
- Voice assistant on web (ElevenLabs web SDK)
