# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `yarn start` - Start the Expo development server
- `yarn ios` - Run the app on iOS simulator
- `yarn android` - Run the app on Android emulator
- `yarn web` - Run the app in web browser
- `yarn prebuild` - Generate native iOS and Android directories
- `yarn typecheck` - Run TypeScript type checking after all changes

### Starting Expo Web from Claude Code (Windows)

On Windows, `npx expo start --web` and `yarn web` fail in background mode because `run_in_background` spawns via `cmd.exe` which doesn't have Node.js in PATH.

**Working method** — call the Expo CLI script directly with `node.exe`:

```bash
# Start Expo web server (background, port 19006)
cd "<project>/happy" && NODE_OPTIONS=--max-old-space-size=4096 \
  "/c/Program Files/nodejs/node.exe" "./node_modules/@expo/cli/build/bin/cli" \
  start --web --port 19006
```

Use `run_in_background: true` with a 600000ms timeout. First cold compilation takes ~50-60s (3000+ modules). Subsequent loads are cached and instant.

**Batch file alternative** (for manual use or cmd.exe): `C:\tmp\start-expo-web.bat`

**Known issues**:
- **Metro file watcher timeout**: The FallbackWatcher (used on Windows without Watchman) can timeout on OneDrive paths. Fix: increase `MAX_WAIT_TIME` in `node_modules/metro-file-map/src/Watcher.js` from 240000 to 600000. This patch is lost on `yarn install`.
- **DO NOT use `node -e "require('@expo/cli')"`**: Metro's Jest worker child processes inherit the `-e` script and try to start their own Expo servers, causing "Port 19006 is being used" cascade failures on cold builds. Only works with warm cache.
- **`--clear` flag**: Resets Metro cache. Use only when bundle returns 500 errors. Triggers a full re-crawl which is slow on OneDrive.

**Important**: Always use `http://localhost:19006` (not LAN IP like `192.168.x.x`) — `crypto.subtle` (Web Crypto API) is only available on secure contexts (HTTPS or localhost). Using the LAN IP causes `TypeError: Cannot read properties of undefined (reading 'digest')` in expo-crypto.

### macOS Desktop (Tauri)
- `yarn tauri:dev` - Run macOS desktop app with hot reload
- `yarn tauri:build:dev` - Build development variant
- `yarn tauri:build:preview` - Build preview variant
- `yarn tauri:build:production` - Build production variant

### Testing
- `yarn test` - Run tests in watch mode (Jest with jest-expo preset)
- No existing tests in the codebase yet

### Production
- `yarn ota` - Deploy over-the-air updates via EAS Update to production branch

## Changelog Management

Update `/CHANGELOG.md` when adding features/fixes. Format: `## Version [N] - YYYY-MM-DD` with bullet points starting with verbs (Added, Fixed, Improved). Include a summary paragraph before bullets. User-facing language, not technical.

After editing, regenerate: `npx tsx sources/scripts/parseChangelog.ts` (auto-run by `yarn ota`).

## Architecture Overview

### Core Technology Stack
- **React Native** with **Expo** SDK 54
- **TypeScript** with strict mode enabled
- **Unistyles** for cross-platform styling with themes and breakpoints
- **Expo Router v6** for file-based routing
- **Socket.io** for real-time WebSocket communication
- **tweetnacl** for end-to-end encryption

### Project Structure
```
sources/
├── app/              # Expo Router screens
├── auth/             # Authentication logic (QR code based)
├── components/       # Reusable UI components
├── sync/             # Real-time sync engine with encryption
└── utils/            # Utility functions
```

### Key Architectural Patterns

1. **Authentication Flow**: QR code-based authentication using expo-camera with challenge-response mechanism
2. **Data Synchronization**: WebSocket-based real-time sync with automatic reconnection and state management
3. **Encryption**: End-to-end encryption using tweetnacl for all sensitive data
4. **State Management**: React Context for auth state, custom reducer for sync state
5. **Platform-Specific Code**: Separate implementations for web vs native when needed

### Development Guidelines

- Use **4 spaces** for indentation
- Use **yarn** instead of npm for package management
- Path alias `@/*` maps to `./sources/*`
- TypeScript strict mode is enabled - ensure all code is properly typed
- Follow existing component patterns when creating new UI components
- Real-time sync operations are handled through SyncSocket and SyncSession classes
- Store all temporary scripts and any test outside of unit tests in sources/trash folder
- When setting screen parameters ALWAYS set them in _layout.tsx if possible this avoids layout shifts
- **Never use Alert module from React Native, always use @sources/modal/index.ts instead**
- **Always apply layout width constraints** from `@/components/layout` to full-screen ScrollViews and content containers for responsive design across device sizes
- Always run `yarn typecheck` after all changes to ensure type safety

### Internationalization (i18n) Guidelines

**CRITICAL: Always use the `t(...)` function for ALL user-visible strings**

#### Basic Usage
```typescript
import { t } from '@/text';

// ✅ Simple constants
t('common.cancel')              // "Cancel"
t('settings.title')             // "Settings"

// ✅ Functions with parameters
t('common.welcome', { name: 'Steve' })           // "Welcome, Steve!"
t('time.minutesAgo', { count: 5 })               // "5 minutes ago"
t('errors.fieldError', { field: 'Email', reason: 'Invalid format' })
```

#### Adding New Translations

1. **Check existing keys first** - Always check if the string already exists in the `common` object or other sections before adding new keys
2. **Think about context** - Consider the screen/component context when choosing the appropriate section (e.g., `settings.*`, `session.*`, `errors.*`)
3. **Add to ALL languages** - When adding new strings, you MUST add them to all language files in `sources/text/translations/` (currently: `en`, `ru`, `pl`, `es`)
4. **Use descriptive key names** - Use clear, hierarchical keys like `newSession.machineOffline` rather than generic names
5. **Language metadata** - All supported languages and their metadata are centralized in `sources/text/_all.ts`

#### Translation Structure
```typescript
// String constants for static text
cancel: 'Cancel',

// Functions for dynamic text with typed parameters  
welcome: ({ name }: { name: string }) => `Welcome, ${name}!`,
itemCount: ({ count }: { count: number }) => 
    count === 1 ? '1 item' : `${count} items`,
```

#### Key Sections
- `common.*` - Universal strings used across the app (buttons, actions, status)
- `settings.*` - Settings screen specific strings
- `session.*` - Session management and display
- `errors.*` - Error messages and validation
- `modals.*` - Modal dialogs and popups
- `components.*` - Component-specific strings organized by component name

#### Language Configuration

The app uses a centralized language configuration system:

- **`sources/text/_all.ts`** - Centralized language metadata including:
  - `SupportedLanguage` type definition
  - `SUPPORTED_LANGUAGES` with native names and metadata
  - Helper functions: `getLanguageNativeName()`, `getLanguageEnglishName()`
  - Language constants: `SUPPORTED_LANGUAGE_CODES`, `DEFAULT_LANGUAGE`

- **Adding new languages:**
  1. Add the language code to the `SupportedLanguage` type in `_all.ts`
  2. Add language metadata to `SUPPORTED_LANGUAGES` object
  3. Create new translation file in `sources/text/translations/[code].ts`
  4. Add import and export in `sources/text/index.ts`

#### Important Rules
- **Never hardcode strings** in JSX - always use `t('key')`
- **Dev pages exception** - Development/debug pages can skip i18n
- **Check common first** - Before adding new keys, check if a suitable translation exists in `common`
- **Context matters** - Consider where the string appears to choose the right section
- **Update all languages** - New strings must be added to every language file
- **Use centralized language names** - Import language names from `_all.ts` instead of translation keys
- **Always re-read translations** - When new strings are added, always re-read the translation files to understand the existing structure and patterns before adding new keys
- **Use translations for common strings** - Always use the translation function `t()` for any user-visible string that is translatable, especially common UI elements like buttons, labels, and messages
- **Use the i18n-translator agent** - When adding new translatable strings or verifying existing translations, use the i18n-translator agent to ensure consistency across all language files
- **Beware of technical terms** - When translating technical terms, consider:
  - Keep universally understood terms like "CLI", "API", "URL", "JSON" in their original form
  - Translate terms that have well-established equivalents in the target language
  - Use descriptive translations for complex technical concepts when direct translations don't exist
  - Maintain consistency across all technical terminology within the same language

#### i18n-Translator Agent

When working with translations, use the **i18n-translator** agent for:
- Adding new translatable strings to the application
- Verifying existing translations across all language files
- Ensuring translations are consistent and contextually appropriate
- Checking that all required languages have new strings
- Validating that translations fit the UI context (headers, buttons, multiline text)

The agent should be called whenever new user-facing text is introduced to the codebase or when translation verification is needed.

### Important Files

- `sources/sync/types.ts` - Core type definitions for the sync protocol
- `sources/sync/reducer.ts` - State management logic for sync operations
- `sources/auth/AuthContext.tsx` - Authentication state management
- `sources/app/_layout.tsx` - Root navigation structure

### Custom Header Component

Use `NavigationHeader` from `@/components/Header.tsx` as the `header` prop in Stack navigators. Supports all standard React Navigation header options plus `headerSubtitle` and `headerSubtitleStyle`. Set headers in `_layout.tsx`, not in individual pages.

## Unistyles Styling Guide

**Full guide**: See `../docs/UNISTYLES.md`

**Key rules:**
- Always use `StyleSheet.create` from `react-native-unistyles`
- Provide styles directly to RN components; use `useStyles` hook only for custom components
- Use function mode `(theme, runtime) => ({...})` when you need theme/runtime access
- Use variants for state-based styling, breakpoints for responsive design
- **Expo Image**: `width`/`height` must be inline styles, `tintColor` on component prop (not in stylesheet)
- Never use unistyles for expo-image, use classical approach

## Project Scope and Priorities

- This project targets Android, iOS, and web platforms
- Web is considered a secondary platform
- Avoid web-specific implementations unless explicitly requested
- Keep dev pages without i18n, always use t(...) function to translate all strings, when adding new string add it to all languages, think about context before translating.
- Core principles: never show loading error, always just retry. Always sync main data in "sync" class. Always use invalidate sync for it. Always use Item component first and only then you should use anything else or custom ones for content. Do not ever do backward compatibility if not explicitly stated.
- Never use custom headers in navigation, almost never use Stack.Page options in individual pages. Only when you need to show something dynamic. Always show header on all screens.
- store app pages in @sources/app/(app)/
- use ItemList for most containers for UI, if it is not custom like chat one.
- Always use expo-router api, not react-navigation one.
- Always try to use "useHappyAction" from @sources/hooks/useHappyAction.ts if you need to run some async operation, do not handle errors, etc - it is handled automatically.
- Never use unistyles for expo-image, use classical one
- Always use "Avatar" for avatars
- No backward compatibliity ever
- When non-trivial hook is needed - create a dedicated one in hooks folder, add a comment explaining it's logic
- Always put styles in the very end of the component or page file
- Always wrap pages in memo
- For hotkeys use "useGlobalKeyboard", do not change it, it works only on Web
- Use "AsyncLock" class for exclusive async locks

## Project Context: Personal APK (No QR Code)

### Goal
Build a personal APK that auto-connects to Julien's Happy account without needing QR code scanning. The app should launch directly into the authenticated state.

### Ecosystem Overview

| Component | Repository | Purpose |
|-----------|-----------|---------|
| **Mobile App** (this repo) | `theflysurfer/happy` / `slopus/happy` | React Native/Expo client |
| **Server** | `slopus/happy-server` | Fastify backend, PostgreSQL, Redis |
| **CLI** | `slopus/happy-cli` | Desktop CLI (`happy` command) |
| **Self-hosted** | `sylvan-lang/happy-self-hosted` | Docker self-hosted bundle |
| **Docs** | `slopus/slopus.github.io` | Documentation website |

**Production server**: `https://api.cluster-fluster.com`
**Bundle IDs**: `com.slopus.happy.dev` (dev) / `com.slopus.happy.preview` (preview) / `com.ex3ndr.happy` (prod)

### Authentication Architecture

The auth system is based on **Ed25519 keypairs** derived from a 32-byte master secret:

```
Master Secret (32 bytes)
  → crypto_sign_seed_keypair(secret) → Ed25519 keypair
  → Sign challenge → Server verifies → Issues JWT token
```

**Three auth paths exist:**
1. **QR Code** (`/restore/index.tsx`): Ephemeral keypair exchange via QR scan
2. **Manual Secret Key** (`/restore/manual.tsx`): Paste base32-formatted secret key
3. **Create Account** (`/index.tsx`): Generate new random 32-byte secret

**Credential storage:**
- Native: `expo-secure-store` (key: `auth_credentials`)
- Web: `localStorage`
- Format: `{ token: string, secret: string }` (secret is base64url)

**CLI credentials** (`~/.happy/access.key`): Different format - `{ token, encryption: { publicKey, machineKey } }`

### Key Files for Auth Modification

| File | Purpose |
|------|---------|
| `sources/app/_layout.tsx` | App init - loads credentials from TokenStorage |
| `sources/auth/AuthContext.tsx` | React context: `login(token, secret)` / `logout()` |
| `sources/auth/tokenStorage.ts` | Secure credential CRUD |
| `sources/auth/authGetToken.ts` | Challenge-response → JWT exchange |
| `sources/auth/authChallenge.ts` | Ed25519 signing of challenge |
| `sources/auth/secretKeyBackup.ts` | Base32 formatting for backup display |
| `sources/app/(app)/index.tsx` | Home screen - shows NotAuthenticated or Authenticated |
| `sources/app/(app)/settings/account.tsx` | Shows/copies secret key in settings |
| `sources/sync/serverConfig.ts` | Server URL config (env var: `EXPO_PUBLIC_HAPPY_SERVER_URL`) |

### Implementation Status: Auto-Login APK

**DONE** - Auto-login implemented in `sources/app/_layout.tsx`:
- Julien's secret key is hardcoded as `HARDCODED_SECRET` constant (base32 format)
- On first launch with no stored credentials, the app automatically:
  1. Normalizes the base32 secret key to base64url
  2. Performs challenge-response auth with the server (`/v1/auth`)
  3. Stores credentials in secure storage
  4. Boots into authenticated state
- Subsequent launches use stored credentials (no network call needed)
- If the user logs out, the app auto-re-logs in on next launch

**To build the APK**: `yarn android` or `eas build --platform android --profile preview`

### Important: Secret Key vs CLI Token

- The **app secret** is a 32-byte master secret (base64url) that derives Ed25519 keypairs
- The **CLI token** in `~/.happy/access.key` is a JWT - it does NOT contain the master secret
- The CLI `encryption.publicKey` is NOT the same as the account secret
- To get the account secret: open the app > Settings > Account > reveal secret key

## Android Testing

### MCP Mobile Testing Rules

- **ALWAYS use the MCP mobile tool** (`mcp__mobile__mobile`) for all device interaction — NEVER use ADB directly via Bash
- **At session start**: Call `keep_awake(enabled=true, mode="screen_on")` to prevent screen timeout during testing. If it times out, retry or use `shell("settings put global stay_on_while_plugged_in 2")` as fallback
- **ADB timeouts**: The MCP mobile tool can intermittently timeout (ETIMEDOUT). Simply retry the command — screenshots usually work even when shell commands timeout
- **Lock screen**: If the phone locks (keyguard), send `shell("input keyevent 82")` to bring up PIN entry. The PIN must be entered manually by the user

### Testing Helper Script

A resilient testing script is available at `scripts/android-test.sh`:

```bash
./scripts/android-test.sh <command>
```

| Command | Description |
|---------|-------------|
| `start-emulator` | Start emulator (cleans stale locks, GPU host acceleration) |
| `stop-emulator` | Stop all emulators |
| `devices` | List connected devices/emulators |
| `install` | Check app installation on device |
| `launch` | Launch Happy app |
| `screenshot` | Take screenshot -> `./screenshots/` |
| `metro` | Start Metro with port forwarding |
| `connect-device <ip>` | Connect to phone via WiFi ADB |
| `full-test` | Full cycle: emulator + install + launch + screenshot |
| `status` | Show full testing status |

### Environment

- **ADB**: `C:\tools\adb\adb.exe` (standalone, no full SDK locally)
- **Android builds**: Done on VPS only (see `../docs/BUILD-ANDROID.md`)
- **App package**: `com.slopus.happy.dev` (development variant)

### Real Device Testing (USB)

1. Enable **Developer Options** on the phone (tap Build Number 7 times)
2. Enable **USB Debugging** in Developer Options
3. Connect phone via USB cable
4. Run `adb devices` to verify connection (accept the dialog on phone)
5. Run `./scripts/android-test.sh launch`

### Real Device Testing (WiFi - Android 11+)

1. Enable **Wireless Debugging** in Developer Options
2. Ensure phone and PC are on the same WiFi network
3. Run `./scripts/android-test.sh connect-device <phone-ip>`
4. Run `./scripts/android-test.sh launch`

### Known Issues

- **Dev client vs release APK**: The installed APK may be a release build without dev-client support. To get live Metro reloading, build with `eas build --profile development --platform android`.

### OTA Updates (EAS Update)

The app already supports OTA updates via `expo-updates`:

- **Preview**: `yarn ota` (parses changelog, typechecks, pushes to preview channel)
- **Production**: `yarn ota:production` (uses EAS workflow `ota.yaml`)
- **Runtime version**: `"18"` (in `app.config.js`)
- **Channels**: `development`, `preview`, `production` (configured in `eas.json`)
- **Update URL**: `https://u.expo.dev/2c5ad154-57fd-417d-b434-ffcd710ea311`

To push code changes to an already-installed APK without rebuilding:
```bash
# Preview channel (dev testing)
yarn ota

# Production channel (user-facing)
yarn ota:production
```

### Feature Implementation Status

**Full matrix**: See `../docs/FEATURES.md`

**Summary**: 25+ features on Android + Browser. Voice assistant is Android-only. Platform-specific files use `.web.tsx` suffix. Native modules (expo-secure-store, expo-camera, MMKV) have web fallbacks (localStorage, web QR reader, AsyncStorage).

### Deploying Code to Device

**Full build guide**: See `../docs/BUILD-ANDROID.md`

- **Native builds**: VPS only (`ssh automation@69.62.108.82`). No local Android SDK.
- **ADB**: `C:\tools\adb\adb.exe` (standalone, for `adb install` only)
- **OTA pushes**: Run locally, no SDK needed

**Quick OTA push** (JS-only changes, no rebuild):
```bash
# Manual push to production (ALWAYS use --branch production)
EAS_SKIP_AUTO_FINGERPRINT=1 eas update --branch production --platform android --message "description" --non-interactive

# Or via script (runs typecheck + changelog parse)
yarn ota
```

**OTA critical rules:**
- Channel is ALWAYS `production` (hardcoded in `app.config.js`). `--branch development` will NOT be picked up.
- Always use `--platform android` (no iPhone)
- Git tree must be clean before push (`requireCommit: true`)
- Runtime version `"18"` — bump when native code changes
- OTA rollback: `eas update:roll-back-to-embedded --branch production --platform android --runtime-version 18`

**Install APK**: `adb install -r <apk-path>` (uninstall first if signing key changed)

### Bug Workflow (Testing on Device)

When testing features on the S22 and finding bugs, follow this workflow for **each bug**:

1. **Create GitHub issue**: `gh issue create --repo theflysurfer/Happier --title "..." --body "..."`
2. **Fix the code**
3. **Typecheck**: `NODE_OPTIONS="--max-old-space-size=8192" ./node_modules/.bin/tsc --noEmit` (0 errors excluding spec files)
4. **Commit**: Reference the issue number (`Closes #N`)
5. **OTA push**: `EAS_SKIP_AUTO_FINGERPRINT=1 eas update --branch production --platform android --message "fix: ... (#N)" --non-interactive`
6. **Verify on device**: Force-close the app, reopen, check the fix

**Git tree must be clean** before OTA push (`requireCommit: true`). Commit all changes first.

### Node.js Memory (OOM Prevention)

- `NODE_OPTIONS="--max-old-space-size=8192"` is set in PowerShell profile and Windows User env var
- **CRITICAL**: If this is set to `512` (old value), Claude Code sessions and `tsc` will crash with `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`
- The PowerShell profile value overrides the Windows env var — always check both
- Verify: `node -e "console.log(Math.round(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024), 'MB')"` should show ~8240 MB

### TypeScript Note
- `sources/sync/typesRaw.spec.ts` has ~112 pre-existing type errors (union type narrowing issues). These are NOT from our changes and do not affect the app.
- `yarn typecheck` should show 0 errors excluding `typesRaw.spec.ts`