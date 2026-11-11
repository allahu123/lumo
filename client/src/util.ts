export const shuffle = <T,>(a: T[], rnd: () => number = Math.random): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
};
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
/** Tohumlu (tekrarlanabilir) rastgelelik: aynı ünite hep aynı sırayı üretir */
export function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const norm = (s: string) =>
  s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[.,!?;:"]/g, "").replace(/\s+/g, " ").trim();
export const dkey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dkey(d); };
export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
