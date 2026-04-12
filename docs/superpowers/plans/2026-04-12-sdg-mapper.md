# SDG Mapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the SDG Mapper feature from `d:/Developement2026/LibreChatGOPA` into `d:/TestTmp/LibreChatGopaV1` on branch `feat/sdg-mapper`.

**Architecture:** Stateless — user submits text or file, `POST /api/sdg` parses the document server-side, calls the JRC KnowSDGs API, normalises the nested JSON response, and returns a hierarchical goal/target tree. Client enriches goal names with static metadata and renders summary cards + a hierarchical table. No DB layer.

**Tech Stack:** TypeScript (packages/data-provider, packages/api), Express + multer + JWT auth (api/server), React + React Query + Recoil (client), JRC KnowSDGs REST API (`https://knowsdgs.jrc.ec.europa.eu/api/rest/mappingdata`).

---

## Task 1: SDG shared types in packages/data-provider

**Files:**
- Create: `packages/data-provider/src/types/sdg.ts`
- Modify: `packages/data-provider/src/types/index.ts`
- Modify: `packages/data-provider/src/types.ts`

- [ ] **Step 1: Create `packages/data-provider/src/types/sdg.ts`**

```typescript
export const sdgSourceLanguages = [
  'bg',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'et',
  'fi',
  'fr',
  'ga',
  'hr',
  'hu',
  'it',
  'lt',
  'lv',
  'mt',
  'nl',
  'pl',
  'pt',
  'ro',
  'sk',
  'sl',
  'sv',
] as const;

export type SDGSourceLanguage = (typeof sdgSourceLanguages)[number];

export const sdgSupportedUploadExtensions = [
  '.pdf',
  '.docx',
  '.xls',
  '.xlsx',
  '.ods',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.html',
  '.htm',
  '.xml',
] as const;

export const sdgSupportedUploadMimeTypes = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/msexcel',
  'application/x-msexcel',
  'application/x-ms-excel',
  'application/x-excel',
  'application/x-dos_ms_excel',
  'application/xls',
  'application/x-xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.spreadsheet',
  'text/plain',
  'text/markdown',
  'text/md',
  'text/csv',
  'text/tab-separated-values',
  'application/csv',
  'application/json',
  'application/xml',
  'text/xml',
  'text/html',
] as const;

export const sdgUploadAccept = sdgSupportedUploadExtensions.join(',');

export type SDGSourceType = 'file' | 'text';

export interface SDGMappingNode {
  id: string | null;
  type: string | null;
  name: string;
  occurrences: number;
  relevance: string | null;
  children: SDGMappingNode[];
}

export interface SDGMapResponse {
  generatedAt: string;
  message: string | null;
  sourceType: SDGSourceType;
  sourceLanguage: SDGSourceLanguage;
  fileName: string | null;
  fileMimeType: string | null;
  textLength: number;
  totalGoals: number;
  totalTargets: number;
  totalOccurrences: number;
  goals: SDGMappingNode[];
}
```

- [ ] **Step 2: Add barrel export to `packages/data-provider/src/types/index.ts`**

Current content:
```typescript
export * from './queries';
export * from './mcpServers';
export * from './deepl';
```

Add at the end:
```typescript
export * from './sdg';
```

- [ ] **Step 3: Add rollup export to `packages/data-provider/src/types.ts`**

Current last line: `export * from './types/deepl';`

Add after it:
```typescript
export * from './types/sdg';
```

- [ ] **Step 4: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add packages/data-provider/src/types/sdg.ts packages/data-provider/src/types/index.ts packages/data-provider/src/types.ts
git commit -m "feat(data-provider): add SDG shared types"
```

---

## Task 2: SDG keys, endpoint, data-service, SDGMapOptions

**Files:**
- Modify: `packages/data-provider/src/keys.ts`
- Modify: `packages/data-provider/src/api-endpoints.ts`
- Modify: `packages/data-provider/src/data-service.ts`
- Modify: `packages/data-provider/src/types/mutations.ts`

- [ ] **Step 1: Add `mapSDG` to MutationKeys in `packages/data-provider/src/keys.ts`**

Locate the block:
```typescript
  deeplUpload = 'deeplUpload',
  deeplStatus = 'deeplStatus',
  deeplDownload = 'deeplDownload',
}
```

Replace with:
```typescript
  deeplUpload = 'deeplUpload',
  deeplStatus = 'deeplStatus',
  deeplDownload = 'deeplDownload',
  /* SDG */
  mapSDG = 'mapSDG',
}
```

- [ ] **Step 2: Add `sdg()` endpoint to `packages/data-provider/src/api-endpoints.ts`**

Current last lines (after the DeepL block):
```typescript
export const deeplDownload = () => `${BASE_URL}/api/deepl/download`;
```

Add after it:
```typescript

export const sdg = () => `${BASE_URL}/api/sdg`;
```

- [ ] **Step 3: Add `mapSDG()` to `packages/data-provider/src/data-service.ts`**

Current last lines (after `downloadDeepLDocument`):
```typescript
export function downloadDeepLDocument(
  payload: deepl.DeepLDocumentHandle,
): Promise<AxiosResponse<Blob>> {
  return request.postResponse(endpoints.deeplDownload(), payload, { responseType: 'blob' });
}
```

Add after the closing `}`:
```typescript

/* SDG */
export function mapSDG(data: FormData, signal?: AbortSignal | null): Promise<t.SDGMapResponse> {
  const requestConfig = signal ? { signal } : undefined;
  return request.postMultiPart(endpoints.sdg(), data, requestConfig);
}
```

(`t` is already imported as `import type * as t from './types'` at the top of data-service.ts. `SDGMapResponse` becomes available on `t` because `./types` = `src/types.ts` which now exports `./types/sdg`.)

- [ ] **Step 4: Add `SDGMapOptions` type to `packages/data-provider/src/types/mutations.ts`**

Current last lines:
```typescript
export type DeepLDownloadOptions = MutationOptions<
  import('axios').AxiosResponse<Blob>,
  types.DeepLDocumentHandle
>;
```

Add after the closing `>;`:
```typescript

export type SDGMapOptions = MutationOptions<types.SDGMapResponse, FormData>;
```

(`types` is already imported as `import * as types from '../types'` which resolves to `src/types.ts`.)

- [ ] **Step 5: Build data-provider**

```bash
cd d:/TestTmp/LibreChatGopaV1
npm run build:data-provider
```

Expected: no errors, `packages/data-provider/dist/` updated.

- [ ] **Step 6: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add packages/data-provider/src/keys.ts packages/data-provider/src/api-endpoints.ts packages/data-provider/src/data-service.ts packages/data-provider/src/types/mutations.ts
git commit -m "feat(data-provider): add SDG keys, endpoint, data-service and mutation type"
```

---

## Task 3: packages/api SDG backend service

**Files:**
- Create: `packages/api/src/files/sdg.spec.ts`
- Create: `packages/api/src/files/sdg.ts`
- Modify: `packages/api/src/files/index.ts`

- [ ] **Step 1: Create `packages/api/src/files/sdg.spec.ts`** (failing tests first)

```typescript
jest.mock('./documents/crud', () => ({
  parseDocument: jest.fn(),
}));

jest.mock('./text', () => ({
  parseTextNative: jest.fn(),
}));

import { parseDocument } from './documents/crud';
import { parseTextNative } from './text';
import { isSDGUploadMimeType, mapSDGInput, normalizeSDGUploadMimeType } from './sdg';

const mockedParseDocument = parseDocument as jest.MockedFunction<typeof parseDocument>;
const mockedParseTextNative = parseTextNative as jest.MockedFunction<typeof parseTextNative>;

describe('sdg', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SDG_API_KEY = 'test-sdg-key';
  });

  afterEach(() => {
    delete process.env.SDG_API_KEY;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('infers MIME types for generic uploads and validates SDG support', () => {
    const normalizedMimeType = normalizeSDGUploadMimeType({
      fileName: 'mapping.txt',
      mimeType: 'application/octet-stream',
    });

    expect(normalizedMimeType).toBe('text/plain');
    expect(isSDGUploadMimeType(normalizedMimeType)).toBe(true);
  });

  it('maps text input and normalizes nested SDG payloads', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: JSON.stringify({
            data: {
              children: [
                {
                  id: 'goal-1',
                  type: 'Concept',
                  name: 'SDG 1',
                  n_occurrences: 3,
                  relevance: '78%',
                  children: [
                    {
                      id: 'target-1-1',
                      type: 'Target',
                      name: 'Target 1.1',
                      n_occurrences: 2,
                    },
                  ],
                },
              ],
            },
          }),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as jest.MockedFunction<typeof fetch>;

    global.fetch = fetchMock;

    const result = await mapSDGInput({
      inputText: ' Poverty reduction ',
      sourceLanguage: 'EN',
    });

    expect(result).toEqual({
      generatedAt: expect.any(String),
      message: null,
      sourceType: 'text',
      sourceLanguage: 'en',
      fileName: null,
      fileMimeType: null,
      textLength: 17,
      totalGoals: 1,
      totalTargets: 1,
      totalOccurrences: 3,
      goals: [
        {
          id: 'goal-1',
          type: 'Concept',
          name: 'SDG 1',
          occurrences: 3,
          relevance: '78%',
          children: [
            {
              id: 'target-1-1',
              type: 'Target',
              name: 'Target 1.1',
              occurrences: 2,
              relevance: null,
              children: [],
            },
          ],
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        'X-Api-Key': 'test-sdg-key',
      }),
    );
    expect(requestInit?.body).toBe(
      JSON.stringify({
        input_text: 'Poverty reduction',
        indicators: 'False',
        source_language: 'en',
      }),
    );
  });

  it('uses the server document parser for supported document uploads', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          children: [
            {
              id: 'goal-2',
              type: 'Concept',
              name: 'SDG 2',
              n_occurrences: 4,
              relevance: '61%',
              children: [],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as jest.MockedFunction<typeof fetch>;

    global.fetch = fetchMock;
    mockedParseDocument.mockResolvedValue({
      filename: 'policy.pdf',
      bytes: 22,
      filepath: 'document_parser',
      text: 'Policy document contents',
      images: [],
    });

    const result = await mapSDGInput({
      file: {
        originalname: 'policy.pdf',
        mimetype: 'application/pdf',
        path: '/tmp/policy.pdf',
        size: 1024,
      } as Express.Multer.File,
      sourceLanguage: 'fr',
    });

    expect(mockedParseDocument).toHaveBeenCalledWith({
      file: expect.objectContaining({
        originalname: 'policy.pdf',
        mimetype: 'application/pdf',
      }),
    });
    expect(mockedParseTextNative).not.toHaveBeenCalled();
    expect(result.sourceType).toBe('file');
    expect(result.fileName).toBe('policy.pdf');
    expect(result.fileMimeType).toBe('application/pdf');
    expect(result.goals).toHaveLength(1);
  });

  it('uses native text parsing for text uploads and handles empty 204 responses', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    ) as jest.MockedFunction<typeof fetch>;

    global.fetch = fetchMock;
    mockedParseTextNative.mockResolvedValue({
      text: 'Local text file contents',
      bytes: 24,
      source: 'text',
    });

    const result = await mapSDGInput({
      file: {
        originalname: 'mapping.txt',
        mimetype: 'application/octet-stream',
        path: '/tmp/mapping.txt',
        size: 24,
      } as Express.Multer.File,
    });

    expect(mockedParseTextNative).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'mapping.txt',
        mimetype: 'text/plain',
      }),
    );
    expect(result.goals).toEqual([]);
    expect(result.message).toBe('Successful request with no results');
    expect(result.sourceType).toBe('file');
  });

  it('rejects unsupported SDG source languages', async () => {
    await expect(
      mapSDGInput({
        inputText: 'Climate adaptation',
        sourceLanguage: 'xx',
      }),
    ).rejects.toMatchObject({
      message: 'Unsupported SDG source language "xx".',
      statusCode: 400,
      code: 'bad_request',
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (sdg.ts not yet created)**

```bash
cd d:/TestTmp/LibreChatGopaV1/packages/api && npx jest sdg --no-coverage
```

Expected: FAIL — "Cannot find module './sdg'"

- [ ] **Step 3: Create `packages/api/src/files/sdg.ts` by copying from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/packages/api/src/files/sdg.ts" "d:/TestTmp/LibreChatGopaV1/packages/api/src/files/sdg.ts"
```

The file imports `documentParserMimeTypes`, `inferMimeType`, `sdgSourceLanguages`, `sdgSupportedUploadMimeTypes` from `librechat-data-provider` — all present in GopaV1. It also imports `parseDocument` from `./documents/crud` and `parseTextNative` from `./text` — both exist in GopaV1. No changes needed.

- [ ] **Step 4: Add barrel export to `packages/api/src/files/index.ts`**

Current last line: `export * from './text';`

Add after it:
```typescript
export * from './sdg';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd d:/TestTmp/LibreChatGopaV1/packages/api && npx jest sdg --no-coverage
```

Expected: 4 tests PASS (MIME inference, text mapping, document upload, 204 handling, unsupported language).

- [ ] **Step 6: Build packages/api**

```bash
cd d:/TestTmp/LibreChatGopaV1/packages/api && npm run build
```

Expected: no errors, `packages/api/dist/` updated.

- [ ] **Step 7: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add packages/api/src/files/sdg.ts packages/api/src/files/sdg.spec.ts packages/api/src/files/index.ts
git commit -m "feat(api): add SDG backend service with tests"
```

---

## Task 4: Express route for /api/sdg

**Files:**
- Create: `api/server/routes/sdg.js`
- Modify: `api/server/routes/index.js`
- Modify: `api/server/index.js`

- [ ] **Step 1: Create `api/server/routes/sdg.js`**

```javascript
const express = require('express');
const multer = require('multer');
const { logger } = require('@librechat/data-schemas');
const { checkBan, requireJwtAuth, createFileLimiters } = require('~/server/middleware');
const {
  mapSDGInput,
  SDG_UPLOAD_FILE_SIZE_LIMIT_BYTES,
  normalizeSDGUploadMimeType,
  isSDGUploadMimeType,
} = require('@librechat/api');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SDG_UPLOAD_FILE_SIZE_LIMIT_BYTES,
    files: 1,
    fields: 4,
  },
  fileFilter: (_req, file, callback) => {
    const normalizedMimeType = normalizeSDGUploadMimeType({
      fileName: file.originalname,
      mimeType: file.mimetype,
    });
    file.mimetype = normalizedMimeType;
    if (isSDGUploadMimeType(normalizedMimeType) === false) {
      callback(new Error(`Unsupported SDG file type: ${normalizedMimeType}`), false);
      return;
    }
    callback(null, true);
  },
});

const getSDGErrorStatusCode = (error) => {
  if (typeof error?.statusCode === 'number') {
    return error.statusCode;
  }
  return 500;
};

const getSDGErrorMessage = (error, fallbackMessage) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessage;
};

const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }
    if (error?.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        message: `SDG uploads are limited to ${Math.round(SDG_UPLOAD_FILE_SIZE_LIMIT_BYTES / (1024 * 1024))} MB.`,
      });
      return;
    }
    res.status(400).json({
      message: getSDGErrorMessage(error, 'Failed to process the uploaded SDG file.'),
    });
  });
};

router.use(requireJwtAuth);
router.use(checkBan);

const { fileUploadIpLimiter, fileUploadUserLimiter } = createFileLimiters();

router.post(
  '/',
  fileUploadIpLimiter,
  fileUploadUserLimiter,
  uploadSingleFile,
  async (req, res) => {
    const inputText = req.body?.inputText ?? null;
    const sourceLanguage = req.body?.sourceLanguage ?? null;

    try {
      const response = await mapSDGInput({
        file: req.file,
        inputText: typeof inputText === 'string' ? inputText : null,
        sourceLanguage: typeof sourceLanguage === 'string' ? sourceLanguage : null,
      });
      return res.status(200).json(response);
    } catch (error) {
      logger.error('[sdg] Failed to map SDG input', error);
      return res
        .status(getSDGErrorStatusCode(error))
        .json({ message: getSDGErrorMessage(error, 'The SDG analysis could not be completed.') });
    }
  },
);

module.exports = router;
```

- [ ] **Step 2: Add sdg to `api/server/routes/index.js`**

Add `const sdg = require('./sdg');` after the `const deepl = require('./deepl');` line:

```javascript
const deepl = require('./deepl');
const sdg = require('./sdg');
```

Add `sdg,` to the exports object after `deepl,`:

```javascript
  deepl,
  sdg,
```

- [ ] **Step 3: Register route in `api/server/index.js`**

Locate the line:
```javascript
  app.use('/api/deepl', routes.deepl);
```

Add after it:
```javascript
  app.use('/api/sdg', routes.sdg);
```

- [ ] **Step 4: Add `SDG_API_KEY` to `.env`**

Open `d:/TestTmp/LibreChatGopaV1/.env` and add:
```
SDG_API_KEY=your-jrc-api-key-here
```

The backend won't crash without a real key — `mapSDGInput` throws a `config` error with status 500 if `SDG_API_KEY` is absent, which is handled by the route's catch block.

- [ ] **Step 5: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add api/server/routes/sdg.js api/server/routes/index.js api/server/index.js
git commit -m "feat(api/server): add /api/sdg route with multer and JWT auth"
```

---

## Task 5: Copy static assets

**Files:**
- Create: `client/public/assets/sdg_32.png`
- Create: `client/public/assets/sdg_goals.png`
- Create: `client/public/assets/sdg_wheel_icon.png`

- [ ] **Step 1: Copy the three PNG files**

```bash
cp "d:/Developement2026/LibreChatGOPA/client/public/assets/sdg_32.png" "d:/TestTmp/LibreChatGopaV1/client/public/assets/sdg_32.png"
cp "d:/Developement2026/LibreChatGOPA/client/public/assets/sdg_goals.png" "d:/TestTmp/LibreChatGopaV1/client/public/assets/sdg_goals.png"
cp "d:/Developement2026/LibreChatGOPA/client/public/assets/sdg_wheel_icon.png" "d:/TestTmp/LibreChatGopaV1/client/public/assets/sdg_wheel_icon.png"
```

`sdg_32.png` is used as the header icon in `<PageHeaderCard iconSrc="/assets/sdg_32.png" .../>`.
`sdg_goals.png` is the decorative image in the header card.
`sdg_wheel_icon.png` is an alternate icon (not used by the component but included for completeness).

- [ ] **Step 2: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/public/assets/sdg_32.png client/public/assets/sdg_goals.png client/public/assets/sdg_wheel_icon.png
git commit -m "feat(client): add SDG static image assets"
```

---

## Task 6: Client data-provider SDG mutation hook

**Files:**
- Create: `client/src/data-provider/SDG/mutations.ts`
- Create: `client/src/data-provider/SDG/index.ts`
- Modify: `client/src/data-provider/index.ts`

- [ ] **Step 1: Create `client/src/data-provider/SDG/mutations.ts`**

```typescript
import { useMutation } from '@tanstack/react-query';
import { MutationKeys, dataService } from 'librechat-data-provider';
import type { UseMutationResult } from '@tanstack/react-query';
import type * as t from 'librechat-data-provider';

export const useMapSDGMutation = (
  options?: t.SDGMapOptions,
): UseMutationResult<t.SDGMapResponse, unknown, FormData, unknown> => {
  return useMutation([MutationKeys.mapSDG], {
    mutationFn: (formData: FormData) => dataService.mapSDG(formData),
    ...(options ?? {}),
  });
};
```

- [ ] **Step 2: Create `client/src/data-provider/SDG/index.ts`**

```typescript
export * from './mutations';
```

- [ ] **Step 3: Add barrel export to `client/src/data-provider/index.ts`**

Current last line: `export * from './DeepL';`

Add after it:
```typescript
export * from './SDG';
```

- [ ] **Step 4: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/data-provider/SDG/ client/src/data-provider/index.ts
git commit -m "feat(client): add SDG React Query mutation hook"
```

---

## Task 7: SDG metadata static file

**Files:**
- Create: `client/src/components/SDG/sdgMetadata.ts`

- [ ] **Step 1: Copy `sdgMetadata.ts` from GOPA**

```bash
mkdir -p "d:/TestTmp/LibreChatGopaV1/client/src/components/SDG"
cp "d:/Developement2026/LibreChatGOPA/client/src/components/SDG/sdgMetadata.ts" "d:/TestTmp/LibreChatGopaV1/client/src/components/SDG/sdgMetadata.ts"
```

This file exports one function: `getSDGNodeTitle(name: string): string | null`. It matches SDG goal names like `"SDG 1"` / `"Goal 1"` against `SDG_GOAL_TITLES` (17 entries) and target names like `"Target 1.1"` against `SDG_TARGET_TITLES` (~169 entries). No changes needed.

- [ ] **Step 2: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/components/SDG/sdgMetadata.ts
git commit -m "feat(client): add SDG metadata static lookup"
```

---

## Task 8: SDGMapper React component

**Files:**
- Create: `client/src/components/SDG/SDGMapper.tsx`

- [ ] **Step 1: Copy `SDGMapper.tsx` from GOPA**

```bash
cp "d:/Developement2026/LibreChatGOPA/client/src/components/SDG/SDGMapper.tsx" "d:/TestTmp/LibreChatGopaV1/client/src/components/SDG/SDGMapper.tsx"
```

No adaptation needed. The component uses:
- `SidebarReopenButton` from `~/components/Nav/SidebarReopenButton` — exists in GopaV1 (added during DeepL port)
- `PageHeaderCard` from `~/components/PageHeaderCard` — exists in GopaV1 (added during DeepL port)
- `useMapSDGMutation` from `~/data-provider` — wired in Task 6
- `useLocalize` from `~/hooks` — already in GopaV1
- Does NOT use `useOutletContext` — no adaptation needed

- [ ] **Step 2: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/components/SDG/SDGMapper.tsx
git commit -m "feat(client): add SDGMapper component"
```

---

## Task 9: i18n keys, route, and nav icon

**Files:**
- Modify: `client/src/locales/en/translation.json`
- Create: `client/src/routes/SDG.tsx`
- Modify: `client/src/routes/index.tsx`
- Modify: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`

- [ ] **Step 1: Add i18n keys to `client/src/locales/en/translation.json`**

Find the `com_ui_gopa_nav_document_translator` line. Add these keys nearby (maintaining JSON validity — add a trailing comma to the previous entry):

```json
"com_ui_gopa_nav_sdg_mapper": "SDG Mapper",
"com_ui_gopa_sdg_available_now_body": "The route, navigation entry, and user guidance are already available in the new LibreChatGOPA base.",
"com_ui_gopa_sdg_children": "Children",
"com_ui_gopa_sdg_clear_file": "Remove selected file",
"com_ui_gopa_sdg_description": "Map free text or uploaded documents to SDG goals with the server-side GOPA workflow.",
"com_ui_gopa_sdg_detected_goals": "Detected Goals",
"com_ui_gopa_sdg_detected_targets": "Detected Targets",
"com_ui_gopa_sdg_file_help": "Supported formats: {{formats}}.",
"com_ui_gopa_sdg_file_label": "Upload a document",
"com_ui_gopa_sdg_file_priority": "If a file is selected, the uploaded document is used as the source for the analysis.",
"com_ui_gopa_sdg_goal": "Goal",
"com_ui_gopa_sdg_goal_name": "Goal Name",
"com_ui_gopa_sdg_goals_alt": "Sustainable Development Goals wheel",
"com_ui_gopa_sdg_input_label": "Paste text to analyze",
"com_ui_gopa_sdg_input_placeholder": "Paste a project summary, policy note, proposal, or other content to map against the SDGs.",
"com_ui_gopa_sdg_missing_input": "Add some text or upload a supported document before starting the analysis.",
"com_ui_gopa_sdg_next_step_body": "The next migration step will reconnect document parsing and server-side SDG mapping.",
"com_ui_gopa_sdg_no_results": "No SDG matches were returned for the provided input.",
"com_ui_gopa_sdg_no_targets": "No linked targets",
"com_ui_gopa_sdg_occurrences": "Occurrences",
"com_ui_gopa_sdg_occurrences_value": "{{count}} hits",
"com_ui_gopa_sdg_processing": "Mapping SDGs...",
"com_ui_gopa_sdg_ready_now_paragraph": "This version runs the mapping workflow from the modern GOPA codebase, without the old browser-side document parsing.",
"com_ui_gopa_sdg_ready_now_title": "What is available now",
"com_ui_gopa_sdg_relevance": "Relevance",
"com_ui_gopa_sdg_request_failed": "The SDG analysis could not be completed.",
"com_ui_gopa_sdg_results_file": "Results for {{file}} using source language {{language}}.",
"com_ui_gopa_sdg_results_text": "Results for {{count}} characters of text using source language {{language}}.",
"com_ui_gopa_sdg_results_title": "SDG Results",
"com_ui_gopa_sdg_server_parsing": "PDF, DOCX, spreadsheet, and text parsing now happens on the server, which keeps the client simpler and the behavior more consistent.",
"com_ui_gopa_sdg_source_language": "Source Language",
"com_ui_gopa_sdg_source_language_help": "Choose the ISO language code that matches the source text or document.",
"com_ui_gopa_sdg_source_language_label": "Source language",
"com_ui_gopa_sdg_source_type": "Source Type",
"com_ui_gopa_sdg_source_type_file": "Uploaded file",
"com_ui_gopa_sdg_source_type_text": "Pasted text",
"com_ui_gopa_sdg_status_body": "This page marks the future SDG workspace while the backend and document flow are being ported.",
"com_ui_gopa_sdg_submit": "Run SDG Mapping",
"com_ui_gopa_sdg_supported_formats": "Recommended upload formats: {{formats}}.",
"com_ui_gopa_sdg_targets": "Targets",
"com_ui_gopa_sdg_text_help": "You can submit free text directly, or upload a supported file instead.",
"com_ui_title": "Title"
```

Note: `com_ui_title` does not exist in GopaV1's translation.json but is used by the SDGMapper results table header. Add it alongside the other new keys.

- [ ] **Step 2: Create `client/src/routes/SDG.tsx`**

```typescript
import SDGMapper from '~/components/SDG/SDGMapper';

export default function SDG() {
  return <SDGMapper />;
}
```

- [ ] **Step 3: Wire the route in `client/src/routes/index.tsx`**

Add import after `import DeepL from './DeepL';`:
```typescript
import SDG from './SDG';
```

Add route after the `deepl` route entry:
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

- [ ] **Step 4: Add SDG nav icon to `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`**

Update the lucide-react import to add `Target`:
```typescript
import { Languages, MessagesSquare, Target } from 'lucide-react';
```

Add the navigate callback after `handleDeepLNavigate`:
```typescript
  const handleSDGNavigate = useCallback(() => navigate('/sdg'), [navigate]);
```

Add `sdgLink` after `deeplLink` in the `links` useMemo:
```typescript
    const sdgLink: NavLink = {
      title: 'com_ui_gopa_nav_sdg_mapper',
      label: '',
      icon: Target,
      id: 'sdg',
      onClick: handleSDGNavigate,
    };

    return [conversationLink, ...sideNavLinks, deeplLink, sdgLink];
```

- [ ] **Step 5: Commit**

```bash
cd d:/TestTmp/LibreChatGopaV1
git add client/src/locales/en/translation.json client/src/routes/SDG.tsx client/src/routes/index.tsx client/src/hooks/Nav/useUnifiedSidebarLinks.ts
git commit -m "feat(client): wire SDG route, nav icon, and i18n keys"
```

---

## Task 10: Final build and verification

- [ ] **Step 1: Rebuild data-provider**

```bash
cd d:/TestTmp/LibreChatGopaV1
npm run build:data-provider
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 2: Rebuild packages/api**

```bash
cd d:/TestTmp/LibreChatGopaV1/packages/api && npm run build
```

Expected: exits 0, no errors.

- [ ] **Step 3: TypeScript check on client**

```bash
cd d:/TestTmp/LibreChatGopaV1
npx tsc --noEmit -p client/tsconfig.json 2>&1 | head -40
```

Expected: no errors in SDG-related files (`SDGMapper.tsx`, `SDG/mutations.ts`, `routes/SDG.tsx`, `useUnifiedSidebarLinks.ts`).

- [ ] **Step 4: Run packages/api SDG tests one final time**

```bash
cd d:/TestTmp/LibreChatGopaV1/packages/api && npx jest sdg --no-coverage
```

Expected: 4 tests PASS (unchanged from Task 3).

- [ ] **Step 5: Start backend and frontend**

Terminal 1:
```bash
cd d:/TestTmp/LibreChatGopaV1
npm run backend:dev
```

Terminal 2:
```bash
cd d:/TestTmp/LibreChatGopaV1
npm run frontend:dev
```

- [ ] **Step 6: Manual smoke test**

1. Open `http://localhost:3090`
2. Click the **Target** icon in the sidebar — should navigate to `/sdg`
3. Paste English text in the textarea (e.g. "Poverty reduction and clean water access are key sustainable development priorities.")
4. Select `EN` as source language
5. Click **Run SDG Mapping**
6. Verify: 5 summary cards appear (Detected Goals, Detected Targets, Occurrences, Source Type, Source Language)
7. Verify: goals table renders with goal names, title column, occurrences, relevance bar, and collapsible targets subtable
8. Try uploading a `.txt` file instead of pasting text — verify file upload path works
