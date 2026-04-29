# Fonctionnalités cachées / désactivées pour GOPA

Ce fichier recense toutes les fonctionnalités de LibreChat qui ont été masquées ou désactivées
dans le cadre de la personnalisation GOPA. Pour réactiver une fonctionnalité, voir la section
"Comment réactiver" associée.

---

## 1. Artefacts

**Ce que c'est :** Génération de contenus rendus (code interactif, diagrammes, UI avec shadcn/ui)
dans un panneau latéral. Permet d'afficher le résultat visuel d'un snippet de code directement
dans l'interface.

**Pourquoi caché :** Non pertinent pour l'usage GOPA à ce stade.

**Fichiers modifiés :**
- `client/src/components/Chat/Input/ToolsDropdown.tsx` — bloc `ArtifactsSubMenu` retiré de `dropdownItems`
- Imports `ArtifactModes`, `ArtifactsSubMenu`, handlers `handleArtifactsToggle/Shadcn/Custom` supprimés

**Comment réactiver :** Réintroduire le bloc `if (artifactsEnabled && setIsArtifactsPinned != null)`
dans `ToolsDropdown.tsx` et remettre `<Artifacts />` dans `BadgeRow.tsx`.

---

## 2. Recherche de fichiers (File Search / RAG utilisateur)

**Ce que c'est :** Permet à un utilisateur d'uploader ses propres fichiers (PDF, Word, etc.)
dans un vector store OpenAI (via l'API Assistants). Le modèle peut ensuite faire des recherches
sémantiques (RAG) dans ces fichiers lors de la conversation. Les fichiers persistent entre
plusieurs conversations.

**Pourquoi caché :** Pas de vector store configuré pour GOPA. Si un RAG est mis en place,
ce sera sur une base documentaire partagée gérée par l'admin, pas par upload utilisateur individuel.

**Fichiers modifiés :**
- `client/src/components/Chat/Input/BadgeRow.tsx` — `<FileSearch />` retiré des ephemeral badges
- `client/src/components/Chat/Input/ToolsDropdown.tsx` — bloc file search retiré de `dropdownItems`
- `client/src/components/Chat/Input/Files/AttachFileMenu.tsx` — option "Télécharger pour la recherche dans un fichier" retirée du menu d'upload

**Comment réactiver :**
1. Remettre `<FileSearch />` dans `BadgeRow.tsx` (section `showEphemeralBadges`)
2. Réintroduire le bloc `if (fileSearchEnabled && canUseFileSearch)` dans `ToolsDropdown.tsx`
3. Réintroduire le bloc `if (capabilities.fileSearchEnabled && fileSearchAllowedByAgent)` dans `AttachFileMenu.tsx`

---

## 3. Bouton de configuration recherche web (⚙️)

**Ce que c'est :** Icône engrenage à côté de "Recherche web" dans le dropdown des outils,
ouvrant un dialog de configuration Firecrawl / Jina AI (clé API, fournisseur).

**Pourquoi caché :** La recherche web est configurée au niveau admin (librechat.yaml).
Les utilisateurs n'ont pas besoin de saisir de clé API.

**Fichier modifié :**
- `client/src/components/Chat/Input/ToolsDropdown.tsx` — `showWebSearchSettings = false`

**Comment réactiver :** Changer `showWebSearchSettings` à `true` (ou le lier à `authData`).

---

## 4. Clic sur "Recherche web" → activation directe (sans dialog)

**Ce que c'est :** Modification du comportement du badge "Recherche web" dans la barre de saisie.
Par défaut, LibreChat ouvre un dialog de configuration API au premier clic. Désormais, le clic
active/désactive directement la recherche web.

**Pourquoi modifié :** La configuration est gérée côté admin, pas besoin d'exposer le dialog.

**Fichiers modifiés :**
- `client/src/Providers/BadgeRowContext.tsx` — `isAuthenticated: true` sur le `useToolToggle` de webSearch
- `client/src/components/Chat/Input/WebSearch.tsx` — suppression du check `authData`

**Comment revenir au comportement original :** Retirer `isAuthenticated: true` et remettre
`setIsDialogOpen: setWebSearchDialogOpen` dans `BadgeRowContext.tsx`.
