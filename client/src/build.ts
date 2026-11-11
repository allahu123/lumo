import type { Ex, RawExercise, UnitData, Vocab } from "./types";
import { seeded, shuffle } from "./util";

const wordsOf = (s: string) => s.replace(/[.,!?;:"]/g, "").split(/\s+/).filter(Boolean);

export function convert(e: RawExercise): Ex | null {
  const explain = e.explanation_tr || "";
  switch (e.type) {
    case "fill_blank":
      return { kind: "choice", id: e.id, instruction: e.instruction_tr, heading: e.instruction_tr, sentence: e.sentence_en, sub: e.sentence_tr, options: shuffle(e.options!), answer: e.answer!, explain };
    case "multiple_choice": {
      const en = e.question_en || e.sentence_en || "";
      const heading = en || e.question_tr || e.sentence_tr || "";
      return { kind: "choice", id: e.id, instruction: e.instruction_tr, heading, speak: en || undefined, options: shuffle(e.options!), answer: e.answer!, explain };
    }
    case "choose_correct_sentence":
      return { kind: "choice", id: e.id, instruction: e.instruction_tr, heading: e.prompt_tr || "", hideHeading: !e.prompt_tr, options: shuffle(e.options!), answer: e.answer!, explain };
    case "build_sentence":
      return { kind: "arrange", id: e.id, instruction: e.instruction_tr, prompt: e.prompt_tr!, promptLang: "tr", bank: shuffle(e.word_bank!), answers: [e.answer!, ...(e.accepted_answers || [])], explain };
    case "dictation":
      return { kind: "arrange", id: e.id, instruction: e.instruction_tr, prompt: e.sentence_tr || "", promptLang: "tr", speak: e.audio_text || e.answer, listen: true, bank: shuffle(e.word_bank!), answers: [e.answer!, ...(e.accepted_answers || [])], explain };
    case "type_translation":
      return { kind: "type", id: e.id, instruction: e.instruction_tr, prompt: e.prompt_tr!, answers: [e.answer!, ...(e.accepted_answers || [])], explain };
    case "match_pairs":
      return { kind: "match", id: e.id, instruction: e.instruction_tr, pairs: e.pairs!, explain };
  }
  return null;
}

/** Ünitenin 24 alıştırmasını 3 derse böler: kolaydan zora, her ders kendi içinde karışık. */
export function unitLesson(u: UnitData, part: number): Ex[] {
  const sorted = [...u.exercises].sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));
  const size = Math.ceil(sorted.length / 3);
  const chunk = sorted.slice(part * size, part * size + size);
  const rnd = seeded(u.unit_id + part);
  // match çok yer kapladığı için yalnız sona yakın dursun; kalanı karıştır
  const rest = shuffle(chunk.filter((x) => x.type !== "match_pairs"), rnd);
  const match = chunk.filter((x) => x.type === "match_pairs");
  const out = [...rest];
  match.forEach((m, i) => out.splice(Math.min(out.length, Math.floor(out.length * (0.55 + 0.2 * i))), 0, m));
  return out.map(convert).filter(Boolean) as Ex[];
}

/** Kelime dersi: 8 kelime, her biri 1-2 farklı tipte sorulur. */
export function vocabLesson(words: Vocab[], pool: Vocab[]): Ex[] {
  const out: Ex[] = [];
  const topicPool = (w: Vocab) => pool.filter((x) => x.topic === w.topic && x.id !== w.id && x.pos === w.pos);
  words.forEach((w, i) => {
    const trOpts = shuffle([w.tr, ...w.distractors_tr.slice(0, 3)]);
    const kind = i % 3;
    if (kind === 0) {
      out.push({ kind: "choice", id: `v${w.id}a`, instruction: "Doğru çeviriyi seç.", heading: w.word, speak: w.word, options: trOpts, answer: w.tr, explain: `${w.word} /${w.ipa.replace(/\//g, "")}/ — ${w.tr}. “${w.example_en}”`, wordId: w.id, showImg: true });
    } else if (kind === 1) {
      const others = shuffle(topicPool(w).length >= 3 ? topicPool(w) : pool.filter((x) => x.id !== w.id)).slice(0, 3).map((x) => x.word);
      out.push({ kind: "choice", id: `v${w.id}b`, instruction: "Duyduğun kelimeyi seç.", heading: "", hideHeading: true, speak: w.word, options: shuffle([w.word, ...others]), answer: w.word, explain: `${w.word} — ${w.tr}`, wordId: w.id });
    } else {
      const others = shuffle(topicPool(w).length >= 3 ? topicPool(w) : pool.filter((x) => x.id !== w.id)).slice(0, 3).map((x) => x.word);
      out.push({ kind: "choice", id: `v${w.id}c`, instruction: "İngilizcesini seç.", heading: w.tr, options: shuffle([w.word, ...others]), answer: w.word, explain: `${w.tr} — ${w.word}`, wordId: w.id, showImg: true });
    }
  });
  // örnek cümleyle cümle kurma: 2 tane
  shuffle(words).slice(0, 2).forEach((w) => {
    const ws = wordsOf(w.example_en);
    if (ws.length < 3 || ws.length > 8) return;
    const extra = shuffle(pool.filter((x) => x.id !== w.id)).slice(0, 2).map((x) => x.word);
    out.push({ kind: "arrange", id: `v${w.id}s`, instruction: "Cümleyi İngilizceye çevir.", prompt: w.example_tr, promptLang: "tr", bank: shuffle([...ws, ...extra]), answers: [w.example_en], explain: w.example_en, wordId: w.id });
  });
  // sona yakın bir eşleştirme
  const m = words.slice(0, 5).map((w) => ({ en: w.word, tr: w.tr }));
  if (m.length === 5) out.splice(Math.max(1, out.length - 2), 0, { kind: "match", id: `vm${words[0].id}`, instruction: "Eşleştir.", pairs: m, explain: "" });
  return out;
}
