import type { Config } from "@netlify/functions";
import { checkCredentials, clearSessionCookie, createSession, destroySession, isAdminRequest, sessionCookie } from "../../lib/admin-auth.js";

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...extraHeaders } });

export default async (req: Request) => {
  if (req.method === "GET") {
    return json({ admin: await isAdminRequest(req) });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    const username = String(body?.username ?? "").trim().slice(0, 100);
    const password = String(body?.password ?? "").slice(0, 200);
    if (!username || !password) return json({ error: "Vui lòng nhập tài khoản và mật khẩu." }, 400);

    if (!checkCredentials(username, password)) {
      return json({ error: "Tài khoản hoặc mật khẩu không đúng." }, 401);
    }

    const token = await createSession();
    return json({ admin: true }, 200, { "Set-Cookie": sessionCookie(token) });
  }

  if (req.method === "DELETE") {
    await destroySession(req);
    return json({ loggedOut: true }, 200, { "Set-Cookie": clearSessionCookie() });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = {
  path: "/api/admin/session",
};
