CREATE TABLE "messages" (
	"id" text PRIMARY KEY,
	"author" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
