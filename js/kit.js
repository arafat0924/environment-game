/* Shared toolkit: palette, SVG helpers, the blinking "nudge", tap + drag/drop
   interactions, the ✓ success flash and the HUD clock. */
window.Kit = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  const C = {
    BG: '#F5F3EE',
    BG2: '#ECE9E2',
    CARD: '#FBFAF7',
    SAGE: '#8A9A7B',
    ACC: '#A8B89A', // the "blinking nudge"
    ASH: '#B0B0B0',
    SKY: '#A3C1D9',
    INK: '#555555',
    FOREST: '#3F5A46',
    SLATE: '#4E6378',
  };
  const G = 780; // ground line (SVG units)
  const VB = { x: 110, y: 70, w: 780, h: 840 }; // must match #stage viewBox
  const FAST = new URLSearchParams(location.search).has('fast'); // QA only: shortens the bus wait

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function group(parent, html = '', attrs = {}) {
    const g = el('g', attrs, parent);
    g.innerHTML = html;
    return g;
  }

  const wait = (s) => new Promise((r) => gsap.delayedCall(s, r));

  // GSAP's default SVG transform origin is the bbox top-left. Pin it to a
  // local point instead (all our groups are drawn around a meaningful origin).
  function pivot(node, lx = 0, ly = 0) {
    const b = node.getBBox();
    gsap.set(node, { transformOrigin: `${lx - b.x}px ${ly - b.y}px` });
    return node;
  }

  // Visible region of the stage in SVG units (the viewBox is "meet", so wide
  // screens show more world left/right).
  function view() {
    const r = $('#stage').getBoundingClientRect();
    const s = Math.min(r.width / VB.w, r.height / VB.h);
    const w = r.width / s;
    const h = r.height / s;
    const cx = VB.x + VB.w / 2;
    const cy = VB.y + VB.h / 2;
    return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, w, h, s };
  }

  function focusRing(node, pad = 10, box = null) {
    if (node.querySelector(':scope > .focus-ring')) return;
    const b = box || node.getBBox();
    el('rect', {
      class: 'focus-ring',
      x: b.x - pad, y: b.y - pad,
      width: b.width + pad * 2, height: b.height + pad * 2,
      rx: Math.min(18, (Math.min(b.width, b.height) + pad * 2) / 2),
    }, node);
  }

  // Click / Enter / Space on an SVG group. Returns an "off" function.
  function onTap(node, fn, label, { sound = true, ring = true } = {}) {
    node.classList.add('tap-target');
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    if (label) node.setAttribute('aria-label', label);
    if (ring) focusRing(node);
    const h = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      if (sound) Sound.click();
      fn(e);
    };
    node.addEventListener('click', h);
    node.addEventListener('keydown', h);
    return () => {
      node.removeEventListener('click', h);
      node.removeEventListener('keydown', h);
      node.classList.remove('tap-target');
      node.removeAttribute('tabindex');
    };
  }

  /* The nudge: the "correct" (harmful) action breathes in the accent colour
     and throws a soft halo. Elements tagged .nf pulse their fill, .ns their stroke. */
  function nudge(target, { pad = 12, box = null, pulse = false, delay = 0 } = {}) {
    const tweens = [];
    const fills = $$('.nf', target);
    const strokes = $$('.ns', target);
    const fillsOrig = fills.map((n) => n.getAttribute('fill') || getComputedStyle(n).fill);
    const strokesOrig = strokes.map((n) => n.getAttribute('stroke') || getComputedStyle(n).stroke);
    if (fills.length) tweens.push(gsap.to(fills, { fill: C.ACC, duration: 0.7, ease: 'sine.inOut', repeat: -1, yoyo: true, delay }));
    if (strokes.length) tweens.push(gsap.to(strokes, { stroke: C.ACC, duration: 0.7, ease: 'sine.inOut', repeat: -1, yoyo: true, delay }));

    const b = box || target.getBBox();
    const halo = el('rect', {
      class: 'halo',
      x: b.x - pad, y: b.y - pad,
      width: b.width + pad * 2, height: b.height + pad * 2,
      rx: Math.min(b.width, b.height) / 2 + pad,
      fill: 'none', stroke: C.ACC, 'stroke-width': 5, 'pointer-events': 'none',
    });
    target.insertBefore(halo, target.firstChild);
    tweens.push(gsap.fromTo(halo, { scale: 0.96, opacity: 0.95 }, {
      scale: 1.16, opacity: 0, duration: 1.4, ease: 'power1.out', repeat: -1, delay, transformOrigin: '50% 50%',
    }));
    if (pulse) {
      tweens.push(gsap.to(pulse === true ? target : pulse, {
        scale: 1.035, duration: 0.7, ease: 'sine.inOut', repeat: -1, yoyo: true, delay, transformOrigin: '50% 50%',
      }));
    }
    let stopped = false;
    return {
      stop() {
        if (stopped) return;
        stopped = true;
        tweens.forEach((t) => t.kill());
        fills.forEach((n, i) => gsap.to(n, { fill: fillsOrig[i], duration: 0.3 }));
        strokes.forEach((n, i) => gsap.to(n, { stroke: strokesOrig[i], duration: 0.3 }));
        if (pulse) gsap.to(pulse === true ? target : pulse, { scale: 1, duration: 0.25 });
        gsap.to(halo, { opacity: 0, duration: 0.2, onComplete: () => halo.remove() });
      },
    };
  }

  /* ---------------- drag & drop (+ click-to-place, + keyboard) ---------------- */
  let held = null;

  function hitZone(px, py, dragEl, zones) {
    for (const z of zones) {
      const r = z.rect.getBoundingClientRect();
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return z;
    }
    for (const z of zones) if (Draggable.hitTest(dragEl, z.rect, '35%')) return z;
    return null;
  }

  function zone(node, rect, label) {
    const z = { node, rect, label };
    z.off = onTap(node, () => {
      if (held && held.opts.zones.includes(z)) held.finish(z);
    }, label, { sound: false });
    return z;
  }

  function draggable(item, opts) {
    pivot(item, 0, 0);
    const home = { x: gsap.getProperty(item, 'x'), y: gsap.getProperty(item, 'y') };
    const ctl = { item, opts, done: false };
    let hintCall = null;
    let hintTl = null;

    item.classList.add('drag-item');
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    if (opts.label) item.setAttribute('aria-label', opts.label);
    focusRing(item, 8);

    const stopHint = () => {
      if (hintCall) hintCall.kill();
      if (hintTl) hintTl.kill();
      hintCall = hintTl = null;
    };
    const scheduleHint = () => {
      stopHint();
      if (!opts.hintTo || ctl.done) return;
      hintCall = gsap.delayedCall(4.2, playHint);
    };
    // A wordless "pick me up" hop towards the target.
    function playHint() {
      if (ctl.done || held === ctl || d.isPressed) return scheduleHint();
      const dir = Math.sign(opts.hintTo.x - home.x) || 1;
      hintTl = gsap.timeline({ onComplete: scheduleHint })
        .to(item, { x: home.x + dir * 24, y: home.y - 26, rotation: dir * 6, duration: 0.32, ease: 'power2.out' })
        .to(item, { x: home.x, y: home.y, rotation: 0, duration: 0.55, ease: 'bounce.out' });
    }

    const goHome = () => gsap.to(item, {
      x: home.x, y: home.y, scale: 1, rotation: 0, duration: 0.55, ease: 'back.out(1.4)',
      overwrite: 'auto', onComplete: scheduleHint,
    });

    const lift = () => gsap.to(item, { x: home.x, y: home.y - 20, scale: 1.05, rotation: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });

    function toggleHold() {
      if (ctl.done) return;
      stopHint();
      if (held === ctl) {
        held = null;
        goHome();
        return;
      }
      if (held) held.drop();
      held = ctl;
      Sound.click();
      lift();
    }

    ctl.drop = () => { if (held === ctl) held = null; goHome(); };
    ctl.finish = async (z) => {
      if (ctl.done) return;
      ctl.done = true;
      if (held === ctl) held = null;
      stopHint();
      d.disable();
      item.classList.remove('drag-item');
      item.removeAttribute('tabindex');
      item.blur && item.blur();
      await opts.onDrop(z, ctl);
    };

    const d = Draggable.create(item, {
      type: 'x,y',
      zIndexBoost: false,
      minimumMovement: 4,
      onPress() { stopHint(); },
      onDragStart() {
        if (held && held !== ctl) held.drop();
        held = null;
        item.parentNode.appendChild(item);
        Sound.click();
        gsap.to(item, { scale: 1.06, rotation: 0, duration: 0.15, overwrite: 'auto' });
      },
      onDragEnd() {
        const z = hitZone(this.pointerX, this.pointerY, item, opts.zones);
        if (z) ctl.finish(z);
        else goHome();
      },
      onClick() { toggleHold(); },
    })[0];

    item.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      toggleHold();
    });

    // Put it back in play (e.g. after a wrong drop).
    ctl.reset = () => {
      ctl.done = false;
      d.enable();
      item.classList.add('drag-item');
      item.setAttribute('tabindex', '0');
      return goHome();
    };
    ctl.home = home;
    ctl.draggable = d;
    scheduleHint();
    return ctl;
  }

  function wobble(node) {
    return gsap.fromTo(node, { rotation: 0 }, {
      keyframes: { rotation: [0, -5, 4, -2, 0] }, duration: 0.5, ease: 'none', transformOrigin: '50% 100%',
    });
  }

  // Item (origin at its base) hops over the bin and drops in.
  function intoBin(item, bx, topY, binInner) {
    return gsap.timeline()
      .to(item, { x: bx, y: topY - 50, scale: 0.92, rotation: 0, duration: 0.32, ease: 'power2.out', overwrite: 'auto' })
      .to(item, { y: topY + 12, scale: 0.3, opacity: 0, duration: 0.26, ease: 'power2.in' })
      .add(() => { Sound.drop(); if (binInner) wobble(binInner); });
  }

  // Cylinder bin, drawn with its base centre at (0,0).
  function binMarkup({ w = 86, h = 112, fill = C.BG, rim = '#E2DED6', label = '' } = {}) {
    const a = w / 2;
    return `
      <g class="bin-pop">
        ${label ? `<text x="0" y="${-h - 34}" text-anchor="middle" font-size="26" data-i18n="${label}">${I18N.t(label)}</text>` : ''}
        <g class="bin-inner">
          <path class="p nf" fill="${fill}" d="M ${-a} ${-h} L ${-a + 6} -7 Q 0 5 ${a - 6} -7 L ${a} ${-h} Z"/>
          <line class="p hair" x1="${-a / 3}" y1="${-h + 24}" x2="${-a / 3 + 2}" y2="-16"/>
          <line class="p hair" x1="${a / 3}" y1="${-h + 24}" x2="${a / 3 - 2}" y2="-16"/>
          <ellipse class="p" fill="${rim}" cx="0" cy="${-h}" rx="${a}" ry="11"/>
        </g>
      </g>
      <rect class="hit zr" x="${-a - 26}" y="${-h - (label ? 70 : 60)}" width="${w + 52}" height="${h + (label ? 80 : 70)}"/>`;
  }

  /* ---------------- ✓ success flash ---------------- */
  async function success({ sound = true } = {}) {
    const g = group($('#fx'), `
      <circle r="38" fill="${C.CARD}" stroke="${C.SAGE}" stroke-width="6"/>
      <path d="M -16 1 L -5 12 L 17 -12" fill="none" stroke="${C.SAGE}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`);
    const [c, p] = g.children;
    const cl = 2 * Math.PI * 38;
    const pl = p.getTotalLength();
    gsap.set(g, { x: 500, y: 236, transformOrigin: '50% 50%' });
    gsap.set(c, { strokeDasharray: cl, strokeDashoffset: cl, rotation: -90, transformOrigin: '50% 50%' });
    gsap.set(p, { strokeDasharray: pl, strokeDashoffset: pl });
    const tl = gsap.timeline();
    tl.from(g, { scale: 0.6, opacity: 0, duration: 0.35, ease: 'back.out(2)' })
      .to(c, { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }, 0)
      .add(() => { if (sound) Sound.chime(); }, 0.18)
      .to(p, { strokeDashoffset: 0, duration: 0.3, ease: 'power2.out' }, 0.25)
      .to(g, { y: 216, opacity: 0, duration: 0.4, ease: 'power2.in' }, '+=0.6');
    await tl;
    g.remove();
  }

  /* ---------------- time of day: sky colour + clock chip ---------------- */
  const SKIES = {
    neutral: { bg: 'linear-gradient(180deg, #F0F2F5 0%, #E8EBF0 100%)', icon: 'sun', tint: '#ECEEF2' },
    dawn: { bg: 'linear-gradient(180deg, #EFC9AE 0%, #F4DCC6 45%, #F5EEE4 100%)', icon: 'sunrise', tint: '#F2D3BA' },
    morning: { bg: 'linear-gradient(180deg, #F1DDAE 0%, #F5EAD0 50%, #F5F2EA 100%)', icon: 'sun', tint: '#F4E2B9' },
    day: { bg: 'linear-gradient(180deg, #BCD5E8 0%, #DCE8F0 55%, #F3F2EE 100%)', icon: 'sun', tint: '#CFE0EC' },
    noon: { bg: 'linear-gradient(180deg, #A9CBE6 0%, #D6E6F1 55%, #F4F4F0 100%)', icon: 'sun', tint: '#BED8EC' },
    dusk: { bg: 'linear-gradient(180deg, #4F5A7A 0%, #8E86A3 45%, #D9B9AE 80%, #E8D6CA 100%)', icon: 'moon', tint: '#6E7392' },
  };
  const ICONS = {
    sunrise: '<svg viewBox="0 0 32 32"><path d="M4 22h24" stroke="#3B3B3B" stroke-width="2.5" stroke-linecap="round"/><path d="M9 22a7 7 0 0 1 14 0" fill="#F0B27A" stroke="#3B3B3B" stroke-width="2.5"/><path d="M16 8v4M7 13l2.5 2.5M25 13l-2.5 2.5" stroke="#3B3B3B" stroke-width="2.5" stroke-linecap="round"/></svg>',
    sun: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="6.5" fill="#F2C46D" stroke="#3B3B3B" stroke-width="2.5"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8" stroke="#3B3B3B" stroke-width="2.5" stroke-linecap="round"/></svg>',
    moon: '<svg viewBox="0 0 32 32"><path d="M20 4a12 12 0 1 0 8 20A10 10 0 0 1 20 4z" fill="#E8E2F0" stroke="#3B3B3B" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  };
  const Sky = {
    set(key, dur = 1.6) {
      const host = $('#sky');
      const layer = document.createElement('div');
      layer.className = 'sky-layer';
      layer.style.background = SKIES[key].bg;
      host.appendChild(layer);
      const old = Array.from(host.children).slice(0, -1);
      return gsap.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: dur, ease: 'sine.inOut', onComplete: () => old.forEach((o) => o.remove()) });
    },
    clear(dur = 1) { return gsap.to('#sky .sky-layer', { opacity: 0, duration: dur }); },
  };

  const Clock = (() => {
    const node = $('#clock');
    const tNode = $('#clock .t');
    const iNode = $('#clock .i');
    let mins = 0;
    const fmt = (m) => {
      const t = Math.floor(m);
      return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    };
    const parse = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const icon = (sky) => { if (sky) iNode.innerHTML = ICONS[SKIES[sky].icon]; };
    return {
      show(t, sky) {
        mins = parse(t);
        tNode.textContent = fmt(mins);
        icon(sky);
        return gsap.fromTo(node, { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.8 });
      },
      roll(t, dur = 2, sky) {
        const target = parse(t);
        const p = { m: mins };
        if (sky) gsap.fromTo(iNode, { rotation: -90, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.6, ease: 'back.out(2)', onStart: () => icon(sky) });
        return gsap.to(p, {
          m: target, duration: dur, ease: 'power1.inOut',
          onUpdate: () => { tNode.textContent = fmt(p.m); },
          onComplete: () => { mins = target; tNode.textContent = fmt(target); },
        });
      },
      hide(d = 0.8) { return gsap.to(node, { opacity: 0, duration: d }); },
    };
  })();

  /* ---------------- short on-screen text (used sparingly) ---------------- */
  // A dark pill sized to its text (works for any language). With arrow 'left',
  // (x, y) is the arrow tip and the pill extends to the right.
  function caption(parent, text, x, y, { arrow = null, size = 26 } = {}) {
    const g = group(parent, `<g class="cap-in"><g class="cap-box"><text x="0" y="${size * 0.36}" text-anchor="middle" font-size="${size}" style="fill:${C.CARD}">${text}</text></g></g>`, { class: 'caption' });
    const box = g.querySelector('.cap-box');
    const w = Math.ceil(box.firstElementChild.getComputedTextLength()) + 48;
    box.insertBefore(el('rect', { x: -w / 2, y: -28, width: w, height: 56, rx: 28, fill: C.INK }), box.firstChild);
    if (arrow === 'left') {
      box.insertBefore(el('path', { d: `M ${-w / 2 - 14} 0 l 16 -11 v 22 z`, fill: C.INK }), box.firstChild);
      box.setAttribute('transform', `translate(${w / 2 + 14} 0)`);
    } else if (arrow === 'down') {
      box.insertBefore(el('path', { d: 'M -11 27 l 11 14 l 11 -14 z', fill: C.INK }), box.firstChild);
    }
    gsap.set(g, { x, y });
    const inner = g.firstElementChild;
    pivot(inner, 0, 0);
    gsap.from(inner, { scale: 0.4, opacity: 0, duration: 0.4, ease: 'back.out(2)' });
    const bob = gsap.to(inner, { y: -5, duration: 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    return {
      el: g,
      hide() { bob.kill(); return gsap.to(g, { opacity: 0, duration: 0.25, onComplete: () => g.remove() }); },
    };
  }

  /* Neumorphic surfaces (soft extruded / pressed), drawn as SVG filters. */
  const NEU = { surface: '#ECEEF2', pressed: '#E5E8ED', text: '#5E6470', dark: '#A9B1BF' };
  function neuFilters() {
    const d = $('#defs');
    el('filter', { id: 'neu', x: '-30%', y: '-30%', width: '160%', height: '160%' }, d).innerHTML = `
      <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="b"/>
      <feOffset in="b" dx="8" dy="8" result="od"/><feFlood flood-color="${NEU.dark}" flood-opacity="0.6"/><feComposite in2="od" operator="in" result="dark"/>
      <feOffset in="b" dx="-7" dy="-7" result="ol"/><feFlood flood-color="#FFFFFF" flood-opacity="0.95"/><feComposite in2="ol" operator="in" result="light"/>
      <feMerge><feMergeNode in="dark"/><feMergeNode in="light"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    el('filter', { id: 'neuIn', x: '-5%', y: '-5%', width: '110%', height: '110%' }, d).innerHTML = `
      <feComponentTransfer in="SourceAlpha" result="inv"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>
      <feGaussianBlur in="inv" stdDeviation="6" result="ib"/>
      <feOffset in="ib" dx="7" dy="7" result="o1"/><feFlood flood-color="${NEU.dark}" flood-opacity="0.75"/><feComposite in2="o1" operator="in" result="s1"/><feComposite in="s1" in2="SourceAlpha" operator="in" result="dark"/>
      <feOffset in="ib" dx="-7" dy="-7" result="o2"/><feFlood flood-color="#FFFFFF" flood-opacity="0.9"/><feComposite in2="o2" operator="in" result="s2"/><feComposite in="s2" in2="SourceAlpha" operator="in" result="light"/>
      <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="dark"/><feMergeNode in="light"/></feMerge>`;
    el('linearGradient', { id: 'neuPrimary', x1: 0, y1: 0, x2: 0, y2: 1 }, d).innerHTML =
      `<stop offset="0" stop-color="#A3B394"/><stop offset="1" stop-color="${C.SAGE}"/>`;
  }

  // Map a local point of an element into stage (viewBox) coordinates.
  function toStage(node, x = 0, y = 0) {
    const svg = $('#stage');
    const p = svg.createSVGPoint();
    p.x = x; p.y = y;
    const r = p.matrixTransform(node.getScreenCTM()).matrixTransform(svg.getScreenCTM().inverse());
    return { x: r.x, y: r.y };
  }

  // QA hook: which interaction (if any) is live right now.
  const phase = (name) => { document.documentElement.dataset.phase = name; };

  return {
    C, G, FAST, $, $$, el, group, wait, pivot, view, onTap, nudge, zone, draggable,
    wobble, intoBin, binMarkup, success, Clock, Sky, caption, toStage, phase, NEU, neuFilters,
    get held() { return held; },
  };
})();
