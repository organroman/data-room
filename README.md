# Data Room

A Google Drive–style Data Room MVP: create data rooms, nest folders, upload/preview/rename/delete PDF files, star items, and recover deleted items from Trash.

Built as a take-home evaluation. Full-stack: React SPA + Express API + Postgres + Vercel Blob, deployed as a single Vercel project.

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, react-router, TanStack Query, React Hook Form + Zod
- **Backend**: Express, running as a single Vercel serverless function
- **Database**: Postgres via Drizzle ORM (Vercel Postgres/Neon in production, local Postgres in dev)
- **File storage**: Vercel Blob (public access)
- **PDF preview**: react-pdf (pdf.js)

## Getting started

### Prerequisites

- Node.js 20+
- A local Postgres server (e.g. [Postgres.app](https://postgresapp.com/) on macOS, or any Postgres install)
- A [Vercel](https://vercel.com) account (for a Blob store — see below)
- The [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`

### 1. Install dependencies

```bash
npm install
```

### 2. Create a local database

```bash
createdb data_room
# or: psql -c "CREATE DATABASE data_room;"
```

### 3. Set up a Vercel Blob store

File uploads require a real Vercel Blob store — there's no local/offline substitute.

1. Run `vercel link` in the project root to link this repo to a Vercel project (creates one if you don't have one yet).
2. In the [Vercel dashboard](https://vercel.com/dashboard), go to your project → **Storage** → **Create Database** → **Blob**.
   - **Access mode must be Public.** This app stores each file's blob URL directly in the database and uses it as a plain, unauthenticated URL for preview/download — a private store (which requires a token to *read*, not just write) isn't compatible with that and can't be converted after creation.
3. Connect the store to your project (Storage tab → Connect), then go to **Project Settings → Environment Variables** and copy the `BLOB_READ_WRITE_TOKEN` value that appears there.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:
- `POSTGRES_URL` — your local Postgres connection string (e.g. `postgres://yourusername@localhost:5432/data_room`)
- `BLOB_READ_WRITE_TOKEN` — the token from step 3
- `API_PORT` — only used by the fast local dev script below; default is fine

### 5. Push the database schema

```bash
npm run db:push
```

### 6. Run it

Two ways to run locally:

```bash
npm run dev        # vercel dev — mirrors production routing exactly (single command, single port)
npm run dev:fast    # Vite + Express run separately, proxied together — faster reload loop while developing
```

Either way, the app is at `http://localhost:3000` (`vercel dev`) or `http://localhost:5173` (`dev:fast`).

### Other useful scripts

```bash
npm run typecheck   # tsc -b across the whole repo (frontend + api + shared)
npm test            # integration tests against the local Postgres database (see below)
npm run db:studio   # Drizzle Studio, a GUI for the local database
npm run build       # production build (what Vercel runs on deploy)
```

### Tests

Manual end-to-end QA was the primary verification method throughout (this is a UI-heavy app; most bugs were interaction/state bugs a unit test wouldn't catch). On top of that, there's a small integration test suite (`api/services/dataRoomFlows.test.ts`) covering the two pieces of server-side logic that are easy to get subtly wrong and hard to eyeball-verify:

- **Recursive folder soft-delete/restore** — deleting a folder must cascade `deleted_at` to every descendant, but Trash should only show the *root* of the deletion, not every nested file and folder separately; restoring the root must bring the whole subtree back.
- **Duplicate file name resolution** — uploading a file with a colliding name should auto-suffix (`Summary.pdf` → `Summary (1).pdf` → `Summary (2).pdf`) rather than reject.

These run against the real local Postgres database (no mocking — the behavior under test is a recursive tree query and a database uniqueness constraint, neither of which a mocked `db` would meaningfully exercise) but never touch Vercel Blob, so `BLOB_READ_WRITE_TOKEN` doesn't need to be configured just to run `npm test`.

## Project structure

```
/api        Express backend (routes → controllers → services → db), deployed as one Vercel function
/frontend   React SPA (Vite root), organized by Feature-Sliced Design:
              src/app        — App shell composition, providers, router
              src/pages      — route-level page compositions (dashboard, dataroom, trash, starred, ...)
              src/widgets    — page-independent layout blocks (app shell, sidebar)
              src/features   — one slice per resource (dataroom-actions, folder-actions, file-actions,
                                upload-file, star-item, trash-actions), each holding its own api/ + model/ + ui/
              src/shared     — shadcn primitives (ui/), reusable composed components (components/),
                                generic hooks, the API client, formatting helpers
/shared     Code shared between frontend and backend: TypeScript types + Zod validation schemas
            (single source of truth — the same schema validates a form client-side via zodResolver
            and a request body server-side)
```

## Design decisions

### Full-stack build, not the frontend-only mock the task also allows

The task explicitly permits mocking all CRUD in-browser (IndexedDB, localStorage, etc.) with no real backend. We chose to build a real Express + Postgres + Blob backend instead, to demonstrate full-stack range for this role. The tradeoff: less time available for UI polish within the same budget, which is why some scope (drag-and-drop upload, full-content search) was deliberately cut — see "Not implemented" below.

### Postgres over Mongo

Folders and files form a tree with real referential-integrity needs: a folder's parent must exist, deleting a folder must cascade to its descendants, and names must be unique among live siblings. Postgres gives us:
- Recursive CTEs for tree operations (descendant lookup for cascading soft-delete, breadcrumb ancestor walks) — see `api/services/folders.service.ts` and `api/services/datarooms.service.ts`.
- Partial unique indexes to enforce "no duplicate name among live (non-deleted) siblings" at the database layer, not just in application code.

Mongo's document model would fight this: either denormalize the whole path into every document (painful to keep consistent under renames/moves) or do the recursion in application code.

### Files live in Blob storage, never in Postgres

Only file *metadata* (name, size, mime type, blob URL) is stored in the database; the PDF bytes go straight to Vercel Blob via a direct browser-to-blob upload (the backend only issues a short-lived client upload token — see `api/lib/blob.ts` and `POST /api/files/upload-url`). This keeps the database small and fast, and avoids proxying large file bodies through a serverless function (which has a request-body size ceiling well under our 100MB file limit).

### Duplicate names: auto-suffix on upload, hard reject on rename

- **Uploading** a file with a name that collides with a live sibling gets auto-suffixed (`Summary.pdf` → `Summary (1).pdf`), with the UI surfacing a notice that it happened. This matches how most consumer file managers behave for background uploads, where blocking on every collision would be disruptive.
- **Renaming** a folder or file to a colliding name is rejected inline (409 + an error shown right in the rename field), since renaming is a single deliberate action the user is actively watching — better to let them pick a different name immediately than silently rename it out from under them.

Both are enforced by the same database partial unique index (`folders_unique_name_per_parent` / `files_unique_name_per_parent`); the upload path resolves the name and retries on conflict (`api/services/files.service.ts`), the rename path just surfaces the conflict as a 409.

### Soft-delete, not hard-delete

Deleting a dataroom, folder, or file sets `deleted_at` rather than removing the row, so it can show up in Trash and be restored. A few specifics:
- Deleting a folder recursively marks its entire subtree (via a recursive CTE), but Trash only lists **root** deleted items — an item whose parent is *also* deleted doesn't get its own Trash row, since restoring the parent already brings it back.
- Trash auto-purges anything older than 30 days, implemented as a lazy sweep on Trash reads rather than a scheduled background job (no cron infrastructure needed for this scale).
- "Empty Trash" and the 30-day sweep both permanently delete the underlying Blob files before removing the database rows, so files never become orphaned in storage.

### Starred, modeled to be auth-ready later

There's no authentication in this build (see below), but starring is still modeled with a `user_id` column on `starred_items` that's simply always `NULL` today (representing the implicit single owner). If auth is added later, this is a pure additive migration — add a real `users` table, backfill `user_id` on existing rows, then tighten the column to `NOT NULL` + a foreign key. No schema *shape* change, no rewrite of the starring feature.

### No authentication / RBAC

The task lists auth as optional extra credit, not a required feature, and grading weights UX/functionality and design polish above backend breadth. Given the time budget, I chose to spend it on the core CRUD flows and polish rather than login/session plumbing.

If this were extended with real access control, the natural design (consistent with the starring pattern above) is:
- A `users` table.
- A `dataroom_members(user_id, dataroom_id, role)` join table (`owner` / `editor` / `viewer`), checked in each route's controller before mutating or reading a dataroom's contents.
- Session auth (e.g. JWT in an httpOnly cookie) rather than social auth, to avoid a third-party dependency for a due-diligence tool where the buyer's own identity provider would typically be preferred anyway.

### Search: filename-only, not full-text content search

The task's optional extra-credit item is searching PDF *contents*, not just names. I implemented filename search only (a debounced, `ILIKE`-based query across the whole dataroom, not just the current folder) since content search would require extracting and indexing PDF text — real additional scope not justified within the time budget once core CRUD and polish were prioritized.

### Frontend architecture: Feature-Sliced Design

The frontend follows [Feature-Sliced Design](https://feature-sliced.design/): `app → pages → widgets → features → shared`, with a strict rule that layers only import "downward" (a page can use a feature, a feature never imports a page). This is what actually prevents the codebase from turning into a tangle of cross-imports as it grows — a `dataroom-actions` feature has no idea a `/datarooms/:id` route exists, and can be reused from any page.

I deliberately skipped the `entities` layer (a common simplification for apps this size — FSD's own guidance is that not every layer is required): each `features/<resource>` slice holds its own `api/` (fetch calls) and `model/` (TanStack Query hooks, both reads and mutations) together, rather than splitting "read model" (entity) from "write model" (feature) into separate top-level folders for six different resources.

Within each slice, `model/` (data + business logic, e.g. a `useCreateFolder` mutation hook) is kept separate from `ui/` (the actual components) — a component doesn't know or care whether its data comes from a live API call or a cache; it just calls a hook.

## Not implemented

Deliberate scope cuts, given the time budget and grading priorities (UX/functionality and polish over backend breadth):

- **Authentication / RBAC** — see design sketch above.
- **Full PDF content search** — filename search only; content search would need text extraction + indexing.
- **Drag-and-drop upload** — file selection is click-to-browse only; multi-file upload with per-file progress is implemented, drag-and-drop was descoped to prioritize other polish.
