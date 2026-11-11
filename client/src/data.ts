import type { Course, UnitData, Vocab, VocabTopic } from "./types";

const cache = new Map<string, Promise<unknown>>();
function get<T>(url: string): Promise<T> {
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); }).catch((e) => { cache.delete(url); throw e; }));
  return cache.get(url) as Promise<T>;
}
export const loadCourse = () => get<Course>("/data/course_structure.json");
export const loadUnit = (file: string) => get<UnitData>(`/data/${file}`);
export const loadVocab = () => get<Vocab[]>("/data/vocab.json");
export const loadTopics = () => get<VocabTopic[]>("/data/vocab_topics.json");
export const loadWordImgs = () => get<string[]>("/img/words/manifest.json");
