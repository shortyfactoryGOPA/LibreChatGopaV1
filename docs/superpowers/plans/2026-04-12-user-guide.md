# User Guide Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the static User Guide page from GOPA into GopaV1, wire it to `/guide`, and add a `BookOpen` nav icon in the sidebar.

**Architecture:** Pure copy — no backend, no data fetching. Copy one component and one PNG asset, add a route, add a nav link, add 32 i18n keys. All local dependencies already exist in GopaV1.

**Tech Stack:** React, TypeScript, lucide-react, react-router-dom, `useLocalize` (i18n).

---

## Task 1: Copy asset and component

**Files:**
- Create: `client/public/assets/user_guide_32.png`
- Create: `client/src/routes/UserGuide.tsx`

- [ ] **Step 1: Copy the PNG asset**

```bash
cp "d:/Developement2026/LibreChatGOPA/client/public/assets/user_guide_32.png" "d:/TestTmp/LibreChatGopaV1/client/public/assets/user_guide_32.png"
```

- [ ] **Step 2: Copy the route component**

```bash
cp "d:/Developement2026/LibreChatGOPA/client/src/routes/UserGuide.tsx" "d:/TestTmp/LibreChatGopaV1/client/src/routes/UserGuide.tsx"
```

No modifications needed. All imports resolve in GopaV1:
- `~/components/Nav/SidebarReopenButton` ✓
- `~/components/PageHeaderCard` ✓
- `~/hooks` (`useLocalize`) ✓
- All lucide-react icons (`ArrowUp`, `AtSign`, `BookOpen`, `Bot`, `Languages`, `MessageSquare`, `Paperclip`, `Sparkles`) ✓

- [ ] **Step 3: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/public/assets/user_guide_32.png client/src/routes/UserGuide.tsx
git commit -m "feat(client): add User Guide component and asset"
```

---

## Task 2: Wire route and nav link

**Files:**
- Modify: `client/src/routes/index.tsx`
- Modify: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`

- [ ] **Step 1: Add import and route in `client/src/routes/index.tsx`**

Current imports block (lines 22–24):
```typescript
import DeepL from './DeepL';
import SDG from './SDG';
import Root from './Root';
```

Replace with:
```typescript
import DeepL from './DeepL';
import SDG from './SDG';
import UserGuide from './UserGuide';
import Root from './Root';
```

Current route entries (lines 149–156):
```typescript
            {
              path: 'deepl',
              element: <DeepL />,
            },
            {
              path: 'sdg',
              element: <SDG />,
            },
```

Replace with:
```typescript
            {
              path: 'deepl',
              element: <DeepL />,
            },
            {
              path: 'sdg',
              element: <SDG />,
            },
            {
              path: 'guide',
              element: <UserGuide />,
            },
```

- [ ] **Step 2: Add `BookOpen` + `guideLink` in `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`**

Current lucide-react import (line 4):
```typescript
import { Languages, MessagesSquare, Target } from 'lucide-react';
```

Replace with:
```typescript
import { BookOpen, Languages, MessagesSquare, Target } from 'lucide-react';
```

Current callbacks (lines 54–55):
```typescript
  const handleDeepLNavigate = useCallback(() => navigate('/deepl'), [navigate]);
  const handleSDGNavigate = useCallback(() => navigate('/sdg'), [navigate]);
```

Replace with:
```typescript
  const handleDeepLNavigate = useCallback(() => navigate('/deepl'), [navigate]);
  const handleSDGNavigate = useCallback(() => navigate('/sdg'), [navigate]);
  const handleGuideNavigate = useCallback(() => navigate('/guide'), [navigate]);
```

Current `sdgLink` and return (lines 74–83):
```typescript
    const sdgLink: NavLink = {
      title: 'com_ui_gopa_nav_sdg_mapper',
      label: '',
      icon: Target,
      id: 'sdg',
      onClick: handleSDGNavigate,
    };

    return [conversationLink, ...sideNavLinks, deeplLink, sdgLink];
  }, [sideNavLinks, handleDeepLNavigate, handleSDGNavigate]);
```

Replace with:
```typescript
    const sdgLink: NavLink = {
      title: 'com_ui_gopa_nav_sdg_mapper',
      label: '',
      icon: Target,
      id: 'sdg',
      onClick: handleSDGNavigate,
    };

    const guideLink: NavLink = {
      title: 'com_ui_gopa_user_guide',
      label: '',
      icon: BookOpen,
      id: 'guide',
      onClick: handleGuideNavigate,
    };

    return [conversationLink, ...sideNavLinks, deeplLink, sdgLink, guideLink];
  }, [sideNavLinks, handleDeepLNavigate, handleSDGNavigate, handleGuideNavigate]);
```

- [ ] **Step 3: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/routes/index.tsx client/src/hooks/Nav/useUnifiedSidebarLinks.ts
git commit -m "feat(client): wire /guide route and BookOpen nav link"
```

---

## Task 3: Add i18n keys

**Files:**
- Modify: `client/src/locales/en/translation.json`

- [ ] **Step 1: Add 32 missing keys**

In `client/src/locales/en/translation.json`, find the block containing `com_ui_gopa_nav_document_translator` (around line 1100). Insert the following keys in alphabetical order within the `com_ui_gopa_*` block (after `com_ui_gopa_guide_*` entries don't exist yet — add them before `com_ui_gopa_nav_*`):

```json
"com_ui_gopa_guide_attached_file_title": "File attached to a chat",
"com_ui_gopa_guide_description": "The main GOPA workflows available in this instance: start a clean chat, reuse prompts, attach files correctly, and understand where SDG and translation tools fit.",
"com_ui_gopa_guide_format_agent": "Best when you need a stable setup with reusable instructions or files across several chats.",
"com_ui_gopa_guide_format_file": "Best when one document should support one specific conversation. The file must be attached to the current chat.",
"com_ui_gopa_guide_format_prompt": "Best when you want to reuse the same instruction, tone, or output structure.",
"com_ui_gopa_guide_formats_description": "Use the right feature for the right kind of task.",
"com_ui_gopa_guide_formats_title": "Choose the right format",
"com_ui_gopa_guide_quick_access_description": "The most useful day-to-day entry points are grouped here.",
"com_ui_gopa_guide_quick_access_title": "Quick access",
"com_ui_gopa_guide_quick_deepl": "Translate full documents with the dedicated DeepL workflow.",
"com_ui_gopa_guide_quick_new_chat": "Start a clean conversation whenever you switch topic or document.",
"com_ui_gopa_guide_quick_prompts": "Save recurring instructions and reuse them quickly in the composer.",
"com_ui_gopa_guide_quick_sdg": "Open the SDG entry point and follow the migration status of the mapper.",
"com_ui_gopa_guide_reminder_body": "A file shown in the sidebar is not automatically active in every chat. Click it to attach it to the current conversation.",
"com_ui_gopa_guide_reminder_title": "Key reminder",
"com_ui_gopa_guide_shortcut_arrow_body": "If the composer is empty, Arrow Up reopens the last editable prompt or message.",
"com_ui_gopa_guide_shortcut_arrow_title": "Reopen your last draft",
"com_ui_gopa_guide_shortcut_at_body": "Use @ in the composer to switch quickly to a model, preset, assistant, or agent.",
"com_ui_gopa_guide_shortcut_at_title": "Change context quickly",
"com_ui_gopa_guide_shortcuts_description": "A few shortcuts save time once they become muscle memory.",
"com_ui_gopa_guide_shortcuts_title": "Composer shortcuts",
"com_ui_gopa_guide_step_attach_body": "In the sidebar, click the file name to attach it to the active conversation before asking the model to use it.",
"com_ui_gopa_guide_step_attach_title": "Attach the document to the chat",
"com_ui_gopa_guide_step_context_body": "Check the current model or agent before sending the first message.",
"com_ui_gopa_guide_step_context_title": "Confirm the active context",
"com_ui_gopa_guide_step_file_body": "Upload a new file or reopen one from your sidebar library when the answer should rely on a source document.",
"com_ui_gopa_guide_step_file_title": "Add the source material",
"com_ui_gopa_guide_step_request_body": "Ask for the exact output you want: summary, extraction, rewrite, bullet list, or translation.",
"com_ui_gopa_guide_step_request_title": "Ask a precise question",
"com_ui_gopa_guide_workflow_description": "This simple sequence avoids the most common mistakes.",
"com_ui_gopa_guide_workflow_title": "A good working flow",
"com_ui_gopa_user_guide": "User Guide"
```

- [ ] **Step 2: Verify JSON is valid**

```bash
cd d:/TestTmp/LibreChatGopaV1
node -e "JSON.parse(require('fs').readFileSync('client/src/locales/en/translation.json', 'utf8')); console.log('valid')"
```

Expected: `valid`

- [ ] **Step 3: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/locales/en/translation.json
git commit -m "feat(client): add User Guide i18n keys"
```

---

## Task 4: TypeScript verification

**Files:** none modified

- [ ] **Step 1: Run TypeScript check on client**

```bash
cd d:/TestTmp/LibreChatGopaV1
npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -E "UserGuide|useUnifiedSidebar|routes/index" | head -20
```

Expected: no output (no errors in the modified files).

- [ ] **Step 2: Start frontend and verify manually**

```bash
cd d:/TestTmp/LibreChatGopaV1
npm run frontend:dev
```

1. Open `http://localhost:3090`
2. Click the **BookOpen** icon in the sidebar — should navigate to `/guide`
3. Verify: page header with `user_guide_32.png` icon and "User Guide" title
4. Verify: 5 sections render — reminder banner, Quick Access grid, Formats, Workflow, Shortcuts
5. Verify: Quick Access links (`/c/new`, `/d/prompts`, `/sdg`, `/deepl`) work
