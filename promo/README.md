# QR SYRIA — 30-second 3D promo

A fully procedural promo film for the QR SYRIA ordering platform: every model,
character, texture, UI screen and sound is generated in code (Three.js, Canvas2D
and a small synthesiser), so the film can be re-rendered or edited without any
external assets.

**Story (30 s, 120 BPM, 1080p30):**

| Time | Shot |
| --- | --- |
| 0–4 s | A QR code builds itself cube by cube on a table at Sufra Damascus — "Discover Damascus, one table at a time." |
| 4–9 s | The stand flips up, Karim and Lina pop into their seats; Karim scans the table — "Scan the table." |
| 9–16 s | Into the phone: dishes spring out of the real menu with SYP prices, get added to the order, "Send order" |
| 16–20 s | The ticket flies to the kitchen; the staff tablet pings, the chef accepts and flips the kibbeh |
| 20–24 s | Food lands on the table — "Sahtein!" |
| 24–30 s | The plate's rim and fork become the QR SYRIA logo; tagline, web address and a scannable QR code |

## Render it

```bash
npm install
npm run setup            # optional: local Mesa lavapipe, ~3-4x faster software WebGL
npm run render           # 900 PNG frames -> out/frames (resumable: add --missing)
npm run audio            # soundtrack -> out/audio/soundtrack.wav
npm run encode           # -> out/qr-syria-promo-30s.mp4 (master; add -- --web for a ~23 MB web cut)
npm run verify           # stream facts, loudness, decodes the end-card QR from the MP4
```

Quick looks: `node render.mjs --still 0,300,720 --scale 0.5 --query mb=0`
(`mb=0` disables motion blur).

## Change the copy or the web address

- Web address, restaurant, table and order items: `src/config.js` (the QR codes
  are regenerated from `SITE_URL` on every render).
- On-screen text and its timing: `src/scenes/script.js`.
- Scene timing: the `D`, `H`, `K`, `E` tables at the top of each file in `src/scenes/`.
