# Photo Processing Specification — Tribe Shipping

This document defines the editing standards, processing profiles, and technical parameters
for all Tribe Shipping photography destined for Instagram and web use.

## Brand Visual Identity

- **Style:** Clean/showroom — true-to-life colors, sharp details, minimal processing
- **Tone:** Premium, obsessive about quality, automotive enthusiast
- **Feed consistency:** Clean backgrounds on product shots, natural environments for builds
- **Philosophy:** Authenticity over trends — no heavy filters, let the parts and cars speak

## Non-Destructive Workflow

- **NEVER modify, move, or delete original photos**
- All output goes to `ig-ready/runs/<NNN>/` with versioned run folders
- Each run records its settings in `meta.json` for reproducibility
- `ig-ready/latest` symlink always points to the most recent run
- Originals remain exactly as they are in their source locations

## Instagram Technical Requirements

| Format | Aspect Ratio | Resolution | Use Case |
|---|---|---|---|
| **Feed (primary)** | **3:4** | **1080 x 1440 px** | Default for all posts — max vertical space, matches grid |
| Feed (portrait) | 4:5 | 1080 x 1350 px | Alternative portrait |
| Feed (square) | 1:1 | 1080 x 1080 px | Uniform grid aesthetic |
| Feed (landscape) | 1.91:1 | 1080 x 566 px | Cinematic (use carousels instead) |
| Stories / Reels | 9:16 | 1080 x 1920 px | Full-screen vertical video |

### Upload Optimization

| Parameter | Value | Why |
|---|---|---|
| Format | JPEG | Instagram converts everything to JPEG internally |
| Quality | 92 (mozjpeg) | Sweet spot — higher triggers heavier IG recompression |
| Target file size | 500 KB – 2 MB | IG limit is 8 MB but larger files get compressed more aggressively |
| Color space | sRGB | Adobe RGB causes color shifts on Instagram |
| Pre-sharpening | sigma 0.5, m1 1.0, m2 0.5 | Subtle — helps details survive IG compression |
| Archive format | WebP q85 | Companion file for web/catalog use, not for IG upload |

## Processing Profiles

### `product` — Parts & Product Photography

For: intake systems, turbo kits, carbon fiber pieces, wheels, accessories on a table or surface.

**Goal:** Neutral, true-to-life color reproduction. The customer needs to see exactly what they're buying.

| Parameter | Value |
|---|---|
| Brightness | 1.03 |
| Saturation | 1.0 |
| Hue shift | 0 |
| Contrast | 1.02 |
| Sharpening | sigma 0.5, m1 1.0, m2 0.5 |
| Crop | 3:4 center (1080x1440) |
| Logo | Yes (bottom-center, white silhouette) |

### `build` — Build Documentation & Car Photography

For: iPhone/drone shots of cars during and after builds, rolling shots, detail shots.

**Goal:** Slightly stylized, premium feel. Cool-toned with a mild desaturation for a clean, modern automotive look.

| Parameter | Value |
|---|---|
| Brightness | 1.06 |
| Saturation | 0.85 |
| Hue shift | +8 (toward blue) |
| Contrast | 1.05 |
| Sharpening | sigma 0.5, m1 1.0, m2 0.5 |
| Crop | 3:4 center (1080x1440) |
| Logo | Yes (bottom-center, white silhouette) |

## Logo / Watermark

| Parameter | Value |
|---|---|
| Source | `logo/youtube300.png` |
| Width | 12% of output width (~130px at 1080w) |
| Position | Bottom-center |
| Edge padding | 3.5% from bottom edge |
| Style | White silhouette with black drop shadow |
| Opacity | 70% logo, 70% shadow |
| Shadow blur | 3.5 sigma |
| Shadow offset | 2px |

## Auto-Detection Rules

When photo type is not specified, detect from the input folder name:

- **Product indicators:** infinity, autotecknic, cts, ecs, ind, bootmod3, femto, titan, vrsf, vtt, pure, dorch, schirmer, aeroluxe, macht, maxton, bc-racing, clutch-masters
- **Build indicators:** m2, m3, m4, m5, g87, g8x, g80, g82, g42, g20, f87, f8x, f80, f82, e92, e60, f10, f90, g9x, volvo, lerda, abel
- **Default:** `build`

## Output Structure

```
ig-ready/
├── latest -> runs/003
└── runs/
    ├── 001/
    │   ├── meta.json
    │   └── <mirrored-source-path>/
    │       ├── photo-name-ig.jpg
    │       └── photo-name-ig.webp
    ├── 002/
    │   ├── meta.json
    │   └── ...
    └── 003/
        └── ...
```

### meta.json Schema

```json
{
  "version": 1,
  "timestamp": "2026-01-31T14:30:00Z",
  "type": "build",
  "ratio": "3:4",
  "grade": {
    "brightness": 1.06,
    "saturation": 0.85,
    "hue": 8,
    "contrast": 1.05
  },
  "sharpening": { "sigma": 0.5, "m1": 1.0, "m2": 0.5 },
  "logo": true,
  "jpegQuality": 92,
  "webpQuality": 85,
  "inputDir": "m2_cs",
  "filesProcessed": 42,
  "filesOk": 42,
  "filesFailed": 0,
  "note": ""
}
```

### Naming Convention

- Product: `<original-name>-ig.jpg` + `-ig.webp`
- Build: `<original-name>-ig.jpg` + `-ig.webp`
- HEIC/HEIF inputs are converted to JPEG (via Sharp) — original extension replaced

## CLI Usage

```bash
# Process a folder of product photos
node video/ig-process.mjs infinity/g8x-m2-m3-m4 --type product

# Process build documentation
node video/ig-process.mjs m2_cs --type build

# Process with custom ratio and a note
node video/ig-process.mjs m2_cs --type build --ratio 4:5 --note "testing 4:5 for carousel"

# Process without logo
node video/ig-process.mjs infinity/f87-m2 --type product --no-logo

# Re-run with settings from a previous run
node video/ig-process.mjs m2_cs --rerun 001

# Process a single file
node video/ig-process.mjs "m2 g87 - lerda/IMG_1234.HEIC" --type build
```
