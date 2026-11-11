import type { Progress } from "./types";
import { dkey, yesterdayKey } from "./util";

export const defProgress = (): Progress => ({
  v: 1, updatedAt: 0, xp: 0, streak: 0, best: 0, lastDay: null, days: {}, units: {}, words: {}, goal: 20, sound: true,
});

export const mergeProgress = (p: Partial<Progress> | undefined): Progress => ({ ...defProgress(), ...(p || {}) });

/** Bugün dersten önce seri hâlâ yaşıyor mu? (dün veya bugün ders varsa) */
export function liveStreak(p: Progress) {
  if (!p.lastDay) return 0;
  return p.lastDay === dkey() || p.lastDay === yesterdayKey() ? p.streak : 0;
}
export const doneToday = (p: Progress) => p.lastDay === dkey();

export function applyLesson(p: Progress, xp: number, wordResults: Record<string, boolean>) {
  const today = dkey();
  const next: Progress = { ...p, days: { ...p.days }, words: { ...p.words }, xp: p.xp + xp, updatedAt: Date.now() };
  const d = next.days[today] || { xp: 0, lessons: 0 };
  next.days[today] = { xp: d.xp + xp, lessons: d.lessons + 1 };
  let extended = false;
  if (p.lastDay !== today) {
    next.streak = p.lastDay === yesterdayKey() ? p.streak + 1 : 1;
    next.lastDay = today;
    next.best = Math.max(next.best, next.streak);
    extended = true;
  }
  for (const [id, ok] of Object.entries(wordResults)) {
    const s = next.words[id] || { box: 0, seen: 0, wrong: 0 };
    next.words[id] = { box: ok ? Math.min(5, s.box + 1) : Math.max(0, s.box - 1), seen: s.seen + 1, wrong: s.wrong + (ok ? 0 : 1) };
  }
  return { next, extended };
}
