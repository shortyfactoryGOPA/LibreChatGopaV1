# Native Code Interpreter (Azure Responses API) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter le support du `code_interpreter` natif d'Azure/OpenAI via la Responses API, en suivant exactement le même pattern que `web_search` déjà en place.

**Architecture:** Le paramètre `code_interpreter: true` est extrait dans `llm.ts` et converti en outil natif `{ type: 'code_interpreter', container: { type: 'auto' } }` envoyé à la Responses API. Le flag traverse la même chaîne que `web_search` : preset → conversation → modelOptions → llm.ts → tool binding.

**Tech Stack:** TypeScript, Zod (validation schémas), Jest (tests), React (paramètre UI dans panel settings)

---

## Fichiers modifiés (aucun nouveau fichier)

| Fichier | Rôle de la modification |
|---|---|
| `packages/api/src/endpoints/openai/llm.ts` | Extraire `code_interpreter`, construire l'outil natif |
| `packages/api/src/endpoints/openai/llm.spec.ts` | Tests Jest pour le nouveau comportement |
| `packages/data-provider/src/types.ts` | Ajouter `code_interpreter?: boolean` dans `TEphemeralAgent` |
| `packages/data-provider/src/schemas.ts` | Ajouter `code_interpreter` dans `tConversationSchema` et `anthropicSettings` defaults |
| `packages/data-schemas/src/schema/preset.ts` | Ajouter `code_interpreter?: boolean` dans l'interface `IPreset` |
| `packages/data-provider/src/parameterSettings.ts` | Exposer le toggle UI dans les panels OpenAI/Azure |
| `client/src/locales/en/translation.json` | Clés i18n pour le label et la description |
| `librechat.yaml` | Activer dans les presets `gpt-5.2` et `gpt-5.4` |

---

## Task 1 : Tests d'abord — `llm.spec.ts`

**Fichiers :**
- Modifier : `packages/api/src/endpoints/openai/llm.spec.ts`

- [ ] **Étape 1.1 : Ajouter le describe block "Code Interpreter Functionality"**

Ouvrir `packages/api/src/endpoints/openai/llm.spec.ts`. Trouver la fin du bloc `describe('Web Search Functionality', ...)` (actuellement à la ligne ~416, juste avant `describe('GPT-5 max_tokens Handling', ...)`). Insérer le bloc suivant **entre** ces deux describes :

```typescript
  describe('Code Interpreter Functionality', () => {
    it('should enable native code interpreter with Responses API', () => {
      const result = getOpenAILLMConfig({
        apiKey: 'test-api-key',
        streaming: true,
        modelOptions: {
          model: 'gpt-5.2',
          code_interpreter: true,
        },
      });

      expect(result.llmConfig).toHaveProperty('useResponsesApi', true);
      expect(result.tools).toContainEqual({
        type: 'code_interpreter',
        container: { type: 'auto' },
      });
    });

    it('should combine code interpreter and web search as separate tools', () => {
      const result = getOpenAILLMConfig({
        apiKey: 'test-api-key',
        streaming: true,
        modelOptions: {
          model: 'gpt-5.2',
          code_interpreter: true,
          web_search: true,
        },
      });

      expect(result.llmConfig).toHaveProperty('useResponsesApi', true);
      expect(result.tools).toContainEqual({ type: 'web_search' });
      expect(result.tools).toContainEqual({
        type: 'code_interpreter',
        container: { type: 'auto' },
      });
      expect(result.tools).toHaveLength(2);
    });

    it('should disable code interpreter via dropParams', () => {
      const result = getOpenAILLMConfig({
        apiKey: 'test-api-key',
        streaming: true,
        modelOptions: {
          model: 'gpt-5.2',
          code_interpreter: true,
        },
        dropParams: ['code_interpreter'],
      });

      expect(result.tools).not.toContainEqual({
        type: 'code_interpreter',
        container: { type: 'auto' },
      });
    });

    it('should not set useResponsesApi when code_interpreter is false', () => {
      const result = getOpenAILLMConfig({
        apiKey: 'test-api-key',
        streaming: true,
        modelOptions: {
          model: 'gpt-5.2',
          code_interpreter: false,
        },
      });

      expect(result.tools).not.toContainEqual({
        type: 'code_interpreter',
        container: { type: 'auto' },
      });
      // useResponsesApi should not be set solely because of code_interpreter: false
      expect(result.llmConfig.useResponsesApi).toBeFalsy();
    });
  });
```

- [ ] **Étape 1.2 : Vérifier que les tests échouent**

```bash
cd packages/api && npx jest src/endpoints/openai/llm.spec.ts --no-coverage -t "Code Interpreter"
```

Résultat attendu : **4 tests FAIL** avec des erreurs du type `Expected: true / Received: undefined` ou `Expected array to contain...`. C'est normal — l'implémentation n'existe pas encore.

---

## Task 2 : Implémentation backend — `llm.ts`

**Fichiers :**
- Modifier : `packages/api/src/endpoints/openai/llm.ts`

- [ ] **Étape 2.1 : Extraire `code_interpreter` des modelOptions**

Trouver la destructuration à la ligne ~148 :

```typescript
  const {
    reasoning_effort,
    reasoning_summary,
    verbosity,
    web_search,
    frequency_penalty,
    presence_penalty,
    ...modelOptions
  } = cleanedModelOptions;
```

La remplacer par :

```typescript
  const {
    reasoning_effort,
    reasoning_summary,
    verbosity,
    web_search,
    code_interpreter,
    frequency_penalty,
    presence_penalty,
    ...modelOptions
  } = cleanedModelOptions;
```

- [ ] **Étape 2.2 : Initialiser `enableCodeInterpreter`**

Juste après la ligne `let enableWebSearch = web_search;` (ligne ~181), ajouter :

```typescript
  let enableCodeInterpreter = code_interpreter;
```

- [ ] **Étape 2.3 : Ignorer `code_interpreter` dans la boucle `defaultParams`**

Trouver dans la boucle `defaultParams` le bloc qui gère `web_search` (ligne ~186) :

```typescript
      /** Handle web_search separately - don't add to config */
      if (key === 'web_search') {
        if (enableWebSearch === undefined && typeof value === 'boolean') {
          enableWebSearch = value;
        }
        continue;
      }
```

Ajouter juste **après** ce bloc (avant le `if (knownOpenAIParams.has(key))`) :

```typescript
      /** Handle code_interpreter separately - don't add to config */
      if (key === 'code_interpreter') {
        if (enableCodeInterpreter === undefined && typeof value === 'boolean') {
          enableCodeInterpreter = value;
        }
        continue;
      }
```

- [ ] **Étape 2.4 : Ignorer `code_interpreter` dans la boucle `addParams`**

Trouver dans la boucle `addParams` le bloc qui gère `web_search` (ligne ~209) :

```typescript
      /** Handle web_search directly here instead of adding to modelKwargs or llmConfig */
      if (key === 'web_search') {
        if (typeof value === 'boolean') {
          enableWebSearch = value;
        }
        continue;
      }
```

Ajouter juste **après** ce bloc :

```typescript
      /** Handle code_interpreter directly here instead of adding to modelKwargs or llmConfig */
      if (key === 'code_interpreter') {
        if (typeof value === 'boolean') {
          enableCodeInterpreter = value;
        }
        continue;
      }
```

- [ ] **Étape 2.5 : Gérer `dropParams` et construire l'outil natif**

Trouver le bloc `dropParams` / tool push pour `web_search` (ligne ~262) :

```typescript
  /** Check if web_search should be disabled via dropParams */
  if (dropParams && dropParams.includes('web_search')) {
    enableWebSearch = false;
  }

  if (useOpenRouter && enableWebSearch) {
    /** OpenRouter expects web search as a plugins parameter */
    modelKwargs.plugins = [{ id: 'web' }];
    hasModelKwargs = true;
  } else if (enableWebSearch) {
    /** Standard OpenAI web search uses tools API */
    llmConfig.useResponsesApi = true;
    tools.push({ type: 'web_search' });
  }
```

Ajouter juste **après** ce bloc :

```typescript
  /** Check if code_interpreter should be disabled via dropParams */
  if (dropParams && dropParams.includes('code_interpreter')) {
    enableCodeInterpreter = false;
  }

  if (enableCodeInterpreter) {
    /** Native Azure/OpenAI code interpreter via Responses API */
    llmConfig.useResponsesApi = true;
    tools.push({ type: 'code_interpreter', container: { type: 'auto' } });
  }
```

- [ ] **Étape 2.6 : Vérifier que les tests passent**

```bash
cd packages/api && npx jest src/endpoints/openai/llm.spec.ts --no-coverage -t "Code Interpreter"
```

Résultat attendu : **4 tests PASS**.

- [ ] **Étape 2.7 : Vérifier que les tests existants ne régressent pas**

```bash
cd packages/api && npx jest src/endpoints/openai/llm.spec.ts --no-coverage
```

Résultat attendu : **tous les tests PASS** (aucune régression).

- [ ] **Étape 2.8 : Commit**

```bash
git add packages/api/src/endpoints/openai/llm.ts packages/api/src/endpoints/openai/llm.spec.ts
git commit -m "feat: add native code_interpreter support via Azure Responses API

Follows the same pattern as web_search: extract from modelOptions,
handle in defaultParams/addParams/dropParams, push native tool
{ type: 'code_interpreter', container: { type: 'auto' } } to Responses API."
```

---

## Task 3 : Types et schémas

**Fichiers :**
- Modifier : `packages/data-provider/src/types.ts`
- Modifier : `packages/data-provider/src/schemas.ts`
- Modifier : `packages/data-schemas/src/schema/preset.ts`

- [ ] **Étape 3.1 : Ajouter dans `types.ts`**

Ouvrir `packages/data-provider/src/types.ts`. Trouver le type `TEphemeralAgent` (ligne ~98) :

```typescript
export type TEphemeralAgent = {
  mcp?: string[];
  web_search?: boolean;
  file_search?: boolean;
  execute_code?: boolean;
  artifacts?: string;
};
```

Remplacer par :

```typescript
export type TEphemeralAgent = {
  mcp?: string[];
  web_search?: boolean;
  code_interpreter?: boolean;
  file_search?: boolean;
  execute_code?: boolean;
  artifacts?: string;
};
```

- [ ] **Étape 3.2 : Ajouter dans `schemas.ts` — tConversationSchema**

Ouvrir `packages/data-provider/src/schemas.ts`. Trouver la ligne (environ 776) :

```typescript
  /* OpenAI Responses API / Anthropic API / Google API */
  web_search: z.boolean().optional(),
```

Remplacer par :

```typescript
  /* OpenAI Responses API / Anthropic API / Google API */
  web_search: z.boolean().optional(),
  /* OpenAI Responses API — native code interpreter */
  code_interpreter: z.boolean().optional(),
```

- [ ] **Étape 3.3 : Ajouter la valeur default dans `schemas.ts` — anthropicSettings**

Trouver dans `schemas.ts` la section `anthropicSettings` avec les defaults (environ ligne 497) :

```typescript
  web_search: {
    default: false as const,
  },
};
```

Remplacer par :

```typescript
  web_search: {
    default: false as const,
  },
  code_interpreter: {
    default: false as const,
  },
};
```

- [ ] **Étape 3.4 : Ajouter dans `preset.ts` (data-schemas)**

Ouvrir `packages/data-schemas/src/schema/preset.ts`. Trouver (environ ligne 53) :

```typescript
  web_search?: boolean;
  disableStreaming?: boolean;
```

Remplacer par :

```typescript
  web_search?: boolean;
  code_interpreter?: boolean;
  disableStreaming?: boolean;
```

- [ ] **Étape 3.5 : Build data-provider pour vérifier aucune erreur TypeScript**

```bash
cd /d/TestTmp/LibreChatGopaV1 && npm run build:data-provider 2>&1 | tail -20
```

Résultat attendu : build sans erreur TypeScript.

- [ ] **Étape 3.6 : Commit**

```bash
git add packages/data-provider/src/types.ts packages/data-provider/src/schemas.ts packages/data-schemas/src/schema/preset.ts
git commit -m "feat: expose code_interpreter in types, schemas and preset"
```

---

## Task 4 : Paramètre UI

**Fichiers :**
- Modifier : `packages/data-provider/src/parameterSettings.ts`
- Modifier : `client/src/locales/en/translation.json`

- [ ] **Étape 4.1 : Ajouter les clés i18n**

Ouvrir `client/src/locales/en/translation.json`. Trouver la ligne ~308 :

```json
  "com_endpoint_openai_use_web_search": "Enable web search functionality using OpenAI's built-in search capabilities. This allows the model to search the web for up-to-date information and provide more accurate, current responses.",
```

Ajouter la ligne suivante juste après :

```json
  "com_endpoint_openai_use_code_interpreter": "Enable Azure/OpenAI's native code interpreter. The model can write and execute code, perform data analysis, generate files, and solve complex computational problems.",
```

Puis trouver la ligne ~1540 :

```json
  "com_ui_web_search": "Web Search",
```

Ajouter juste avant :

```json
  "com_ui_code_interpreter": "Code Interpreter",
```

- [ ] **Étape 4.2 : Ajouter le paramètre dans `openAIParams`**

Ouvrir `packages/data-provider/src/parameterSettings.ts`. Trouver le bloc `web_search` dans `openAIParams` (environ ligne 271) :

```typescript
  web_search: {
    key: 'web_search',
    label: 'com_ui_web_search',
    labelCode: true,
    description: 'com_endpoint_openai_use_web_search',
    descriptionCode: true,
    type: 'boolean',
    default: false,
    component: 'switch',
    optionType: 'model',
    showDefault: false,
    columnSpan: 2,
  },
```

Ajouter juste **après** ce bloc :

```typescript
  code_interpreter: {
    key: 'code_interpreter',
    label: 'com_ui_code_interpreter',
    labelCode: true,
    description: 'com_endpoint_openai_use_code_interpreter',
    descriptionCode: true,
    type: 'boolean',
    default: false,
    component: 'switch',
    optionType: 'model',
    showDefault: false,
    columnSpan: 2,
  },
```

- [ ] **Étape 4.3 : Ajouter dans la liste `openAI` (panel standard)**

Trouver la liste `openAI` (environ ligne 753) :

```typescript
  openAIParams.web_search,
  openAIParams.reasoning_effort,
```

Remplacer par :

```typescript
  openAIParams.web_search,
  openAIParams.code_interpreter,
  openAIParams.reasoning_effort,
```

- [ ] **Étape 4.4 : Ajouter dans `openAICol2` (panel colonnes Azure/OpenAI)**

Trouver dans `openAICol2` (environ ligne 793) :

```typescript
  openAIParams.useResponsesApi,
  openAIParams.web_search,
  openAIParams.disableStreaming,
```

Remplacer par :

```typescript
  openAIParams.useResponsesApi,
  openAIParams.web_search,
  openAIParams.code_interpreter,
  openAIParams.disableStreaming,
```

- [ ] **Étape 4.5 : Build data-provider**

```bash
cd /d/TestTmp/LibreChatGopaV1 && npm run build:data-provider 2>&1 | tail -20
```

Résultat attendu : build sans erreur.

- [ ] **Étape 4.6 : Commit**

```bash
git add packages/data-provider/src/parameterSettings.ts client/src/locales/en/translation.json
git commit -m "feat: add code_interpreter toggle to OpenAI/Azure settings panel"
```

---

## Task 5 : Activation dans `librechat.yaml`

**Fichiers :**
- Modifier : `librechat.yaml`

- [ ] **Étape 5.1 : Mettre à jour les deux modelSpecs**

Ouvrir `librechat.yaml`. Trouver les deux modelSpecs existants et les remplacer :

**Avant :**
```yaml
modelSpecs:
  list:
    - name: "azure-gpt-5-2"
      label: "GPT-5.2"
      description: "Web Search + Code Interpreter"
      group: "Azure OpenAI"
      groupIcon: "azureOpenAI"
      webSearch: true
      executeCode: true
      preset:
        endpoint: "azureOpenAI"
        model: "gpt-5.2"
        useResponsesApi: true
        temperature: 0.3

    - name: "azure-gpt-5-4"
      label: "GPT-5.4"
      description: "Web Search + Code Interpreter"
      group: "Azure OpenAI"
      webSearch: true
      executeCode: true
      preset:
        endpoint: "azureOpenAI"
        model: "gpt-5.4"
        useResponsesApi: true
        temperature: 0.3
```

**Après :**
```yaml
modelSpecs:
  list:
    - name: "azure-gpt-5-2"
      label: "GPT-5.2"
      description: "Web Search + Native Code Interpreter"
      group: "Azure OpenAI"
      groupIcon: "azureOpenAI"
      webSearch: true
      preset:
        endpoint: "azureOpenAI"
        model: "gpt-5.2"
        useResponsesApi: true
        web_search: true
        code_interpreter: true
        temperature: 0.3

    - name: "azure-gpt-5-4"
      label: "GPT-5.4"
      description: "Web Search + Native Code Interpreter"
      group: "Azure OpenAI"
      webSearch: true
      preset:
        endpoint: "azureOpenAI"
        model: "gpt-5.4"
        useResponsesApi: true
        web_search: true
        code_interpreter: true
        temperature: 0.3
```

> **Note :** `executeCode: true` est supprimé (il activait l'outil LibreChat tiers non configuré). `web_search: true` et `code_interpreter: true` dans le preset activent les outils natifs Azure via `llm.ts`.

- [ ] **Étape 5.2 : Commit**

```bash
git add librechat.yaml
git commit -m "feat: activate native web_search + code_interpreter in GPT-5.2/5.4 presets"
```

---

## Task 6 : Vérification finale

- [ ] **Étape 6.1 : Run tous les tests du package `api`**

```bash
cd packages/api && npx jest src/endpoints/openai/ --no-coverage
```

Résultat attendu : tous PASS.

- [ ] **Étape 6.2 : Build complet**

```bash
cd /d/TestTmp/LibreChatGopaV1 && npm run build 2>&1 | tail -30
```

Résultat attendu : build sans erreur TypeScript.

- [ ] **Étape 6.3 : Redémarrer le backend et tester manuellement**

```bash
npm run backend:dev
```

Ouvrir l'app, sélectionner GPT-5.2 ou GPT-5.4, demander :
> "Génère un fichier Excel avec 3 onglets : Clients, Produits, Commandes. Mets 5 lignes fictives dans chaque onglet."

Comportement attendu :
1. Le modèle exécute du code via l'outil `code_interpreter` natif Azure
2. Un fichier `.xlsx` est généré côté Azure
3. Un lien de téléchargement apparaît dans la réponse (URL réelle, pas `%5E1%5E`)
4. Le fichier est téléchargeable

---

## Résumé des changements

| Fichier | Type | Lignes approx. |
|---|---|---|
| `packages/api/src/endpoints/openai/llm.ts` | +16 lignes | ~148, ~182, ~191, ~212, ~275 |
| `packages/api/src/endpoints/openai/llm.spec.ts` | +55 lignes | après ligne 416 |
| `packages/data-provider/src/types.ts` | +1 ligne | ~100 |
| `packages/data-provider/src/schemas.ts` | +3 lignes | ~776, ~499 |
| `packages/data-schemas/src/schema/preset.ts` | +1 ligne | ~54 |
| `packages/data-provider/src/parameterSettings.ts` | +12 lignes | ~283, ~765, ~794 |
| `client/src/locales/en/translation.json` | +2 lignes | ~308, ~1540 |
| `librechat.yaml` | ~8 lignes modifiées | ~407 |
