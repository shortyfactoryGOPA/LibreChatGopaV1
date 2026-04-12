# SDG Mapper Implementation Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the SDG Mapper feature from `d:/Developement2026/LibreChatGOPA` into `d:/TestTmp/LibreChatGopaV1` on branch `feat/sdg-mapper`, following the same approach used for the DeepL Document Translator port.

**Approach:** Direct port — no new features, no DB layer (feature is fully stateless). Copy and adapt all files from GOPA, adjusting for GopaV1-specific patterns (Recoil store, unified sidebar nav, no `useOutletContext`).

**Source:** `d:/Developement2026/LibreChatGOPA`
**Target:** `d:/TestTmp/LibreChatGopaV1` on branch `feat/sdg-mapper`

---

## Architecture

The SDG Mapper is a stateless feature. The user submits text or a file with a source language, the server parses the document, calls the external JRC KnowSDGs API, normalises the response, and returns a hierarchical tree of matched SDG goals and targets. Nothing is persisted.

```
Browser form (text or file + source language)
  → POST /api/sdg  (multer, JWT auth, rate limiting)
    → mapSDGInput()  [packages/api/src/files/sdg.ts]
      → server-side document parsing
      → POST https://knowsdgs.jrc.ec.europa.eu/api/rest/mappingdata
        (requires SDG_API_KEY env var, sends input_text + source_language)
      → normalise nested/double-encoded JSON → SDGMapResponse
  ← JSON displayed as summary cards + hierarchical goals/targets table
     (goal and target titles enriched client-side from static sdgMetadata.ts)
```

**Environment variable required:** `SDG_API_KEY` in root `.env`.

---

## File Map

### packages/data-provider (shared types + service)

| File | Action | Responsibility |
|---|---|---|
| `src/types/sdg.ts` | Create | All shared SDG types and constants |
| `src/types/index.ts` | Modify | Add `export * from './sdg'` |
| `src/types.ts` | Modify | Add `export * from './types/sdg'` (rollup resolution) |
| `src/keys.ts` | Modify | Add `MutationKeys.mapSDG = 'mapSDG'` |
| `src/api-endpoints.ts` | Modify | Add `sdg()` arrow function endpoint |
| `src/data-service.ts` | Modify | Add `mapSDG(data, signal?)` function |
| `src/types/mutations.ts` | Modify | Add `SDGMapOptions` type |

### packages/api (backend service)

| File | Action | Responsibility |
|---|---|---|
| `src/files/sdg.ts` | Create | Full service: MIME normalisation, document parsing, JRC API call, response normalisation |
| `src/files/sdg.spec.ts` | Create | Jest tests mocking axios/fetch |
| `src/files/index.ts` | Modify | Add `export * from './sdg'` |

### api/server (Express routes — legacy JS)

| File | Action | Responsibility |
|---|---|---|
| `server/routes/sdg.js` | Create | Express router: JWT auth, multer, rate limiting, delegates to `mapSDGInput()` |
| `server/routes/index.js` | Modify | Add `const sdg = require('./sdg')` + export |
| `server/index.js` | Modify | Add `app.use('/api/sdg', routes.sdg)` |

### client (frontend)

| File | Action | Responsibility |
|---|---|---|
| `src/components/SDG/SDGMapper.tsx` | Create | Full-page UI: form, summary cards, hierarchical results table |
| `src/components/SDG/sdgMetadata.ts` | Create | Static lookup: all 17 SDG goal titles + all target titles |
| `src/data-provider/SDG/mutations.ts` | Create | `useMapSDGMutation` hook |
| `src/data-provider/SDG/index.ts` | Create | Barrel export |
| `src/data-provider/index.ts` | Modify | Add `export * from './SDG'` |
| `src/routes/SDG.tsx` | Create | Thin route wrapper rendering `<SDGMapper />` |
| `src/routes/index.tsx` | Modify | Add `/sdg` route under Root layout |
| `src/hooks/Nav/useUnifiedSidebarLinks.ts` | Modify | Add SDG nav icon (Target from lucide-react) with `navigate('/sdg')` |
| `src/locales/en/translation.json` | Modify | Add ~40 `com_ui_gopa_sdg_*` i18n keys |
| `public/assets/sdg_32.png` | Copy | Nav/header icon |
| `public/assets/sdg_goals.png` | Copy | Header card decorative image |
| `public/assets/sdg_wheel_icon.png` | Copy | Alternate wheel icon |

---

## Key Types (packages/data-provider/src/types/sdg.ts)

```typescript
export const sdgSourceLanguages = ['bg','cs','da','de','el','en','es','et',
  'fi','fr','ga','hr','hu','it','lt','lv','mt','nl','pl','pt','ro','sk','sl','sv'] as const;
export type SDGSourceLanguage = typeof sdgSourceLanguages[number];

export const sdgSupportedUploadExtensions = [
  '.pdf','.docx','.xls','.xlsx','.ods','.txt','.md','.csv','.json','.html','.htm','.xml'
] as const;

export type SDGSourceType = 'file' | 'text';

export type SDGMappingNode = {
  id: string;
  type: string;
  name: string;
  occurrences: number;
  relevance: number;
  children: SDGMappingNode[];
};

export type SDGMapResponse = {
  generatedAt: string;
  message: string;
  sourceType: SDGSourceType;
  sourceLanguage: string;
  fileName: string | null;
  fileMimeType: string | null;
  textLength: number | null;
  totalGoals: number;
  totalTargets: number;
  totalOccurrences: number;
  goals: SDGMappingNode[];
};
```

---

## Backend Service Constants (packages/api/src/files/sdg.ts)

- `MAX_SDG_INPUT_TEXT_LENGTH = 3_528_000` characters
- `SDG_UPLOAD_FILE_SIZE_LIMIT_BYTES = 15 * 1024 * 1024` (15 MB)
- JRC API URL: `https://knowsdgs.jrc.ec.europa.eu/api/rest/mappingdata`
- Auth header: `X-Api-Key: process.env.SDG_API_KEY`
- Payload: `{ input_text, indicators: 'False', source_language }`

---

## GopaV1-Specific Adaptations

Same rules as the DeepL port:

1. **Sidebar nav** — add SDG link to `useUnifiedSidebarLinks.ts` using `useNavigate` + `useCallback`, not GOPA's `QuickLinks` pattern.
2. **SidebarReopenButton** — already exists from DeepL port, reuse as-is.
3. **PageHeaderCard / AssetIcon** — already exist from DeepL port, reuse as-is.
4. **No `useOutletContext`** — not available in GopaV1.
5. **Double export for rollup** — new types must be exported from both `types/index.ts` AND `types.ts`.

---

## Rebuild Requirements

After completing all changes:
- `npm run build:data-provider` — before testing frontend
- `cd packages/api && npm run build` — before testing backend
- Restart backend dev server

---

## Testing

- `packages/api` tests: `cd packages/api && npx jest sdg`
- Frontend TypeScript: `npx tsc --noEmit -p client/tsconfig.json` — verify no errors in new files
- Manual: open `/sdg`, paste text in English, select source language EN, submit, verify goals table renders

---

## Out of Scope

- No DB layer — feature is stateless by design
- No analytics/job tracking (unlike DeepL)
- No improvements to the GOPA UI
- No admin analytics page for SDG
