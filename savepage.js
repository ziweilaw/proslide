// "Save as webpage": one self-contained .html file of the slides as edited — pictures, fonts and theme
// embedded, click-to-hear words and a Present mode included. Opens offline in any browser.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const api = window.PS_api;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function progress(msg, frac = 0) {
    $('#exporting').hidden = false;
    $('#expMsg').textContent = msg;
    $('#expFill').style.width = `${Math.round(frac * 100)}%`;
  }

  const toDataUrl = (blob) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  async function fetchData(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(url, { signal: ctrl.signal, referrerPolicy: 'no-referrer' });
      if (!r.ok) return null;
      return await toDataUrl(await r.blob());
    } catch { return null; } finally { clearTimeout(timer); }
  }

  // Google Fonts CSS with the Latin font files embedded, so headings look right offline.
  async function embeddedFonts() {
    const link = document.querySelector('link[href*="fonts.googleapis.com/css"]');
    if (!link) return '';
    try {
      const css = await (await fetch(link.href)).text();
      const blocks = css.split(/(?=\/\*\s*[\w-]+\s*\*\/)/).filter((b) => /^\/\*\s*latin\s*\*\//.test(b));
      const out = [];
      for (const b of blocks) {
        const url = b.match(/url\((https:[^)]+)\)/)?.[1];
        const data = url && (await fetchData(url));
        out.push(data ? b.replace(url, data) : b);
      }
      return out.join('\n');
    } catch {
      return `@import url("${link.href}");`; // falls back to loading the fonts online
    }
  }

  // Copy of each slide as the teacher sees it, minus editing hooks.
  function cleanSlides() {
    return [...document.querySelectorAll('#deck .slide')].map((el) => {
      const c = el.cloneNode(true);
      c.classList.remove('loading');
      c.querySelectorAll('[contenteditable], [spellcheck]').forEach((n) => { n.removeAttribute('contenteditable'); n.removeAttribute('spellcheck'); });
      c.querySelectorAll('[data-field], [data-sent]').forEach((n) => { n.removeAttribute('data-field'); n.removeAttribute('data-sent'); });
      return c;
    });
  }

  // The saved page's own small script: present mode + click a word to hear it.
  function viewerScript(voiceName, rate) {
    return `(() => {
  const $ = (s) => document.querySelector(s);
  const slides = [...document.querySelectorAll('.saved-deck .slide')];
  const synth = window.speechSynthesis;
  const PREF = ${JSON.stringify(voiceName)}, RATE = ${rate};
  function voice() {
    const vs = (synth ? synth.getVoices() : []).filter((v) => /^en([-_]|$)/i.test(v.lang));
    return vs.find((v) => v.name === PREF) || vs.find((v) => /natural|premium|enhanced|neural|online/i.test(v.name))
      || vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0] || null;
  }
  function say(text) {
    if (!synth || !text) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voice();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'en-US';
    u.rate = RATE;
    setTimeout(() => synth.speak(u), 50);
  }
  if (synth) synth.getVoices();
  document.addEventListener('click', (e) => {
    const w = e.target.closest('.say');
    if (w) { e.stopPropagation(); say(w.textContent.trim()); }
  }, true);

  let cur = 0;
  function show(i) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    $('#stage').innerHTML = slides[cur].outerHTML;
    $('#counter').textContent = (cur + 1) + ' / ' + slides.length;
  }
  function open(i) {
    $('#present').hidden = false;
    show(i);
    if ($('#present').requestFullscreen) $('#present').requestFullscreen().catch(() => {});
  }
  function close() {
    $('#present').hidden = true;
    if (document.fullscreenElement) document.exitFullscreen();
  }
  $('#presentBtn').addEventListener('click', () => open(0));
  document.querySelectorAll('.saved-deck .slide').forEach((s, i) => s.addEventListener('dblclick', () => open(i)));
  $('#prevBtn').addEventListener('click', () => show(cur - 1));
  $('#nextBtn').addEventListener('click', () => show(cur + 1));
  $('#closeBtn').addEventListener('click', close);
  $('#sayBtn').addEventListener('click', () => { const w = $('#stage .word, #stage h1'); if (w) say(w.textContent.trim()); });
  $('#stage').addEventListener('click', () => show(cur + 1));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) $('#present').hidden = true; });
  document.addEventListener('keydown', (e) => {
    if ($('#present').hidden) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); show(cur + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) show(cur - 1);
    if (e.key === 'Escape') close();
  });
})();`;
  }

  async function savePage() {
    if (api.building()) { alert('Please wait until all slides have finished loading.'); return; }
    const slides = cleanSlides();
    if (!slides.length) return;
    const btn = $('#saveWebBtn');
    btn.disabled = true;
    try {
      progress('Collecting styles and fonts…', 0.05);
      const [appCss, fontCss] = await Promise.all([
        fetch('style.css').then((r) => r.text()),
        embeddedFonts(),
      ]);

      // Embed every picture (data: images such as uploads and the cover are already inside)
      const imgs = slides.flatMap((s) => [...s.querySelectorAll('img')]).filter((i) => !i.getAttribute('src').startsWith('data:'));
      const cache = new Map();
      for (let k = 0; k < imgs.length; k++) {
        progress(`Saving pictures… ${k + 1} of ${imgs.length}`, 0.1 + 0.8 * (k / Math.max(1, imgs.length)));
        const src = imgs[k].getAttribute('src');
        if (!cache.has(src)) cache.set(src, await fetchData(src));
        if (cache.get(src)) imgs[k].setAttribute('src', cache.get(src)); // else keep the online link
      }

      progress('Building the webpage…', 0.95);
      const title = api.title() || 'New words';
      const prefs = (() => { try { return JSON.parse(localStorage.getItem('proslide.reader.v1')) || {}; } catch { return {}; } })();
      const voiceName = (window.speechSynthesis?.getVoices() || []).find((v) => v.voiceURI === prefs.voice)?.name || '';
      const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ProSlide</title>
<style>${fontCss}</style>
<style>${appCss}</style>
<style>
:root { ${document.documentElement.style.cssText} }
.saved-deck { max-width: 1000px; margin: 0 auto; padding: 24px 16px 60px; display: grid; gap: 28px; }
.saved-hint { color: var(--app-muted); font-size: 14px; }
</style>
</head>
<body>
<header class="topbar">
  <div class="brand"><span class="logo">▣</span> ${esc(title)}</div>
  <div class="top-actions"><span class="saved-hint">Click a word to hear it</span><button id="presentBtn" class="btn primary">▶ Present</button></div>
</header>
<main class="saved-deck">
${slides.map((s) => s.outerHTML).join('\n')}
</main>
<div class="present" id="present" hidden>
  <div class="stage" id="stage"></div>
  <div class="present-bar">
    <button class="btn ghost" id="prevBtn" aria-label="Previous">‹</button>
    <span id="counter"></span>
    <button class="btn ghost" id="nextBtn" aria-label="Next">›</button>
    <button class="btn ghost" id="sayBtn" aria-label="Say the word">🔊</button>
    <button class="btn ghost" id="closeBtn" aria-label="Close">✕</button>
  </div>
</div>
<script>${viewerScript(voiceName, +prefs.rate || 0.9)}</script>
</body>
</html>`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vocabulary'}-slides.html`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } catch (err) {
      console.error(err);
      alert(`Sorry, the webpage could not be saved. ${err.message || ''}`);
    } finally {
      btn.disabled = false;
      $('#exporting').hidden = true;
    }
  }

  $('#saveWebBtn').addEventListener('click', savePage);
})();
