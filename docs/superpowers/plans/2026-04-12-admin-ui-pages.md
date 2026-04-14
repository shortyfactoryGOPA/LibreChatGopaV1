# Admin UI Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the three GOPA admin pages (Users, Moderation, Analytics) into GopaV1, accessible via a single Admin icon in the UnifiedSidebar that opens a panel with three sub-links.

**Architecture:** Pure port — copy three route components from GOPA, create one new `AdminNavPanel` sidebar panel component, wire one conditional nav entry into `useUnifiedSidebarLinks`, register three routes, and add 91 localization keys. The data-provider layer (queries/mutations/endpoints) is already in place from Admin Foundation.

**Tech Stack:** TypeScript, React, React Router v6, React Query, Recoil, Lucide icons, Tailwind CSS, `librechat-data-provider`.

---

## Task 1: Localization keys

**Files:**
- Modify: `client/src/locales/en/translation.json`

- [ ] **Step 1: Add 91 admin keys to `client/src/locales/en/translation.json`**

Find the last two lines of the file:
```json
  "com_ui_zoom_out": "Zoom out",
  "com_user_message": "You"
}
```

Replace with:
```json
  "com_ui_zoom_out": "Zoom out",
  "com_ui_admin": "Admin",
  "com_ui_admin_action_completed": "Action completed",
  "com_ui_admin_action_failed": "Action failed",
  "com_ui_admin_actions": "Actions",
  "com_ui_admin_active_bans": "Active bans",
  "com_ui_admin_active_limits": "Active Limits",
  "com_ui_admin_analytics": "Analytics",
  "com_ui_admin_analytics_description": "Live admin analytics for users, uploaded files, and DeepL jobs.",
  "com_ui_admin_area": "Area",
  "com_ui_admin_auth_mode": "Auth mode",
  "com_ui_admin_auth_mode_hybrid": "Hybrid (OpenID + local)",
  "com_ui_admin_auth_mode_hybrid_provider": "Hybrid ({{provider}} + local)",
  "com_ui_admin_auth_mode_local_only": "Local-only",
  "com_ui_admin_auth_mode_openid_only": "OpenID-only",
  "com_ui_admin_auth_mode_openid_provider": "OpenID-only ({{provider}})",
  "com_ui_admin_auth_mode_unknown": "Unknown",
  "com_ui_admin_ban": "Ban",
  "com_ui_admin_ban_prompt": "Ban duration in minutes (default: 120)",
  "com_ui_admin_banned": "Banned",
  "com_ui_admin_bans": "Bans",
  "com_ui_admin_conditional_limits": "Conditional Limits",
  "com_ui_admin_conversations": "Conversations",
  "com_ui_admin_count": "Count",
  "com_ui_admin_date": "Date",
  "com_ui_admin_deepl_jobs": "DeepL Jobs",
  "com_ui_admin_deepl_search_placeholder": "Search by email, user ID, file name, or error",
  "com_ui_admin_deepl_status_done": "done",
  "com_ui_admin_deepl_status_downloaded": "downloaded",
  "com_ui_admin_deepl_status_translating": "translating",
  "com_ui_admin_deepl_status_uploaded": "uploaded",
  "com_ui_admin_delete_confirm": "Delete user {{target}} and all related data? This cannot be undone.",
  "com_ui_admin_duration_days_hours": "{{days}}d {{hours}}h",
  "com_ui_admin_duration_hours_minutes": "{{hours}}h {{minutes}}m",
  "com_ui_admin_duration_minutes_seconds": "{{minutes}}m {{seconds}}s",
  "com_ui_admin_duration_seconds": "{{seconds}}s",
  "com_ui_admin_env_keys": "Env keys",
  "com_ui_admin_expired": "Expired",
  "com_ui_admin_expires": "Expires",
  "com_ui_admin_file": "File",
  "com_ui_admin_generated_at": "Generated at",
  "com_ui_admin_inactive_limits": "Inactive Limits",
  "com_ui_admin_issuer": "Issuer",
  "com_ui_admin_key": "Key",
  "com_ui_admin_languages": "Languages",
  "com_ui_admin_limiter": "Limiter",
  "com_ui_admin_load_analytics_error": "Unable to load analytics data",
  "com_ui_admin_load_moderation_error": "Unable to load moderation data",
  "com_ui_admin_load_users_error": "Unable to load users",
  "com_ui_admin_moderation": "Moderation",
  "com_ui_admin_moderation_description": "Real-time view of limit configuration, violation activity, and bans.",
  "com_ui_admin_no_active_limits": "No active limit metadata returned.",
  "com_ui_admin_no_bans": "No ban events found.",
  "com_ui_admin_no_conditional_limits": "No conditional limits.",
  "com_ui_admin_no_deepl_jobs": "No DeepL jobs found.",
  "com_ui_admin_no_inactive_limits": "No inactive limits.",
  "com_ui_admin_no_violations": "No violation events found.",
  "com_ui_admin_page_summary": "Page {{page}} / {{totalPages}}",
  "com_ui_admin_reason": "Reason",
  "com_ui_admin_recent_bans": "Recent Bans",
  "com_ui_admin_recent_violations": "Recent Violations",
  "com_ui_admin_refresh_token_timeout": "Refresh token timeout",
  "com_ui_admin_reset_password": "Reset password",
  "com_ui_admin_reset_password_confirm": "Trigger password reset for {{target}}?",
  "com_ui_admin_retention_allowed_range": "Allowed range: {{min}}-{{max}} days.",
  "com_ui_admin_retention_description": "Automatically remove old sidebar uploads while keeping historical upload counts for analytics.",
  "com_ui_admin_retention_enabled": "Enable automatic cleanup",
  "com_ui_admin_retention_purge_confirm": "Delete all sidebar uploaded files now? Historical upload counts stay preserved.",
  "com_ui_admin_retention_purge_error": "Unable to delete uploaded files now",
  "com_ui_admin_retention_purge_now": "Delete uploaded files now",
  "com_ui_admin_retention_purged": "Immediate cleanup completed for {{count}} uploaded file(s).",
  "com_ui_admin_retention_save_error": "Unable to save uploaded file retention settings",
  "com_ui_admin_retention_title": "Uploaded File Retention",
  "com_ui_admin_session_timeout": "Session timeout",
  "com_ui_admin_status": "Status",
  "com_ui_admin_time_left": "Time left",
  "com_ui_admin_total_jobs": "Total jobs: {{total}}",
  "com_ui_admin_total_users": "Total users: {{total}}",
  "com_ui_admin_type": "Type",
  "com_ui_admin_unban": "Unban",
  "com_ui_admin_unban_confirm": "Unban user {{target}}?",
  "com_ui_admin_upload_files": "Upload Files",
  "com_ui_admin_username": "Username",
  "com_ui_admin_users": "Users",
  "com_ui_admin_users_description": "Live admin view of user accounts with search, provider, verification, and ban status.",
  "com_ui_admin_users_no_results": "No users found.",
  "com_ui_admin_users_search_placeholder": "Search by email, username, or name",
  "com_ui_admin_values": "Values",
  "com_ui_admin_verified": "Verified",
  "com_ui_admin_violations": "Violations",
  "com_ui_admin_window": "Window",
  "com_ui_admin_window_minutes": "{{count}} min",
  "com_user_message": "You"
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/locales/en/translation.json
git commit -m "feat(client): add admin localization keys"
```

---

## Task 2: PNG assets

**Files:**
- Create: `client/public/assets/users_32.png`
- Create: `client/public/assets/moderation_32.png`
- Create: `client/public/assets/analytics_32.png`

- [ ] **Step 1: Copy the three admin PNG icons from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/client/public/assets/users_32.png" \
   "d:/TestTmp/LibreChatGopaV1/client/public/assets/users_32.png"

cp "d:/Developement2026/LibreChatGOPA/client/public/assets/moderation_32.png" \
   "d:/TestTmp/LibreChatGopaV1/client/public/assets/moderation_32.png"

cp "d:/Developement2026/LibreChatGOPA/client/public/assets/analytics_32.png" \
   "d:/TestTmp/LibreChatGopaV1/client/public/assets/analytics_32.png"
```

Verify the files were copied:
```bash
ls "d:/TestTmp/LibreChatGopaV1/client/public/assets/" | grep -E "(users|moderation|analytics)_32"
```

Expected: three lines — `users_32.png`, `moderation_32.png`, `analytics_32.png`.

- [ ] **Step 2: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/public/assets/users_32.png \
        client/public/assets/moderation_32.png \
        client/public/assets/analytics_32.png
git commit -m "feat(client): add admin panel PNG icon assets"
```

---

## Task 3: AdminNavPanel component

**Files:**
- Create: `client/src/components/Nav/AdminNavPanel.tsx`

- [ ] **Step 1: Create `client/src/components/Nav/AdminNavPanel.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { BarChart2, ShieldAlert, Users } from 'lucide-react';
import { useLocalize } from '~/hooks';

export default function AdminNavPanel() {
  const navigate = useNavigate();
  const localize = useLocalize();

  const links = [
    { to: '/admin/users', Icon: Users, label: localize('com_ui_admin_users') },
    { to: '/admin/moderation', Icon: ShieldAlert, label: localize('com_ui_admin_moderation') },
    { to: '/admin/analytics', Icon: BarChart2, label: localize('com_ui_admin_analytics') },
  ] as const;

  return (
    <div className="flex flex-col gap-1 p-2">
      {links.map(({ to, Icon, label }) => (
        <button
          key={to}
          onClick={() => navigate(to)}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-hover"
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/components/Nav/AdminNavPanel.tsx
git commit -m "feat(client): add AdminNavPanel sidebar component"
```

---

## Task 4: Sidebar integration

**Files:**
- Modify: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`

- [ ] **Step 1: Replace `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` with the following**

```typescript
import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { BookOpen, Languages, MessagesSquare, ShieldCheck, Target } from 'lucide-react';
import { SystemRoles } from 'librechat-data-provider';
import { useUserKeyQuery } from 'librechat-data-provider/react-query';
import { getConfigDefaults, getEndpointField } from 'librechat-data-provider';
import type { TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import AdminNavPanel from '~/components/Nav/AdminNavPanel';
import ConversationsSection from '~/components/UnifiedSidebar/ConversationsSection';
import { useGetEndpointsQuery, useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';
import useSideNavLinks from '~/hooks/Nav/useSideNavLinks';
import store from '~/store';

const defaultInterface = getConfigDefaults().interface;

export default function useUnifiedSidebarLinks() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const endpoint = conversation?.endpoint;
  const { data: startupConfig } = useGetStartupConfig();
  const { data: endpointsConfig = {} as TEndpointsConfig } = useGetEndpointsQuery();

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const endpointType = useMemo(
    () => getEndpointField(endpointsConfig, endpoint, 'type'),
    [endpoint, endpointsConfig],
  );

  const userProvidesKey = useMemo(
    () => !!(endpointsConfig?.[endpoint ?? '']?.userProvide ?? false),
    [endpointsConfig, endpoint],
  );

  const { data: keyExpiry = { expiresAt: undefined } } = useUserKeyQuery(endpoint ?? '');

  const keyProvided = useMemo(
    () => (userProvidesKey ? !!(keyExpiry.expiresAt ?? '') : true),
    [keyExpiry.expiresAt, userProvidesKey],
  );

  const sideNavLinks = useSideNavLinks({
    keyProvided,
    endpoint,
    endpointType,
    interfaceConfig,
    endpointsConfig,
    includeHidePanel: false,
  });

  const handleDeepLNavigate = useCallback(() => navigate('/deepl'), [navigate]);
  const handleSDGNavigate = useCallback(() => navigate('/sdg'), [navigate]);
  const handleGuideNavigate = useCallback(() => navigate('/guide'), [navigate]);

  const isAdmin = user?.role === SystemRoles.ADMIN;

  const links = useMemo(() => {
    const conversationLink: NavLink = {
      title: 'com_ui_chat_history',
      label: '',
      icon: MessagesSquare,
      id: 'conversations',
      Component: ConversationsSection,
    };

    const deeplLink: NavLink = {
      title: 'com_ui_gopa_nav_document_translator',
      label: '',
      icon: Languages,
      id: 'deepl',
      onClick: handleDeepLNavigate,
    };

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

    const adminLink: NavLink = {
      title: 'com_ui_admin',
      label: '',
      icon: ShieldCheck,
      id: 'admin',
      Component: AdminNavPanel,
    };

    const baseLinks = [conversationLink, ...sideNavLinks, deeplLink, sdgLink, guideLink];
    return isAdmin ? [...baseLinks, adminLink] : baseLinks;
  }, [sideNavLinks, handleDeepLNavigate, handleSDGNavigate, handleGuideNavigate, isAdmin]);

  return links;
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd d:/TestTmp/LibreChatGopaV1 && npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -E "error TS.*(useUnifiedSidebarLinks|AdminNavPanel)" | head -10
```

Expected: no output (no errors in these files).

- [ ] **Step 3: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/hooks/Nav/useUnifiedSidebarLinks.ts
git commit -m "feat(client): add Admin nav entry to UnifiedSidebar (ADMIN role only)"
```

---

## Task 5: Admin pages and routes

**Files:**
- Create: `client/src/routes/AdminUsers.tsx`
- Create: `client/src/routes/AdminModeration.tsx`
- Create: `client/src/routes/AdminAnalytics.tsx`
- Modify: `client/src/routes/index.tsx`

- [ ] **Step 1: Copy the three admin page components from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/client/src/routes/AdminUsers.tsx" \
   "d:/TestTmp/LibreChatGopaV1/client/src/routes/AdminUsers.tsx"

cp "d:/Developement2026/LibreChatGOPA/client/src/routes/AdminModeration.tsx" \
   "d:/TestTmp/LibreChatGopaV1/client/src/routes/AdminModeration.tsx"

cp "d:/Developement2026/LibreChatGOPA/client/src/routes/AdminAnalytics.tsx" \
   "d:/TestTmp/LibreChatGopaV1/client/src/routes/AdminAnalytics.tsx"
```

All three pages import `SidebarReopenButton` from `~/components/Nav/SidebarReopenButton` and `PageHeaderCard` from `~/components/PageHeaderCard` — both exist in GopaV1 and are compatible. All data-provider hooks (`useGetAdminUsersQuery`, `useAdminBanUserMutation`, etc.) are already in place from Admin Foundation. No modifications needed.

- [ ] **Step 2: Register the three admin routes in `client/src/routes/index.tsx`**

In `client/src/routes/index.tsx`, find the existing imports at the top:
```tsx
import DeepL from './DeepL';
import SDG from './SDG';
import UserGuide from './UserGuide';
import Root from './Root';
```

Add after `import UserGuide from './UserGuide';`:
```tsx
import AdminUsers from './AdminUsers';
import AdminModeration from './AdminModeration';
import AdminAnalytics from './AdminAnalytics';
```

Then find the existing route children under `<Root>`:
```tsx
            {
              path: 'guide',
              element: <UserGuide />,
            },
```

Add after it:
```tsx
            {
              path: 'admin/users',
              element: <AdminUsers />,
            },
            {
              path: 'admin/moderation',
              element: <AdminModeration />,
            },
            {
              path: 'admin/analytics',
              element: <AdminAnalytics />,
            },
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd d:/TestTmp/LibreChatGopaV1 && npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep "error TS" | head -20
```

Expected: no output. If errors appear in the Admin pages (e.g. `formatBytes` not found), fix each import:
- `formatBytes` missing → check if it exists at `~/utils` with: `grep -r "export.*formatBytes" client/src/utils/`; if not found, add to `client/src/utils/index.ts`:
  ```typescript
  export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
  ```

- [ ] **Step 4: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/routes/AdminUsers.tsx \
        client/src/routes/AdminModeration.tsx \
        client/src/routes/AdminAnalytics.tsx \
        client/src/routes/index.tsx
git commit -m "feat(client): add Admin pages and routes"
```

---

## Verification

After all tasks, start the frontend dev server and verify manually:

```bash
npm run frontend:dev
```

Check:
1. Log in as `shortyfactory@gmail.com` (ADMIN role) → Admin icon (`ShieldCheck`) appears at the bottom of the sidebar
2. Click Admin icon → panel opens with three links: Users, Moderation, Analytics
3. Click Users → `/admin/users` loads with user table showing 1 user
4. Click Moderation → `/admin/moderation` loads with moderation dashboard
5. Click Analytics → `/admin/analytics` loads with tabs (Users / DeepL Jobs) + file retention panel
6. Log in as a non-admin account → no Admin icon in sidebar
7. Navigate directly to `/admin/users` as non-admin → redirected to `/c/new`
