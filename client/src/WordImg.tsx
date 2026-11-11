import { useEffect, useState } from "react";
import { loadWordImgs } from "./data";

/* Kelime görseli: public/img/words/<kelime_id>.webp. Yalnızca manifest.json içindeki id'ler için gösterilir. */
export function WordImg({ id, size = 120 }: { id: string; size?: number }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let on = true;
    setOk(false);
    loadWordImgs().then((l) => { if (on) setOk(l.includes(id)); }).catch(() => {});
    return () => { on = false; };
  }, [id]);
  if (!ok) return null;
  return <img className="word-img" src={`/img/words/${id}.webp`} width={size} height={size} alt="" draggable={false} />;
}
