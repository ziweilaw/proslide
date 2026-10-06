# ProSlide

Concise, visual vocabulary slides for English teachers, themed to the book you're teaching.

1. **Book theme**: upload (or paste or drop) a screenshot of the book cover. ProSlide takes its colours for the slides and adds a decorative rim (dots, stars, leaves, waves, bunting, books) plus a small cover badge.
2. **Word breakdowns**: type new words and phrases. Each slide gets a real picture and a short English definition.
   - Words that split: `hanger = hang + er`, a one-line meaning of the word part, and 3 example words (e.g. screwdriver = screw + drive + er).
   - Words that don't split (corner, carpet): 2 short example sentences with the word highlighted.
3. **One word or phrase per slide**, in the order you typed them, with an optional title slide.
4. **Present** full screen (arrow keys / click), or **Save as PDF** (one slide per page).

On each slide you can swap the picture, upload your own, fix the breakdown (✎), or edit the definition and sentences by clicking on them.

## Free services used (no keys, no backend)

| What | Service |
|---|---|
| Definitions, parts of speech, word-split checks | [Datamuse](https://www.datamuse.com/api/) |
| Example sentences | [Tatoeba](https://tatoeba.org), then [Wiktionary](https://en.wiktionary.org) |
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
