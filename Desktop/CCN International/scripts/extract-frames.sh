#!/usr/bin/env bash
set -euo pipefail
mkdir -p public/frames
ffmpeg -y -i hf_20260414_033833_b1f5b1e6-bb62-4748-8bb6-801fa930ac0f.mp4 \
  -vf "select='not(mod(n\,3))',scale=1280:720" -vsync vfr \
  -c:v libwebp -q:v 78 -compression_level 4 \
  public/frames/frame-%04d.webp
