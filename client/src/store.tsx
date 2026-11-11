import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "./api";
import { defProgress, mergeProgress } from "./progress";
import type { Progress, User } from "./types";
import { setSound } from "./speech";

interface Ctx {
  ready: boolean;
  user: User | null;
  progress: Progress;
  setUser: (u: User | null) => void;
  update: (fn: (p: Progress) => Progress) => void;
  logout: () => Promise<void>;
  syncError: boolean;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);
const lsKey = (id: string) => `lumo_progress_${id}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [progress, setProgress] = useState<Progress>(defProgress());
  const [syncError, setSyncError] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(progress); latest.current = progress;
  const userRef = useRef(user); userRef.current = user;

  const hydrate = useCallback(async (u: User) => {
    let local: Partial<Progress> | undefined;
    try { local = JSON.parse(localStorage.getItem(lsKey(u.id)) || "null") || undefined; } catch { /* boş */ }
    let remote: Partial<Progress> | undefined;
    try { remote = (await api.getState()).state; setSyncError(false); } catch { setSyncError(true); }
    const a = mergeProgress(local), b = mergeProgress(remote);
    const best = (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;
    setProgress(best); setSound(best.sound);
    if (best === a && a.updatedAt > b.updatedAt) void api.putState(a).catch(() => {});
  }, []);

  useEffect(() => {
    api.me().then(async ({ user }) => { if (user) { await hydrate(user); setUserState(user); } }).catch(() => {}).finally(() => setReady(true));
  }, [hydrate]);

  const setUser = useCallback((u: User | null) => {
    if (u) hydrate(u).then(() => setUserState(u)); else { setUserState(null); setProgress(defProgress()); }
  }, [hydrate]);

  const push = useCallback(() => {
    const u = userRef.current; if (!u) return;
    api.putState(latest.current).then(() => setSyncError(false)).catch(() => setSyncError(true));
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    setProgress((prev) => {
      const next = { ...fn(prev), updatedAt: Date.now() };
      const u = userRef.current;
      if (u) { try { localStorage.setItem(lsKey(u.id), JSON.stringify(next)); } catch { /* dolu */ } }
      latest.current = next; setSound(next.sound);
      window.clearTimeout(timer.current); timer.current = window.setTimeout(push, 700);
      return next;
    });
  }, [push]);

  useEffect(() => {
    const flush = () => { if (document.visibilityState === "hidden" && userRef.current && timer.current) { window.clearTimeout(timer.current); timer.current = undefined; push(); } };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [push]);

  const logout = useCallback(async () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = undefined; if (userRef.current) await api.putState(latest.current).catch(() => {}); }
    await api.logout().catch(() => {});
    setUserState(null); setProgress(defProgress());
  }, []);

  return <C.Provider value={{ ready, user, progress, setUser, update, logout, syncError }}>{children}</C.Provider>;
}
