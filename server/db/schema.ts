import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// Sentinel used in place of NULL inside expression indexes: Postgres treats every
// NULL as distinct for uniqueness purposes, so a plain unique index on
// (dataroom_id, parent_folder_id, name) would NOT catch two root-level folders
// (parent_folder_id IS NULL) sharing a name. Coalescing to a fixed sentinel UUID
// collapses "no parent" to a single comparable value so the constraint works.
const NULL_PARENT_SENTINEL = "00000000-0000-0000-0000-000000000000";

export const datarooms = pgTable("datarooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dataroomId: uuid("dataroom_id")
      .notNull()
      .references(() => datarooms.id, { onDelete: "cascade" }),
    parentFolderId: uuid("parent_folder_id").references(
      (): AnyPgColumn => folders.id,
      { onDelete: "cascade" },
    ),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("folders_unique_name_per_parent")
      .on(
        table.dataroomId,
        sql`coalesce(${table.parentFolderId}, ${sql.raw(`'${NULL_PARENT_SENTINEL}'::uuid`)})`,
        table.name,
      )
      .where(sql`${table.deletedAt} is null`),
    index("folders_dataroom_id_idx").on(table.dataroomId),
    index("folders_parent_folder_id_idx").on(table.parentFolderId),
    index("folders_deleted_at_idx").on(table.deletedAt),
  ],
);

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dataroomId: uuid("dataroom_id")
      .notNull()
      .references(() => datarooms.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    mimeType: text("mime_type").notNull().default("application/pdf"),
    blobUrl: text("blob_url").notNull(),
    blobPathname: text("blob_pathname").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("files_unique_name_per_parent")
      .on(
        table.dataroomId,
        sql`coalesce(${table.folderId}, ${sql.raw(`'${NULL_PARENT_SENTINEL}'::uuid`)})`,
        table.name,
      )
      .where(sql`${table.deletedAt} is null`),
    index("files_dataroom_id_idx").on(table.dataroomId),
    index("files_folder_id_idx").on(table.folderId),
    index("files_deleted_at_idx").on(table.deletedAt),
  ],
);

// user_id is unused today (no auth) and always NULL, representing the implicit
// single owner. It's modeled as a real column from day one so that adding auth
// later only requires backfilling + constraining it, not restructuring this table.
export const starredItems = pgTable(
  "starred_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type", { enum: ["dataroom", "folder", "file"] }).notNull(),
    entityId: uuid("entity_id").notNull(),
    userId: uuid("user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("starred_items_unique_null_user")
      .on(table.entityType, table.entityId)
      .where(sql`${table.userId} is null`),
  ],
);

export type DataroomRow = typeof datarooms.$inferSelect;
export type FolderRow = typeof folders.$inferSelect;
export type FileRow = typeof files.$inferSelect;
export type StarredItemRow = typeof starredItems.$inferSelect;
