# LibreChat GopaV1 — Notes de développement

## Démarrer le projet

Deux terminaux sont nécessaires :

```bash
# Terminal 1 — Backend (Express, port 3080)
npm run backend:dev

# Terminal 2 — Frontend (Vite HMR, port 3090)
npm run frontend:dev
```

Accès : `http://localhost:3090/`

---

## Règle critique : rebuilder après chaque modification de package

| Package modifié | Commande de rebuild | Consommateur |
|---|---|---|
| `packages/api` | `cd packages/api && npm run build` | Backend Express (`require('@librechat/api')`) |
| `packages/data-provider` | `npm run build:data-provider` | Frontend Vite (`import from 'librechat-data-provider'`) |
| `packages/data-schemas` | `cd packages/data-schemas && npm run build` | Backend Express (`require('@librechat/data-schemas')`) |
| `packages/client` | `cd packages/client && npm run build` | Frontend Vite (`import from '@librechat/client'`) |

**Redémarre toujours le backend après avoir rebuild `packages/api` ou `packages/data-schemas`.**

Rebuild tout en une fois :
```bash
npm run build
```

---

## Commandes utiles

```bash
# --- Développement ---
npm run backend:dev          # Backend avec file watching (port 3080)
npm run frontend:dev         # Frontend Vite HMR (port 3090)

# --- Build ---
npm run build                # Build tout (parallel, avec cache Turborepo)
npm run build:data-provider  # Rebuild packages/data-provider uniquement
npm run backend              # Backend sans watch (production)
npm run frontend             # Frontend build de production

# --- Installation ---
npm run smart-reinstall      # Install deps (si lockfile changé) + build
npm run reinstall            # Réinstallation complète (wipe node_modules)

# --- Rebuild packages individuels ---
cd packages/api && npm run build
cd packages/data-schemas && npm run build
cd packages/client && npm run build
```

---

## Structure du monorepo

```
/api                      Backend Express (JS legacy) — minimiser les changements ici
/packages/api             Nouveau code backend TypeScript
/packages/data-schemas    Modèles MongoDB / Mongoose (partagés backend)
/packages/data-provider   Types et service API partagés frontend + backend
/packages/client          Utilitaires frontend partagés
/client                   SPA React (frontend)
```

---

## Ajouter une nouvelle feature (checklist)

1. **Types partagés** → `packages/data-provider/src/types/`
   - Exporter depuis `types/index.ts` ET `types.ts` (double export requis pour rollup)
2. **Clés React Query** → `packages/data-provider/src/keys.ts`
3. **Endpoints API** → `packages/data-provider/src/api-endpoints.ts` (fonctions fléchées, pas de `const` top-level)
4. **Service frontend** → `packages/data-provider/src/data-service.ts`
5. **Rebuild data-provider** → `npm run build:data-provider`
6. **Logique backend** → `packages/api/src/`
7. **Rebuild packages/api** → `cd packages/api && npm run build`
8. **Route Express** → `api/server/routes/<feature>.js` + wirer dans `routes/index.js` et `server/index.js`
9. **Hooks React Query** → `client/src/data-provider/<Feature>/queries.ts` + `mutations.ts` + `index.ts`
10. **Exporter les hooks** → `client/src/data-provider/index.ts`
11. **Composant React** → `client/src/components/<Feature>/`
12. **Route frontend** → `client/src/routes/<Feature>.tsx` + wirer dans `routes/index.tsx`
13. **Clé i18n** → `client/src/locales/en/translation.json` (préfixe sémantique : `com_ui_`, etc.)
14. **Navigation** → `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` si icône sidebar

---

## Notes spécifiques GopaV1

- **Sidebar state** : utiliser `useRecoilValue(store.sidebarExpanded)` — pas `useOutletContext` (n'existe pas dans GopaV1)
- **rollup-plugin-typescript2** : `import type * as t from './types'` se résout vers `src/types.ts` (fichier plat), PAS `src/types/index.ts` → toujours double-exporter les nouveaux types dans `types.ts`
- **Variables d'environnement** : fichier `.env` à la racine du projet

---

## Docker — Services locaux

En mode dev local, le backend tourne avec `npm run backend:dev` mais certains services dépendent de Docker.

### Démarrer les services Docker nécessaires

```bash
# RAG API + base vectorielle (requis pour l'upload de fichiers)
docker-compose up rag_api vectordb -d

# Tous les services Docker (MongoDB, Meilisearch, RAG, vectordb)
docker-compose up mongodb meilisearch rag_api vectordb -d
```

### Commandes Docker utiles

```bash
# Voir les containers qui tournent
docker ps

# Voir les logs d'un service
docker logs rag_api -f
docker logs chat-mongodb -f

# Arrêter tous les services Docker du projet
docker-compose down

# Rebuild et redémarrer un service après changement de config
docker-compose up rag_api -d --build

# Recharger nginx sans downtime (prod)
docker exec LibreChat-NGINX nginx -s reload

# Vérifier la config nginx
docker exec LibreChat-NGINX nginx -t
```

### Ports

| Service | Port local |
|---|---|
| Backend Express | 3080 |
| Frontend Vite (dev) | 3090 |
| RAG API | 8001 |
| MongoDB | 27017 |
| Meilisearch | 7700 |
| pgvector | 5432 |

---

## Tests

```bash
# data-schemas
cd packages/data-schemas && npx jest <pattern>

# packages/api
cd packages/api && npx jest <pattern>

# Frontend
cd client && npx jest <pattern>
```

Philosophie : vraie logique, pas de mocks — utiliser `mongodb-memory-server` pour MongoDB.
