-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('dataroom', 'folder', 'file');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('public', 'permissioned');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datarooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "datarooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dataroomId" UUID NOT NULL,
    "parentFolderId" UUID,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dataroomId" UUID NOT NULL,
    "folderId" UUID,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "starred_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityType" "EntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "starred_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resourceType" "EntityType" NOT NULL,
    "dataroomId" UUID,
    "folderId" UUID,
    "fileId" UUID,
    "ownerId" TEXT NOT NULL,
    "mode" "ShareMode" NOT NULL,
    "token" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ,
    "expiresAt" TIMESTAMPTZ,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shareId" UUID NOT NULL,
    "granteeUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resourceType" "EntityType" NOT NULL,
    "resourceId" UUID NOT NULL,
    "viewerUserId" TEXT,
    "shareId" UUID,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "datarooms_ownerId_idx" ON "datarooms"("ownerId");

-- CreateIndex
CREATE INDEX "folders_dataroomId_idx" ON "folders"("dataroomId");

-- CreateIndex
CREATE INDEX "folders_parentFolderId_idx" ON "folders"("parentFolderId");

-- CreateIndex
CREATE INDEX "folders_deletedAt_idx" ON "folders"("deletedAt");

-- CreateIndex
CREATE INDEX "files_dataroomId_idx" ON "files"("dataroomId");

-- CreateIndex
CREATE INDEX "files_folderId_idx" ON "files"("folderId");

-- CreateIndex
CREATE INDEX "files_deletedAt_idx" ON "files"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "starred_items_entityType_entityId_userId_key" ON "starred_items"("entityType", "entityId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "shares_token_key" ON "shares"("token");

-- CreateIndex
CREATE INDEX "shares_dataroomId_idx" ON "shares"("dataroomId");

-- CreateIndex
CREATE INDEX "shares_folderId_idx" ON "shares"("folderId");

-- CreateIndex
CREATE INDEX "shares_fileId_idx" ON "shares"("fileId");

-- CreateIndex
CREATE INDEX "shares_token_idx" ON "shares"("token");

-- CreateIndex
CREATE UNIQUE INDEX "share_grants_shareId_granteeUserId_key" ON "share_grants"("shareId", "granteeUserId");

-- CreateIndex
CREATE INDEX "access_logs_resourceType_resourceId_createdAt_idx" ON "access_logs"("resourceType", "resourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datarooms" ADD CONSTRAINT "datarooms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_dataroomId_fkey" FOREIGN KEY ("dataroomId") REFERENCES "datarooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentFolderId_fkey" FOREIGN KEY ("parentFolderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_dataroomId_fkey" FOREIGN KEY ("dataroomId") REFERENCES "datarooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "starred_items" ADD CONSTRAINT "starred_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_dataroomId_fkey" FOREIGN KEY ("dataroomId") REFERENCES "datarooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_granteeUserId_fkey" FOREIGN KEY ("granteeUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique indexes (hand-added — see CLAUDE.md §3). A plain unique index on
-- (dataroomId, parentFolderId, name) would not catch two root-level folders
-- (parentFolderId IS NULL) sharing a name, since Postgres treats every NULL as distinct.
-- Coalescing to a fixed sentinel UUID collapses "no parent" to one comparable value —
-- mirrors v1's server/db/schema.ts. Scoped to live rows only (deletedAt IS NULL) so a
-- soft-deleted name doesn't block reuse.
CREATE UNIQUE INDEX "folders_unique_name_per_parent" ON "folders" (
  "dataroomId",
  COALESCE("parentFolderId", '00000000-0000-0000-0000-000000000000'::uuid),
  "name"
) WHERE "deletedAt" IS NULL;

CREATE UNIQUE INDEX "files_unique_name_per_parent" ON "files" (
  "dataroomId",
  COALESCE("folderId", '00000000-0000-0000-0000-000000000000'::uuid),
  "name"
) WHERE "deletedAt" IS NULL;
