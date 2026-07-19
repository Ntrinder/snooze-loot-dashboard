CREATE TABLE "awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"dedup_key" text NOT NULL,
	"player" text NOT NULL,
	"awarded_at" timestamp with time zone NOT NULL,
	"item" text NOT NULL,
	"item_id" integer,
	"item_string" text DEFAULT '' NOT NULL,
	"response" text NOT NULL,
	"class_name" text NOT NULL,
	"instance" text DEFAULT '' NOT NULL,
	"boss" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "awards_dedup_key_unique" UNIQUE("dedup_key")
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"awards_seen" integer DEFAULT 0 NOT NULL,
	"awards_new" integer DEFAULT 0 NOT NULL,
	"items_enriched" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "item_meta" (
	"item_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"quality" integer DEFAULT 0 NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roster" (
	"player" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX "awards_player_idx" ON "awards" USING btree ("player");