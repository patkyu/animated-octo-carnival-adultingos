# 14-day countdown video (30 s, 1080×1920, 30 fps)

Output: `../adultingos-14-days-countdown.mp4` (H.264 + AAC, −14 LUFS) and `../adultingos-14-days-countdown-cover.jpg`.

Everything is original and license-free:
- **Visuals**: brand SVG mascots/logo from `assets/`, real app screenshots from `store/screenshots/raw/`, animated frame-by-frame in Chromium (`build-html.cjs` → `anim.html`, `render.cjs`).
- **Voice-over**: Kokoro TTS (Apache-2.0), 50/50 blend of `af_heart` + `am_puck` for a gender-neutral voice (`vo.py`). Model files: github.com/thewh1teagle/kokoro-onnx releases `model-files-v1.0` → `models/`.
- **Music & SFX**: synthesised in numpy (ukulele = Karplus-Strong, marimba, piano, chimes, light percussion, riser) with voice ducking (`audio.py`).
- Timing of scenes, SFX and voice lines: `timeline.json`.

## Rebuild
Work in a scratch folder containing these files plus `models/`:
```bash
python3 -m venv venv && ./venv/bin/pip install kokoro-onnx soundfile
```
```bash
./venv/bin/python vo.py && ./venv/bin/python audio.py && node build-html.cjs && node render.cjs
```
```bash
ffmpeg -framerate 30 -i frames/%04d.jpg -i mix.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -shortest adultingos-14-days-countdown.mp4
```
To reuse for "7 days" etc.: change the number/text in `build-html.cjs` and the line in `vo.py`.
