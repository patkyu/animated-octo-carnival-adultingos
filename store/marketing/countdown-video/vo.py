import json, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro('models/kokoro-v1.0.onnx', 'models/voices-v1.0.bin')
# Gender-neutral blend of a warm female and a bright young male voice.
voice = 0.5 * k.get_voice_style('af_heart') + 0.5 * k.get_voice_style('am_puck')
lines = [
  "Bills, deadlines, paperwork... adulting can be a lot.",
  "But what if you didn't have to figure it all out alone?",
  "Meet AdultingOS, and your new adulting buddies.",
  "A little more organized. A little less overwhelmed.",
  "And we're just getting started.",
  "Only fourteen days until our Google Play launch!",
  "See you soon!",
]
out = []
for i, t in enumerate(lines):
    a, sr = k.create(t, voice=voice, speed=1.08, lang='en-us')
    # trim silence
    idx = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, idx[0]-600): idx[-1]+1500]
    sf.write(f'vo_{i}.wav', a, sr)
    out.append({'i': i, 'text': t, 'dur': round(len(a)/sr, 2), 'sr': sr})
json.dump(out, open('vo.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
