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

  // Detects "fact lookup" questions — pure memorization, no situational logic.
  // Matches if the question or any correct answer mentions distance, speed,
  // weight, axle load, alcohol limits, periods, validity, etc., or if the
  // answer is primarily numeric.
  const FACT_KW_RE = /\b(distance|stopping distance|safety distance|speed|weight|axle|load|tonn|gross weight|maxim|minim|permissible|how many|how much|how long|how far|how old|how high|how wide|valid|limit|allow|alcohol|blood alcohol|promill|tyre|tire|tread|profile|tachograph|rest period|driving period|hours|minutes|seconds|km\/h|kilometer|metre|meter|fine|points in)\b|\b(abstand|entfernung|geschwindigkeit|gewicht|achse|achslast|nutzlast|tonnen|höchst|mindest|zulässig|gesamtgewicht|stützlast|wie viel|wie lang|wie weit|wie hoch|wie alt|wie breit|gültig|grenz|alkohol|promille|reifen|profiltiefe|fahrtenschreiber|ruhezeit|lenkzeit|kilometer|stunde|minute|sekund|punkte in)\b/i;
  const NUM_ANS_RE = /^\s*\d|\d+\s*(m|km|kg|t|km\/h|h|min|sec|%|‰|°|punkt|point|jahr|year|monat|month|euro|stund|sekund)/i;

  function isFactQuestion(q) {
    if (FACT_KW_RE.test(q.question_text || '')) return true;
    for (const c of q.correct_answers || []) {
      const t = (c.text || c.letter || '').trim();
      if (NUM_ANS_RE.test(t)) return true;
    }
    return false;
  }

  // Detect motorcycle-specific questions so they can be excluded from the
  // Klasse B (car) pool. The upstream dataset doesn't tag class, so we
  // sniff the text for motorcycle/Motorrad mentions in the question or
  // options.
  // Match motorcycle-specific question stems (rider-perspective). We only
  // check question_text — checking options/answers excluded too many general
  // traffic-awareness questions where a motorcycle was just one mentioned
  // road user.
  // Match motorcycle word-stems so we also catch motorcyclist, Motorradfahrer,
  // motorbikes, etc. (\w* tail handles the suffix).
  const MOTORCYCLE_RE = /\b(motorcycl\w*|motorbike\w*|motorrad\w*|krafträd\w*|krad)\b/i;
  function looksMotorcycle(q) {
    return MOTORCYCLE_RE.test(q.question_text || '');
  }

  function inKlasseBThemes(q) {
    const p = themePrefix(q);
    return p.startsWith('1.') || ['2.1.','2.2.','2.4.','2.5.'].includes(p);
  }

  // Klasse presets. Heuristic — upstream dataset isn't tagged with class.
  // Theme 1.x = Grundstoff (basics, all classes). 2.6/2.7/2.8 = LKW-heavy.
  // Klasse B (car) further excludes anything that mentions motorcycle/Motorrad.
  const KLASSE = {
    all:        { en: 'All themes',                       de: 'Alle Themen',                 test: () => true },
    grundstoff: { en: 'Grundstoff (basics, all classes)', de: 'Grundstoff (Basis)',          test: q => themePrefix(q).startsWith('1.') && !looksMotorcycle(q) },
    b:          { en: 'Klasse B / PKW (car)',             de: 'Klasse B / PKW',              test: q => inKlasseBThemes(q) && !looksMotorcycle(q) },
    b_facts:    { en: 'Klasse B — facts only (cheat)',    de: 'Klasse B — nur Fakten (Cheat)', test: q => inKlasseBThemes(q) && !looksMotorcycle(q) && isFactQuestion(q) },
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

  // Favorites — store as JSON array of question_id, hydrate to Set on demand.
  const FAV_KEY = 'dt_favorites_v1';
  let _favCache = null;
  function loadFavorites() {
    if (_favCache) return _favCache;
    try { _favCache = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); }
    catch { _favCache = new Set(); }
    return _favCache;
  }
  function saveFavorites() {
    if (!_favCache) return;
    localStorage.setItem(FAV_KEY, JSON.stringify([..._favCache]));
  }
  function isFavorite(qid) { return loadFavorites().has(qid); }
  function toggleFavorite(qid) {
    const s = loadFavorites();
    if (s.has(qid)) s.delete(qid); else s.add(qid);
    saveFavorites();
    return s.has(qid);
  }
  function favoriteCount() { return loadFavorites().size; }
  function favoriteIds() { return [...loadFavorites()]; }
  function favoriteIndices() {
    const favs = loadFavorites();
    const out = [];
    for (let i = 0; i < dataEN.length; i++) {
      if (favs.has(dataEN[i].question_id)) out.push(i);
    }
    return out;
  }

  // Search across both languages. Returns array of indices into EN array,
  // ordered by simple ranking.
  function search(query, opts = {}) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    const limit = opts.limit || 50;
    const out = [];
    for (let i = 0; i < dataEN.length; i++) {
      const en = dataEN[i];
      const de = deById.get(en.question_id);
      let score = 0;
      // ID match: highest priority
      if (en.question_id.toLowerCase().includes(q)) score += 10;
      // Question text in either lang
      if ((en.question_text || '').toLowerCase().includes(q)) score += 5;
      if (de && (de.question_text || '').toLowerCase().includes(q)) score += 5;
      // Correct answers
      for (const c of en.correct_answers || []) {
        if ((c.text || '').toLowerCase().includes(q)) score += 3;
      }
      if (de) for (const c of de.correct_answers || []) {
        if ((c.text || '').toLowerCase().includes(q)) score += 3;
      }
      // Options
      for (const o of en.options || []) {
        if ((o.text || '').toLowerCase().includes(q)) score += 1;
      }
      if (score > 0) out.push({ idx: i, score });
      if (out.length >= limit * 4) break; // soft cap on candidates
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, limit).map(x => x.idx);
  }

  // Mistakes — qids the user has gotten wrong in Quiz Test mode or Mock Exam.
  // Auto-cleared per-question whenever the user gets it right in any mode.
  const MISTAKES_KEY = 'dt_mistakes_v1';
  let _mistakeCache = null;
  function loadMistakes() {
    if (_mistakeCache) return _mistakeCache;
    try { _mistakeCache = new Set(JSON.parse(localStorage.getItem(MISTAKES_KEY) || '[]')); }
    catch { _mistakeCache = new Set(); }
    return _mistakeCache;
  }
  function saveMistakes() {
    if (!_mistakeCache) return;
    localStorage.setItem(MISTAKES_KEY, JSON.stringify([..._mistakeCache]));
  }
  function recordOutcome(qid, isCorrect) {
    const s = loadMistakes();
    if (isCorrect) s.delete(qid);
    else s.add(qid);
    saveMistakes();
  }
  function isMistake(qid) { return loadMistakes().has(qid); }
  function mistakeCount() { return loadMistakes().size; }
  function mistakeIds() { return [...loadMistakes()]; }
  function mistakeIndices() {
    const ids = loadMistakes();
    const out = [];
    for (let i = 0; i < dataEN.length; i++) {
      if (ids.has(dataEN[i].question_id)) out.push(i);
    }
    return out;
  }
  function clearMistakes() {
    _mistakeCache = new Set();
    saveMistakes();
  }

  return {
    load, getQ, structural, all, totalCount,
    themePrefix, pointsNum,
    KLASSE, klasseLabel, klasseCount, poolIndices,
    loadSettings, saveSettings,
    isFavorite, toggleFavorite, favoriteCount, favoriteIds, favoriteIndices,
    recordOutcome, isMistake, mistakeCount, mistakeIds, mistakeIndices, clearMistakes,
    search
  };
})();
