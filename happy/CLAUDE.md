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

The app includes an in-app changelog feature that displays version history to users. When making changes:

### Adding Changelog Entries

1. **Always update the latest version** in `/CHANGELOG.md` when adding new features or fixes
2. **Format**: Each version follows this structure:
   ```markdown
   ## Version [NUMBER] - YYYY-MM-DD
   - Brief description of change/feature/fix
   - Another change description
   - Keep descriptions user-friendly and concise
   ```

3. **Version numbering**: Increment the version number for each release (1, 2, 3, etc.)
4. **Date format**: Use ISO date format (YYYY-MM-DD)

### Regenerating Changelog Data

After updating CHANGELOG.md, run:
```bash
npx tsx sources/scripts/parseChangelog.ts
```

This generates `sources/changelog/changelog.json` which is used by the app.

### Best Practices

- Write changelog entries from the user's perspective
- Start each entry with a verb (Added, Fixed, Improved, Updated, Removed)
- Group related changes together
- Keep descriptions concise but informative
- Focus on what changed, not technical implementation details
- The changelog is automatically parsed during `yarn ota` and `yarn ota:production`
- Always improve and expand basic changelog descriptions to be more user-friendly and informative
- Include a brief summary paragraph before bullet points for each version explaining the theme of the update

### Example Entry

```markdown
## Version 4 - 2025-01-26
- Added dark mode support across all screens
- Fixed navigation issues on tablet devices  
- Improved app startup performance by 30%
- Updated authentication flow for better security
- Removed deprecated API endpoints
```

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

The app includes a custom header component (`sources/components/Header.tsx`) that provides consistent header rendering across platforms and integrates with React Navigation.

#### Usage with React Navigation:
```tsx
import { NavigationHeader } from '@/components/Header';

// As default for all screens in Stack navigator:
<Stack
    screenOptions={{
        header: NavigationHeader,
        // Other default options...
    }}
>

// Or for individual screens:
<Stack.Screen
    name="settings"
    options={{
        header: NavigationHeader,
        headerTitle: 'Settings',
        headerSubtitle: 'Manage your preferences', // Custom extension
        headerTintColor: '#000',
        // All standard React Navigation header options are supported
    }}
/>
```

The custom header supports all standard React Navigation header options plus:
- `headerSubtitle`: Display a subtitle below the main title
- `headerSubtitleStyle`: Style object for the subtitle text

This ensures consistent header appearance and behavior across iOS, Android, and web platforms.

## Unistyles Styling Guide

### Creating Styles

Always use `StyleSheet.create` from 'react-native-unistyles':

```typescript
import { StyleSheet } from 'react-native-unistyles'

const styles = StyleSheet.create((theme, runtime) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: runtime.insets.top,
        paddingHorizontal: theme.margins.md,
    },
    text: {
        color: theme.colors.typography,
        fontSize: 16,
    }
}))
```

### Using Styles in Components

For React Native components, provide styles directly:

```typescript
import React from 'react'
import { View, Text } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'

const styles = StyleSheet.create((theme, runtime) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: runtime.insets.top,
    },
    text: {
        color: theme.colors.typography,
        fontSize: 16,
    }
}))

const MyComponent = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Hello World</Text>
        </View>
    )
}
```

For other components, use `useStyles` hook:

```typescript
import React from 'react'
import { CustomComponent } from '@/components/CustomComponent'
import { useStyles } from 'react-native-unistyles'

const MyComponent = () => {
    const { styles, theme } = useStyles(styles)
    
    return (
        <CustomComponent style={styles.container} />
    )
}
```

### Variants

Create dynamic styles with variants:

```typescript
const styles = StyleSheet.create(theme => ({
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        variants: {
            color: {
                primary: {
                    backgroundColor: theme.colors.primary,
                },
                secondary: {
                    backgroundColor: theme.colors.secondary,
                },
                default: {
                    backgroundColor: theme.colors.background,
                }
            },
            size: {
                small: {
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                },
                large: {
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                }
            }
        }
    }
}))

// Usage
const { styles } = useStyles(styles, {
    button: {
        color: 'primary',
        size: 'large'
    }
})
```

### Media Queries

Use media queries for responsive design:

```typescript
import { StyleSheet, mq } from 'react-native-unistyles'

const styles = StyleSheet.create(theme => ({
    container: {
        padding: theme.margins.sm,
        backgroundColor: {
            [mq.only.width(0, 768)]: theme.colors.background,
            [mq.only.width(768)]: theme.colors.secondary,
        }
    }
}))
```

### Breakpoints

Access current breakpoint in components:

```typescript
const MyComponent = () => {
    const { breakpoint } = useStyles()
    
    const isTablet = breakpoint === 'md' || breakpoint === 'lg'
    
    return (
        <View>
            {isTablet ? <TabletLayout /> : <MobileLayout />}
        </View>
    )
}
```

### Special Component Considerations

#### Expo Image
- **Size properties** (`width`, `height`) must be set outside of Unistyles stylesheet as inline styles
- **`tintColor` property** must be set directly on the component, not in style prop
- All other styling goes through Unistyles

```typescript
import { Image } from 'expo-image'
import { StyleSheet, useStyles } from 'react-native-unistyles'

const styles = StyleSheet.create((theme) => ({
    image: {
        borderRadius: 8,
        backgroundColor: theme.colors.background, // Other styles use theme
    }
}))

const MyComponent = () => {
    const { theme } = useStyles()
    
    return (
        <Image 
            style={[{ width: 100, height: 100 }, styles.image]}  // Size as inline styles
            tintColor={theme.colors.primary}                     // tintColor goes on component
            source={{ uri: 'https://example.com/image.jpg' }}
        />
    )
}
```

### Best Practices

1. **Always use `StyleSheet.create`** from 'react-native-unistyles'
2. **Provide styles directly** to components from 'react-native' and 'react-native-reanimated' packages
3. **Use `useStyles` hook only** for other components (but try to avoid it when possible)
4. **Always use function mode** when you need theme or runtime access
5. **Use variants** for component state-based styling instead of conditional styles
6. **Leverage breakpoints** for responsive design rather than manual dimension calculations
7. **Keep styles close to components** but extract common patterns to shared stylesheets
8. **Use TypeScript** for better developer experience and type safety

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

- **Android SDK**: `C:\Dev\android` (set in PATH)
- **AVD**: `happy_test` (pre-configured emulator)
- **ADB**: `C:\Dev\android\platform-tools\adb.exe`
- **Emulator**: `C:\Dev\android\emulator\emulator.exe`
- **GPU**: Use `-gpu host` flag (NVIDIA RTX 3050 Ti) - swiftshader causes hangs
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

- **Path with spaces/parentheses**: The project path has spaces and parentheses which cause CMake/ninja 260-char path limit errors. **Fixed** by the junction `C:\h` + Expo config plugin `withWindowsPathFix.js` (see "Windows 260-char Path Fix" section below).
- **Stale emulator locks**: If the emulator crashes, `.lock` files remain in `~/.android/avd/happy_test.avd/`. The test script auto-cleans these.
- **ANR dialogs**: The emulator may show "app isn't responding" dialogs on first boot. The script dismisses them automatically.
- **Dev client vs release APK**: The installed APK may be a release build without dev-client support. To get live Metro reloading, build with `eas build --profile development --platform android` or `npx expo run:android`.

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

#### Completed (Phase 1-6)
- **File Manager**: Arborescent tree view with CRUD (`sources/app/(app)/session/[id]/file-manager.tsx`)
- **Code Editor**: TextInput-based IDE with line numbers (`sources/components/editor/CodeEditor.tsx`)
- **Markdown Preview**: Split/edit/preview modes (`sources/app/(app)/session/[id]/markdown-preview.tsx`)
- **Plannotator**: Annotation system with review tags and MMKV persistence (`sources/app/(app)/session/[id]/annotate.tsx`)
- **SQLite Viewer**: WebView + sql.js WASM database browser with table list, SQL query, sorting, cell annotations (`sources/components/viewers/SqliteViewer.tsx`)
- **CSV Viewer**: WebView + PapaParse table viewer with sorting, filtering, cell annotations (`sources/components/viewers/CsvViewer.tsx`)
- **Tabular Annotations**: MMKV storage for cell-level annotations on SQLite/CSV data, with LLM export (`sources/plannotator/storage/tabularAnnotationStorage.ts`)
- **Folder Browser**: Tree-based directory browser using `machineBash` for new session path selection (`sources/components/FolderBrowser.tsx`, integrated in path picker)
- **Files screen non-git**: Browse/manage files even without git repository

#### Pending
- Auto-update "play store style" via EAS Update (push new features to installed APKs without Play Store)

### Deploying Code to Device

#### Prerequisites

- **Android SDK** at `C:\Dev\android` (`ANDROID_HOME`)
- **Java 17+** installed
- **Device connected** via USB or WiFi: `adb devices` should show it
- **Junction `C:\h`** must exist (see Step 0)

#### Step 0: Create junction (one-time)

The real project path has spaces and parentheses which break CMake/ninja (260-char path limit). A **Windows junction** is required — `subst` drives are NOT sufficient because ninja resolves through them to the real path.

```powershell
# In PowerShell (admin not required for junctions to own dirs)
cmd /c 'mklink /J C:\h "C:\Users\julien\OneDrive\Coding\_Projets de code\2026.01 Happy (Claude Code remote)\happy"'
```

**Verify**: `ls C:\h\package.json` should exist.

**Why not subst?** Subst creates a virtual drive letter but Node.js `require.resolve()`, Python `os.path.realpath()`, and CMake all resolve SUBST back to the real path. Also, Expo autolinking (`useExpoModules()`) fails from SUBST drives entirely. Junctions are filesystem-level NTFS redirects that most tools follow without resolving.

**Note**: Even with the junction, Node.js autolinking still resolves junction paths to real paths. The Expo config plugin `withWindowsPathFix.js` handles this (see "Windows 260-char Path Fix" below).

#### Method 1: Local dev build (for development with hot-reload)

Builds debug APK locally, installs via ADB, starts Metro for hot-reload.

```bash
cd /c/h && ANDROID_HOME=/c/Dev/android APP_ENV=development npx expo run:android
```

To target a specific device: `npx expo run:android -d` (lists connected devices).

#### Method 2: Local release APK (PREFERRED for personal APK)

Signed release APK with hardcoded secret key. No Metro needed. Self-contained.

```bash
# Prebuild if android/ doesn't exist
cd /c/h && APP_ENV=development npx expo prebuild

# Build signed release APK
cd /c/h/android && ANDROID_HOME=/c/Dev/android ./gradlew app:assembleRelease
```

**Output**: `C:\h\android\app\build\outputs\apk\release\app-release.apk` (~234 MB)

**Install on device**:
```bash
# If same signing key as existing install:
adb install -r C:\h\android\app\build\outputs\apk\release\app-release.apk

# If different signing key (e.g. switching from EAS build to local):
adb uninstall com.slopus.happy.dev
adb install C:\h\android\app\build\outputs\apk\release\app-release.apk
```

**Signing config** (already set up in `android/app/build.gradle` + `android/gradle.properties`):
- Keystore: `happy.jks` at repo root (path: `../../../happy.jks` from `android/app/`)
- Key alias: `happy-key`
- Passwords in `android/gradle.properties` (`HAPPY_RELEASE_*` properties)

**Auto-login**: The hardcoded secret is loaded from `.env.local` (`EXPO_PUBLIC_HARDCODED_SECRET`) and auto-authenticates on first launch.

#### Method 3: EAS Build (cloud, backup option)

Cloud build on Linux servers. Avoids all Windows path issues. Free tier = 10 builds/month.

```bash
# Login first: eas login (or export EXPO_TOKEN=...)
export EAS_SKIP_AUTO_FINGERPRINT=1

# IMPORTANT: working tree must be clean (requireCommit: true in eas.json)
cd /c/h && eas build --platform android --profile development --non-interactive
```

**EAS setup:**
- Owner: `jlt13400` | Project: `@jlt13400/happy`
- `eas.json` has `"requireCommit": true` → uses `git archive` (fixes Windows tar Permission Denied bug)
- `.easignore` excludes `.cxx/` build artifacts
- `credentials.json` has local keystore config
- Dashboard: https://expo.dev/accounts/jlt13400/projects/happy/builds

#### OTA Updates (JS-only changes, no rebuild needed)

Push JS bundle updates to already-installed APKs. Works regardless of how the APK was built.

```bash
# Preview channel (runs typecheck + changelog parse + push)
yarn ota

# Production channel (via EAS Workflow)
yarn ota:production

# Manual push to development branch (Android only, no iPhone)
EAS_SKIP_AUTO_FINGERPRINT=1 eas update --branch development --platform android --message "description" --non-interactive
```

**IMPORTANT**: Always use `--platform android` — there is no iPhone to target. This skips the iOS bundle and speeds up the push.

**Requirements for OTA to work:**
- The APK must include `expo-updates` (all builds do)
- Runtime version must match (`"18"` currently). Bump it when native code changes.
- Channel must match: dev APK → `development` channel, preview → `preview`, etc.
- `app.config.js` sets the channel via `updates.requestHeaders["expo-channel-name"]`

#### Quick Reference

| Task | Command |
|------|---------|
| Dev build + Metro | `cd /c/h && ANDROID_HOME=/c/Dev/android APP_ENV=development npx expo run:android` |
| Release APK (local) | `cd /c/h/android && ANDROID_HOME=/c/Dev/android ./gradlew app:assembleRelease` |
| Cloud build (EAS) | `cd /c/h && eas build --platform android --profile development --non-interactive` |
| OTA update (dev) | `EAS_SKIP_AUTO_FINGERPRINT=1 eas update --branch development --platform android --message "..." --non-interactive` |
| OTA update (preview) | `yarn ota` |
| Install APK on device | `adb install -r C:\h\android\app\build\outputs\apk\release\app-release.apk` |
| Uninstall + reinstall | `adb uninstall com.slopus.happy.dev && adb install <apk>` |
| Create junction (once) | `cmd /c 'mklink /J C:\h "<full-path>\happy"'` |

#### Known Issues (all solved)

- ~~**260-char path limit** (ninja `Stat()`/`mkdir()`)~~ → Fixed: junction `C:\h` + Expo config plugin `withWindowsPathFix.js` (see section below)
- ~~**libsodium.so "not a regular file"**~~ → Fixed: `patches/@more-tech+react-native-libsodium+1.5.5.patch` copies .so outside OneDrive (NTFS reparse tags confuse Java's `Files.isRegularFile()`)
- ~~**react-native-audio-api path explosion**~~ → Fixed: excluded from Android autolinking via `react-native.config.js` + `app.config.js` (unused on Android)
- ~~**`tar: Permission denied`** (EAS)~~ → Fixed: `requireCommit: true` uses `git archive`
- ~~**Archive too large (375 MB)**~~ → Fixed: 204 MB with `git archive`
- ~~**`.cxx/` crashes tar**~~ → Fixed: `.cxx/` in `.gitignore` + `.easignore`
- ~~**Signing mismatch on install**~~ → Fixed: `adb uninstall` then fresh install
- ~~**Kotlin daemon crash** (InMemoryStorage)~~ → Gradle auto-fallback to compile without daemon. Transient, no action needed.

**If `prebuild --clean` is run**: the signing config in `android/app/build.gradle` and `android/gradle.properties` will be lost. Re-apply the `signingConfigs.release` block and the `HAPPY_RELEASE_*` properties. The Windows path fix is auto-applied by the config plugin.

### Windows 260-char Path Fix (Deep Dive)

The project lives at a ~120-char path. CMake/ninja encode absolute source paths into build directory structures, easily exceeding Windows MAX_PATH (260 chars). This is a multi-layered problem because Node.js autolinking resolves the `C:\h` junction to the real path.

**Architecture of the fix** (all handled by `plugins/withWindowsPathFix.js` config plugin + `plugins/withWindowsPathFix.gradle.txt` Groovy template):

| Layer | Problem | Fix |
|-------|---------|-----|
| **Library CMake builds** | `cmake.path` uses real resolved path → `CMAKE_CURRENT_SOURCE_DIR` is long | Override `cmakeConfig.path` in `afterEvaluate` to use junction path |
| **App module autolinking** | `Android-autolinking.cmake` has `add_subdirectory()` with real paths from `autolinking.json` | `doLast` hook on `generateAutolinkingNewArchitectureFiles` task to find-and-replace paths |
| **CMake arguments** | `-DPROJECT_BUILD_DIR`, `-DREACT_ANDROID_DIR` use real paths | Replace real prefix with junction prefix in `cmake.arguments` |
| **Build directories** | `project.buildDir` resolves through junction | Redirect all subproject `buildDir` through junction path |
| **`.cxx` staging** | Build staging directory paths are long | Redirect to `C:\tmp\cxx\<project>` |

**Additional fixes** (separate from config plugin):

| Fix | File | Description |
|-----|------|-------------|
| **libsodium native build** | `patches/@more-tech+react-native-libsodium+1.5.5.patch` | Copies pre-built `.so` to `C:/tmp/ls-lib/` (outside OneDrive, avoids NTFS reparse tag issue). Copies source files to `C:/tmp/ls-src/` for short compilation paths. |
| **react-native-audio-api** | `react-native.config.js` + `app.config.js` | Excluded from Android autolinking (unused module, CMake build adds path pressure) |

**Key insight**: `subst` drives do NOT work because Node.js, Python, Java, and CMake all resolve SUBST back to real paths. Windows junctions (NTFS) are preserved by most tools BUT Node.js `require.resolve()` still resolves through them. Hence the Gradle-level path rewriting.

### Bug Workflow (Testing on Device)

When testing features on the S22 and finding bugs, follow this workflow for **each bug**:

1. **Create GitHub issue**: `gh issue create --repo theflysurfer/Happier --title "..." --body "..."`
2. **Fix the code**
3. **Typecheck**: `NODE_OPTIONS="--max-old-space-size=8192" ./node_modules/.bin/tsc --noEmit` (0 errors excluding spec files)
4. **Commit**: Reference the issue number (`Closes #N`)
5. **OTA push**: `EAS_SKIP_AUTO_FINGERPRINT=1 eas update --branch development --platform android --message "fix: ... (#N)" --non-interactive`
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