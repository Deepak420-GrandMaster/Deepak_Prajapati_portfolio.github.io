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
