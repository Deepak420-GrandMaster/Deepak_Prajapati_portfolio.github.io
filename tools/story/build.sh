#!/usr/bin/env bash
# Bundle the story scripts into assets/js/story/. Run from the repository root after editing tools/story/.
set -euo pipefail
rm -rf assets/js/story
npx --yes esbuild@0.24.0 tools/story/site.js --bundle --splitting --minify --format=esm \
  --target=es2020 --legal-comments=none --alias:three=./vendor/three.module.js \
  --chunk-names=[name]-[hash] --outdir=assets/js/story
