# Plan détaillé — Audit & mise à niveau Happy

## Contexte

Le projet Happy (fork `theflysurfer/Happier` d'upstream `slopus/happy`) est une app React Native/Expo (Android, iOS, Web) servant de frontend mobile/web pour des agents CLI (Claude, Codex, Gemini, Pi). Le fork a 55 commits custom mais **1586 commits de retard** sur upstream. L'intégration Pi est incomplète côté UI. La documentation est à jour partiellement.

Les 4 axes de travail :
1. Sync upstream
2. Features custom en production
3. CLAUDE.md à jour
4. Intégration Pi complète

---

## 1. Sync avec upstream

### État actuel
- **Notre branche** : `master` (55 commits custom)
- **Upstream** : `upstream/main` (1586 commits d'avance, dernier : 25 fév 2026)
- **Fork point** : très ancien

### Features upstream manquantes (majeures)

| Upstream feature | Commits | Impact |
|---|---|---|
| `happy-wire` — nouveau protocole session | `54d00311` | Nouveau package, refactor sync |
| v3 reliable HTTP messages API | `bf9f0aa7` | Meilleure fiabilité |
| `AsyncLock` pour sérialisation messages | `bb4f9abf` | Fix race conditions |
| Sandbox/Yolo permission refactor | `a07bc160`, `8664fb13` | UX modes |
| Session protocol cuid2 IDs | `011493d6` | Nouveaux IDs |
| Subagent lifecycle protocol | `36bcc1cb` | Multi-agent |
| Model/mode metadata-driven selection | `bb7a1173` | Modèles |
| Path normalization Windows fix | `0799ac76` | Bug fix |
| `Remove experimental zen todo paths` | `e07ff478` | **Upstream a supprimé `-zen`** |
| PGlite standalone server | `351f7af5` | Backend embeddé |
| ACP generic runner | `3ef6aa25` | Agents |
| Agent skills (browser, terminal) | `bb7a1173` | Nouvelles features |

### Plan de merge

- [ ] **Step 1** : Créer une branche `merge-upstream` depuis `master`
- [ ] **Step 2** : `git merge upstream/main` — résoudre les conflits
  - Conflits attendus : `typesRaw.ts` (nos ajouts ACP Pi vs refactors upstream), `AgentInput.tsx` (nos modifs image upload vs upstream), `_default.ts` (traductions), stubs `-zen` (upstream les supprime)
- [ ] **Step 3** : Supprimer les stubs `sources/-zen/` (upstream a supprimé les routes)
- [ ] **Step 4** : Vérifier que nos 55 commits custom sont préservés
- [ ] **Step 5** : `yarn typecheck` — résoudre les erreurs
- [ ] **Step 6** : Tester web + Android
- [ ] **Step 7** : Push + OTA

### Fichiers à conflits probables
- `happy/sources/sync/typesRaw.ts` — notre ACP Pi schema vs upstream refactors
- `happy/sources/components/AgentInput.tsx` — image upload + Pi vs upstream
- `happy/sources/text/_default.ts` — nos traductions image/Pi vs upstream
- `happy/sources/text/translations/*.ts` — idem
- `happy/sources/components/tools/knownTools.tsx` — nos tools vs upstream
- `happy/package.json` — dépendances

### Issue GitHub
- [ ] Créer issue #815 : `chore: merge upstream/main (1586 commits behind)`

---

## 2. Features custom en production

### Vérification : toutes les features sont dans l'OTA `preview`

L'OTA `ddcefa8f` (poussée le 5 mars 2026) contient **tous les 55 commits custom** sur la branche `preview`. Runtime version `18`.

| Feature | Commit | OTA | Vérifié |
|---|---|---|---|
| Image upload web+Android | `2fb21d90` | ✅ | Testé via Hydra (bouton visible, paste fonctionne) |
| Pi provider ACP enum | `dc75fd8c` | ✅ | Dans `typesRaw.ts:213` |
| Pi CLI backend | `f9fdea84` | ✅ | `happy-cli/src/pi/` |
| TaskCreate/Update/List views | `6d7ee97d` | ✅ | Dans `knownTools.tsx` + `TaskOperationView.tsx` |
| Memory monitor | `d2d479a0` | ✅ | RAM indicator dans AgentInput |
| Markdown transcript preview | `462634fc` | ✅ | |
| Session cache MMKV | `c229a15d` | ✅ | |
| File Manager (Browse/Changes) | `6ec7f3b6` | ✅ | |
| Plannotator | `636d5118` | ✅ | |
| Clickable file paths | `0dffc683` | ✅ | |
| i18n 9 langues | `1921cb88` | ✅ | |
| 15+ bug fixes | divers | ✅ | |
| -zen stubs | `82cb2b98` | ✅ | **À supprimer après merge upstream** |

### ⚠️ Problème : branche OTA
L'OTA est poussée sur `--branch preview` mais l'APK installé utilise peut-être le channel `production`. Vérification nécessaire :

- [ ] Vérifier dans `app.config.js` quel channel l'APK utilise
- [ ] Si `production`, pousser aussi sur `--branch production`

---

## 3. CLAUDE.md — Mises à jour

### Sections à ajouter/modifier

#### 3a. Section "Pi Agent Integration" (NOUVELLE)
- [ ] Ajouter après "Project Context" :

```markdown
## Pi Agent Integration

Pi (`@mariozechner/pi-coding-agent`) is the 4th agent backend in Happy, alongside Claude, Codex, and Gemini.

### CLI
- Entry point: `happy-cli/src/pi/runPi.ts`
- Backend: `happy-cli/src/pi/piBackend.ts` — wraps Pi SDK in-process
- Flavor: `'pi'` in session metadata
- Command: `happy pi` to start Pi mode

### App UI — Current Limitations
- `agentType` enum in `AgentInput.tsx` does NOT include `'pi'` yet
- No Pi-specific icon in `Avatar.tsx` (falls back to Claude icon)
- No Pi permission modes in settings overlay
- Pi tools appear as generic blocks (no entries in `knownTools.tsx`)

### ACP Message Flow
Pi CLI → `session.sendAgentMessage('pi', ...)` → Happy server → mobile app
Message types: `message`, `tool-call`, `tool-result`, `thinking`, `file-edit`, `task_started`, `task_complete`, `turn_aborted`
```

#### 3b. Section "Image Upload" (NOUVELLE)
- [ ] Ajouter :

```markdown
## Image Upload

Multimodal image support across all platforms.

### Features
- **Android**: Gallery picker + Camera (action sheet on button tap)
- **Web**: Gallery picker button + Drag & drop + Clipboard paste (Ctrl+V)
- **Preview**: Thumbnail row with remove button, up to 4 images
- **Processing**: Canvas API on web, expo-image-manipulator on native
- **Encoding**: Base64, max 2048px, JPEG 80% quality

### Key Files
- `sources/components/ImageUpload/useImagePicker.ts` — core hook
- `sources/components/ImageUpload/ImageDropZone.tsx` — web drag & drop + paste
- `sources/components/ImageUpload/ImagePreviewRow.tsx` — thumbnail UI
- `sources/components/AgentInput.tsx` — button + drop zone wrapper
- `sources/-session/SessionView.tsx` — wiring
```

#### 3c. OTA section update
- [ ] Fix la section OTA pour documenter le bypass typecheck :

```markdown
### OTA Push (bypassing typecheck)

`yarn ota` runs typecheck which fails on pre-existing errors (-zen modules, spec files).
To push directly:

```bash
# Create .bat file for interactive_shell compatibility
npx eas-cli@latest update --branch preview --message "description"
```

Note: EAS requires clean git tree (`requireCommit: true`). It will prompt to commit dirty files.
```

#### 3d. Upstream sync status
- [ ] Ajouter section :

```markdown
## Upstream Sync Status

- **Fork**: `theflysurfer/Happier` (branch `master`)
- **Upstream**: `slopus/happy` (branch `main`)
- **Status**: 1586 commits behind, 55 commits ahead (as of March 2026)
- **-zen stubs**: Temporary stubs in `sources/-zen/` for build compatibility. Upstream has REMOVED these routes — stubs should be deleted after merging upstream.
```

### Fichier à modifier
- `happy/CLAUDE.md`

---

## 4. Intégration Pi dans Happy — Complétion

### 4a. Pi dans `agentType` enum et détection UI

**Fichiers à modifier** :
- `happy/sources/components/AgentInput.tsx`

**Changements** :
- [ ] Ajouter `'pi'` à `agentType?: 'claude' | 'codex' | 'gemini' | 'pi'` (ligne 68)
- [ ] Ajouter `const isPi = props.metadata?.flavor === 'pi' || props.agentType === 'pi';` (après ligne 319)
- [ ] Ajouter label Pi dans le bouton agent (ligne 1185) : `props.agentType === 'pi' ? t('agentInput.agent.pi') : ...`
- [ ] Ajouter Pi permission modes (Pi utilise les mêmes que Codex : `default`, `read-only`, `safe-yolo`, `yolo`) — réutiliser la branche `isCodex || isGemini` en ajoutant `|| isPi`

**Réutilisation existante** :
- Le pattern `isCodex`/`isGemini` se répète ~15 fois dans le fichier. Pi se comporte comme Codex pour les modes de permission → ajouter `isPi` aux conditions existantes.

### 4b. Traduction `agentInput.agent.pi`

**Fichiers à modifier** :
- `happy/sources/text/_default.ts` — ajouter `pi: 'Pi'` dans `agentInput.agent`
- `happy/sources/text/translations/*.ts` (9 fichiers) — ajouter `pi: 'Pi'`

### 4c. Icône Pi dans Avatar

**Fichiers à modifier** :
- `happy/sources/components/Avatar.tsx`
- `happy/sources/assets/images/` — ajouter `icon-pi.png` (+ @2x, @3x)

**Changements** :
- [ ] Créer une icône Pi (le logo Pi : π stylisé, ou le logo officiel de Pi agent)
- [ ] Ajouter dans `flavorIcons` (ligne 22) : `pi: require('@/assets/images/icon-pi.png')`

**Alternative si pas d'icône** : utiliser une icône Ionicons/Octicons existante comme placeholder :
```tsx
// Temporaire — utiliser emoji ou icône générique
pi: require('@/assets/images/icon-claude.png'), // TODO: replace with Pi icon
```

### 4d. Session info page — Pi label

**Fichier** : `happy/sources/app/(app)/session/[id]/info.tsx`

- [ ] Ajouter ligne 466.5 : `if (flavor === 'pi') return 'Pi';`

### 4e. ToolView — Pi tools non reconnus

**Problème** : Dans `ToolView.tsx` ligne 79-81, les outils inconnus sont masqués pour Gemini. Pour Pi, les outils inconnus sont affichés mais sans icône/titre utile.

**Fichier** : `happy/sources/components/tools/ToolView.tsx`

- [ ] Ajouter détection Pi (ligne 82) : `const isPi = props.metadata?.flavor === 'pi';`
- [ ] Pour Pi, les outils inconnus doivent rester visibles (pas `minimal = true`)

### 4f. Pi tools dans `knownTools.tsx` — Les plus importants

**Fichier** : `happy/sources/components/tools/knownTools.tsx`

Outils Pi envoyés par `piBackend.ts` via `tool_execution_start` avec `event.toolName`. Les noms correspondent aux outils Pi du SDK. Voici ceux à ajouter, par ordre de priorité :

#### Priorité 1 — Outils natifs Pi SDK (minuscules)

Les outils Pi natifs du SDK (`@mariozechner/pi-coding-agent` v0.55.1) utilisent des noms **en minuscules** :

| Outil Pi SDK | Existe dans `knownTools` ? | Action |
|---|---|---|
| `read` | ✅ déjà présent (entrée `read` pour Gemini) | Rien |
| `bash` | ❌ (`Bash` existe mais pas `bash`) | **Ajouter** entrée `bash` |
| `edit` | ✅ déjà présent (entrée `edit` pour Gemini) | Rien |
| `write` | ❌ (`Write` existe mais pas `write`) | **Ajouter** entrée `write` |
| `grep` | ❌ (`Grep` existe mais pas `grep`) | **Ajouter** entrée `grep` |
| `find` | ❌ pas d'entrée `find` | **Ajouter** entrée `find` |
| `ls` | ❌ (`LS` existe mais pas `ls`) | **Ajouter** entrée `ls` |
| `exit_plan_mode` | ✅ déjà présent | Rien |

**Changements** dans `knownTools.tsx` :
- [ ] Ajouter 5 entrées minuscules (`bash`, `write`, `grep`, `find`, `ls`) en copiant la logique des entrées majuscules existantes (`Bash`, `Write`, `Grep`, etc.) et en adaptant les champs `input` au format Pi (ex: Pi utilise `path` au lieu de `file_path`, `command` au lieu de tableau)

Schemas Pi (du SDK `dist/core/tools/index.d.ts`) :
- `bash` : `{ command: string, timeout?: number }`
- `write` : `{ path: string, content: string }`
- `grep` : `{ pattern: string, path?: string, glob?: string, ignoreCase?: boolean, literal?: boolean, context?: number, limit?: number }`
- `find` : `{ pattern: string, path?: string, limit?: number }`
- `ls` : `{ path?: string, limit?: number }`
- `read` : `{ path: string, offset?: number, limit?: number }` (déjà couvert par l'entrée Gemini `read`)
- `edit` : `{ path: string, oldText: string, newText: string }` (déjà couvert par l'entrée Gemini `edit`)

#### Priorité 2 — Outils d'extensions Pi (dynamiques)

Les extensions Pi (chargées par `ExtensionRunner`) ajoutent des outils custom. Leurs noms sont **dynamiques** et dépendent de la config utilisateur. Les plus courants dans l'écosystème de Julien :

- `fast_search_*` (13 outils) — fast-search extension
- `pinchtab_*` (11 outils) — Pinchtab browser automation
- `hydra_*` — HydraSpecter browser automation
- `web_search`, `web_fetch` — web search extension
- `interactive_shell` — interactive shell extension

**Approche** : Plutôt qu'ajouter des entrées fixes pour chaque outil d'extension, ajouter une **détection par préfixe** dans `ToolView.tsx` :

```tsx
// Pi extension tools — detect by prefix and render with appropriate icons
if (!knownTool && isPi) {
    const name = tool.name;
    if (name.startsWith('fast_search_')) { toolTitle = name.replace('fast_search_', '').replace(/_/g, ' '); icon = ICON_SEARCH; }
    else if (name.startsWith('pinchtab_') || name.startsWith('hydra_')) { toolTitle = name.replace(/^(pinchtab|hydra)_/, ''); icon = ICON_WEB; }
    else if (name === 'web_search' || name === 'web_fetch') { icon = ICON_WEB; }
    else if (name === 'interactive_shell') { icon = ICON_TERMINAL; }
    // Don't hide unknown Pi tools (unlike Gemini)
}
```

- [ ] Ajouter cette détection par préfixe dans `ToolView.tsx` (après ligne 82)

#### Priorité 3 — MCP tools

Les outils MCP (`mcp__*`) sont déjà gérés par la détection `tool.name.startsWith('mcp__')` dans `ToolView.tsx` ligne 99. Rien à faire.

### 4g. Registre de vues tool (`_all.tsx`)

Pour la plupart des outils Pi, la vue par défaut (Input/Output JSON) suffit. Pas besoin de vues custom pour l'instant, sauf potentiellement :

- [ ] `interactive_shell` — pourrait avoir une vue terminal-like (future)
- [ ] `hydra_screenshot` / `pinchtab_screenshot` — pourrait afficher l'image inline (future)

### 4h. Pi dans `SessionView.tsx`

**Fichier** : `happy/sources/-session/SessionView.tsx`

- [ ] Ajouter `const isPiSession = session.metadata?.flavor === 'pi';` (après ligne 175)
- [ ] Pi n'a pas de model selector → pas de changement nécessaire (le mode par défaut suffit)

### 4i. `PermissionFooter.tsx` — Pi detection

**Fichier** : `happy/sources/components/tools/PermissionFooter.tsx`

- [ ] Ligne 31 : ajouter `|| metadata?.flavor === 'pi'` à la condition `isCodex`
  ```tsx
  const isCodex = metadata?.flavor === 'codex' || metadata?.flavor === 'pi' || toolName.startsWith('Codex');
  ```

---

## Vérification end-to-end

### Tests web (via Hydra/Expo Web)
- [ ] Lancer `expo start --web` (via `.bat` workaround)
- [ ] Ouvrir une session Pi → vérifier icône Pi
- [ ] Vérifier que les outils Pi ont des titres/icônes corrects (pas de blocs génériques)
- [ ] Tester image upload (bouton, drag & drop, Ctrl+V)

### Tests Android (via OTA)
- [ ] Pousser OTA `--branch preview`
- [ ] Ouvrir l'app → ouvrir une session Pi
- [ ] Vérifier bouton image → action sheet gallery/caméra
- [ ] Vérifier que les tools Pi sont affichés correctement

### TypeScript
- [ ] `yarn typecheck` — 0 nouvelles erreurs (les erreurs pré-existantes sur spec.ts et -zen sont connues)

---

## Résumé des fichiers à modifier

| Fichier | Changement | Phase |
|---|---|---|
| `happy/CLAUDE.md` | Ajouter sections Pi, Image Upload, OTA bypass, Upstream sync | 3 |
| `happy/sources/components/AgentInput.tsx` | `agentType: 'pi'`, `isPi`, permission modes, agent label | 4a |
| `happy/sources/text/_default.ts` | `agentInput.agent.pi: 'Pi'` | 4b |
| `happy/sources/text/translations/*.ts` (×9) | `pi: 'Pi'` | 4b |
| `happy/sources/components/Avatar.tsx` | `pi` dans `flavorIcons` | 4c |
| `happy/sources/assets/images/icon-pi.png` | Créer icône Pi | 4c |
| `happy/sources/app/(app)/session/[id]/info.tsx` | Pi label | 4d |
| `happy/sources/components/tools/ToolView.tsx` | Pi detection, pas de masquage | 4e |
| `happy/sources/components/tools/knownTools.tsx` | 5 outils Pi minuscules (`bash`, `write`, `grep`, `find`, `ls`) | 4f |
| `happy/sources/-session/SessionView.tsx` | `isPiSession` | 4h |
| `happy/sources/components/tools/PermissionFooter.tsx` | Pi dans isCodex | 4i |

## Ordre d'exécution

1. **CLAUDE.md** (15 min) — documentation d'abord
2. **Pi UI** (agentType, isPi, avatar, traductions) — 30 min
3. **Pi knownTools** (5 outils SDK minuscules + préfixe detection pour extensions) — 20 min
4. **Typecheck + test web** — 15 min
5. **Commit + OTA push** — 10 min
6. **Issues GitHub** pour merge upstream (tracé pour session future)

Total estimé : **~1h40**
