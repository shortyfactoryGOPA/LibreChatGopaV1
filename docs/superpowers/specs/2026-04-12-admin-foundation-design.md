# Admin Foundation — Design Spec

**Goal:** Port the shared backend + data-provider layer needed by the three GOPA admin pages (Users, Moderation, Analytics) from GOPA into GopaV1.

**Architecture:** Pure port — 5 layers, bottom to top: data-schemas subsystem additions → data-provider types/keys/endpoints/service → packages/api admin services → api/server routes + services → client hooks. No new shared types invented; everything copied from GOPA. Route conflict resolved by mounting at `/api/admin/panel` instead of `/api/admin`.

---

## Scope

This spec covers only the foundation layer — no UI components. The three admin route components (AdminUsers, AdminModeration, AdminAnalytics) are Spec 2.

---

## Route Mount Path Decision

GopaV1 already mounts existing admin routes at `/api/admin`, `/api/admin/config`, `/api/admin/grants`, `/api/admin/groups`, `/api/admin/roles`, `/api/admin/users`. GOPA's custom admin panel router includes a `GET /users` path that would conflict with GopaV1's `GET /api/admin/users`.

**Resolution:** Mount GOPA's custom admin panel routes at `/api/admin/panel`. All data-provider endpoints use `/api/admin/panel/...` prefix. The route file is created as `api/server/routes/admin/panel.js`.

---

## Files

| Action | Path | Note |
|--------|------|------|
| Create | `packages/data-schemas/src/fileRetention.ts` | Constants |
| Create | `packages/data-schemas/src/types/fileRetention.ts` | 7 interfaces |
| Create | `packages/data-schemas/src/schema/fileRetention.ts` | Mongoose schema |
| Create | `packages/data-schemas/src/schema/fileUploadStat.ts` | Mongoose schema |
| Create | `packages/data-schemas/src/methods/fileRetention.ts` | 3 methods |
| Create | `packages/data-schemas/src/methods/fileUploadStat.ts` | 3 methods |
| Modify | `packages/data-schemas/src/types/index.ts` | Export fileRetention types |
| Modify | `packages/data-schemas/src/schema/index.ts` | Register new schemas |
| Modify | `packages/data-schemas/src/methods/index.ts` | Wire new methods + types |
| Modify | `packages/data-schemas/src/index.ts` | Export constants |
| Create | `packages/data-provider/src/types/admin.ts` | 38 admin interfaces |
| Modify | `packages/data-provider/src/types/index.ts` | Export admin types (ESM) |
| Modify | `packages/data-provider/src/types.ts` | Export admin types (CJS rollup) |
| Modify | `packages/data-provider/src/keys.ts` | Add 5 QueryKeys + 6 MutationKeys |
| Modify | `packages/data-provider/src/api-endpoints.ts` | Add 11 admin endpoints |
| Modify | `packages/data-provider/src/data-service.ts` | Add 11 admin methods |
| Create | `packages/api/src/admin/utils.ts` | Admin utility functions |
| Create | `packages/api/src/admin/types.ts` | Re-export admin types from data-provider |
| Create | `packages/api/src/admin/users.ts` | User admin service functions |
| Create | `packages/api/src/admin/moderation.ts` | Moderation service functions |
| Create | `packages/api/src/admin/analytics.ts` | Analytics service functions |
| Create | `packages/api/src/admin/index.ts` | Re-export all admin services |
| Modify | `packages/api/src/index.ts` | Export admin module |
| Create | `api/server/services/FileRetentionStore.js` | File retention store |
| Create | `api/server/services/FileRetentionService.js` | File retention service |
| Create | `api/server/routes/admin/panel.js` | 11 admin HTTP routes |
| Modify | `api/server/routes/index.js` | Add adminPanel export |
| Modify | `api/server/index.js` | Mount `/api/admin/panel` |
| Create | `client/src/data-provider/Admin/queries.ts` | 5 query hooks |
| Create | `client/src/data-provider/Admin/mutations.ts` | 6 mutation hooks |
| Create | `client/src/data-provider/Admin/index.ts` | Re-export barrel |
| Modify | `client/src/data-provider/index.ts` | Export Admin hooks |

---

## Layer 1: packages/data-schemas

All files are direct copies from GOPA's `packages/data-schemas/src/`. No modifications.

### New: `src/fileRetention.ts`
Constants file. Exports: `SIDEBAR_FILE_RETENTION_SETTINGS_KEY`, `DEFAULT_RETENTION_DAYS` (30), `MIN_RETENTION_DAYS` (1), `MAX_RETENTION_DAYS` (3650), `RETENTION_BATCH_LIMIT` (100), `ELIGIBLE_CONTEXTS`.

### New: `src/types/fileRetention.ts`
Seven interfaces: `IFileRetentionSettings`, `FileRetentionSettingsRecord`, `SidebarFileRetentionSettings`, `UpdateSidebarFileRetentionSettingsInput`, `IFileUploadStats`, `FileUploadStatsRecord`, `RecordSidebarFileUploadInput`, `SyncSidebarUploadCountsInput`, `SidebarUploadsForCleanupInput`.

### New: `src/schema/fileRetention.ts`
Mongoose schema for `file_retention_settings` collection. Fields: `key` (String, unique), `enabled` (Boolean), `retentionDays` (Number, default=DEFAULT_RETENTION_DAYS).

### New: `src/schema/fileUploadStat.ts`
Mongoose schema for `file_upload_stats` collection. Fields: `user` (ObjectId ref User, unique), `uploadCount` (Number), `lastUploadedAt` (Date).

### New: `src/methods/fileRetention.ts`
Three methods: `getSidebarFileRetentionSettings`, `updateSidebarFileRetentionSettings`, `getSidebarUploadsForCleanup`.

### New: `src/methods/fileUploadStat.ts`
Three methods: `recordSidebarFileUpload`, `getSidebarUploadCountsByUserIds`, `syncSidebarUploadCountsFromFiles`.

### Modified: `src/types/index.ts`
Add: `export * from './fileRetention';`

### Modified: `src/schema/index.ts`
Register the two new schemas so they are included in the schema bundle.

### Modified: `src/methods/index.ts`
- Import `createFileRetentionMethods` and `createFileUploadStatMethods`
- Add their return types to `AllMethods`
- Call them inside `createMethods()` and spread into the return object

### Modified: `src/index.ts`
Export constants: `DEFAULT_RETENTION_DAYS`, `MIN_RETENTION_DAYS`, `MAX_RETENTION_DAYS`, `RETENTION_BATCH_LIMIT`, `SIDEBAR_FILE_RETENTION_SETTINGS_KEY`, `ELIGIBLE_CONTEXTS`.

---

## Layer 2: packages/data-provider

### New: `src/types/admin.ts`
Copy verbatim from GOPA. 38 interfaces organized in 6 groups:

- **Query params**: `AdminQueryValue`, `AdminMigrationState`, `AdminUsersListQuery`, `AdminModerationQuery`, `AdminAnalyticsUsersQuery`, `AdminDeepLJobsQuery`
- **Response types**: `AdminUserSummary`, `AdminUsersResponse`, `AdminModerationResponse`, `AdminAnalyticsUserSummary`, `AdminAnalyticsUsersResponse`, `AdminDeepLJobSummary`, `AdminDeepLJobsResponse`
- **Auth/config**: `AdminAuthContext`, `AdminAuthSessionConfig`, `AdminConfiguredLimitValue`, `AdminConfiguredLimitValueMap`, `AdminConfiguredLimit`, `AdminViolationEvent`, `AdminBanEvent`
- **File retention**: `AdminFileRetentionConstraints`, `AdminSidebarFileRetentionSettings`, `AdminFileRetentionResponse`, `AdminFileRetentionUpdateInput`, `AdminFileRetentionUpdate`, `AdminFileRetentionValidationResult`, `AdminFileRetentionUpdateResponse`, `AdminFileRetentionPurgeResponse`
- **DeepL**: `AdminDeepLJobProviderDetailPrimitive`, `AdminDeepLJobProviderDetailObject`, `AdminDeepLJobProviderDetails`
- **Actions**: `AdminBanUserRequest`, `AdminBanUserResponse`, `AdminUnbanUserRequest`, `AdminUnbanUserResponse`, `AdminResetPasswordRequest`, `AdminResetPasswordResult`, `AdminResetPasswordResponse`, `AdminDeleteUserRequest`, `AdminDeleteUserResponse`

Export from both `types/index.ts` (ESM) and `types.ts` (CJS rollup entry) following the double-export pattern.

### Modified: `src/keys.ts`

QueryKeys to add (check `adminDeepLJobs` — may already exist):
```typescript
adminUsers: ['adminUsers'] as const,
adminModeration: ['adminModeration'] as const,
adminAnalyticsUsers: ['adminAnalyticsUsers'] as const,
adminFileRetention: ['adminFileRetention'] as const,
adminDeepLJobs: ['adminDeepLJobs'] as const,
```

MutationKeys to add:
```typescript
adminBanUser: ['adminBanUser'] as const,
adminUnbanUser: ['adminUnbanUser'] as const,
adminResetPassword: ['adminResetPassword'] as const,
adminDeleteUser: ['adminDeleteUser'] as const,
adminUpdateFileRetention: ['adminUpdateFileRetention'] as const,
adminPurgeFileRetention: ['adminPurgeFileRetention'] as const,
```

### Modified: `src/api-endpoints.ts`

11 endpoints, all under `/api/admin/panel/`:
```typescript
adminUsers: () => '/api/admin/panel/users',
adminModeration: () => '/api/admin/panel/moderation',
adminAnalyticsUsers: () => '/api/admin/panel/analytics/users',
adminFileRetention: () => '/api/admin/panel/analytics/file-retention',
adminDeepLJobs: () => '/api/admin/panel/analytics/deepl-jobs',
adminBanUser: (userId: string) => `/api/admin/panel/users/${userId}/ban`,
adminUnbanUser: (userId: string) => `/api/admin/panel/users/${userId}/unban`,
adminResetPassword: (userId: string) => `/api/admin/panel/users/${userId}/reset-password`,
adminDeleteUser: (userId: string) => `/api/admin/panel/users/${userId}`,
adminUpdateFileRetention: () => '/api/admin/panel/analytics/file-retention',
adminPurgeFileRetention: () => '/api/admin/panel/analytics/file-retention/purge',
```

### Modified: `src/data-service.ts`

11 methods following existing patterns:
- 5 GET queries: `getAdminUsers`, `getAdminModeration`, `getAdminAnalyticsUsers`, `getAdminFileRetention`, `getAdminDeepLJobs`
- 2 ban/unban: `adminBanUser` (POST), `adminUnbanUser` (POST)
- 1 reset: `adminResetPassword` (POST)
- 1 delete: `adminDeleteUser` (DELETE)
- 1 update: `adminUpdateFileRetention` (PATCH)
- 1 purge: `adminPurgeFileRetention` (POST)

---

## Layer 3: packages/api/src/admin/

Six files, all direct copies from GOPA's `packages/api/src/admin/`. No modifications needed — all imports resolve in GopaV1:

- `utils.ts`: 10 utility functions (no external deps beyond standard TS)
- `types.ts`: re-exports admin types from `librechat-data-provider`
- `users.ts`: user admin functions — imports from `librechat-data-provider` ✓
- `moderation.ts`: moderation functions — imports `math` from `../utils/math` ✓, `DEFAULT_SESSION_EXPIRY`/`DEFAULT_REFRESH_TOKEN_EXPIRY` from `@librechat/data-schemas` ✓. Exports `AdminStoreLike` interface (store-agnostic) so keyvMongo is injected by the routes layer, not imported here.
- `analytics.ts`: analytics functions — imports `DEFAULT_RETENTION_DAYS`/`MIN_RETENTION_DAYS`/`MAX_RETENTION_DAYS`/`SidebarFileRetentionSettings` from `@librechat/data-schemas` (added in Layer 1) ✓, `DeepLJobSearchParams`/`DeepLJobSearchResult` ✓
- `index.ts`: re-exports everything

Modify `packages/api/src/index.ts` to add `export * from './admin';`.

---

## Layer 4: api/server/

### New: `api/server/services/FileRetentionStore.js`
Direct copy from GOPA. Imports constants and model methods from `@librechat/data-schemas` and `~/models`. Exports: `getSidebarFileRetentionSettings`, `updateSidebarFileRetentionSettings`, `recordSidebarFileUpload`, `getSidebarUploadCountsByUserIds`, `syncSidebarUploadCountsFromFiles`, `getSidebarUploadsForCleanup`.

### New: `api/server/services/FileRetentionService.js`
Direct copy from GOPA. Imports from `@librechat/api` (`generateShortLivedToken`), `@librechat/data-schemas` (`logger`), `librechat-data-provider` (`SystemRoles`), `~/server/services/Files/process` (`processDeleteRequest`), `./FileRetentionStore`. Exports: `startFileRetentionCleanup`, `stopFileRetentionCleanup`, `runFileRetentionCleanup`.

### New: `api/server/routes/admin/panel.js`
Copy of GOPA's `api/server/routes/admin/index.js`. All 11 routes. Imports resolve in GopaV1:
- `keyv` ✓ (in api/package.json)
- `@librechat/data-schemas` — `logger`, `ELIGIBLE_CONTEXTS` (added in Layer 1) ✓
- `@librechat/api` — `requireAdmin`, `keyvMongo`, all admin service functions (added in Layer 3) ✓
- `librechat-data-provider` — `ViolationTypes` ✓
- `~/server/middleware` ✓
- `~/cache` (`getLogStores`) ✓
- `~/server/services/AuthService` (`requestPasswordReset`) ✓
- `~/server/services/Config` (`getAppConfig`) ✓
- `~/server/services/Files/process` (`processDeleteRequest`) ✓
- `~/server/services/FileRetentionService` (added above) ✓
- `~/models` — `deleteAllUserSessions`, `deleteFiles`, `getFiles`, `getSidebarFileRetentionSettings`, `updateSidebarFileRetentionSettings`, `getSidebarUploadCountsByUserIds`, `syncSidebarUploadCountsFromFiles`, `searchDeepLJobs` ✓ (all available after Layer 1)
- `~/db/models` — `Key`, `File`, `Agent`, `Token`, `Group`, `Action`, `Preset`, `Prompt`, `Balance`, `Message`, `Session`, `AclEntry`, `ToolCall`, `Assistant`, `SharedLink`, `PluginAuth`, `MemoryEntry`, `PromptGroup`, `Transaction`, `Conversation`, `ConversationTag`, `User` ✓

### Modified: `api/server/routes/index.js`
Add `const adminPanel = require('./admin/panel');` and include in exports.

### Modified: `api/server/index.js`
Add `app.use('/api/admin/panel', routes.adminPanel);` alongside existing admin mounts.

---

## Layer 5: client/src/data-provider/Admin/

Three files, direct copies from GOPA's `client/src/data-provider/Admin/`:

### New: `queries.ts`
5 React Query hooks:
- `useGetAdminUsersQuery` — GET adminUsers, QueryKey: `adminUsers`
- `useGetAdminModerationQuery` — GET adminModeration, QueryKey: `adminModeration`
- `useGetAdminAnalyticsUsersQuery` — GET adminAnalyticsUsers, QueryKey: `adminAnalyticsUsers`
- `useGetAdminFileRetentionQuery` — GET adminFileRetention, QueryKey: `adminFileRetention`
- `useGetAdminDeepLJobsQuery` — GET adminDeepLJobs, QueryKey: `adminDeepLJobs`

### New: `mutations.ts`
6 mutation hooks:
- `useAdminBanUserMutation` — POST adminBanUser
- `useAdminUnbanUserMutation` — POST adminUnbanUser
- `useAdminResetPasswordMutation` — POST adminResetPassword
- `useAdminDeleteUserMutation` — DELETE adminDeleteUser
- `useAdminUpdateFileRetentionMutation` — PATCH adminUpdateFileRetention
- `useAdminPurgeFileRetentionMutation` — POST adminPurgeFileRetention

### New: `index.ts`
```typescript
export * from './queries';
export * from './mutations';
```

### Modified: `client/src/data-provider/index.ts`
Add `export * from './Admin';`

---

## No Tests Required for This Spec

Pure port with no business logic invented. TypeScript compilation on client + packages/api is the verification gate. data-schemas tests from GOPA can optionally be copied alongside the method files.
