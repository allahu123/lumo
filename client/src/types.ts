export interface User { id: string; email: string; name: string; color: string }

export interface DayLog { xp: number; lessons: number }
export interface WordStat { box: number; seen: number; wrong: number }
export interface Progress {
  v: 1;
  updatedAt: number;
  xp: number;
  streak: number;
  best: number;
  lastDay: string | null;
  days: Record<string, DayLog>;
  /** unit_id -> tamamlanan ders sayısı (0..4) */
  units: Record<string, number>;
  words: Record<string, WordStat>;
  goal: number;
  sound: boolean;
}

export interface Vocab {
  id: string; word: string; pos: string; tr: string; ipa: string; topic: string;
  example_en: string; example_tr: string; distractors_tr: string[];
}
export interface VocabTopic { topic: string; title_tr: string; file: string; count: number }

export interface UnitMeta {
  unit_id: string; slug: string; order: number; title_en: string; title_tr: string;
  exercise_count: number; file: string; related_vocab_topics: string[];
}
export interface ModuleMeta { module_id: string; title_tr: string; goal_tr: string; units: UnitMeta[] }
export interface Course { modules: ModuleMeta[] }

export interface Lesson {
  goal_tr: string;
  sections: { heading_tr: string; explanation_tr: string; examples: { en: string; tr: string }[] }[];
  key_patterns: { pattern: string; example_en: string; example_tr: string }[];
  turkish_speaker_tips_tr: string[];
  common_mistakes: { wrong: string; correct: string; note_tr: string }[];
}
export interface RawExercise {
  id: string; type: string; difficulty: number; instruction_tr: string; explanation_tr?: string;
  sentence_en?: string; sentence_tr?: string; question_en?: string; question_tr?: string;
  options?: string[]; answer?: string; accepted_answers?: string[]; prompt_tr?: string;
  word_bank?: string[]; audio_text?: string; pairs?: { en: string; tr: string }[];
}
export interface UnitData { unit_id: string; title_tr: string; lesson: Lesson; exercises: RawExercise[] }

/** Oynatıcının kullandığı sadeleştirilmiş alıştırmalar */
export type Ex =
  | { kind: "choice"; id: string; instruction: string; heading: string; speak?: string; hideHeading?: boolean;
      sentence?: string; sub?: string; options: string[]; answer: string; explain: string; wordId?: string; showImg?: boolean }
  | { kind: "arrange"; id: string; instruction: string; prompt: string; promptLang: "tr" | "en"; speak?: string;
      listen?: boolean; bank: string[]; answers: string[]; explain: string; wordId?: string }
  | { kind: "type"; id: string; instruction: string; prompt: string; answers: string[]; explain: string }
  | { kind: "match"; id: string; instruction: string; pairs: { en: string; tr: string }[]; explain: string };
