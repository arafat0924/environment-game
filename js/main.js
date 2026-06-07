/* A Day Like Any Other — game loop. */
(() => {
  gsap.registerPlugin(Draggable);
  if (Kit.FAST) gsap.globalTimeline.timeScale(2); // QA only

  const state = {
    avatarType: 'boy', // 'boy' | 'girl'
    score: 0, // higher = worse for the environment (set at the end)
    choseBus: false,
    piles: { water: 0, food: 0, carbon: 0, plastic: 0, packaging: 0 }, // annualised totals
    // raw, for one day
    waterSeconds: 0,
    foodTo: null,
    ride: null, // 'car' | 'bus'
    plasticItems: 0,
    packItems: 0,
    wrongBin: 0, // packaging items put in the wrong bin
  };
  window.Game = { state, hero: null };
  window.GameState = state; // inspectable from the console

  // Web Audio needs a user gesture before it may start.
  const unlock = () => Sound.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  Levels.build(state);
  I18N.apply();
  run();

  async function run() {
    await Levels.Start.run();
    const list = Levels.list;
    let prev = null;
    for (let i = 0; i < list.length; i++) {
      const level = list[i];
      await Levels.transition(prev, level);
      await level.play();
      // No ✓ after the shop (it flows into the desk) or after the last task.
      if (level.id !== 'shop' && i < list.length - 1) await Kit.success();
      prev = level;
    }
    Reveal.tally(state);
    await Reveal.run(state);
  }
})();
