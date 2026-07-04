CREATE TABLE "datarooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataroom_id" uuid NOT NULL,
	"folder_id" uuid,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"mime_type" text DEFAULT 'application/pdf' NOT NULL,
	"blob_url" text NOT NULL,
	"blob_pathname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dataroom_id" uuid NOT NULL,
	"parent_folder_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "starred_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_dataroom_id_datarooms_id_fk" FOREIGN KEY ("dataroom_id") REFERENCES "public"."datarooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_dataroom_id_datarooms_id_fk" FOREIGN KEY ("dataroom_id") REFERENCES "public"."datarooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_folder_id_folders_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "files_unique_name_per_parent" ON "files" USING btree ("dataroom_id",coalesce("folder_id", '00000000-0000-0000-0000-000000000000'::uuid),"name") WHERE "files"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "files_dataroom_id_idx" ON "files" USING btree ("dataroom_id");--> statement-breakpoint
CREATE INDEX "files_folder_id_idx" ON "files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "files_deleted_at_idx" ON "files" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "folders_unique_name_per_parent" ON "folders" USING btree ("dataroom_id",coalesce("parent_folder_id", '00000000-0000-0000-0000-000000000000'::uuid),"name") WHERE "folders"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "folders_dataroom_id_idx" ON "folders" USING btree ("dataroom_id");--> statement-breakpoint
CREATE INDEX "folders_parent_folder_id_idx" ON "folders" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "folders_deleted_at_idx" ON "folders" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "starred_items_unique_null_user" ON "starred_items" USING btree ("entity_type","entity_id") WHERE "starred_items"."user_id" is null;