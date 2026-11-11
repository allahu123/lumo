import { useCallback, useEffect, useState } from "react";
import { Eyes, Splash } from "./Brand";
import { Auth } from "./Auth";
import { vocabLesson, unitLesson } from "./build";
import { loadUnit, loadVocab } from "./data";
import { Flame } from "./Flame";
import { Path, User as UserIcon, Words as WordsIcon } from "./icons";
import { LessonPlayer, type LessonResult } from "./Lesson";
import { applyLesson, doneToday, liveStreak } from "./progress";
import { StreakScreen, Summary } from "./Streak";
import { useApp } from "./store";
import type { Ex, Lesson, Progress } from "./types";
import { Avatar, Learn, NODE_LABEL, Profile, SidePanel, WordsView, type Start } from "./Views";
import { cx } from "./util";

interface Active { title: string; ex: Ex[]; guide?: Lesson; unit?: { id: string; node: number } }

export default function App() {
  const { ready } = useApp();
  const [minDone, setMinDone] = useState(false);
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");
  useEffect(() => { const t = setTimeout(() => setMinDone(true), 1300); return () => clearTimeout(t); }, []);
  useEffect(() => {
    if (!(ready && minDone)) return;
    setPhase("out");
    const t = setTimeout(() => setPhase("gone"), 500);
    return () => clearTimeout(t);
  }, [ready, minDone]);
  return <>{ready && <Root />}{phase !== "gone" && <Splash out={phase === "out"} />}</>;
}

function Root() {
  const { user, progress, update } = useApp();
  const [tab, setTab] = useState<"learn" | "words" | "me">("learn");
  const [active, setActive] = useState<Active | null>(null);
  const [stage, setStage] = useState<null | { r: LessonResult; extended: boolean; after: Progress }>(null);
  const [showStreak, setShowStreak] = useState(false);
  const [guideOnly, setGuideOnly] = useState<{ title: string; guide: Lesson } | null>(null);
  const [busy, setBusy] = useState(false);

  const start = useCallback(async (s: Start) => {
    if (busy) return;
    setBusy(true);
    try {
      if (s.type === "guide") {
        const u = await loadUnit(s.unit.file); setGuideOnly({ title: s.unit.title_tr, guide: u.lesson });
      } else if (s.type === "words") {
        const all = await loadVocab();
        const words = s.ids.map((id) => all.find((w) => w.id === id)!).filter(Boolean);
        setActive({ title: s.title, ex: vocabLesson(words, all), unit: s.unitId ? { id: s.unitId, node: s.node ?? 0 } : undefined });
      } else {
        const { unit, node } = s;
        if (node === 0) {
          const all = await loadVocab();
          const pool = all.filter((w) => unit.related_vocab_topics.includes(w.topic));
          const unseen = pool.filter((w) => !progress.words[w.id]);
          const rest = pool.filter((w) => progress.words[w.id]).sort((a, b) => progress.words[a.id].box - progress.words[b.id].box);
          const words = [...unseen, ...rest].slice(0, 8);
          setActive({ title: `${unit.title_tr} · Kelimeler`, ex: vocabLesson(words, all), unit: { id: unit.unit_id, node } });
        } else {
          const data = await loadUnit(unit.file);
          setActive({ title: `${unit.title_tr} · ${NODE_LABEL[node]}`, ex: unitLesson(data, node - 1), guide: node === 1 && (progress.units[unit.unit_id] || 0) <= 1 ? data.lesson : undefined, unit: { id: unit.unit_id, node } });
        }
      }
    } finally { setBusy(false); }
  }, [busy, progress]);

  const complete = (r: LessonResult) => {
    const a = active!;
    let out: { next: Progress; extended: boolean } | null = null;
    update((p) => {
      out = applyLesson(p, r.xp, r.wordResults);
      if (a.unit) { const cur = p.units[a.unit.id] || 0; if (a.unit.node === cur) out.next.units = { ...p.units, [a.unit.id]: cur + 1 }; }
      return out.next;
    });
    setActive(null);
    setStage({ r, extended: out!.extended, after: out!.next });
  };

  if (!user) return <Auth />;

  if (guideOnly) return <LessonPlayer title={guideOnly.title} exercises={[]} guide={guideOnly.guide} onExit={() => setGuideOnly(null)} onComplete={() => setGuideOnly(null)} />;
  if (active) return <LessonPlayer key={active.title + active.ex.length} title={active.title} exercises={active.ex} guide={active.guide} onExit={() => setActive(null)} onComplete={complete} />;
  if (stage && !showStreak) return <Summary xp={stage.r.xp} accuracy={stage.r.accuracy} seconds={stage.r.seconds} onNext={() => (stage.extended ? setShowStreak(true) : setStage(null))} />;
  if (stage && showStreak) return <StreakScreen progress={progress} onClose={() => { setShowStreak(false); setStage(null); }} />;

  const s = liveStreak(progress);
  return (
    <div className="shell">
      <nav className="side">
        <div className="brand sm"><Eyes height={36} /></div>
        <button className={cx("nav", tab === "learn" && "on")} onClick={() => setTab("learn")}><Path /><span>Öğren</span></button>
        <button className={cx("nav", tab === "words" && "on")} onClick={() => setTab("words")}><WordsIcon /><span>Kelimeler</span></button>
        <button className={cx("nav", tab === "me" && "on")} onClick={() => setTab("me")}><UserIcon /><span>Profil</span></button>
      </nav>
      <main className="main">
        <div className="mtop">
          <span className="chip"><Flame state={doneToday(progress) ? "lit" : "off"} size={22} /><b>{s}</b></span>
          <span className="chip xp"><b>{progress.xp}</b> XP</span>
          <button className="mtop-av" onClick={() => setTab("me")}><Avatar name={user.name} color={user.color} size={32} /></button>
        </div>
        {tab === "learn" && <Learn onStart={start} />}
        {tab === "words" && <WordsView onStart={start} />}
        {tab === "me" && <Profile />}
      </main>
      <SidePanel progress={progress} />
    </div>
  );
}
