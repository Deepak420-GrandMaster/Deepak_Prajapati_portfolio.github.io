# tools

## csp-rehash.py

The page pins every inline `<script>` in its Content-Security-Policy by
SHA-256 hash, so `script-src` does not need `'unsafe-inline'`.

**Any edit to an inline script changes its hash. If the CSP is not updated,
the browser blocks every script and the page renders blank.** Run this after
touching any inline script:

```bash
python3 tools/csp-rehash.py
```

Two things it gets right that are easy to get wrong by hand:

- The hash is taken over **LF-normalised** content. `index.html` uses CRLF
  line endings, and the HTML parser converts them before hashing, so hashing
  the raw bytes produces wrong hashes and a blank page.
- Only `<script>` elements **without** a `src` attribute are hashed.

`style-src` still needs `'unsafe-inline'`: the markup uses `style="--d:N"`
attributes, which hashes cannot cover.

## three-fx (Three.js bundle)

The page loads one slim Three.js bundle, `assets/js/three-fx.js` (~135 KB
gzipped), instead of the full library (~415 KB gzipped). It holds the classes
the hero field uses plus the intro tunnel and the light cables. The source is
`tools/three-fx/entry.js`; after editing it, rebuild with:

```bash
npx esbuild tools/three-fx/entry.js --bundle --minify --format=esm \
  --target=es2020 --legal-comments=none \
  --alias:three=./vendor/three.module.js --outfile=assets/js/three-fx.js
```

`vendor/three.module.js` and `vendor/three.core.js` are only the build input;
the page no longer loads them. If you change the inline module script, run
`python3 tools/csp-rehash.py` as described above.

## boot.js and fx.js

`assets/js/boot.js` is a tiny blocking script that decides, before first
paint, whether this visit gets the tunnel intro (once per session, capable
devices, no reduced-motion). `assets/js/fx.js` runs the tunnel, the scroll
scrubs, the pointer effects and the cables. Both are same-origin files, so the
CSP needs no extra hashes for them.

## qlab.js (Quantum Lab game)

`assets/js/qlab.js` is the puzzle game behind the circuit card in Contact:
three qubits, H / X / CNOT gates, 100 simulated measurements, four levels,
stars saved in `localStorage` (`dp-qlab`). The simulation is a real statevector.
It is a separate same-origin file, so the CSP needs no extra hash.

## Language

The site opens in the first supported language it finds, in this order:
`?lang=fr|en` in the link, the visitor's own earlier choice (`dp-lang`), the
browser's language list (`navigator.languages`), then English. Only a click on
the EN / FR switch is remembered; an auto-detected language keeps following the
browser. French strings live in the `FR` map in the inline i18n script.
