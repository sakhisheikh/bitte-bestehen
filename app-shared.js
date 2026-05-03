// Shared data loader, Klasse presets, and language helpers used by all three views.
// EN is the structural source of truth. DE is overlaid by question_id.
window.DT = (() => {
  let dataEN = null;
  let dataDE = null;
  let deById = new Map();

  async function load() {
    const [en, de] = await Promise.all([
      fetch('questions.json').then(r => r.json()),
      fetch('questions_de.json').then(r => r.json()).catch(() => null)
    ]);
    dataEN = en;
    dataDE = de;
    if (de) deById = new Map(de.map(q => [q.question_id, q]));
    return { count: en.length, hasDE: !!de };
  }

  // Fetch the rendered (translated) question at index i. Falls back to EN if DE missing.
  function getQ(i, lang) {
    const en = dataEN[i];
    if (lang === 'de' && dataDE) {
      const de = deById.get(en.question_id);
      if (de) return de;
    }
    return en;
  }

  // Structural EN row, used for filter predicates that need stable values (theme_number, points).
  function structural(i) { return dataEN[i]; }
  function all() { return dataEN; }
  function totalCount() { return dataEN ? dataEN.length : 0; }

  // Language-agnostic helpers
  function themePrefix(q) {
    const m = (q.theme_number || '').match(/(\d+\.\d+\.)/);
    return m ? m[1] : '';
  }
  function pointsNum(q) {
    const m = (q.points || '').match(/(\d+)/);
    return m ? +m[1] : 0;
  }

  // Klasse presets. Heuristic — upstream dataset isn't tagged with class.
  // Theme 1.x = Grundstoff (basics, all classes). 2.6/2.7/2.8 = LKW-heavy.
  const KLASSE = {
    all:        { en: 'All themes',                       de: 'Alle Themen',                 test: () => true },
    grundstoff: { en: 'Grundstoff (basics, all classes)', de: 'Grundstoff (Basis)',          test: q => themePrefix(q).startsWith('1.') },
    b:          { en: 'Klasse B / PKW (car)',             de: 'Klasse B / PKW',              test: q => { const p = themePrefix(q); return p.startsWith('1.') || ['2.1.','2.2.','2.4.','2.5.'].includes(p); } },
    lkw:        { en: 'LKW topics (Klasse C/CE)',         de: 'LKW-Stoff (Klasse C/CE)',     test: q => ['2.6.','2.7.','2.8.'].includes(themePrefix(q)) }
  };

  function klasseLabel(key, lang) {
    const k = KLASSE[key] || KLASSE.all;
    return lang === 'de' ? k.de : k.en;
  }

  function poolIndices(klasseKey) {
    const out = [];
    const test = (KLASSE[klasseKey] || KLASSE.all).test;
    for (let i = 0; i < dataEN.length; i++) if (test(dataEN[i])) out.push(i);
    return out;
  }

  function klasseCount(key) {
    const test = (KLASSE[key] || KLASSE.all).test;
    let n = 0;
    for (let i = 0; i < dataEN.length; i++) if (test(dataEN[i])) n++;
    return n;
  }

  // Persistent settings
  const SETTINGS_KEY = 'dt_settings_v1';
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  }

  return {
    load, getQ, structural, all, totalCount,
    themePrefix, pointsNum,
    KLASSE, klasseLabel, klasseCount, poolIndices,
    loadSettings, saveSettings
  };
})();
