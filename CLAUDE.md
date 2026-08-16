# CLAUDE.md

Guidance for Claude Code sessions working in this repo.

## Project status

This repo started as a take-home for one job application (v1: Express + Drizzle + Postgres + Vercel Blob, no auth, deployed as a single Vercel serverless function — see `README.md` for its full design writeup). The user applied for a second, related role at the same company, which sent an updated brief (`task2.md`, superseding `task.md`) explicitly requiring a real backend with auth and sharing, and naming **NestJS + PostgreSQL + Prisma** as their stack.

**We are mid-migration from v1 to v2.** The v2 plan below was designed and approved on 2026-08-15 and is the source of truth for the rewrite — treat it as durable project context, not a one-off session note. Update the Progress checklist at the bottom as phases complete so any future session (including a resumed/compacted one) knows exactly where things stand.

Do not re-derive this plan from scratch or re-litigate its decisions (framework choice, auth library, sharing data model) without a good reason — they were made deliberately after mapping the full v1 codebase and confirming key choices with the user. If something in the plan turns out to be wrong once implementation starts, update this file in place rather than just fixing it in code silently.

## v1 quick orientation (current code, being replaced)

- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui + TanStack Query + react-router. Feature-Sliced Design: `frontend/src/{app,pages,widgets,features,shared}`. This structure and its conventions **carry forward into v2 largely unchanged** — only new feature slices and auth/sharing plumbing are additive.
- **Backend** (`server/`, being replaced by v2): Express, routes → controllers → services → db (Drizzle ORM), deployed via `api/index.ts` as a single Vercel serverless function.
- **Shared** (`shared/`): `types.ts` + `validation.ts` (zod), single source of truth consumed by both frontend forms (`zodResolver`) and backend request validation. **Keep this pattern in v2.**
- Full v1 design rationale, tradeoffs, and "not implemented" list: see `README.md`.

## v2 Plan — NestJS + Prisma + Auth + Sharing

### Context

New functional scope beyond v1: auth (email/password + Google OAuth, via Better Auth) with per-user dataroom ownership, sharing (public link + permissioned per-user, revocable, read-only, subtree-inclusive), move-file-to-folder, drag-and-drop upload, folder-delete warnings, plus README additions (ERD, scaling Q&A, AI-usage note) required by task2.md.

Beyond task2.md's stated requirements, the user asked what would make this submission stand out and selected: an **access audit log + owner-facing activity view**, **bulk select/delete/move**, a **branded public share landing page**, plus a security-hardening bundle (**rate limiting, strong/expiring share tokens, security headers via helmet**). ZIP-download and CI were considered and deliberately cut for time.

Confirmed decisions:
- Backend: migrate Express+Drizzle → **NestJS + Prisma**.
- Auth: **email/password + Google OAuth**, via **Better Auth** (not hand-rolled sessions) — user's suggestion, validated against Better Auth's docs.
- Hosting: move off the single-Vercel-function trick to a **persistent Node server** (Railway or Render — TBD, user is checking account capacity on both; doesn't block earlier phases).

The v1 algorithms below **must be preserved, not redesigned**, when ported:
- Recursive CTE for descendant folder ids (`getDescendantFolderIds` in `server/services/folders.service.ts`) — walks `parent_folder_id` down from a root, used by soft-delete/restore/purge.
- Recursive CTE for breadcrumbs (`getBreadcrumbs` in `server/services/datarooms.service.ts`) — walks `parent_folder_id` up to root.
- Soft-delete + "Trash root" semantics: deleting a folder cascades `deletedAt` to its whole subtree, but Trash only lists items whose own `deletedAt` is set AND whose parent's is NOT (so cascaded children don't get their own Trash row). Deleting a Dataroom does NOT cascade to children (so restoring it doesn't resurrect independently-trashed items).
- Name-conflict handling differs by action: **upload auto-suffixes** on collision (`Summary.pdf` → `Summary (1).pdf`, up to 5 retry attempts on race), **rename/create/move hard-reject with 409** (no auto-suffix) — enforced via a partial unique index on `(dataroomId, coalesce(parentId, NULL_SENTINEL_UUID), name) WHERE deletedAt IS NULL`.
- Trash auto-purge is a **lazy sweep on read** (anything soft-deleted >30 days), not a cron job.
- `getDataroomContents(dataroomId, folderId?, search?)` is the single "browse" endpoint — dataroom + folder + breadcrumbs + merged folders-then-files list; `search` mode does a dataroom-wide `ILIKE` ignoring the current folder.

Both existing integration test scenarios (`server/services/dataRoomFlows.test.ts`) — recursive soft-delete/restore, and upload name-collision auto-suffix — must keep passing (as ported Nest e2e specs) after the migration.

### 1. Why Better Auth

Confirmed via [Better Auth's NestJS integration docs](https://better-auth.com/docs/integrations/nestjs) and the community `@thallesp/nestjs-better-auth` package: it disables Nest's body parser (`bodyParser: false` in `main.ts`, required so Better Auth can read raw request bodies), registers a **global `AuthGuard`** protecting all routes by default, and exposes the session via a `@Session()` param decorator, with `@AllowAnonymous()` / `@OptionalAuth()` decorators for public/optional routes — maps directly onto this app's "owner-only write, owner+grantee+token read" access pattern.

Cross-origin cookies (confirmed via [Better Auth cookies docs](https://better-auth.com/docs/concepts/cookies)): default `SameSite=Lax`; cross-origin (Vercel frontend / Railway-or-Render backend) needs explicit `defaultCookieAttributes: { sameSite: 'none', secure: true }` plus `trustedOrigins`. A `bearer` plugin exists as a fallback if cookie friction shows up (e.g. local dev over http).

Better Auth's Prisma adapter (`prismaAdapter`) generates its own `user`/`session`/`account`/`verification` models via `npx @better-auth/cli generate`. Domain tables (`Dataroom`, etc.) relate to its generated `user` model — **run the generator first and read the actual field names/casing before wiring `ownerId` relations**; don't assume the schema below is byte-exact.

Google sign-in needs a registered OAuth consent screen + redirect URI per environment (local + prod) — set up early since a new Google Cloud OAuth client can take time to propagate/verify. Frontend gets a "Continue with Google" button (`authClient.signIn.social({ provider: 'google' })`) alongside email/password on both login and signup pages — Better Auth treats social sign-up/sign-in as the same call.

### 2. NestJS module structure

Maps from `server/{routes,controllers,services,lib,db}`. `server/` becomes a Nest app (replaces `server/app.ts` + `api/index.ts`).

```
server/
  src/
    main.ts                     # Nest bootstrap; bodyParser:false; helmet(); app.enableCors({origin: FRONTEND_ORIGIN, credentials:true})
    app.module.ts
    auth/
      auth.ts                   # betterAuth({ database: prismaAdapter(...), emailAndPassword:{enabled:true}, socialProviders:{google:{...}}, trustedOrigins:[...], plugins:[bearer()] })
      auth.module.ts            # wraps @thallesp/nestjs-better-auth (or equivalent) — registers global AuthGuard
    prisma/
      prisma.module.ts
      prisma.service.ts         # PrismaClient wrapper
    common/
      filters/api-exception.filter.ts   # ApiException -> {error,message,details} JSON, same shape as v1's ApiError middleware
      exceptions/api.exception.ts       # extends HttpException; notFound/conflict/badRequest statics — 1:1 port of server/lib/errors.ts
      pipes/zod-validation.pipe.ts      # wraps shared/validation.ts zod schemas — reuse the SAME schemas the frontend's zodResolver uses
    datarooms/    # port of server/services/datarooms.service.ts + controller
    folders/      # port of server/services/folders.service.ts + controller
    files/        # port of server/services/files.service.ts + controller, + new moveFile, bulk-delete, bulk-move
    trash/        # port of server/services/trash.service.ts + controller
    starred/      # port of server/services/starred.service.ts + controller, now scoped to real session.user.id
    sharing/
      sharing.module.ts
      sharing.controller.ts     # POST /shares, DELETE /shares/:id, GET /shares/shared-with-me
      shares-access.service.ts  # access-resolution algorithm, see §5; also writes AccessLog rows
    activity/
      activity.controller.ts    # owner-facing activity/access-log reads, see §6b
    blob/blob.service.ts        # port of server/lib/blob.ts (Vercel Blob stays as file storage, only compute moves)
  prisma/schema.prisma
  test/
    dataroom-flows.e2e-spec.ts  # port of server/services/dataRoomFlows.test.ts — must keep passing unchanged
    sharing.e2e-spec.ts         # new, see §8
```

**Express → Nest mapping** (so nothing gets redesigned by accident):

| v1 (Express) | v2 (Nest) |
|---|---|
| `server/lib/handler.ts` (`asyncHandler`) | Not needed — Nest natively awaits controller methods and routes throws to filters. Delete the concept. |
| `server/lib/errors.ts` (`ApiError`) + error middleware | `ApiException extends HttpException` + one `ApiExceptionFilter` (`app.useGlobalFilters(...)`), same `{error,message,details}` JSON shape so `frontend/src/shared/api/client.ts`'s `ApiClientError` parsing needs no changes. |
| `server/lib/validate.ts` (zod middleware) | Custom `ZodValidationPipe`, applied per-route with `@UsePipes(new ZodValidationPipe(createFolderSchema))`, reusing `shared/validation.ts` as-is — do **not** rewrite as class-validator DTOs, that would break the single-source-of-truth the frontend forms rely on. |
| `server/lib/serialize.ts` | Keep as plain functions called from services — no class-serializer ceremony needed. |
| `server/lib/db-errors.ts` (`isUniqueViolation`, Postgres code `23505`) | Port logic but check Prisma's `PrismaClientKnownRequestError.code === 'P2002'` and `err.meta?.target` instead. |
| `server/db/client.ts` (drizzle `db`) | `PrismaService` injected via Nest DI. |

### 3. Prisma schema

`server/prisma/schema.prisma` — domain models (Better Auth's `user`/`session`/`account`/`verification` models are generated separately, see §1):

```prisma
model Dataroom {
  id        String    @id @default(uuid())
  name      String
  ownerId   String
  owner     User      @relation(fields: [ownerId], references: [id])   // User = Better Auth's generated model
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  folders   Folder[]
  files     File[]
  shares    Share[]
  @@index([ownerId])
  @@map("datarooms")
}

model Folder {
  id             String    @id @default(uuid())
  dataroomId     String
  dataroom       Dataroom  @relation(fields: [dataroomId], references: [id], onDelete: Cascade)
  parentFolderId String?
  parentFolder   Folder?   @relation("FolderParent", fields: [parentFolderId], references: [id], onDelete: Cascade)
  children       Folder[]  @relation("FolderParent")
  name           String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
  files          File[]
  shares         Share[]
  @@index([dataroomId]) @@index([parentFolderId]) @@index([deletedAt])
  @@map("folders")
  // partial unique index added via hand-edited raw SQL migration, see below — not expressible in schema.prisma
}

model File {
  id           String    @id @default(uuid())
  dataroomId   String
  dataroom     Dataroom  @relation(fields: [dataroomId], references: [id], onDelete: Cascade)
  folderId     String?
  folder       Folder?   @relation(fields: [folderId], references: [id], onDelete: Cascade)
  name         String
  size         BigInt
  mimeType     String    @default("application/pdf")
  blobUrl      String
  blobPathname String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?
  shares       Share[]
  @@index([dataroomId]) @@index([folderId]) @@index([deletedAt])
  @@map("files")
  // partial unique index via raw SQL migration, same as Folder
}

enum EntityType { dataroom folder file }

model StarredItem {
  id         String     @id @default(uuid())
  entityType EntityType
  entityId   String
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt  DateTime   @default(now())
  @@unique([entityType, entityId, userId])   // plain unique now works — userId always real, no NULL-collapsing sentinel needed
  @@map("starred_items")
}

enum ShareMode { public permissioned }

model Share {
  id           String     @id @default(uuid())
  resourceType EntityType
  dataroomId   String?
  dataroom     Dataroom?  @relation(fields: [dataroomId], references: [id], onDelete: Cascade)
  folderId     String?
  folder       Folder?    @relation(fields: [folderId], references: [id], onDelete: Cascade)
  fileId       String?
  file         File?      @relation(fields: [fileId], references: [id], onDelete: Cascade)
  ownerId      String
  owner        User       @relation(fields: [ownerId], references: [id])
  mode         ShareMode
  token        String?    @unique   // set only when mode = public; crypto.randomBytes(32).toString('base64url'), not a UUID
  // role field intentionally omitted (viewer-only for v2) — adding `role ShareRole @default(viewer)` later
  // is additive, not a remodel. This is the answer to the README's "how does sharing extend to roles" question.
  createdAt    DateTime   @default(now())
  revokedAt    DateTime?
  expiresAt    DateTime?   // optional expiry for public links, distinct from manual revoke — see §6b
  grants       ShareGrant[]
  @@index([dataroomId]) @@index([folderId]) @@index([fileId]) @@index([token])
  @@map("shares")
}

model ShareGrant {
  id            String   @id @default(uuid())
  shareId       String
  share         Share    @relation(fields: [shareId], references: [id], onDelete: Cascade)
  granteeUserId String
  granteeUser   User     @relation(fields: [granteeUserId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
  @@unique([shareId, granteeUserId])
  @@map("share_grants")
}

model AccessLog {
  id           String     @id @default(uuid())
  resourceType EntityType
  resourceId   String
  viewerUserId String?
  shareId      String?
  ipAddress    String?
  createdAt    DateTime   @default(now())
  @@index([resourceType, resourceId, createdAt])   // composite index anticipating the README's 100k-scale question
  @@map("access_logs")
}
```

Design call: `Share` uses three nullable FKs (`dataroomId`/`folderId`/`fileId`), exactly one set per row matching `resourceType` (enforced in the service layer), rather than a polymorphic `(resourceType, resourceId)` pair like `starred_items` uses. Trades a bit of symmetry for real FK `onDelete: Cascade` — a share auto-vanishes when its resource is purged, no orphan cleanup needed.

**Partial unique indexes**: Prisma can't express `WHERE deleted_at IS NULL` partial indexes in `schema.prisma`. Let `prisma migrate dev` generate the initial migration, then hand-edit `migration.sql` to add the raw `CREATE UNIQUE INDEX ... WHERE deleted_at IS NULL` statements verbatim (same sentinel `'00000000-0000-0000-0000-000000000000'::uuid` trick as `server/db/schema.ts`), and never declare a conflicting `@@unique`/`@@index` on those columns in `schema.prisma`.

**Recursive CTEs**: Prisma has no `WITH RECURSIVE` support. Port `getDescendantFolderIds` and `getBreadcrumbs` verbatim as `prisma.$queryRaw` tagged templates (auto-parameterized):

```ts
const rows = await this.prisma.$queryRaw<{ id: string }[]>`
  WITH RECURSIVE descendants AS (
    SELECT id FROM folders WHERE id = ${rootFolderId}
    UNION ALL
    SELECT f.id FROM folders f JOIN descendants d ON f.parent_folder_id = d.id
  )
  SELECT id FROM descendants
`;
```

### 4. Auth wiring (frontend + backend)

- Every write path (`create/rename/delete/move/upload`) checks `dataroom.ownerId === session.user.id` directly in the service — sharing is read-only by construction, no "can this grantee edit" branch anywhere.
- Read paths serving both owners and shared viewers use `@OptionalAuth()` + the access-resolution service (§5).
- Frontend: `better-auth/react`'s `createAuthClient({ baseURL: VITE_API_URL })` — exposes `useSession()`, `signIn.email()`, `signIn.social({provider:'google'})`, `signUp.email()`, `signOut()`. New `frontend/src/pages/auth/ui/LoginPage.tsx` / `SignupPage.tsx` (forms via existing `react-hook-form` + `zodResolver` pattern). `frontend/src/shared/api/client.ts` needs `credentials: 'include'` added to its `fetch` call. New `frontend/src/app/RequireAuth.tsx` wraps the existing single `AppShell` layout route in `Router.tsx`; add unguarded `login`/`signup` routes outside it, plus the unguarded `shared/:token` route tree (§5). `AppSidebar.tsx`'s currently-unused `SidebarFooter` slot is where the user-menu/logout control goes.

### 5. Sharing: access-resolution algorithm

`shares-access.service.ts` — `canView(resourceType, resourceId, user?, token?)`:

1. Resolve the resource's **ancestor chain** up to its dataroom root (file → folder ancestors via the breadcrumbs-style CTE → dataroom; folder → ancestors → dataroom; dataroom → itself).
2. **Owner check**: if `user` set and `dataroom.ownerId === user.id` → allow, short-circuit.
3. **Permissioned grant**: if `user` set, query `Share` rows (`mode='permissioned', revokedAt IS NULL`) whose `dataroomId`/`folderId`/`fileId` is in the ancestor chain, joined to `ShareGrant` where `granteeUserId = user.id` — single query using `IN (...)` on the precomputed ancestor-id list, not N+1. Match → allow.
4. **Public token**: if `token` set, same shape query with `mode='public' AND token = :token AND revokedAt IS NULL AND (expiresAt IS NULL OR expiresAt > now())`. Match → allow. (This is what makes "sharing a folder shares its whole subtree" work: a token minted for folder F grants access to any resource whose ancestor chain includes F.)
5. On any allow above, write an `AccessLog` row (viewer user id or share id, resource, timestamp) — see §6b.
6. Otherwise → **404**, not 403 (don't leak existence of private resources — matches v1's `ApiError.notFound` convention).

Frontend: new `frontend/src/features/share-actions/` slice with `ShareDialog.tsx` (two modes: public link with copy/revoke, specific-people by email with per-grantee revoke), wired into `frontend/src/pages/dataroom/ui/useEntryActions.ts` and surfaced via the existing `ActionsMenu`. Read-only rendering for shared/public viewers via a `ReadOnlyContext` (set by an unguarded `shared/:token` route wrapper, or derived from an `isOwner` flag on the dataroom DTO for logged-in grantees) — `Toolbar.tsx` and `useEntryActions.ts` consume it to hide upload/new-folder/mutating menu items. New `frontend/src/pages/shared-with-me/` page + sidebar nav entry, backed by `GET /shares/shared-with-me`. Dashboard's `GET /datarooms` list must filter to `WHERE ownerId = session.user.id` — shared datarooms appear only under "Shared with me."

### 6. Move file, drag-and-drop, delete warning

- **Move**: `PATCH /files/:id/move { folderId }`. Target folder must have the same `dataroomId` as the file (else 400). Name collision → hard 409 via the existing partial unique index (same convention as rename — no auto-suffix). New `frontend/src/shared/components/folder-tree-picker.tsx` (genuinely new) + `MoveFileDialog.tsx`, wired into `useEntryActions.ts`.
- **Drag-and-drop**: purely frontend — new `frontend/src/features/upload-file/ui/UploadDropzone.tsx` wrapping the folder content area, native `onDragOver`/`onDrop`, calling the **existing** `enqueueFiles` from `useUploadQueue.ts` — same queue, same `UploadProgressList.tsx`, zero backend change. (Confirmed via repo grep: zero drag-and-drop code exists today.)
- **Delete warning**: new `GET /folders/:id/subtree-stats` → `{ folderCount, fileCount }` via the descendant CTE. `DeleteFolderDialog.tsx` (already exists) fetches this on open and renders the count before confirming.

### 6b. Beyond-requirements additions

**Access audit log + activity view** — `AccessLog` model (§3), written on every successful `canView` resolution in `shares-access.service.ts` — piggybacks on the access-check that already runs on every read. Owner-facing `ActivityPanel` (new `frontend/src/features/activity/`) on a dataroom/file, listing recent viewers (name/email if authenticated, "Anonymous via link" + which link if via public token) and last-viewed time. Concrete, demoable content for the README's "how it scales" section — `AccessLog` at 100k-file scale needs its composite index on `(resourceType, resourceId, createdAt)` and probably a retention/archival policy.

**Bulk select + bulk delete/move** — `EntryTable.tsx`/`EntryRow.tsx` gain a checkbox column and multi-select state (lifted into `DataroomPage.tsx`); a selection toolbar appears when ≥1 item is selected: Delete (reuses `DeleteFolderDialog`/`DeleteFileDialog` bulk-warning copy, extending subtree-stats to accept multiple root ids) and Move (reuses `MoveFileDialog`/`folder-tree-picker.tsx`, files-only for v1 — bulk-moving folders is a stretch, cut if time-boxed). Backend: batch endpoints (`POST /files/bulk-delete`, `POST /files/bulk-move`) rather than N sequential requests, kept as one transaction.

**Branded public share landing page** — `shared/:token` route (§5) gets its own minimal layout (`frontend/src/pages/shared-view/ui/SharedViewLayout.tsx`) instead of reusing `AppShell` — no sidebar/dashboard chrome, just the resource name, owner attribution ("Shared by {owner email}"), and the read-only entry browser.

**Security hardening**:
- **Rate limiting**: `@nestjs/throttler`, stricter `@Throttle()` override on `auth/login`, `auth/signup`, and the public share-token read path than the app-wide default.
- **Share tokens**: `crypto.randomBytes(32).toString('base64url')` (not a UUID — higher entropy, non-sequential). `expiresAt` distinct from `revokedAt` in both logic and UI copy ("This link has expired" vs "This link was revoked by the owner").
- **Security headers**: `helmet()` globally in `main.ts` — verify ordering against Better Auth's `bodyParser: false` requirement at implementation time.

### 7. Deployment

- Backend: **Railway** as working default (managed Postgres in the same project) — user is checking existing Railway/Render projects for multi-service capacity; Render is a valid drop-in swap, doesn't change anything upstream of this section.
- `main.ts`: `app.enableCors({ origin: FRONTEND_ORIGIN, credentials: true })` — explicit origin required, `*` is incompatible with `credentials: true`.
- Env vars: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` (unchanged — file storage stays on Vercel Blob), `FRONTEND_ORIGIN`, `NODE_ENV`, Better-Auth vars (secret, base URL, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`).
- Frontend stays on Vercel, now static-only — `api/index.ts` and the `vercel.json` `/api` rewrite were already removed in Phase 2's cleanup (see Phase 2 implementation notes below), ahead of schedule since they were dead references once the old backend was deleted. What's still open for this phase: add `VITE_API_URL`; `frontend/src/shared/api/client.ts`'s hardcoded `` `/api${path}` `` becomes `` `${import.meta.env.VITE_API_URL}${path}` ``.

### Phase 2 implementation notes (settled while porting, not in the original design)

- **Ownership scoping pattern**: only `Dataroom` has `ownerId` (per §0's decision — folders/files inherit ownership transitively). Every ownership-checked mutation uses `updateMany({ where: { id, ...(relation: {ownerId}) } })` then checks `result.count === 0` → 404, then a follow-up `findUniqueOrThrow` to return the fresh row — this guards against both "doesn't exist" and "exists but belongs to someone else" in one query, and deliberately doesn't distinguish the two in the response (matches v1's not-found-not-forbidden convention, now doing real authorization work instead of being vestigial).
- **Trash-root logic without raw SQL**: v1's `folderIsTrashRoot`/`fileIsTrashRoot` were raw NOT-EXISTS SQL fragments. The Nest port (`folderTrashRootWhere()`/`fileTrashRootWhere()` in `folders.service.ts`/`files.service.ts`, exported as plain functions, not class methods, so `trash.service.ts` can compose them without a DI dependency) expresses the same logic as native Prisma relation filters — `{ deletedAt: { not: null }, OR: [{ parentFolderId: null }, { parentFolder: { deletedAt: null } }] }` — logically equivalent, fully typed, no raw SQL. They take an optional `deletedAtFilter` override so the 30-day expiry sweep can layer `lt: cutoff` on top without a spread key-collision on `deletedAt`.
- **Starred items are a polymorphic association** (`entityId` + `entityType`, no declared Prisma relation — same as v1's Drizzle schema). Prisma can't join across that directly, so `listStarredEntries` does a two-step fetch (ids by type, then matching rows per table) and merges in JS, instead of v1's single SQL JOIN. Standard workaround for polymorphic associations in Prisma.
- **`postinstall` now runs `prisma generate`.** The generated Prisma client lives inside `node_modules/@prisma/client` — a fresh `npm install` (clean clone, CI, `rm -rf node_modules`) wipes it, and without this hook the very next typecheck/build fails with "module has no exported member 'PrismaClient'" style errors that look unrelated to Prisma. Hit this firsthand during the post-cleanup `npm install`; don't remove the hook.
- **`express` and `@types/express` are still real dependencies**, not v1 leftovers — `@nestjs/platform-express` uses Express under the hood, and `Request`/`Response` types from `express` are used directly in `files.controller.ts` and `api-exception.filter.ts`. Removing them during the v1 cleanup was wrong and had to be reverted; the src-level `import type { Request } from "express"` pattern is legitimate.
- **The Nest tsconfig is now just `server/tsconfig.json`**, not `server/tsconfig.nest.json`. Once the legacy Express tsconfig was deleted, VSCode's TS server had no discoverable config for anything under `server/src/` (it only auto-finds files literally named `tsconfig.json`, not custom names) — it fell back toward the root tsconfig, which doesn't set `experimentalDecorators`, so it parsed Nest's decorators with TS's new stage-3 semantics instead of the legacy ones Nest needs, producing "decorator expects 3 arguments" errors in the editor even though the real `tsc` build was fine. Renaming to the standard name fixed it — all `*.nest.json` references in scripts and here were updated accordingly. If a similar decorator error ever reappears in the editor only (not in `npm run typecheck:nest`), suspect tsconfig discovery, not the code.

### Phase 3 implementation notes (settled while building sharing, not in the original design)

- **Search is owner-only.** `getDataroomContents`'s `search` mode is dataroom-wide by design (v1 behavior) — for a non-owner viewing via a *folder*-scoped share, dataroom-wide search would leak the names of sibling content outside their granted subtree. Rather than threading scope-root resolution through search too, `search` is silently ignored for anyone who isn't the owner; shared viewers still browse folder-by-folder via breadcrumbs, just without the search shortcut. Documented in `datarooms.service.ts`'s doc comment — revisit if a client ever needs search inside a shared folder.
- **`createShare` is idempotent per (resource, mode)**, not append-only. Re-requesting a public link for the same resource returns the *existing* active link rather than minting a duplicate (matches "get link" behavior in Drive/Dropbox — avoids orphaned links nobody can find again). For `mode: "permissioned"`, there's one active Share row per resource that new grantee emails get added to (`ShareGrant.createMany` with `skipDuplicates`), not a new Share row per invite — keeps `listSharesForResource` showing one coherent "who has access" list per resource instead of a scattered history.
- **Sharing with an unregistered email is a hard 400**, not a pending invite. Real products often support "invite by email, activates on signup" — deliberately out of scope here (not required by task2.md, adds a real chunk of auth-adjacent complexity for a take-home). The error lists which emails weren't found so the owner can correct a typo.
- **Revocation is two-grained**: `DELETE /shares/:id` revokes the whole share (all grantees lose access at once, and kills a public link); `DELETE /shares/:id/grants/:grantId` removes one grantee from a permissioned share without touching the others. Both exist because `Share` fans out to multiple `ShareGrant`s by design.
- **`AccessLog` only records shared views, never the owner's own.** `SharesAccessService.assertCanView` checks `access.via === "share"` before writing — an owner opening their own dataroom repeatedly isn't "activity" a due-diligence seller needs surfaced; only external (grantee or public-link) views are logged. Verified directly against `access_logs` in the Phase 3 smoke test.
- **`isOwner` was added to `FolderContents` and (optionally) `FileEntry`** so the frontend can decide whether to render mutating UI without a second round-trip — computed by comparing `dataroom.ownerId` to the requester's id at read time, not stored.

### 8. Verification

- **Must keep passing** (ported to Nest e2e specs): recursive soft-delete/restore cascade + Trash-root semantics; upload name-collision auto-suffix.
- **New auth tests**: duplicate-email signup → 409; wrong-password login → 401; session round-trips across requests.
- **New sharing tests** (highest-value new coverage): owner always has access; non-owner no-share → 404; dataroom-level grant reaches a deeply nested file; folder-level grant reaches files in subfolders but NOT sibling folders outside the shared subtree; public token works anonymously, wrong/missing token → 404; revoked/expired share → previously-valid access now 404s; a grantee/token holder cannot mutate even though they can read.
- **Move tests**: cross-dataroom move → 400; name collision on move → 409, no auto-suffix.
- **Manual E2E after deploy**: signup (+ Google) → create dataroom → drag-drop upload with visible per-file progress → nested folders → generate public link → open in a private/incognito browser, confirm read-only rendering and no action menus → revoke, confirm 404 → share by email with a second test account, confirm it surfaces under "Shared with me" and is read-only → delete a folder with contents, confirm the warning shows correct counts → check the owner-facing activity panel reflects the views above.

## Progress

Update this checklist as work lands. Mark phases done only once their own verification (§8) passes, not just "code written."

- [x] Phase 1: Prisma schema + Better Auth (email/password + Google) wired into Nest, `helmet` + `@nestjs/throttler` baseline — verified: `npm run typecheck:nest`, `npm run build:nest`, and a live boot (`node server/dist/server/src/main.js`) all pass; `curl localhost:3001/api/auth/ok` returns `200 {"ok":true}` with helmet headers and correct CORS.
- [x] Phase 2: Core CRUD ported to Nest+Prisma (datarooms/folders/files/trash/starred), existing integration tests ported and passing — verified: `npm run typecheck`, `npm test` (both dataroom-flows scenarios pass against the v2 stack), a live boot, and an HTTP smoke test (signup → session cookie → create dataroom/folder → 409 on name collision → 400 on invalid body → correct list/contents output). **The old Express/Drizzle backend has been deleted** (`server/{routes,controllers,services,lib,db,app.ts}`, `api/`, `drizzle.config.ts`, `scripts/dev-api.ts`, and the `drizzle-orm`/`express`/`pg`/`drizzle-kit` deps) — this is now the only backend. `npm run dev` now runs the Nest backend + Vite frontend concurrently (replacing the old `vercel dev`); the frontend has no working data yet since Phase 4 hasn't rewired `shared/api/client.ts` to talk to it (expected mid-migration gap, not a regression).
- [x] Phase 3: Sharing backend (`shares-access.service.ts`, `AccessLog`, expiring/strong tokens) + new e2e tests — verified: `npm run typecheck`, `npm test` (15/15, including 11 new sharing tests: ownership, dataroom/folder-level grants with subtree-vs-sibling boundary, revocation, public tokens incl. wrong/missing/expired, and that shared access never extends to mutation), and a full HTTP smoke test with two real signed-up users (public link generate → anonymous view → wrong-token 404 → revoke → 404; permissioned share by email → grantee session view 200 → grantee mutation attempt 404 → shared-with-me listing) — `access_logs` confirmed populated correctly (owner's own views excluded, shared views included).
- [ ] Phase 4: Frontend auth (login/signup incl. Google, `RequireAuth`, client wiring, user menu)
- [ ] Phase 5: Frontend feature UI (move, drag-and-drop, share dialog + read-only viewer, "Shared with me", delete-warning stats, bulk select, activity panel, branded shared-view layout)
- [ ] Phase 6: Deployment (Railway-or-Render backend + Postgres, Vercel frontend config, Google OAuth redirect URIs per environment)
- [ ] Phase 7: README (ERD, "how it scales" ⓐⓑⓒ, AI-usage note)

## Implementation notes (things Phase 1 settled that the plan above didn't pin down)

- **Module system: ESM, not CommonJS.** The plan originally leaned CommonJS for Nest-ecosystem safety, but the user correctly pushed back — Better Auth ships ESM-only, and Node/Nest have supported ESM as the standard path since well before this build. `server/tsconfig.json` uses `"module"/"moduleResolution": "nodenext"`, decorators still work fine (`experimentalDecorators` + `emitDecoratorMetadata` + `useDefineForClassFields: false`, which is required alongside them under ES2022+ targets). Relative imports need explicit `.js` extensions per nodenext convention (e.g. `from "../prisma/prisma.module.js"`), including inside `shared/*.ts` — `shared/validation.ts`'s import of `./types` was changed to `./types.js` (harmless under the frontend's/old-server's `bundler` resolution too, so this didn't break anything else).
- **No `@nestjs/cli`.** Its path assumptions (`dist/main.js` relative to a single project root) don't fit cleanly once `rootDir` has to span the repo root (see next point), so the build/dev scripts just drive `tsc` + `node` directly (`build:nest`, `start:nest`, `dev:nest`, `typecheck:nest` in package.json) rather than `nest build`/`nest start`.
- **`rootDir` spans the repo root, not just `server/`.** Nest source imports `shared/*.ts` via relative paths, and TS requires every compiled file to live under `rootDir`. `server/tsconfig.json` sets `"rootDir": ".."`, so the compiled entrypoint lands at `server/dist/server/src/main.js` (not `server/dist/main.js`) — a bit ugly but avoids giving `shared/` its own separate build step. `start:nest` hardcodes this path.
- **Prisma 7 changed datasource config.** `datasource.url` is no longer valid inside `schema.prisma` — the connection URL now lives in a `prisma.config.ts` at the repo root (`defineConfig({ schema, migrations, datasource: { url: env("DATABASE_URL") } })`), and `PrismaClient` needs an explicit driver adapter (`@prisma/adapter-pg`'s `PrismaPg`, wrapping `pg`) passed to its constructor — both in `PrismaService` and in the standalone `PrismaClient` `server/src/auth/auth.ts` constructs for Better Auth. All `prisma:*` npm scripts pick up `prisma.config.ts` automatically.
- **Local dev DB is `data_room_v2`**, separate from v1's `data_room` — avoids any collision between Prisma-managed and Drizzle-managed tables of the same name while both stacks exist side by side during the migration. `.env`/`.env.example` have the full set of new v2 vars (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_ORIGIN`, `NEST_PORT`, `GOOGLE_CLIENT_ID`/`SECRET`).
- **Better Auth's own generated models** (`User`/`Session`/`Account`/`Verification` in `server/prisma/schema.prisma`) were produced by `npx auth@latest generate --config ./server/src/auth/auth.ts --output ./server/prisma/schema.prisma` (the `auth` package, not `@better-auth/cli`, which is stale) — domain models were then hand-appended below them, with back-relation fields (`datarooms`, `starredItems`, `ownedShares`, `shareGrants`) added onto the generated `User` model by hand. If the auth config changes later in a way that needs regenerating, re-run that command and re-check the domain-model back-relations are still there.
- **Better Auth's own rate limiting is used for auth endpoints** (`rateLimit` in `server/src/auth/auth.ts`, with stricter `customRules` for `/sign-in/email` and `/sign-up/email`) rather than `@nestjs/throttler` for those specific routes — Better Auth ships this natively for exactly this purpose. `@nestjs/throttler` (`ThrottlerModule` + global `APP_GUARD` in `app.module.ts`) still covers the app-wide default and will get the stricter override for the public share-token read path once that route exists (Phase 3).
- **Node version**: `@thallesp/nestjs-better-auth@2.7.0` declares `engines.node >= 22.22.1`. Resolved by moving the project (and this machine's nvm default) to Node 24.13.1 (current LTS "Krypton") — see `.nvmrc` and `package.json`'s `engines` field. Run `nvm use` in this directory (or just open a new terminal, since it's also the nvm default now) before running any `npm`/`node` commands.

## Open items needing the user (not blocking earlier phases)

- Final choice between Railway and Render — user is checking multi-service capacity on their existing accounts.
- Google OAuth client (Cloud Console project, consent screen, redirect URIs for local + prod) — needs the user's Google account access.
- Production `DATABASE_URL` once hosting is finalized.
