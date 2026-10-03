"""Offline soft music bed for the promo (facebook/musicgen-small, CPU).
Makes three ~28 s sections with different moods; assemble.py loops/crossfades them.
Run: eval/.venv/Scripts/python videos/mathaka-promo/scripts/musicgen.py"""
import wave, numpy as np, torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration

OUT = "videos/mathaka-promo/assets/music"
SECTIONS = {
    "a-intimate": "gentle solo felt piano, warm and tender, soft sustained strings, slow 72 bpm, intimate, cinematic, no drums",
    "b-tech": "calm modern ambient electronic, soft pulsing synth arpeggio, warm pads, light felt piano, 90 bpm, hopeful, minimal soft percussion",
    "c-uplift": "uplifting cinematic piano and strings, warm and hopeful, gentle swell, 80 bpm, emotional ending, soft",
}
torch.manual_seed(7)
proc = AutoProcessor.from_pretrained("facebook/musicgen-small")
model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
sr = model.config.audio_encoder.sampling_rate
for name, prompt in SECTIONS.items():
    inputs = proc(text=[prompt], padding=True, return_tensors="pt")
    with torch.no_grad():
        audio = model.generate(**inputs, do_sample=True, guidance_scale=3.0, max_new_tokens=int(28 * 50))
    a = audio[0, 0].numpy()
    a = a / (np.abs(a).max() + 1e-9) * 0.9
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((a * 32767).astype(np.int16).tobytes())
    print(name, len(a) / sr, "s", flush=True)
