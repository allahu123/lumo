import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WordImg } from "./WordImg";
import type { Ex, Lesson as GuideData } from "./types";
import { Arrange } from "./Arrange";
import { Check, Snail, Speaker, XIcon } from "./icons";
import { sfx, speak } from "./speech";
import { cx, norm, shuffle } from "./util";

export interface LessonResult { xp: number; accuracy: number; seconds: number; wordResults: Record<string, boolean> }
interface Props {
  title: string;
  exercises: Ex[];
  guide?: GuideData;
  onExit: () => void;
  onComplete: (r: LessonResult) => void;
}

/** Her soru tipi, cevabın hazır olup olmadığını ve doğruluğunu bu şekilde bildirir. */
interface Ans { ready: boolean; correct: boolean; shown?: string }
const none: Ans = { ready: false, correct: false };

export function LessonPlayer({ title, exercises, guide, onExit, onComplete }: Props) {
  const [step, setStep] = useState<"guide" | "play">(guide ? "guide" : "play");
  const [queue, setQueue] = useState<Ex[]>(exercises);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Ans>(none);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [askQuit, setAskQuit] = useState(false);
  const started = useRef(Date.now());
  const wordRes = useRef<Record<string, boolean>>({});
  const total = exercises.length;
  const ex = queue[i];

  const onAns = useCallback((a: Ans) => setAns(a), []);

  const check = () => {
    if (!ans.ready || checked) return;
    setChecked(true);
    if (ans.correct) {
      sfx.ok(); setDone((d) => d + 1);
      if (ex.kind !== "match" && ex.kind !== "type" && "wordId" in ex && ex.wordId && !(ex.wordId in wordRes.current)) wordRes.current[ex.wordId] = true;
    } else {
      sfx.bad(); setWrongCount((w) => w + 1);
      if ("wordId" in ex && ex.wordId) wordRes.current[ex.wordId] = false;
      setQueue((q) => [...q, ex]); // yanlış yapılan, doğru bilinene kadar sona eklenir
    }
  };
  const next = () => {
    if (i + 1 >= queue.length) {
      const acc = Math.max(0, Math.round((total / (total + wrongCount)) * 100));
      onComplete({ xp: Math.max(10, total * 2 + Math.round(acc / 10)), accuracy: acc, seconds: Math.round((Date.now() - started.current) / 1000), wordResults: wordRes.current });
      return;
    }
    setI(i + 1); setChecked(false); setAns(none);
  };
  const primary = () => (checked ? next() : check());

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (askQuit) return;
      if (e.key === "Enter") {
        const t = e.target as HTMLElement;
        if (t.tagName === "BUTTON" && t.closest(".opts,.tile,.mbtn")) return; // buton kendi Enter'ını yönetir
        e.preventDefault(); if (step === "guide") setStep("play"); else primary();
      }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  const praise = ["Harika!", "Süper!", "Mükemmel!", "Tam isabet!", "Çok iyi!"][(i * 7 + done) % 5];
  if (step === "guide" && guide) return <Guide title={title} guide={guide} onStart={() => setStep("play")} onExit={onExit} />;

  const feedbackText = !checked ? "" : ans.correct ? "" : ans.shown || "";

  return (
    <div className="lesson" role="dialog" aria-label={title}>
      <header className="l-top">
        <button className="icon-btn" onClick={() => setAskQuit(true)} aria-label="Dersten çık"><XIcon /></button>
        <div className="pbar" role="progressbar" aria-valuenow={done} aria-valuemax={total}><i style={{ width: `${(done / total) * 100}%` }} /></div>
      </header>
      <main className="l-body">
        <div className="l-in" key={`${i}-${ex.id}`}>
          {ex.kind === "choice" && <Choice ex={ex} checked={checked} onAns={onAns} />}
          {ex.kind === "arrange" && <ArrangeQ ex={ex} checked={checked} onAns={onAns} />}
          {ex.kind === "type" && <TypeQ ex={ex} checked={checked} onAns={onAns} onEnter={primary} />}
          {ex.kind === "match" && <Match ex={ex} onAns={onAns} />}
        </div>
      </main>
      <footer className={cx("l-foot", checked && (ans.correct ? "ok" : "bad"))}>
        <div className="l-foot-in">
          {checked && (
            <div className="fb" role="status">
              <span className={cx("fb-ic", ans.correct ? "ok" : "bad")}>{ans.correct ? <Check /> : <XIcon />}</span>
              <div>
                <b>{ans.correct ? praise : "Tam olmadı"}</b>
                {!ans.correct && feedbackText && <p className="fb-ans"><em>Doğru cevap:</em> {feedbackText}</p>}
                {ex.explain && (!ans.correct || "wordId" in ex) && <p className="fb-exp">{ex.explain}</p>}
              </div>
            </div>
          )}
          <button className={cx("btn", checked ? (ans.correct ? "primary" : "danger") : "primary")} onClick={primary} disabled={!checked && !ans.ready}>
            {checked ? "Devam" : "Kontrol et"}
          </button>
        </div>
      </footer>
      {askQuit && (
        <div className="modal" onClick={() => setAskQuit(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Şimdi çıkarsan bu dersin ilerlemesi kaybolur.</h2>
            <button className="btn primary wide" onClick={() => setAskQuit(false)}>Derse devam et</button>
            <button className="btn ghost-danger wide" onClick={onExit}>Çık</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Kural kartı ---------------- */
function Guide({ title, guide, onStart, onExit }: { title: string; guide: GuideData; onStart: () => void; onExit: () => void }) {
  return (
    <div className="lesson">
      <header className="l-top"><button className="icon-btn" onClick={onExit} aria-label="Kapat"><XIcon /></button><h1 className="l-title">{title}</h1></header>
      <main className="l-body"><div className="l-in guide">
        <p className="g-goal">{guide.goal_tr}</p>
        {guide.sections.map((s) => (
          <section key={s.heading_tr} className="g-sec">
            <h3>{s.heading_tr}</h3>
            <p>{s.explanation_tr}</p>
            {s.examples.map((e) => (
              <button key={e.en} className="g-ex" onClick={() => speak(e.en)}>
                <Speaker /><span><b>{e.en}</b><small>{e.tr}</small></span>
              </button>
            ))}
          </section>
        ))}
        {guide.key_patterns.length > 0 && (
          <section className="g-sec"><h3>Kalıplar</h3>
            {guide.key_patterns.map((k) => (
              <button key={k.pattern} className="g-pat" onClick={() => speak(k.example_en)}>
                <code>{k.pattern}</code><span>{k.example_en} <small>· {k.example_tr}</small></span>
              </button>
            ))}
          </section>
        )}
        {guide.turkish_speaker_tips_tr.length > 0 && (
          <section className="g-sec tips"><h3>Türkçe konuşanlar için</h3><ul>{guide.turkish_speaker_tips_tr.map((t) => <li key={t}>{t}</li>)}</ul></section>
        )}
        {guide.common_mistakes.length > 0 && (
          <section className="g-sec"><h3>Sık yapılan hatalar</h3>
            {guide.common_mistakes.map((m) => (
              <div key={m.wrong} className="g-mis"><p className="w"><XIcon />{m.wrong}</p><p className="r"><Check />{m.correct}</p><small>{m.note_tr}</small></div>
            ))}
          </section>
        )}
      </div></main>
      <footer className="l-foot"><div className="l-foot-in end"><button className="btn primary" onClick={onStart}>Başla</button></div></footer>
    </div>
  );
}

/* ---------------- Ortak parçalar ---------------- */
function SpeakBtn({ text, big = false }: { text: string; big?: boolean }) {
  return (
    <span className={cx("spk-wrap", big && "big")}>
      <button type="button" className="spk" onClick={() => speak(text)} aria-label="Dinle"><Speaker /></button>
      {big && <button type="button" className="spk slow" onClick={() => speak(text, true)} aria-label="Yavaş dinle"><Snail /></button>}
    </span>
  );
}
function Bubble({ children, speakText }: { children?: React.ReactNode; speakText?: string }) {
  return (
    <div className="talk">
      <div className="bubble">{speakText && <SpeakBtn text={speakText} />}<span>{children}</span></div>
    </div>
  );
}

/* ---------------- Çoktan seçmeli / boşluk doldurma ---------------- */
function Choice({ ex, checked, onAns }: { ex: Extract<Ex, { kind: "choice" }>; checked: boolean; onAns: (a: Ans) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { if (ex.speak) { const t = setTimeout(() => speak(ex.speak!), 250); return () => clearTimeout(t); } }, [ex]);
  const choose = (o: string) => { if (checked) return; setSel(o); sfx.tap(); onAns({ ready: true, correct: norm(o) === norm(ex.answer), shown: ex.answer }); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= ex.options.length && !(e.target as HTMLElement).matches("input,textarea")) choose(ex.options[n - 1]); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  const listen = ex.hideHeading && ex.speak;
  const parts = ex.sentence?.split("___");
  return (
    <>
      <h2 className="q-title">{ex.instruction}</h2>
      {ex.showImg && ex.wordId && !listen && <WordImg id={ex.wordId} />}
      {listen ? (
        <div className="listen"><SpeakBtn text={ex.speak!} big /></div>
      ) : ex.sentence && parts ? (
        <div className="sent-card">
          <p className="sent">{parts[0]}<span className={cx("blank", sel && "on", checked && (norm(sel || "") === norm(ex.answer) ? "right" : "wrong"))}>{sel || " "}</span>{parts[1]}</p>
          {ex.sub && <small>{ex.sub}</small>}
        </div>
      ) : ex.heading && !ex.hideHeading ? (
        <div className="hd">{ex.speak && <SpeakBtn text={ex.speak} />}<p>{ex.heading}</p></div>
      ) : null}
      <div className="opts" role="listbox">
        {ex.options.map((o, n) => {
          const right = checked && norm(o) === norm(ex.answer);
          const wrong = checked && sel === o && !right;
          return (
            <button key={o} role="option" aria-selected={sel === o} disabled={checked}
              className={cx("opt", sel === o && !checked && "sel", right && "right", wrong && "wrong")} onClick={() => choose(o)}>
              <kbd>{n + 1}</kbd><span>{o}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Kelime dizme ---------------- */
function ArrangeQ({ ex, checked, onAns }: { ex: Extract<Ex, { kind: "arrange" }>; checked: boolean; onAns: (a: Ans) => void }) {
  const [words, setWords] = useState<string[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => { if (ex.speak && ex.listen) { const t = setTimeout(() => speak(ex.speak!), 350); return () => clearTimeout(t); } }, [ex]);
  const accepted = useMemo(() => ex.answers.map(norm), [ex]);
  const onChange = useCallback((w: string[], tid: number[]) => {
    setWords(w); setIds(tid);
    onAns(w.length ? { ready: true, correct: accepted.includes(norm(w.join(" "))), shown: ex.answers[0] } : none);
  }, [accepted, ex, onAns]);

  // Kontrol sonrası, hangi kartın yanlış olduğunu en yakın kabul edilen cevaba göre işaretle.
  const marks = useMemo(() => {
    if (!checked) return undefined;
    const have = words.map(norm);
    if (accepted.includes(have.join(" "))) return undefined;
    let best = accepted[0].split(" "), bestScore = -1;
    for (const a of accepted) { const w = a.split(" "); const s = w.filter((x, k) => x === have[k]).length; if (s > bestScore) { bestScore = s; best = w; } }
    const m: Record<number, "ok" | "bad"> = {};
    ids.forEach((id, k) => { m[id] = have[k] === best[k] ? "ok" : "bad"; });
    return m;
  }, [checked, words, ids, accepted]);

  return (
    <>
      <h2 className="q-title">{ex.instruction}</h2>
      <div className="talk">
        <div className="bubble">
          {ex.listen ? <SpeakBtn text={ex.speak!} big /> : (
            <>{ex.promptLang === "en" && ex.speak && <SpeakBtn text={ex.speak} />}<span>{ex.prompt}</span></>
          )}
        </div>
      </div>
      <Arrange bank={ex.bank} resetKey={ex.id} locked={checked} marks={marks} onChange={onChange} />
    </>
  );
}

/* ---------------- Yazarak çeviri ---------------- */
function TypeQ({ ex, checked, onAns, onEnter }: { ex: Extract<Ex, { kind: "type" }>; checked: boolean; onAns: (a: Ans) => void; onEnter: () => void }) {
  const [v, setV] = useState("");
  const accepted = useMemo(() => ex.answers.map(norm), [ex]);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const ok = checked && accepted.includes(norm(v));
  return (
    <>
      <h2 className="q-title">{ex.instruction}</h2>
      <Bubble>{ex.prompt}</Bubble>
      <textarea ref={ref} className={cx("type-in", checked && (ok ? "right" : "wrong"))} rows={3} value={v} disabled={checked}
        placeholder="İngilizce yaz" autoCapitalize="off" autoCorrect="off" spellCheck={false} lang="en"
        onChange={(e) => { setV(e.target.value); onAns(e.target.value.trim() ? { ready: true, correct: accepted.includes(norm(e.target.value)), shown: ex.answers[0] } : none); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); onEnter(); } }} />
    </>
  );
}

/* ---------------- Eşleştirme ---------------- */
function Match({ ex, onAns }: { ex: Extract<Ex, { kind: "match" }>; onAns: (a: Ans) => void }) {
  const left = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ t: p.en, i }))), [ex]);
  const right = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ t: p.tr, i }))), [ex]);
  const [a, setA] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [bad, setBad] = useState<{ l: number; r: number } | null>(null);
  const pickL = (i: number) => { if (matched.includes(i) || bad) return; sfx.tap(); speak(ex.pairs[i].en); setA(i); };
  const pickR = (j: number) => {
    if (a === null || matched.includes(j) || bad) return;
    if (a === j) {
      sfx.ok(); const m = [...matched, j]; setMatched(m); setA(null);
      if (m.length === ex.pairs.length) onAns({ ready: true, correct: true });
    } else { sfx.bad(); setBad({ l: a, r: j }); setTimeout(() => { setBad(null); setA(null); }, 520); }
  };
  useEffect(() => { onAns(none); }, [ex, onAns]);
  return (
    <>
      <h2 className="q-title">{ex.instruction}</h2>
      <div className="match">
        <div>{left.map((p) => (
          <button key={p.i} className={cx("mbtn", a === p.i && "sel", matched.includes(p.i) && "done", bad?.l === p.i && "bad")} onClick={() => pickL(p.i)} disabled={matched.includes(p.i)}>{p.t}</button>
        ))}</div>
        <div>{right.map((p) => (
          <button key={p.i} className={cx("mbtn", matched.includes(p.i) && "done", bad?.r === p.i && "bad")} onClick={() => pickR(p.i)} disabled={matched.includes(p.i)}>{p.t}</button>
        ))}</div>
      </div>
    </>
  );
}
