#!/usr/bin/env bash
# Verifies Google Play's 16 KB page-size requirement for an APK:
#  1. every arm64-v8a / x86_64 native library has ELF LOAD segments aligned to >= 16 KB;
#  2. uncompressed .so entries are 16 KB zip-aligned (zipalign -c -P 16).
# Usage: scripts/check-16kb-alignment.sh path/to/app.apk
set -euo pipefail
APK="$1"
BT="${ANDROID_HOME:-/opt/android-sdk}/build-tools/$(ls "${ANDROID_HOME:-/opt/android-sdk}/build-tools" | sort -V | tail -1)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q "$APK" 'lib/*' -d "$TMP" || { echo "No native libraries in $APK"; exit 0; }
fail=0; count=0
for so in $(find "$TMP/lib" -name '*.so' \( -path '*arm64-v8a*' -o -path '*x86_64*' \)); do
  count=$((count+1))
  # Minimum alignment over all LOAD segments.
  min=$(readelf -lW "$so" | awk '/LOAD/ {print $NF}' | sort -u | while read a; do printf '%d\n' "$a"; done | sort -n | head -1)
  if [ "${min:-0}" -lt 16384 ]; then echo "✘ $(basename "$(dirname "$so")")/$(basename "$so") LOAD align=$min"; fail=1; fi
done
echo "Checked $count native libraries for 16 KB ELF alignment."
if "$BT/zipalign" -c -P 16 -v 4 "$APK" > "$TMP/zipalign.txt" 2>&1; then echo "✔ zipalign -P 16 verification succeeded"; else tail -5 "$TMP/zipalign.txt"; fail=1; fi
[ "$fail" = 0 ] && echo "✔ 16 KB page-size compatible" || { echo "✘ 16 KB page-size check FAILED"; exit 1; }
