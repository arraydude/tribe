# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About Tribe Shipping

**Tribe Shipping** is a premium courier and import service based in Argentina, specializing in automotive performance and service parts that are not available locally. We are BMW specialists, obsessives, and racing lovers.

- Instagram: https://www.instagram.com/tribeshipping

### What We Do

- **Select, buy, and import** performance parts and OEM service parts not available in Argentina (direct import worldwide → Argentina)
- **Work directly with customers or mechanics** — if a project comes to us, we select the most appropriate mechanic and shop for it
- **Help shops** choose the right parts for their builds and assist with ECU unlocks (Femto) and tuning (BootMod3)
- **Premium full-service experience** — the customer doesn't have to deal with anything; our objective is their enjoyment

### Partner Shops

- **Bavarian Motorsport** (@bavarianmotorsportok) — BMW and high-end vehicle specialist workshop in Argentina. Handles builds, tuning, ECU/DME unlocking, and installations. xHP Flashtool official dealer.
- **ADM Team Auto** (@admteamauto) — Full-service automotive shop in Buenos Aires (Gandara 3368). Services include mechanical work, detailing, PPF & window tinting (Stek), preventive maintenance, and audio installation. Works on all brands.

### Brands We Deal (discount pricing)

ECS Tuning, Ind Distribution, BootMod3, Femto, Titan Motorsports, CTS Turbo, Infinity Design, AutoTecknic.

### Other Brands We Work With

VRSF, Vargas Turbo Technologies (VTT), BurgerTuning (JB4), Pure Turbos, Dorch Engineering, Team Schirmer, AeroLuxe Auto Boutique, Macht Schnell, Maxton Design, BC Racing, Clutch Masters, Cometic Gaskets, SP Rods, K-Tuned, Paradigm Engineering, xHP Flashtool, Tom's Racing, GFB (Go Fast Bits), GetBMWParts, BimmerWorld, among others.

### Key Brand Context

- **Femto** — ECU/DME unlock service for post-2020 BMWs. It doesn't tune the car itself; it removes write protection at the bootloader level so tuning tools (BootMod3, MHD, etc.) can flash custom maps via OBD. Required for modern S58, B58 (2020+) platforms.
- **BootMod3 (bm3)** — OBD flash tuning platform for BMW. Supports Stage 1–3 maps, flex fuel, custom features. Requires Femto unlock on post-2020 cars.
- **AutoTecknic** — Carbon fiber exterior/interior parts, aero, wheels, brakes, and suspension kits. Primarily BMW-focused (autotecknic.com).
- **CTS Turbo** — Performance intakes, intercoolers, turbo upgrades, and bolt-on parts for BMW and Audi.
- **Infinity Design** — Aftermarket intake systems for BMW, organized by chassis/engine platform.
- **Pure Turbos** — Upgraded turbo kits for BMW (N55, S55, B58, S58). Their N55 Stage 2 supports 550+ whp.
- **Dorch Engineering** — BMW tuning and engineering: HPFP, injectors, camshafts, EFI tuning, engine builds. Specializes in B58/S58/N55/S55 platforms.
- **Team Schirmer** — German motorsport company. Carbon fiber GT wings, splitters, hoods, and doors for BMW (F87, G8X, E46, E9X).
- **AeroLuxe Auto Boutique** — Carbon fiber Spec-CS/CSL front lips and aero for BMW (F87 M2, F8X M3/M4, E46 M3).
- **Macht Schnell** — Competition wheel spacers machined from 6061-T6 aluminum, for all BMW chassis (E/F/G/i).

### BMW Platforms

Primary focus is BMW, covering these chassis/engine combos:
- **G8X** (G80 M3, G82 M4, G87 M2) — S58 engine
- **G42/G20** (M240i, 340i) — B58 engine
- **F8X** (F80 M3, F82 M4, F87 M2/M2 CS) — S55/N55 engines
- **E9X** (E92 M3) — S65 engine
- **E60** (M5) — S85 engine
- **F10/F90** (M5) — S63 engine
- **G9X** (new M5)

Also imports parts for Audi, Chevrolet, Subaru, Honda, and Ford.

## Repository Purpose

This repo stores media assets: product photography, build documentation (photos and videos), and drone footage for cars, trucks, and products.

## Directory Structure

| Directory | Contents | Description |
|---|---|---|
| `infinity/` | Product photography (.jpg + .webp pairs) | Infinity Design intake systems, organized by BMW chassis code |
| `m2 g87 - lerda/` | iPhone photos/videos (.JPG, .MOV, .HEIC) | G87 M2 build documentation |
| `m2_cs/` | DJI drone photos/videos (.JPG, .MP4) | F87 M2 → CS conversion drone shoot (Abel's build) |
| `ranger_raptor/` | iPhone photos/videos (.JPG, .HEIC, .MOV, .PNG) | Ford Ranger Raptor build documentation |
| `volvo billet/` | iPhone photos/videos (.JPG, .MP4) | Volvo billet parts project |
| `video/` | Remotion project (TypeScript/React) | Video reels for Instagram — compositions, components, data |

### Infinity Subfolder Convention

Product photos in `infinity/` are organized by BMW chassis code and model:

- `e60-m5-one-piece`, `e60-m5-twin` — E60 M5 intakes
- `f10-m5` — F10 M5
- `f80-m3-m4` — F80/F82 M3/M4
- `f87-m2` — F87 M2
- `f90-m5-intake` — F90 M5
- `g42-g20` — G42/G20 (B58)
- `g8x-m2-m3-m4` — G87 M2, G80 M3, G82 M4 (S58)
- `g9x-m5` — G9X M5
- `m3-e92` — E92 M3

### M2 CS Build Spec (Abel) — `m2_cs/`

F87 M2 (N55) converted to CS specification. Full parts list:

**Engine / Performance:**
- Pure Turbos N55 Stage 2 (550+ whp capable)
- Dorch Engineering Stage 2 tune
- VRSF intercooler, charge pipe & outlet
- GFB Diverter T9356
- aFe Pro Dry S air filter
- Continental MAP sensor (N20)
- NGK 97506 spark plugs x6

**Exterior CS Conversion:**
- CS hood (capot)
- IND F87 M2 Competition front bumper retrofit kit
- AeroLuxe Spec-CS carbon fiber front lip
- Team Schirmer GT carbon rear wing
- AutoTecknic kidney grilles
- IND carbon fiber mirrors & carbon exhaust tips
- Side grill trims
- AeroLuxe rear spoiler

**Wheels / Chassis:**
- BMW M Performance Frozen Gold 19" 763M wheels (x5 — 4 + 1 rear replacement)
- Macht Schnell competition wheel spacers (x2)
- Hub and bearing

**Other:**
- IND carbon fiber roof
- Harman Kardon speakers
- BMW M2 1:18 scale model

**Sourced from:** IND Distribution, ECS Tuning, AutoTecknic, AeroLuxe, Pure Turbos, Dorch Engineering, VRSF, GetBMWParts, BimmerWorld, Macht Schnell, eBay, Amazon.

### Ranger Raptor Build — `ranger_raptor/`

Ford Ranger Raptor with performance and aesthetic modifications.

**Performance / Tuning:**
- Mapeo a medida HPTuners (WOT y pedal parcial)
- Set de bajadas en acero inoxidable
- Todos los limitadores removidos

**Chassis / Exterior:**
- Kit de espaciadores de rueda BONOSS (6061-T6)
- Kit de altura G.O.A.T Offroad (1" lift strut spacers)
- LEDs de trompa tipo F150 Raptor

## Remotion Video Project — `video/`

Remotion project for creating Instagram reels. Located at `video/`.

### Structure

- `src/Root.tsx` — Composition registry (all reels registered here)
- `src/components/` — Shared components: `PhotoSlide.tsx` (Ken Burns), `BuildSpec.tsx` (animated parts list), `Branding.tsx` (logo end card)
- `src/data/` — Per-project data files (photos array, build spec items)
- `public/` — Symlinks to asset directories (`logo/`, `m2_cs/`, `ranger_raptor/`)
- `brand-photos.mjs` — Sharp-based image processor: color grading + white logo watermark with drop shadow

### Composition Pattern (Photo Reel)

Each photo reel follows this structure:
1. `TransitionSeries` of `PhotoSlide` components (75 frames each, 15-frame crossfades)
2. Crossfade into `BuildSpec` (150 frames) with title/subtitle/items props
3. `FadeOverlay` (black fade in/out)
4. Logo watermark overlay (`logo/watermark.png` — pre-processed white silhouette with drop shadow)
5. `Branding` end card (last 75 frames — logo + @tribeshipping)

Dimensions: 1080×1920 vertical, 30fps, H.264 codec, CRF 17.

### Adding a New Reel

1. Convert any HEIC files to JPG (`sips -s format jpeg`)
2. Create `src/data/<project>-photos.ts` with Photo array (import `Photo` type from `m2cs-photos.ts`)
3. Create `src/data/<project>-build-spec.ts` with items array + duration
4. Create `src/<ProjectName>PhotoReel.tsx` following existing composition pattern
5. Register in `src/Root.tsx` with computed frame duration
6. Add symlink in `public/` and render script in `package.json`
7. Generate `logo/watermark.png` if not already present (run the sharp script)

### BuildSpec Component

Accepts optional props with backward-compatible defaults:
- `title` (default: "BMW M2 CS")
- `subtitle` (default: "BUILD SPEC")
- `items` (default: M2CS_BUILD_SPEC)

### NPM Scripts

- `npm run studio` — Remotion Studio (preview)
- `npm run render:m2cs` — Render M2 CS video reel
- `npm run render:m2cs-photoreel` — Render M2 CS photo reel
- `npm run render:raptor-photoreel` — Render Ranger Raptor photo reel

## File Naming Patterns

- **Infinity product photos**: Flickr-style numeric IDs with size suffixes (`_b` = large 1024px, `_k` = 2048px), each in .jpg and .webp pairs. Example: `53493436342_40289b344b_b.jpg`
- **iPhone captures**: `IMG_XXXX` sequential naming (.JPG, .MOV, .HEIC) or UUID-based names
- **DJI drone footage**: `DJI_YYYYMMDD_HHMMSS_xxx` with `_video` suffix for .MP4 files

## Conventions for New Content

- Use lowercase with hyphens for folder names
- Product photography organized by brand goes in its own top-level folder (e.g., `infinity/`)
- Within product folders, organize by chassis code: `<chassis>-<model>` (e.g., `g8x-m2-m3-m4`)
- Build documentation goes in its own top-level folder: `<model> <chassis> - <owner or project name>` (e.g., `m2 g87 - lerda`)
