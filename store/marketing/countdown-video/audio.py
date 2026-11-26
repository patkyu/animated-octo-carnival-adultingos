"""Original score + SFX + voice-over mix for the 14-day countdown video (30 s, 48 kHz stereo).
Everything is synthesised here (no samples), so the music is original and license-free."""
import json, numpy as np, soundfile as sf
SR = 48000; DUR = 30.0; N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)
T = json.load(open('timeline.json'))

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.414
    R[i:j] += s * np.sqrt((1 + pan) / 2) * 1.414

def env(n, a=0.005, d=1.0):
    t = np.arange(n) / SR
    e = np.exp(-t * d)
    at = int(a * SR)
    if at > 0: e[:at] *= np.linspace(0, 1, at)
    return e

def lowpass(x, k=8):
    return np.convolve(x, np.ones(k) / k, mode='same')

def mix(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o

def hz(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)

# --- instruments ---
def uke(f, dur=1.2):
    n = int(dur * SR); p = int(SR / f)
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):  # Karplus-Strong
        out[i] = buf[i % p]
        buf[i % p] = 0.5 * (buf[i % p] + buf[(i + 1) % p]) * 0.996
    return lowpass(out, 3) * env(n, 0.002, 2.2)

UKE = {}
def uke_note(m, dur=1.0):
    key = (m, dur)
    if key not in UKE: UKE[key] = uke(hz(m), dur)
    return UKE[key]

def marimba(f, dur=0.6):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30) + 0.12 * np.sin(2 * np.pi * 10 * f * t) * np.exp(-t * 60)
    return s * env(n, 0.002, 0)

def piano(f, dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.2 + k)) for k, a in [(1, 1), (2, .45), (3, .2), (4, .1)])
    return s * env(n, 0.004, 0)

def bell(f, dur=2.0, decay=2.5):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * decay * k ** 0.5) for k, a in [(1, 1), (2.76, .4), (5.4, .2), (8.9, .08)])
    return s * env(n, 0.001, 0)

def kick(dur=0.35, f0=130, f1=48):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def noise_burst(dur, decay, hp=True, k=4):
    n = int(dur * SR); x = rng.uniform(-1, 1, n)
    if hp: x = x - lowpass(x, k)
    return x * np.exp(-np.arange(n) / SR * decay)

def clap(): return noise_burst(0.18, 28, True, 6) * 0.6
def shaker(): return noise_burst(0.06, 70, True, 2) * 0.25

# --- music ---
BPM = 120; BEAT = 60 / BPM; BAR = 4 * BEAT
CH = {'C': [60, 64, 67, 72], 'G': [55, 62, 67, 71], 'Am': [57, 64, 69, 72], 'F': [53, 60, 65, 69], 'Dm': [50, 57, 62, 65], 'Em': [52, 59, 64, 67]}
prog = ['C', 'G', 'Am', 'F']
music_L = np.zeros(N); music_R = np.zeros(N)
def madd(sig, t, g=1.0, pan=0.0):
    global L, R
    sL, sR = L, R
    L, R = music_L, music_R
    add(sig, t, g, pan)
    L, R = sL, sR

# Intro 0-4: hesitant piano (Am, F) + soft ticks handled in SFX
for b, c in enumerate(['Am', 'F']):
    for k, m in enumerate(CH[c][:3]):
        madd(piano(hz(m), 2.0), b * BAR + k * 0.18, 0.18, -0.2 + 0.2 * k)
# Main groove from 4.0 (bars start at 4.0)
melody = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 76, 74, 72, 69, 67]  # eighth notes over two bars
strum = [0, 1, 1.5, 2, 3, 3.5]
for bar in range(2, 15):
    t0 = bar * BAR
    c = prog[(bar - 2) % 4]
    big = t0 >= 15.0
    if t0 < 22.0 or bar <= 13:
        # ukulele strums
        if bar >= 2:
            for s in strum:
                for k, m in enumerate(CH[c]):
                    madd(uke_note(m + 12 if m < 60 else m, 0.9), t0 + s * BEAT + k * 0.012, 0.16 if bar < 4 else 0.2, -0.3)
        # marimba melody from 9 s (bar >= 4.5)
        if t0 >= 8.0:
            seg = melody[(bar % 2) * 8:(bar % 2) * 8 + 8]
            for i, m in enumerate(seg):
                if i % 2 == 1 and not big and rng.random() < 0.3: continue
                madd(marimba(hz(m), 0.5), t0 + i * BEAT / 2, 0.22 if big else 0.17, 0.35)
        # bass (piano low)
        madd(piano(hz(CH[c][0] - 12), 1.8), t0, 0.32 if big else 0.24, 0)
        madd(piano(hz(CH[c][0] - 12), 1.0), t0 + 2 * BEAT, 0.2, 0)
        # percussion from 9 s, bigger after 15 s
        if t0 >= 8.0:
            for q in range(8):
                madd(shaker(), t0 + q * BEAT / 2, 0.8 if q % 2 else 0.5, 0.5)
            for q in (0, 2):
                madd(kick(), t0 + q * BEAT, 0.45 if big else 0.3, 0)
            for q in (1, 3):
                madd(clap(), t0 + q * BEAT, 0.35 if big else 0.22, -0.1)
        # sparkly glockenspiel over the reveal
        if big:
            for i, m in enumerate([84, 88, 91, 96]):
                madd(bell(hz(m), 1.2, 4), t0 + i * BEAT, 0.07, 0.6 - 0.4 * i)
# Outro 22-30: gentle C - F - G - C cadence on piano + uke, ending chord
for i, c in enumerate(['C', 'F', 'G', 'C']):
    t0 = 22.0 + i * 2.0
    for k, m in enumerate(CH[c]):
        madd(piano(hz(m), 3.0 if i == 3 else 2.2), t0 + k * 0.05, 0.16, -0.3 + 0.2 * k)
        madd(uke_note(m, 1.2), t0 + k * 0.015, 0.14, 0.3)
        madd(uke_note(m, 1.2), t0 + 1.0 + k * 0.015, 0.1, 0.3)
    madd(piano(hz(CH[c][0] - 12), 2.4), t0, 0.26, 0)
for k, m in enumerate([72, 76, 79, 84]):
    madd(bell(hz(m), 3.0, 1.6), 28.0 + k * 0.09, 0.08, -0.4 + 0.25 * k)

# Riser into the reveal (14.0 -> 15.6)
n = int(1.6 * SR); t = np.arange(n) / SR
riser = rng.uniform(-1, 1, n); riser = riser - lowpass(riser, 3)
riser *= (t / t[-1]) ** 2.2 * 0.35
sweep = np.sin(2 * np.pi * np.cumsum(300 + 1200 * (t / t[-1]) ** 2) / SR) * (t / t[-1]) ** 2 * 0.12
madd(mix(riser, sweep), T['reveal_land'] - 1.6, 1.0, 0)

# --- SFX ---
def ping(f=1320): return mix(bell(f, 0.5, 9) * 0.5, bell(f * 1.5, 0.5, 11) * 0.3)
def tick(hi=True):
    s = noise_burst(0.03, 200, True, 2)
    return s * (0.5 if hi else 0.35)
def whoosh(dur=0.7, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.uniform(-1, 1, n); x = lowpass(x, 6) - lowpass(x, 40)
    e = np.sin(np.pi * t / dur) ** 2
    return x * e * 0.9
def boing(f0=300, f1=700, dur=0.25):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur) ** 0.6
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * 0.5
def coin(): return mix(bell(1976, 0.6, 7) * 0.5, bell(2637, 0.6, 7) * 0.4)
def pop(): return mix(boing(500, 1000, 0.12) * 0.8, noise_burst(0.05, 80) * 0.3)
def alarm(dur=0.6):
    out = np.zeros(int(dur * SR))
    for i in range(int(dur / 0.045)):
        b = bell(2400 if i % 2 else 2900, 0.08, 40) * 0.25
        j = int(i * 0.045 * SR); out[j:j + len(b)] += b[: len(out) - j]
    return out
def sparkle(n=6, t0=0):
    for i in range(n):
        add(bell(hz(96 + [0, 4, 7, 12, 16, 19][i % 6]), 0.8, 6) * 0.25, t0 + i * 0.06, 0.6, -0.6 + 0.24 * i)
def confetti(t0, dur=1.2):
    for i in range(int(dur * 40)):
        add(noise_burst(0.015, 300, True, 2) * rng.uniform(.05, .18), t0 + rng.uniform(0, dur), 1, rng.uniform(-.8, .8))

# Scene 1: notifications, ticking clocks, shuffling papers
for i, tt in enumerate([0.25, 0.9, 1.6, 2.2, 2.9, 3.5]):
    add(ping(1320 if i % 2 else 1568), tt, 0.35, -0.6 if i % 2 else 0.6)
for i in range(16):
    add(tick(i % 2 == 0), i * 0.25, 0.5, 0.3)
for tt in [0.0, 1.2, 2.4, 3.3]:
    add(whoosh(1.0), tt, 0.25, rng.uniform(-.5, .5))
# Scene 2: magic shimmer + buddies arrive
sparkle(6, T['magic'])
for k in ['doki', 'piso', 'tiki', 'homi', 'sunny']:
    add(boing(), T['enter_' + k], 0.55, rng.uniform(-.4, .4))
for tt in [T['enter_piso'] + 0.3, T['enter_piso'] + 0.5, T['enter_piso'] + 0.7]:
    add(coin(), tt, 0.5, 0.3)
add(alarm(0.25), T['enter_tiki'] + 0.25, 0.6, -0.2)
add(whoosh(0.6), T['enter_doki'] + 0.2, 0.3, -0.3)
sparkle(6, T['organized'])
# Scene 3: taps + task completion confetti
add(whoosh(0.8), T['s3'] - 0.4, 0.35, 0)
for k in ['tap_docs', 'tap_bills', 'tap_cal']:
    add(pop(), T[k], 0.45, 0)
add(alarm(0.5), T['tap_cal'] + 0.1, 0.5, 0.4)
add(pop(), T['tap_task'], 0.6, 0); sparkle(5, T['tap_task'] + 0.05); confetti(T['tap_task'] + 0.1, 1.0)
# Scene 4: reveal
add(whoosh(1.0), T['s4'] - 0.5, 0.45, 0)
add(mix(kick(0.9, 90, 35) * 1.2, noise_burst(0.5, 6, False) * 0.2), T['reveal_land'], 0.9, 0)
sparkle(6, T['reveal_land'] + 0.05); confetti(T['reveal_land'] + 0.1, 3.0)
add(boing(260, 620, 0.35), T['adu_climb'], 0.5, 0)
add(alarm(0.7), T['tiki_ring'], 0.5, 0.5)
for i in range(5): add(coin(), T['coins'] + i * 0.13, 0.4, -0.5 + 0.25 * i)
for i in range(4): add(pop(), T['balloons'] + i * 0.15, 0.3, 0.5)
# Scene 5
add(whoosh(0.9), T['s5'] - 0.4, 0.35, 0)
sparkle(6, T['logo']); 
for k in range(6): add(boing(320, 680, 0.2), T['row'] + k * 0.12, 0.3, -0.6 + 0.24 * k)
add(pop(), T['sign'], 0.4, 0)
confetti(25.0, 3.0); sparkle(6, 28.6)

# --- voice-over ---
vo = json.load(open('vo.json'))
voL = np.zeros(N)
for v, tt in zip(vo, T['vo']):
    a, sr = sf.read(f"vo_{v['i']}.wav")
    x = np.interp(np.arange(int(len(a) * SR / sr)) * sr / SR, np.arange(len(a)), a)
    i = int(tt * SR); j = min(N, i + len(x)); voL[i:j] += x[: j - i]
# ducking envelope
act = lowpass((np.abs(voL) > 0.02).astype(float), 4800)
duck = 1 - 0.68 * np.clip(act * 3, 0, 1)
duck = lowpass(duck, 2400)

# simple reverb on music+sfx
def reverb(x, sec=1.2, mix=0.18):
    n = int(sec * SR); ir = rng.uniform(-1, 1, n) * np.exp(-np.arange(n) / SR * 4.5); ir[0] = 0
    m = len(x) + n; F = 1 << (m - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[: len(x)]
    y /= (np.max(np.abs(y)) + 1e-9); y *= np.max(np.abs(x))
    return x + mix * y
mL = reverb(music_L) * duck * 0.9; mR = reverb(music_R) * duck * 0.9
sL = reverb(L, 0.8, 0.12); sR = reverb(R, 0.8, 0.12)
outL = mL + sL * 0.8 * duck + voL * 2.4; outR = mR + sR * 0.8 * duck + voL * 2.4
fade = np.ones(N); fn = int(1.2 * SR); fade[-fn:] = np.linspace(1, 0, fn) ** 1.5
out = np.stack([outL * fade, outR * fade], 1)
g = np.max(np.abs(out)) / 0.89
out /= g
bed = np.stack([(mL + sL * 0.8 * duck) * fade, (mR + sR * 0.8 * duck) * fade], 1) / g
sf.write('bed.wav', bed, SR)
sf.write('mix.wav', out, SR)
sf.write('vo_only.wav', voL / (np.max(np.abs(voL)) + 1e-9) * 0.8, SR)
print('mix.wav written', out.shape)
