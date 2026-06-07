/* The person: a sketch-style outline figure with jointed limbs, modelled on
   the reference animation. No facial features. Each instance is a small rig:
   hip → legs (thigh/shin/foot), torso → arms (upper/fore/hand) + head.
   Angles are degrees; 0 = limb hanging straight down, negative = forward. */
window.Character = (() => {
  const { G, pivot } = Kit;
  const LINE = '#3B3B3B';
  const FILL = '#FCFBF8';
  const BACK = '#E7E4DE';
  const HAIR = '#6E6A64';
  const SW = 3;
  const LEN = { thigh: 74, shin: 72, upper: 56, fore: 52, hand: 6 };
  const HIP_STAND = -153;
  const SH = { x: 2, y: -100 };
  const LEGX = { B: -5, F: 5 };
  const ANKLE = { B: { x: -6, y: -7 }, F: { x: 8, y: -7 } };
  const R = Math.PI / 180;

  const BODY = {
    boy: {
      thigh: 24, shin: 20,
      torso: 'M -21 4 C -24 -28 -28 -66 -24 -92 Q -20 -110 0 -111 Q 18 -110 22 -96 C 27 -66 24 -28 19 4 Z',
      extra: `<path d="M -21 -3 L 19 -3" stroke="${LINE}" stroke-width="2.4"/>
              <path d="M -6 -104 Q 3 -96 12 -104" fill="none" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round"/>`,
      hairBack: '',
      hair: 'M -15 -30 Q -21 -58 2 -63 Q 22 -66 25 -48 L 24 -43 Q 13 -53 2 -48 Q -6 -44 -8 -34 Q -10 -27 -15 -30 Z',
    },
    girl: {
      thigh: 16, shin: 14,
      torso: 'M -18 -4 C -22 -32 -26 -70 -22 -94 Q -18 -110 0 -111 Q 17 -110 20 -97 C 25 -70 21 -32 17 -4 Z',
      extra: `<path d="M -20 -10 L 18 -10 L 33 50 Q 2 58 -32 50 Z" fill="${FILL}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
              <path d="M -6 -104 Q 3 -96 12 -104" fill="none" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round"/>`,
      hairBack: 'M -12 -48 Q -26 -30 -22 -6 Q -18 4 -8 2 Q -12 -20 -4 -40 Z',
      hair: 'M -15 -28 Q -22 -58 2 -63 Q 22 -66 25 -48 L 24 -42 Q 13 -54 2 -48 Q -6 -44 -9 -32 Q -11 -25 -15 -28 Z',
      bun: '<circle cx="-15" cy="-54" r="10"/>',
    },
  };

  // Rest pose.
  const STAND = { t: 3, h: -2, bu: 8, bf: -14, fu: -6, ff: -16, lbt: 3, lbs: 2, lbf: -5, lft: -3, lfs: 3, lff: 0, hy: HIP_STAND, hx: 0 };
  const SIT = { t: -2, h: 2, bu: 4, bf: -50, fu: -8, ff: -40, lbt: -84, lbs: 80, lbf: 4, lft: -90, lfs: 84, lff: 6, hy: -84, hx: 0 };
  const JOINTS = ['t', 'h', 'bu', 'bf', 'fu', 'ff', 'lbt', 'lbs', 'lbf', 'lft', 'lfs', 'lff'];

  const cap = (len, w, fill) => `<rect x="${-w / 2}" y="${-w / 2}" width="${w}" height="${len + w}" rx="${w / 2}" fill="${fill}" stroke="${LINE}" stroke-width="${SW}"/>`;
  const shoe = (fill) => `<path d="M -9 -3 Q -9 -8 -3 -8 L 8 -6 Q 22 -4 23 3 L 23 7 L -9 7 Z" fill="${fill}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>`;

  function leg(cls, fill, b) {
    return `<g class="${cls}-t">${cap(LEN.thigh, b.thigh, fill)}
      <g transform="translate(0 ${LEN.thigh})"><g class="${cls}-s">${cap(LEN.shin, b.shin, fill)}
        <g transform="translate(0 ${LEN.shin})"><g class="${cls}-f">${shoe(fill)}</g></g></g></g></g>`;
  }
  function arm(cls, fill) {
    return `<g class="${cls}-u">${cap(LEN.upper, 15, fill)}
      <g transform="translate(0 ${LEN.upper})"><g class="${cls}-f">${cap(LEN.fore, 13, fill)}
        <g transform="translate(0 ${LEN.fore + LEN.hand})">
          <circle r="7.5" fill="${fill}" stroke="${LINE}" stroke-width="${SW}"/>
          <g class="${cls}-slot"><circle r="0.5" fill="none"/></g>
        </g></g></g></g>`;
  }

  function markup(type, scale) {
    const b = BODY[type];
    return `
      <g class="rig" transform="scale(${scale})">
        <ellipse class="shadow" cx="2" cy="0" rx="50" ry="6" fill="rgba(60,55,45,0.14)"/>
        <g class="hip">
          <g transform="translate(${LEGX.B} 0)"><g class="legB">${leg('lB', BACK, b)}</g></g>
          <g transform="translate(${LEGX.F} 0)"><g class="legF">${leg('lF', FILL, b)}</g></g>
          <g class="torso">
            <g transform="translate(${SH.x} ${SH.y})">${arm('aB', BACK)}</g>
            <path d="${b.torso}" fill="${FILL}" stroke="${LINE}" stroke-width="${SW}" stroke-linejoin="round"/>
            ${b.extra}
            <g transform="translate(3 -108)"><g class="head">
              ${b.hairBack ? `<path d="${b.hairBack}" fill="${HAIR}" stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round"/>` : ''}
              <rect x="-5.5" y="-16" width="11" height="20" rx="5" fill="${FILL}" stroke="${LINE}" stroke-width="${SW}"/>
              ${b.bun ? `<g fill="${HAIR}" stroke="${LINE}" stroke-width="2.4">${b.bun}</g>` : ''}
              <ellipse cx="4" cy="-36" rx="19" ry="24" fill="${FILL}" stroke="${LINE}" stroke-width="${SW}"/>
              <path d="${b.hair}" fill="${HAIR}" stroke="${LINE}" stroke-width="2.4" stroke-linejoin="round"/>
              <g class="hfx"></g>
            </g></g>
            <g transform="translate(${SH.x} ${SH.y})">${arm('aF', FILL)}</g>
          </g>
        </g>
      </g>`;
  }

  function create(parent, { type = 'boy', scale = 1 } = {}) {
    const root = Kit.el('g', { class: `person person-${type}` }, parent);
    root.innerHTML = markup(type, scale);
    const q = (s) => root.querySelector(s);
    const J = {
      t: q('.torso'), h: q('.head'),
      bu: q('.aB-u'), bf: q('.aB-f'), fu: q('.aF-u'), ff: q('.aF-f'),
      lbt: q('.lB-t'), lbs: q('.lB-s'), lbf: q('.lB-f'),
      lft: q('.lF-t'), lfs: q('.lF-s'), lff: q('.lF-f'),
    };
    const hip = q('.hip');
    const shadow = q('.shadow');
    const hfx = q('.hfx');
    const slots = { B: q('.aB-slot'), F: q('.aF-slot') };
    JOINTS.forEach((k) => pivot(J[k], 0, 0));
    pivot(slots.B, 0, 0);
    pivot(slots.F, 0, 0);
    pivot(shadow, 2, 0);
    pivot(root, 0, 0);
    gsap.set(root, { x: 500, y: G });

    const gp = (n, p = 'rotation') => gsap.getProperty(n, p);
    const setters = {};
    JOINTS.forEach((k) => { setters[k] = gsap.quickSetter(J[k], 'rotation', 'deg'); });
    const setHipY = gsap.quickSetter(hip, 'y');

    function set(p) {
      JOINTS.forEach((k) => { if (k in p) gsap.set(J[k], { rotation: p[k] }); });
      if ('hy' in p) gsap.set(hip, { y: p.hy });
      if ('hx' in p) gsap.set(hip, { x: p.hx });
    }
    function to(p, dur = 0.4, ease = 'power2.inOut') {
      const tl = gsap.timeline();
      JOINTS.forEach((k) => { if (k in p) tl.to(J[k], { rotation: p[k], duration: dur, ease }, 0); });
      if ('hy' in p) tl.to(hip, { y: p.hy, duration: dur, ease }, 0);
      if ('hx' in p) tl.to(hip, { x: p.hx, duration: dur, ease }, 0);
      return tl;
    }

    /* ---- props held upright (phone, bag) regardless of arm angle ---- */
    const upright = { B: null, F: null };
    const tick = () => {
      if (upright.B !== null) gsap.set(slots.B, { rotation: upright.B - (gp(J.t) + gp(J.bu) + gp(J.bf)) });
      if (upright.F !== null) gsap.set(slots.F, { rotation: upright.F - (gp(J.t) + gp(J.fu) + gp(J.ff)) });
    };
    gsap.ticker.add(tick);
    function hold(side, html, { up = null, rot = 0 } = {}) {
      const s = slots[side];
      s.innerHTML = `<circle r="0.5" fill="none"/>${html}`;
      upright[side] = up;
      if (up === null) gsap.set(s, { rotation: rot });
      tick();
      return s.lastElementChild;
    }
    function release(side) {
      slots[side].innerHTML = '<circle r="0.5" fill="none"/>';
      upright[side] = null;
      gsap.set(slots[side], { rotation: 0 });
    }

    /* ---- loops (walk / idle / tremble) ---- */
    let loops = [];
    const stopLoops = () => { loops.forEach((t) => t.kill()); loops = []; };

    function frame(ph) {
      const s = Math.sin(ph);
      const c = Math.cos(ph);
      const legA = (sn, cs) => {
        const t = -24 * sn;
        const k = 5 + 44 * Math.pow(Math.max(0, cs), 1.4);
        return [t, k, -(t + k) - (cs > 0 ? 8 * cs : 0)];
      };
      const [ft, fk, ff] = legA(s, c);
      const [bt, bk, bf] = legA(-s, -c);
      setters.lft(ft); setters.lfs(fk); setters.lff(ff);
      setters.lbt(bt); setters.lbs(bk); setters.lbf(bf);
      setters.fu(18 * s - 4); setters.ff(-14 - 16 * Math.max(0, -s));
      setters.bu(-18 * s + 6); setters.bf(-14 - 16 * Math.max(0, s));
      setters.t(6 + 1.5 * Math.cos(2 * ph));
      setters.h(-4 + 2 * Math.cos(2 * ph));
      setHipY(HIP_STAND + 9 * s * s);
      gsap.set(shadow, { scaleX: 1 - 0.08 * Math.abs(c) });
    }
    function walk(speed = 1) {
      stopLoops();
      const p = { ph: 0 };
      loops.push(gsap.to(p, { ph: Math.PI * 2, duration: 0.86 / speed, ease: 'none', repeat: -1, onUpdate: () => frame(p.ph) }));
    }
    function stand(dur = 0.3) {
      stopLoops();
      gsap.set(shadow, { scaleX: 1 });
      return to(STAND, dur);
    }
    function idle() {
      stopLoops();
      const base = gp(J.t);
      loops.push(gsap.to(J.t, { rotation: base + 1.6, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
      loops.push(gsap.to(J.h, { rotation: gp(J.h) + 2, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.3 }));
    }
    async function walkTo(x, { speed = 210 } = {}) {
      const dx = Math.abs(x - gp(root, 'x'));
      if (dx < 2) return;
      walk();
      await gsap.to(root, { x, duration: dx / speed, ease: 'none' });
      await stand(0.25);
    }

    /* ---- two-bone IK ---- */
    function toRig(T, hipPos) {
      const s = scale * gp(root, 'scale');
      const hx = hipPos ? hipPos.x : gp(hip, 'x');
      const hy = hipPos ? hipPos.y : gp(hip, 'y');
      return { x: (T.x - gp(root, 'x')) / s - hx, y: (T.y - gp(root, 'y')) / s - hy };
    }
    function armIK(T, torsoDeg, hipPos) {
      const p = toRig(T, hipPos);
      const a = -torsoDeg * R;
      const lx = p.x * Math.cos(a) - p.y * Math.sin(a);
      const ly = p.x * Math.sin(a) + p.y * Math.cos(a);
      const dx = lx - SH.x;
      const dy = ly - SH.y;
      const A = LEN.upper;
      const B = LEN.fore + LEN.hand;
      const d = Math.max(Math.abs(A - B) + 1, Math.min(Math.hypot(dx, dy), A + B - 0.5));
      const rd = Math.atan2(-dx, dy);
      const al = Math.acos((A * A + d * d - B * B) / (2 * A * d));
      const be = Math.acos((A * A + B * B - d * d) / (2 * A * B));
      return { u: (rd + al) / R, f: -(180 - be / R) };
    }
    // Move one hand ('F' near / 'B' far) to a stage point.
    function reach(side, T, dur = 0.45, { torso, hip: hipPos, ease = 'power2.inOut' } = {}) {
      const td = torso ?? gp(J.t);
      const { u, f } = armIK(T, td, hipPos);
      const tl = gsap.timeline();
      if (torso !== undefined) tl.to(J.t, { rotation: torso, duration: dur, ease }, 0);
      tl.to(J[side === 'F' ? 'fu' : 'bu'], { rotation: u, duration: dur, ease }, 0)
        .to(J[side === 'F' ? 'ff' : 'bf'], { rotation: f, duration: dur, ease }, 0);
      return tl;
    }
    // Crouch / rise with feet planted.
    function legsFor(hy, hx = 0) {
      const out = {};
      ['B', 'F'].forEach((sd) => {
        const dx = ANKLE[sd].x - (hx + LEGX[sd]);
        const dy = ANKLE[sd].y - hy;
        const A = LEN.thigh;
        const B = LEN.shin;
        const d = Math.max(20, Math.min(Math.hypot(dx, dy), A + B - 0.5));
        const rd = Math.atan2(-dx, dy);
        const al = Math.acos((A * A + d * d - B * B) / (2 * A * d));
        const be = Math.acos((A * A + B * B - d * d) / (2 * A * B));
        const th = (rd - al) / R;
        const kn = 180 - be / R;
        const k = sd === 'F' ? 'lf' : 'lb';
        out[`${k}t`] = th;
        out[`${k}s`] = kn;
        out[`${k}f`] = -(th + kn);
      });
      out.hy = hy;
      out.hx = hx;
      return out;
    }
    function crouch(hy = -112, dur = 0.45, torso = 26) {
      stopLoops();
      return to({ ...legsFor(hy), t: torso, h: -12 }, dur);
    }

    /* ---- expression marks (no face, so motion-graphics symbols) ---- */
    function mark(kind) {
      hfx.innerHTML = '';
      const g = Kit.group(hfx, kind === '!'
        ? `<g transform="translate(30 -96)">
             <path d="M -30 -14 L -40 -22 M 0 -30 L 0 -42 M 30 -14 L 40 -22" stroke="${LINE}" stroke-width="3.5" stroke-linecap="round"/>
             <circle r="21" fill="#FFFFFF" stroke="${LINE}" stroke-width="3"/>
             <text x="0" y="11" text-anchor="middle" font-size="32" style="fill:${LINE}">!</text>
           </g>`
        : `<g transform="translate(46 -92)">
             <circle cx="-28" cy="30" r="4" fill="${FILL}" stroke="${LINE}" stroke-width="2.4"/>
             <circle cx="-18" cy="18" r="6" fill="${FILL}" stroke="${LINE}" stroke-width="2.4"/>
             <circle r="22" fill="${FILL}" stroke="${LINE}" stroke-width="3"/>
             <text x="0" y="11" text-anchor="middle" font-size="30" style="fill:${LINE}">?</text>
           </g>`);
      pivot(g.firstElementChild, 0, 0);
      gsap.from(g.firstElementChild, { scale: 0, duration: 0.35, ease: 'back.out(3)' });
      return g;
    }
    function clearMark() {
      const g = hfx.lastElementChild;
      if (g) gsap.to(g, { opacity: 0, duration: 0.25, onComplete: () => { hfx.innerHTML = ''; } });
    }
    let sweatLoop = null;
    function sweat(on = true) {
      if (sweatLoop) { sweatLoop.kill(); sweatLoop = null; }
      root.querySelectorAll('.sweat').forEach((n) => n.remove());
      if (!on) return;
      const g = Kit.group(q('.head'), `
        <path class="sweat" d="M -20 -60 C -16 -54 -14 -50 -16 -47 A 4 4 0 0 1 -24 -47 C -26 -50 -24 -54 -20 -60 Z" fill="${Kit.C.SKY}" stroke="${LINE}" stroke-width="1.6"/>
        <path class="sweat" d="M -26 -40 C -23 -35 -21 -32 -23 -29 A 3.5 3.5 0 0 1 -30 -29 C -31 -32 -29 -35 -26 -40 Z" fill="${Kit.C.SKY}" stroke="${LINE}" stroke-width="1.6"/>`);
      sweatLoop = gsap.fromTo(g.querySelectorAll('.sweat'), { y: 0, opacity: 1 }, { y: 14, opacity: 0, duration: 0.8, stagger: 0.3, repeat: -1, ease: 'power1.in' });
    }
    let shake = null;
    function tremble(on = true) {
      if (shake) { shake.kill(); shake = null; gsap.set(hip, { x: 0 }); }
      if (on) shake = gsap.fromTo(hip, { x: -1.6 }, { x: 1.6, duration: 0.05, repeat: -1, yoyo: true, ease: 'none' });
    }
    // Relief: a little exhale.
    function puff() {
      const g = Kit.group(q('.head'), [0, 1, 2].map((i) => `<circle cx="${28 + i * 2}" cy="-26" r="${4 + i * 2}" fill="none" stroke="${LINE}" stroke-width="2"/>`).join(''));
      gsap.fromTo(g.children, { x: 0, opacity: 0.9, scale: 0.4, transformOrigin: '50% 50%' }, {
        x: (i) => 18 + i * 14, opacity: 0, scale: 1.2, duration: 1, stagger: 0.12, ease: 'power1.out', onComplete: () => g.remove(),
      });
    }
    // Start-screen wave.
    function wave() {
      stopLoops();
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
      tl.to(J.fu, { rotation: -160, duration: 0.35, ease: 'power2.out' })
        .to(J.ff, { rotation: -30, duration: 0.2 }, 0)
        .to(J.ff, { rotation: -60, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut' })
        .to(J.fu, { rotation: STAND.fu, duration: 0.4, ease: 'power2.inOut' })
        .to(J.ff, { rotation: STAND.ff, duration: 0.4 }, '<');
      loops.push(tl);
    }

    set(STAND);
    return {
      root, J, hip, type,
      set, to, walk, stand, idle, walkTo, reach, crouch, legsFor, hold, release,
      mark, clearMark, sweat, tremble, puff, wave, stopLoops,
      x: () => gp(root, 'x'),
      sit: (dur = 0.5) => { stopLoops(); return to(SIT, dur); },
      pose: { STAND, SIT },
      destroy() { stopLoops(); gsap.ticker.remove(tick); root.remove(); },
    };
  }

  return { create, STAND, SIT, LINE, FILL };
})();
