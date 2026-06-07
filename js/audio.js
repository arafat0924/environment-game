/* UI sounds only — synthesised with the Web Audio API.
   No music anywhere. During the reveal the context is suspended outright:
   silence is part of the design. */
window.Sound = (() => {
  let ctx = null;
  let out = null;
  let silenced = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // Gentle bus compressor keeps overlapping blips soft.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      out = ctx.createGain();
      out.gain.value = 0.85;
      out.connect(comp).connect(ctx.destination);
    }
    if (!silenced && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function ready() {
    return !silenced && ensure() && ctx.state !== 'closed';
  }

  // One oscillator with an attack/decay envelope and optional pitch glide.
  function tone({ freq = 880, to = null, type = 'sine', dur = 0.12, gain = 0.08, attack = 0.004, delay = 0 }) {
    if (!ready()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Soft bell: fundamental + quiet inharmonic partial, long exponential tail.
  function bell(freq, delay = 0, dur = 1.2, gain = 0.06) {
    tone({ freq, dur, gain, attack: 0.006, delay });
    tone({ freq: freq * 2.76, dur: dur * 0.45, gain: gain * 0.18, attack: 0.004, delay });
    tone({ freq: freq * 2, dur: dur * 0.7, gain: gain * 0.25, attack: 0.006, delay });
  }

  // Filtered-noise whoosh for slides.
  function whoosh({ dur = 0.32, from = 500, to = 2200, gain = 0.05 } = {}) {
    if (!ready()) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(from, t);
    bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  return {
    unlock: ensure,
    click() {
      tone({ freq: 1150, to: 700, dur: 0.06, gain: 0.07 });
      tone({ freq: 2600, dur: 0.02, gain: 0.015, type: 'triangle' });
    },
    pop() {
      tone({ freq: 340, to: 900, dur: 0.11, gain: 0.08 });
      tone({ freq: 900, dur: 0.08, gain: 0.025, delay: 0.05 });
    },
    slide() { whoosh(); },
    slideOut() { whoosh({ from: 1800, to: 400, dur: 0.28, gain: 0.04 }); },
    drop() {
      tone({ freq: 190, to: 70, dur: 0.18, gain: 0.12 });
      tone({ freq: 620, to: 300, dur: 0.05, gain: 0.02, type: 'triangle' });
    },
    // Sudden realisation: a quick two-note sting.
    gasp() {
      tone({ freq: 520, to: 980, dur: 0.12, gain: 0.08, type: 'triangle' });
      tone({ freq: 1180, dur: 0.18, gain: 0.05, delay: 0.1, type: 'triangle' });
    },
    // Wrong choice: a short low double buzz.
    nope() {
      tone({ freq: 180, dur: 0.12, gain: 0.09, type: 'square' });
      tone({ freq: 150, dur: 0.16, gain: 0.08, type: 'square', delay: 0.15 });
    },
    // Shop door / doorbell.
    ding(pitch = 1) {
      bell(1318.5 * pitch, 0, 0.9, 0.05);
    },
    chime() {
      bell(659.25, 0, 1.0, 0.055);
      bell(987.77, 0.09, 1.2, 0.045);
    },
    // The single soft chime allowed on the solutions screen.
    softChime() {
      bell(523.25, 0, 2.8, 0.04);
      bell(783.99, 0.02, 2.8, 0.03);
      bell(1046.5, 0.05, 2.4, 0.016);
    },
    // Hard stop: suspend the whole audio context.
    silence() {
      silenced = true;
      if (ctx && ctx.state === 'running') ctx.suspend();
    },
    wake() {
      silenced = false;
      if (ctx && ctx.state === 'suspended') return ctx.resume();
      return Promise.resolve();
    },
  };
})();
