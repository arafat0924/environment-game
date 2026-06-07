/* The reveal. Colour drains, a short silent hold, then five big piles in
   stark grayscale with short labels — each with a tiny looping replay of
   the moment it came from. Then colour bleeds back with one-line fixes. */
window.Reveal = (() => {
  const { C, $, $$, wait, Clock } = Kit;
  const T = (k) => I18N.t(k);

  /* Annualising assumptions — "a day like any other", × 365.
     tap:       ≈ 6 L/min, a typical bathroom tap (0.1 L/s)
     leftovers: one plate ≈ 150 g
     ride:      ≈ 7 km by car at ≈ 0.19 kg CO₂/km ≈ 1.33 kg
     plastic:   one piece per item binned (bag, box, film)
     packaging: one piece per item (box, polybag) */
  const RATE = { tapLps: 0.1, leftoversKg: 0.15, rideKg: 1.33, days: 365 };

  const ITEMS = [
    // name / unit / fix are translation keys (js/i18n.js)
    { k: 'water', name: 'water', task: 'taskWater', unit: 'uL', per: 2.8, fix: 'fixWater', tone: 'slate' },
    { k: 'food', name: 'food', task: 'taskFood', unit: 'uKg', per: 0.46, fix: 'fixFood', tone: 'forest' },
    { k: 'carbon', name: 'carbon', task: 'taskCarbon', unit: 'uCO2', per: 4, fix: 'fixCarbon', tone: 'slate' },
    { k: 'plastic', name: 'plastic', task: 'taskPlastic', unit: 'uPcs', per: 9, fix: 'fixPlastic', tone: 'forest' },
    { k: 'packaging', name: 'packaging', task: 'taskPack', unit: 'uPcs', per: 6, fix: 'fixPack', tone: 'slate' },
  ];
  const MAX_UNITS = 120; // a full heap: rows of 15, 14, 13 … 1

  function tally(s) {
    const d = RATE.days;
    s.piles.water = Math.round(s.waterSeconds * RATE.tapLps * d);
    s.piles.food = s.foodTo === 'bin' ? Math.round(RATE.leftoversKg * d) : 0;
    s.piles.carbon = s.choseBus ? 0 : Math.round(RATE.rideKg * d);
    s.piles.plastic = s.plasticItems * d;
    s.piles.packaging = s.packItems * d;
    s.score = Math.round(s.waterSeconds) + (s.foodTo === 'bin' ? 10 : 0) + (s.choseBus ? 0 : 20)
      + s.plasticItems * 5 + s.packItems * 3 + s.wrongBin * 5;
  }

  /* ---------------- pile units (stark grayscale) ---------------- */
  const GRAYS = ['#262626', '#333333', '#404040', '#4D4D4D'];
  const SHAPES = {
    water: () => '<path d="M0 -12 C 5 -5 9 -1 9 3.5 A 9 9 0 0 1 -9 3.5 C -9 -1 -5 -5 0 -12 Z"/>',
    food: (i) => ['<path d="M -10 4 A 10 9 0 0 1 10 4 Z"/>', '<ellipse rx="10" ry="6.5"/>', '<circle r="7"/>'][i % 3],
    carbon: (i) => `<circle r="${9 + (i % 3) * 1.5}"/>`,
    plastic: (i) => [
      '<rect x="-10" y="-7" width="20" height="14" rx="4"/>',
      '<rect x="-11" y="-3.5" width="22" height="7" rx="3.5"/>',
      '<path d="M -8 8 L -10 -6 L -4 -6 L -4 -10 L 4 -10 L 4 -6 L 10 -6 L 8 8 Z"/>',
    ][i % 3],
    packaging: (i) => (i % 2
      ? '<rect x="-10" y="-9" width="20" height="18" rx="1.5"/><line x1="0" y1="-9" x2="0" y2="9" stroke="#8C8C8C" stroke-width="2"/>'
      : '<path d="M -10 8 Q -11 -4 -7 -9 L 7 -9 Q 11 -4 10 8 Z"/>'),
  };

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A big heap: rows of 15, 14, 13 … each centred, piled to a point.
  function layout(n, seed) {
    const r = rng(seed);
    const rows = [];
    let cap = 15;
    let left = n;
    while (left > 0) {
      const c = Math.min(cap, left);
      rows.push(c);
      left -= c;
      cap = Math.max(1, cap - 1);
    }
    const out = [];
    rows.forEach((c, row) => {
      for (let i = 0; i < c; i++) {
        out.push({
          x: 120 + (i - (c - 1) / 2) * 14.6 + (r() - 0.5) * 3,
          y: 242 - row * 12.4 + (r() - 0.5) * 2.5,
          rot: (r() - 0.5) * 30,
        });
      }
    });
    return out;
  }

  /* ---------------- fix icons ---------------- */
  const ICONS = {
    water: `
      <path d="M 86 84 H 154" stroke-width="9"/>
      <path d="M 120 84 V 110" stroke-width="9"/>
      <path class="fillable" d="M 66 110 H 142 Q 170 110 170 138 V 152 H 148 V 140 Q 148 132 140 132 H 66 Z" stroke-width="6"/>
      <path d="M 64 102 V 140" stroke-width="9"/>`,
    food: `
      <rect class="fillable" x="84" y="58" width="72" height="128" rx="12" stroke-width="6"/>
      <path d="M 84 106 H 156" stroke-width="6"/>
      <path d="M 99 74 V 92 M 99 120 V 148" stroke-width="7"/>`,
    carbon: `
      <rect class="fillable" x="54" y="80" width="132" height="78" rx="16" stroke-width="6"/>
      <rect x="68" y="94" width="26" height="24" rx="4" stroke-width="5"/>
      <rect x="104" y="94" width="26" height="24" rx="4" stroke-width="5"/>
      <rect x="140" y="94" width="30" height="50" rx="4" stroke-width="5"/>
      <circle class="solid" cx="88" cy="162" r="12" stroke-width="6"/>
      <circle class="solid" cx="152" cy="162" r="12" stroke-width="6"/>`,
    plastic: `
      <path d="M 90 60 V 90 Q 90 108 104 108 Q 118 108 118 90 V 60" stroke-width="6"/>
      <path d="M 104 60 V 92" stroke-width="5"/>
      <path d="M 104 108 V 182" stroke-width="8"/>
      <ellipse class="fillable" cx="144" cy="84" rx="15" ry="24" stroke-width="6"/>
      <path d="M 144 108 V 182" stroke-width="8"/>`,
    packaging: `
      <path class="fillable" d="M 76 102 L 120 82 L 164 102 V 154 L 120 174 L 76 154 Z" stroke-width="6"/>
      <path d="M 76 102 L 120 122 L 164 102 M 120 122 V 174" stroke-width="6"/>
      <path d="M 98 92 L 142 112" stroke-width="5"/>`,
  };

  /* ---------------- tiny looping replays (8 s each) ---------------- */
  const L = '#333';
  const fig = (x, extra = '') => `
    <g class="fig" transform="translate(${x} 0)">
      <circle cx="0" cy="38" r="7" fill="#F4F4F4" stroke="${L}" stroke-width="2.4"/>
      <path d="M 0 45 V 72 M 0 72 L -6 98 M 0 72 L 7 98 M 0 52 L 10 62" fill="none" stroke="${L}" stroke-width="2.6" stroke-linecap="round"/>
      ${extra}
    </g>`;
  const minibin = (x, label = '') => `
    <g class="mbin" transform="translate(${x} 100)">
      <path d="M -16 -38 L -13 -2 Q 0 2 13 -2 L 16 -38 Z" fill="#D9D9D9" stroke="${L}" stroke-width="2.4"/>
      <ellipse cx="0" cy="-38" rx="16" ry="4" fill="#BDBDBD" stroke="${L}" stroke-width="2.4"/>
      ${label}
    </g>`;
  const VIG = {
    water: {
      html: `${fig(40, '<rect x="8" y="50" width="8" height="13" rx="2" fill="#E6E6E6" stroke="#333" stroke-width="1.8"/>')}
        <path d="M 84 100 L 88 82 L 112 82 L 116 100" fill="#EEE" stroke="${L}" stroke-width="2.4"/>
        <path d="M 66 60 L 134 60 L 131 66 Q 122 86 100 86 Q 78 86 69 66 Z" fill="#F2F2F2" stroke="${L}" stroke-width="2.4"/>
        <rect x="122" y="38" width="8" height="22" rx="2" fill="#EEE" stroke="${L}" stroke-width="2.4"/>
        <path d="M 126 43 L 106 43 Q 100 43 100 49" fill="none" stroke="${L}" stroke-width="7" stroke-linecap="round"/>
        <line class="vstream" x1="100" y1="51" x2="100" y2="78" stroke="#8E8E8E" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 4"/>
        <ellipse class="vpool" cx="100" cy="79" rx="12" ry="2.5" fill="#9E9E9E"/>`,
      play(svg) {
        const tl = gsap.timeline({ repeat: -1 });
        tl.to(svg.querySelector('.vstream'), { strokeDashoffset: -104, duration: 8, ease: 'none' }, 0)
          .to(svg.querySelector('.vpool'), { scaleX: 1.5, transformOrigin: '50% 50%', duration: 0.5, yoyo: true, repeat: 15, ease: 'sine.inOut' }, 0);
        return tl;
      },
    },
    food: {
      html: `<line x1="10" y1="72" x2="110" y2="72" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
        ${minibin(160)}
        <g class="vplate" transform="translate(60 68)">
          <ellipse rx="26" ry="5" fill="#F2F2F2" stroke="${L}" stroke-width="2.4"/>
          <g class="vfood"><circle cx="-8" cy="-6" r="5" fill="#555"/><circle cx="4" cy="-7" r="4" fill="#777"/><circle cx="12" cy="-5" r="3.5" fill="#555"/></g>
        </g>`,
      play(svg) {
        const plate = svg.querySelector('.vplate');
        const food = svg.querySelector('.vfood');
        const tl = gsap.timeline({ repeat: -1 });
        for (let k = 0; k < 2; k++) {
          tl.set(food, { x: 0, y: 0, opacity: 1 })
            .to(plate, { x: 140, y: 48, duration: 0.9, ease: 'power2.inOut' })
            .to(plate, { rotation: 55, duration: 0.35 })
            .to(food, { x: 18, y: 26, opacity: 0, duration: 0.45, ease: 'power2.in' })
            .to(svg.querySelector('.mbin'), { rotation: -6, transformOrigin: '50% 100%', duration: 0.1, yoyo: true, repeat: 3 })
            .to(plate, { x: 60, y: 68, rotation: 0, duration: 0.9, ease: 'power2.inOut' })
            .to({}, { duration: 1.1 });
        }
        return tl;
      },
    },
    carbon: (bus) => ({
      html: `<line x1="0" y1="100" x2="200" y2="100" stroke="${L}" stroke-width="3"/>
        ${fig(30)}
        <g class="veh" transform="translate(-80 100)">
          ${bus
            ? `<rect x="-46" y="-44" width="92" height="38" rx="6" fill="#DADADA" stroke="${L}" stroke-width="2.4"/>
               ${[-38, -18, 2].map((x) => `<rect x="${x}" y="-38" width="14" height="12" rx="2" fill="#F4F4F4" stroke="${L}" stroke-width="1.8"/>`).join('')}
               <circle cx="-28" cy="-6" r="6" fill="${L}"/><circle cx="28" cy="-6" r="6" fill="${L}"/>`
            : `<path d="M -34 -8 L -34 -20 Q -34 -24 -30 -24 L -20 -25 L -12 -36 L 12 -36 L 22 -25 L 32 -24 Q 36 -23 36 -18 L 36 -8 Z" fill="#CFCFCF" stroke="${L}" stroke-width="2.4" stroke-linejoin="round"/>
               <circle cx="-20" cy="-7" r="6.5" fill="${L}"/><circle cx="22" cy="-7" r="6.5" fill="${L}"/>`}
          <g class="puffs">${[0, 1, 2].map((i) => `<circle cx="${-44 - i * 10}" cy="-10" r="${4 + i * 2}" fill="#9A9A9A"/>`).join('')}</g>
        </g>`,
      play(svg) {
        const veh = svg.querySelector('.veh');
        const f = svg.querySelector('.fig');
        const puffs = svg.querySelectorAll('.puffs circle');
        const tl = gsap.timeline({ repeat: -1 });
        tl.set(veh, { x: -80 }).set(f, { x: 30, opacity: 1 }).set(puffs, { opacity: 0 })
          .to(f, { x: 70, duration: 1.4, ease: 'none' })
          .to(veh, { x: 90, duration: 1.4, ease: 'power3.out' }, 0.6)
          .to(f, { opacity: 0, y: -6, duration: 0.3 }, '+=0.3')
          .to(puffs, { opacity: 1, duration: 0.2, stagger: 0.1 })
          .to(veh, { x: 300, duration: 1.8, ease: 'power2.in' }, '+=0.3')
          .to(puffs, { opacity: 0, scale: 1.8, transformOrigin: '50% 50%', duration: 1.4, stagger: 0.1 }, '<')
          .set(f, { y: 0 })
          .to({}, { duration: 8 - 6.5 });
        return tl;
      },
    }),
    plastic: {
      html: `<line x1="6" y1="72" x2="104" y2="72" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
        ${minibin(160)}
        <g class="it" transform="translate(28 72)"><path d="M -9 0 L 9 0 L 12 -22 Q 0 -26 -12 -22 Z" fill="#E2E2E2" stroke="${L}" stroke-width="2.2"/></g>
        <g class="it" transform="translate(60 72)"><rect x="-13" y="-12" width="26" height="12" rx="3" fill="#D0D0D0" stroke="${L}" stroke-width="2.2"/><path d="M -14 -12 Q -14 -20 -6 -20 L 6 -20 Q 14 -20 14 -12" fill="#E6E6E6" stroke="${L}" stroke-width="2.2"/></g>
        <g class="it" transform="translate(90 72)"><rect x="-12" y="-6" width="24" height="6" rx="3" fill="#C8C8C8" stroke="${L}" stroke-width="2"/></g>`,
      play(svg) {
        const its = svg.querySelectorAll('.it');
        const home = [28, 60, 90];
        const tl = gsap.timeline({ repeat: -1 });
        its.forEach((it, i) => {
          tl.set(it, { x: home[i], y: 72, opacity: 1, scale: 1 }, 0);
          tl.to(it, { keyframes: [{ x: (home[i] + 160) / 2, y: 30, duration: 0.5, ease: 'power1.out' }, { x: 160, y: 62, duration: 0.4, ease: 'power1.in' }] }, 0.5 + i * 1.8)
            .to(it, { opacity: 0, scale: 0.4, duration: 0.15 })
            .to(svg.querySelector('.mbin'), { rotation: -6, transformOrigin: '50% 100%', duration: 0.08, yoyo: true, repeat: 3 }, '<');
        });
        tl.to({}, { duration: 8 - tl.duration() });
        return tl;
      },
    },
    packaging: {
      html: `${minibin(130)}${minibin(176)}
        <g class="it" transform="translate(34 100)"><rect x="-16" y="-24" width="32" height="24" rx="2" fill="#D6D6D6" stroke="${L}" stroke-width="2.2"/><line x1="0" y1="-24" x2="0" y2="-10" stroke="#888" stroke-width="3"/></g>
        <g class="it" transform="translate(76 100)"><path d="M -12 0 Q -14 -12 -10 -18 L 10 -18 Q 14 -12 12 0 Z" fill="#EAEAEA" stroke="${L}" stroke-width="2.2"/></g>`,
      play(svg) {
        const its = svg.querySelectorAll('.it');
        const home = [34, 76];
        const to = [130, 176];
        const bins = svg.querySelectorAll('.mbin');
        const tl = gsap.timeline({ repeat: -1 });
        its.forEach((it, i) => {
          tl.set(it, { x: home[i], y: 100, opacity: 1, scale: 1 }, 0);
          tl.to(it, { keyframes: [{ x: (home[i] + to[i]) / 2, y: 30, duration: 0.55, ease: 'power1.out' }, { x: to[i], y: 64, duration: 0.45, ease: 'power1.in' }] }, 0.6 + i * 2.4)
            .to(it, { opacity: 0, scale: 0.4, duration: 0.15 })
            .to(bins[i], { rotation: -6, transformOrigin: '50% 100%', duration: 0.08, yoyo: true, repeat: 3 }, '<');
        });
        tl.to({}, { duration: 8 - tl.duration() });
        return tl;
      },
    },
  };
  let vigLoops = [];

  function build(s) {
    const grid = $('.rv-grid');
    grid.innerHTML = '';
    ITEMS.forEach((it, idx) => {
      const v = s.piles[it.k];
      const n = v > 0 ? Math.min(MAX_UNITS, Math.max(1, Math.round(v / it.per))) : 0;
      const units = layout(n, 17 + idx * 31).map((p, i) => `
        <g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.rot.toFixed(1)}) scale(0.76)">
          <g class="u" fill="${GRAYS[i % GRAYS.length]}" stroke="#D5D5D2" stroke-width="1.8">${SHAPES[it.k](i)}</g>
        </g>`).join('');
      const bus = it.k === 'carbon' && s.choseBus;
      const vig = it.k === 'carbon' ? VIG.carbon(s.choseBus) : VIG[it.k];
      const li = document.createElement('li');
      li.className = 'rv-item';
      li.dataset.k = it.k;
      li.innerHTML = `
        <div class="rv-art">
          <svg viewBox="0 0 240 260" aria-hidden="true">
            <line class="rv-ground" x1="8" y1="252" x2="232" y2="252" stroke="#6E6E6E" stroke-width="3" stroke-linecap="round"/>
            <g class="rv-pile">${units}</g>
            <g class="rv-icon" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0">${ICONS[it.k]}</g>
          </svg>
          ${bus ? `<p class="rv-note">${T('busNote1')}<br>${T('busNote2')}</p>` : ''}
        </div>
        <div class="rv-text">
          <p class="rv-label"><span class="rv-val"><span class="rv-plus" aria-hidden="true">+</span><span class="rv-num">0</span> ${T(it.unit)}</span><span class="rv-task"><b>${T(it.name)}</b> / ${T(it.task)}</span>${
            it.k === 'packaging' && s.wrongBin ? `<span class="rv-sub">${T('wrongSub')}</span>` : ''}${
            bus ? `<span class="rv-sub rv-busline">${T('busNote1')} ${T('busNote2')}</span>` : ''}</p>
          <svg class="rv-vig" viewBox="0 0 200 110" aria-hidden="true">${vig.html}</svg>
          <p class="rv-fix">${T(it.fix)}</p>
        </div>`;
      li._vig = vig;
      grid.appendChild(li);
      gsap.set($$('.u', li), { opacity: 0, y: -260 });
      gsap.set($('.rv-ground', li), { strokeDasharray: '224 500', strokeDashoffset: 234 });
      gsap.set($('.rv-vig', li), { opacity: 0 });
    });
  }

  function hideStroke(p) {
    const len = p.getTotalLength();
    gsap.set(p, { strokeDasharray: `${len + 1} ${len + 60}`, strokeDashoffset: len + 12 });
  }

  async function pile(li, value) {
    const units = $$('.u', li);
    const num = $('.rv-num', li);
    const note = $('.rv-note', li);
    const count = { v: 0 };
    const tl = gsap.timeline();
    tl.to($('.rv-ground', li), { strokeDashoffset: 0, duration: 0.4, ease: 'power2.out' }, 0);
    if (units.length) {
      tl.to(units, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.in', stagger: Math.min(0.03, 1.3 / units.length) }, 0.1);
    }
    tl.to($('.rv-label', li), { opacity: 1, duration: 0.5 }, 0.3);
    tl.to(count, {
      v: value, duration: 1.3, ease: 'power2.out',
      onUpdate: () => { num.textContent = I18N.num(count.v); },
    }, 0.3);
    if (note) tl.to(note, { opacity: 1, duration: 1 }, 0.5);
    // The moment it came from, on a loop.
    const vsvg = $('.rv-vig', li);
    tl.add(() => { vigLoops.push(li._vig.play(vsvg)); }, 0.6);
    tl.to(vsvg, { opacity: 1, duration: 0.5 }, 0.6);
    await tl;
    await wait(0.2);
  }

  const setGray = (app, v) => { app.style.filter = v > 0.001 ? `grayscale(${v})` : ''; };

  async function run(s) {
    const app = $('#app');
    const section = $('#reveal');
    const hero = window.Game.hero;

    // 1 · Colour drains. Every sound stops.
    Sound.silence();
    if (hero) { hero.stopLoops(); hero.tremble(false); }
    Clock.hide(0.8);
    const gs = { v: 0 };
    await Promise.all([
      gsap.to(gs, { v: 1, duration: 1, ease: 'sine.inOut', onUpdate: () => setGray(app, gs.v) }),
      gsap.to(app, { backgroundColor: '#D5D5D2', duration: 1 }),
    ]);

    // 2 · A short, completely silent hold.
    await wait(1.5);

    // 3 · Stage away; the piles, one by one.
    await gsap.to(['#stage', '#sky'], { autoAlpha: 0, duration: 0.6 });
    section.hidden = false;
    build(s);
    await typeQuote();
    await gsap.to('.rv-head', { opacity: 1, duration: 0.8 });
    const lis = $$('.rv-item');
    for (let i = 0; i < lis.length; i++) await pile(lis[i], s.piles[ITEMS[i].k]);

    // Let the replays run their 8 seconds.
    await wait(8);
    const next = $('.rv-next');
    gsap.fromTo(next, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.8 });
    await new Promise((r) => next.addEventListener('click', r, { once: true }));
    next.blur();
    await solutions(lis);
  }

  // The one line before the data, typed out letter by letter.
  async function typeQuote() {
    const q = $('.rv-quote');
    const chars = I18N.graphemes(T('quote'));
    const text = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'caret';
    q.replaceChildren(text, caret);
    // Type it in the middle of the screen first (its final place is at the top).
    text.textContent = chars.join('');
    const r = q.getBoundingClientRect();
    text.textContent = '';
    gsap.set(q, { opacity: 1, y: window.innerHeight / 2 - (r.top + r.height / 2), scale: 1.2, transformOrigin: '50% 50%' });
    const step = I18N.lang === 'zh' ? 0.12 : 0.055;
    const p = { i: 0 };
    await gsap.to(p, {
      i: chars.length, duration: chars.length * step, ease: 'none',
      onUpdate: () => { text.textContent = chars.slice(0, Math.floor(p.i)).join(''); },
    });
    text.textContent = chars.join('');
    await wait(1.6);
    // It stays: glide up to sit above "× 365" for the whole data page.
    caret.remove();
    await gsap.to(q, { y: 0, scale: 1, duration: 1, ease: 'power3.inOut' });
  }

  async function solutions(lis) {
    const app = $('#app');
    const section = $('#reveal');
    await Sound.wake();
    gsap.to(['.rv-head', '.rv-next', '.rv-quote'], { autoAlpha: 0, duration: 0.6 });

    const out = gsap.timeline();
    lis.forEach((li, i) => {
      const units = $$('.u', li).reverse();
      if (units.length) out.to(units, { y: -30, opacity: 0, duration: 0.4, ease: 'power2.in', stagger: 0.004 }, i * 0.12);
      out.to([$('.rv-label', li), $('.rv-note', li), $('.rv-ground', li), $('.rv-vig', li)].filter(Boolean), { opacity: 0, duration: 0.5 }, i * 0.12);
    });
    await out;
    vigLoops.forEach((t) => t.kill());
    section.classList.add('fixing');

    const gs = { v: 1 };
    gsap.to(gs, { v: 0, duration: 3.2, ease: 'sine.inOut', onUpdate: () => setGray(app, gs.v) });
    gsap.to(app, { backgroundColor: '#EEF0EA', duration: 3.2, ease: 'sine.inOut' });
    gsap.to('#bleed', { opacity: 1, duration: 3.2, ease: 'sine.inOut' });
    gsap.to(section, { color: '#2F3A33', duration: 3 });
    await wait(0.8);

    Sound.softChime();
    const t = gsap.timeline();
    lis.forEach((li, i) => {
      const forest = ITEMS[i].tone === 'forest';
      const tone = forest ? C.FOREST : C.SLATE;
      const soft = forest ? C.SAGE : C.SKY;
      const icon = $('.rv-icon', li);
      icon.setAttribute('stroke', tone);
      const parts = $$('path, rect, circle, ellipse, line', icon);
      parts.forEach(hideStroke);
      const fills = $$('.fillable', icon);
      const solids = $$('.solid', icon);
      gsap.set(fills, { fill: soft, fillOpacity: 0 });
      gsap.set(solids, { fill: tone, fillOpacity: 0 });
      gsap.set(icon, { opacity: 1 });
      const at = i * 0.28;
      t.to(parts, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.08 }, at)
        .to(fills, { fillOpacity: 0.5, duration: 0.8 }, at + 0.7)
        .to(solids, { fillOpacity: 1, duration: 0.6 }, at + 0.8)
        .fromTo($('.rv-fix', li), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, at + 0.5);
    });
    await t;
    await wait(0.5);
    await gsap.to('.rv-end', { opacity: 1, duration: 1.2 });

    enablePicking(lis, section);
    const replay = $('.rv-replay');
    gsap.fromTo(replay, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.4 });
    replay.addEventListener('click', () => {
      Sound.click();
      gsap.to('#app', { opacity: 0, duration: 0.6, onComplete: () => location.reload() });
    }, { once: true });
  }

  function enablePicking(lis, section) {
    section.classList.add('solved');
    lis.forEach((li) => {
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-pressed', 'false');
      const pick = () => {
        const was = li.classList.contains('picked');
        lis.forEach((o) => { o.classList.remove('picked'); o.setAttribute('aria-pressed', 'false'); });
        if (!was) {
          li.classList.add('picked');
          li.setAttribute('aria-pressed', 'true');
          Sound.click();
          gsap.fromTo($('.rv-art', li), { scale: 0.9 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
        }
        section.classList.toggle('has-pick', !was);
      };
      li.addEventListener('click', pick);
      li.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        pick();
      });
    });
  }

  return { tally, run };
})();
