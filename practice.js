// Practice tab: match words to pictures, and fill in the blanks — built from the teacher's slides.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const api = window.PS_api;
  const body = $('#prBody');
  const say = (t) => window.PS_speak?.(t);
  const shuffle = (a) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  };
  const imgOf = (s) => s.customImg || s.images?.[s.imgIdx]?.src || '';
  const active = () => location.hash === '#practice';

  let mode = 'match';
  let renderId = 0;
  let match = null; // { total, done: Set, misses, word: chip el, pic: card el }
  let fill = null;  // { answers: [], active: index }

  // ---------------------------------------------------------------- entry
  async function render() {
    const my = ++renderId;
    $('#prCheck').hidden = mode !== 'fill';
    document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const list = api.slides();
    if (!list.length) {
      body.innerHTML = `<div class="pr-empty"><div class="empty-art">🧩</div>
        ${api.hasWords()
          ? '<p>Turn your word list into practice activities.</p><button class="btn primary" id="prMake">✨ Make practice from my words</button>'
          : '<p>First type your new words in the <a href="#slides">Slides</a> tab, then come back here.</p>'}</div>`;
      return;
    }
    if (api.building()) {
      body.innerHTML = '<p class="pr-wait">Getting pictures and sentences…</p>';
      setTimeout(() => { if (my === renderId && active()) render(); }, 700);
      return;
    }
    if (mode === 'match') renderMatch(list);
    else await renderFill(list, my);
  }

  // ---------------------------------------------------------------- 1. match pictures
  function renderMatch(list) {
    const items = list.filter(imgOf);
    if (!items.length) {
      body.innerHTML = '<p class="pr-wait">None of your slides has a picture yet. Add pictures in the Slides tab (🖼 Upload).</p>';
      return;
    }
    match = { total: items.length, done: new Set(), misses: 0, word: null, pic: null };
    const skipped = list.length - items.length;
    body.innerHTML = `
      <p class="pr-help">Click a word, then click the picture that matches it. You can also drag a word onto a picture.</p>
      <div class="bank">${shuffle(items).map((s) => `<button class="wchip" draggable="true" data-id="${s.id}">${esc(s.input)}</button>`).join('')}</div>
      <div class="pics">${shuffle(items).map((s, i) => `
        <figure class="pcard" data-id="${s.id}" data-word="${esc(s.input)}" tabindex="0">
          <span class="num">${i + 1}</span>
          <img src="${esc(imgOf(s))}" alt="Picture ${i + 1}" referrerpolicy="no-referrer" draggable="false">
          <figcaption class="slot">?</figcaption>
        </figure>`).join('')}</div>
      <p class="score" id="prScore"></p>
      ${skipped ? `<p class="pr-help">${skipped} word${skipped > 1 ? 's' : ''} without a picture ${skipped > 1 ? 'are' : 'is'} left out.</p>` : ''}`;
    matchScore();
  }

  function tryMatch(chip, card) {
    if (!chip || !card || card.classList.contains('ok') || chip.disabled) return;
    if (chip.dataset.id === card.dataset.id) {
      match.done.add(card.dataset.id);
      card.classList.add('ok');
      card.querySelector('.slot').textContent = chip.textContent;
      chip.disabled = true;
      chip.classList.add('used');
      say(chip.textContent);
    } else {
      match.misses++;
      for (const el of [chip, card]) {
        el.classList.remove('bad');
        void el.offsetWidth; // restart the shake animation
        el.classList.add('bad');
      }
    }
    clearPick();
    matchScore();
  }
  function clearPick() {
    document.querySelectorAll('.practice .picked').forEach((el) => el.classList.remove('picked'));
    if (match) match.word = match.pic = null;
  }
  function matchScore() {
    const { done, total, misses } = match;
    $('#prScore').innerHTML = done.size === total
      ? `🎉 <b>Well done!</b> All ${total} matched${misses ? ` (${misses} wrong ${misses > 1 ? 'tries' : 'try'})` : ' with no mistakes'}.`
      : `Matched <b>${done.size}</b> of ${total}${misses ? ` · ${misses} wrong ${misses > 1 ? 'tries' : 'try'}` : ''}`;
  }

  // ---------------------------------------------------------------- 2. fill in the blanks
  const blankRe = (word) => new RegExp(`(^|[^\\p{L}'])(${escRe(word).replace(/\s+/g, '\\s+')})(?=$|[^\\p{L}'])`, 'iu');

  // One sentence that contains the exact word or phrase; falls back to the definition.
  async function sentenceFor(s) {
    if (s.practice) return s.practice;
    const re = blankRe(s.input);
    let text = (s.sentences || []).find((x) => re.test(x));
    if (!text) text = (await api.findSentences(s.input, 6)).find((x) => re.test(x));
    s.practice = { text: text || null };
    return s.practice;
  }

  function lineHTML(s, p, i, w) {
    const blank = `<button class="blank" data-i="${i}" style="min-width:${w}ch"></button>`;
    if (p.text) {
      const m = p.text.match(blankRe(s.input));
      const at = m.index + m[1].length;
      return esc(p.text.slice(0, at)) + blank + esc(p.text.slice(at + m[2].length));
    }
    return `${blank} means “${esc(s.def.replace(/\.$/, ''))}”.`;
  }

  async function renderFill(list, my) {
    body.innerHTML = '<p class="pr-wait">Finding example sentences…</p>';
    const rows = await Promise.all(list.map(async (s) => ({ s, p: await sentenceFor(s) })));
    if (my !== renderId) return; // user switched mode meanwhile
    const usable = shuffle(rows.filter((r) => r.p.text || r.s.def));
    if (!usable.length) {
      body.innerHTML = '<p class="pr-wait">No sentences found for these words yet.</p>';
      return;
    }
    fill = { answers: usable.map((r) => r.s.input), active: 0 };
    // same width for every blank, so its size doesn't give the answer away
    const width = Math.max(6, ...fill.answers.map((a) => a.length + 2));
    body.innerHTML = `
      <p class="pr-help">Click a blank, then click a word to put it there. Click a filled blank to empty it. Then press <b>Check answers</b>.</p>
      <div class="bank">${shuffle(usable).map((r, k) => `<button class="wchip" data-k="${k}">${esc(r.s.input)}</button>`).join('')}</div>
      <ol class="fill">${usable.map((r, i) => `<li>${lineHTML(r.s, r.p, i, width)}</li>`).join('')}</ol>
      <p class="score" id="prScore"></p>`;
    markActive();
  }

  const blanks = () => [...body.querySelectorAll('.blank')];
  function markActive() {
    blanks().forEach((b) => b.classList.toggle('active', +b.dataset.i === fill.active));
  }
  function nextEmpty(from = 0) {
    const all = blanks();
    const empty = all.filter((b) => !b.dataset.k);
    return +((empty.find((b) => +b.dataset.i >= from) || empty[0])?.dataset.i ?? -1);
  }
  function putWord(chip) {
    let i = fill.active;
    const target = blanks()[i];
    if (!target || target.dataset.k) i = nextEmpty();
    if (i < 0) return;
    const b = blanks()[i];
    b.textContent = chip.textContent;
    b.dataset.k = chip.dataset.k;
    b.classList.remove('ok', 'bad');
    chip.disabled = true;
    chip.classList.add('used');
    fill.active = nextEmpty(i + 1);
    markActive();
    $('#prScore').textContent = '';
  }
  function emptyBlank(b) {
    const chip = body.querySelector(`.wchip[data-k="${b.dataset.k}"]`);
    if (chip) { chip.disabled = false; chip.classList.remove('used'); }
    b.textContent = '';
    delete b.dataset.k;
    b.classList.remove('ok', 'bad', 'shown');
  }
  function checkFill() {
    let right = 0;
    for (const b of blanks()) {
      const ok = b.textContent.trim().toLowerCase() === fill.answers[+b.dataset.i].toLowerCase();
      b.classList.toggle('ok', ok);
      b.classList.toggle('bad', !!b.dataset.k && !ok);
      if (ok) right++;
    }
    const n = fill.answers.length;
    $('#prScore').innerHTML = right === n ? `🎉 <b>Excellent!</b> All ${n} correct.` : `<b>${right}</b> of ${n} correct. Fix the red ones and check again.`;
  }

  // ---------------------------------------------------------------- show answers
  function showAnswers() {
    if (mode === 'match' && match) {
      body.querySelectorAll('.pcard:not(.ok)').forEach((c) => {
        c.classList.add('ok', 'shown');
        c.querySelector('.slot').textContent = c.dataset.word;
      });
      body.querySelectorAll('.wchip').forEach((c) => { c.disabled = true; c.classList.add('used'); });
      $('#prScore').textContent = 'Answers shown. Press Shuffle / restart to try again.';
    }
    if (mode === 'fill' && fill) {
      blanks().forEach((b) => {
        if (b.dataset.k) emptyBlank(b);
        b.textContent = fill.answers[+b.dataset.i];
        b.dataset.k = 'shown';
        b.classList.add('ok', 'shown');
      });
      body.querySelectorAll('.wchip').forEach((c) => { c.disabled = true; c.classList.add('used'); });
      $('#prScore').textContent = 'Answers shown. Press Shuffle / restart to try again.';
    }
  }

  // ---------------------------------------------------------------- PDF worksheet (jsPDF, loaded on demand)
  let jsPdfLoading = null;
  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
    jsPdfLoading ||= new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => res(window.jspdf.jsPDF);
      s.onerror = () => { jsPdfLoading = null; rej(new Error('Could not load the PDF tool.')); };
      document.head.append(s);
    });
    return jsPdfLoading;
  }

  // Picture → 4:3 JPEG (cropped like the on-screen cards). Both image sources allow CORS.
  async function pictureData(src) {
    // fetch + createImageBitmap rather than <img>.decode(), which can stall in a background tab
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const blob = await (await fetch(src, { signal: ctrl.signal, referrerPolicy: 'no-referrer' })).blob();
      const img = await createImageBitmap(blob);
      const c = document.createElement('canvas');
      c.width = 640; c.height = 480;
      const k = Math.max(c.width / img.width, c.height / img.height);
      const w = img.width * k, h = img.height * k;
      c.getContext('2d').drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
      img.close();
      return c.toDataURL('image/jpeg', 0.85);
    } catch { return null; } finally { clearTimeout(timer); }
  }

  // jsPDF's built-in font is Latin-1 only: normalise quotes/dashes, drop anything else (emoji…)
  const pdfText = (t) => String(t).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');

  // Shared by the PDF here and the PowerPoint in export.js: shuffled pictures + sentences with a blank.
  const BLANK = '________________';
  async function worksheetData() {
    const list = api.slides();
    const [pics, rows] = await Promise.all([
      Promise.all(shuffle(list.filter(imgOf)).map(async (s) => ({ word: s.input, data: await pictureData(imgOf(s)) }))),
      Promise.all(list.map(async (s) => ({ s, p: await sentenceFor(s) }))),
    ]);
    const fill = shuffle(rows.filter((r) => r.p.text || r.s.def)).map(({ s, p }) => {
      if (!p.text) return { answer: s.input, text: `${BLANK} means "${s.def.replace(/\.$/, '')}".` };
      const m = p.text.match(blankRe(s.input));
      const at = m.index + m[1].length;
      return { answer: s.input, text: p.text.slice(0, at) + BLANK + p.text.slice(at + m[2].length) };
    });
    return { title: api.title(), pics, fill };
  }
  window.PS_practice = { ready: () => api.slides().length > 0 && !api.building(), data: worksheetData };

  async function downloadPdf() {
    const btn = $('#prPdf');
    const list = api.slides();
    if (!list.length || api.building()) { render(); return; }
    btn.disabled = true;
    btn.textContent = '⏳ Making PDF…';
    try {
      const [JsPDF, { pics, fill: fillRows }] = await Promise.all([loadJsPdf(), worksheetData()]);
      const doc = new JsPDF({ unit: 'mm', format: 'a4' });
      const W = 210, M = 15, CW = W - 2 * M, BOTTOM = 282;
      const ink = [29, 35, 80], grey = [110, 112, 128], line = [170, 172, 185];
      let y = M;
      const ensure = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };
      // keep: room needed for the heading plus what follows it (word box, first row), so it's never stranded
      const heading = (text, sub, keep = 24) => {
        ensure(keep);
        doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...ink).text(pdfText(text), M, y + 5);
        y += 9;
        if (sub) { doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...grey).text(pdfText(sub), M, y + 2); y += 7; }
      };
      const wordBox = (words) => {
        doc.setFont('helvetica', 'bold').setFontSize(12);
        const lines = doc.splitTextToSize(words.map(pdfText).join('     '), CW - 10);
        const h = lines.length * 6 + 7;
        ensure(h + 4);
        doc.setDrawColor(...line).setLineDashPattern([1.5, 1.2], 0).roundedRect(M, y, CW, h, 3, 3);
        doc.setLineDashPattern([], 0).setTextColor(...ink).text(lines, M + 5, y + 7.5);
        y += h + 6;
      };

      // Title block
      const title = api.title() || 'Vocabulary practice';
      doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...ink).text(pdfText(title), M, y + 7);
      doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(...grey)
        .text('Name: ______________________________      Date: ________________', M, y + 16);
      y += 26;

      // Part A — match the pictures
      if (pics.length) {
        heading('Part A - Match the pictures', 'Write the correct word from the box under each picture.', 95);
        wordBox(shuffle(pics.map((x) => x.word)));
        const cols = 3, gap = 6, cw = (CW - gap * (cols - 1)) / cols, ih = cw * 0.75, rowH = ih + 15;
        pics.forEach((x, i) => {
          const col = i % cols;
          if (col === 0) { if (i) y += rowH; ensure(rowH); }
          const px = M + col * (cw + gap);
          if (x.data) doc.addImage(x.data, 'JPEG', px, y, cw, ih);
          else {
            doc.setFillColor(238, 239, 244).rect(px, y, cw, ih, 'F');
            doc.setFontSize(9).setTextColor(...grey).text('(picture unavailable)', px + cw / 2, y + ih / 2, { align: 'center' });
          }
          doc.setDrawColor(...line).rect(px, y, cw, ih);
          doc.setFillColor(255, 255, 255).circle(px + 5, y + 5, 3.4, 'F');
          doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...ink).text(String(i + 1), px + 5, y + 6.3, { align: 'center' });
          doc.setDrawColor(90, 92, 105).line(px + 2, y + ih + 10, px + cw - 2, y + ih + 10);
        });
        y += rowH + 4;
      }

      // Part B — fill in the blanks
      if (fillRows.length) {
        heading('Part B - Fill in the blanks', 'Choose a word or phrase from the box to complete each sentence.', 60);
        wordBox(shuffle(fillRows.map((r) => r.answer)));
        doc.setFont('helvetica', 'normal').setFontSize(12).setTextColor(...ink);
        fillRows.forEach((r, i) => {
          const lines = doc.splitTextToSize(pdfText(r.text), CW - 9);
          ensure(lines.length * 6 + 6);
          doc.setFont('helvetica', 'bold').text(`${i + 1}.`, M, y + 5);
          doc.setFont('helvetica', 'normal').text(lines, M + 8, y + 5, { lineHeightFactor: 1.4 });
          y += lines.length * 6.7 + 5;
        });
      }

      // Answer key on its own page
      doc.addPage(); y = M;
      heading('Answer key (for teachers)');
      doc.setFontSize(11).setTextColor(...ink);
      const key = (label, items) => {
        if (!items.length) return;
        ensure(10);
        doc.setFont('helvetica', 'bold').text(label, M, y + 5); y += 8;
        doc.setFont('helvetica', 'normal');
        items.forEach((w, i) => { ensure(7); doc.text(`${i + 1}.  ${pdfText(w)}`, M + 4, y + 5); y += 6.5; });
        y += 4;
      };
      key('Part A - Match the pictures', pics.map((x) => x.word));
      key('Part B - Fill in the blanks', fillRows.map((r) => r.answer));

      // Footer
      const n = doc.getNumberOfPages();
      for (let p = 1; p <= n; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...grey)
          .text(`ProSlide  -  page ${p} of ${n}`, W / 2, 290, { align: 'center' });
      }
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vocabulary';
      doc.save(`${slug}-practice.pdf`);
    } catch (err) {
      alert(`Sorry, the PDF could not be made. ${err.message || ''}`);
    } finally {
      btn.disabled = false;
      btn.textContent = '⬇ PDF';
    }
  }

  // ---------------------------------------------------------------- events
  body.addEventListener('click', async (e) => {
    if (e.target.closest('#prMake')) {
      body.innerHTML = '<p class="pr-wait">Getting pictures and sentences…</p>';
      await api.generate();
      render();
      return;
    }
    const chip = e.target.closest('.wchip');
    const card = e.target.closest('.pcard');
    const blank = e.target.closest('.blank');
    if (mode === 'match') {
      if (chip && !chip.disabled) {
        if (match.pic) return tryMatch(chip, match.pic);
        const was = chip.classList.contains('picked');
        clearPick();
        if (!was) { chip.classList.add('picked'); match.word = chip; }
      } else if (card && !card.classList.contains('ok')) {
        if (match.word) return tryMatch(match.word, card);
        clearPick();
        card.classList.add('picked');
        match.pic = card;
      }
    } else if (fill) {
      if (blank) {
        if (blank.dataset.k && blank.dataset.k !== 'shown') emptyBlank(blank);
        fill.active = +blank.dataset.i;
        markActive();
      } else if (chip && !chip.disabled) {
        putWord(chip);
      }
    }
  });
  body.addEventListener('dragstart', (e) => {
    const chip = e.target.closest('.wchip');
    if (chip) e.dataTransfer.setData('text/plain', chip.dataset.id);
  });
  body.addEventListener('dragover', (e) => { if (e.target.closest('.pcard:not(.ok)')) e.preventDefault(); });
  body.addEventListener('drop', (e) => {
    const card = e.target.closest('.pcard');
    if (!card) return;
    e.preventDefault();
    tryMatch(body.querySelector(`.wchip[data-id="${e.dataTransfer.getData('text/plain')}"]`), card);
  });

  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; render(); }));
  $('#prCheck').addEventListener('click', () => fill && checkFill());
  $('#prShow').addEventListener('click', showAnswers);
  $('#prNew').addEventListener('click', render);
  $('#prPdf').addEventListener('click', downloadPdf);

  window.addEventListener('ps:view', (e) => { if (e.detail === 'practice') render(); });
  if (active()) render();
})();
