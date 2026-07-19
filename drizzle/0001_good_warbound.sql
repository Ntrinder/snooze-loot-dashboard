CREATE TABLE "config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roster" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "roster" ADD COLUMN "dead" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "roster" DROP COLUMN "active";