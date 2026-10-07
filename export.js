// Practice → PowerPoint download. PptxGenJS loads from a public CDN only when the button is clicked.
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const api = window.PS_api;

  // ---------------------------------------------------------------- library
  let loading = null;
  function loadPptx() {
    if (window.PptxGenJS) return Promise.resolve(window.PptxGenJS);
    loading ||= new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';
      s.onload = () => res(window.PptxGenJS);
      s.onerror = () => { loading = null; rej(new Error('The PowerPoint tool could not load. Please check the internet connection.')); };
      document.head.append(s);
    });
    return loading;
  }

  // ---------------------------------------------------------------- helpers
  function progress(msg, frac = 0) {
    $('#exporting').hidden = false;
    $('#expMsg').textContent = msg;
    $('#expFill').style.width = `${Math.round(frac * 100)}%`;
  }
  const slug = (t, fallback) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;

  // Any CSS colour (hsl(), #hex…) → "RRGGBB" for PowerPoint
  const cctx = document.createElement('canvas').getContext('2d');
  function hex(color) {
    cctx.fillStyle = '#000';
    cctx.fillStyle = color;
    const v = cctx.fillStyle;
    if (v.startsWith('#')) return v.slice(1).toUpperCase();
    const [r, g, b] = v.match(/\d+/g).map(Number);
    return [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // PptxGenJS wants "image/png;base64,…" without the "data:" prefix
  const pptxData = (url) => url.replace(/^data:/, '');

  async function run(btn, label, job) {
    if (api.building()) { alert('Please wait until all slides have finished loading.'); return; }
    btn.disabled = true;
    try { await job(); } catch (err) {
      console.error(err);
      alert(`Sorry, the ${label} could not be made. ${err.message || ''}`);
    } finally {
      btn.disabled = false;
      $('#exporting').hidden = true;
    }
  }

  // ---------------------------------------------------------------- practice → PowerPoint (for the classroom screen)
  async function practicePptx() {
    if (!window.PS_practice?.ready()) return;
    progress('Getting pictures and sentences…');
    const [Pptx, d] = await Promise.all([loadPptx(), window.PS_practice.data()]);
    const t = api.theme();
    const C = { c1: hex(t.c1), c2: hex(t.c2), c3: hex(t.c3), ink: hex(t.ink) };
    const FONT = 'Calibri';
    const pptx = new Pptx();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = `${d.title || 'Vocabulary'} practice`;
    progress('Building slides…', 0.5);

    const page = (title, sub) => {
      const sl = pptx.addSlide();
      sl.background = { color: 'FFFFFF' };
      sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.18, fill: { color: C.c1 } });
      sl.addText(title, { x: 0.6, y: 0.35, w: 12.1, h: 0.6, fontFace: FONT, fontSize: 30, bold: true, color: C.c1, margin: 0 });
      if (sub) sl.addText(sub, { x: 0.6, y: 0.95, w: 12.1, h: 0.4, fontFace: FONT, fontSize: 16, color: '6E7080', margin: 0 });
      return sl;
    };
    const bank = (sl, words) => sl.addText(words.join('      '), {
      x: 0.6, y: 1.45, w: 12.1, h: 0.6, shape: pptx.ShapeType.roundRect, rectRadius: 0.12,
      fill: { color: 'F4F5FA' }, line: { color: C.c3, width: 1.5, dashType: 'dash' },
      fontFace: FONT, fontSize: 20, bold: true, color: C.ink, align: 'center', valign: 'middle',
    });
    const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

    // Cover
    const cover = pptx.addSlide();
    cover.background = { color: C.c1 };
    cover.addText(d.title || 'Vocabulary practice', { x: 0.8, y: 2.3, w: 11.7, h: 1.4, fontFace: FONT, fontSize: 54, bold: true, color: 'FFFFFF' });
    cover.addText('Practice: match the pictures · fill in the blanks', { x: 0.8, y: 3.7, w: 11.7, h: 0.6, fontFace: FONT, fontSize: 22, color: 'FFFFFF' });

    // Part A: up to 6 pictures per slide; numbering continues across slides
    const bankA = [...d.pics.map((p) => p.word)].sort(() => Math.random() - 0.5);
    chunks(d.pics, 6).forEach((group, gi) => {
      const sl = page('Part A · Match the pictures', 'Which word goes with each picture?');
      bank(sl, bankA);
      group.forEach((p, k) => {
        const col = k % 3, row = Math.floor(k / 3);
        const x = 0.6 + col * 4.1, y = 2.3 + row * 2.6, w = 2.8, h = 2.1;
        if (p.data) sl.addImage({ data: pptxData(p.data), x: x + 0.65, y, w, h });
        else sl.addText('(picture unavailable)', { x: x + 0.65, y, w, h, shape: pptx.ShapeType.rect, fill: { color: 'EEEEF4' }, fontSize: 12, color: '888888', align: 'center' });
        sl.addText(String(gi * 6 + k + 1), { x: x + 0.75, y: y + 0.1, w: 0.45, h: 0.45, shape: pptx.ShapeType.ellipse, fill: { color: 'FFFFFF' }, fontFace: FONT, fontSize: 16, bold: true, color: C.ink, align: 'center', valign: 'middle', margin: 0 });
        sl.addShape(pptx.ShapeType.line, { x: x + 0.65, y: y + h + 0.32, w, h: 0, line: { color: '999999', width: 1.5 } });
      });
    });

    // Part B: up to 4 sentences per slide
    const bankB = [...d.fill.map((f) => f.answer)].sort(() => Math.random() - 0.5);
    chunks(d.fill, 4).forEach((group, gi) => {
      const sl = page('Part B · Fill in the blanks', 'Choose a word from the box to complete each sentence.');
      bank(sl, bankB);
      group.forEach((f, k) => {
        sl.addText([
          { text: `${gi * 4 + k + 1}.  `, options: { bold: true, color: C.c1 } },
          { text: f.text, options: { color: C.ink } },
        ], { x: 0.6, y: 2.35 + k * 1.2, w: 12.1, h: 1.05, fontFace: FONT, fontSize: 26, valign: 'middle', margin: 0 });
      });
    });

    // Answer key
    const key = page('Answer key', 'For the teacher');
    key.addText([
      { text: 'Part A · Match the pictures', options: { bold: true, color: C.c1, breakLine: true } },
      ...d.pics.map((p, i) => ({ text: `${i + 1}.  ${p.word}`, options: { color: C.ink, breakLine: true } })),
    ], { x: 0.6, y: 1.5, w: 5.9, h: 5.6, fontFace: FONT, fontSize: 18, valign: 'top', margin: 0 });
    key.addText([
      { text: 'Part B · Fill in the blanks', options: { bold: true, color: C.c1, breakLine: true } },
      ...d.fill.map((f, i) => ({ text: `${i + 1}.  ${f.answer}`, options: { color: C.ink, breakLine: true } })),
    ], { x: 6.8, y: 1.5, w: 5.9, h: 5.6, fontFace: FONT, fontSize: 18, valign: 'top', margin: 0 });

    progress('Downloading…', 1);
    await pptx.writeFile({ fileName: `${slug(d.title, 'vocabulary')}-practice.pptx` });
  }

  // ---------------------------------------------------------------- buttons
  $('#prPptx').addEventListener('click', (e) => {
    if (!window.PS_practice?.ready()) return;
    run(e.currentTarget, 'PowerPoint', practicePptx);
  });
})();
