CREATE TABLE "admin_sessions" (
	"token" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL
);
