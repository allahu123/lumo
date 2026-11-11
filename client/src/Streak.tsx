import { useEffect, useState } from "react";
import { Flame } from "./Flame";
import { Check } from "./icons";
import { sfx } from "./speech";
import type { Progress } from "./types";
import { cx, dkey } from "./util";

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
/** Bu haftanın 7 günü (Pzt başlangıçlı). */
export function weekDays(p: Progress) {
  const now = new Date(); const dow = (now.getDay() + 6) % 7;
  return DAYS.map((label, i) => {
    const d = new Date(now); d.setDate(now.getDate() - dow + i);
    const k = dkey(d);
    return { label, key: k, on: (p.days[k]?.lessons || 0) > 0, today: k === dkey(now), future: i > dow };
  });
}
export function WeekRow({ p }: { p: Progress }) {
  return (
    <div className="week">
      {weekDays(p).map((d) => (
        <div key={d.key} className={cx("wd", d.on && "on", d.today && "today", d.future && "future")}>
          <span className="dot">{d.on && <svg viewBox="0 0 24 24"><path d="M5 12.500l4.500 4.500L19 7.500" /></svg>}</span><small>{d.label}</small>
        </div>
      ))}
    </div>
  );
}

/** Seri bugün uzadığında gösterilen kutlama ekranı. Alev yalnızca bir kez yanar. */
export function StreakScreen({ progress, onClose }: { progress: Progress; onClose: () => void }) {
  const target = progress.streak;
  const [n, setN] = useState(Math.max(0, target - 1));
  useEffect(() => {
    sfx.streak();
    const t = setTimeout(() => setN(target), 700);
    return () => clearTimeout(t);
  }, [target]);
  return (
    <div className="streak-screen">
      <div className="ss-body">
        <Flame state="ignite" size={190} />
        <div className="ss-num" key={n}>{n}</div>
        <h1>{target === 1 ? "gün seri başladı!" : "günlük seri!"}</h1>
        <p className="muted">{target === 1 ? "Yarın da gel, alevi söndürme." : "Böyle devam. Alev her gün biraz daha büyüyor."}</p>
        <div className="ss-week"><WeekRow p={progress} /></div>
      </div>
      <div className="ss-foot"><button className="btn primary wide big" onClick={onClose}>Devam</button></div>
    </div>
  );
}

export function Summary({ xp, accuracy, seconds, onNext }: { xp: number; accuracy: number; seconds: number; onNext: () => void }) {
  useEffect(() => { sfx.done(); }, []);
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return (
    <div className="summary">
      <div className="sum-body">
        <div className="sum-badge"><Check /></div>
        <h1>Ders tamam!</h1>
        <div className="sum-stats">
          <div className="ss xp"><small>TOPLAM XP</small><b>{xp}</b></div>
          <div className="ss acc"><small>DOĞRULUK</small><b>{accuracy}%</b></div>
          <div className="ss time"><small>SÜRE</small><b>{m}:{String(s).padStart(2, "0")}</b></div>
        </div>
      </div>
      <div className="ss-foot"><button className="btn primary wide big" onClick={onNext}>Devam</button></div>
    </div>
  );
}
