import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { loadCourse, loadTopics, loadVocab } from "./data";
import { Flame } from "./Flame";
import { Book, Check, Lock, Star, Words, Target, Bolt, Trophy, Search, XIcon } from "./icons";
import { doneToday, liveStreak } from "./progress";
import { WeekRow } from "./Streak";
import { useApp } from "./store";
import type { Course, Progress, UnitMeta, Vocab, VocabTopic } from "./types";
import { cx, dkey } from "./util";

export type Start =
  | { type: "unit"; unit: UnitMeta; node: number }
  | { type: "words"; ids: string[]; title: string; unitId?: string; node?: number }
  | { type: "guide"; unit: UnitMeta };

const COLORS = ["#9aeb2d", "#5eead4", "#c4f23d", "#4ade80", "#facc15", "#86efac", "#a3e635", "#2dd4bf"];
const OFFSETS = [0, 58, 0, -58];
export const NODE_LABEL = ["Kelimeler", "Ders 1", "Ders 2", "Ders 3"];

/* ---------------- Öğrenme yolu ---------------- */
export function Learn({ onStart }: { onStart: (s: Start) => void }) {
  const { progress } = useApp();
  const [course, setCourse] = useState<Course | null>(null);
  useEffect(() => { loadCourse().then(setCourse); }, []);
  const curRef = useMemo(() => ({ el: null as HTMLElement | null }), []);
  const [sel, setSel] = useState<string | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  useEffect(() => {
    if (!sel) return;
    const off = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest(".node-row")) setSel(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setSel(null); };
    document.addEventListener("mousedown", off); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", off); document.removeEventListener("keydown", esc); };
  }, [sel]);
  useEffect(() => { if (course) setTimeout(() => document.querySelector(".node.cur")?.scrollIntoView({ block: "center" }), 50); }, [course]);
  if (!course) return <div className="loading"><i className="spin" /></div>;

  let prevDone = true;
  return (
    <div className="path">
      {course.modules.map((m, mi) => {
        const color = COLORS[mi % COLORS.length];
        return (
          <section key={m.module_id} style={{ ["--uc" as string]: color }} className="module">
            <div className="mod-head"><span>BÖLÜM {mi + 1}</span><h2>{m.title_tr}</h2><p>{m.goal_tr}</p></div>
            {m.units.map((u) => {
              const doneN = progress.units[u.unit_id] || 0;
              const unlocked = prevDone; prevDone = doneN >= 4;
              return (
                <div key={u.unit_id} className="unit">
                  <div className="unit-head">
                    <div><small>Ünite {u.order}</small><h3>{u.title_tr}</h3><span className="useg" aria-hidden="true">{[0, 1, 2, 3].map((k) => <i key={k} className={cx(k < doneN && "on")} />)}</span></div>
                    <button className="guide-btn" onClick={() => onStart({ type: "guide", unit: u })}><Book /> Kılavuz</button>
                  </div>
                  <div className="nodes">
                    {[0, 1, 2, 3].map((n) => {
                      const state = !unlocked ? "lock" : n < doneN ? "done" : n === doneN ? "cur" : "lock";
                      const off = OFFSETS[n];
                      const key = `${u.unit_id}:${n}`;
                      return (
                        <div key={n} className="node-row" style={{ transform: `translateX(${off}px)` }}>
                          {state === "cur" && sel !== key && <span className="start-tag">BAŞLA</span>}
                          <button
                            className={cx("node", state, shake === key && "no")} aria-label={`${u.title_tr}: ${NODE_LABEL[n]}`} aria-expanded={sel === key}
                            onClick={() => {
                              setSel(sel === key ? null : key);
                              if (state === "lock") { setShake(key); window.setTimeout(() => setShake(null), 450); }
                            }}
                          >
                            {state === "lock" ? <Lock /> : state === "done" ? <Check /> : n === 0 ? <Words /> : <Star />}
                          </button>
                          <small className="node-cap">{NODE_LABEL[n]}</small>
                          {sel === key && (
                            <div className="pop" role="dialog" aria-label={`${u.title_tr}: ${NODE_LABEL[n]}`}>
                              <small>{NODE_LABEL[n]}</small>
                              <b>{u.title_tr}</b>
                              <p>{state === "lock" ? (unlocked ? "Önce önceki adımı tamamla." : "Önce önceki üniteyi bitir.") : n === 0 ? "Ünitenin kelimelerini çalış." : "Ünitenin gramer alıştırmalarını çöz."}</p>
                              {state !== "lock" && <button className="btn primary wide" onClick={() => { setSel(null); onStart({ type: "unit", unit: u, node: n }); }}>{state === "done" ? "Tekrar et" : "Başla"}</button>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
      <div className="path-end"><Trophy /><p>A1 bitti. A2 yakında.</p></div>
      <span ref={(e) => { curRef.el = e; }} />
    </div>
  );
}

/* ---------------- Kelimeler ---------------- */
export function WordsView({ onStart }: { onStart: (s: Start) => void }) {
  const { progress } = useApp();
  const [topics, setTopics] = useState<VocabTopic[]>([]);
  const [vocab, setVocab] = useState<Vocab[]>([]);
  useEffect(() => { loadTopics().then(setTopics); loadVocab().then(setVocab); }, []);
  const byTopic = useMemo(() => { const m: Record<string, Vocab[]> = {}; vocab.forEach((w) => (m[w.topic] ||= []).push(w)); return m; }, [vocab]);
  const [q, setQ] = useState("");
  const learned = vocab.filter((w) => (progress.words[w.id]?.box || 0) >= 2).length;
  const low = (x: string) => x.toLocaleLowerCase("tr");
  const shown = topics.filter((t) => low(t.title_tr).includes(low(q.trim())));
  const weak = vocab.filter((w) => progress.words[w.id] && progress.words[w.id].box < 3).sort((a, b) => progress.words[a.id].box - progress.words[b.id].box).slice(0, 8);

  const choose = (list: Vocab[]) => {
    const unseen = list.filter((w) => !progress.words[w.id]);
    const rest = list.filter((w) => progress.words[w.id]).sort((a, b) => progress.words[a.id].box - progress.words[b.id].box);
    return [...unseen, ...rest].slice(0, 8).map((w) => w.id);
  };
  return (
    <div className="page">
      <h1 className="page-title">Kelimeler</h1>
      <p className="muted page-sub">{learned} / {vocab.length || 900} kelime öğrenildi</p>
      <button className="wide-card" disabled={weak.length < 4} onClick={() => onStart({ type: "words", ids: weak.map((w) => w.id), title: "Zayıf kelimeler" })}>
        <span className="wc-ic"><Target /></span>
        <span><b>Zayıf kelimeleri çalış</b><small>{weak.length < 4 ? "Birkaç ders yaptıktan sonra açılır" : `${weak.length} kelime seni bekliyor`}</small></span>
      </button>
      <label className="search">
        <Search />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Konu ara" aria-label="Konu ara" />
        {q && <button type="button" className="search-x" onClick={() => setQ("")} aria-label="Temizle"><XIcon /></button>}
      </label>
      <div className="topic-grid">
        {shown.map((t) => {
          const list = byTopic[t.topic] || [];
          const l = list.filter((w) => (progress.words[w.id]?.box || 0) >= 2).length;
          return (
            <button key={t.topic} className="topic" onClick={() => onStart({ type: "words", ids: choose(list), title: t.title_tr })}>
              <b>{t.title_tr}</b>
              <small>{l} / {t.count}</small>
              <div className="bar"><i style={{ width: `${(l / t.count) * 100}%` }} /></div>
            </button>
          );
        })}
        {shown.length === 0 && topics.length > 0 && <p className="muted empty">Eşleşen konu yok.</p>}
      </div>
    </div>
  );
}

/* ---------------- Profil ---------------- */
const AV = ["#9aeb2d", "#5eead4", "#c4f23d", "#4ade80", "#facc15", "#86efac"];
export function Avatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return <span className="av" style={{ width: size, height: size, background: color, fontSize: size * 0.46 }}>{name.trim()[0]?.toUpperCase() || "?"}</span>;
}
export function Profile() {
  const { user, progress, update, logout, setUser } = useApp();
  const [name, setName] = useState(user!.name);
  const [saved, setSaved] = useState(false);
  const learned = Object.values(progress.words).filter((w) => w.box >= 2).length;
  const doneUnits = Object.values(progress.units).filter((n) => n >= 4).length;
  const save = async (b: { name?: string; color?: string }) => {
    try { const { user: u } = await api.patchMe(b); setUser(u); setSaved(true); setTimeout(() => setSaved(false), 1500); } catch { /* sessiz */ }
  };
  return (
    <div className="page">
      <div className="idcard">
        <Avatar name={user!.name} color={user!.color} size={84} />
        <div><h1>{user!.name}</h1><p className="muted">{user!.email}</p></div>
      </div>
      <div className="stat-grid">
        <div className="stat"><Flame state={liveStreak(progress) ? "lit" : "off"} size={34} /><b>{liveStreak(progress)}</b><small>Günlük seri</small></div>
        <div className="stat"><span className="si"><Bolt /></span><b>{progress.xp}</b><small>Toplam XP</small></div>
        <div className="stat"><span className="si"><Book /></span><b>{learned}</b><small>Öğrenilen kelime</small></div>
        <div className="stat"><span className="si"><Trophy /></span><b>{doneUnits}</b><small>Biten ünite</small></div>
      </div>
      <h3 className="sec">Ayarlar</h3>
      <div className="card-list">
        <div className="row"><div><b>Adın</b></div><div className="inline"><input className="txt" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} /><button className="btn small primary" disabled={name.trim().length < 2 || name === user!.name} onClick={() => save({ name })}>{saved ? "Kaydedildi" : "Kaydet"}</button></div></div>
        <div className="row"><div><b>Avatar rengi</b></div><div className="sw">{AV.map((c) => <button key={c} aria-label={c} className={cx(user!.color === c && "on")} style={{ background: c }} onClick={() => save({ color: c })} />)}</div></div>
        <div className="row"><div><b>Günlük hedef</b><small>Bir günde kazanmak istediğin XP</small></div>
          <div className="segm">{[10, 20, 30, 50].map((g) => <button key={g} className={cx(progress.goal === g && "on")} onClick={() => update((p) => ({ ...p, goal: g }))}>{g}</button>)}</div></div>
        <div className="row"><div><b>Ses efektleri</b></div><button className={cx("toggle", progress.sound && "on")} role="switch" aria-checked={progress.sound} onClick={() => update((p) => ({ ...p, sound: !p.sound }))} /></div>
      </div>
      <button className="btn ghost-danger wide" style={{ marginTop: 22 }} onClick={() => logout()}>Çıkış yap</button>
    </div>
  );
}

/* ---------------- Sağ panel ---------------- */
export function SidePanel({ progress }: { progress: Progress }) {
  const { update } = useApp();
  const s = liveStreak(progress);
  const today = progress.days[dkey()]?.xp || 0;
  const pct = Math.min(100, Math.round((today / progress.goal) * 100));
  return (
    <aside className="side-right">
      <div className="panel">
        <div className="streak-top">
          <Flame state={doneToday(progress) ? "lit" : "off"} size={64} />
          <div><b className="big-n">{s}</b><span>günlük seri</span></div>
        </div>
        <WeekRow p={progress} />
        {!doneToday(progress) && <p className="muted tiny">{s ? "Seriyi korumak için bugün bir ders yap." : "Bir ders yap, serin başlasın."}</p>}
      </div>
      <div className="panel">
        <h3>Günlük hedef</h3>
        <div className="goal"><span className="ring" style={{ ["--p" as string]: pct }}><b>{pct}%</b></span><p><b>{today}</b> / {progress.goal} XP</p></div>
        <div className="goal-set" role="group" aria-label="Günlük hedef">{[10, 20, 30, 50].map((g) => <button key={g} type="button" className={cx(progress.goal === g && "on")} aria-pressed={progress.goal === g} onClick={() => update((p) => ({ ...p, goal: g }))}>{g}</button>)}</div>
      </div>
    </aside>
  );
}
