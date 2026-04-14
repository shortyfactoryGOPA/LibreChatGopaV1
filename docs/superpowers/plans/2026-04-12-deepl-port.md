# DeepL Document Translator Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the DeepL Document Translator feature from `d:/Developement2026/LibreChatGOPA` into this project (`d:/TestTmp/LibreChatGopaV1`), including MongoDB job tracking, backend service, Express routes, shared UI components, React hooks, and the full translator page.

**Architecture:** Surgical additions layer by layer — data-schemas → data-provider → packages/api → api/server → client. All new code is added to existing files where the domain fits; new files are created only when no existing file owns that responsibility. The admin analytics endpoint (`GET /api/admin/analytics/deepl-jobs`) is **deferred** — jobs are still persisted silently, but the UI to view them ships with the Admin Analytics port.

**Tech Stack:** TypeScript, Mongoose (MongoDB), deepl-node SDK, Express (legacy JS), React, React Query (@tanstack/react-query), Tailwind CSS, Zod (not used here — deepl types are hand-written), Jest + mongodb-memory-server (tests)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `api/package.json` | Add `deepl-node ^1.24.0` dependency |
| **Create** | `packages/data-schemas/src/types/deeplJob.ts` | Mongoose document interface + job lifecycle types |
| **Create** | `packages/data-schemas/src/schema/deeplJob.ts` | Mongoose schema for `deepl_jobs` collection |
| **Create** | `packages/data-schemas/src/models/deeplJob.ts` | Mongoose model factory |
| **Create** | `packages/data-schemas/src/methods/deeplJob.ts` | `createDeepLJob`, `updateDeepLJobByDocumentId`, `searchDeepLJobs` |
| **Create** | `packages/data-schemas/src/methods/deeplJob.spec.ts` | Unit tests with mongodb-memory-server |
| Modify | `packages/data-schemas/src/types/index.ts` | Export deeplJob types |
| Modify | `packages/data-schemas/src/schema/index.ts` | Export deeplJobSchema |
| Modify | `packages/data-schemas/src/models/index.ts` | Register DeepLJobAnalytics model |
| Modify | `packages/data-schemas/src/methods/index.ts` | Wire createDeepLJobMethods |
| **Create** | `packages/data-provider/src/types/deepl.ts` | Shared TS types + constants (extensions, MIME, handles, responses) |
| Modify | `packages/data-provider/src/types/index.ts` | Export deepl types |
| Modify | `packages/data-provider/src/keys.ts` | Add `deeplLanguages`, `adminDeepLJobs` QueryKeys + 3 MutationKeys |
| Modify | `packages/data-provider/src/api-endpoints.ts` | Add 4 deepl endpoints |
| Modify | `packages/data-provider/src/data-service.ts` | Add 4 deepl dataService methods |
| Modify | `packages/data-provider/src/types/mutations.ts` | Add 3 DeepL mutation option types |
| **Create** | `packages/api/src/files/deepl.ts` | deepl-node SDK wrapper — languages, upload, status, download |
| **Create** | `packages/api/src/files/deepl.spec.ts` | Unit tests (mocks deepl-node) |
| Modify | `packages/api/src/files/index.ts` | Export deepl service |
| **Create** | `api/server/routes/deepl.js` | Express route: `/languages` `/upload` `/status` `/download` + DB writes |
| Modify | `api/server/routes/index.js` | Register deepl router |
| Modify | `api/server/index.js` | Mount `app.use('/api/deepl', routes.deepl)` |
| **Create** | `client/src/components/AssetIcon.tsx` | `<img>` wrapper with lazy loading, used by PageHeaderCard |
| **Create** | `client/src/components/PageHeaderCard.tsx` | Page header with icon, title, description, optional children slot |
| **Create** | `client/src/components/Nav/SidebarReopenButton.tsx` | Reopen-sidebar button shown on full-page routes |
| **Create** | `client/src/data-provider/DeepL/queries.ts` | `useGetDeepLLanguagesQuery` |
| **Create** | `client/src/data-provider/DeepL/mutations.ts` | Upload / status / download mutations with cache invalidation |
| **Create** | `client/src/data-provider/DeepL/index.ts` | Barrel export |
| Modify | `client/src/data-provider/index.ts` | Export `./DeepL` |
| **Create** | `client/src/components/DeepL/DeeplTranslator.tsx` | Full translator UI — upload, polling, download |
| **Create** | `client/src/routes/DeepL.tsx` | Thin route wrapper |
| Modify | `client/src/routes/index.tsx` | Add `/deepl` route inside Root children |
| Modify | `client/src/locales/en/translation.json` | Add 45 `com_ui_gopa_deepl_*` keys |
| Copy | `client/public/assets/ai_translator_icon.png` | Sidebar + header icon |
| Copy | `client/public/assets/AI_Translator_grey.png` | Header illustration |

---

## Task 1 — Add deepl-node dependency

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1.1: Add the deepl-node package**

Open `api/package.json`. In the `"dependencies"` object, add after any existing entry (alphabetical order fits between `"debug"` and `"dotenv"` area — just add it):

```json
"deepl-node": "^1.24.0",
```

- [ ] **Step 1.2: Install**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npm install --workspace=api
```

Expected: installs `deepl-node` into `api/node_modules` (or root hoisted). No errors.

- [ ] **Step 1.3: Verify**

```bash
node -e "require('deepl-node'); console.log('ok')" --require "d:/TestTmp/LibreChatGopaV1/node_modules/deepl-node/dist/index.js" 2>/dev/null || node -e "const d = require('d:/TestTmp/LibreChatGopaV1/node_modules/deepl-node'); console.log(typeof d.Translator)"
```

Expected: prints `function`.

- [ ] **Step 1.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add api/package.json package-lock.json && git commit -m "chore: add deepl-node dependency"
```

---

## Task 2 — DB types

**Files:**
- Create: `packages/data-schemas/src/types/deeplJob.ts`

- [ ] **Step 2.1: Create the file**

Create `packages/data-schemas/src/types/deeplJob.ts` with this exact content:

```typescript
import { Document } from 'mongoose';

export type DeepLJobProviderDetailPrimitive = boolean | number | string | null;

export interface DeepLJobProviderDetailObject {
  [key: string]: DeepLJobProviderDetails;
}

export type DeepLJobProviderDetails =
  | DeepLJobProviderDetailPrimitive
  | DeepLJobProviderDetailObject
  | DeepLJobProviderDetails[];

export interface IDeepLJobAnalytics extends Omit<Document, 'model'> {
  documentId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  userProvider?: string;
  sourceIp?: string;
  forwardedFor?: string;
  userAgent?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType?: string;
  deviceVendor?: string;
  deviceModel?: string;
  referer?: string;
  fileName?: string;
  fileMimeType?: string;
  fileExtension?: string;
  sizeBytes?: number;
  sourceLanguage?: string;
  targetLanguage?: string;
  documentKey?: string;
  uploadProviderStatus?: string;
  uploadProviderDetails?: DeepLJobProviderDetails;
  latestStatusProviderDetails?: DeepLJobProviderDetails;
  statusChecks: number;
  downloadAttempts: number;
  uploadedAt?: Date;
  lastStatusCheckedAt?: Date;
  completedAt?: Date;
  downloadedAt?: Date;
  status: string;
  error?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DeepLJobRecord = Omit<IDeepLJobAnalytics, keyof Document>;

export interface DeepLJobIncrement {
  downloadAttempts?: number;
  statusChecks?: number;
}

export type CreateDeepLJobInput = Partial<DeepLJobRecord>;

export interface UpdateDeepLJobInput extends Partial<DeepLJobRecord> {
  $inc?: DeepLJobIncrement;
}

export interface DeepLJobSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DeepLJobSearchResult {
  jobs: IDeepLJobAnalytics[];
  pagination: {
    page: number;
    limit: number;
    totalJobs: number;
    totalPages: number;
  };
  filters: {
    search: string;
    status: string;
    userId: string;
    dateFrom: string;
    dateTo: string;
  };
}
```

---

## Task 3 — DB schema

**Files:**
- Create: `packages/data-schemas/src/schema/deeplJob.ts`

- [ ] **Step 3.1: Create the file**

```typescript
import { Schema } from 'mongoose';
import type { IDeepLJobAnalytics } from '~/types';

const deeplJob: Schema<IDeepLJobAnalytics> = new Schema(
  {
    documentId: { type: String, index: true },
    userId: { type: String, index: true },
    userEmail: { type: String, index: true },
    userName: String,
    userRole: String,
    userProvider: String,
    sourceIp: String,
    forwardedFor: String,
    userAgent: String,
    browserName: String,
    browserVersion: String,
    osName: String,
    osVersion: String,
    deviceType: String,
    deviceVendor: String,
    deviceModel: String,
    referer: String,
    fileName: String,
    fileMimeType: String,
    fileExtension: String,
    sizeBytes: Number,
    sourceLanguage: String,
    targetLanguage: String,
    documentKey: String,
    uploadProviderStatus: String,
    uploadProviderDetails: Schema.Types.Mixed,
    latestStatusProviderDetails: Schema.Types.Mixed,
    statusChecks: { type: Number, default: 0 },
    downloadAttempts: { type: Number, default: 0 },
    uploadedAt: Date,
    lastStatusCheckedAt: Date,
    completedAt: Date,
    downloadedAt: Date,
    status: { type: String, default: 'uploaded', index: true },
    error: String,
  },
  {
    collection: 'deepl_jobs',
    timestamps: true,
  },
);

deeplJob.index({ createdAt: -1 });
deeplJob.index({ userId: 1, createdAt: -1 });
deeplJob.index({ userEmail: 1, createdAt: -1 });
deeplJob.index({ status: 1, createdAt: -1 });
deeplJob.index({ fileName: 1, createdAt: -1 });
deeplJob.index({ sourceLanguage: 1, targetLanguage: 1, createdAt: -1 });
deeplJob.index({ sourceIp: 1, createdAt: -1 });

export default deeplJob;
```

---

## Task 4 — DB model

**Files:**
- Create: `packages/data-schemas/src/models/deeplJob.ts`

- [ ] **Step 4.1: Create the file**

```typescript
import deeplJobSchema from '~/schema/deeplJob';
import type { IDeepLJobAnalytics } from '~/types';

export function createDeepLJobModel(mongoose: typeof import('mongoose')) {
  return (
    mongoose.models.DeepLJobAnalytics ||
    mongoose.model<IDeepLJobAnalytics>('DeepLJobAnalytics', deeplJobSchema)
  );
}
```

---

## Task 5 — DB methods (TDD)

**Files:**
- Create: `packages/data-schemas/src/methods/deeplJob.spec.ts`
- Create: `packages/data-schemas/src/methods/deeplJob.ts`

- [ ] **Step 5.1: Write the failing tests**

Create `packages/data-schemas/src/methods/deeplJob.spec.ts`:

```typescript
import os from 'os';
import path from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createModels } from '~/models';
import { createDeepLJobMethods } from './deeplJob';

jest.setTimeout(300000);

let mongoServer: MongoMemoryServer | null = null;
let modelsToCleanup: string[] = [];
let methods: ReturnType<typeof createDeepLJobMethods>;

const getMongoMemoryServerOptions = () => {
  const preferredBinaryPath = path.join(
    os.homedir(),
    '.cache',
    'mongodb-binaries',
    'mongod-x64-win32-7.0.14.exe',
  );
  if (!existsSync(preferredBinaryPath)) {
    return undefined;
  }
  return { binary: { systemBinary: preferredBinaryPath } };
};

describe('DeepL Job Methods', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create(getMongoMemoryServerOptions());
    await mongoose.connect(mongoServer.getUri());
    const models = createModels(mongoose);
    modelsToCleanup = Object.keys(models);
    Object.assign(mongoose.models, models);
    methods = createDeepLJobMethods(mongoose);
  });

  afterAll(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
    for (const modelName of modelsToCleanup) {
      if (mongoose.models[modelName]) {
        delete mongoose.models[modelName];
      }
    }
    await mongoose.disconnect();
    if (mongoServer != null) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await mongoose.connection.dropDatabase();
  });

  it('should create a DeepL job with schema defaults', async () => {
    const created = await methods.createDeepLJob({
      documentId: uuidv4(),
      userId: new mongoose.Types.ObjectId().toString(),
      userEmail: 'user@example.com',
      fileName: 'document.docx',
      sourceLanguage: 'EN',
      targetLanguage: 'FR',
    });

    expect(created).not.toBeNull();
    expect(created?.status).toBe('uploaded');
    expect(created?.statusChecks).toBe(0);
    expect(created?.downloadAttempts).toBe(0);
  });

  it('should update the latest job by document id and increment counters', async () => {
    const documentId = uuidv4();
    await methods.createDeepLJob({ documentId, status: 'uploaded', fileName: 'draft.docx' });

    const updated = await methods.updateDeepLJobByDocumentId(documentId, {
      status: 'translating',
      latestStatusProviderDetails: { translatedCharacters: 42 },
      $inc: { statusChecks: 1 },
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('translating');
    expect(updated?.statusChecks).toBe(1);
    expect(updated?.latestStatusProviderDetails).toEqual({ translatedCharacters: 42 });
  });

  it('should search DeepL jobs with filters and pagination', async () => {
    const matchingUserId = new mongoose.Types.ObjectId().toString();

    await methods.createDeepLJob({
      documentId: uuidv4(),
      userId: matchingUserId,
      userEmail: 'match@example.com',
      fileName: 'important-report.docx',
      status: 'done',
      sourceLanguage: 'EN',
      targetLanguage: 'FR',
    });

    await methods.createDeepLJob({
      documentId: uuidv4(),
      userId: new mongoose.Types.ObjectId().toString(),
      userEmail: 'other@example.com',
      fileName: 'other.docx',
      status: 'done',
    });

    const result = await methods.searchDeepLJobs({ userId: matchingUserId });

    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0].userId).toBe(matchingUserId);
    expect(result.pagination.totalJobs).toBe(1);
  });

  it('should return null silently when updateDeepLJobByDocumentId receives no documentId', async () => {
    const result = await methods.updateDeepLJobByDocumentId('', { status: 'done' });
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 5.2: Run tests to confirm they fail**

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/data-schemas" && npx jest src/methods/deeplJob.spec.ts --runInBand --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module './deeplJob'` or similar.

- [ ] **Step 5.3: Implement the methods**

Create `packages/data-schemas/src/methods/deeplJob.ts`:

```typescript
import logger from '../config/winston';
import type { FilterQuery, Model, UpdateQuery } from 'mongoose';
import type {
  CreateDeepLJobInput,
  DeepLJobSearchParams,
  DeepLJobSearchResult,
  IDeepLJobAnalytics,
  UpdateDeepLJobInput,
} from '~/types';

const DEFAULT_DEEPL_LIST_LIMIT = 200;

const normalizeDeepLSearchText = (value?: string): string => value?.trim() ?? '';

const sanitizeDeepLJobUpdate = (
  value: Omit<UpdateDeepLJobInput, '$inc'>,
): Partial<Omit<UpdateDeepLJobInput, '$inc'>> => {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
  return Object.fromEntries(entries) as Partial<Omit<UpdateDeepLJobInput, '$inc'>>;
};

const escapeRegExp = (value = ''): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function createDeepLJobMethods(mongoose: typeof import('mongoose')) {
  const DeepLJobAnalytics = mongoose.models.DeepLJobAnalytics as Model<IDeepLJobAnalytics>;

  async function createDeepLJob(payload: CreateDeepLJobInput): Promise<IDeepLJobAnalytics | null> {
    try {
      return await DeepLJobAnalytics.create(payload);
    } catch (error) {
      logger.warn('[deepl] Could not persist DeepL job record', error);
      return null;
    }
  }

  async function updateDeepLJobByDocumentId(
    documentId: string,
    updates: UpdateDeepLJobInput,
  ): Promise<IDeepLJobAnalytics | null> {
    if (!documentId) {
      return null;
    }

    try {
      const { $inc, ...setUpdates } = updates;
      const sanitizedSetUpdates = sanitizeDeepLJobUpdate(setUpdates);
      const hasSetUpdates = Object.keys(sanitizedSetUpdates).length > 0;
      const hasIncrementUpdates = $inc != null && Object.keys($inc).length > 0;

      if (!hasSetUpdates && !hasIncrementUpdates) {
        return null;
      }

      const updateQuery: UpdateQuery<IDeepLJobAnalytics> = {};
      if (hasSetUpdates) {
        updateQuery.$set = sanitizedSetUpdates;
      }
      if (hasIncrementUpdates && $inc != null) {
        updateQuery.$inc = $inc;
      }

      return await DeepLJobAnalytics.findOneAndUpdate(
        { documentId: String(documentId) },
        updateQuery,
        { new: true, sort: { createdAt: -1 } },
      ).lean();
    } catch (error) {
      logger.warn(
        `[deepl] Could not update DeepL job record for documentId="${documentId}"`,
        error,
      );
      return null;
    }
  }

  async function listRecentDeepLJobs(
    limit = DEFAULT_DEEPL_LIST_LIMIT,
  ): Promise<IDeepLJobAnalytics[]> {
    return await DeepLJobAnalytics.find({}).sort({ createdAt: -1 }).limit(limit).lean();
  }

  async function searchDeepLJobs(params: DeepLJobSearchParams = {}): Promise<DeepLJobSearchResult> {
    const { page = 1, limit = 50, search = '', status, userId, dateFrom, dateTo } = params;

    const safePage = Number.isFinite(page) ? Math.max(1, Number(page)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Number(limit)) : 50;
    const skip = (safePage - 1) * safeLimit;
    const filter: FilterQuery<IDeepLJobAnalytics> = {};

    if (status != null && status.trim().length > 0) {
      filter.status = status.trim();
    }
    if (userId != null && userId.trim().length > 0) {
      filter.userId = userId.trim();
    }
    if (dateFrom != null || dateTo != null) {
      const createdAtFilter: NonNullable<FilterQuery<IDeepLJobAnalytics>['createdAt']> = {};
      if (dateFrom != null) {
        const parsedDateFrom = new Date(dateFrom);
        if (!Number.isNaN(parsedDateFrom.getTime())) {
          createdAtFilter.$gte = parsedDateFrom;
        }
      }
      if (dateTo != null) {
        const parsedDateTo = new Date(dateTo);
        if (!Number.isNaN(parsedDateTo.getTime())) {
          createdAtFilter.$lte = parsedDateTo;
        }
      }
      if (Object.keys(createdAtFilter).length > 0) {
        filter.createdAt = createdAtFilter;
      }
    }

    const trimmedSearch = normalizeDeepLSearchText(search);
    if (trimmedSearch.length > 0) {
      const regex = new RegExp(escapeRegExp(trimmedSearch), 'i');
      filter.$or = [
        { userEmail: regex },
        { userName: regex },
        { userId: regex },
        { fileName: regex },
        { sourceLanguage: regex },
        { targetLanguage: regex },
        { sourceIp: regex },
        { documentId: regex },
        { documentKey: regex },
        { status: regex },
        { error: regex },
        { userAgent: regex },
      ];
    }

    const [totalJobs, jobs] = await Promise.all([
      DeepLJobAnalytics.countDocuments(filter),
      DeepLJobAnalytics.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    ]);

    return {
      jobs,
      pagination: {
        page: safePage,
        limit: safeLimit,
        totalJobs,
        totalPages: Math.max(1, Math.ceil(totalJobs / safeLimit)),
      },
      filters: {
        search: trimmedSearch,
        status: status ?? '',
        userId: userId ?? '',
        dateFrom: dateFrom ?? '',
        dateTo: dateTo ?? '',
      },
    };
  }

  return { createDeepLJob, updateDeepLJobByDocumentId, listRecentDeepLJobs, searchDeepLJobs };
}

export type DeepLJobMethods = ReturnType<typeof createDeepLJobMethods>;
```

- [ ] **Step 5.4: Run tests to confirm they pass**

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/data-schemas" && npx jest src/methods/deeplJob.spec.ts --runInBand --no-coverage 2>&1 | tail -15
```

Expected: `Tests: 4 passed, 4 total`

- [ ] **Step 5.5: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add packages/data-schemas/src/types/deeplJob.ts packages/data-schemas/src/schema/deeplJob.ts packages/data-schemas/src/models/deeplJob.ts packages/data-schemas/src/methods/deeplJob.ts packages/data-schemas/src/methods/deeplJob.spec.ts && git commit -m "feat: add DeepL job DB layer (schema, model, methods)"
```

---

## Task 6 — Wire data-schemas indexes

**Files:**
- Modify: `packages/data-schemas/src/types/index.ts`
- Modify: `packages/data-schemas/src/schema/index.ts`
- Modify: `packages/data-schemas/src/models/index.ts`
- Modify: `packages/data-schemas/src/methods/index.ts`

- [ ] **Step 6.1: types/index.ts — add export after the `/* Admin */` block**

In `packages/data-schemas/src/types/index.ts`, the file ends with `export * from './mcp';`. Add below it:

```typescript
/* DeepL */
export * from './deeplJob';
```

- [ ] **Step 6.2: schema/index.ts — add export**

In `packages/data-schemas/src/schema/index.ts`, add after the last export line:

```typescript
export { default as deeplJobSchema } from './deeplJob';
```

- [ ] **Step 6.3: models/index.ts — add import and registration**

In `packages/data-schemas/src/models/index.ts`:

1. Add this import alongside the other model imports (after line 14 `import { createFileModel } from './file';`):

```typescript
import { createDeepLJobModel } from './deeplJob';
```

2. In the `createModels` return object (before the closing `};`), add:

```typescript
    DeepLJobAnalytics: createDeepLJobModel(mongoose),
```

- [ ] **Step 6.4: methods/index.ts — add import, wire, export type**

In `packages/data-schemas/src/methods/index.ts`:

1. Add import after the existing imports (after `import { createFileMethods, type FileMethods } from './file';`):

```typescript
/* DeepL */
import { createDeepLJobMethods, type DeepLJobMethods } from './deeplJob';
```

2. In the `createMethods` intersection type (the type that lists all Methods), add `DeepLJobMethods &`.

3. In the `createMethods` return object, add:

```typescript
    ...createDeepLJobMethods(mongoose),
```

4. In the exported union type at the bottom, add `DeepLJobMethods,`.

- [ ] **Step 6.5: TypeScript check**

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/data-schemas" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 6.6: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add packages/data-schemas/src/types/index.ts packages/data-schemas/src/schema/index.ts packages/data-schemas/src/models/index.ts packages/data-schemas/src/methods/index.ts && git commit -m "feat: wire DeepL job DB layer into data-schemas indexes"
```

---

## Task 7 — data-provider types

**Files:**
- Create: `packages/data-provider/src/types/deepl.ts`
- Modify: `packages/data-provider/src/types/index.ts`

- [ ] **Step 7.1: Create types/deepl.ts**

```typescript
export const deeplSupportedUploadExtensions = [
  '.docx',
  '.pptx',
  '.xlsx',
  '.pdf',
  '.html',
  '.htm',
  '.txt',
  '.xlf',
  '.xliff',
] as const;

export const deeplSupportedUploadMimeTypes = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
  'text/html',
  'text/plain',
  'application/xliff+xml',
] as const;

export const deeplUploadAccept = deeplSupportedUploadExtensions.join(',');

export type DeepLDocumentStatusCode = 'done' | 'error' | 'queued' | 'translating' | 'uploaded';

export interface DeepLLanguageOption {
  code: string;
  name: string;
  supportsFormality?: boolean;
}

export interface DeepLLanguagesResponse {
  sourceLanguages: DeepLLanguageOption[];
  targetLanguages: DeepLLanguageOption[];
}

export interface DeepLDocumentHandle {
  documentId: string;
  documentKey: string;
}

export interface DeepLUploadResponse extends DeepLDocumentHandle {
  fileName: string;
  sourceLanguage: string | null;
  status: 'uploaded';
  targetLanguage: string;
}

export interface DeepLStatusResponse extends DeepLDocumentHandle {
  billedCharacters: number | null;
  errorMessage: string | null;
  isError: boolean;
  isReady: boolean;
  ok: boolean;
  secondsRemaining: number | null;
  status: DeepLDocumentStatusCode;
}
```

- [ ] **Step 7.2: Wire types/index.ts**

In `packages/data-provider/src/types/index.ts`, the file currently has:
```typescript
export * from './queries';
export * from './mcpServers';
```

Add below the existing exports:
```typescript
export * from './deepl';
```

- [ ] **Step 7.3: Build data-provider to check types**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npm run build:data-provider 2>&1 | tail -15
```

Expected: build succeeds (or only pre-existing warnings).

- [ ] **Step 7.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add packages/data-provider/src/types/deepl.ts packages/data-provider/src/types/index.ts && git commit -m "feat: add DeepL shared types to data-provider"
```

---

## Task 8 — data-provider keys + endpoints

**Files:**
- Modify: `packages/data-provider/src/keys.ts`
- Modify: `packages/data-provider/src/api-endpoints.ts`

- [ ] **Step 8.1: keys.ts — add QueryKeys**

In `packages/data-provider/src/keys.ts`, find the `QueryKeys` enum. After the last entry before the closing `}` (currently `updateMemoryPreferences = 'updateMemoryPreferences'`), add in the appropriate location in `QueryKeys` (before the closing brace):

```typescript
  /* DeepL */
  adminDeepLJobs = 'adminDeepLJobs',
  deeplLanguages = 'deeplLanguages',
```

- [ ] **Step 8.2: keys.ts — add MutationKeys**

In the same file, in the `MutationKeys` enum, before the closing `}` (after `updateMemoryPreferences`), add:

```typescript
  /* DeepL */
  deeplUpload = 'deeplUpload',
  deeplStatus = 'deeplStatus',
  deeplDownload = 'deeplDownload',
```

- [ ] **Step 8.3: api-endpoints.ts — add DeepL endpoints**

In `packages/data-provider/src/api-endpoints.ts`, at the end of the file (after the `graphToken` export), add:

```typescript
/* DeepL */
const deeplRoot = `${BASE_URL}/api/deepl`;

export const deeplLanguages = () => `${deeplRoot}/languages`;

export const deeplUpload = () => `${deeplRoot}/upload`;

export const deeplStatus = () => `${deeplRoot}/status`;

export const deeplDownload = () => `${deeplRoot}/download`;
```

- [ ] **Step 8.4: Build to verify**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npm run build:data-provider 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 8.5: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add packages/data-provider/src/keys.ts packages/data-provider/src/api-endpoints.ts && git commit -m "feat: add DeepL query/mutation keys and API endpoints to data-provider"
```

---

## Task 9 — data-provider data-service + mutations

**Files:**
- Modify: `packages/data-provider/src/data-service.ts`
- Modify: `packages/data-provider/src/types/mutations.ts`

- [ ] **Step 9.1: data-service.ts — add DeepL methods**

In `packages/data-provider/src/data-service.ts`, at the end of the file (before the final closing brace of the exported object if there is one, or at the end of the module exports), add:

```typescript
/* DeepL */
export function getDeepLLanguages(): Promise<t.DeepLLanguagesResponse> {
  return request.get(endpoints.deeplLanguages());
}

export function uploadDeepLDocument(data: FormData): Promise<t.DeepLUploadResponse> {
  return request.postMultiPart(endpoints.deeplUpload(), data);
}

export function getDeepLDocumentStatus(
  payload: t.DeepLDocumentHandle,
): Promise<t.DeepLStatusResponse> {
  return request.post(endpoints.deeplStatus(), payload);
}

export function downloadDeepLDocument(
  payload: t.DeepLDocumentHandle,
): Promise<import('axios').AxiosResponse<Blob>> {
  return request.postResponse(endpoints.deeplDownload(), payload, { responseType: 'blob' });
}
```

Note: Check the existing `import type` at the top of data-service.ts. If `AxiosResponse` is not already imported, add it from `axios`. Check first:
```bash
grep -n "AxiosResponse\|axios" "d:/TestTmp/LibreChatGopaV1/packages/data-provider/src/data-service.ts" | head -5
```
If already imported, use `import type { AxiosResponse } from 'axios'` form. If not, use the inline import shown above.

- [ ] **Step 9.2: types/mutations.ts — add DeepL mutation option types**

In `packages/data-provider/src/types/mutations.ts`, at the end of the file, add:

```typescript
export type DeepLUploadOptions = MutationOptions<types.DeepLUploadResponse, FormData>;

export type DeepLStatusOptions = MutationOptions<
  types.DeepLStatusResponse,
  types.DeepLDocumentHandle
>;

export type DeepLDownloadOptions = MutationOptions<
  import('axios').AxiosResponse<Blob>,
  types.DeepLDocumentHandle
>;
```

Note: `types` is already imported at the top of mutations.ts. `MutationOptions` is already defined in that file.

- [ ] **Step 9.3: Build to verify**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npm run build:data-provider 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 9.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add packages/data-provider/src/data-service.ts packages/data-provider/src/types/mutations.ts && git commit -m "feat: add DeepL service methods and mutation types to data-provider"
```

---

## Task 10 — packages/api DeepL service (TDD)

**Files:**
- Create: `packages/api/src/files/deepl.spec.ts`
- Create: `packages/api/src/files/deepl.ts`

- [ ] **Step 10.1: Write the failing tests**

Create `packages/api/src/files/deepl.spec.ts`:

```typescript
const mockedDownloadDocument = jest.fn();
const mockedGetDocumentStatus = jest.fn();
const mockedGetSourceLanguages = jest.fn();
const mockedGetTargetLanguages = jest.fn();
const mockedUploadDocument = jest.fn();

jest.mock('deepl-node', () => ({
  Translator: jest.fn().mockImplementation(() => ({
    downloadDocument: mockedDownloadDocument,
    getDocumentStatus: mockedGetDocumentStatus,
    getSourceLanguages: mockedGetSourceLanguages,
    getTargetLanguages: mockedGetTargetLanguages,
    uploadDocument: mockedUploadDocument,
  })),
}));

import { writeFile } from 'fs/promises';
import {
  createDeepLTranslatedFileName,
  downloadDeepLDocument,
  getDeepLDocumentStatus,
  getDeepLLanguages,
  isDeepLUploadMimeType,
  normalizeDeepLUploadMimeType,
  uploadDeepLDocument,
} from './deepl';

describe('deepl', () => {
  beforeEach(() => {
    process.env.DEEPL_API_KEY = 'test-deepl-key';
    delete process.env.DEEPL_API_SERVER_URL;
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.DEEPL_API_KEY;
    delete process.env.DEEPL_API_SERVER_URL;
  });

  it('normalizes custom XLIFF MIME types and validates DeepL support', () => {
    expect(normalizeDeepLUploadMimeType({ fileName: 'file.xlf', mimeType: null })).toBe(
      'application/xliff+xml',
    );
    expect(isDeepLUploadMimeType('application/xliff+xml')).toBe(true);
    expect(isDeepLUploadMimeType('image/png')).toBe(false);
  });

  it('builds a translated file name using a sanitized source file name', () => {
    expect(
      createDeepLTranslatedFileName({ fileName: 'report.docx', targetLanguage: 'fr' }),
    ).toBe('report_fr.docx');
    expect(
      createDeepLTranslatedFileName({ fileName: null, targetLanguage: null }),
    ).toBe('translated_translated');
  });

  it('retrieves and normalizes available DeepL languages', async () => {
    mockedGetSourceLanguages.mockResolvedValue([{ code: 'EN', name: 'English' }]);
    mockedGetTargetLanguages.mockResolvedValue([
      { code: 'FR', name: 'French', supportsFormality: true },
    ]);

    const result = await getDeepLLanguages();

    expect(result.sourceLanguages).toEqual([{ code: 'EN', name: 'English' }]);
    expect(result.targetLanguages).toEqual([
      { code: 'FR', name: 'French', supportsFormality: true },
    ]);
  });

  it('uploads a document and returns a normalized DeepL handle', async () => {
    mockedUploadDocument.mockResolvedValue({ documentId: 'doc-id', documentKey: 'doc-key' });

    const result = await uploadDeepLDocument({
      fileBuffer: Buffer.from('hello'),
      fileName: 'report.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sourceLanguage: 'EN',
      targetLanguage: 'FR',
    });

    expect(result.documentId).toBe('doc-id');
    expect(result.documentKey).toBe('doc-key');
    expect(result.status).toBe('uploaded');
    expect(result.targetLanguage).toBe('FR');
  });

  it('retrieves and normalizes DeepL document status', async () => {
    mockedGetDocumentStatus.mockResolvedValue({
      status: 'translating',
      billedCharacters: null,
      secondsRemaining: 10,
      errorMessage: null,
      done: () => false,
      ok: () => true,
    });

    const result = await getDeepLDocumentStatus({ documentId: 'doc-id', documentKey: 'doc-key' });

    expect(result.status).toBe('translating');
    expect(result.isReady).toBe(false);
    expect(result.ok).toBe(true);
  });

  it('throws a configuration error when the DeepL key is missing', async () => {
    delete process.env.DEEPL_API_KEY;
    await expect(getDeepLLanguages()).rejects.toMatchObject({ statusCode: 500 });
  });
});
```

- [ ] **Step 10.2: Run tests to confirm they fail**

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/api" && npx jest src/files/deepl.spec.ts --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module './deepl'`.

- [ ] **Step 10.3: Implement deepl.ts**

Create `packages/api/src/files/deepl.ts` — copy the exact content from `d:/Developement2026/LibreChatGOPA/packages/api/src/files/deepl.ts`. The file is already analyzed and uses `deepl-node`'s `Translator` class. No changes needed — it reads `process.env.DEEPL_API_KEY` and optionally `DEEPL_API_SERVER_URL`.

Key exports from the file:
- `DEEPL_UPLOAD_FILE_SIZE_LIMIT_BYTES` (25 MB constant)
- `normalizeDeepLUploadMimeType`
- `isDeepLUploadMimeType`
- `createDeepLTranslatedFileName`
- `createDeepLUploadMetadata`
- `getDeepLLanguages`
- `uploadDeepLDocument`
- `getDeepLDocumentStatus`
- `downloadDeepLDocument`

- [ ] **Step 10.4: Run tests to confirm they pass**

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/api" && npx jest src/files/deepl.spec.ts --no-coverage 2>&1 | tail -15
```

Expected: `Tests: 6 passed, 6 total`

- [ ] **Step 10.5: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add packages/api/src/files/deepl.ts packages/api/src/files/deepl.spec.ts && git commit -m "feat: add DeepL service wrapper (deepl-node SDK)"
```

---

## Task 11 — Wire packages/api + rebuild data-provider

**Files:**
- Modify: `packages/api/src/files/index.ts`

- [ ] **Step 11.1: Add deepl export**

In `packages/api/src/files/index.ts`, add at the end:

```typescript
export * from './deepl';
```

- [ ] **Step 11.2: TypeScript check**

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/api" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 11.3: Rebuild data-provider (packages/api depends on it)**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npm run build:data-provider 2>&1 | tail -10
```

Expected: success.

- [ ] **Step 11.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add packages/api/src/files/index.ts && git commit -m "feat: export DeepL service from packages/api"
```

---

## Task 12 — Express route

**Files:**
- Create: `api/server/routes/deepl.js`

- [ ] **Step 12.1: Create the route file**

Copy the exact content from `d:/Developement2026/LibreChatGOPA/api/server/routes/deepl.js` into `api/server/routes/deepl.js`.

The file uses:
- `require('@librechat/api')` for the deepl service functions (this resolves to `packages/api`)
- `require('~/models')` for `createDeepLJob` and `updateDeepLJobByDocumentId`
- `multer` with `memoryStorage` (in-memory buffer, not disk)
- `ua-parser-js` for user agent parsing
- `require('~/server/middleware')` for `requireJwtAuth`, `checkBan`, `uaParser`, `createFileLimiters`

Routes exposed:
- `GET /languages` — no auth at the route level (auth via middleware), returns DeepL language list
- `POST /upload` — multer single file, writes job to DB, returns `DeepLUploadResponse`
- `POST /status` — polls DeepL, updates DB job, returns `DeepLStatusResponse`
- `POST /download` — downloads from DeepL, increments DB counter, streams file back

- [ ] **Step 12.2: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add api/server/routes/deepl.js && git commit -m "feat: add DeepL Express route handler"
```

---

## Task 13 — Wire Express routes

**Files:**
- Modify: `api/server/routes/index.js`
- Modify: `api/server/index.js`

- [ ] **Step 13.1: routes/index.js — add require and export**

In `api/server/routes/index.js`:

1. Add at the top with the other `require` statements:
```javascript
const deepl = require('./deepl');
```

2. Add `deepl,` to the `module.exports` object.

- [ ] **Step 13.2: index.js — mount route**

In `api/server/index.js`, find where other `/api/*` routes are mounted (e.g., near `app.use('/api/files', routes.files)`). Add:

```javascript
  app.use('/api/deepl', routes.deepl);
```

- [ ] **Step 13.3: Verify the server starts**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && node -e "
const routes = require('./api/server/routes');
console.log('deepl router:', typeof routes.deepl);
" 2>&1 | head -5
```

Expected: `deepl router: function`

- [ ] **Step 13.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add api/server/routes/index.js api/server/index.js && git commit -m "feat: mount DeepL route at /api/deepl"
```

---

## Task 14 — Shared frontend components

**Files:**
- Create: `client/src/components/AssetIcon.tsx`
- Create: `client/src/components/PageHeaderCard.tsx`
- Create: `client/src/components/Nav/SidebarReopenButton.tsx`

- [ ] **Step 14.1: Create AssetIcon.tsx**

Copy from `d:/Developement2026/LibreChatGOPA/client/src/components/AssetIcon.tsx`.

The component renders an `<img>` with lazy loading and a fallback, uses no external deps beyond React.

- [ ] **Step 14.2: Create PageHeaderCard.tsx**

Copy from `d:/Developement2026/LibreChatGOPA/client/src/components/PageHeaderCard.tsx`.

The component takes `{ title, description, iconSrc?, children?, className? }` and renders a styled card. It uses `AssetIcon` for the icon and Tailwind classes.

- [ ] **Step 14.3: Create SidebarReopenButton.tsx**

Copy from `d:/Developement2026/LibreChatGOPA/client/src/components/Nav/SidebarReopenButton.tsx`.

The component is a button that calls the Recoil store to reopen the sidebar. Check its imports — it likely uses `useRecoilState` or a hook from `~/hooks`.

After copying, run:
```bash
cd "d:/TestTmp/LibreChatGopaV1" && npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -i "AssetIcon\|PageHeader\|SidebarRe" | head -10
```

Fix any import path issues (e.g., if it imports from a hook that doesn't exist in GopaV1, check what the equivalent is).

- [ ] **Step 14.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add client/src/components/AssetIcon.tsx client/src/components/PageHeaderCard.tsx client/src/components/Nav/SidebarReopenButton.tsx && git commit -m "feat: add shared page components (AssetIcon, PageHeaderCard, SidebarReopenButton)"
```

---

## Task 15 — i18n keys + assets

**Files:**
- Modify: `client/src/locales/en/translation.json`
- Copy: `client/public/assets/ai_translator_icon.png`
- Copy: `client/public/assets/AI_Translator_grey.png`

- [ ] **Step 15.1: Add i18n keys**

In `client/src/locales/en/translation.json`, add the following 45 keys (insert in alphabetical order within the JSON object):

```json
"com_ui_gopa_deepl_available_now_body": "The document translation route, navigation entry, and admin monitoring are active.",
"com_ui_gopa_deepl_billed_characters": "Billed characters",
"com_ui_gopa_deepl_clear_file": "Clear selected translation file",
"com_ui_gopa_deepl_current_status": "Current status",
"com_ui_gopa_deepl_description": "Translate full documents with DeepL inside the GOPA workspace, with upload tracking and download recovery included.",
"com_ui_gopa_deepl_download": "Download translated document",
"com_ui_gopa_deepl_download_failed": "Failed to download the translated document.",
"com_ui_gopa_deepl_download_ready": "The translated document is ready to download.",
"com_ui_gopa_deepl_download_help_ready": "The translated document is ready. Download it now to finish the workflow.",
"com_ui_gopa_deepl_download_help_title": "Download",
"com_ui_gopa_deepl_download_help_waiting": "DeepL is still processing the document. The download button will appear as soon as the provider marks it done.",
"com_ui_gopa_deepl_download_loading": "Preparing download...",
"com_ui_gopa_deepl_file_help": "Supported formats: {{formats}}.",
"com_ui_gopa_deepl_file_label": "Document to translate",
"com_ui_gopa_deepl_header_alt": "AI document translation illustration",
"com_ui_gopa_deepl_languages_failed": "Failed to retrieve DeepL languages.",
"com_ui_gopa_deepl_languages_loading": "Loading languages...",
"com_ui_gopa_deepl_matching_languages": "Choose a different target language than the source language.",
"com_ui_gopa_deepl_missing_file": "Select a supported document before starting the translation.",
"com_ui_gopa_deepl_missing_target_language": "Choose a target language for the translation.",
"com_ui_gopa_deepl_next_step_body": "Upload a supported document, let DeepL process it in the background, then download the translated file once it is ready.",
"com_ui_gopa_deepl_processing": "Uploading and preparing translation...",
"com_ui_gopa_deepl_ready_now_formats": "Supported formats in this flow: {{formats}}.",
"com_ui_gopa_deepl_ready_now_paragraph": "This page handles the full document translation flow with server-side upload, polling, and download recovery.",
"com_ui_gopa_deepl_ready_now_polling": "After upload, the application polls DeepL automatically until the translated document is ready.",
"com_ui_gopa_deepl_ready_now_title": "Ready now",
"com_ui_gopa_deepl_request_failed": "Failed to start the DeepL translation.",
"com_ui_gopa_deepl_seconds_remaining": "Seconds remaining",
"com_ui_gopa_deepl_source_language": "Source language",
"com_ui_gopa_deepl_status_body": "Document translation is available again in this GOPA workspace.",
"com_ui_gopa_deepl_status_document": "Document",
"com_ui_gopa_deepl_status_done": "Done",
"com_ui_gopa_deepl_status_error": "Error",
"com_ui_gopa_deepl_status_failed": "Failed to refresh the DeepL translation status.",
"com_ui_gopa_deepl_status_panel_title": "Translation progress",
"com_ui_gopa_deepl_status_polling": "DeepL is processing the uploaded document. Status is refreshed automatically.",
"com_ui_gopa_deepl_status_queued": "Queued",
"com_ui_gopa_deepl_status_translating": "Translating",
"com_ui_gopa_deepl_status_uploaded": "Uploaded",
"com_ui_gopa_deepl_submit": "Translate document",
"com_ui_gopa_deepl_title": "Document Translator",
"com_ui_gopa_deepl_target_language": "Target language",
"com_ui_gopa_deepl_target_language_placeholder": "Choose a target language",
"com_ui_gopa_deepl_unsupported_file": "Unsupported file. Use one of these formats: {{formats}}.",
"com_ui_gopa_deepl_uploaded_file": "Uploaded file"
```

- [ ] **Step 15.2: Copy assets**

```bash
cp "d:/Developement2026/LibreChatGOPA/client/public/assets/ai_translator_icon.png" "d:/TestTmp/LibreChatGopaV1/client/public/assets/ai_translator_icon.png"
cp "d:/Developement2026/LibreChatGOPA/client/public/assets/AI_Translator_grey.png" "d:/TestTmp/LibreChatGopaV1/client/public/assets/AI_Translator_grey.png"
```

- [ ] **Step 15.3: Verify assets copied**

```bash
ls "d:/TestTmp/LibreChatGopaV1/client/public/assets/" | grep -i "translator\|ai_"
```

Expected: both files listed.

- [ ] **Step 15.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add client/src/locales/en/translation.json client/public/assets/ai_translator_icon.png client/public/assets/AI_Translator_grey.png && git commit -m "feat: add DeepL i18n keys and assets"
```

---

## Task 16 — Frontend data-provider hooks

**Files:**
- Create: `client/src/data-provider/DeepL/queries.ts`
- Create: `client/src/data-provider/DeepL/mutations.ts`
- Create: `client/src/data-provider/DeepL/index.ts`
- Modify: `client/src/data-provider/index.ts`

- [ ] **Step 16.1: Create DeepL/queries.ts**

```typescript
import { useRecoilValue } from 'recoil';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type * as t from 'librechat-data-provider';
import store from '~/store';

export const useGetDeepLLanguagesQuery = <TData = t.DeepLLanguagesResponse>(
  config?: UseQueryOptions<t.DeepLLanguagesResponse, unknown, TData>,
): QueryObserverResult<TData, unknown> => {
  const queriesEnabled = useRecoilValue<boolean>(store.queriesEnabled);

  return useQuery<t.DeepLLanguagesResponse, unknown, TData>(
    [QueryKeys.deeplLanguages],
    () => dataService.getDeepLLanguages(),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      ...config,
      enabled: (config?.enabled ?? true) === true && queriesEnabled,
    },
  );
};
```

- [ ] **Step 16.2: Create DeepL/mutations.ts**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MutationKeys, QueryKeys, dataService } from 'librechat-data-provider';
import type { QueryClient, UseMutationResult } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';
import type * as t from 'librechat-data-provider';

const invalidateDeepLAnalytics = (queryClient: QueryClient) => {
  queryClient.invalidateQueries([QueryKeys.adminDeepLJobs]);
};

export const useUploadDeepLDocumentMutation = (
  options?: t.DeepLUploadOptions,
): UseMutationResult<t.DeepLUploadResponse, unknown, FormData, unknown> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.deeplUpload], {
    mutationFn: (formData: FormData) => dataService.uploadDeepLDocument(formData),
    ...(options ?? {}),
    onSuccess: (data, variables, context) => {
      invalidateDeepLAnalytics(queryClient);
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useCheckDeepLDocumentStatusMutation = (
  options?: t.DeepLStatusOptions,
): UseMutationResult<t.DeepLStatusResponse, unknown, t.DeepLDocumentHandle, unknown> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.deeplStatus], {
    mutationFn: (payload: t.DeepLDocumentHandle) => dataService.getDeepLDocumentStatus(payload),
    ...(options ?? {}),
    onSuccess: (data, variables, context) => {
      if (data.isError || data.isReady) {
        invalidateDeepLAnalytics(queryClient);
      }
      options?.onSuccess?.(data, variables, context);
    },
  });
};

export const useDownloadDeepLDocumentMutation = (
  options?: t.DeepLDownloadOptions,
): UseMutationResult<AxiosResponse<Blob>, unknown, t.DeepLDocumentHandle, unknown> => {
  const queryClient = useQueryClient();

  return useMutation([MutationKeys.deeplDownload], {
    mutationFn: (payload: t.DeepLDocumentHandle) => dataService.downloadDeepLDocument(payload),
    ...(options ?? {}),
    onSuccess: (data, variables, context) => {
      invalidateDeepLAnalytics(queryClient);
      options?.onSuccess?.(data, variables, context);
    },
  });
};
```

- [ ] **Step 16.3: Create DeepL/index.ts**

```typescript
export * from './mutations';
export * from './queries';
```

- [ ] **Step 16.4: Wire client/src/data-provider/index.ts**

In `client/src/data-provider/index.ts`, the file currently ends with `export * from './SSE';`. Add:

```typescript
export * from './DeepL';
```

- [ ] **Step 16.5: TypeScript check**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -i "DeepL\|deepl" | head -10
```

Expected: no DeepL-related errors.

- [ ] **Step 16.6: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add client/src/data-provider/DeepL/ client/src/data-provider/index.ts && git commit -m "feat: add DeepL React Query hooks"
```

---

## Task 17 — DeeplTranslator component + route wrapper

**Files:**
- Create: `client/src/components/DeepL/DeeplTranslator.tsx`
- Create: `client/src/routes/DeepL.tsx`

- [ ] **Step 17.1: Create DeeplTranslator.tsx**

Copy the exact content from `d:/Developement2026/LibreChatGOPA/client/src/components/DeepL/DeeplTranslator.tsx`.

The component imports:
- `useGetDeepLLanguagesQuery`, `useUploadDeepLDocumentMutation`, `useCheckDeepLDocumentStatusMutation`, `useDownloadDeepLDocumentMutation` from `~/data-provider`
- `PageHeaderCard` from `~/components/PageHeaderCard`
- `SidebarReopenButton` from `~/components/Nav/SidebarReopenButton`
- `useLocalize` from `~/hooks`
- Constants (`deeplSupportedUploadExtensions`, `deeplSupportedUploadMimeTypes`, `deeplUploadAccept`) and types from `librechat-data-provider`
- Lucide icons, React hooks

- [ ] **Step 17.2: Create routes/DeepL.tsx**

```typescript
import DeeplTranslator from '~/components/DeepL/DeeplTranslator';

export default function DeepL() {
  return <DeeplTranslator />;
}
```

- [ ] **Step 17.3: TypeScript check**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npx tsc --noEmit -p client/tsconfig.json 2>&1 | grep -i "deepl\|DeepL\|PageHeader\|Sidebar" | head -15
```

Fix any errors — most likely missing imports if a hook or utility changed name between projects.

- [ ] **Step 17.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add client/src/components/DeepL/ client/src/routes/DeepL.tsx && git commit -m "feat: add DeeplTranslator component and route"
```

---

## Task 18 — Wire client routes

**Files:**
- Modify: `client/src/routes/index.tsx`

- [ ] **Step 18.1: Add import**

In `client/src/routes/index.tsx`, add with the other imports at the top:

```typescript
import DeepL from './DeepL';
```

- [ ] **Step 18.2: Add route**

In the same file, inside the `children` array of the `path: '/'` / `element: <Root />` block (after the `agents/:category` route, before the closing `]` at line 147), add:

```typescript
            {
              path: 'deepl',
              element: <DeepL />,
            },
```

- [ ] **Step 18.3: TypeScript check**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npx tsc --noEmit -p client/tsconfig.json 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 18.4: Commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git add client/src/routes/index.tsx && git commit -m "feat: register /deepl route in client router"
```

---

## Task 19 — Final build verification

- [ ] **Step 19.1: Full build**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && npm run build 2>&1 | tail -20
```

Expected: build succeeds. Vite chunk size warnings are acceptable.

- [ ] **Step 19.2: Run all touched test suites**

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/data-schemas" && npx jest src/methods/deeplJob.spec.ts --runInBand --no-coverage 2>&1 | tail -5
```

```bash
cd "d:/TestTmp/LibreChatGopaV1/packages/api" && npx jest src/files/deepl.spec.ts --no-coverage 2>&1 | tail -5
```

Both expected: all tests pass.

- [ ] **Step 19.3: Smoke-test the backend route registration**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && node -e "
const routes = require('./api/server/routes');
console.log('deepl:', typeof routes.deepl);
" 2>&1
```

Expected: `deepl: function`

- [ ] **Step 19.4: Final commit**

```bash
cd "d:/TestTmp/LibreChatGopaV1" && git log --oneline feat/deepl 2>&1 | head -15
```

Review the commit log. If everything looks clean, no additional commit needed. The branch is ready for review.

---

## Deferred (not in this plan)

The following will be implemented when the Admin Analytics page is ported:
- `packages/data-provider/src/types/admin.ts` (AdminDeepLJobsQuery, AdminDeepLJobsResponse types)
- `packages/api/src/admin/analytics.ts` additions (createAdminDeepLJobSearchParams, createAdminDeepLJobsResponse)
- `api/server/routes/admin/analytics.js` (GET /analytics/deepl-jobs)
- `client/src/data-provider/Admin/` (useGetAdminDeepLJobsQuery)
- `com_ui_admin_deepl_*` i18n keys
