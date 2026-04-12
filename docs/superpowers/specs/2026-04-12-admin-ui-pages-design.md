# Admin UI Pages Design

## Goal

Port the three GOPA admin pages (Users, Moderation, Analytics) into GopaV1, adapting the navigation to GopaV1's UnifiedSidebar architecture. No logic invented — everything copied from `d:/Developement2026/LibreChatGOPA`.

## Architecture

Pure port of three full-page React components from GOPA, with one structural adaptation: GOPA's `QuickLinks`-based nav (PNG assets, classic sidebar) is replaced by a `AdminNavPanel` component registered in GopaV1's `useUnifiedSidebarLinks` hook (Lucide icons, UnifiedSidebar panel).

The data-provider layer (`client/src/data-provider/Admin/`) is already in place from Admin Foundation — no changes needed there.

## File Structure

**Create:**

| File | Source | Description |
|---|---|---|
| `client/src/components/Nav/AdminNavPanel.tsx` | New (no GOPA equivalent) | Sidebar panel with 3 NavLinks to admin pages |
| `client/src/routes/AdminUsers.tsx` | Copy from GOPA | User management table: search, pagination, ban/unban/reset/delete |
| `client/src/routes/AdminModeration.tsx` | Copy from GOPA | Moderation dashboard: violation cards, rate-limit tables, ban log |
| `client/src/routes/AdminAnalytics.tsx` | Copy from GOPA | Analytics: user activity table, DeepL jobs log, file retention settings |

**Modify:**

| File | Change |
|---|---|
| `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` | Add `adminLink` entry (ShieldCheck icon, AdminNavPanel component), visible only to ADMIN role |
| `client/src/routes/index.tsx` | Register `/admin/users`, `/admin/moderation`, `/admin/analytics` under Root |
| `client/src/locales/en/translation.json` | Add ~90 `com_ui_admin_*` keys from GOPA |

## Sidebar Integration

A single "Admin" entry is added to `useUnifiedSidebarLinks`:

```tsx
const adminLink: NavLink = {
  id: 'admin',
  title: 'com_ui_admin',
  icon: ShieldCheck,           // Lucide icon
  Component: AdminNavPanel,    // renders in the expanded sidebar panel
};
// Appended to links array only when user?.role === SystemRoles.ADMIN
```

`AdminNavPanel` renders three navigation links inside the expanded panel:

```
Users       → /admin/users       (Users icon)
Moderation  → /admin/moderation  (ShieldAlert icon)
Analytics   → /admin/analytics   (BarChart2 icon)
```

Each link uses `useNavigate()` and is labelled with a localized string.

## Routes

Three child routes registered under the authenticated `Root` layout in `client/src/routes/index.tsx`:

```tsx
{ path: 'admin/users',      element: <AdminUsers /> }
{ path: 'admin/moderation', element: <AdminModeration /> }
{ path: 'admin/analytics',  element: <AdminAnalytics /> }
```

Each page component enforces its own auth guard:
```tsx
if (!isAdmin) return <Navigate to="/c/new" />;
```

Routes are eagerly imported (not lazy-loaded), consistent with GOPA and the existing `/deepl`, `/sdg`, `/guide` routes in GopaV1.

## Pages

### AdminUsers

Full-page user management table. Features:
- Search bar (debounced)
- Paginated user list (200 per page)
- Per-user actions: Ban (with duration selector), Unban, Reset Password, Delete
- Confirmation dialogs for destructive actions
- Uses: `useGetAdminUsersQuery`, `useAdminBanUserMutation`, `useAdminUnbanUserMutation`, `useAdminResetPasswordMutation`, `useAdminDeleteUserMutation`

### AdminModeration

Full-page moderation dashboard. Features:
- Summary cards: active bans count, violation events count
- Auth mode card, session config card
- Three rate-limit tables (active / conditional / inactive)
- Violations log table
- Bans log table
- Uses: `useGetAdminModerationQuery`

### AdminAnalytics

Full-page analytics dashboard. Features:
- Two internal tabs: Users and DeepL Jobs
- Users tab: paginated user activity table (prompts, agents, conversations, sidebar files)
- DeepL Jobs tab: job log with status filter, paginated
- File retention settings panel (current settings, update form, purge action)
- Uses: `useGetAdminAnalyticsUsersQuery`, `useGetAdminDeepLJobsQuery`, `useGetAdminFileRetentionQuery`, `useAdminUpdateFileRetentionMutation`, `useAdminPurgeFileRetentionMutation`

## Compatibility Notes

**SidebarReopenButton**: GOPA's admin pages use `SidebarReopenButton` which reads `navVisible`/`setNavVisible` from `useOutletContext`. GopaV1's existing `SidebarReopenButton` is already adapted to use Recoil state (`store.sidebarExpanded`). The ported pages must import from GopaV1's version, not GOPA's.

**PageHeaderCard**: Already exists in GopaV1 (`client/src/components/PageHeaderCard.tsx`). No changes needed.

**Import paths**: All GOPA imports using `~/` alias work the same in GopaV1. Verify any GOPA-specific imports (e.g. from `~/components/Nav/QuickLinks`) are replaced or removed.

## Localization

Add ~90 `com_ui_admin_*` keys to `client/src/locales/en/translation.json` (copied from GOPA lines 1544–1633). Keys cover:
- Page titles and section headers
- Table column headers (email, role, created, last active, etc.)
- Action button labels (ban, unban, reset password, delete)
- Confirmation dialog text
- Duration format strings (minutes, hours, days)
- Status labels (active, conditional, inactive, pending, etc.)
- Error and success messages

Only English keys are updated — other languages are automated externally.

## Testing

- TypeScript compilation clean (`npx tsc --noEmit -p client/tsconfig.json`)
- Admin icon visible in sidebar only when logged in as ADMIN role
- Admin icon hidden for non-admin users
- Clicking Admin icon opens the panel with 3 sub-links
- Each sub-link navigates to the correct page
- Pages load data from `/api/admin/panel/*` endpoints (already verified working)
- Non-admin navigating to `/admin/*` directly redirects to `/c/new`
