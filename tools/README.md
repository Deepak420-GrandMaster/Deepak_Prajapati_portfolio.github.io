# tools

## story (the scroll-driven walk)

The home page is a walk through six chapters, from Vadodara to Nice: a small
procedural figure walks along a road in a low-poly 3D world as the page scrolls,
and the light moves through one day (dawn to night). Everything is generated in
code; the walk loads no models, textures or images.

Sources live in `tools/story/`:

- `site.js` — page behaviour (chapter cards, chapter map, caption, reveals,
  timeline). It loads the 3D walk only when WebGL is available and reduced
  motion is off; otherwise the story reads as plain chapters.
- `walk.js` — renderer, sky, light for each time of day, camera and scroll logic.
- `scenes.js` — the six sets (Vadodara, the market, Numerator, IIT Ropar,
  Montpellier, Nice).
- `person.js` — the walking figure, his outfits, walk cycle and wave.
- `kit.js` — shared materials and primitives.

The page loads the bundled output in `assets/js/story/`. After editing anything in
`tools/story/`, rebuild from the repository root:

```bash
./tools/story/build.sh
```

It runs esbuild with `three` resolved to `vendor/three.module.js` (r185) and
writes `site.js` plus one hashed `walk-*.js` chunk. Commit the rebuilt files.

The page has no inline scripts or styles, so the Content-Security-Policy in
`index.html` needs no hashes.

## Fonts

`assets/fonts/` holds Fraunces and Public Sans (latin subsets), both under the
SIL Open Font License; the licence texts sit next to the files.
