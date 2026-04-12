# Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the shared backend + data-provider layer (data-schemas subsystem, API services, Express routes, client hooks) needed by the three GOPA admin pages into GopaV1.

**Architecture:** Pure port — 5 layers bottom-to-top: data-schemas file retention subsystem → data-provider types/keys/endpoints/service → packages/api admin services → api/server routes + services → client hooks. GOPA's admin panel routes mount at `/api/admin/panel` (not `/api/admin`) to avoid conflict with GopaV1's existing admin routes. No logic invented; everything copied from `d:/Developement2026/LibreChatGOPA`.

**Tech Stack:** TypeScript, Mongoose, Express, React Query, React, `librechat-data-provider`.

---

## Task 1: data-schemas — file retention subsystem

**Files:**
- Create: `packages/data-schemas/src/fileRetention.ts`
- Create: `packages/data-schemas/src/types/fileRetention.ts`
- Create: `packages/data-schemas/src/schema/fileRetention.ts`
- Create: `packages/data-schemas/src/schema/fileUploadStat.ts`
- Create: `packages/data-schemas/src/methods/fileRetention.ts`
- Create: `packages/data-schemas/src/methods/fileUploadStat.ts`
- Create: `packages/data-schemas/src/models/fileRetention.ts`
- Create: `packages/data-schemas/src/models/fileUploadStat.ts`
- Modify: `packages/data-schemas/src/types/index.ts`
- Modify: `packages/data-schemas/src/schema/index.ts`
- Modify: `packages/data-schemas/src/models/index.ts`
- Modify: `packages/data-schemas/src/methods/index.ts`
- Modify: `packages/data-schemas/src/index.ts`

- [ ] **Step 1: Copy constants, types, schemas, methods, and models from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/fileRetention.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/fileRetention.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/types/fileRetention.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/types/fileRetention.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/schema/fileRetention.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/schema/fileRetention.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/schema/fileUploadStat.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/schema/fileUploadStat.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/methods/fileRetention.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/methods/fileRetention.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/methods/fileUploadStat.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/methods/fileUploadStat.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/models/fileRetention.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/models/fileRetention.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/data-schemas/src/models/fileUploadStat.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-schemas/src/models/fileUploadStat.ts"
```

- [ ] **Step 2: Add fileRetention types to `packages/data-schemas/src/types/index.ts`**

In `packages/data-schemas/src/types/index.ts`, find the DeepL export at the end:
```typescript
/* DeepL */
export * from './deeplJob';
```

Add after it:
```typescript
/* File Retention */
export * from './fileRetention';
```

- [ ] **Step 3: Register fileRetention and fileUploadStat schemas in `packages/data-schemas/src/schema/index.ts`**

In `packages/data-schemas/src/schema/index.ts`, find the last line:
```typescript
export { default as deeplJobSchema } from './deeplJob';
```

Add after it:
```typescript
export { default as fileRetentionSchema } from './fileRetention';
export { default as fileUploadStatSchema } from './fileUploadStat';
```

- [ ] **Step 4: Register models in `packages/data-schemas/src/models/index.ts`**

In `packages/data-schemas/src/models/index.ts`, find the last import:
```typescript
import { createDeepLJobModel } from './deeplJob';
```

Add after it:
```typescript
import { createFileRetentionSettingsModel } from './fileRetention';
import { createFileUploadStatsModel } from './fileUploadStat';
```

Then find the closing of `createModels()`:
```typescript
    DeepLJobAnalytics: createDeepLJobModel(mongoose),
  };
}
```

Replace with:
```typescript
    DeepLJobAnalytics: createDeepLJobModel(mongoose),
    FileRetentionSettings: createFileRetentionSettingsModel(mongoose),
    FileUploadStats: createFileUploadStatsModel(mongoose),
  };
}
```

- [ ] **Step 5: Wire methods into `packages/data-schemas/src/methods/index.ts`**

In `packages/data-schemas/src/methods/index.ts`, find the DeepL import at the bottom of the imports block:
```typescript
/* DeepL */
import { createDeepLJobMethods, type DeepLJobMethods } from './deeplJob';
```

Add after it:
```typescript
/* File Retention */
import { createFileRetentionMethods, type FileRetentionMethods } from './fileRetention';
import { createFileUploadStatMethods, type FileUploadStatMethods } from './fileUploadStat';
```

Find the `AllMethods` type and add before the closing `&`:
```typescript
export type AllMethods = UserMethods &
  ...
  ConfigMethods &
  DeepLJobMethods;
```

Replace the closing of `AllMethods`:
```typescript
  ConfigMethods &
  DeepLJobMethods &
  FileRetentionMethods &
  FileUploadStatMethods;
```

Find the spread in `createMethods()` return:
```typescript
    /* DeepL */
    ...createDeepLJobMethods(mongoose),
  };
}
```

Replace with:
```typescript
    /* DeepL */
    ...createDeepLJobMethods(mongoose),
    /* File Retention */
    ...createFileRetentionMethods(mongoose),
    ...createFileUploadStatMethods(mongoose),
  };
}
```

Find the type exports at the bottom:
```typescript
export type {
  ...
  ConfigMethods,
  DeepLJobMethods,
};
```

Add `FileRetentionMethods` and `FileUploadStatMethods` to that export list:
```typescript
export type {
  ...
  ConfigMethods,
  DeepLJobMethods,
  FileRetentionMethods,
  FileUploadStatMethods,
};
```

- [ ] **Step 6: Export constants from `packages/data-schemas/src/index.ts`**

In `packages/data-schemas/src/index.ts`, find:
```typescript
export * from './app';
export * from './admin';
export * from './common';
export * from './crypto';
export * from './schema';
export * from './utils';
```

Add after `export * from './utils';`:
```typescript
export {
  SIDEBAR_FILE_RETENTION_SETTINGS_KEY,
  DEFAULT_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  RETENTION_BATCH_LIMIT,
  ELIGIBLE_CONTEXTS,
} from './fileRetention';
```

- [ ] **Step 7: Verify TypeScript compilation**

```bash
cd d:/TestTmp/LibreChatGopaV1 && npx tsc --noEmit -p packages/data-schemas/tsconfig.json 2>&1 | grep "error TS" | head -20
```

Expected: no output (no TypeScript errors).

- [ ] **Step 8: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add packages/data-schemas/src/fileRetention.ts \
        packages/data-schemas/src/types/fileRetention.ts \
        packages/data-schemas/src/schema/fileRetention.ts \
        packages/data-schemas/src/schema/fileUploadStat.ts \
        packages/data-schemas/src/methods/fileRetention.ts \
        packages/data-schemas/src/methods/fileUploadStat.ts \
        packages/data-schemas/src/models/fileRetention.ts \
        packages/data-schemas/src/models/fileUploadStat.ts \
        packages/data-schemas/src/types/index.ts \
        packages/data-schemas/src/schema/index.ts \
        packages/data-schemas/src/models/index.ts \
        packages/data-schemas/src/methods/index.ts \
        packages/data-schemas/src/index.ts
git commit -m "feat(data-schemas): add file retention subsystem"
```

---

## Task 2: data-provider — admin types, mutation options, and keys

**Files:**
- Create: `packages/data-provider/src/types/admin.ts`
- Modify: `packages/data-provider/src/types/index.ts`
- Modify: `packages/data-provider/src/types.ts`
- Modify: `packages/data-provider/src/types/mutations.ts`
- Modify: `packages/data-provider/src/keys.ts`

- [ ] **Step 1: Copy admin types from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/packages/data-provider/src/types/admin.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/data-provider/src/types/admin.ts"
```

- [ ] **Step 2: Export admin types from `packages/data-provider/src/types/index.ts`**

In `packages/data-provider/src/types/index.ts`, find the end of the file:
```typescript
/* DeepL */
export * from './types/deepl';

/* SDG */
export * from './types/sdg';
```

Add after the SDG export:
```typescript
/* Admin */
export * from './types/admin';
```

- [ ] **Step 3: Export admin types in CJS rollup entry `packages/data-provider/src/types.ts`**

In `packages/data-provider/src/types.ts`, find the end of the file:
```typescript
/* SDG */
export * from './types/sdg';
```

Add after it:
```typescript
/* Admin */
export * from './types/admin';
```

- [ ] **Step 4: Add 6 admin mutation option types to `packages/data-provider/src/types/mutations.ts`**

In `packages/data-provider/src/types/mutations.ts`, find the end of the file:
```typescript
export type SDGMapOptions = MutationOptions<types.SDGMapResponse, FormData>;
```

Add after it:
```typescript
export type AdminBanUserOptions = MutationOptions<
  types.AdminBanUserResponse,
  types.AdminBanUserRequest
>;

export type AdminUnbanUserOptions = MutationOptions<
  types.AdminUnbanUserResponse,
  types.AdminUnbanUserRequest
>;

export type AdminResetPasswordOptions = MutationOptions<
  types.AdminResetPasswordResponse,
  types.AdminResetPasswordRequest
>;

export type AdminDeleteUserOptions = MutationOptions<
  types.AdminDeleteUserResponse,
  types.AdminDeleteUserRequest
>;

export type AdminUpdateFileRetentionOptions = MutationOptions<
  types.AdminFileRetentionUpdateResponse,
  types.AdminFileRetentionUpdateInput
>;

export type AdminPurgeFileRetentionOptions = MutationOptions<
  types.AdminFileRetentionPurgeResponse,
  void
>;
```

- [ ] **Step 5: Add 4 QueryKeys and 6 MutationKeys to `packages/data-provider/src/keys.ts`**

`adminDeepLJobs` already exists in `QueryKeys`. Add the 4 missing QueryKeys.

In `packages/data-provider/src/keys.ts`, find in the `QueryKeys` enum:
```typescript
  /* DeepL */
  adminDeepLJobs = 'adminDeepLJobs',
  deeplLanguages = 'deeplLanguages',
```

Replace with:
```typescript
  /* Admin */
  adminUsers = 'adminUsers',
  adminModeration = 'adminModeration',
  adminAnalyticsUsers = 'adminAnalyticsUsers',
  adminFileRetention = 'adminFileRetention',
  /* DeepL */
  adminDeepLJobs = 'adminDeepLJobs',
  deeplLanguages = 'deeplLanguages',
```

In the `MutationKeys` enum, find the end:
```typescript
  /* SDG */
  mapSDG = 'mapSDG',
}
```

Replace with:
```typescript
  /* SDG */
  mapSDG = 'mapSDG',
  /* Admin */
  adminBanUser = 'adminBanUser',
  adminUnbanUser = 'adminUnbanUser',
  adminResetPassword = 'adminResetPassword',
  adminDeleteUser = 'adminDeleteUser',
  adminUpdateFileRetention = 'adminUpdateFileRetention',
  adminPurgeFileRetention = 'adminPurgeFileRetention',
}
```

- [ ] **Step 6: Build data-provider**

```bash
cd d:/TestTmp/LibreChatGopaV1 && npm run build:data-provider 2>&1 | tail -10
```

Expected: output ending with a success line (no `error` in output).

- [ ] **Step 7: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add packages/data-provider/src/types/admin.ts \
        packages/data-provider/src/types/index.ts \
        packages/data-provider/src/types.ts \
        packages/data-provider/src/types/mutations.ts \
        packages/data-provider/src/keys.ts
git commit -m "feat(data-provider): add admin types, mutation options, and keys"
```

---

## Task 3: data-provider — admin endpoints and data-service

**Files:**
- Modify: `packages/data-provider/src/api-endpoints.ts`
- Modify: `packages/data-provider/src/data-service.ts`

- [ ] **Step 1: Add admin panel endpoints to `packages/data-provider/src/api-endpoints.ts`**

In `packages/data-provider/src/api-endpoints.ts`, find the end of the file:
```typescript
/* SDG */
export const sdg = () => `${BASE_URL}/api/sdg`;
```

Add after it:
```typescript
/* Admin Panel */
const adminPanelRoot = `${BASE_URL}/api/admin/panel`;

export const adminModeration = (params: t.AdminModerationQuery = {}) =>
  `${adminPanelRoot}/moderation${buildQuery(params)}`;

export const adminUsers = (params: t.AdminUsersListQuery = {}) =>
  `${adminPanelRoot}/users${buildQuery(params)}`;

export const adminUserBan = (userId: string) =>
  `${adminPanelRoot}/users/${encodeURIComponent(userId)}/ban`;

export const adminUserUnban = (userId: string) =>
  `${adminPanelRoot}/users/${encodeURIComponent(userId)}/unban`;

export const adminUserResetPassword = (userId: string) =>
  `${adminPanelRoot}/users/${encodeURIComponent(userId)}/reset-password`;

export const adminUserDelete = (userId: string) =>
  `${adminPanelRoot}/users/${encodeURIComponent(userId)}`;

export const adminAnalyticsUsers = (params: t.AdminAnalyticsUsersQuery = {}) =>
  `${adminPanelRoot}/analytics/users${buildQuery(params)}`;

export const adminFileRetention = () => `${adminPanelRoot}/analytics/file-retention`;

export const adminFileRetentionPurge = () => `${adminPanelRoot}/analytics/file-retention/purge`;

export const adminDeepLJobs = (params: t.AdminDeepLJobsQuery = {}) =>
  `${adminPanelRoot}/analytics/deepl-jobs${buildQuery(params)}`;

- [ ] **Step 2: Add 11 admin service methods to `packages/data-provider/src/data-service.ts`**

In `packages/data-provider/src/data-service.ts`, find the end of the file:
```typescript
/* SDG */
export function mapSDG(data: FormData, signal?: AbortSignal | null): Promise<t.SDGMapResponse> {
  const requestConfig = signal ? { signal } : undefined;
  return request.postMultiPart(endpoints.sdg(), data, requestConfig);
}
```

Add after it:
```typescript
/* Admin Panel */
export function getAdminModeration(
  params?: t.AdminModerationQuery,
): Promise<t.AdminModerationResponse> {
  return request.get(endpoints.adminModeration(params));
}

export function getAdminUsers(params?: t.AdminUsersListQuery): Promise<t.AdminUsersResponse> {
  return request.get(endpoints.adminUsers(params));
}

export function banAdminUser(payload: t.AdminBanUserRequest): Promise<t.AdminBanUserResponse> {
  const { userId, durationMinutes } = payload;
  return request.post(endpoints.adminUserBan(userId), { durationMinutes });
}

export function unbanAdminUser(
  payload: t.AdminUnbanUserRequest,
): Promise<t.AdminUnbanUserResponse> {
  return request.post(endpoints.adminUserUnban(payload.userId));
}

export function resetAdminUserPassword(
  payload: t.AdminResetPasswordRequest,
): Promise<t.AdminResetPasswordResponse> {
  return request.post(endpoints.adminUserResetPassword(payload.userId));
}

export function deleteAdminUser(
  payload: t.AdminDeleteUserRequest,
): Promise<t.AdminDeleteUserResponse> {
  return request.delete(endpoints.adminUserDelete(payload.userId));
}

export function getAdminAnalyticsUsers(
  params?: t.AdminAnalyticsUsersQuery,
): Promise<t.AdminAnalyticsUsersResponse> {
  return request.get(endpoints.adminAnalyticsUsers(params));
}

export function getAdminFileRetention(): Promise<t.AdminFileRetentionResponse> {
  return request.get(endpoints.adminFileRetention());
}

export function updateAdminFileRetention(
  payload: t.AdminFileRetentionUpdateInput,
): Promise<t.AdminFileRetentionUpdateResponse> {
  return request.patch(endpoints.adminFileRetention(), payload);
}

export function purgeAdminFileRetention(): Promise<t.AdminFileRetentionPurgeResponse> {
  return request.post(endpoints.adminFileRetentionPurge());
}

export function getAdminDeepLJobs(
  params?: t.AdminDeepLJobsQuery,
): Promise<t.AdminDeepLJobsResponse> {
  return request.get(endpoints.adminDeepLJobs(params));
}
```

- [ ] **Step 3: Build data-provider**

```bash
cd d:/TestTmp/LibreChatGopaV1 && npm run build:data-provider 2>&1 | tail -10
```

Expected: success, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add packages/data-provider/src/api-endpoints.ts \
        packages/data-provider/src/data-service.ts
git commit -m "feat(data-provider): add admin panel endpoints and data-service methods"
```

---

## Task 4: packages/api — admin services

**Files:**
- Create: `packages/api/src/admin/utils.ts`
- Create: `packages/api/src/admin/types.ts`
- Create: `packages/api/src/admin/users.ts`
- Create: `packages/api/src/admin/moderation.ts`
- Create: `packages/api/src/admin/analytics.ts`
- Create: `packages/api/src/admin/index.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Copy admin service files from GOPA**

```bash
mkdir -p "d:/TestTmp/LibreChatGopaV1/packages/api/src/admin"

cp "d:/Developement2026/LibreChatGOPA/packages/api/src/admin/utils.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/api/src/admin/utils.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/api/src/admin/types.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/api/src/admin/types.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/api/src/admin/users.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/api/src/admin/users.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/api/src/admin/moderation.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/api/src/admin/moderation.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/api/src/admin/analytics.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/api/src/admin/analytics.ts"

cp "d:/Developement2026/LibreChatGOPA/packages/api/src/admin/index.ts" \
   "d:/TestTmp/LibreChatGopaV1/packages/api/src/admin/index.ts"
```

- [ ] **Step 2: Export admin module from `packages/api/src/index.ts`**

In `packages/api/src/index.ts`, find the last export line (currently near line 55):
```typescript
export { memoryDiagnostics } from './utils/memory';
```

Add after it:
```typescript
export * from './admin';
```

- [ ] **Step 3: Verify TypeScript compilation**

```bash
cd d:/TestTmp/LibreChatGopaV1 && npx tsc --noEmit -p packages/api/tsconfig.json 2>&1 | grep "error TS" | head -20
```

Expected: no output (no TypeScript errors).

- [ ] **Step 4: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add packages/api/src/admin/ packages/api/src/index.ts
git commit -m "feat(packages/api): add admin service functions"
```

---

## Task 5: api/server — file retention services

**Files:**
- Create: `api/server/services/FileRetentionStore.js`
- Create: `api/server/services/FileRetentionService.js`

- [ ] **Step 1: Copy FileRetentionStore.js from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/api/server/services/FileRetentionStore.js" \
   "d:/TestTmp/LibreChatGopaV1/api/server/services/FileRetentionStore.js"
```

Expected content (verify after copy):
```javascript
const {
  DEFAULT_RETENTION_DAYS,
  ELIGIBLE_CONTEXTS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  RETENTION_BATCH_LIMIT,
  SIDEBAR_FILE_RETENTION_SETTINGS_KEY,
} = require('@librechat/data-schemas');
const {
  getSidebarFileRetentionSettings,
  updateSidebarFileRetentionSettings,
  recordSidebarFileUpload,
  getSidebarUploadCountsByUserIds,
  syncSidebarUploadCountsFromFiles,
  getSidebarUploadsForCleanup,
} = require('~/models');

module.exports = {
  DEFAULT_RETENTION_DAYS,
  ELIGIBLE_CONTEXTS,
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  RETENTION_BATCH_LIMIT,
  SIDEBAR_FILE_RETENTION_SETTINGS_KEY,
  getSidebarFileRetentionSettings,
  updateSidebarFileRetentionSettings,
  recordSidebarFileUpload,
  getSidebarUploadCountsByUserIds,
  syncSidebarUploadCountsFromFiles,
  getSidebarUploadsForCleanup,
};
```

- [ ] **Step 2: Copy FileRetentionService.js from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/api/server/services/FileRetentionService.js" \
   "d:/TestTmp/LibreChatGopaV1/api/server/services/FileRetentionService.js"
```

This file exports: `buildSystemDeleteRequest`, `initializeFileRetentionCleanup`, `stopFileRetentionCleanup`, `purgeAllSidebarUploadsNow`, `runSidebarUploadRetentionCleanup`.

- [ ] **Step 3: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add api/server/services/FileRetentionStore.js \
        api/server/services/FileRetentionService.js
git commit -m "feat(api): add FileRetentionStore and FileRetentionService"
```

---

## Task 6: api/server — admin panel routes

**Files:**
- Create: `api/server/routes/admin/panel.js`
- Modify: `api/server/routes/index.js`
- Modify: `api/server/index.js`

- [ ] **Step 1: Copy GOPA's admin/index.js to panel.js**

```bash
cp "d:/Developement2026/LibreChatGOPA/api/server/routes/admin/index.js" \
   "d:/TestTmp/LibreChatGopaV1/api/server/routes/admin/panel.js"
```

This file handles 11 routes: `GET /moderation`, `GET /users`, `GET /analytics/users`, `GET /analytics/file-retention`, `PATCH /analytics/file-retention`, `POST /analytics/file-retention/purge`, `GET /analytics/deepl-jobs`, `POST /users/:userId/ban`, `POST /users/:userId/unban`, `POST /users/:userId/reset-password`, `DELETE /users/:userId`.

- [ ] **Step 2: Add adminPanel to `api/server/routes/index.js`**

In `api/server/routes/index.js`, find the existing admin imports:
```javascript
const adminAuth = require('./admin/auth');
const adminConfig = require('./admin/config');
```

Add before them:
```javascript
const adminPanel = require('./admin/panel');
```

Then find the exports object and add `adminPanel`:
```javascript
module.exports = {
  adminAuth,
  adminConfig,
```

Add `adminPanel,` as the first entry:
```javascript
module.exports = {
  adminPanel,
  adminAuth,
  adminConfig,
```

- [ ] **Step 3: Mount admin panel router in `api/server/index.js`**

In `api/server/index.js`, find the existing admin mounts:
```javascript
  app.use('/api/admin', routes.adminAuth);
  app.use('/api/admin/config', routes.adminConfig);
```

Add before them:
```javascript
  app.use('/api/admin/panel', routes.adminPanel);
```

- [ ] **Step 4: Smoke-test the route file loads without error**

```bash
cd d:/TestTmp/LibreChatGopaV1 && node -e "require('./api/server/routes/admin/panel')" && echo "panel.js loads OK"
```

Expected: `panel.js loads OK` (no thrown errors).

- [ ] **Step 5: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add api/server/routes/admin/panel.js \
        api/server/routes/index.js \
        api/server/index.js
git commit -m "feat(api): add admin panel routes at /api/admin/panel"
```

---

## Task 7: client — Admin data-provider hooks

**Files:**
- Create: `client/src/data-provider/Admin/queries.ts`
- Create: `client/src/data-provider/Admin/mutations.ts`
- Create: `client/src/data-provider/Admin/index.ts`
- Modify: `client/src/data-provider/index.ts`

- [ ] **Step 1: Create the Admin directory and copy files from GOPA**

```bash
mkdir -p "d:/TestTmp/LibreChatGopaV1/client/src/data-provider/Admin"

cp "d:/Developement2026/LibreChatGOPA/client/src/data-provider/Admin/queries.ts" \
   "d:/TestTmp/LibreChatGopaV1/client/src/data-provider/Admin/queries.ts"

cp "d:/Developement2026/LibreChatGOPA/client/src/data-provider/Admin/mutations.ts" \
   "d:/TestTmp/LibreChatGopaV1/client/src/data-provider/Admin/mutations.ts"
```

- [ ] **Step 2: Create `client/src/data-provider/Admin/index.ts`**

```typescript
export * from './queries';
export * from './mutations';
```

- [ ] **Step 3: Export Admin hooks from `client/src/data-provider/index.ts`**

In `client/src/data-provider/index.ts`, find the end of the file:
```typescript
export * from './SDG';
```

Add after it:
```typescript
export * from './Admin';
```

- [ ] **Step 4: Verify TypeScript compilation**

```bash
cd d:/TestTmp/LibreChatGopaV1 && npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -E "error TS|Admin" | head -20
```

Expected: no output (no TypeScript errors).

- [ ] **Step 5: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/data-provider/Admin/ \
        client/src/data-provider/index.ts
git commit -m "feat(client): add Admin data-provider hooks"
```
