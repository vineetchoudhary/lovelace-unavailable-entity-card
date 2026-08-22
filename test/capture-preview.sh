#!/usr/bin/env bash
# Renders test/preview.html to screenshots/screenshot-light-dark.png at 2x.
#
# Usage:  ./test/capture-preview.sh  [width] [height] [--case=NAME]
#
# --case picks a scenario from preview.html. The default case writes the README
# hero; any other case writes screenshots/screenshot-<name>.png.
#
# Chromium exits on its own after --screenshot only sometimes, so this backgrounds
# it and kills the leftover process once the file has been written.

set -uo pipefail

WIDTH=""
HEIGHT=""
CASE="default"

for arg in "$@"; do
  case "$arg" in
    --case=*) CASE="${arg#--case=}" ;;
    *[!0-9]*) echo "Unrecognised argument: $arg" >&2; exit 2 ;;
    *) if [ -z "$WIDTH" ]; then WIDTH="$arg"; else HEIGHT="$arg"; fi ;;
  esac
done

WIDTH="${WIDTH:-1000}"
HEIGHT="${HEIGHT:-455}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ "$CASE" = "default" ]; then
  OUT="$ROOT/screenshots/screenshot-light-dark.png"
  PAGE="file://$ROOT/test/preview.html"
else
  OUT="$ROOT/screenshots/screenshot-$CASE.png"
  PAGE="file://$ROOT/test/preview.html?case=$CASE"
fi

BROWSER=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"
do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then BROWSER="$candidate"; break; fi
done

if [ -z "$BROWSER" ]; then
  echo "No Chromium-based browser found." >&2
  exit 1
fi

PROFILE="$(mktemp -d)"
rm -f "$OUT"

"$BROWSER" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --no-first-run \
  --force-device-scale-factor=2 \
  --window-size="$WIDTH,$HEIGHT" \
  --virtual-time-budget=4000 \
  --user-data-dir="$PROFILE" \
  --screenshot="$OUT" \
  "$PAGE" >/dev/null 2>&1 &
PID=$!

for _ in $(seq 1 30); do
  sleep 1
  [ -s "$OUT" ] && break
done

kill "$PID" 2>/dev/null
wait "$PID" 2>/dev/null
rm -rf "$PROFILE"

if [ ! -s "$OUT" ]; then
  echo "Capture failed: $OUT was not written." >&2
  exit 1
fi

echo "Wrote $OUT ($(sips -g pixelWidth -g pixelHeight "$OUT" 2>/dev/null | tail -2 | tr -d ' \n' || echo "size unknown"))"
