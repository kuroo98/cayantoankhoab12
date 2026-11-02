import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  author: text("author").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const adminSessions = pgTable("admin_sessions", {
  token: text("token").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
