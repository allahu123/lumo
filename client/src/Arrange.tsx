import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { sfx } from "./speech";

/* Kelime dizme.
   Kartlar bir "üst katmanda" mutlak konumlanır; hedef konumları görünmez yer tutucuların
   (alttaki boş yuvalar / üstteki satır) ölçülmüş yerleridir. Kart değişince sadece transform
   değişir -> yumuşak uçuş animasyonu, sayfa zıplamaz.

   Etkileşim:
   - Dokun/tıkla: kart cevaba uçar, tekrar dokununca geri döner.
   - Tut-sürükle-bırak: kartı cevap satırına bırak, sıra yerini parmağınla belirle
     (diğer kartlar canlı olarak kayar). Cevaptaki kartı alta sürükleyip bırakırsan geri döner.
   - Klavye: odaklı karta Enter/Boşluk. */
interface Pos { x: number; y: number; w: number; h: number }
interface Drag { id: number; x: number; y: number }
export interface ArrangeProps {
  bank: string[];
  resetKey: string;
  locked: boolean;
  /** kontrol sonrası: her yerleştirilmiş kartın doğru/yanlış durumu */
  marks?: Record<number, "ok" | "bad">;
  onChange: (words: string[], tileIds: number[]) => void;
}
const MOVE_THRESHOLD = 6;

export function Arrange({ bank, resetKey, locked, marks, onChange }: ArrangeProps) {
  const [placed, setPlaced] = useState<number[]>([]);
  const [pos, setPos] = useState<Record<number, Pos>>({});
  const [anim, setAnim] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const answer = useRef<HTMLDivElement>(null);
  const slots = useRef<Record<number, HTMLElement | null>>({});
  const phs = useRef<Record<number, HTMLElement | null>>({});
  const gesture = useRef<{ id: number; sx: number; sy: number; offX: number; offY: number; moved: boolean } | null>(null);

  useEffect(() => { setPlaced([]); setAnim(false); setDrag(null); gesture.current = null; }, [resetKey]);

  const measure = useCallback(() => {
    const r = root.current; if (!r) return;
    const rb = r.getBoundingClientRect();
    const next: Record<number, Pos> = {};
    bank.forEach((_, id) => {
      const el = placed.includes(id) ? phs.current[id] : slots.current[id];
      if (!el) return;
      const b = el.getBoundingClientRect();
      next[id] = { x: Math.round(b.left - rb.left), y: Math.round(b.top - rb.top), w: Math.round(b.width), h: Math.round(b.height) };
    });
    setPos(next);
  }, [bank, placed]);

  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    if (anim) return;
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    return () => cancelAnimationFrame(t);
  }, [anim, bank]);
  useEffect(() => {
    const r = root.current; if (!r || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => measure()); ro.observe(r);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => { onChange(placed.map((i) => bank[i]), placed); /* eslint-disable-next-line */ }, [placed]);

  const toggle = (id: number) => {
    if (locked) return;
    sfx.tap();
    setPlaced((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  /* Sürüklenen kartın cevap satırında hangi sıraya gireceğini, diğer kartların yerine göre bulur. */
  const insertIndex = (others: number[], cx: number, cy: number) => {
    for (let k = 0; k < others.length; k++) {
      const el = phs.current[others[k]]; if (!el) continue;
      const r = el.getBoundingClientRect();
      if (cy < r.top) return k;                                   // kart bu satırın üstünde kaldı
      if (cy <= r.bottom && cx < r.left + r.width / 2) return k;  // aynı satırda, ortanın solunda
    }
    return others.length;
  };

  const down = (e: React.PointerEvent<HTMLButtonElement>, id: number) => {
    if (locked || (e.pointerType === "mouse" && e.button !== 0)) return;
    const p = pos[id]; const rb = root.current?.getBoundingClientRect(); if (!p || !rb) return;
    gesture.current = { id, sx: e.clientX, sy: e.clientY, offX: e.clientX - (rb.left + p.x), offY: e.clientY - (rb.top + p.y), moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* eski tarayıcı */ }
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>, id: number) => {
    const g = gesture.current; if (!g || g.id !== id) return;
    if (!g.moved) {
      if (Math.hypot(e.clientX - g.sx, e.clientY - g.sy) < MOVE_THRESHOLD) return;
      g.moved = true; sfx.tap();
    }
    const rb = root.current!.getBoundingClientRect();
    setDrag({ id, x: e.clientX - rb.left - g.offX, y: e.clientY - rb.top - g.offY });
    const ar = answer.current!.getBoundingClientRect();
    const inside = e.clientX >= ar.left - 12 && e.clientX <= ar.right + 12 && e.clientY >= ar.top - 12 && e.clientY <= ar.bottom + 14;
    setPlaced((prev) => {
      const without = prev.filter((x) => x !== id);
      if (!inside) return prev.includes(id) ? without : prev;
      const idx = insertIndex(without, e.clientX, e.clientY);
      const next = [...without.slice(0, idx), id, ...without.slice(idx)];
      return next.length === prev.length && next.every((v, i) => v === prev[i]) ? prev : next;
    });
  };
  const up = (e: React.PointerEvent<HTMLButtonElement>, id: number) => {
    const g = gesture.current; if (!g || g.id !== id) return;
    gesture.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* boş */ }
    if (g.moved) { setDrag(null); sfx.tap(); } else toggle(id);
  };
  const cancel = () => { gesture.current = null; setDrag(null); };

  return (
    <div className={`arr${drag ? " dragging" : ""}`} ref={root} data-ready={Object.keys(pos).length === bank.length}>
      <div className="arr-answer" ref={answer} aria-label="Cevabın">
        {placed.map((id) => (
          <span key={id} className="tile-ph" ref={(el) => { phs.current[id] = el; }}>{bank[id]}</span>
        ))}
      </div>
      <div className="arr-bank">
        {bank.map((w, id) => (
          <span key={id} className="slot" ref={(el) => { slots.current[id] = el; }}><span className="tile-ph">{w}</span></span>
        ))}
      </div>
      <div className="arr-layer">
        {bank.map((w, id) => {
          const p = pos[id];
          const inAns = placed.includes(id);
          const dragging = drag?.id === id;
          const m = inAns && marks ? marks[id] : undefined;
          const t = dragging ? { x: drag!.x, y: drag!.y } : p;
          return (
            <button
              key={id} type="button" disabled={locked && !inAns}
              className={`tile${inAns ? " placed" : ""}${m ? " " + m : ""}${anim ? " anim" : ""}${dragging ? " drag" : ""}`}
              style={t && p ? { transform: `translate(${t.x}px,${t.y}px)`, width: p.w, height: p.h } : { opacity: 0 }}
              onPointerDown={(e) => down(e, id)} onPointerMove={(e) => move(e, id)}
              onPointerUp={(e) => up(e, id)} onPointerCancel={cancel}
              onClick={(e) => { if (e.detail === 0) toggle(id); }}   // yalnızca klavye (fare/dokunma pointer olaylarında işlenir)
              onContextMenu={(e) => e.preventDefault()}
              aria-label={inAns ? `${w}, kaldır` : `${w}, ekle`}
            >
              <span className="tile-in">{w}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
