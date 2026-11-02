import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { adminSessions } from "../db/schema.js";

const COOKIE_NAME = "admin_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

export function checkCredentials(username: string, password: string) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

function tokenFromCookie(req: Request) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === COOKIE_NAME) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export async function createSession() {
  const token = crypto.randomUUID();
  await db.insert(adminSessions).values({ token, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  return token;
}

export async function isAdminRequest(req: Request) {
  const token = tokenFromCookie(req);
  if (!token) return false;

  const rows = await db.select().from(adminSessions).where(eq(adminSessions.token, token)).limit(1);
  if (!rows.length) return false;

  if (rows[0].expiresAt.getTime() < Date.now()) {
    await db.delete(adminSessions).where(eq(adminSessions.token, token));
    return false;
  }
  return true;
}

export async function destroySession(req: Request) {
  const token = tokenFromCookie(req);
  if (token) await db.delete(adminSessions).where(eq(adminSessions.token, token));
}

export function sessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
