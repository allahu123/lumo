import crypto from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db.js";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const COOKIE = "lumo_sid";
const DAYS = 60;

export async function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `s1$${salt.toString("hex")}$${key.toString("hex")}`;
}
export async function verifyPassword(pw: string, stored: string) {
  const [v, saltHex, keyHex] = stored.split("$");
  if (v !== "s1" || !saltHex || !keyHex) return false;
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"), 64);
  const want = Buffer.from(keyHex, "hex");
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}

const sha = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function startSession(res: Response, userId: string | number) {
  const token = crypto.randomBytes(32).toString("base64url");
  await pool.query(
    "insert into sessions(token_hash,user_id,expires_at) values($1,$2, now() + ($3 || ' days')::interval)",
    [sha(token), userId, String(DAYS)],
  );
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DAYS * 86400}${secure ? "; Secure" : ""}`,
  );
}

function readCookie(req: Request, name: string) {
  const h = req.headers.cookie;
  if (!h) return null;
  for (const part of h.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function endSession(req: Request, res: Response) {
  const t = readCookie(req, COOKIE);
  if (t) await pool.query("delete from sessions where token_hash=$1", [sha(t)]);
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; name: string; color: string };
}

export async function attachUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const t = readCookie(req, COOKIE);
    if (t) {
      const { rows } = await pool.query(
        `select u.id, u.email, u.name, u.color from sessions s join users u on u.id=s.user_id
         where s.token_hash=$1 and s.expires_at>now()`,
        [sha(t)],
      );
      if (rows[0]) req.user = rows[0];
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Giriş yapman gerekiyor." });
  next();
}

// Basit IP başına hız sınırı (giriş/kayıt denemeleri için).
const hits = new Map<string, { n: number; t: number }>();
export function authLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "x";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 10 * 60_000) hits.set(ip, { n: 1, t: now });
  else if (++h.n > 30) return res.status(429).json({ error: "Çok fazla deneme. Biraz sonra tekrar dene." });
  next();
}
