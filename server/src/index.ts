import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { pool, migrate } from "./db.js";
import {
  attachUser, requireUser, authLimit, hashPassword, verifyPassword,
  startSession, endSession, type AuthedRequest,
} from "./auth.js";

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "300kb" }));
app.use(attachUser);

const COLORS = ["#9aeb2d", "#5eead4", "#c4f23d", "#4ade80", "#facc15", "#86efac"];
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;
const pub = (u: { id: string; email: string; name: string; color: string }) => ({
  id: u.id, email: u.email, name: u.name, color: u.color,
});

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/register", authLimit, async (req, res) => {
  const name = String(req.body?.name ?? "").trim().slice(0, 24);
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  if (name.length < 2) return res.status(400).json({ error: "Adın en az 2 harf olmalı." });
  if (!emailOk(email)) return res.status(400).json({ error: "E-posta adresi geçerli görünmüyor." });
  if (password.length < 6) return res.status(400).json({ error: "Şifre en az 6 karakter olmalı." });
  if (password.length > 200) return res.status(400).json({ error: "Şifre çok uzun." });
  const exists = await pool.query("select 1 from users where email=$1", [email]);
  if (exists.rowCount) return res.status(409).json({ error: "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene." });
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const { rows } = await pool.query(
    "insert into users(email,name,pw_hash,color) values($1,$2,$3,$4) returning id,email,name,color",
    [email, name, await hashPassword(password), color],
  );
  await pool.query("insert into progress(user_id) values($1)", [rows[0].id]);
  await startSession(res, rows[0].id);
  res.status(201).json({ user: pub(rows[0]) });
});

app.post("/api/auth/login", authLimit, async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const { rows } = await pool.query("select * from users where email=$1", [email]);
  const u = rows[0];
  // Kullanıcı yoksa da hash hesapla ki süre farkından hesap var mı anlaşılmasın.
  const ok = await verifyPassword(password, u?.pw_hash ?? "s1$00$00");
  if (!u || !ok) return res.status(401).json({ error: "E-posta veya şifre hatalı." });
  await startSession(res, u.id);
  res.json({ user: pub(u) });
});

app.post("/api/auth/logout", async (req, res) => {
  await endSession(req, res);
  res.json({ ok: true });
});

app.get("/api/me", (req: AuthedRequest, res) => {
  res.json({ user: req.user ? pub(req.user) : null });
});

app.get("/api/state", requireUser, async (req: AuthedRequest, res) => {
  const { rows } = await pool.query("select state, updated_at from progress where user_id=$1", [req.user!.id]);
  res.json({ state: rows[0]?.state ?? {}, updatedAt: rows[0]?.updated_at ?? null });
});

app.put("/api/state", requireUser, async (req: AuthedRequest, res) => {
  const state = req.body?.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) return res.status(400).json({ error: "Geçersiz veri." });
  await pool.query(
    `insert into progress(user_id,state,updated_at) values($1,$2,now())
     on conflict (user_id) do update set state=excluded.state, updated_at=now()`,
    [req.user!.id, JSON.stringify(state)],
  );
  res.json({ ok: true });
});

app.patch("/api/me", requireUser, async (req: AuthedRequest, res) => {
  const name = String(req.body?.name ?? req.user!.name).trim().slice(0, 24);
  const color = COLORS.includes(req.body?.color) ? req.body.color : req.user!.color;
  if (name.length < 2) return res.status(400).json({ error: "Adın en az 2 harf olmalı." });
  const { rows } = await pool.query("update users set name=$1,color=$2 where id=$3 returning id,email,name,color", [name, color, req.user!.id]);
  res.json({ user: pub(rows[0]) });
});

app.delete("/api/me", requireUser, async (req: AuthedRequest, res) => {
  await pool.query("delete from users where id=$1", [req.user!.id]);
  await endSession(req, res);
  res.json({ ok: true });
});

// ---- ön yüz (build edilmiş client) ----
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(here, "../../client/dist");
if (fs.existsSync(dist)) {
  app.use("/assets", express.static(path.join(dist, "assets"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(dist, { maxAge: "1h" }));
  app.get("*", (req, res, next) => (req.path.startsWith("/api") ? next() : res.sendFile(path.join(dist, "index.html"))));
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Sunucu hatası." });
});

const port = Number(process.env.PORT) || 3000;
migrate()
  .then(() => app.listen(port, "0.0.0.0", () => console.log(`Lumo http://0.0.0.0:${port}`)))
  .catch((e) => { console.error("Migrasyon başarısız", e); process.exit(1); });
