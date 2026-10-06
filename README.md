# ProSlide

Concise, visual vocabulary slides for English teachers, themed to the book you're teaching.

1. **Book theme**: upload (or paste or drop) a screenshot of the book cover. ProSlide takes its colours for the slides and adds a decorative rim (dots, stars, leaves, waves, bunting, books) plus a small cover badge.
2. **Word breakdowns**: type new words and phrases. Each slide gets a real picture and a short English definition.
   - Words that split: `hanger = hang + er`, a one-line meaning of the word part, and 3 example words (e.g. screwdriver = screw + drive + er).
   - Words that don't split (corner, carpet): 2 short example sentences with the word highlighted.
3. **One word or phrase per slide**, in the order you typed them, with an optional title slide.
4. **Present** full screen (arrow keys / click), or **Save as PDF** (one slide per page).

On each slide you can swap the picture, upload your own, fix the breakdown (✎), or edit the definition and sentences by clicking on them. Click 🔊, the big word, or an example word to hear it.

**Read aloud tab**: paste a paragraph or a word list in English and press *Read aloud*. Each sentence is highlighted as it's read, and so is the current word when the voice supports it. Choose an English voice, speed (0.5×–1.5×) and text size for the projector. Click any sentence to jump there, and press Space to pause. It uses the browser's built-in voices, so it's free and needs no key (works in Chrome, Edge and Safari).

**Practice tab**: two activities built from the same word list:
- *Match pictures*: students click a word, then its picture (or drag the word onto it). Right answers turn green and the word is read aloud; wrong ones shake.
- *Fill in the blanks*: real example sentences with the word blanked out and a word bank. Students fill the blanks, then press *Check answers*. Words with no sentence fall back to "____ means ‘definition’".

Both have *Show answers* and *Shuffle / restart*. **Download PDF** makes a printable worksheet with both activities (Part A pictures, Part B sentences), Name/Date lines and an answer key on the last page.

## Free services used (no keys, no backend)

| What | Service |
|---|---|
| Definitions, parts of speech, word-split checks | [Datamuse](https://www.datamuse.com/api/) |
| Example sentences | [Tatoeba](https://tatoeba.org), then [Wiktionary](https://en.wiktionary.org) |
| Read aloud | The browser's built-in speech (Web Speech API) |
| Pictures (openly licensed, credited on the slide) | [Openverse](https://openverse.org) + [Wikimedia Commons](https://commons.wikimedia.org) |

Google Images has no free, keyless API, so ProSlide uses these openly licensed sources instead.

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Publish free on GitHub Pages

1. Create a repo (e.g. `proslide`) and push these files to the `main` branch.
2. On GitHub, go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, then select `main` and `/ (root)`.
3. The site goes live at `https://<your-username>.github.io/proslide/`.
