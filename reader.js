// Read aloud: browser text-to-speech (Web Speech API) — free, no key, works offline with system voices.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const synth = window.speechSynthesis;
  const STORE = 'proslide.reader.v1';

  // ---------------------------------------------------------------- tabs (#slides / #read)
  function route() {
    const view = location.hash === '#read' ? 'read' : 'slides';
    document.querySelectorAll('[data-only]').forEach((el) => { el.hidden = el.dataset.only !== view; });
    document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.view === view));
    if (view !== 'read' && synth) stop();
  }
  window.addEventListener('hashchange', route);

  if (!synth) {
    route();
    $('#rdPlay').disabled = true;
    $('#rdNote').textContent = 'Sorry — this browser cannot read aloud. Please try Chrome, Edge or Safari.';
    window.PS_speak = () => {};
    return;
  }

  // ---------------------------------------------------------------- voices (English only)
  const NOVELTY = /\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Deranged|Hysterical|Pipe Organ)\b/i;
  let voices = [];
  const prefs = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } })();
  const rank = (v) => (/natural|premium|enhanced|neural|online/i.test(v.name) ? 4 : 0) + (/google|microsoft/i.test(v.name) ? 1 : 0)
    + (/en[-_](US|GB)/i.test(v.lang) ? 2 : 0) + (v.default ? 1 : 0);

  function fillVoices() {
    voices = synth.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang) && !NOVELTY.test(v.name)).sort((a, b) => rank(b) - rank(a));
    const sel = $('#rdVoice');
    sel.innerHTML = voices.length
      ? voices.map((v) => `<option value="${esc(v.voiceURI)}">${esc(v.name.replace(/^(Microsoft|Google)\s+/, ''))} · ${esc(v.lang)}</option>`).join('')
      : '<option value="">Default English voice</option>';
    if (prefs.voice && voices.some((v) => v.voiceURI === prefs.voice)) sel.value = prefs.voice;
  }
  fillVoices();
  synth.addEventListener?.('voiceschanged', fillVoices);

  const voice = () => voices.find((v) => v.voiceURI === $('#rdVoice').value) || voices[0] || null;
  function utter(text) {
    const u = new SpeechSynthesisUtterance(text);
    const v = voice();
    if (v) u.voice = v;
    u.lang = v?.lang || 'en-US';
    u.rate = +$('#rdRate').value;
    return u;
  }

  // ---------------------------------------------------------------- text → sentences → words
  function sentences(text) {
    if (window.Intl?.Segmenter) {
      return [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text)].map((s) => s.segment);
    }
    return text.match(/[^.!?\n]+[.!?]*["'”’)\]]*\s*|\n+/g) || [];
  }
  const speakable = (s) => /[\p{L}\p{N}]/u.test(s);
  let segs = [];

  function renderView() {
    segs = sentences($('#rdText').value);
    $('#rdView').innerHTML = segs.map((s, i) => {
      if (!speakable(s)) return esc(s);
      let off = 0;
      const inner = s.split(/(\s+)/).map((part) => {
        const o = off; off += part.length;
        return /\S/.test(part) ? `<span class="rw" data-o="${o}">${esc(part)}</span>` : esc(part);
      }).join('');
      return `<span class="rs" data-i="${i}">${inner}</span>`;
    }).join('');
  }

  // ---------------------------------------------------------------- player
  let token = 0, playing = false, paused = false;
  const segEl = (i) => $(`#rdView .rs[data-i="${i}"]`);

  function buttons() {
    $('#rdPlay').textContent = playing ? '⟲ Restart' : '▶ Read aloud';
    $('#rdPause').disabled = $('#rdStop').disabled = !playing;
    $('#rdPause').textContent = paused ? '▶ Resume' : '⏸ Pause';
    $('#rdEdit').hidden = !$('#rdText').hidden; // only offered while showing the reading view
  }
  function clearMarks() {
    document.querySelectorAll('#rdView .on').forEach((el) => el.classList.remove('on'));
  }

  function playFrom(i) {
    if (!$('#rdText').value.trim()) { $('#rdText').focus(); return; }
    if (!$('#rdText').hidden) {
      renderView();
      $('#rdText').hidden = true;
      $('#rdView').hidden = false;
    }
    synth.cancel();
    const my = ++token;
    playing = true; paused = false;
    buttons();
    const speakAt = (k) => {
      if (my !== token) return;
      while (k < segs.length && !speakable(segs[k])) k++;
      if (k >= segs.length) { finish(); return; }
      clearMarks();
      const el = segEl(k);
      el.classList.add('on');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const u = utter(segs[k]);
      u.onboundary = (e) => {
        if (my !== token || e.name === 'sentence') return;
        const words = [...el.querySelectorAll('.rw')];
        const w = words.filter((x) => +x.dataset.o <= e.charIndex).at(-1);
        if (!w) return;
        el.querySelectorAll('.rw.on').forEach((x) => x.classList.remove('on'));
        w.classList.add('on');
      };
      u.onend = () => speakAt(k + 1);
      u.onerror = (e) => { if (!['interrupted', 'canceled'].includes(e.error)) speakAt(k + 1); };
      synth.speak(u);
    };
    setTimeout(() => speakAt(i), 60); // Chrome drops a speak() issued right after cancel()
  }
  function finish() {
    playing = paused = false;
    clearMarks();
    buttons();
  }
  function stop() {
    token++;
    synth.cancel();
    finish();
  }
  function togglePause() {
    if (!playing) return;
    if (paused) synth.resume(); else synth.pause();
    paused = !paused;
    buttons();
  }

  // ---------------------------------------------------------------- controls
  const editBtn = Object.assign(document.createElement('button'), { id: 'rdEdit', className: 'btn', textContent: '✎ Edit text', hidden: true });
  $('.player').append(editBtn);
  editBtn.addEventListener('click', () => {
    stop();
    $('#rdView').hidden = true;
    $('#rdText').hidden = false;
    $('#rdText').focus();
    buttons();
  });
  $('#rdPlay').addEventListener('click', () => playFrom(0));
  $('#rdPause').addEventListener('click', togglePause);
  $('#rdStop').addEventListener('click', stop);
  $('#rdView').addEventListener('click', (e) => {
    const s = e.target.closest('.rs');
    if (s) playFrom(+s.dataset.i);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' || $('.reader').hidden || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) return;
    e.preventDefault();
    togglePause();
  });

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ voice: $('#rdVoice').value, rate: $('#rdRate').value, size: $('#rdSize').value, text: $('#rdText').value }));
    } catch { /* blocked */ }
  }
  const applySize = () => $('.reader-box').style.setProperty('--rd-size', $('#rdSize').value + 'px');
  const applyRate = () => { $('#rdRateOut').textContent = (+$('#rdRate').value).toFixed(1) + '×'; };
  $('#rdRate').addEventListener('input', () => { applyRate(); save(); });
  $('#rdSize').addEventListener('change', () => { applySize(); save(); });
  $('#rdVoice').addEventListener('change', save);
  $('#rdText').addEventListener('input', save);

  if (prefs.rate) $('#rdRate').value = prefs.rate;
  if (prefs.size) $('#rdSize').value = prefs.size;
  if (prefs.text) $('#rdText').value = prefs.text;
  applyRate();
  applySize();
  route();

  // Used by the slides: say one word or phrase.
  window.PS_speak = (text) => {
    stop();
    setTimeout(() => synth.speak(utter(text)), 60);
  };
})();
