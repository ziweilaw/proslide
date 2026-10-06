(() => {
  'use strict';
  const D = window.PS_DATA;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STORE = 'proslide.v1';

  // ---------------------------------------------------------------- state
  const state = {
    theme: { c1: '#3b4cca', c2: '#f2a541', c3: '#9ad1d4', bg: '#f4f6ff', ink: '#1d2350' },
    motif: 'dots',
    cover: null, // data URL
    title: '',
    slides: [],
  };
  let uid = 0;

  // ---------------------------------------------------------------- dictionary (Datamuse, free + CORS)
  const POS = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb' };
  const dictCache = new Map();
  function lookup(word) {
    const w = word.toLowerCase();
    if (!dictCache.has(w)) {
      dictCache.set(w, fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(w)}&md=dpf&max=1`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const hit = d?.[0];
          if (!hit || hit.word !== w || !hit.defs?.length) return null;
          const freq = parseFloat((hit.tags.find((t) => t.startsWith('f:')) || 'f:0').slice(2));
          // Dictionary senses only: "N" entries are encyclopedia proper nouns ("Claws": a TV series).
          const defs = hit.defs.flatMap((x) => {
            const [p, ...rest] = x.split('\t');
            if (!POS[p]) return [];
            const raw = rest.join(' ').trim();
            const label = (raw.match(/^\(([^)]*)\)/) || [])[1] || '';
            return [{ pos: POS[p], label, text: raw.replace(/^\([^)]*\)\s*/, '').trim() }];
          });
          if (!defs.length) return null;
          const pos = new Set(defs.map((x) => x.pos));
          // "claws: plural of claw" → explain the base word instead
          const formOf = defs[0].text.match(/^(?:plural|simple past|past participle|present participle|third-person singular[\w\s-]*?|alternative (?:form|spelling)|comparative form|superlative form) of ([a-z][a-z-]*)/i)?.[1];
          // Prefer an everyday sense that doesn't just repeat the word ("hanger: A clothes hanger.")
          // Grammar labels ("uncountable", "intransitive") are fine; register/specialist ones are not.
          const GRAMMAR = /^\s*(un)?countable|^\s*(in)?transitive|^\s*ergative|^\s*reflexive|^\s*not comparable|^\s*comparable|^\s*attributive|^\s*usually|^\s*often|^\s*chiefly|^\s*especially|^\s*in the plural|^\s*(US|UK|Canada|Australia|British|American|Commonwealth)\b/i;
          const penalty = (x) => {
            const extra = x.label.split(',').filter((l) => l.trim() && !GRAMMAR.test(l));
            const bad = extra.some((l) => /obsolete|archaic|dated|rare|slang|vulgar|offensive|dialect|vernacular|figurative|informal|colloquial/i.test(l));
            return (bad ? 10 : extra.length ? 2 : 0) + (x.text.toLowerCase().includes(w.split(' ').at(-1)) ? 3 : 0);
          };
          const best = defs.reduce((a, b) => (penalty(b) < penalty(a) ? b : a));
          return { pos, defs, freq, formOf, def: shorten(best.text), defPos: best.pos };
        })
        .catch(() => null));
    }
    return dictCache.get(w);
  }
  // Slides stay concise: keep the core of a definition ("A hand tool … head of a screw.")
  function shorten(def) {
    const words = def.replace(/\.$/, '').split(/\s+/);
    if (words.length <= 16) return def;
    const cut = def.search(/[,;:(]/);
    if (cut > 30 && def.slice(0, cut).split(/\s+/).length <= 16) return def.slice(0, cut).trim() + '.';
    return words.slice(0, 14).join(' ').replace(/[\s,;:]+$/, '') + '…';
  }
  // Wiktionary knows inflected forms: "mice" → plural of mouse, "spun" → simple past of spin.
  const FORM_OF = /^(?:plural|simple past|past participle|present participle|third-person singular|comparative|superlative|alternative (?:form|spelling))\b[^.]*? of ([a-z][a-z-]*)/i;
  const wiktCache = new Map();
  // English entries from Wiktionary: [{ pos, defs: [plain text, …] }]
  function wiktionary(w) {
    if (!wiktCache.has(w)) {
      wiktCache.set(w, fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(w.replace(/ /g, '_'))}`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => (d.en || []).map((e) => ({
          pos: (e.partOfSpeech || '').toLowerCase(),
          defs: (e.definitions || []).map((x) => (x.definition || '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')       // inline CSS Wiktionary ships with usage tags
            .replace(/<[^>]+>/g, '')
            .replace(/\[[^\]]*\]/g, '')                     // usage notes: [with of ‘something’]
            .replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim()).filter(Boolean),
        })).filter((e) => e.defs.length))
        .catch(() => []));
    }
    return wiktCache.get(w);
  }
  async function baseForm(w) {
    for (const e of await wiktionary(w)) {
      const m = e.defs[0].match(FORM_OF);
      if (m && m[1].toLowerCase() !== w) return m[1].toLowerCase();
    }
    return null;
  }
  // A phrase/idiom definition from Wiktionary ("run out of" → "To exhaust a supply of something.")
  async function wiktDef(phrase) {
    for (const e of await wiktionary(phrase)) {
      const def = e.defs.find((d) => !FORM_OF.test(d) && !/^\(.*(obsolete|archaic|slang|vulgar).*\)/i.test(d));
      if (def) return { def: shorten(def.replace(/^\([^)]*\)\s*/, '')), defPos: e.pos === 'proper noun' ? '' : e.pos };
    }
    return null;
  }

  // Phrases: whole phrase → shorter parts → the key word ("get tired from" → tired).
  const SMALL_WORDS = new Set(['a', 'an', 'the', 'to', 'of', 'from', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'into', 'onto', 'up', 'down', 'out', 'off', 'over', 'away', 'and', 'or', 'but', 'so', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'get', 'gets', 'got', 'getting', 'become', 'became', 'make', 'made', 'take', 'took', 'have', 'has', 'had', 'do', 'does', 'did', 'go', 'goes', 'went', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'one', "one's", 'someone', 'something', 'sb', 'sth', 'very', 'too']);
  async function phraseDef(tokens, lemmas = tokens) {
    // also try base forms, longest first: "showed off" → "show off"
    const spans = [];
    for (let n = tokens.length; n >= 2; n--) {
      for (let i = 0; i + n <= tokens.length; i++) {
        spans.push(tokens.slice(i, i + n).join(' '));
        const base = lemmas.slice(i, i + n).join(' ');
        if (!spans.includes(base)) spans.push(base);
      }
    }
    for (const p of spans) {
      const e = (await lookup(p)) || (await wiktDef(p));
      if (e?.def) return { ...e, defWord: p };
    }
    const content = tokens.filter((t) => !SMALL_WORDS.has(t));
    for (const t of content.reverse()) {
      // the word as typed first ("tired" the adjective, not "tire"), then its base form
      const own = await lookup(t);
      if (own?.def && !own.formOf) return { ...own, defWord: t };
      const e = await lookupDef(t);
      if (e?.def) return { ...e, defWord: (await baseForm(t)) || t };
    }
    return null;
  }

  // For the slide's definition: use the base word for plurals/past tenses (claws → claw, mice → mouse).
  async function lookupDef(word) {
    const w = word.toLowerCase();
    if (!w.includes(' ')) {
      const base = await baseForm(w);
      const b = base && (await lookup(base));
      if (b) return b;
    }
    const e = await lookup(w);
    if (e?.formOf && e.formOf !== w) return (await lookup(e.formOf)) || e;
    if (e || w.includes(' ')) return e;
    const cands = [];
    if (w.endsWith('ies')) cands.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) cands.push(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss')) cands.push(w.slice(0, -1));
    if (w.endsWith('ed')) cands.push(w.slice(0, -2), w.slice(0, -1), w.slice(0, -3));
    if (w.endsWith('ing')) cands.push(w.slice(0, -3), w.slice(0, -3) + 'e', w.slice(0, -4));
    for (const c of cands) if (c.length >= 3) { const b = await lookup(c); if (b) return b; }
    return null;
  }
  const posOk = (entry, need) => !need || need.some((p) => entry.pos.has(p));
  // Guard against false splits (corner ≠ corn + er): the whole word's definitions must mention a part.
  async function related(word, parts) {
    const e = await lookup(word);
    if (!e) return true;
    const text = e.defs.slice(0, 3).map((d) => d.text).join(' ').toLowerCase() // main senses only
      .replace(new RegExp(`\\b${word}\\w*`, 'g'), ' ');                        // "mother" mustn't vouch for "moth"
    return parts.some((p) => {
      if (p.length < 3) return false;
      const stem = p.length > 4 && p.endsWith('e') ? p.slice(0, -1) : p; // drive → driv(ing)
      return new RegExp(`\\b${stem}(e|s|es|ed|ing|er|ers)?\\b`).test(text);
    });
  }

  // ---------------------------------------------------------------- word building
  const SUFFIXES = [...Object.keys(D.suffixes), 'ible'].sort((a, b) => b.length - a.length);
  const PREFIXES = Object.keys(D.prefixes).sort((a, b) => b.length - a.length);
  const suffixMeta = (k) => D.suffixes[k === 'ible' ? 'able' : k];

  // A base is either a real word, or two real words joined (screw|drive).
  // `whole` is the full word being explained, used for the relatedness check.
  // These suffixes keep the stem's meaning (quick → quickly) and are POS-guarded, so the
  // relatedness check is only needed for ambiguous ones like -er (corner ≠ corn + er).
  const SAFE = new Set(['ly', 'ness', 'ful', 'less']);
  async function realBase(c, need, whole, suffix) {
    const e = await lookup(c);
    return e && posOk(e, need) && (SAFE.has(suffix) || (await related(whole, [c]))) ? [c] : null;
  }
  // Two common words joined (screw|drive). Picks the split whose rarer part is most common.
  const FUNCTION_WORDS = new Set(['her', 'him', 'his', 'the', 'and', 'for', 'you', 'our', 'are', 'was', 'not', 'but', 'its', 'one', 'who', 'all', 'any', 'can', 'had', 'has']);
  async function compoundSplit(c, need, whole) {
    if (c.length < 6) return null;
    const splits = [];
    for (let i = 3; i <= c.length - 3; i++) {
      const [a, b] = [c.slice(0, i), c.slice(i)];
      if (!FUNCTION_WORDS.has(a) && !FUNCTION_WORDS.has(b)) splits.push([a, b]);
    }
    const found = await Promise.all(splits.map(async ([a, b]) => {
      const [ea, eb] = await Promise.all([lookup(a), lookup(b)]);
      if (!ea || !eb || !posOk(eb, need) || Math.min(ea.freq, eb.freq) < 0.5) return null;
      return (await related(whole, [a, b])) ? { parts: [a, b], score: Math.min(ea.freq, eb.freq) } : null;
    }));
    return found.filter(Boolean).sort((x, y) => y.score - x.score)[0]?.parts || null;
  }

  async function trySuffix(word, whole = word) {
    for (const s of SUFFIXES) {
      if (!word.endsWith(s) || word.length - s.length < 3) continue;
      const stem = word.slice(0, -s.length);
      const cands = [stem, stem + 'e'];
      if (stem.length > 3 && stem.at(-1) === stem.at(-2)) cands.push(stem.slice(0, -1)); // swimmer → swim
      if (stem.endsWith('i')) cands.unshift(stem.slice(0, -1) + 'y');                   // happiness → happy
      const need = suffixMeta(s).pos;
      const ok = cands.filter((c) => c.length >= 3);
      let base = null;
      for (const c of ok) if ((base = await realBase(c, need, whole, s))) break;
      if (!base) for (const c of ok) if ((base = await compoundSplit(c, need, whole))) break;
      if (base) return [...base.map((t) => ({ t, kind: 'base' })), { t: s, kind: 'suffix' }];
    }
    return null;
  }

  async function tryPrefix(word) {
    for (const p of PREFIXES) {
      if (!word.startsWith(p) || word.length - p.length < 3) continue;
      const rest = word.slice(p.length);
      const inner = (await lookup(rest)) && (await related(word, [rest]))
        ? [{ t: rest, kind: 'base' }] : await trySuffix(rest, word);
      if (inner) return [{ t: p, kind: 'prefix' }, ...inner];
    }
    return null;
  }

  async function analyzeWord(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length < 4) return null;
    const suf = await trySuffix(w);
    // a compound that ends in a suffix (screwdriver) still counts as a suffix word
    if (suf) return suf;
    const pre = await tryPrefix(w);
    if (pre) return pre;
    const b = await compoundSplit(w, null, w);
    return b ? b.map((t) => ({ t, kind: 'base' })) : null;
  }

  // Phrase → explain the most interesting word (last one with a breakdown, e.g. "clothes HANGER").
  async function analyze(input) {
    const tokens = input.toLowerCase().split(/[\s-]+/).filter(Boolean);
    // Break down the base word: "hangers" → hanger = hang + er
    const lemmas = await Promise.all(tokens.map(async (t) => (await baseForm(t)) || t));
    const results = await Promise.all(lemmas.map(analyzeWord));
    let i = results.length - 1;
    while (i >= 0 && !results[i]) i--;
    const focus = i >= 0 ? lemmas[i] : lemmas.at(-1);
    const entry = tokens.length === 1 ? await lookupDef(focus) : await phraseDef(tokens, lemmas);
    // "get tired" → "get tired = become tired"
    let note = '';
    const GET = { get: 'become', gets: 'becomes', got: 'became', getting: 'becoming' };
    if (GET[tokens[0]] && tokens[1] && (await lookup(tokens[1]))?.pos.has('adjective')) {
      note = `${tokens[0]} ${tokens[1]} = ${GET[tokens[0]]} ${tokens[1]}`;
    }
    const defWord = entry?.defWord && entry.defWord !== tokens.join(' ') ? entry.defWord : '';
    return {
      focus: i >= 0 && (tokens.length > 1 || lemmas[i] !== tokens[i]) ? focus : null,
      parts: i >= 0 ? results[i] : null,
      def: entry?.def || '',
      pos: entry?.defPos || '',
      defWord,
      note,
    };
  }

  function parseParts(text) {
    const toks = text.split('+').map((t) => t.trim().replace(/^-|-$/g, '').toLowerCase()).filter(Boolean);
    return toks.map((t, i) => {
      if (toks.length > 1 && i === toks.length - 1 && (D.suffixes[t] || t === 'ible')) return { t, kind: 'suffix' };
      if (toks.length > 1 && i === 0 && D.prefixes[t]) return { t, kind: 'prefix' };
      return { t, kind: 'base' };
    });
  }

  function patternOf(parts) {
    if (!parts) return null;
    const suf = parts.find((p) => p.kind === 'suffix');
    if (suf) return { ...suffixMeta(suf.t), label: `-${suf.t}` };
    const pre = parts.find((p) => p.kind === 'prefix');
    if (pre) return { ...D.prefixes[pre.t], label: `${pre.t}-` };
    if (parts.filter((p) => p.kind === 'base').length > 1) return { ...D.compound, label: 'compound' };
    return null;
  }

  function hash(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function pickExamples(pattern, word) {
    if (!pattern) return [];
    const pool = pattern.ex.filter(([w]) => w !== word.toLowerCase().replace(/\s+/g, ''));
    const start = hash(word) % pool.length;
    return [0, 1, 2].map((k) => pool[(start + k) % pool.length]).filter((v, i, a) => v && a.indexOf(v) === i);
  }

  // ---------------------------------------------------------------- example sentences (Tatoeba → Wiktionary)
  const NAMES = /\b(Tom|Mary|Ziri|Yanni|Sami|Layla|Rima|Skura|John|Mennad|Baya|Fadil|Dania)\b/;
  const goodSentence = (s) => {
    const n = s.split(/\s+/).length;
    const midCaps = s.split(/\s+/).slice(1).some((w) => /^[A-Z]/.test(w) && !/^I\b/.test(w)); // skip proper names
    return n >= 4 && n <= 14 && !NAMES.test(s) && !midCaps && !/[;"“]/.test(s);
  };
  async function findSentences(input) {
    const q = input.includes(' ') ? `"${input}"` : `=${input}`;
    let out = [];
    try {
      const d = await (await fetch(`https://api.tatoeba.org/unstable/sentences?lang=eng&q=${encodeURIComponent(q)}&sort=words&limit=40`)).json();
      const short = (s) => s.split(/\s+/).length < 5; // "She is fearless." is a last resort
      out = (d.data || []).map((x) => x.text.trim()).filter(goodSentence).sort((a, b) => short(a) - short(b));
    } catch { /* fall through */ }
    if (out.length < 2) {
      try {
        const d = await (await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(input.replace(/ /g, '_'))}`)).json();
        for (const e of d.en || []) for (const df of e.definitions || []) for (const x of df.examples || []) {
          const s = x.replace(/<[^>]+>/g, '').trim();
          if (goodSentence(s)) out.push(s);
        }
      } catch { /* none */ }
    }
    // two sentences that actually differ ("She went to the barn." vs "She came to the barn." → keep one)
    const picked = [];
    for (const s of out) {
      const ws = new Set(s.toLowerCase().match(/[a-z']+/g));
      const dup = picked.some((p) => {
        const pw = p.toLowerCase().match(/[a-z']+/g);
        return pw.filter((w) => ws.has(w)).length / Math.max(pw.length, ws.size) > 0.5;
      });
      if (!dup) picked.push(s);
      if (picked.length === 2) break;
    }
    return picked;
  }
  // Bold every form of the target word (hanger, hangers) inside a sentence.
  function highlight(sentence, input, defWord = '') {
    const words = input.split(' ');
    // a phrase's last word is often small ("from"); mark the defined word instead
    const word = defWord || words.filter((w) => w.length > 3).at(-1) || words.at(-1);
    const re = new RegExp(`\\b(${input.replace(/\s+/g, '\\s+')}|${word.replace(/\s+/g, '\\s+')})(s|es|ed|ing|d)?\\b`, 'gi');
    return esc(sentence).replace(re, '<mark>$&</mark>');
  }

  // ---------------------------------------------------------------- images (Openverse → Wikimedia Commons)
  async function openverse(q) {
    try {
      const d = await (await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=15&mature=false`)).json();
      return (d.results || []).map((x) => ({
        title: x.title || '', src: x.thumbnail || x.url, link: x.foreign_landing_url,
        credit: `${x.creator || 'Unknown'} · ${String(x.license || '').toUpperCase()}`,
      }));
    } catch { return []; }
  }
  async function commons(q) {
    try {
      const u = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=15&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*`;
      const d = await (await fetch(u)).json();
      return Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index).flatMap((p) => {
        const ii = p.imageinfo?.[0];
        if (!ii) return [];
        const artist = (ii.extmetadata?.Artist?.value || 'Wikimedia Commons').replace(/<[^>]+>/g, '').trim();
        return [{ title: p.title.replace(/^File:|\.\w+$/g, ''), src: ii.thumburl || ii.url, link: ii.descriptionurl, credit: `${artist} · ${ii.extmetadata?.LicenseShortName?.value || ''}` }];
      });
    } catch { return []; }
  }
  // Both sources in parallel, ranked so a plain photo of the thing wins over art/posters/albums.
  const OFF_TOPIC = /\b(sculpture|poster|album|logo|lego|interview|damage|art|artwork|graffiti|painting|drawing|cover|tattoo|toy|meme|screenshot|diagram|map)\b/i;
  async function findImages(q) {
    const words = q.toLowerCase().split(/\s+/);
    const [a, b] = await Promise.all([openverse(q), commons(q)]);
    const seen = new Set();
    return [...a, ...b].filter((x) => x.src && !seen.has(x.src) && seen.add(x.src))
      .map((x, i) => {
        const t = x.title.toLowerCase();
        let score = words.filter((w) => t.includes(w)).length * 3 - i * 0.05;
        if (OFF_TOPIC.test(t)) score -= 4;
        if (/[^\x00-\x7F]/.test(x.title)) score -= 3; // keep slides in English
        return { ...x, score };
      })
      .sort((x, y) => y.score - x.score);
  }

  // ---------------------------------------------------------------- theme from book cover
  const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;

  function paletteFromImage(img) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 64, 64);
    const px = ctx.getImageData(0, 0, 64, 64).data;
    const buckets = new Map();
    for (let i = 0; i < px.length; i += 4) {
      const key = (px[i] >> 4) << 8 | (px[i + 1] >> 4) << 4 | (px[i + 2] >> 4);
      const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
      b.r += px[i]; b.g += px[i + 1]; b.b += px[i + 2]; b.n++;
      buckets.set(key, b);
    }
    const cols = [...buckets.values()].map((b) => {
      const [h, s, l] = rgbToHsl(b.r / b.n, b.g / b.n, b.b / b.n);
      // favour colourful, mid-light, frequent colours
      const score = b.n * (0.25 + s) * (1 - Math.abs(l - 0.5) * 1.4);
      return { h, s, l, score };
    }).sort((a, b) => b.score - a.score);
    const main = cols[0] || { h: 230, s: 0.6, l: 0.5 };
    const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    const second = cols.find((x) => hueGap(x.h, main.h) > 40 && x.s > 0.25) || { h: (main.h + 150) % 360, s: 0.7, l: 0.55 };
    const third = cols.find((x) => x !== second && hueGap(x.h, main.h) > 25 && hueGap(x.h, second.h) > 25) || { h: (main.h + 60) % 360, s: 0.5, l: 0.7 };
    const s1 = Math.max(main.s, 0.35);
    return {
      // c1 is used for titles on the pale bg — keep it dark enough to read (yellows go olive/amber)
      c1: hsl(main.h, s1, (main.h > 40 && main.h < 80) ? 0.3 : Math.min(Math.max(main.l, 0.28), 0.38)),
      c2: hsl(second.h, Math.max(second.s, 0.5), Math.min(Math.max(second.l, 0.42), 0.55)),
      c3: hsl(third.h, Math.max(third.s, 0.35), 0.78),
      bg: hsl(main.h, Math.min(s1, 0.55), 0.95),
      ink: hsl(main.h, Math.min(s1, 0.5), 0.17),
    };
  }

  function rimTile(motif, t) {
    const a = t.c2, b = '#ffffff', c = t.c3;
    const star = (cx, cy, r, fill) => {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
        pts.push(`${(cx + rr * Math.cos(ang)).toFixed(1)},${(cy + rr * Math.sin(ang)).toFixed(1)}`);
      }
      return `<polygon points="${pts.join(' ')}" fill="${fill}"/>`;
    };
    const shapes = {
      dots: `<circle cx="20" cy="20" r="9" fill="${a}"/><circle cx="4" cy="4" r="3" fill="${b}"/><circle cx="36" cy="36" r="3" fill="${c}"/>`,
      stars: star(20, 21, 12, a) + `<circle cx="5" cy="6" r="2" fill="${b}"/><circle cx="35" cy="34" r="2" fill="${c}"/>`,
      leaves: `<ellipse cx="14" cy="20" rx="10" ry="5" transform="rotate(-35 14 20)" fill="${a}"/><ellipse cx="28" cy="20" rx="8" ry="4" transform="rotate(35 28 20)" fill="${c}"/>`,
      waves: `<path d="M0 14 Q10 4 20 14 T40 14" stroke="${a}" stroke-width="5" fill="none"/><path d="M0 28 Q10 18 20 28 T40 28" stroke="${c}" stroke-width="4" fill="none"/>`,
      bunting: `<polygon points="3,6 37,6 20,34" fill="${a}"/><polygon points="12,9 28,9 20,22" fill="${c}"/>`,
      books: `<rect x="5" y="8" width="8" height="26" rx="1" fill="${a}"/><rect x="15" y="4" width="8" height="30" rx="1" fill="${c}"/><rect x="25" y="10" width="9" height="24" rx="1" fill="${b}"/>`,
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">${shapes[motif] || shapes.dots}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  function applyTheme() {
    const root = document.documentElement.style;
    for (const k of ['c1', 'c2', 'c3', 'bg', 'ink']) root.setProperty(`--${k}`, state.theme[k]);
    root.setProperty('--tile', rimTile(state.motif, state.theme));
    $('#swatches').innerHTML = ['c1', 'c2', 'c3', 'bg'].map((k) => `<span style="background:${state.theme[k]}" title="${k}"></span>`).join('');
    renderAll(); // cover badges are part of each slide
  }

  // ---------------------------------------------------------------- rendering
  const rims = '<div class="rim t"></div><div class="rim b"></div><div class="rim l"></div><div class="rim r"></div>';
  const badge = () => (state.cover ? `<img class="cover-badge" src="${state.cover}" alt="">` : '');

  function titleSlideHTML() {
    const words = state.slides.filter((s) => s.kind === 'word');
    return `<article class="slide title">${rims}<div class="inner">
      <div><h1>${esc(state.title || 'New Words')}</h1>
        <p>📖 ${words.length} new word${words.length === 1 ? '' : 's'} today</p>
        <div class="tags">${words.map((s) => `<span>${esc(s.input)}</span>`).join('')}</div></div>
      ${state.cover ? `<img class="big-cover" src="${state.cover}" alt="Book cover">` : ''}
    </div></article>`;
  }

  function wordSlideHTML(s) {
    const img = s.customImg ? { src: s.customImg, credit: 'Your image' } : s.images?.[s.imgIdx];
    const pattern = patternOf(s.parts);
    const ex = pickExamples(pattern, s.focus || s.input);
    const parts = s.parts?.map((p) =>
      `<span class="chip ${p.kind === 'base' ? '' : 'affix'}">${esc(p.t)}</span>`
    ).join('<span class="plus">+</span>');
    const focusWord = s.focus || s.input.toLowerCase().replace(/\s+/g, '');
    return `<article class="slide ${s.loading ? 'loading' : ''}" data-id="${s.id}">${rims}${badge()}<div class="inner">
      <h2 class="word say" title="Click to hear it">${esc(s.input)}</h2>
      <div class="body">
        <figure class="pic">${img
          ? `<img src="${esc(img.src)}" alt="${esc(s.input)}" referrerpolicy="no-referrer"><figcaption>${img.link ? `<a href="${esc(img.link)}" target="_blank" rel="noopener">${esc(img.credit)}</a>` : esc(img.credit)}</figcaption>`
          : `<div class="ph">${s.loading ? 'Finding a picture…' : 'No picture found — use 🖼 to upload one'}</div>`}</figure>
        <div class="info">
          ${s.def || s.loading ? `<p class="def" contenteditable="true" spellcheck="false" data-field="def">${s.defWord ? `<b class="dw say" contenteditable="false">${esc(s.defWord)}</b> ` : ''}${s.pos ? `<span class="pos" contenteditable="false">${esc(s.pos)}</span>` : ''}${esc(s.def || '…')}</p>` : ''}
          ${s.note ? `<p class="gloss">${esc(s.note)}</p>` : ''}
          ${parts ? `<div class="break"><span class="chip">${esc(focusWord)}</span><span class="eq">=</span>${parts}</div>` : ''}
          ${pattern ? `<p class="gloss">${pattern.label === 'compound'
            ? `A compound word: ${esc(pattern.gloss)}.`
            : `<b>${esc(pattern.label)}</b> means ${esc(pattern.gloss)}.`}</p>` : ''}
          ${ex.length ? `<div class="ex">${ex.map(([w, p, e]) => `<div><div class="em">${e}</div><b class="say">${esc(w)}</b><small>${esc(p)}</small></div>`).join('')}</div>` : ''}
          ${!s.parts && s.sentences?.length ? `<ul class="sent">${s.sentences.map((x) => `<li contenteditable="true" spellcheck="false">${highlight(x, s.input, s.defWord)}</li>`).join('')}</ul>` : ''}
        </div>
      </div>
    </div></article>`;
  }

  function cardHTML(s, n) {
    const isTitle = s.kind === 'title';
    return `<div class="card" data-card="${s.id}">
      ${isTitle ? titleSlideHTML() : wordSlideHTML(s)}
      <div class="tools"><span class="idx">${n}</span>
        ${isTitle ? '' : `<button data-act="say" title="Read the word aloud">🔊</button>
        <button data-act="swap" title="Next picture">⟳ Picture</button>
        <button data-act="upload" title="Upload your own picture">🖼 Upload</button>
        <button data-act="edit" title="Edit word breakdown">✎ Breakdown</button>`}
        <button data-act="remove" title="Remove slide">✕</button>
      </div></div>`;
  }

  function renderAll() {
    const deck = $('#deck');
    if (!state.slides.length) return;
    deck.innerHTML = state.slides.map((s, i) => cardHTML(s, i + 1)).join('');
    $('#presentBtn').disabled = $('#printBtn').disabled = false;
  }
  function renderOne(s) {
    const el = document.querySelector(`[data-card="${s.id}"]`);
    if (!el) return;
    el.outerHTML = cardHTML(s, state.slides.indexOf(s) + 1);
    const t = state.slides.find((x) => x.kind === 'title');
    if (t && t !== s) renderOne(t);
  }

  // ---------------------------------------------------------------- generate
  async function buildSlide(s) {
    const [a, imgs] = await Promise.all([analyze(s.input), findImages(s.input)]);
    Object.assign(s, a, { images: imgs, imgIdx: 0 });
    // Words that don't split (corner, carpet) are explained with example sentences instead.
    if (!s.parts) {
      // phrases with few exact matches fall back to the part that was defined ("get tired from" → "tired")
      s.sentences = await findSentences(s.input);
      if (s.sentences.length < 2 && s.defWord) s.sentences = [...new Set([...s.sentences, ...(await findSentences(s.defWord))])].slice(0, 2);
    }
    s.loading = false;
    renderOne(s);
  }

  async function generate() {
    const items = $('#words').value.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
    if (!items.length) { $('#words').focus(); return; }
    state.slides = items.map((input) => ({ id: ++uid, kind: 'word', input, loading: true }));
    if ($('#titleSlide').checked) state.slides.unshift({ id: ++uid, kind: 'title' });
    renderAll();
    save();
    const queue = state.slides.filter((s) => s.kind === 'word');
    const worker = async () => { while (queue.length) await buildSlide(queue.shift()); };
    await Promise.all([worker(), worker(), worker()]);
  }

  // ---------------------------------------------------------------- slide tools
  let uploadTarget = null;
  $('#deck').addEventListener('click', (e) => {
    const say = e.target.closest('.say');
    if (say) { window.PS_speak(say.textContent); return; }
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const s = state.slides.find((x) => x.id === +btn.closest('.card').dataset.card);
    const act = btn.dataset.act;
    if (act === 'say') window.PS_speak(s.input);
    if (act === 'swap' && s.images?.length) { s.customImg = null; s.imgIdx = (s.imgIdx + 1) % s.images.length; renderOne(s); }
    if (act === 'upload') { uploadTarget = s; $('#slideImgInput').click(); }
    if (act === 'edit') {
      const cur = s.parts ? s.parts.map((p) => p.t).join(' + ') : '';
      const v = prompt(`Word breakdown for "${s.focus || s.input}" (use +), e.g. hang + er.\nLeave empty to hide it.`, cur);
      if (v === null) return;
      s.parts = v.trim() ? parseParts(v) : null;
      renderOne(s);
      if (!s.parts && !s.sentences) findSentences(s.input).then((x) => { s.sentences = x; renderOne(s); });
    }
    if (act === 'remove') { state.slides.splice(state.slides.indexOf(s), 1); renderAll(); }
  });
  $('#deck').addEventListener('input', (e) => {
    const el = e.target.closest('[data-field="def"]');
    if (!el) return;
    const s = state.slides.find((x) => x.id === +el.closest('.slide').dataset.id);
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.pos, .dw').forEach((x) => x.remove());
    s.def = clone.textContent.trim();
  });
  $('#slideImgInput').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (f && uploadTarget) { uploadTarget.customImg = await readImage(f, 1200); renderOne(uploadTarget); }
    e.target.value = '';
  });

  // ---------------------------------------------------------------- cover upload
  function readImage(file, max) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * k; c.height = img.height * k;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        res(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = rej;
      img.src = URL.createObjectURL(file);
    });
  }
  async function setCover(file) {
    if (!file?.type.startsWith('image/')) return;
    state.cover = await readImage(file, 600);
    const img = new Image();
    img.onload = () => { state.theme = paletteFromImage(img); showCover(); applyTheme(); save(); };
    img.src = state.cover;
  }
  function showCover() {
    $('#coverPreview').src = state.cover || '';
    $('#coverPreview').hidden = !state.cover;
    $('#coverHint').textContent = state.cover ? 'Click to change cover' : '📷 Upload or drop a screenshot of the book cover';
  }
  $('#coverInput').addEventListener('change', (e) => setCover(e.target.files[0]));
  const drop = $('#coverDrop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); setCover(e.dataTransfer.files[0]); });
  document.addEventListener('paste', (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
    if (f) setCover(f);
  });

  $('#motif').addEventListener('change', (e) => { state.motif = e.target.value; applyTheme(); save(); });
  $('#bookTitle').addEventListener('input', (e) => {
    state.title = e.target.value;
    const t = state.slides.find((x) => x.kind === 'title');
    if (t) renderOne(t);
    save();
  });
  $('#words').addEventListener('input', save);
  $('#generateBtn').addEventListener('click', generate);
  $('#printBtn').addEventListener('click', () => window.print());

  // ---------------------------------------------------------------- present mode
  let cur = 0;
  function show(i) {
    cur = Math.max(0, Math.min(state.slides.length - 1, i));
    const s = state.slides[cur];
    $('#stage').innerHTML = s.kind === 'title' ? titleSlideHTML() : wordSlideHTML(s);
    $('#stage').querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
    $('#counter').textContent = `${cur + 1} / ${state.slides.length}`;
  }
  function openPresent() {
    if (!state.slides.length) return;
    $('#present').hidden = false;
    show(0);
    $('#present').requestFullscreen?.().catch(() => {});
  }
  function closePresent() {
    $('#present').hidden = true;
    if (document.fullscreenElement) document.exitFullscreen();
  }
  $('#presentBtn').addEventListener('click', openPresent);
  $('#prevBtn').addEventListener('click', () => show(cur - 1));
  $('#nextBtn').addEventListener('click', () => show(cur + 1));
  $('#closeBtn').addEventListener('click', closePresent);
  $('#stage').addEventListener('click', (e) => {
    const say = e.target.closest('.say');
    if (say) window.PS_speak(say.textContent); else show(cur + 1);
  });
  $('#sayBtn').addEventListener('click', () => {
    const s = state.slides[cur];
    window.PS_speak(s.kind === 'title' ? (state.title || 'New words') : s.input);
  });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) $('#present').hidden = true; });
  document.addEventListener('keydown', (e) => {
    if ($('#present').hidden) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(cur + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) show(cur - 1);
    if (e.key === 'Escape') closePresent();
  });

  // ---------------------------------------------------------------- persistence (per-browser convenience)
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        words: $('#words').value, title: state.title, motif: state.motif, theme: state.theme, cover: state.cover,
      }));
    } catch { /* storage full or blocked */ }
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (!d) return;
      $('#words').value = d.words || '';
      state.title = $('#bookTitle').value = d.title || '';
      state.motif = $('#motif').value = d.motif || 'dots';
      if (d.theme) state.theme = d.theme;
      state.cover = d.cover || null;
    } catch { /* ignore */ }
  }

  load();
  showCover();
  applyTheme();
})();
