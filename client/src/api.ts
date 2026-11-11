import type { Progress, User } from "./types";

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method, credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Bir şeyler ters gitti. Tekrar dene.");
  return data as T;
}
export const api = {
  me: () => req<{ user: User | null }>("GET", "/api/me"),
  register: (b: { name: string; email: string; password: string }) => req<{ user: User }>("POST", "/api/auth/register", b),
  login: (b: { email: string; password: string }) => req<{ user: User }>("POST", "/api/auth/login", b),
  logout: () => req<{ ok: true }>("POST", "/api/auth/logout"),
  getState: () => req<{ state: Partial<Progress> }>("GET", "/api/state"),
  putState: (state: Progress) => req<{ ok: true }>("PUT", "/api/state", { state }),
  patchMe: (b: { name?: string; color?: string }) => req<{ user: User }>("PATCH", "/api/me", b),
};
