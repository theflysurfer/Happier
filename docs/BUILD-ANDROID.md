# Android Build Guide

## Quick Reference

| Task | Command |
|------|---------|
| **Build APK (VPS)** | `ssh automation@69.62.108.82` then see VPS Build below |
| **Transfer APK to PC** | `scp automation@69.62.108.82:~/happy/packages/happy-app/android/app/build/outputs/apk/release/app-release.apk /c/tmp/app-release-vps.apk` |
| **Install APK on S22** | `adb install -r /c/tmp/app-release-vps.apk` |
| **Uninstall + reinstall** | `adb uninstall com.slopus.happy.dev && adb install <apk>` |
| **OTA update** | `EAS_SKIP_AUTO_FINGERPRINT=1 eas update --branch production --platform android --message "..." --non-interactive` |
| **OTA update (script)** | `yarn ota` |
| **OTA rollback** | `EAS_SKIP_AUTO_FINGERPRINT=1 eas update:roll-back-to-embedded --branch production --platform android --runtime-version 18 --message "rollback" --non-interactive` |
| **Cloud build (EAS)** | `eas build --platform android --profile development --non-interactive` |

## Local Setup

- **ADB only**: `C:\tools\adb\adb.exe` (standalone, no full Android SDK locally)
- **No local Android builds** — all native builds are done on the VPS
- **OTA pushes** run from the local project dir (OneDrive) — no SDK needed

---

## VPS Build (Hostinger — recommended, only method)

**VPS**: `automation@69.62.108.82` (Ubuntu 24.04, 15 GB RAM)

No 260-char path workarounds, no junctions, no libsodium manual patch, no file watcher crash, no OneDrive interference.

### Prerequisites (already installed)

- Java 17: `openjdk-17-jdk-headless`
- Android SDK: `~/android-sdk` (platforms;android-35, android-36, build-tools;35.0.0, 36.0.0, NDK 27.1.12297006, cmake;3.22.1)
- Node.js 20 + Yarn
- Git SSH access to `slopus/happy`

### CRITICAL: Upstream is a monorepo

```
~/happy/
├── packages/
│   ├── happy-app/     ← THE APP (has app.config.js, react-native)
│   ├── happy-agent/
│   ├── happy-cli/
│   ├── happy-server/
│   └── happy-wire/
├── package.json       ← workspace root (nohoist: react-native)
└── node_modules/      ← shared deps (BUT react-native is in happy-app/node_modules/)
```

**You MUST run prebuild and build from `packages/happy-app/`**, NOT from the monorepo root. `react-native` is in `packages/happy-app/node_modules/` due to nohoist config.

### Build Steps

```bash
ssh automation@69.62.108.82

# 1. Pull latest code
cd ~/happy && git pull

# 2. Install dependencies (from monorepo root)
cd ~/happy && yarn install
# NOTE: No libsodium patch issues on Linux! patch-package works perfectly.

# 3. Copy .env.local to the app workspace (if not already there)
cp ~/happy/.env.local ~/happy/packages/happy-app/.env.local

# 4. Prebuild from the APP workspace (NOT from root!)
cd ~/happy/packages/happy-app
ANDROID_HOME=$HOME/android-sdk APP_ENV=development npx expo prebuild --platform android --no-install

# 5. Fix gradle.properties (prebuild resets to defaults)
cd ~/happy/packages/happy-app/android
sed -i 's/org.gradle.jvmargs=-Xmx2048m/org.gradle.jvmargs=-Xmx4096m/' gradle.properties
sed -i 's/-XX:MaxMetaspaceSize=512m/-XX:MaxMetaspaceSize=1024m/' gradle.properties
sed -i 's/reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64/reactNativeArchitectures=arm64-v8a/' gradle.properties

# 6. Build release APK (skip lint - causes Metaspace OOM)
cd ~/happy/packages/happy-app/android
ANDROID_HOME=$HOME/android-sdk APP_ENV=development \
  ./gradlew app:assembleRelease \
  -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease

# Output: ~/happy/packages/happy-app/android/app/build/outputs/apk/release/app-release.apk (~103 MB)
# First build: ~20 min | Subsequent (cached): <1 min
```

### Transfer to PC + install on S22

```bash
# From Windows PC:
scp automation@69.62.108.82:~/happy/packages/happy-app/android/app/build/outputs/apk/release/app-release.apk /c/tmp/app-release-vps.apk

# Install on S22 (connect USB first):
adb uninstall com.slopus.happy.dev 2>/dev/null
adb install /c/tmp/app-release-vps.apk
```

### VPS Build Traps

1. **Run from `packages/happy-app/`**, NOT from root — Node can't find react-native from root level.
2. **MaxMetaspaceSize must be 1024m** (not 512m) — lint analyzer runs out of Metaspace at 512m.
3. **Skip ALL lint tasks** — even with 1024m, lint can still fail. The `-x` flags are safe for personal dev APK.
4. **`--no-install` on prebuild** — on headless Linux, prebuild asks interactive questions without it.
5. **Disk space** — need ~20 GB. Docker cleanup: `docker image prune -a --filter "until=720h"` recovers ~10-15 GB.
6. **No `--no-watch-fs` needed** — Gradle file watcher works fine on Linux.
7. **No libsodium manual patch** — `patch-package` applies correctly on Linux.

### CRITICAL: Always build RELEASE, never DEBUG

- `assembleRelease` = JS bundle embedded, standalone, auto-login works, NO Metro needed
- `assembleDebug` = needs Metro running, shows Expo dev launcher, USELESS for personal APK

---

## OTA Updates (JS-only changes, no rebuild needed)

Push JS bundle updates to already-installed APKs. Runs from the local project dir.

**WARNING: OTA compatibility** — The JS bundle should ideally come from the same codebase used to build the APK. If the APK was built on VPS (slopus/happy monorepo), push OTAs from the VPS too. Pushing from the local fork may work if the code is identical, but native module mismatches can cause blank screens. Use `eas update:roll-back-to-embedded` to recover.

```bash
# Preview channel (runs typecheck + changelog parse + push)
yarn ota

# Production channel (via EAS Workflow)
yarn ota:production

# Manual push to production branch (Android only, no iPhone)
EAS_SKIP_AUTO_FINGERPRINT=1 eas update --branch production --platform android --message "description" --non-interactive
```

**Rules:**
- **CRITICAL: Channel is ALWAYS `production`** — `app.config.js` hardcodes `"expo-channel-name": "production"`. ALL OTA updates must target `--branch production`.
- Always use `--platform android` (no iPhone)
- Git tree must be clean (`requireCommit: true`)
- Runtime version `"18"` — bump when native code changes
- **Rollback**: `eas update:roll-back-to-embedded --branch production --platform android --runtime-version 18`

---

## EAS Build (cloud, backup option)

Cloud build on Linux servers. Avoids all local issues. Free tier = 10 builds/month.

```bash
export EAS_SKIP_AUTO_FINGERPRINT=1
eas build --platform android --profile development --non-interactive
```

**EAS setup:**
- Owner: `jlt13400` | Project: `@jlt13400/happy`
- `eas.json` has `"requireCommit": true` → uses `git archive`
- `.easignore` excludes `.cxx/` build artifacts
- Dashboard: https://expo.dev/accounts/jlt13400/projects/happy/builds

---

## Historical: Windows Local Build (DEPRECATED)

> **This method is no longer used.** The Android SDK, build dirs (`C:\Dev\happy-v6`), Gradle cache (`~/.gradle`), and junction (`C:\h`) have been purged from the local machine (Feb 2026). All builds now go through the VPS.

The Windows local build had 8+ traps including 260-char path limits, libsodium binary patch failures, Gradle daemon crashes, OneDrive NTFS reparse tag issues, and `gradle-fileevents.dll` native crashes. The `plugins/withWindowsPathFix.js` and `plugins/withWindowsPathFix.gradle.txt` files remain in the repo for reference but are not actively used.

Key issues that made Windows builds unreliable:
- CMake/ninja paths exceed MAX_PATH (260 chars) due to OneDrive path length
- `patch-package` can't apply 5.7MB binary libsodium patch on Windows
- `gradle-fileevents.dll` crashes with 4 ABIs + Xmx2048m
- OneDrive NTFS reparse tags confuse Java's `Files.isRegularFile()`
- `subst` drives don't work (all tools resolve back to real paths)
- Node.js `require.resolve()` resolves through junctions
