import { useEffect, useRef, useState } from "react";
import { FLAME } from "./flameMeta";

/* Streak alevi.
   - "off"    : gri, durgun (bugün henüz ders yok)
   - "lit"    : yanıyor, sakin; yalnızca çok yavaş nefes alan bir parıltı (sürekli dönmez/zıplamaz)
   - "ignite" : seri artarken BİR KEZ oynar (GIF'in 9 karesi + kıvılcımlar), sonra "lit" hâline oturur.
   Sprite'ın son karesi, sakin hâlle birebir aynı boyut ve konumdadır; geçişte zıplama olmaz. */
export type FlameState = "off" | "lit" | "ignite";
export function Flame({ state, size = 96, onDone }: { state: FlameState; size?: number; onDone?: () => void }) {
  const [phase, setPhase] = useState<FlameState>(state);
  const cb = useRef(onDone); cb.current = onDone;
  useEffect(() => {
    setPhase(state);
    if (state !== "ignite") return;
    const t = setTimeout(() => { setPhase("lit"); cb.current?.(); }, 1700);
    return () => clearTimeout(t);
  }, [state]);

  const k = size / FLAME.w;            // kaynak piksel -> ekran pikseli
  const h = FLAME.h * k;
  const ig = phase === "ignite";
  return (
    <div className={`flame ${phase}`} style={{ width: size, height: h }}>
      <div className="flame-glow" />
      {ig && (
        <>
          <div className="flame-sparks">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} style={{ ["--a" as string]: `${i * 36 + (i % 2 ? 8 : -6)}deg`, ["--d" as string]: `${0.6 + (i % 3) * 0.12}s`, ["--r" as string]: `${size * (0.7 + (i % 4) * 0.12)}px` }} />
            ))}
          </div>
          <div
            className="flame-sprite"
            style={{
              width: FLAME.sw * k, height: FLAME.sh * k, left: -FLAME.ox * k, top: -FLAME.oy * k,
              backgroundImage: "url(/img/flame-sprite.png)", backgroundSize: `${FLAME.frames * 100}% 100%`,
            }}
          />
        </>
      )}
      <div className="flame-img" style={{ width: size, height: h, backgroundImage: "url(/img/flame.png)", opacity: ig ? 0 : undefined }} />
    </div>
  );
}
