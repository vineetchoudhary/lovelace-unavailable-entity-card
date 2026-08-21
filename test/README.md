# Tests

Browser test suite for `unavailable-entity-card.js`. No build step, no dependencies.

`index.html` loads `../unavailable-entity-card.js` directly, so it always exercises the real card file rather than a copy.


## What the page shows

**Assertions** — a pass/fail list, grouped by area, with a "show failures only" filter.

**Rendered output** — live cards in Home Assistant's light and dark theme variables, covering the populated, collapsed and empty states.

**Hover bounce** — Cursor hover testing.


## Regenerating the README screenshot

`preview.html` renders the card in Home Assistant's light and dark theme variables, side by side, with no test chrome around it. It is the source for
`screenshots/screenshot-light-dark.png`.

```bash
./test/capture-preview.sh
```

That renders the page in headless Chrome/Edge at 2x and writes the PNG. Pass a width and height to change the framing — `./test/capture-preview.sh 1000 455`. 
