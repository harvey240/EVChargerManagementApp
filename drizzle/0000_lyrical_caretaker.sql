CREATE TABLE "chargers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"current_user_email" varchar(255),
	"session_started_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"charger_id" integer NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_charger_id_chargers_id_fk" FOREIGN KEY ("charger_id") REFERENCES "public"."chargers"("id") ON DELETE no action ON UPDATE no action;