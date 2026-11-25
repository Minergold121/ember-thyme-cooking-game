// Ember & Thyme: tiny WebAudio bleeps, synthesized locally, no files.
let audioCtx = null;

export function ensureAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playTone(freq, dur = 0.09, type = 'sine', gain = 0.08, muted = false) {
  if (muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch (e) { /* audio is garnish, never fatal */ }
}

export const sfx = {
  pick(muted) { playTone(520, 0.07, 'triangle', 0.07, muted); },
  chop(muted) { playTone(220, 0.06, 'square', 0.05, muted); playTone(330, 0.05, 'square', 0.04, muted); },
  sizzle(muted) { playTone(880, 0.16, 'sawtooth', 0.04, muted); },
  perfect(muted) { playTone(660, 0.1, 'sine', 0.09, muted); setTimeout(() => playTone(990, 0.14, 'sine', 0.09, muted), 90); },
  serve(muted) { playTone(740, 0.09, 'triangle', 0.09, muted); setTimeout(() => playTone(1100, 0.16, 'triangle', 0.09, muted), 100); },
  bad(muted) { playTone(160, 0.2, 'sawtooth', 0.07, muted); },
};
