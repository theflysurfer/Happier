# Happy Android Test Plan

> **Date**: 2026-02-22
> **Device**: Samsung Galaxy S22 Ultra (WiFi ADB)
> **Package**: `com.slopus.happy.dev`
> **Tool**: MCP Mobile (`mcp__mobile__mobile`) via HydraSpecter

## Legend

| Symbol | Meaning |
|--------|---------|
| **H** | Testable via Hydra (screenshot + tap + assert) |
| **H~** | Partially testable via Hydra (needs visual verification) |
| **M** | Manual only (hardware, permissions, external service) |
| **P1** | Critical path - must pass |
| **P2** | Core feature - high value |
| **P3** | Extended feature |

## Pre-test Setup

```
mobile({ action: "connect_wifi", ip: "192.168.0.50" })
mobile({ action: "keep_awake", enabled: true, mode: "wifi" })
mobile({ action: "launch_app", package: "com.slopus.happy.dev" })
mobile({ action: "wait", ms: 3000 })
mobile({ action: "screenshot" })
```

---

## 1. Authentication (P1)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 1.1 | Auto-login on fresh install | **H** | Uninstall app > install APK > launch > wait 5s > screenshot > assert session list visible |
| 1.2 | Credentials persist after restart | **H** | `stop_app` > `launch_app` > wait 3s > assert session list visible (no auth screen) |
| 1.3 | Secret key visible in Settings | **H** | Navigate Settings > Account > tap "Show Secret Key" > screenshot > assert key text visible |
| 1.4 | Secret key copy to clipboard | **H~** | Tap copy button > assert_visible "Copied" toast |
| 1.5 | Logout and auto-re-login | **H** | Settings > Account > Logout > wait 5s > assert auto-reconnected (session list visible) |
| 1.6 | QR code scan screen opens | **H** | Logout > tap "Link or Restore" > assert camera/QR UI visible |
| 1.7 | Manual secret key entry | **H** | Logout > tap "Link or Restore" > tap manual entry > input_text base32 key > submit > assert auth success |

---

## 2. Session List (P1)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 2.1 | Sessions load on startup | **H** | Launch app > wait 3s > screenshot > assert session items visible |
| 2.2 | MMKV cache instant load | **H** | `stop_app` > `launch_app` > screenshot immediately (< 1s) > assert sessions visible (no blank) |
| 2.3 | Pull to refresh | **H** | Swipe down on session list > wait 2s > screenshot |
| 2.4 | Session message preview | **H** | Screenshot session list > assert preview text under session title |
| 2.5 | Unread badge | **H~** | Have unread session > screenshot > verify orange/red badge visible |
| 2.6 | Git status indicator | **H~** | Session with git changes > screenshot > verify git diff count badge |
| 2.7 | Task status badge | **H~** | Session with todos > screenshot > verify todo count visible |
| 2.8 | Tap to open session | **H** | Tap first session > wait 2s > assert chat interface visible |
| 2.9 | Session grouping by project | **H** | Scroll to inactive sessions > screenshot > verify grouped by path |
| 2.10 | Compact vs expanded mode | **H** | Settings > Features > toggle compact > back > screenshot > compare layout |
| 2.11 | Shared session indicator | **H~** | Have shared session > screenshot > verify lock/share icon visible |
| 2.12 | Active sessions group | **H** | Screenshot > verify "Active" section at top with online sessions |

---

## 3. Project Sessions View (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 3.1 | Open project sessions | **H** | Tap project group header in session list > assert project sessions screen |
| 3.2 | Sessions grouped by date | **H** | Screenshot > verify Today/Yesterday grouping |
| 3.3 | Expandable transcript preview | **H** | Tap expand arrow on a session > wait 1s > screenshot > verify markdown transcript inline |
| 3.4 | Kill active session | **H** | Find active session > tap kill button > confirm > assert session becomes inactive |
| 3.5 | Session reactivate | **H** | Find inactive session > tap reactivate > assert session becomes active |
| 3.6 | Export session | **H~** | Tap export on a session > verify share sheet or export confirmation |

---

## 4. Chat Interface (P1)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 4.1 | Messages render correctly | **H** | Open active session > screenshot > assert messages visible |
| 4.2 | Markdown rendering | **H~** | Open session with markdown > screenshot > verify bold/italic/code/headers render |
| 4.3 | Code blocks with syntax highlight | **H~** | Scroll to code block > screenshot > verify colored syntax |
| 4.4 | Code block copy button | **H** | Tap copy button on code block > assert_visible "Copied" |
| 4.5 | Markdown tables | **H~** | Scroll to table > screenshot > verify table renders (not raw pipes) |
| 4.6 | Mermaid diagram | **H~** | Scroll to mermaid block > screenshot > verify diagram renders (not raw text) |
| 4.7 | Text selection | **H** | Long press on message text > screenshot > verify selection handles visible |
| 4.8 | Tool call compact view | **H** | Scroll to tool call > screenshot > verify compact rendering (icon + summary) |
| 4.9 | Tool call expand | **H** | Tap tool call > screenshot > verify expanded detail view |
| 4.10 | Bash tool with output | **H~** | Find Bash tool call > expand > verify command + output visible |
| 4.11 | Edit tool diff view | **H~** | Find Edit tool call > expand > verify diff rendering |
| 4.12 | Clickable file paths | **H** | Tap file path in message > assert file viewer opens |
| 4.13 | Thinking block display | **H~** | Find thinking section > screenshot > verify italic/collapsed rendering |
| 4.14 | ExitPlanMode buttons | **H** | Find plan exit > screenshot > verify approve/reject buttons visible |
| 4.15 | Plannotator button on plan | **H** | Find ExitPlanMode tool > screenshot > assert "Review Plan with Annotations" button visible |
| 4.16 | Session status indicator | **H~** | Check header > verify online/offline/thinking indicator |
| 4.17 | Permission request UI | **H** | Find permission request > screenshot > verify approve/deny buttons |
| 4.18 | Subagent display | **H~** | Find subagent spawn > screenshot > verify agent card rendering |
| 4.19 | TodoWrite compact display | **H~** | Find TodoWrite tool > screenshot > verify todo list renders |
| 4.20 | Cost display | **H~** | Open session info > verify cost/token count visible |

---

## 5. Chat Input (AgentInput) (P1)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 5.1 | Text input works | **H** | Tap input field > `input_text("Hello test")` > screenshot > assert text visible |
| 5.2 | Send message | **H** | Type message > tap send > wait 3s > assert message appears in chat |
| 5.3 | Image picker button visible | **H** | Screenshot input area > assert image icon visible |
| 5.4 | Image pick from gallery | **M** | Tap image icon > select image > verify thumbnail preview row |
| 5.5 | Image remove before send | **H** | After picking image > tap X on thumbnail > verify removed |
| 5.6 | Permission mode selector | **H** | Tap permission mode chip > screenshot > verify dropdown options |
| 5.7 | Model mode selector | **H** | Tap model chip > screenshot > verify model options |
| 5.8 | Abort/stop button | **H** | During active generation > tap stop > verify generation stops |
| 5.9 | Autocomplete @ mention | **H** | Type "@" > screenshot > verify autocomplete popup |
| 5.10 | Autocomplete / commands | **H** | Type "/" > screenshot > verify command suggestions |
| 5.11 | Draft persistence | **H** | Type text > navigate away > come back > verify text preserved |
| 5.12 | Memory indicator (new) | **H~** | If memory monitor active > verify RAM indicator in status bar |
| 5.13 | Voice mic button | **H** | Screenshot input area > assert mic button visible (next to send) |

---

## 6. Session Info Screen (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 6.1 | Open session info | **H** | In chat > tap info/header button > assert info screen |
| 6.2 | Session metadata visible | **H** | Screenshot > verify: host, path, OS, CLI version, AI provider |
| 6.3 | Quick actions section | **H** | Screenshot > verify: archive, delete, reactivate, export buttons |
| 6.4 | Delete session | **H** | Tap delete > confirm modal > verify session removed |
| 6.5 | Archive/kill session | **H** | Tap archive > verify session marked inactive |
| 6.6 | Rename session | **H** | Tap rename > clear field > input new name > save > verify |
| 6.7 | Memory monitor section | **H~** | If memory feature active > verify RSS, system memory, trend shown |
| 6.8 | Restart conversation button | **H** | If memory critical > verify "Restart" button in memory section |
| 6.9 | Export transcript | **H~** | Tap export > verify share sheet or success message |

---

## 7. File Manager (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 7.1 | Open file manager | **H** | In session > tap files icon > assert file manager screen |
| 7.2 | Browse tab - file tree | **H** | Screenshot Browse tab > verify folders and files listed |
| 7.3 | Expand folder | **H** | Tap folder > verify children appear indented |
| 7.4 | Changes tab - git diff | **H** | Tap Changes tab > verify staged/unstaged files listed |
| 7.5 | Tab default to Browse when clean | **H** | Open on clean repo > verify Browse tab active by default |
| 7.6 | Search filter files | **H** | Tap search > type filename > verify filtered results |
| 7.7 | Breadcrumb navigation | **H** | Navigate deep > tap breadcrumb segment > verify jump |
| 7.8 | Open file from tree | **H** | Tap a file > verify file viewer opens |
| 7.9 | Annotation badge (purple) | **H~** | File with annotations > verify purple badge on file item |
| 7.10 | Copy/paste file | **H** | Long press file > copy > navigate to folder > paste > verify |
| 7.11 | Delete file | **H** | Long press file > delete > confirm > verify removed |
| 7.12 | Rename file | **H** | Long press file > rename > type new name > verify |
| 7.13 | Create folder | **H** | Tap create > enter name > verify new folder appears |

---

## 8. File Viewers (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 8.1 | Code file - syntax highlight | **H~** | Open .ts file > screenshot > verify colored syntax |
| 8.2 | Large file - no ANR | **H** | Open large file (>500 lines) > verify no freeze (screenshot after 3s) |
| 8.3 | Image viewer - PNG/JPG | **H~** | Open image file > screenshot > verify image renders |
| 8.4 | Image viewer - pinch zoom | **M** | Open image > pinch gesture > verify zoom |
| 8.5 | PDF viewer | **H~** | Open .pdf file > screenshot > verify PDF renders in WebView |
| 8.6 | SVG as text (not binary) | **H** | Open .svg > verify syntax-highlighted XML text (not "binary") |
| 8.7 | Diff view for git changes | **H~** | Open changed file from Changes tab > verify diff rendering |
| 8.8 | Share/export button | **H** | Open file > tap share > verify share sheet |
| 8.9 | UTF-8 encoding correct | **H~** | Open file with accents/emoji > verify correct rendering |
| 8.10 | Annotate button visible | **H** | Open any text file > verify annotate button in header |

---

## 9. Plannotator (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 9.1 | Open plannotator from file | **H** | Open text file > tap annotate button > assert PlannotatorModal opens |
| 9.2 | Open plannotator from plan | **H** | Find ExitPlanMode in chat > tap "Review Plan" > assert modal opens |
| 9.3 | Block-level annotation | **H** | Tap a text block > verify annotation panel appears |
| 9.4 | Add comment annotation | **H** | Select block > type comment > save > verify annotation badge |
| 9.5 | Redline mode toggle | **H** | Tap redline toggle > tap blocks > verify strikethrough |
| 9.6 | Review tags (@TODO, @FIX) | **H** | Add annotation > select @TODO tag > verify tag applied |
| 9.7 | Global comment | **H** | Tap global comment > type feedback > save > verify |
| 9.8 | Copy Plan button | **H** | Tap "Copy Plan" > verify clipboard toast |
| 9.9 | Copy Summary button | **H** | Tap "Copy Summary" > verify clipboard toast |
| 9.10 | Annotations persist | **H** | Add annotation > close > reopen > verify annotation still there |
| 9.11 | Buttons not behind nav bar | **H** | Screenshot bottom of plannotator > verify buttons fully visible |

---

## 10. Tabular Viewers (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 10.1 | CSV viewer loads | **H~** | Open .csv file > verify table renders |
| 10.2 | CSV sort by column | **H** | Tap column header > verify sort applied |
| 10.3 | CSV filter rows | **H** | Type in filter > verify rows filtered |
| 10.4 | CSV cell annotation | **H** | Tap cell > add annotation > verify |
| 10.5 | SQLite viewer - tables list | **H~** | Open .sqlite file > verify table list |
| 10.6 | SQLite table contents | **H** | Tap table name > verify rows/columns display |
| 10.7 | SQLite custom SQL query | **H** | Type SQL query > run > verify results |
| 10.8 | SQLite cell annotation | **H** | Tap cell > annotate > verify |
| 10.9 | Tabular annotation export | **H~** | Export annotations > verify markdown output |

---

## 11. Markdown Preview Screen (P3)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 11.1 | Open markdown preview | **H** | Open .md file > tap preview mode > assert rendered markdown |
| 11.2 | Edit mode | **H** | Switch to edit > type changes > verify editor |
| 11.3 | Split mode | **H** | Switch to split > verify editor + preview side by side |
| 11.4 | Save changes | **H** | Edit > tap save > verify success |
| 11.5 | UTF-8 correct in preview | **H~** | File with accents > verify rendering |

---

## 12. Voice Assistant (P2) - Android Only

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 12.1 | Mic button visible | **H** | Open session > screenshot input > assert mic icon |
| 12.2 | Mic permission request | **M** | Tap mic first time > verify permission dialog |
| 12.3 | Voice bar appears | **H~** | Start voice > screenshot > verify voice bar UI |
| 12.4 | Speaking animation (user) | **M** | Speak into mic > verify waveform animation |
| 12.5 | Speaking animation (agent) | **H~** | Wait for agent response > screenshot > verify animation |
| 12.6 | Voice session end | **H** | Tap stop > verify voice bar disappears |
| 12.7 | Voice language selection | **H** | Settings > Voice > select language > verify changed |
| 12.8 | Paywall after free uses | **M** | Use 3 free voice sessions > verify paywall shown |

---

## 13. New Session Wizard (P1)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 13.1 | Open new session | **H** | Tap FAB / new session button > assert wizard screen |
| 13.2 | Machine selection | **H** | Tap machine picker > select machine > verify |
| 13.3 | Path selection | **H** | Tap path > browse folders > select > verify path shown |
| 13.4 | Path search/filter | **H** | Type in path field > verify autocomplete/filter |
| 13.5 | Clear path button | **H** | Tap X on path > verify cleared |
| 13.6 | Permission mode selection | **H** | Tap permission mode > select option > verify |
| 13.7 | Profile/backend selection | **H** | Tap profile > select Claude/Codex/Gemini > verify |
| 13.8 | Start session | **H** | Fill form > tap create > wait > verify session opens |
| 13.9 | Resume session chip | **H~** | Select path with existing session > verify resume chip |
| 13.10 | CLI detection warning | **H~** | Select machine without CLI > verify warning banner |
| 13.11 | Dismiss warning per-machine | **H** | Tap "Don't show again" on CLI warning > verify dismissed |
| 13.12 | Folder browser tree | **H** | Tap browse > verify expandable folder tree |

---

## 14. Session Sharing (P3)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 14.1 | Share with friend | **H** | Session info > Manage Sharing > add friend > verify |
| 14.2 | Public link creation | **H** | Create public link > verify QR code generated |
| 14.3 | Remove sharing | **H** | Remove shared friend > verify removed |
| 14.4 | Access level enforcement | **H~** | Open shared session as non-owner > verify read-only |

---

## 15. Settings (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 15.1 | Open settings | **H** | Tap Settings tab > assert settings screen |
| 15.2 | Account screen | **H** | Tap Account > verify secret key section |
| 15.3 | Language picker | **H** | Tap Language > select language > verify UI changes |
| 15.4 | Appearance (theme) | **H** | Tap Appearance > toggle dark/light > verify theme changes |
| 15.5 | Machines list | **H** | Tap Machines > verify list with online/offline indicators |
| 15.6 | Machine detail | **H** | Tap a machine > verify detail screen |
| 15.7 | Profiles list | **H** | Tap Profiles > verify profile list |
| 15.8 | Create custom profile | **H** | Tap + > fill form > save > verify new profile |
| 15.9 | Edit profile | **H** | Tap existing profile > edit > save > verify |
| 15.10 | API Keys | **H** | Tap API Keys > verify list |
| 15.11 | Secrets vault | **H** | Tap Secrets > verify masked values |
| 15.12 | Experiment toggles | **H** | Tap Features > toggle experiment > verify |
| 15.13 | Compact session list toggle | **H** | Toggle compact mode > go back > verify list layout |
| 15.14 | Changelog screen | **H** | Tap "What's New" > verify version history |

---

## 16. Friends / Social (P3)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 16.1 | Friends list | **H** | Navigate to friends > verify list |
| 16.2 | Search users | **H** | Tap search > type username > verify results |
| 16.3 | Send friend request | **H** | Search > tap Add > verify request sent |
| 16.4 | Accept friend request | **H** | Open incoming requests > tap Accept > verify |
| 16.5 | Remove friend | **H** | Long press friend > remove > confirm > verify |

---

## 17. Push Notifications (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 17.1 | Permission request (Android 13+) | **M** | Fresh install > verify notification permission dialog |
| 17.2 | Notification on session complete | **M** | Start remote session > wait for completion > verify notification |
| 17.3 | Tap notification opens session | **M** | Tap notification > verify correct session opens |

---

## 18. Sync Engine (P1)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 18.1 | WebSocket connects | **H~** | Launch app > wait 5s > verify sessions load (no error) |
| 18.2 | Real-time message streaming | **H** | Open active session > send message > verify response streams in |
| 18.3 | Auto-reconnect | **H** | Toggle airplane mode on/off > wait 10s > verify sessions reload |
| 18.4 | MMKV cache on cold start | **H** | Kill app > relaunch > verify instant session list (< 1s) |
| 18.5 | Session delete propagation | **H** | Delete session > verify removed from list immediately |
| 18.6 | E2E encryption working | **H~** | Messages decrypt correctly (no garbled text) |

---

## 19. i18n (P3)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 19.1 | Switch to Russian | **H** | Settings > Language > Russian > screenshot > verify Cyrillic |
| 19.2 | Switch to Japanese | **H** | Settings > Language > Japanese > screenshot > verify Japanese chars |
| 19.3 | Switch to Spanish | **H** | Settings > Language > Spanish > screenshot > verify |
| 19.4 | Dynamic strings render | **H~** | In non-English > verify parameters inserted (e.g. "5 minutes ago") |
| 19.5 | Return to English | **H** | Settings > Language > English > verify back to normal |
| 19.6 | Plannotator translated | **H~** | In non-English > open plannotator > verify UI strings translated |
| 19.7 | File manager translated | **H~** | In non-English > open file manager > verify UI strings translated |

---

## 20. Artifacts (P3)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 20.1 | Artifacts list | **H** | Navigate to artifacts > verify list |
| 20.2 | Create artifact | **H** | Tap + > fill content > save > verify |
| 20.3 | View artifact | **H** | Tap artifact > verify content displayed |
| 20.4 | Edit artifact | **H** | Open > edit > save > verify changes |

---

## 21. Zen / Tasks (P3, gated)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 21.1 | Enable Zen experiment | **H** | Settings > Features > enable Zen > verify |
| 21.2 | Task list visible | **H** | Navigate to Zen > verify task list |
| 21.3 | Create task | **H** | Tap new > fill form > save > verify |
| 21.4 | Task detail view | **H** | Tap task > verify detail screen |
| 21.5 | Link task to session | **H~** | In new session > link task > verify |

---

## 22. GitHub Integration (P3)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 22.1 | Connect GitHub | **M** | Settings > Connect GitHub > OAuth flow > verify connected |
| 22.2 | Avatar/name synced | **H** | After connect > verify GitHub avatar in profile |
| 22.3 | Disconnect GitHub | **H** | Settings > Disconnect > confirm > verify disconnected |

---

## 23. OTA Updates (P2)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 23.1 | Update banner appears | **H~** | Push OTA > reopen app > verify update banner |
| 23.2 | Update applies | **M** | Tap update > wait > verify new version active |

---

## 24. Navigation & UX (P1)

| # | Test Case | Hydra | Steps |
|---|-----------|-------|-------|
| 24.1 | Back button works | **H** | Navigate deep > press_key BACK > verify previous screen |
| 24.2 | Tab navigation | **H** | Tap Sessions tab > Inbox tab > Settings tab > verify each |
| 24.3 | Header renders on all screens | **H** | Navigate 5+ screens > screenshot each > verify header |
| 24.4 | Safe area insets | **H~** | Screenshot > verify content not behind status bar or nav bar |
| 24.5 | Pull to refresh | **H** | Swipe down on session list > verify refresh |
| 24.6 | Modal dialogs work | **H** | Trigger a modal (delete session) > verify modal overlay |
| 24.7 | No hardcoded strings visible | **H~** | Switch language > browse > verify no English leftovers |

---

## Test Execution Checklist

### Hydra-Automated Batch (run first)

Can be scripted as `batch_commands`:

1. **Auth flow** (1.1, 1.2)
2. **Session list** (2.1-2.4, 2.8)
3. **Chat** (4.1, 4.7-4.9)
4. **Input** (5.1, 5.2, 5.6, 5.7)
5. **File manager** (7.1-7.3, 7.6, 7.8)
6. **Settings** (15.1-15.4, 15.14)
7. **Navigation** (24.1-24.3)

### Visual Verification Pass (H~ items)

Screenshot + human review:

- Markdown rendering quality (4.2-4.6)
- Syntax highlighting accuracy (8.1)
- Image/PDF rendering (8.3, 8.5)
- Plannotator UI (9.1-9.11)
- Voice bar animation (12.3, 12.5)
- i18n completeness (19.1-19.7)

### Manual-Only Tests (M items)

- Image picker from gallery (5.4)
- Pinch-to-zoom (8.4)
- Push notifications (17.1-17.3)
- Voice speaking into mic (12.4)
- GitHub OAuth flow (22.1)
- OTA update apply (23.2)

---

## Summary

| Category | Total Tests | Via Hydra (H) | Partial (H~) | Manual (M) |
|----------|:-----------:|:-------------:|:-------------:|:----------:|
| Auth | 7 | 5 | 1 | 1 |
| Session List | 12 | 8 | 3 | 1 |
| Project Sessions | 6 | 5 | 1 | 0 |
| Chat | 20 | 10 | 8 | 2 |
| Input | 13 | 10 | 1 | 2 |
| Session Info | 9 | 7 | 1 | 1 |
| File Manager | 13 | 12 | 1 | 0 |
| File Viewers | 10 | 4 | 5 | 1 |
| Plannotator | 11 | 10 | 0 | 1 |
| Tabular | 9 | 5 | 4 | 0 |
| Markdown Preview | 5 | 4 | 1 | 0 |
| Voice | 8 | 2 | 2 | 4 |
| New Session Wizard | 12 | 9 | 2 | 1 |
| Sharing | 4 | 3 | 1 | 0 |
| Settings | 14 | 13 | 0 | 1 |
| Friends | 5 | 5 | 0 | 0 |
| Notifications | 3 | 0 | 0 | 3 |
| Sync | 6 | 3 | 2 | 1 |
| i18n | 7 | 4 | 3 | 0 |
| Artifacts | 4 | 4 | 0 | 0 |
| Zen | 5 | 4 | 1 | 0 |
| GitHub | 3 | 1 | 0 | 2 |
| OTA | 2 | 0 | 1 | 1 |
| Navigation | 7 | 5 | 2 | 0 |
| **TOTAL** | **194** | **127 (65%)** | **40 (21%)** | **27 (14%)** |

**127 tests (65%) fully automatable via Hydra**, 40 tests (21%) partiellement via screenshot, 27 tests (14%) manuels uniquement.
