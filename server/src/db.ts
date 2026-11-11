import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL tanımlı değil. Railway'de Postgres ekleyip değişkeni bağla.");
  process.exit(1);
}

// Railway'in iç ağı (…railway.internal) SSL istemez; dışarıdan bağlanırsan istenir.
const needsSsl = !/localhost|127\.0\.0\.1|railway\.internal/.test(url) && process.env.PGSSL !== "off";
export const pool = new pg.Pool({
  connectionString: url,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

export async function migrate() {
  await pool.query(`
    create table if not exists users (
      id bigserial primary key,
      email text not null unique,
      name text not null,
      pw_hash text not null,
      color text not null default '#58cc02',
      created_at timestamptz not null default now()
    );
    create table if not exists sessions (
      token_hash text primary key,
      user_id bigint not null references users(id) on delete cascade,
      expires_at timestamptz not null
    );
    create index if not exists sessions_user_idx on sessions(user_id);
    create table if not exists progress (
      user_id bigint primary key references users(id) on delete cascade,
      state jsonb not null default '{}'::jsonb,
      updated_at timestamptz not null default now()
    );
  `);
}
