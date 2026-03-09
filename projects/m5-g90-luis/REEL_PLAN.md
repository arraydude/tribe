# M5 G90 Luis — Akrapovic Reel Plan

## Project

- **Car**: BMW M5 G90 (matte grey)
- **Owner**: Luis
- **Parts**: Akrapovic Slip-On Line (Titanium) + Tail Pipe Set (Carbon, hexagonal)
- **Shop**: Bavarian Motorsport
- **Music**: Greta Van Fleet - Highway Tune

## Media Inventory

### DJI Drone Videos (1080p, 30fps)

| File | Duration | Content |
|------|----------|---------|
| `DJI_...4455` | 13.5s | Installed Akrapovic hexagonal tip close-up (on car, on lift) |
| `DJI_...4540` | 13.7s | Undercarriage — suspension, exhaust piping from below |
| `DJI_...4624` | 7.9s | Under car — muffler from below (motion blur) |
| `DJI_...4648` | 1.0s | Very short — unusable |
| `DJI_...4650` | 14.3s | Car on lift — rear 3/4, Bavarian Motorsport pillar |
| `DJI_...4756` | 2.3s | Car on lift — rear 3/4 higher angle |
| `DJI_...4801` | 32.8s | Long orbit — rear 3/4, slowly panning around car |
| `DJI_...4856` | 5.3s | Rear — taillights on, quad tips, Bavarian badge |
| `DJI_...4924` | 27.5s | Rear 3/4 wider, other cars visible |
| `DJI_...5108` | 5.6s | Side profile passing Bavarian Motorsport pillar |
| `DJI_...5116` | 5.1s | Interior — dashboard, M steering wheel, blue ambient |
| `DJI_...5138` | 4.0s | Front 3/4 with hood up |

### Phone Videos (720p, 30fps)

| File | Duration | Content |
|------|----------|---------|
| `VIDEO-...-33` | 4.4s | Full system layout top-down |
| `VIDEO-...-34` | 6.5s | Full system top-down (different angle) |
| `VIDEO-...-34 2` | 11.4s | Muffler close-up pan, titanium welds |
| `VIDEO-...-34 3` | 7.7s | Muffler junction, pipe weld detail |
| `VIDEO-...-34 4` | 12.6s | Mid-pipe junction weld detail |
| `VIDEO-...-35` | 10.2s | Wider — muffler + clamps + mid-pipes |
| `VIDEO-...-39` | 6.7s | Carbon tail pipes close-up (Akrapovic branding) |
| `VIDEO-...-40` | 7.1s | All 4 carbon tail pipes in foam packaging |

### iPhone 4K Video (3840x2160, 60fps)

| File | Duration | Content |
|------|----------|---------|
| `IMG_1257.MOV` | 28.6s | Car leaving shop → street → walk-around → drives away |
| Segment 0-5s | | Rear view leaving shop |
| Segment 13-17s | | Front 3/4 on street, beauty shot |
| Segment 23-28s | | Driving away with exhaust roar |

### Photos (33 JPGs)

All product shots of the Akrapovic exhaust system:
- Full system layout (IMG_1290)
- Carbon tips with branding (IMG_1274, IMG_1298, IMG_1302)
- Hexagonal tip top-down views (IMG_1293, IMG_1296)
- Titanium piping detail (IMG_1276, IMG_1280, IMG_1286)
- Tip with "HANDLE WITH CARE" tape (IMG_1270)
- Part number visible: TP-CT/79/R, Made in Slovenia (IMG_1296)

## Music Analysis — Highway Tune (~96 BPM)

```
Song structure:
  0.0 - 15.7s : Quiet guitar intro riff (low energy)
  15.7s        : *** DROP *** — full band kicks in (frame 472 at 30fps)
  16 - 25s     : Full energy, main riff
  25 - 40s+    : Driving rhythm, regular beats

1 bar (4 beats) = ~75 frames = 2.5s at 30fps

Beat grid after drop:
  Bar 1: frame 472  (15.7s)   Bar 5: frame 772 (25.7s)
  Bar 2: frame 547  (18.2s)   Bar 6: frame 847 (28.2s)
  Bar 3: frame 622  (20.7s)   Bar 7: frame 922 (30.7s)
  Bar 4: frame 697  (23.2s)   Bar 8: frame 997 (33.2s)
```

## Reel Timeline (~34s)

### PRE-DROP (0-15.7s, quiet guitar intro)

| # | Source | Duration | Section | Audio |
|---|--------|----------|---------|-------|
| 1 | IMG_1257_accel.mp4 | 2.5s | HOOK | Exhaust roar, music ducked |
| 2 | VIDEO-...-34 | 2.5s | PRODUCT | Music only |
| 3 | VIDEO-...-34 2 | 2.5s | PRODUCT | Music only |
| 4 | VIDEO-...-39 | 2.5s | PRODUCT | Music only |
| 5 | VIDEO-...-40 | 2.5s | PRODUCT | Music only |
| 6 | DJI_...4455 | 2.5s | INSTALLED | Music only |
| 7 | DJI_...4540 | 2.7s | INSTALLED | Music only → DROP |

### POST-DROP (15.7s+, full energy, bar-aligned)

| # | Source | Duration | Section | Audio | Bar |
|---|--------|----------|---------|-------|-----|
| 8 | DJI_...4856 | 2.5s | CAR ROUND | Music only | 1 |
| 9 | DJI_...4801 | 2.5s | CAR ROUND | Music only | 2 |
| 10 | DJI_...5116 | 2.5s | CAR ROUND | Music only | 3 |
| 11 | DJI_...5138 | 2.5s | CAR ROUND | Music only | 4 |
| 12 | IMG_1257_leaving.mp4 | 2.5s | LEAVING | Music only | 5 |
| 13 | IMG_1257_street.mp4 | 2.5s | LEAVING | Music only | 6 |
| 14 | IMG_1257_accel.mp4 | 2.5s | LEAVING | Exhaust roar, music ducked | 7 |

### CLOSING

| # | Component | Duration |
|---|-----------|----------|
| 15 | BuildSpec ("BMW M5 G90" / "AKRAPOVIC") | 5s |
| 16 | Branding (@tribeshipping) | 2.5s |

## Audio Design

- Music at full volume during clips 2-13
- Music ducked to ~15% during clips 1 and 14 (exhaust audio)
- 10-frame smooth ramps between levels
- Music fade in: 15 frames, fade out: 30 frames

## Remotion Files

- `video/src/data/m5-g90-clips.ts` — clip array with volume flags
- `video/src/data/m5-g90-build-spec.ts` — build spec in Spanish
- `video/src/M5G90Reel.tsx` — main composition
- `video/src/Root.tsx` — composition registration
- `video/public/m5_g90_luis` → symlink to assets
- `video/public/music` → symlink to music

## Render

```bash
cd video
npm run render:m5g90-reel
# Output: ../m5_g90_luis/m5_g90_reel.mp4
```
