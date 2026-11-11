/* Ses: ileride ElevenLabs mp3 eklemek için public/audio/manifest.json içine
   { "hello": "/audio/hello.mp3" } yazman yeterli. Yoksa tarayıcının sesi (TTS) kullanılır. */
let manifest: Record<string, string> | null = null;
let manifestTried = false;
async function loadManifest() {
  if (manifestTried) return manifest;
  manifestTried = true;
  try { const r = await fetch("/audio/manifest.json"); if (r.ok) manifest = await r.json(); } catch { /* yok */ }
  return manifest;
}
let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const vs = speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
  voice = vs.find((v) => /en[-_]US/i.test(v.lang) && /(samantha|google|natural|aria|jenny)/i.test(v.name)) || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
let current: HTMLAudioElement | null = null;
export async function speak(text: string, slow = false) {
  const m = await loadManifest();
  const key = text.toLowerCase();
  if (m && m[key] && !slow) {
    current?.pause(); current = new Audio(m[key]); void current.play().catch(() => {}); return;
  }
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; if (voice) u.voice = voice;
  u.rate = slow ? 0.55 : 0.92;
  speechSynthesis.speak(u);
}

let ac: AudioContext | null = null;
function tone(f: number, d: number, when = 0, type: OscillatorType = "sine", vol = 0.09) {
  try {
    ac = ac || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + when;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
  } catch { /* ses yok */ }
}
let enabled = true;
export const setSound = (on: boolean) => { enabled = on; };
export const sfx = {
  tap: () => enabled && tone(520, 0.05, 0, "triangle", 0.05),
  ok: () => { if (!enabled) return; tone(660, 0.12); tone(880, 0.12, 0.09); tone(1175, 0.2, 0.18); },
  bad: () => { if (!enabled) return; tone(220, 0.16, 0, "sawtooth", 0.06); tone(165, 0.24, 0.12, "sawtooth", 0.06); },
  done: () => { if (!enabled) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, i * 0.11)); },
  streak: () => { if (!enabled) return; [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, i * 0.13, "triangle", 0.1)); },
};
