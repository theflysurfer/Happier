# Happier — Fork of Happy

Personal fork of [slopus/happy](https://github.com/slopus/happy) with custom features for remote AI coding from mobile.

## Structure

This repo is a **flat extraction** from the upstream monorepo:

| This repo | Upstream | Description |
|-----------|----------|-------------|
| `happy/` | `packages/happy-app` | React Native + Expo mobile/web app |
| `happy-cli/` | `packages/happy-cli` | CLI wrapper (Claude, Codex, Gemini agents) |
| `docs/` | — | Build guides, session reports |

> Upstream also has `happy-server`, `happy-wire`, `happy-agent` packages — we use the hosted server at `api.cluster-fluster.com`.

## Branches

| Branch | Purpose |
|--------|---------|
| `master` | Our working branch with custom features |
| `upstream-snapshot` | Mirror of `upstream/main` for reference |

## Syncing with upstream

Structure differs (flat vs monorepo), so direct merge is impossible. Cherry-pick manually:

```bash
git fetch upstream
git log upstream-snapshot..upstream/main --oneline  # see new commits
# Cherry-pick interesting ones, adapting paths:
#   packages/happy-app/... → happy/...
#   packages/happy-cli/... → happy-cli/...
```

## Building

- **Android APK**: Built on VPS only — see [docs/BUILD-ANDROID.md](docs/BUILD-ANDROID.md)
- **OTA updates**: `yarn ota` from `happy/` (no build needed)
- **Web dev**: `yarn web` from `happy/`
- **ADB**: `C:\tools\adb\adb.exe` (standalone, no local SDK)

## Key customizations vs upstream

- Auto-login APK (hardcoded secret, no QR scan)
- Plannotator (plan review with annotations)
- File Manager with code editor
- Memory monitor
- Session transcript preview
- Windows path fixes for Expo/Gradle
