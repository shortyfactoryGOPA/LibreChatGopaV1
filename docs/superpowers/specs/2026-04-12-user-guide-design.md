# User Guide Page — Design Spec

**Goal:** Port the static User Guide page from `d:/Developement2026/LibreChatGOPA` into `d:/TestTmp/LibreChatGopaV1` and wire it to the `/guide` route with a `BookOpen` nav link.

**Architecture:** Pure copy — no backend, no data fetching, no new shared types. The component is fully static and presentational. All local dependencies (`SidebarReopenButton`, `PageHeaderCard`, `useLocalize`) already exist in GopaV1.

---

## Files

| Action | Path |
|--------|------|
| Copy | `client/src/routes/UserGuide.tsx` (from GOPA, no changes) |
| Copy asset | `client/public/assets/user_guide_32.png` (from GOPA) |
| Modify | `client/src/routes/index.tsx` — add `/guide` route |
| Modify | `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` — add `BookOpen` + `guideLink` |
| Modify | `client/src/locales/en/translation.json` — add 32 missing keys |

---

## Nav Link

Follow the exact pattern of `deeplLink` and `sdgLink` in `useUnifiedSidebarLinks.ts`:

```typescript
// Add BookOpen to lucide-react import
import { BookOpen, Languages, MessagesSquare, Target } from 'lucide-react';

// Add callback after handleSDGNavigate
const handleGuideNavigate = useCallback(() => navigate('/guide'), [navigate]);

// Add guideLink in useMemo, after sdgLink
const guideLink: NavLink = {
  title: 'com_ui_gopa_user_guide',
  label: '',
  icon: BookOpen,
  id: 'guide',
  onClick: handleGuideNavigate,
};

// Return: append guideLink at the end
return [conversationLink, ...sideNavLinks, deeplLink, sdgLink, guideLink];
```

---

## Route

In `client/src/routes/index.tsx`, add after the `sdg` route:

```typescript
import UserGuide from './UserGuide';

// route entry:
{ path: 'guide', element: <UserGuide /> }
```

---

## i18n Keys (32 missing)

Add to `client/src/locales/en/translation.json` near the other `com_ui_gopa_*` keys:

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

---

## No Tests Required

The component has zero state and zero side effects. TypeScript check on the client build is the only verification needed.
