CREATE TABLE "item_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"file_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_files" ADD CONSTRAINT "item_files_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_files" ADD CONSTRAINT "item_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;