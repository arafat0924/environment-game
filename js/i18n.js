/* All on-screen text in three languages. Plain strings, no library:
   the whole game has only a few dozen lines of text. */
window.I18N = (() => {
  const STRINGS = {
    en: {
      title: 'A Day Like Any Other',
      boy: 'Boy', girl: 'Girl', start: 'Start',
      notif: 'Your parcel arrives this evening.',
      tapOff: 'Turn off the tap',
      car: 'Car (5s)', bus: 'Bus (30s)', busWait: 'Bus',
      paper: 'Paper', plastic: 'Plastic',
      sortQ: 'Box and bag. Where do they go?',
      wrongBin: 'Wrong bin!',
      quote: 'Every choice felt correct. And that’s exactly the problem.',
      water: 'Water', food: 'Food', carbon: 'Carbon', packaging: 'Packaging',
      uL: 'L/year', uKg: 'kg/year', uCO2: 'kg CO₂/year', uPcs: 'pieces/year',
      wrongSub: 'Wrong bin',
      busNote1: 'You waited.', busNote2: 'You left nothing.',
      fixWater: 'Tap off between rinses.',
      fixFood: 'Leftovers in the fridge.',
      fixCarbon: 'Take the bus.',
      fixPlastic: 'Carry reusable cutlery.',
      fixPack: 'Order less. Paper only.',
      startAgain: 'Start Again',
      taskWater: 'Brushing', taskFood: 'Breakfast', taskCarbon: 'Commute', taskPlastic: 'Lunch', taskPack: 'Parcel',
    },
    bn: {
      title: 'আর দশটা দিনের মতোই একটা দিন',
      boy: 'ছেলে', girl: 'মেয়ে', start: 'শুরু',
      notif: 'আপনার পার্সেল আজ সন্ধ্যায় আসবে।',
      tapOff: 'কলটি বন্ধ করুন',
      car: 'গাড়ি (৫ সে.)', bus: 'বাস (৩০ সে.)', busWait: 'বাস',
      paper: 'কাগজ', plastic: 'প্লাস্টিক',
      sortQ: 'বাক্স আর ব্যাগ। কোথায় যাবে?',
      wrongBin: 'ভুল বিন!',
      quote: 'প্রতিটি সিদ্ধান্তই ঠিক মনে হয়েছিল। আর ঠিক সেটাই সমস্যা।',
      water: 'পানি', food: 'খাবার', carbon: 'কার্বন', packaging: 'প্যাকেজিং',
      uL: 'লিটার/বছর', uKg: 'কেজি/বছর', uCO2: 'কেজি CO₂/বছর', uPcs: 'টুকরো/বছর',
      wrongSub: 'ভুল বিন',
      busNote1: 'আপনি অপেক্ষা করেছেন।', busNote2: 'কিছুই রেখে যাননি।',
      fixWater: 'ধোয়ার ফাঁকে কল বন্ধ রাখুন।',
      fixFood: 'বাড়তি খাবার ফ্রিজে রাখুন।',
      fixCarbon: 'বাসে চড়ুন।',
      fixPlastic: 'নিজের চামচ-কাঁটা সাথে রাখুন।',
      fixPack: 'কম অর্ডার করুন। শুধু কাগজের প্যাকেট।',
      startAgain: 'আবার শুরু করুন',
      taskWater: 'দাঁত ব্রাশ', taskFood: 'নাস্তা', taskCarbon: 'যাতায়াত', taskPlastic: 'দুপুরের খাবার', taskPack: 'পার্সেল',
    },
    zh: {
      title: '和往常一样的一天',
      boy: '男孩', girl: '女孩', start: '开始',
      notif: '您的包裹今晚送达。',
      tapOff: '关掉水龙头',
      car: '汽车（5秒）', bus: '公交（30秒）', busWait: '公交',
      paper: '纸类', plastic: '塑料',
      sortQ: '纸箱和袋子，该扔哪里？',
      wrongBin: '扔错了！',
      quote: '每一个选择都感觉是对的。而这正是问题所在。',
      water: '水', food: '食物', carbon: '碳排放', packaging: '包装',
      uL: '升/年', uKg: '公斤/年', uCO2: '公斤 CO₂/年', uPcs: '件/年',
      wrongSub: '扔错了垃圾桶',
      busNote1: '你等了。', busNote2: '你什么也没留下。',
      fixWater: '冲洗间隙关掉水龙头。',
      fixFood: '剩菜放进冰箱。',
      fixCarbon: '坐公交。',
      fixPlastic: '随身带可重复使用的餐具。',
      fixPack: '少网购，只选纸包装。',
      startAgain: '重新开始',
      taskWater: '刷牙', taskFood: '早餐', taskCarbon: '通勤', taskPlastic: '午餐', taskPack: '包裹',
    },
  };
  const LOCALE = { en: 'en-US', bn: 'bn-BD', zh: 'zh-CN' };
  const NAMES = { en: 'English', bn: 'বাংলা', zh: '中文' };

  let lang = 'en';
  try {
    const saved = localStorage.getItem('adlao-lang');
    if (saved && STRINGS[saved]) lang = saved;
  } catch (e) { /* storage blocked: stay on English */ }

  const t = (key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key;

  // Re-label every element tagged data-i18n="key".
  function apply(root = document) {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    root.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    document.title = t('title');
  }
  function set(next) {
    if (!STRINGS[next]) return;
    lang = next;
    try { localStorage.setItem('adlao-lang', lang); } catch (e) { /* ignore */ }
    apply();
  }
  const num = (n) => Math.round(n).toLocaleString(LOCALE[lang]);
  // Split text into what a reader sees as single characters (keeps Bengali clusters intact).
  function graphemes(str) {
    if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter(LOCALE[lang], { granularity: 'grapheme' }).segment(str), (s) => s.segment);
    return Array.from(str);
  }

  return { t, set, apply, num, graphemes, NAMES, get lang() { return lang; }, langs: Object.keys(STRINGS) };
})();
