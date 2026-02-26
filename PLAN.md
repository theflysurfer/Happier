# Plan: Nettoyage du repo Happy + Intégration Pi

## 1. État des lieux

### Structure actuelle du repo

Le repo **theflysurfer/Happier** (fork de **slopus/happy**) contient :

| Dossier | Description | Fichiers trackés |
|---------|-------------|-----------------|
| `happy/` | App React Native + Expo (= upstream `packages/happy-app`) | 1184 |
| `happy-cli/` | CLI wrapper multi-agent (= upstream `packages/happy-cli`) | 234 |
| Root | Fichiers de config + déchets | ~10 |

**Upstream** est un **monorepo** avec 5 packages (`happy-app`, `happy-cli`, `happy-server`, `happy-wire`, `happy-agent`). Notre fork a extrait `happy-app` → `happy/` et `happy-cli` → `happy-cli/` en perdant la structure monorepo.

### Branches

| Branche | Contenu |
|---------|---------|
| `master` | Notre fork avec ~30 commits custom |
| `upstream-snapshot` | Copie exacte de upstream/main |
| `upstream/main` | Remote upstream (slopus/happy) |

---

## 2. Code mort identifié

### 2.1 Fichiers racine à supprimer (non trackés ou gitignored)

| Fichier | Taille | Raison |
|---------|--------|--------|
| `C:Devhbactivity_top.txt` | 51KB | Dump adb malformé |
| `C:Devhblogcat_recent.txt` | 73KB | Dump adb malformé |
| `wa-logs.txt` | 1.5MB | Logs WhatsApp debug |
| `mcp-logs.txt` | 9KB | Logs MCP debug |
| `fix_send.py` | 1KB | Script one-shot |
| `patch_default.py` | 1KB | Script one-shot |
| `patch_layout.py` | 3KB | Script one-shot |
| `patch_sessionview.py` | 2KB | Script one-shot |
| `patch_storage_zen.py` | 2KB | Script one-shot |
| `happy.jks` | 2KB | Keystore (SENSIBLE - déjà gitignored) |
| `logs/` | vide | Dossier vide |
| `tmp/` | vide | Dossier vide |

**Action** : Supprimer tous ces fichiers du disque. Déjà dans `.gitignore`, donc pas trackés.

### 2.2 Code mort dans `happy/` (trackés dans git)

| Chemin | Fichiers | Raison |
|--------|----------|--------|
| `happy/sources/-zen/` | 10 fichiers | Feature Zen supprimée upstream, nous l'avons gardée dans un dossier prefixé `-`. Pas importée. |
| `happy/sources/-session/SessionView.tsx` | 1 fichier | Ancienne SessionView, remplacée. Existe aussi upstream dans `-session/`. |
| `happy/sources/trash/` | 3 fichiers | Dossier "poubelle" explicite avec des fichiers test. Non tracké. |
| `happy/screenshots/` | 38 fichiers (57MB) | Screenshots de test/debug. Lourd. |

**Actions** :
- [ ] `git rm -r happy/sources/-zen/` — dead code, jamais importé
- [ ] Garder `happy/sources/-session/` — existe aussi upstream, on suit leur convention
- [ ] Supprimer `happy/sources/trash/` du disque (non tracké)
- [ ] Évaluer si `happy/screenshots/` (57MB trackés) doivent rester — **recommandation : déplacer dans un dossier non tracké ou LFS**

### 2.3 Binaires lourds dans `happy-cli/` (trackés, 95MB)

| Chemin | Taille | Contenu |
|--------|--------|---------|
| `happy-cli/tools/archives/` | 95MB | Archives tar.gz de ripgrep + difftastic pour toutes plateformes |

C'est du code upstream — on ne touche pas, mais c'est à noter pour le poids du repo.

### 2.4 Fichiers racine non trackés à nettoyer

| Chemin | Action |
|--------|--------|
| `docs/` (racine) | Contient nos rapports de session + docs build. **Garder** mais tracker ou exclure explicitement |
| `PLAN.md` (racine) | Ce fichier. Non tracké. Supprimer après implémentation. |

---

## 3. Dossiers de compilation `C:\Dev` et `C:\h` (30 GB)

### Pourquoi ces dossiers existent

Le chemin OneDrive (`C:\Users\julien\OneDrive\Coding\_Projets de code\2026.01 Happy (Claude Code remote)\happy`) contient des **espaces et parenthèses** qui cassent CMake/ninja quand les paths absolus dépassent Windows MAX_PATH (260 chars). La solution : copier le projet dans `C:\Dev\happy-v6` et utiliser une **junction NTFS** `C:\h → C:\Dev\happy-v6` pour raccourcir encore les paths Gradle.

### Inventaire complet de `C:\Dev`

| Dossier | Taille | Contenu | Statut |
|---------|--------|---------|--------|
| `C:\Dev\android\` | **11 GB** | Android SDK (platforms, NDK, cmake, emulator, build-tools) | ✅ **Garder** — nécessaire pour les builds locaux |
| `C:\Dev\happy-v6\` | **4.2 GB** | Copie de travail pour build Android (= `C:\h` via junction) | ✅ **Garder** — c'est le build dir actif |
| `C:\Dev\happy-build\` | **7.6 GB** | Ancienne copie de build (même remote, même commit que happy/) | ❌ **SUPPRIMER** — doublon obsolète |
| `C:\Dev\happy\` | **1.5 GB** | Ancienne copie (remote: `happy-claude-client`, pas Happier) | ❌ **SUPPRIMER** — ancien repo, plus utilisé |
| `C:\Dev\hb\` | **5.7 GB** | Encore une copie (même remote `happy-claude-client`) | ❌ **SUPPRIMER** — doublon |
| `C:\Dev\null` | 0 bytes | Fichier parasite (redirect stdout vers `C:\Dev\null` au lieu de `/dev/null`) | ❌ **SUPPRIMER** |
| **Total** | **30 GB** | | **~15 GB récupérables** |

### Détail des doublons

Les 3 dossiers `C:\Dev\happy`, `C:\Dev\happy-build`, `C:\Dev\hb` pointent tous vers le **même repo obsolète** `theflysurfer/happy-claude-client.git` (commit `30357f9` du 26 jan). Ce repo est l'ancien fork standalone, remplacé par `theflysurfer/Happier.git` (fork du monorepo slopus/happy). Ils contiennent chacun d'énormes `node_modules` et artefacts de build :

| Dossier | node_modules | android/app/build | Total gaspillé |
|---------|-------------|-------------------|----------------|
| `C:\Dev\happy` | 1.4 GB | 23 MB | ~1.5 GB |
| `C:\Dev\happy-build` | 5.0 GB | 2.4 GB | ~7.6 GB |
| `C:\Dev\hb` | 4.5 GB | 1.5 GB | ~5.7 GB |

### Junction `C:\h`

```
C:\h → C:\Dev\happy-v6  (junction NTFS)
```

C'est le seul dossier de build actif. Le plugin Gradle `withWindowsPathFix.js` réécrit tous les paths pour passer par `C:\h` au lieu du path réel, contournant MAX_PATH.

**⚠️ Piège critique** : `C:\h` doit TOUJOURS pointer vers `C:\Dev\happy-v6`, PAS vers le dossier OneDrive. Sinon CMake cherche `node_modules` au mauvais endroit → build silencieusement cassé.

### Workflow de sync OneDrive → C:\Dev\happy-v6

Le code source vit dans OneDrive (versionné git). Pour builder, on copie vers `C:\Dev\happy-v6` :

```bash
PROJ="C:\Users\julien\OneDrive\Coding\_Projets de code\2026.01 Happy (Claude Code remote)\happy"
powershell -Command "robocopy '$PROJ' 'C:\Dev\happy-v6' /E /XD node_modules android ios .expo screenshots .git /XF build_log.txt tsconfig.tsbuildinfo /NFL /NDL /NJH /NJS /nc /ns /np"
```

Puis `yarn install` + `prebuild` + `gradlew assembleRelease` dans `C:\Dev\happy-v6`.

### Cache Gradle global

| Chemin | Taille | Action |
|--------|--------|--------|
| `~/.gradle/caches/` | **15 GB** | Peut être purgé partiellement (`gradle --stop && rm -rf ~/.gradle/caches/transforms-*`) |
| `~/.gradle/wrapper/` | 146 MB | Garder |

### Problèmes de build rencontrés (historique documenté)

| Problème | Cause | Solution | Statut |
|----------|-------|----------|--------|
| **260-char path limit** | CMake/ninja paths trop longs | Junction `C:\h` + plugin `withWindowsPathFix.js` | ✅ Résolu |
| **libsodium.so "not a regular file"** | NTFS reparse tags OneDrive confondent Java `Files.isRegularFile()` | Patch copie .so dans `C:/tmp/ls-lib/` | ✅ Résolu |
| **libsodium 5.7MB patch échoue** | `patch-package` ne gère pas les diffs binaires sur Windows | 3 fichiers à patcher manuellement après `yarn install` | ✅ Contournement |
| **Gradle daemon crash (EXCEPTION_ACCESS_VIOLATION)** | 4 ABIs + Xmx2048m + `gradle-fileevents.dll` | `arm64-v8a` only + Xmx4096m + `--no-watch-fs` | ✅ Résolu |
| **prebuild --clean reset gradle.properties** | Expo remet Xmx2048m et 4 ABIs par défaut | Toujours re-éditer après prebuild | ⚠️ Piège récurrent |
| **MetaspaceSize OOM (VPS)** | lint analyzer dépasse 512m | `-XX:MaxMetaspaceSize=1024m` + skip lint | ✅ Résolu |
| **Node.js OOM** | `NODE_OPTIONS=--max-old-space-size=512` trop bas | `--max-old-space-size=8192` dans profil PowerShell | ✅ Résolu |
| **react-native-audio-api path explosion** | Module inutilisé sur Android qui alourdit CMake | Exclu via `react-native.config.js` | ✅ Résolu |

### VPS comme alternative (recommandé pour les builds)

Le VPS Hostinger (`automation@69.62.108.82`) est **dramatiquement plus simple** :
- Pas de workaround 260-char
- Pas de junctions
- Pas de patch libsodium manuel
- `patch-package` fonctionne normalement
- Build cached en <1 min (vs 5-10 min Windows)

### Actions de nettoyage C:\Dev

```powershell
# 1. Supprimer les 3 doublons obsolètes (~15 GB récupérés)
Remove-Item -Recurse -Force "C:\Dev\happy"       # ancien repo happy-claude-client
Remove-Item -Recurse -Force "C:\Dev\happy-build"  # doublon de build
Remove-Item -Recurse -Force "C:\Dev\hb"           # encore un doublon

# 2. Supprimer le fichier parasite
Remove-Item "C:\Dev\null"

# 3. Nettoyer le cache Gradle (optionnel, ~5-10 GB récupérables)
# Attention : le prochain build sera plus long
gradle --stop
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\transforms-*"
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches\journal-*"

# 4. Vérifier la junction
Get-Item -Force 'C:\h' | Select-Object -ExpandProperty Target
# Doit afficher : C:\Dev\happy-v6
```

**Résultat attendu** : `C:\Dev` passe de **30 GB** à ~**15 GB** (Android SDK 11 GB + happy-v6 4.2 GB).

---

## 4. Les deux repos GitHub

### Historique

| Repo | URL | Usage | Statut |
|------|-----|-------|--------|
| `theflysurfer/happy-claude-client` | ancien fork standalone de l'app seule | `C:\Dev\happy`, `C:\Dev\hb`, `C:\Dev\happy-build` | ❌ **Obsolète** — remplacé par Happier |
| `theflysurfer/Happier` | fork du monorepo `slopus/happy` | OneDrive (repo principal) | ✅ **Actif** |

Le repo `happy-claude-client` est l'ancien fork d'avant la restructuration monorepo upstream. Il n'a plus de raison d'exister. Les 3 copies dans `C:\Dev` en sont des clones.

**Action** : Archiver `theflysurfer/happy-claude-client` sur GitHub (Settings → Archive).

---

## 5. Clarification des branches upstream/main

### Problème actuel

La structure de notre fork diffère de upstream :
- **Upstream** : monorepo `packages/{happy-app,happy-cli,happy-server,happy-wire,happy-agent}`
- **Notre fork** : flat `happy/` + `happy-cli/`

Cela rend les merges upstream impossibles directement (1680 fichiers changés dans le diff).

### Plan de résolution des branches

#### Option A : Garder la structure plate (recommandé)

1. **`master`** = notre branche de travail (structure plate)
2. **`upstream-snapshot`** = snapshot de upstream/main pour référence
3. Merge upstream manuellement : cherry-pick les commits intéressants, pas de merge automatique

**Workflow pour syncer avec upstream :**
```bash
# Mettre à jour upstream
git fetch upstream

# Voir les nouveaux commits
git log upstream-snapshot..upstream/main --oneline

# Cherry-pick ce qui nous intéresse (en adaptant les paths)
# packages/happy-app/... → happy/...
# packages/happy-cli/... → happy-cli/...
```

#### Option B : Revenir au monorepo (plus de travail, meilleure compatibilité)

Restructurer notre repo pour matcher upstream. Trop de travail pour le bénéfice.

**Recommandation : Option A** — garder la structure plate, documenter le workflow de sync.

---

## 6. Intégration de Pi comme backend dans happy-cli

### Architecture actuelle de happy-cli

Happy CLI supporte **3 agents** avec un pattern clair :

```
happy [claude]   → runClaude()   → SDK @anthropic-ai/claude-code
happy codex      → runCodex()    → CodexMcpClient (MCP stdio)
happy gemini     → runGemini()   → ACP backend (Agent Control Protocol)
```

### Ce que Pi expose (SDK `@mariozechner/pi-coding-agent`)

| Primitive | API Pi |
|-----------|--------|
| Créer session | `createAgentSession({ sessionManager: SessionManager.inMemory() })` |
| Envoyer prompt | `session.prompt(text)` |
| Streamer events | `session.subscribe(listener)` — `text_delta`, `thinking_delta`, `tool_execution_*`, etc. |
| Annuler | `session.abort()` |
| Cleanup | `session.dispose()` |
| Outils | Built-in (read, bash, edit, write) + custom tools + extensions |
| Skills/Extensions | Chargement automatique ou configurable via `ResourceLoader` |
| Auth | `AuthStorage.create()` — lit `~/.pi/agent/auth.json` ou env vars |

### Verdict : **Intégration aisée** ✅

Pi est **plus simple** que les 3 agents existants :
- **In-process** (pas de process spawn comme Claude, pas de MCP stdio comme Codex, pas de HTTP comme Gemini)
- SDK TypeScript natif avec exactement les primitives nécessaires
- Event system qui mappe parfaitement sur les messages Happy

### Plan d'implémentation

#### Phase 1 : `src/pi/` dans happy-cli (~500 lignes, ~1 jour)

##### 1.1 `src/pi/piBackend.ts` — Wrapper SDK (~100 lignes)

```typescript
import { createAgentSession, SessionManager, AuthStorage, ModelRegistry } from "@mariozechner/pi-coding-agent";

export class PiBackend {
  private session: AgentSession;
  
  async create(opts: { cwd: string }): Promise<void> {
    const authStorage = AuthStorage.create();
    const modelRegistry = new ModelRegistry(authStorage);
    const { session } = await createAgentSession({
      sessionManager: SessionManager.inMemory(),
      authStorage,
      modelRegistry,
      cwd: opts.cwd,
    });
    this.session = session;
  }
  
  async prompt(text: string): Promise<void> { await this.session.prompt(text); }
  async abort(): Promise<void> { await this.session.abort(); }
  subscribe(listener: (event) => void): () => void { return this.session.subscribe(listener); }
  dispose(): void { this.session.dispose(); }
}
```

##### 1.2 `src/pi/runPi.ts` — Point d'entrée (~300 lignes)

Calqué sur `runGemini.ts` :
1. Auth + machine setup (API Happy)
2. Créer session Happy (flavor: `'pi'`)
3. Démarrer Happy MCP server (pour `change_title`, etc.)
4. Créer PiBackend
5. Boucle : messages mobile → `session.prompt()` → subscribe events → forward au mobile
6. Cleanup

##### 1.3 Event mapping Pi → Happy messages

| Événement Pi SDK | Message Happy (mobile) |
|---|---|
| `message_update` + `text_delta` | `{ type: 'message', delta }` |
| `message_update` + `thinking_delta` | `{ type: 'thinking', text }` |
| `tool_execution_start` | `{ type: 'tool-call', name, callId }` |
| `tool_execution_end` | `{ type: 'tool-result', callId, output }` |
| `agent_start` | `{ type: 'task_started' }` |
| `agent_end` | `{ type: 'task_complete' }` |

#### Phase 2 : Wiring CLI (~25 lignes)

- `src/index.ts` : ajouter `case 'pi'` → `import('@/pi/runPi')`
- `BackendFlavor` : ajouter `'pi'`
- Optionnel : `src/ui/ink/PiDisplay.tsx` (~50 lignes)

#### Phase 3 : App mobile (happy/)

L'app doit reconnaître `flavor: 'pi'` :
- Logo/icône Pi
- Parser les messages (même format que les autres)
- Bouton pour lancer des sessions Pi

### Avantages vs autres agents

| Aspect | Claude | Codex | Gemini | **Pi** |
|--------|--------|-------|--------|--------|
| Exécution | Process spawn | MCP stdio | ACP HTTP | **In-process** |
| Complexité | Haute | Moyenne | Haute | **Faible** |
| Session tracking | Hooks + watcher | MCP session | ACP session | **SDK events** |
| Modèles | Claude only | OpenAI only | Gemini only | **Multi-provider** |

### Points d'attention

1. **Dépendance npm** : `@mariozechner/pi-coding-agent` à ajouter au `package.json`
2. **Auth** : Pi lit ses propres clés (`~/.pi/agent/auth.json`). Pas besoin de gérer ça côté Happy.
3. **Extensions/Skills** : En mode Happy, limiter via `ResourceLoader` custom (pas besoin de charger 71 skills)
4. **Multi-provider** : Pi supporte Anthropic, OpenAI, Google, etc. — l'app pourrait exposer le choix du modèle

---

## 7. Actions immédiates (nettoyage)

### À exécuter maintenant

```bash
# 1. Supprimer le code mort tracké
git rm -r happy/sources/-zen/

# 2. Supprimer les fichiers non trackés du disque
rm -rf happy/sources/trash/
rm -f "C:Devhbactivity_top.txt" "C:Devhblogcat_recent.txt"
rm -f wa-logs.txt mcp-logs.txt
rm -f fix_send.py patch_default.py patch_layout.py patch_sessionview.py patch_storage_zen.py
rm -rf logs/ tmp/

# 3. Détracker les screenshots (57MB)
git rm -r --cached happy/screenshots/
echo "happy/screenshots/" >> .gitignore

# 4. Commit
git add -A && git commit -m "chore: remove dead code (-zen, trash, screenshots, debug files)"
```

### À documenter

- Ajouter un `README.md` racine expliquant la structure fork
- Mettre à jour `upstream-snapshot` : `git checkout upstream-snapshot && git merge upstream/main && git checkout master`

---

## 8. Estimation globale

| Tâche | Effort | Espace récupéré |
|-------|--------|----------------|
| Nettoyage code mort (repo git) | 15 min | ~60 MB (screenshots + -zen) |
| Nettoyage `C:\Dev` (3 doublons) | 10 min | **~15 GB** |
| Nettoyage cache Gradle (optionnel) | 5 min | ~5-10 GB |
| Archiver repo `happy-claude-client` | 5 min | — |
| Documentation branches + README | 30 min | — |
| Intégration Pi (Phase 1-2 : CLI) | 1 jour | — |
| Intégration Pi (Phase 3 : mobile) | 0.5 jour | — |
| **Total** | **~2 jours** | **~20-25 GB** |
