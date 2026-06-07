/* Start screen + the five ordinary tasks.
   Each task plays as a little animated scene first; the player only gets
   control when the moment arrives. The harmful option is the one that glows. */
window.Levels = (() => {
  const {
    C, G, FAST, $, group, wait, pivot, view, onTap, nudge, zone, draggable,
    wobble, intoBin, binMarkup, Clock, Sky, caption, toStage, phase,
  } = Kit;
  const scenesRoot = $('#scenes');
  const ui = $('#ui');
  const q = (root, s) => root.querySelector(s);
  const qa = (root, s) => Array.from(root.querySelectorAll(s));
  const H = () => window.Game.hero;
  const now = () => gsap.globalTimeline.time();
  let state = null;

  function scene(id, html) {
    const g = group(scenesRoot, html, { id, class: 'scene' });
    gsap.set(g, { autoAlpha: 0 });
    return g;
  }
  const backdrop = (html, o = 0.55) => `<g class="backdrop" opacity="${o}">${html}</g>`;

  // Washed-out street of buildings, like the reference.
  function street(seed = 1) {
    const cols = ['#E8D9C8', '#D9E2D3', '#DCE3EA', '#EADBD7', '#E6E0CF'];
    let out = '';
    let i = 0;
    for (let x = -1100; x < 2100; x += 250) {
      const h = 330 + ((i * 73 + seed * 41) % 120);
      const top = G - h;
      const col = cols[(i + seed) % cols.length];
      out += `<rect x="${x}" y="${top}" width="236" height="${h}" fill="${col}" stroke="#C8BFB3" stroke-width="3"/>`;
      out += `<rect x="${x - 4}" y="${top - 12}" width="244" height="14" fill="#D6CCBE"/>`;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const wy = top + 40 + r * 82;
          if (wy > G - 120) continue;
          out += `<rect x="${x + 26 + c * 70}" y="${wy}" width="44" height="54" rx="4" fill="#EEF2F5" stroke="#C3BBB0" stroke-width="2.5"/>`;
        }
      }
      if (i % 2 === 0) out += `<rect x="${x + 90}" y="${G - 110}" width="56" height="110" rx="4" fill="#D3DDD0" stroke="#C3BBB0" stroke-width="2.5"/>`;
      if (i % 3 === 1) out += `<rect x="${x + 172}" y="${G - 200}" width="10" height="200" fill="#B7AFA2"/><circle cx="${x + 177}" cy="${G - 236}" r="58" fill="#C6D3BC"/>`;
      i++;
    }
    return out + `<rect x="-1200" y="${G - 14}" width="3400" height="14" fill="#E2DCD0"/>`;
  }

  /* ---------------- shared art ---------------- */
  const CAR_BODY = 'M -128 -32 L -128 -62 Q -128 -78 -112 -80 L -80 -84 L -50 -120 Q -44 -126 -34 -126 L 42 -126 Q 52 -126 58 -118 L 86 -84 L 116 -80 Q 130 -78 130 -62 L 130 -32 Z';
  const BUS_BODY = 'M -218 -34 L -218 -178 Q -218 -196 -200 -196 L 186 -196 Q 212 -196 216 -170 L 222 -96 L 222 -34 Z';
  const wheel = (cx, r = 24) => `
    <g transform="translate(${cx} ${-r})"><g class="wspin">
      <circle r="${r}" fill="${C.INK}"/><circle r="${(r * 0.38).toFixed(1)}" fill="${C.BG}"/><circle cy="${(-r * 0.68).toFixed(1)}" r="3" fill="${C.BG}"/>
    </g></g>`;
  const carMarkup = () => `
    <path class="p" fill="${C.SAGE}" d="${CAR_BODY}"/>
    <path d="M -40 -114 L 8 -114 L 8 -88 L -62 -88 Z" fill="#E8EFF4" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M 20 -114 L 48 -114 L 68 -88 L 20 -88 Z" fill="#E8EFF4" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round"/>
    <line x1="14" y1="-84" x2="14" y2="-38" stroke="${C.INK}" stroke-width="3"/>
    <line x1="28" y1="-70" x2="42" y2="-70" stroke="${C.INK}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="122" cy="-66" r="5" fill="${C.CARD}"/>
    ${wheel(-72)}${wheel(76)}`;
  const busMarkup = () => `
    <path class="p" fill="${C.SKY}" d="${BUS_BODY}"/>
    ${[-196, -122, -48, 26].map((x) => `<rect x="${x}" y="-176" width="60" height="56" rx="8" fill="#EEF3F7" stroke="${C.INK}" stroke-width="4"/>`).join('')}
    <rect x="104" y="-176" width="50" height="140" rx="6" fill="#EEF3F7" stroke="${C.INK}" stroke-width="4"/>
    <line x1="129" y1="-172" x2="129" y2="-40" stroke="${C.INK}" stroke-width="3"/>
    <path d="M 168 -176 L 200 -176 Q 210 -176 212 -166 L 216 -110 L 168 -110 Z" fill="#EEF3F7" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round"/>
    <line x1="-218" y1="-100" x2="96" y2="-100" stroke="${C.INK}" stroke-width="3"/>
    <circle cx="214" cy="-62" r="5" fill="${C.CARD}"/>
    ${wheel(-140, 26)}${wheel(150, 26)}`;

  const chair = (x) => `
    <path class="p" d="M ${x - 48} 560 L ${x - 44} 712" fill="none"/>
    <rect class="p pf" x="${x - 58}" y="556" width="18" height="100" rx="7"/>
    <line class="p" x1="${x - 40}" y1="716" x2="${x - 38}" y2="780"/>
    <line class="p" x1="${x + 42}" y1="716" x2="${x + 40}" y2="780"/>
    <rect class="p pf" x="${x - 50}" y="704" width="104" height="13" rx="5"/>`;

  // Props held in a hand slot (hand at 0,0).
  const PROP = {
    phone: `<rect x="-11" y="-40" width="24" height="42" rx="6" fill="${C.CARD}" stroke="${C.INK}" stroke-width="3"/>
            <rect class="screen" x="-7" y="-35" width="16" height="28" rx="2" fill="#DCE7F0"/>`,
    brush: `<rect x="-2" y="-3" width="40" height="6" rx="3" fill="${C.SKY}" stroke="${C.INK}" stroke-width="2"/>
            <rect x="32" y="-9" width="10" height="7" rx="2" fill="${C.CARD}" stroke="${C.INK}" stroke-width="2"/>`,
    fork: `<path d="M 0 0 L 0 -34 M -5 -34 L -5 -46 M 0 -34 L 0 -48 M 5 -34 L 5 -46 M -5 -34 L 5 -34" fill="none" stroke="${C.INK}" stroke-width="3" stroke-linecap="round"/>`,
    bag: `<path d="M -9 4 Q -9 -10 0 -10 Q 9 -10 9 4" fill="none" stroke="${C.INK}" stroke-width="2.6"/>
          <path d="M -20 4 L 20 4 L 26 58 Q 0 64 -26 58 Z" fill="#DCE8F1" fill-opacity="0.92" stroke="${C.INK}" stroke-width="2.6" stroke-linejoin="round"/>
          <rect x="-15" y="20" width="30" height="22" rx="3" fill="#EEF3F7" stroke="#8FA9BE" stroke-width="2"/>`,
    sticks: `<path d="M -4 6 L 30 -26 M 2 8 L 34 -22" stroke="#8E8E8E" stroke-width="4" stroke-linecap="round"/>`,
    shirt: `<path d="M -16 -14 L 16 -14 L 16 10 L -16 10 Z" fill="${C.SAGE}" stroke="${C.INK}" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M -8 -14 Q 0 -6 8 -14" fill="none" stroke="${C.INK}" stroke-width="2"/>`,
  };

  /* ======================================================================
     START — pick who you are.
     ====================================================================== */
  const Start = {
    build() {
      const card = (t, x, label) => `
        <g class="card card-${t}" transform="translate(${x} 0)">
          <rect class="card-bg" x="-108" y="214" width="216" height="440" rx="34" fill="${Kit.NEU.surface}" filter="url(#neu)"/>
          <g class="ppl"></g>
          <text x="0" y="628" text-anchor="middle" font-size="30" style="fill:${Kit.NEU.text}" data-i18n="${t}">${I18N.t(t)}</text>
          <g class="tick" transform="translate(70 254)">
            <rect x="-20" y="-20" width="40" height="40" rx="11" fill="${Kit.NEU.surface}" filter="url(#neu)"/>
            <path class="tick-mark" d="M -9 1 L -3 8 L 10 -7" fill="none" stroke="${C.SAGE}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
          </g>
          <rect class="hit" x="-108" y="214" width="216" height="440" rx="30"/>
        </g>`;
      this.el = group(ui, `
        <text class="title" x="500" y="160" text-anchor="middle" font-size="44" style="fill:${Kit.NEU.text}" data-i18n="title">${I18N.t('title')}</text>
        ${card('boy', 380, 'Boy')}
        ${card('girl', 620, 'Girl')}
        <g class="start-btn" transform="translate(500 730)">
          <g class="start-in">
            <rect class="nf" x="-112" y="-36" width="224" height="72" rx="22" fill="${C.SAGE}" filter="url(#neu)"/>
            <rect x="-112" y="-36" width="224" height="72" rx="22" fill="url(#neuPrimary)" opacity="0.7" pointer-events="none"/>
            <path d="M -60 -13 L -38 0 L -60 13 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
            <text x="14" y="10" text-anchor="middle" font-size="29" style="fill:#FFFFFF" data-i18n="start">${I18N.t('start')}</text>
          </g>
        </g>
        <g class="langs" transform="translate(500 830)">
          ${I18N.langs.map((l, i) => `
            <g class="lang lang-${l}" data-lang="${l}" transform="translate(${(i - 1) * 160} 0)">
              <rect class="lang-bg" x="-70" y="-26" width="140" height="52" rx="18" fill="${Kit.NEU.surface}" filter="url(#neu)"/>
              <text class="lang-t" x="0" y="8" text-anchor="middle" font-size="22" style="fill:${Kit.NEU.text};font-family:${{ en: "'Helvetica Neue', Arial, sans-serif", bn: "'SolaimanLipi', sans-serif", zh: "'Ma Shan Zheng', sans-serif" }[l]}">${I18N.NAMES[l]}</text>
              <rect class="hit" x="-70" y="-26" width="140" height="52" rx="18"/>
            </g>`).join('')}
        </g>`, { id: 'start' });
      this.people = {
        boy: Character.create(q(this.el, '.card-boy .ppl'), { type: 'boy', scale: 0.78 }),
        girl: Character.create(q(this.el, '.card-girl .ppl'), { type: 'girl', scale: 0.78 }),
      };
      Object.values(this.people).forEach((p) => gsap.set(p.root, { x: 0, y: 588 }));
    },

    async run() {
      const el = this.el;
      gsap.set('#ground', { opacity: 0 });
      Sky.set('neutral', 0.01);
      const select = (t) => {
        state.avatarType = t;
        ['boy', 'girl'].forEach((k) => {
          const on = k === t;
          const c = q(el, `.card-${k}`);
          // Neumorphic: chosen card is pressed in, the other stands raised.
          const bg = q(c, '.card-bg');
          bg.setAttribute('filter', on ? 'url(#neuIn)' : 'url(#neu)');
          gsap.to(bg, { fill: on ? Kit.NEU.pressed : Kit.NEU.surface, duration: 0.3 });
          gsap.to(q(c, '.tick-mark'), { opacity: on ? 1 : 0, duration: 0.25 });
          gsap.to(c, { opacity: on ? 1 : 0.75, duration: 0.3 });
          c.setAttribute('aria-pressed', String(on));
          const p = this.people[k];
          if (on) p.wave(); else { p.stand(0.3); p.idle(); }
        });
      };
      const offs = ['boy', 'girl'].map((k) => onTap(q(el, `.card-${k}`), () => select(k), k === 'boy' ? 'Boy' : 'Girl'));
      // Language: English (default), বাংলা, 中文 — remembered for next time.
      const fitTitle = () => {
        const tt = q(el, '.title');
        tt.setAttribute('font-size', 44);
        const w = tt.getComputedTextLength();
        if (w > 720) tt.setAttribute('font-size', Math.floor(44 * 720 / w));
      };
      const pickLang = (l) => {
        I18N.set(l);
        fitTitle();
        if (document.fonts) document.fonts.ready.then(fitTitle);
        qa(el, '.lang').forEach((g) => {
          const on = g.dataset.lang === l;
          q(g, '.lang-bg').setAttribute('filter', on ? 'url(#neuIn)' : 'url(#neu)');
          gsap.to(q(g, '.lang-bg'), { fill: on ? Kit.NEU.pressed : Kit.NEU.surface, duration: 0.25 });
          gsap.to(q(g, '.lang-t'), { fill: on ? C.FOREST : Kit.NEU.text, duration: 0.25 });
          g.setAttribute('aria-pressed', String(on));
        });
      };
      qa(el, '.lang').forEach((g) => offs.push(onTap(g, () => pickLang(g.dataset.lang), I18N.NAMES[g.dataset.lang])));
      pickLang(I18N.lang);
      select('boy');
      gsap.from(q(el, '.title'), { opacity: 0, y: 16, duration: 1.2, ease: 'power2.out' });
      gsap.from(qa(el, '.card'), { opacity: 0, y: 30, duration: 0.8, stagger: 0.15, ease: 'power2.out', delay: 0.3 });
      gsap.from([q(el, '.start-btn'), q(el, '.langs')], { opacity: 0, y: 20, duration: 0.8, delay: 0.7, stagger: 0.12 });

      const btn = q(el, '.start-in');
      const n = nudge(btn, { box: { x: -112, y: -36, width: 224, height: 72 }, pad: 6, pulse: true });
      await new Promise((res) => onTap(q(el, '.start-btn'), res, 'Start'));
      offs.forEach((f) => f());
      n.stop();
      Sound.slide();

      // The chosen person steps out of the card and becomes "you".
      const type = state.avatarType;
      const x = type === 'boy' ? 380 : 620;
      const hero = Character.create($('#actor'), { type, scale: 1 });
      window.Game.hero = hero;
      gsap.set(hero.root, { x, y: 588, scale: 0.78 });
      gsap.set(this.people[type].root, { opacity: 0 });
      await Promise.all([
        gsap.to(el, { autoAlpha: 0, duration: 0.5 }),
        gsap.to(hero.root, { x: 420, y: G, scale: 1, duration: 0.9, ease: 'power2.inOut' }),
        gsap.to('#ground', { opacity: 1, duration: 0.8 }),
      ]);
      Object.values(this.people).forEach((p) => p.destroy());
    },
  };

  /* ======================================================================
     1 · WASHROOM (07:00) — water
     ====================================================================== */
  const Wash = {
    id: 'wash', charX: 480, clock: '07:00', sky: 'dawn',
    build() {
      Kit.el('pattern', { id: 'tiles', width: 48, height: 48, patternUnits: 'userSpaceOnUse' }, $('#defs')).innerHTML =
        '<rect width="48" height="48" fill="#ECE6DC"/><path d="M48 0H0V48" fill="none" stroke="#D6CEC0" stroke-width="2"/>';
      Kit.el('clipPath', { id: 'washWin' }, $('#defs')).innerHTML = '<rect x="200" y="300" width="130" height="150" rx="10"/>';
      this.el = scene('s-wash', `
        ${backdrop(`
          <rect x="-1200" y="-700" width="3400" height="1480" fill="url(#tiles)"/>
          <rect x="-1200" y="780" width="3400" height="800" fill="#D8CFC1"/>
          <g clip-path="url(#washWin)">
            <rect x="200" y="300" width="130" height="150" fill="#F3D3B8"/>
            <circle cx="268" cy="452" r="34" fill="#F0B27A"/>
          </g>
          <rect x="200" y="300" width="130" height="150" rx="10" fill="none" stroke="#B9AC9E" stroke-width="5"/>
          <path d="M 265 300 V 450 M 200 375 H 330" stroke="#B9AC9E" stroke-width="4"/>
          <rect x="790" y="470" width="64" height="130" rx="8" fill="${C.SAGE}"/>
          <line x1="780" y1="470" x2="864" y2="470" stroke="#9C9284" stroke-width="5" stroke-linecap="round"/>
        `, 0.6)}
        <rect class="p pf" x="545" y="350" width="100" height="145" rx="50"/>
        <path d="M 568 400 L 588 380 M 568 424 L 600 392" fill="none" stroke="${C.SKY}" stroke-width="5" stroke-linecap="round"/>
        <line class="p" x1="535" y1="505" x2="655" y2="505"/>
        <g class="shelf-brush">
          <path d="M 562 481 L 571 452" stroke="${C.SKY}" stroke-width="6" stroke-linecap="round"/>
          <rect x="566" y="443" width="9" height="13" rx="3" fill="${C.CARD}" stroke="${C.INK}" stroke-width="2.5" transform="rotate(17 571 449)"/>
        </g>
        <path class="p thin pf" d="M 548 505 L 550 481 L 572 481 L 574 505 Z"/>

        <path class="p pf" d="M 545 656 L 539 780 L 589 780 L 583 656 Z"/>
        <path class="p pf" d="M 478 600 L 650 600 L 645 611 Q 632 660 564 662 Q 496 660 483 611 Z"/>
        <ellipse class="pool" cx="575" cy="652" rx="24" ry="4.5" fill="${C.SKY}" opacity="0.8"/>
        <line class="stream" x1="575" y1="578" x2="575" y2="578" stroke="${C.SKY}" stroke-width="9" stroke-linecap="round" stroke-dasharray="26 9"/>
        <g class="splash" opacity="0">
          <circle cx="575" cy="648" r="3.5" fill="${C.SKY}"/><circle cx="575" cy="648" r="3" fill="${C.SKY}"/><circle cx="575" cy="648" r="2.5" fill="${C.SKY}"/>
        </g>
        <g class="faucet">
          <rect class="hit" x="560" y="515" width="115" height="95"/>
          <path d="M 621 562 L 584 562 Q 575 562 575 571 L 575 574" fill="none" stroke="${C.INK}" stroke-width="20" stroke-linecap="round"/>
          <path class="ns" d="M 621 562 L 584 562 Q 575 562 575 571 L 575 574" fill="none" stroke="${C.BG}" stroke-width="9" stroke-linecap="round"/>
          <rect class="p nf" fill="${C.BG}" x="612" y="552" width="18" height="48" rx="5"/>
          <g class="lever">
            <line x1="621" y1="547" x2="648" y2="547" stroke="${C.INK}" stroke-width="9" stroke-linecap="round"/>
            <circle class="nf" cx="651" cy="547" r="8" fill="${C.BG}" stroke="${C.INK}" stroke-width="4.5"/>
            <circle cx="621" cy="548" r="6" fill="${C.INK}"/>
          </g>
        </g>`);

      this.notif = group(ui, `
        <path d="M -40 26 L -60 70 L -14 26 Z" fill="${C.CARD}" stroke="${C.INK}" stroke-width="3" stroke-linejoin="round"/>
        <rect x="-205" y="-30" width="410" height="60" rx="18" fill="${C.CARD}" stroke="${C.INK}" stroke-width="3"/>
        <path d="M -42 30 L -16 30" stroke="${C.CARD}" stroke-width="5"/>
        <rect x="-186" y="-12" width="26" height="22" rx="3" fill="#E4DED2" stroke="${C.INK}" stroke-width="2.5"/>
        <line x1="-173" y1="-12" x2="-173" y2="10" stroke="${C.INK}" stroke-width="2"/>
        <text class="notif-t" x="-146" y="8" font-size="21" data-i18n="notif">${I18N.t('notif')}</text>`, { class: 'notif' });
      gsap.set(this.notif, { x: 600, y: 280, autoAlpha: 0 });
      pivot(this.notif, -50, 60);
    },

    waterOn() {
      const el = this.el;
      const stream = q(el, '.stream');
      this.loops = [gsap.to(stream, { strokeDashoffset: -35, duration: 0.3, ease: 'none', repeat: -1 })];
      gsap.to(stream, { attr: { y2: 650 }, duration: 0.3, ease: 'power2.in' });
      gsap.fromTo(q(el, '.pool'), { scaleX: 0, transformOrigin: '50% 50%' }, { scaleX: 1, duration: 0.5, delay: 0.25 });
      gsap.to(q(el, '.splash'), { opacity: 1, duration: 0.2, delay: 0.25 });
      qa(el, '.splash circle').forEach((c, i) => {
        const dir = [-1, 1, 0.35][i];
        this.loops.push(gsap.fromTo(c, { x: 0, y: 0, opacity: 1 }, { x: dir * 16, y: -14, opacity: 0, duration: 0.45, ease: 'power1.out', repeat: -1, delay: i * 0.15 }));
      });
    },
    waterOff() {
      const el = this.el;
      const stream = q(el, '.stream');
      this.loops.forEach((t) => t.kill());
      return gsap.timeline()
        .to(stream, { attr: { y1: 650 }, duration: 0.35, ease: 'power2.in' })
        .to(q(el, '.splash'), { opacity: 0, duration: 0.2 }, 0.2)
        .to(q(el, '.pool'), { scaleX: 0, duration: 0.6, ease: 'power2.in' }, 0.3)
        .set(stream, { opacity: 0 });
    },

    async play() {
      const h = H();
      const el = this.el;
      const lever = q(el, '.lever');
      const faucet = q(el, '.faucet');
      phase('wash-cut');
      await wait(0.3);

      // Turn the tap on.
      await h.reach('F', { x: 650, y: 545 }, 0.6, { torso: 20 });
      Sound.click();
      gsap.to(lever, { rotation: -35, svgOrigin: '621 547', duration: 0.25, ease: 'back.out(2)' });
      this.waterOn();
      const t0 = now();
      await wait(0.35);

      // Toothbrush from the shelf, brushing with the left (near) hand.
      await h.reach('F', { x: 566, y: 470 }, 0.5, { torso: 10 });
      gsap.set(q(el, '.shelf-brush'), { opacity: 0 });
      h.hold('F', PROP.brush, { up: 180 });
      const mouth = toStage(h.J.h, 26, -28);
      await h.reach('F', { x: mouth.x + 12, y: mouth.y + 6 }, 0.45, { torso: 4 });
      const brushing = gsap.to(h.J.ff, { rotation: '+=12', duration: 0.12, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      await wait(1.3);

      // Right (far) hand: the phone. A notification.
      h.hold('B', PROP.phone, { up: 0 });
      // Fit the notification card to the text in the chosen language.
      const nt = q(this.notif, '.notif-t');
      const nw = Math.max(410, Math.ceil(nt.getComputedTextLength()) + 59 + 28);
      q(this.notif, 'rect').setAttribute('width', nw);
      await h.reach('B', { x: mouth.x + 52, y: mouth.y + 4 }, 0.55);
      gsap.to(h.J.h, { rotation: 12, duration: 0.4 });
      Sound.pop();
      const slotB = h.root.querySelector('.aB-slot');
      gsap.fromTo(slotB, { x: -2 }, { x: 2, duration: 0.05, repeat: 7, yoyo: true, onComplete: () => gsap.set(slotB, { x: 0 }) });
      gsap.to(slotB.querySelector('.screen'), { fill: '#BFD6E8', duration: 0.2 });
      gsap.fromTo(this.notif, { autoAlpha: 0, scale: 0.5 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' });
      brushing.timeScale(0.35);
      phase('wash-notif');
      await wait(3.2);

      // Oh no — the water.
      gsap.to(this.notif, { autoAlpha: 0, scale: 0.8, duration: 0.2 });
      brushing.kill();
      Sound.gasp();
      h.mark('!');
      gsap.timeline().to(h.root, { y: G - 24, duration: 0.14, ease: 'power2.out' }).to(h.root, { y: G, duration: 0.2, ease: 'bounce.out' });
      await h.to({ t: -6, h: 18, fu: -150, ff: -40, bu: -130, bf: -30 }, 0.16, 'power3.out');
      await h.to({ t: 0, h: 16, fu: -40, ff: -112, bu: -30, bf: -108 }, 0.3);
      h.sweat(true);
      h.tremble(true);
      gsap.to(q(el, '.stream'), { attr: { 'stroke-width': 13 }, duration: 0.3 });

      // Now the player can act.
      const cap = caption(ui, I18N.t('tapOff'), 662, 560, { arrow: 'left' });
      const n = nudge(faucet, { box: { x: 568, y: 528, width: 96, height: 76 } });
      phase('wash-tap');
      await new Promise((res) => { const off = onTap(faucet, () => { off(); res(); }, 'Turn off the tap'); });
      phase('wash-cut');
      state.waterSeconds = now() - t0;
      n.stop();
      cap.hide();

      h.tremble(false);
      await h.reach('F', { x: 652, y: 532 }, 0.25, { torso: 18 });
      gsap.to(lever, { rotation: 0, svgOrigin: '621 547', duration: 0.25, ease: 'back.out(2)' });
      await this.waterOff();

      // Relief.
      h.sweat(false);
      h.clearMark();
      h.release('F');
      h.release('B');
      gsap.set(q(el, '.shelf-brush'), { opacity: 1 });
      h.puff();
      await h.to({ ...Character.STAND, t: 10, h: 10, bu: 14, fu: 4 }, 0.5);
      await h.to(Character.STAND, 0.5);
      h.idle();
    },
  };

  /* ======================================================================
     2 · BREAKFAST (07:30) — food
     ====================================================================== */
  const Breakfast = {
    id: 'breakfast', charX: 345, clock: '07:30', sky: 'morning',
    build() {
      Kit.el('clipPath', { id: 'kitWin' }, $('#defs')).innerHTML = '<rect x="150" y="300" width="140" height="150" rx="10"/>';
      const bites = [
        '<circle class="bite" cx="34" cy="-8" r="5.5" fill="#8A9A7B" stroke="#555" stroke-width="2"/>',
        '<circle class="bite" cx="-6" cy="-20" r="6" fill="#8A9A7B" stroke="#555" stroke-width="2"/>',
        '<path class="bite" d="M 10 -6 L 22 -6 L 20 -16 Z" fill="#E3DCCB" stroke="#555" stroke-width="2"/>',
      ].join('');
      this.el = scene('s-breakfast', `
        ${backdrop(`
          <rect x="-1200" y="-700" width="3400" height="1480" fill="#EFE6D6"/>
          <rect x="-1200" y="780" width="3400" height="800" fill="#DCCDB4"/>
          <g clip-path="url(#kitWin)"><rect x="150" y="300" width="140" height="150" fill="#F6E3B8"/><circle cx="250" cy="345" r="26" fill="#F2C46D"/></g>
          <rect x="150" y="300" width="140" height="150" rx="10" fill="none" stroke="#BDAE95" stroke-width="5"/>
          <path d="M 220 300 V 450" stroke="#BDAE95" stroke-width="4"/>
          ${[560, 660, 760].map((x) => `<rect x="${x}" y="320" width="96" height="110" rx="6" fill="#E4D9C4" stroke="#C6B89F" stroke-width="3"/><line x1="${x + 80}" y1="360" x2="${x + 80}" y2="390" stroke="#C6B89F" stroke-width="4" stroke-linecap="round"/>`).join('')}
        `, 0.6)}
        ${chair(345)}
        <line class="p" x1="420" y1="660" x2="426" y2="780"/>
        <line class="p" x1="680" y1="660" x2="674" y2="780"/>
        <rect class="p pf" x="400" y="646" width="300" height="14" rx="7"/>
        <path class="p thin o" d="M 659 622 q 13 1 11 12 q -2 7 -10 6"/>
        <path class="p thin pf" d="M 634 646 L 632 614 L 660 614 L 658 646 Z"/>
        <g class="bin" transform="translate(790 ${G})">${binMarkup({ w: 84, h: 112 })}</g>
        <g class="plate">
          <rect class="hit" x="-80" y="-56" width="160" height="74"/>
          <ellipse class="p thin pf" cx="0" cy="0" rx="66" ry="11"/>
          <ellipse cx="0" cy="-1" rx="44" ry="6" fill="none" stroke="#D6D2C9" stroke-width="3"/>
          <g class="food">
            <path d="M -46 -3 L -44 -30 Q -43 -42 -31 -42 L -27 -42 A 6 6 0 0 0 -19 -34 L -17 -3 Z" fill="#E3DCCB" stroke="${C.INK}" stroke-width="3" stroke-linejoin="round"/>
            <ellipse cx="2" cy="-8" rx="16" ry="7" fill="${C.CARD}" stroke="${C.INK}" stroke-width="3"/>
            <circle cx="5" cy="-10" r="4.5" fill="${C.ASH}"/>
            <circle cx="44" cy="-6" r="5" fill="${C.SAGE}" stroke="${C.INK}" stroke-width="2"/>
            <circle cx="38" cy="-14" r="5" fill="${C.SAGE}" stroke="${C.INK}" stroke-width="2"/>
            ${bites}
          </g>
        </g>`);
      gsap.set(q(this.el, '.plate'), { x: 475, y: 640 });
      pivot(q(this.el, '.food'), 0, 0);
      qa(this.el, '.bite').forEach((b) => gsap.set(b, { transformOrigin: '50% 50%' }));
      this.pop = q(this.el, '.bin .bin-pop');
      gsap.set(this.pop, { scale: 0, transformOrigin: '50% 100%' });

      // Fullness bar (no words: a plate icon and a filling bar).
      this.bar = group(ui, `
        <g transform="translate(-196 0)">
          <circle r="24" fill="${C.CARD}" stroke="${C.INK}" stroke-width="3"/>
          <ellipse cx="0" cy="4" rx="14" ry="5" fill="none" stroke="${C.INK}" stroke-width="2.5"/>
          <path d="M -4 -12 L -4 0 M 4 -12 L 4 0" stroke="${C.INK}" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <rect x="-160" y="-16" width="330" height="32" rx="16" fill="${C.CARD}" stroke="${C.INK}" stroke-width="3"/>
        <rect class="fill" x="-155" y="-11" width="0" height="22" rx="11" fill="${C.SAGE}"/>`, { class: 'fullbar' });
      gsap.set(this.bar, { x: 500, y: 200, autoAlpha: 0 });
    },

    async play() {
      const h = H();
      const el = this.el;
      const plate = q(el, '.plate');
      const fill = q(this.bar, '.fill');
      phase('breakfast-cut');

      await h.sit(0.6);
      h.hold('F', PROP.fork, { up: -20 });
      gsap.fromTo(this.bar, { autoAlpha: 0, y: 186 }, { autoAlpha: 1, y: 200, duration: 0.4 });
      const bites = qa(el, '.bite');
      for (let i = 0; i < 4; i++) {
        await h.reach('F', { x: 470 + (i % 2) * 18, y: 628 }, 0.42, { torso: 16 });
        if (bites[i]) gsap.to(bites[i], { scale: 0, opacity: 0, duration: 0.2 });
        Sound.click();
        const mouth = toStage(h.J.h, 26, -26);
        await h.reach('F', { x: mouth.x + 4, y: mouth.y + 14 }, 0.4, { torso: 0 });
        gsap.to(fill, { attr: { width: 320 * ((i + 1) / 4) }, duration: 0.5, ease: 'power2.out' });
        await gsap.to(h.J.h, { rotation: 6, duration: 0.12, yoyo: true, repeat: 3 });
      }

      // Full.
      gsap.fromTo(fill, { fill: C.SAGE }, { fill: C.ACC, duration: 0.2, yoyo: true, repeat: 5 });
      h.release('F');
      await h.to({ t: -12, h: -8, fu: -10, ff: -70 }, 0.5);
      await gsap.to(h.J.ff, { rotation: '-=14', duration: 0.12, yoyo: true, repeat: 3 });
      h.puff();
      await wait(0.6);

      // Leftovers. What now?
      h.mark('?');
      h.sweat(true);
      await gsap.timeline()
        .to(h.J.h, { rotation: -14, duration: 0.35 })
        .to(h.J.h, { rotation: 16, duration: 0.5 })
        .to(h.J.h, { rotation: 10, duration: 0.3 });
      gsap.to(this.bar, { autoAlpha: 0, duration: 0.4 });
      Sound.pop();
      await gsap.to(this.pop, { scale: 1, duration: 0.5, ease: 'back.out(2)' });

      const bin = q(el, '.bin');
      const binInner = q(bin, '.bin-inner');
      const n = nudge(binInner);
      phase('breakfast-bin');
      await new Promise((resolve) => {
        const z = zone(bin, q(bin, '.zr'), 'Bin');
        draggable(plate, {
          zones: [z], label: 'Plate', hintTo: { x: 790, y: 650 },
          onDrop: async (_z, ctl) => {
            n.stop();
            z.off();
            state.foodTo = 'bin';
            await this.scrape(ctl.home, binInner);
            resolve();
          },
        });
      });
      phase('breakfast-cut');
      h.clearMark();
      h.sweat(false);
      h.puff();
      await h.to(Character.STAND, 0.7);
      h.idle();
    },

    scrape(home, binInner) {
      const plate = q(this.el, '.plate');
      const food = q(this.el, '.food');
      const deg = 58;
      const th = (deg * Math.PI) / 180;
      return gsap.timeline()
        .to(plate, { x: 760, y: 610, rotation: 0, scale: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' })
        .to(plate, { rotation: deg, duration: 0.28, ease: 'power2.out' })
        .to(food, { x: Math.sin(th) * 80, y: Math.cos(th) * 80, opacity: 0, scale: 0.6, duration: 0.32, ease: 'power2.in' }, '-=0.05')
        .add(() => { Sound.drop(); wobble(binInner); })
        .to(plate, { x: home.x, y: home.y, rotation: 0, duration: 0.6, ease: 'power2.inOut' }, '+=0.15');
    },
  };

  /* ======================================================================
     3 · COMMUTE (08:10) — carbon. The ride options float up from the phone.
     ====================================================================== */
  const Commute = {
    id: 'commute', charX: 330, clock: '08:10', sky: 'day',
    build() {
      this.el = scene('s-commute', `
        <circle cx="780" cy="170" r="54" fill="#F5D58A" opacity="0.35"/>
        <circle cx="780" cy="170" r="36" fill="#F2C46D" stroke="${C.INK}" stroke-width="3"/>
        ${backdrop(street(1), 0.55)}
        <line class="p" x1="190" y1="780" x2="190" y2="455"/>
        <rect class="p thin" fill="${C.BG2}" x="200" y="520" width="34" height="62" rx="4"/>
        <line class="p hair" x1="207" y1="536" x2="227" y2="536"/>
        <line class="p hair" x1="207" y1="550" x2="227" y2="550"/>
        <line class="p hair" x1="207" y1="564" x2="220" y2="564"/>
        <circle class="p pf" cx="190" cy="420" r="38"/>
        <g transform="translate(190 420)">
          <rect x="-20" y="-14" width="40" height="24" rx="6" fill="${C.SKY}" stroke="${C.INK}" stroke-width="3"/>
          <line x1="-20" y1="-3" x2="20" y2="-3" stroke="${C.INK}" stroke-width="2.5"/>
          <circle cx="-10" cy="12" r="4" fill="${C.INK}"/><circle cx="10" cy="12" r="4" fill="${C.INK}"/>
        </g>
        <g class="bus"><g transform="scale(1.55)">${busMarkup()}</g></g>
        <g class="car"><g transform="scale(1.7)">${carMarkup()}</g></g>`);
      this.car = q(this.el, '.car');
      this.bus = q(this.el, '.bus');
      pivot(this.car, 0, 0);
      pivot(this.bus, 0, 0);
      gsap.set([this.car, this.bus], { x: -3000, y: G });
      qa(this.el, '.wspin').forEach((w) => pivot(w, 0, 0));

      const glyph = (body, s, ty, wheels, fill = '#FFFFFF') => `
        <g transform="translate(-100 ${ty}) scale(${s})" fill="${fill}">
          <path d="${body}"/>${wheels.map(([x, r]) => `<circle cx="${x}" cy="${-r}" r="${r}"/>`).join('')}
        </g>`;
      this.cards = group(ui, `
        <path class="link" d="M 0 0 C 60 -40 120 -60 190 -110" fill="none" stroke="${C.INK}" stroke-width="2.5" stroke-dasharray="2 9" stroke-linecap="round" opacity="0"/>
        <g class="opt-car"><g class="card-in">
          <rect class="nf" x="-140" y="-38" width="280" height="76" rx="22" fill="${C.SAGE}" filter="url(#neu)"/>
          <rect x="-140" y="-38" width="280" height="76" rx="22" fill="url(#neuPrimary)" opacity="0.7" pointer-events="none"/>
          ${glyph(CAR_BODY, 0.2, 12, [[-72, 24], [76, 24]])}
          <text x="-56" y="10" font-size="28" style="fill:#FFFFFF" data-i18n="car">${I18N.t('car')}</text>
        </g></g>
        <g class="opt-bus"><g class="card-in">
          <rect x="-140" y="-38" width="280" height="76" rx="22" fill="${Kit.NEU.surface}" filter="url(#neu)"/>
          ${glyph(BUS_BODY, 0.12, 12, [[-140, 26], [150, 26]], '#9AA1AC')}
          <text class="bus-label" x="-56" y="10" font-size="28" style="fill:${Kit.NEU.text}" data-i18n="bus">${I18N.t('bus')}</text>
          <g class="spinner" transform="translate(100 0)" opacity="0">
            <circle r="17" fill="none" stroke="rgba(85,85,85,0.2)" stroke-width="5"/>
            <circle class="prog" r="17" fill="none" stroke="${C.INK}" stroke-width="5" stroke-linecap="round" transform="rotate(-90)"/>
            <g class="spin"><path d="M 0 -8 A 8 8 0 0 1 8 0" fill="none" stroke="${C.INK}" stroke-width="4" stroke-linecap="round"/></g>
          </g>
        </g></g>`, { class: 'ridecards' });
      gsap.set(qa(this.cards, '.opt-car, .opt-bus'), { autoAlpha: 0 });
      pivot(q(this.cards, '.spin'), 0, 0);
    },

    async play() {
      const h = H();
      phase('commute-cut');
      await wait(0.4);
      // Phone out. The options float up into the air.
      h.hold('B', PROP.phone, { up: 0 });
      const mouth = toStage(h.J.h, 26, -28);
      const phoneAt = { x: mouth.x + 50, y: mouth.y + 10 };
      await h.reach('B', phoneAt, 0.55);
      gsap.to(h.J.h, { rotation: 12, duration: 0.4 });
      h.idle();
      const slot = h.root.querySelector('.aB-slot');
      const ph = toStage(slot, 0, -30);
      const link = q(this.cards, '.link');
      const optCar = q(this.cards, '.opt-car');
      const optBus = q(this.cards, '.opt-bus');
      const spots = [{ x: 640, y: 320 }, { x: 640, y: 420 }];
      gsap.set(link, { attr: { d: `M ${ph.x} ${ph.y} C ${ph.x + 60} ${ph.y - 40} ${spots[0].x - 200} ${spots[0].y + 60} ${spots[0].x - 140} ${spots[0].y}` } });
      gsap.to(link, { opacity: 0.5, duration: 0.4 });
      [optCar, optBus].forEach((o, i) => {
        gsap.fromTo(o, { x: ph.x, y: ph.y, scale: 0.1, autoAlpha: 0 }, {
          x: spots[i].x, y: spots[i].y, scale: 1, autoAlpha: 1, duration: 0.6, delay: i * 0.18, ease: 'back.out(1.6)', onStart: () => Sound.pop(),
        });
        gsap.to(q(o, '.card-in'), { y: -6, duration: 1.2 + i * 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      });
      await wait(0.9);

      const carNudge = nudge(q(optCar, '.card-in'), { box: { x: -140, y: -38, width: 280, height: 76 }, pad: 8, pulse: true });
      let chosen = null;
      let busCall = null;
      let waiting = null;
      const spinTweens = [];
      const offs = [];
      phase('commute-choose');

      await new Promise((resolve) => {
        const go = async (mode) => {
          if (chosen) return;
          chosen = mode;
          phase('commute-cut');
          offs.forEach((f) => f());
          carNudge.stop();
          if (busCall) busCall.kill();
          if (waiting) waiting.kill();
          spinTweens.forEach((t) => t.kill());
          state.ride = mode;
          state.choseBus = mode === 'bus';
          await gsap.fromTo(mode === 'car' ? optCar : optBus, { scale: 1 }, { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 });
          Sound.slideOut();
          const back = toStage(slot, 0, -30);
          gsap.to(link, { opacity: 0, duration: 0.2 });
          await gsap.to([optCar, optBus], { x: back.x, y: back.y, scale: 0.1, autoAlpha: 0, duration: 0.4, ease: 'power2.in', stagger: 0.06 });
          h.release('B');
          await h.stand(0.35);
          await (mode === 'car' ? this.ride(this.car, 600, 610) : this.ride(this.bus, 560, 760));
          resolve();
        };
        offs.push(onTap(optCar, () => go('car'), 'Car, 5 seconds'));
        offs.push(onTap(optBus, () => {
          if (chosen || busCall) return;
          const secs = FAST ? 3 : 30;
          const bl = q(optBus, '.bus-label');
          bl.removeAttribute('data-i18n');
          bl.textContent = I18N.t('busWait');
          optBus.setAttribute('aria-label', 'Bus, waiting');
          const spinner = q(optBus, '.spinner');
          const prog = q(spinner, '.prog');
          const L = 2 * Math.PI * 17;
          gsap.set(prog, { strokeDasharray: L, strokeDashoffset: L });
          gsap.to(spinner, { opacity: 1, duration: 0.3 });
          spinTweens.push(
            gsap.to(prog, { strokeDashoffset: 0, duration: secs, ease: 'none' }),
            gsap.to(q(spinner, '.spin'), { rotation: 360, duration: 0.9, ease: 'none', repeat: -1 }),
          );
          // Waiting: tap a foot, glance down the road, back to the phone.
          waiting = gsap.timeline({ repeat: -1 })
            .to(h.J.lff, { rotation: -14, duration: 0.18, yoyo: true, repeat: 5 })
            .to(h.J.h, { rotation: -16, duration: 0.5 }, '+=0.4')
            .to(h.J.h, { rotation: 12, duration: 0.5 }, '+=1.2');
          busCall = gsap.delayedCall(secs, () => {
            busCall = null;
            Clock.roll('08:11', 0.6);
            go('bus');
          });
        }, 'Bus, 30 seconds'));
      });
    },

    async ride(vehicle, stopX, doorX) {
      const h = H();
      const v = view();
      const wheels = qa(vehicle, '.wspin');
      gsap.set(vehicle, { x: v.left - 420 });
      Sound.slide();
      gsap.to(wheels, { rotation: '+=900', duration: 1.3, ease: 'power3.out' });
      await gsap.to(vehicle, { x: stopX, duration: 1.3, ease: 'power3.out' });
      gsap.fromTo(vehicle, { scaleY: 0.97 }, { scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      await h.walkTo(doorX, { speed: 240 });
      await gsap.timeline()
        .to(h.root, { y: G - 40, duration: 0.22, ease: 'power2.out' })
        .to(h.root, { y: G - 30, scale: 0.7, autoAlpha: 0, duration: 0.22, ease: 'power2.in' });
      Sound.click();
      await wait(0.3);
      gsap.to(wheels, { rotation: '+=1400', duration: 1.2, ease: 'power2.in' });
      await gsap.to(vehicle, { x: v.right + 520, duration: 1.2, ease: 'power2.in' });
    },
  };

  /* ======================================================================
     4a · LUNCH, the shop (12:30)
     ====================================================================== */
  const Shop = {
    id: 'shop', charX: 240, clock: '12:30', sky: 'noon',
    build() {
      const scallops = Array.from({ length: 11 }, (_, i) => `Q ${447 + i * 40} 422 ${467 + i * 40} 406`).join(' ');
      this.el = scene('s-shop', `
        <circle cx="520" cy="110" r="56" fill="#F5D58A" opacity="0.35"/>
        <circle cx="520" cy="110" r="38" fill="#F2C46D" stroke="${C.INK}" stroke-width="3"/>
        ${backdrop(street(3), 0.5)}
        <rect class="p" fill="#EFE5D6" x="420" y="300" width="470" height="480"/>
        <rect fill="#E2D5C2" stroke="${C.INK}" stroke-width="4" x="410" y="290" width="490" height="34"/>
        <path d="M 427 372 L 887 372 L 887 406 ${scallops} L 427 406 Z" fill="${C.SAGE}" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round"/>
        ${[467, 547, 627, 707, 787].map((x) => `<rect x="${x}" y="372" width="40" height="34" fill="#A8B89A"/>`).join('')}
        <path d="M 427 372 L 887 372" stroke="${C.INK}" stroke-width="4"/>
        <rect x="450" y="440" width="210" height="200" rx="6" fill="#E8EEF2" stroke="${C.INK}" stroke-width="5"/>
        <line x1="450" y1="580" x2="660" y2="580" stroke="${C.INK}" stroke-width="4"/>
        ${[470, 520, 570, 615].map((x, i) => `<rect x="${x}" y="${552 - (i % 2) * 8}" width="34" height="${28 + (i % 2) * 8}" rx="4" fill="${i % 2 ? '#DCE8F1' : '#E4DED2'}" stroke="${C.INK}" stroke-width="2.5"/>`).join('')}
        <circle cx="520" cy="490" r="22" fill="#F1E6D2" stroke="${C.INK}" stroke-width="3"/>
        <path d="M 504 492 Q 520 510 536 492 Z" fill="${C.SAGE}" stroke="${C.INK}" stroke-width="2.5"/>
        <rect x="690" y="430" width="130" height="350" fill="#D9E4EC" stroke="${C.INK}" stroke-width="5"/>
        <g class="shopdoor">
          <rect x="696" y="436" width="118" height="344" fill="#EEF3F7" stroke="${C.INK}" stroke-width="3"/>
          <rect x="712" y="456" width="86" height="190" rx="6" fill="#DCE8F1" stroke="${C.INK}" stroke-width="2.5"/>
          <line x1="798" y1="600" x2="798" y2="650" stroke="${C.INK}" stroke-width="6" stroke-linecap="round"/>
        </g>`);
    },
    async play() {
      const h = H();
      phase('shop-cut');
      await h.walkTo(755, { speed: 220 });
      const door = q(this.el, '.shopdoor');
      Sound.ding();
      gsap.to(door, { scaleX: 0.12, svgOrigin: '696 600', duration: 0.35 });
      await gsap.to(h.root, { autoAlpha: 0, scale: 0.94, duration: 0.35 });
      gsap.to(door, { scaleX: 1, svgOrigin: '696 600', duration: 0.3, delay: 0.1 });
      await wait(1.3);
      // Out again, with lunch in a plastic bag.
      h.hold('F', PROP.bag, { up: 0 });
      h.set({ fu: -10, ff: -20 });
      Sound.ding();
      gsap.to(door, { scaleX: 0.12, svgOrigin: '696 600', duration: 0.3 });
      await gsap.to(h.root, { autoAlpha: 1, scale: 1, duration: 0.35 });
      gsap.to(door, { scaleX: 1, svgOrigin: '696 600', duration: 0.3, delay: 0.15 });
      await wait(0.3);
    },
  };

  /* ======================================================================
     4b · LUNCH, the desk (12:45) — plastic
     ====================================================================== */
  const Desk = {
    id: 'desk', charX: 350, clock: '12:45', sky: 'noon',
    build() {
      Kit.el('clipPath', { id: 'deskWin' }, $('#defs')).innerHTML = '<rect x="470" y="270" width="240" height="170" rx="8"/>';
      this.el = scene('s-desk', `
        ${backdrop(`
          <rect x="-1200" y="-700" width="3400" height="1480" fill="#E7EBEC"/>
          <rect x="-1200" y="780" width="3400" height="800" fill="#CDD3D6"/>
          <g clip-path="url(#deskWin)">
            <rect x="470" y="270" width="240" height="170" fill="#C7DDEE"/>
            <circle cx="600" cy="300" r="26" fill="#F2C46D"/>
            ${[480, 520, 575, 630, 670].map((x, i) => `<rect x="${x}" y="${370 - (i % 3) * 30}" width="38" height="${80 + (i % 3) * 30}" fill="#B7C6D3"/>`).join('')}
          </g>
          <rect x="470" y="270" width="240" height="170" rx="8" fill="none" stroke="#A9B3BA" stroke-width="5"/>
          <path d="M 590 270 V 440" stroke="#A9B3BA" stroke-width="4"/>
          <rect x="130" y="300" width="150" height="230" fill="#DCD6CB" stroke="#B8B0A3" stroke-width="3"/>
          ${[340, 400, 460].map((y) => `<line x1="130" y1="${y}" x2="280" y2="${y}" stroke="#B8B0A3" stroke-width="3"/>`).join('')}
        `, 0.6)}
        ${chair(350)}
        <line class="p" x1="424" y1="660" x2="430" y2="780"/>
        <line class="p" x1="756" y1="660" x2="750" y2="780"/>
        <rect class="p pf" x="400" y="646" width="380" height="14" rx="7"/>
        <g class="dplate"><ellipse class="p thin pf" cx="630" cy="640" rx="56" ry="10"/><g class="dfood"></g></g>
        <g class="bin" transform="translate(862 ${G})">${binMarkup({ w: 80, h: 112 })}</g>

        <g class="bagw">
          <rect class="hit" x="-34" y="-74" width="68" height="84"/>
          <path d="M -9 -62 Q -9 -76 0 -76 Q 9 -76 9 -62" fill="none" stroke="${C.INK}" stroke-width="2.6"/>
          <path class="bagbody" d="M -20 -62 L 20 -62 L 26 -4 Q 0 2 -26 -4 Z" fill="#DCE8F1" fill-opacity="0.92" stroke="${C.INK}" stroke-width="2.6" stroke-linejoin="round"/>
        </g>
        <g class="takeout">
          <rect class="hit" x="-62" y="-70" width="124" height="82"/>
          <path class="p thin" fill="#DCE8F1" d="M -46 -28 L 46 -28 L 40 0 L -40 0 Z"/>
          <g class="tfood">
            <circle cx="-22" cy="-32" r="10" fill="#F3EEE2" stroke="${C.INK}" stroke-width="2.5"/>
            <circle cx="0" cy="-34" r="10" fill="${C.SAGE}" stroke="${C.INK}" stroke-width="2.5"/>
            <circle cx="22" cy="-32" r="10" fill="#E3DCCB" stroke="${C.INK}" stroke-width="2.5"/>
          </g>
          <g class="lid"><path class="p thin" fill="#E9F0F6" d="M -50 -28 Q -50 -54 -30 -56 L 30 -56 Q 50 -54 50 -28 Z"/></g>
        </g>
        <g class="sticks">
          <rect class="hit" x="-56" y="-24" width="112" height="36"/>
          <g class="film">
            <rect x="-48" y="-15" width="96" height="22" rx="10" fill="${C.SKY}" fill-opacity="0.55" stroke="#7FA3BF" stroke-width="2.5"/>
            <path d="M -48 -13 l -6 4 l 6 4 l -6 4 l 6 4 l -6 4 M 48 -13 l 6 4 l -6 4 l 6 4 l -6 4 l 6 4" fill="none" stroke="#7FA3BF" stroke-width="2.5" stroke-linejoin="round"/>
          </g>
          <g class="woodsticks"><line x1="-42" y1="-8" x2="42" y2="-6" stroke="#8E8E8E" stroke-width="5" stroke-linecap="round"/><line x1="-42" y1="0" x2="42" y2="1" stroke="#8E8E8E" stroke-width="5" stroke-linecap="round"/></g>
        </g>`);
      const el = this.el;
      this.bag = q(el, '.bagw');
      this.box = q(el, '.takeout');
      this.sticks = q(el, '.sticks');
      this.pop = q(el, '.bin .bin-pop');
      gsap.set(this.pop, { scale: 0, transformOrigin: '50% 100%' });
      gsap.set([this.bag, this.box], { autoAlpha: 0 });
      gsap.set(this.sticks, { x: 560, y: 642, autoAlpha: 0 });
      gsap.set(q(el, '.dplate'), { x: -160 }); // plate right in front of the person
      pivot(this.bag, 0, 0);
      pivot(this.box, 0, 0);
      pivot(q(el, '.lid'), 50, -28);
    },

    async play() {
      const h = H();
      const el = this.el;
      phase('desk-cut');
      await h.sit(0.6);
      // Bag onto the desk.
      await h.reach('F', { x: 505, y: 600 }, 0.45, { torso: 14 });
      h.release('F');
      gsap.set(this.bag, { x: 505, y: 646, autoAlpha: 1 });
      Sound.drop();
      await gsap.to(this.bag, { x: 570, duration: 0.35, ease: 'power2.out' });
      // Box out of the bag, onto the desk.
      gsap.set(this.box, { x: 570, y: 640, autoAlpha: 1, scale: 0.6 });
      await gsap.timeline()
        .to(this.box, { y: 560, scale: 1, duration: 0.45, ease: 'power2.out' })
        .to(this.box, { x: 650, y: 646, duration: 0.45, ease: 'power2.inOut' });
      gsap.to(q(this.bag, '.bagbody'), { scaleY: 0.7, transformOrigin: '50% 100%', duration: 0.3 });
      // Lid open.
      Sound.pop();
      await gsap.to(q(el, '.lid'), { rotation: 96, duration: 0.45, ease: 'back.out(1.6)' });
      // Chopsticks (in their plastic film) come out of the bag too.
      gsap.set(this.sticks, { x: 570, y: 630, autoAlpha: 1, scale: 0.5 });
      await gsap.to(this.sticks, { x: 520, y: 600, scale: 1, duration: 0.45, ease: 'back.out(1.4)' });
      await h.reach('F', { x: 500, y: 596 }, 0.4, { torso: 16 });
      await gsap.to(q(this.sticks, '.film'), { x: -60, y: 6, scaleX: 0.5, rotation: -12, duration: 0.4, ease: 'power2.out' });
      gsap.set(q(this.sticks, '.woodsticks'), { opacity: 0 });
      h.hold('F', PROP.sticks);
      // Food onto the plate.
      const foods = qa(el, '.tfood circle');
      for (let i = 0; i < foods.length; i++) {
        await h.reach('F', { x: 520, y: 600 }, 0.3, { torso: 18 });
        const from = toStage(foods[i], +foods[i].getAttribute('cx'), +foods[i].getAttribute('cy'));
        gsap.set(foods[i], { opacity: 0 });
        const blob = Kit.el('circle', { cx: from.x, cy: from.y, r: 10, fill: foods[i].getAttribute('fill'), stroke: C.INK, 'stroke-width': 2.5 }, el); // stage coords, so the plate's offset doesn't apply
        gsap.to(blob, { keyframes: { attr: [{ cx: (from.x + 452 + i * 18) / 2, cy: from.y - 70 }, { cx: 452 + i * 18, cy: 630 }] }, duration: 0.45, ease: 'power1.inOut' });
        await h.reach('F', { x: 470, y: 620 }, 0.3, { torso: 10 });
      }
      h.release('F');
      await h.to({ t: 0, fu: -10, ff: -40 }, 0.4);

      // The rubbish left behind.
      // Spread the rubbish out so each piece can be picked up on its own.
      const film = q(this.sticks, '.film');
      gsap.set(this.sticks, { x: gsap.getProperty(this.sticks, 'x') - 60 });
      gsap.set(film, { x: 0 });
      pivot(this.sticks, 0, 0);
      await Promise.all([
        gsap.to(this.bag, { x: 585, duration: 0.4 }),
        gsap.to(this.sticks, { x: 655, y: 642, scale: 0.7, duration: 0.4 }),
        gsap.to(this.box, { x: 735, duration: 0.4 }),
      ]);
      h.mark('?');
      h.sweat(true);
      h.tremble(true);
      await wait(0.5);
      Sound.pop();
      await gsap.to(this.pop, { scale: 1, duration: 0.5, ease: 'back.out(2)' });
      h.tremble(false);

      const bin = q(el, '.bin');
      const binInner = q(bin, '.bin-inner');
      const n = nudge(binInner);
      const items = [[this.bag, 'Plastic bag'], [this.box, 'Takeout box'], [this.sticks, 'Chopstick wrapper']];
      let left = items.length;
      phase('desk-bin');
      await new Promise((resolve) => {
        const z = zone(bin, q(bin, '.zr'), 'Bin');
        items.forEach(([item, label]) => draggable(item, {
          zones: [z], label, hintTo: { x: 862, y: 650 },
          onDrop: async () => {
            await intoBin(item, 862, G - 112, binInner);
            state.plasticItems += 1;
            left -= 1;
            if (left === 0) { n.stop(); z.off(); resolve(); }
          },
        }));
      });
      phase('desk-cut');
      h.clearMark();
      h.sweat(false);
      h.puff();
      await wait(0.3);
      await h.to(Character.STAND, 0.7);
      h.idle();
    },
  };

  /* ======================================================================
     5 · EVENING (19:20) — the parcel: box + polybag
     ====================================================================== */
  const Evening = {
    id: 'evening', charX: 240, clock: '19:20', sky: 'dusk',
    build() {
      const stars = [[140, 160], [260, 110], [380, 190], [640, 120], [720, 250], [900, 150], [40, 230], [1040, 210]];
      this.el = scene('s-evening', `
        ${stars.map(([x, y], i) => `<circle class="star" cx="${x}" cy="${y}" r="${2 + (i % 2)}" fill="#F8F4EC"/>`).join('')}
        <path d="M 820 150 A 38 38 0 1 0 820 226 A 48 48 0 0 1 820 150 Z" fill="#EFEAF4" stroke="${C.INK}" stroke-width="3" stroke-linejoin="round"/>
        ${backdrop(`
          <rect x="-1200" y="330" width="3400" height="450" fill="#D7CDC8"/>
          <path d="M -1200 330 L 2200 330" stroke="#A99D97" stroke-width="6"/>
          <rect x="150" y="400" width="120" height="140" rx="6" fill="#F3D9A6" stroke="#A99D97" stroke-width="5"/>
          <path d="M 210 400 V 540 M 150 470 H 270" stroke="#A99D97" stroke-width="4"/>
          <rect x="960" y="400" width="120" height="140" rx="6" fill="#F3D9A6" stroke="#A99D97" stroke-width="5"/>
        `, 0.75)}
        <rect class="p pf" x="380" y="372" width="140" height="408" rx="10"/>
        <rect class="p hair o" x="400" y="396" width="100" height="150" rx="6"/>
        <rect class="p hair o" x="400" y="570" width="100" height="186" rx="6"/>
        <circle cx="505" cy="580" r="7" fill="${C.INK}"/>
        <rect x="368" y="773" width="164" height="9" rx="4.5" fill="${C.ASH}"/>
        <g class="bell" opacity="0" transform="translate(450 352)">
          <path d="M -30 -6 Q -40 -16 -36 -28 M 30 -6 Q 40 -16 36 -28 M -18 -14 Q -24 -22 -20 -30 M 18 -14 Q 24 -22 20 -30" fill="none" stroke="${C.CARD}" stroke-width="3.5" stroke-linecap="round"/>
        </g>

        <g class="bin bin-paper" transform="translate(690 ${G})">${binMarkup({ w: 92, h: 124, fill: C.SKY, rim: '#8AA9C2', label: 'paper' })}</g>
        <g class="bin bin-plastic" transform="translate(830 ${G})">${binMarkup({ w: 92, h: 124, fill: C.SAGE, rim: '#76866A', label: 'plastic' })}</g>

        <g class="parcel">
          <rect class="hit" x="-66" y="-90" width="132" height="100"/>
          <rect fill="#E4DED2" x="-50" y="-70" width="100" height="70" rx="4" stroke="${C.INK}" stroke-width="4"/>
          <rect class="tape" x="-9" y="-72" width="18" height="40" fill="#D2C9B8"/>
          <rect x="16" y="-40" width="26" height="20" rx="2" fill="${C.CARD}" stroke="${C.INK}" stroke-width="2"/>
          <line x1="21" y1="-33" x2="37" y2="-33" stroke="${C.INK}" stroke-width="2"/>
          <line x1="21" y1="-27" x2="32" y2="-27" stroke="${C.INK}" stroke-width="2"/>
          <g class="flapL"><rect x="-50" y="-74" width="50" height="7" rx="2" fill="#D9D1C2" stroke="${C.INK}" stroke-width="2.5"/></g>
          <g class="flapR"><rect x="0" y="-74" width="50" height="7" rx="2" fill="#D9D1C2" stroke="${C.INK}" stroke-width="2.5"/></g>
        </g>
        <g class="poly">
          <rect class="hit" x="-46" y="-56" width="92" height="66"/>
          <path d="M -32 -2 Q -36 -30 -26 -44 L 26 -44 Q 36 -30 32 -2 Q 0 6 -32 -2 Z" fill="#E4EEF5" fill-opacity="0.9" stroke="#7FA3BF" stroke-width="2.5" stroke-linejoin="round"/>
          <path d="M -26 -44 L -20 -50 L -12 -44 L -4 -50 L 4 -44 L 12 -50 L 20 -44 L 26 -50" fill="none" stroke="#7FA3BF" stroke-width="2.2"/>
          <path d="M -18 -30 Q -6 -36 8 -32" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g class="shirt">
          <path d="M -26 -40 L -12 -46 Q 0 -38 12 -46 L 26 -40 L 38 -22 L 26 -14 L 22 -20 L 22 14 L -22 14 L -22 -20 L -26 -14 L -38 -22 Z" fill="${C.SAGE}" stroke="${C.INK}" stroke-width="3" stroke-linejoin="round"/>
        </g>`);
      const el = this.el;
      this.parcel = q(el, '.parcel');
      this.poly = q(el, '.poly');
      this.shirt = q(el, '.shirt');
      [this.parcel, this.poly, this.shirt].forEach((n) => pivot(n, 0, 0));
      pivot(q(el, '.flapL'), -50, -70);
      pivot(q(el, '.flapR'), 50, -70);
      this.pops = qa(el, '.bin-pop');
      gsap.set(this.pops, { scale: 0, transformOrigin: '50% 100%' });
      gsap.set(this.parcel, { x: 470, y: G - 560, autoAlpha: 0 });
      gsap.set([this.poly, this.shirt], { autoAlpha: 0 });
    },

    async play() {
      const h = H();
      const el = this.el;
      phase('evening-cut');
      gsap.to(qa(el, '.star'), { opacity: 0.3, duration: 0.9, yoyo: true, repeat: -1, stagger: 0.3 });
      await wait(0.6);

      // Ding-dong. The parcel.
      Sound.ding();
      gsap.fromTo(q(el, '.bell'), { opacity: 1, scale: 0.8 }, { opacity: 0, scale: 1.3, duration: 0.6, transformOrigin: '50% 50%' });
      await wait(0.3);
      Sound.ding(0.75);
      gsap.set(this.parcel, { autoAlpha: 1 });
      await gsap.to(this.parcel, { y: G, duration: 0.55, ease: 'power2.in' });
      Sound.drop();
      gsap.fromTo(this.parcel, { scaleY: 0.86, scaleX: 1.08 }, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      h.mark('!');
      await wait(0.5);
      h.clearMark();

      // Walk over, crouch, open it.
      await h.walkTo(372, { speed: 230 });
      await h.crouch(-100, 0.5, 40);
      await Promise.all([h.reach('F', { x: 478, y: 706 }, 0.35, { hip: { x: 0, y: -100 } }), h.reach('B', { x: 452, y: 706 }, 0.35, { hip: { x: 0, y: -100 } })]);
      Sound.click();
      gsap.to(q(el, '.tape'), { scaleY: 0, transformOrigin: '50% 0%', duration: 0.25 });
      await Promise.all([
        gsap.to(q(el, '.flapL'), { rotation: -150, duration: 0.4, ease: 'back.out(1.5)' }),
        gsap.to(q(el, '.flapR'), { rotation: 150, duration: 0.4, ease: 'back.out(1.5)', delay: 0.08 }),
      ]);

      // Out comes a polybag, and out of that, a T-shirt.
      gsap.set(this.poly, { x: 470, y: G - 40, autoAlpha: 1, scale: 0.7 });
      await Promise.all([
        h.to({ ...Character.STAND }, 0.55),
        gsap.to(this.poly, { y: 590, scale: 1, duration: 0.55, ease: 'power2.out' }),
      ]);
      await Promise.all([h.reach('F', { x: 492, y: 560 }, 0.3), h.reach('B', { x: 450, y: 560 }, 0.3)]);
      gsap.set(this.shirt, { x: 470, y: 586, autoAlpha: 1, scale: 0.3 });
      Sound.pop();
      gsap.to(this.poly, { x: 560, y: G, rotation: 14, duration: 0.6, ease: 'bounce.out' });
      await Promise.all([
        gsap.to(this.shirt, { y: 470, scale: 1.25, duration: 0.5, ease: 'back.out(1.6)' }),
        h.reach('F', { x: 506, y: 452 }, 0.5),
        h.reach('B', { x: 438, y: 452 }, 0.5),
      ]);
      Sound.chime();
      await gsap.timeline().to(h.root, { y: G - 20, duration: 0.18, ease: 'power2.out' }).to(h.root, { y: G, duration: 0.25, ease: 'bounce.out' });
      await wait(0.4);
      // Folded away under the arm.
      await gsap.to(this.shirt, { scale: 0.3, x: toStage(h.J.t, 10, -60).x, y: toStage(h.J.t, 10, -60).y, duration: 0.4, ease: 'power2.in' });
      gsap.set(this.shirt, { autoAlpha: 0 });
      h.hold('F', PROP.shirt, { up: 0 });
      await h.to({ ...Character.STAND, fu: -40, ff: -100 }, 0.4);
      h.idle();

      // What's left: a box and a bag.
      const cap = caption(ui, I18N.t('sortQ'), 500, 250);
      Sound.pop();
      this.pops.forEach((p, i) => gsap.to(p, { scale: 1, duration: 0.5, ease: 'back.out(2)', delay: 0.3 + i * 0.18, onStart: () => Sound.pop() }));
      await wait(1.1);

      const paper = q(el, '.bin-paper');
      const plastic = q(el, '.bin-plastic');
      const nP = nudge(q(paper, '.bin-inner'));
      const nL = nudge(q(plastic, '.bin-inner'));
      const items = [[this.parcel, 'Box', 'paper'], [this.poly, 'Plastic bag', 'plastic']];
      let left = items.length;
      phase('evening-sort');
      await new Promise((resolve) => {
        const zP = zone(paper, q(paper, '.zr'), 'Paper bin');
        const zL = zone(plastic, q(plastic, '.zr'), 'Plastic bin');
        zP.kind = 'paper';
        zL.kind = 'plastic';
        items.forEach(([item, label, belongs]) => draggable(item, {
          zones: [zP, zL], label, hintTo: { x: 760, y: 650 },
          onDrop: async (z, ctl) => {
            if (z.kind !== belongs) {
              // Wrong bin: warn, shake the bin, send the item back.
              state.wrongBin += 1;
              Sound.nope();
              const bx = z.kind === 'paper' ? 690 : 830;
              const warn = caption(ui, I18N.t('wrongBin'), bx, G - 210, { arrow: 'down', size: 24 });
              const cross = group(ui, `<g transform="translate(${bx} ${G - 70})"><circle r="26" fill="${C.CARD}" stroke="${C.INK}" stroke-width="3"/><path d="M -10 -10 L 10 10 M 10 -10 L -10 10" stroke="#B5574B" stroke-width="5" stroke-linecap="round"/></g>`);
              gsap.from(cross.firstElementChild, { scale: 0, transformOrigin: '50% 50%', duration: 0.3, ease: 'back.out(3)' });
              gsap.fromTo(q(z.node, '.bin-inner'), { x: -6 }, { x: 6, duration: 0.06, repeat: 7, yoyo: true, onComplete: () => gsap.set(q(z.node, '.bin-inner'), { x: 0 }) });
              await ctl.reset();
              await wait(0.9);
              warn.hide();
              gsap.to(cross, { opacity: 0, duration: 0.3, onComplete: () => cross.remove() });
              return;
            }
            state.packItems += 1;
            await intoBin(item, z.kind === 'paper' ? 690 : 830, G - 124, q(z.node, '.bin-inner'));
            left -= 1;
            if (left === 0) { nP.stop(); nL.stop(); zP.off(); zL.off(); cap.hide(); resolve(); }
          },
        }));
      });
      phase('evening-done');
    },
  };

  /* ---------------- scene-to-scene: the world slides, the person walks ---------------- */
  async function transition(from, to) {
    const h = H();
    const v = view();
    const off = v.w + 300;
    const hidden = gsap.getProperty(h.root, 'opacity') < 0.01;
    gsap.set(to.el, { x: off, autoAlpha: 1 });
    Sky.set(to.sky, 2.2);
    if (!hidden) { h.stand(0.15); h.walk(); }
    if (from) Clock.roll(to.clock, 2.2, to.sky);
    else Clock.show(to.clock, to.sky);

    const tl = gsap.timeline({ defaults: { duration: 2.4, ease: 'power2.inOut' } });
    if (from) tl.to(from.el, { x: -off }, 0);
    tl.to(to.el, { x: 0 }, 0);
    if (!hidden) tl.to(h.root, { x: to.charX }, 0);
    await tl;
    if (from) gsap.set(from.el, { autoAlpha: 0 });

    if (hidden) {
      gsap.set(h.root, { x: to.charX, y: G - 30, scale: 0.7, autoAlpha: 0 });
      await gsap.to(h.root, { y: G, scale: 1, autoAlpha: 1, duration: 0.45, ease: 'back.out(2)' });
    }
    await h.stand(0.25);
    h.idle();
  }

  function build(s) {
    state = s;
    Kit.neuFilters();
    [Start, Wash, Breakfast, Commute, Shop, Desk, Evening].forEach((L) => L.build());
  }

  return {
    build, transition, Start,
    // Shop has no ✓ of its own — it runs straight into the desk.
    list: [Wash, Breakfast, Commute, Shop, Desk, Evening],
  };
})();
