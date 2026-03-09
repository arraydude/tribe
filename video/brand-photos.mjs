import sharp from "sharp";
import { readdir, mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Paths ──────────────────────────────────────────────────────────
const INPUT_DIR = path.resolve(__dirname, "../m2_cs");
const OUTPUT_DIR = path.resolve(__dirname, "../m2_cs/branded_pics");
const LOGO_PATH = path.resolve(__dirname, "../assets/logo/youtube300.png");

// ── Color grade ────────────────────────────────────────────────────
const GRADE = {
  brightness: 1.1, // brighter overall
  saturation: 0.95, // near-original so colors pop
  hue: 8, // cool shift (degrees toward blue)
  contrast: 1.08, // more punch
};

// ── Logo / watermark ───────────────────────────────────────────────
const LOGO_WIDTH_RATIO = 0.144; // ~14.4% of output width (~156px on 1080)
const LOGO_EDGE_PADDING = 0.035; // 3.5% from edges
const LOGO_OPACITY = 0.55; // 55% — less aggressive
const SHADOW_OPACITY = 0.7; // drop shadow strength
const SHADOW_BLUR = 3.5; // drop shadow blur sigma
const SHADOW_OFFSET = 2; // drop shadow offset in px
const WHITE_THRESHOLD = 225; // bg removal luminance cutoff

// ── Output ─────────────────────────────────────────────────────────
const OUTPUT_WIDTH = 1080; // 0 = keep original size
const JPEG_QUALITY = 92;

// ── Prepare white logo silhouette with drop shadow ─────────────────
async function prepareLogo(targetWidth) {
  const logoWidth = Math.round(targetWidth * LOGO_WIDTH_RATIO);

  const resized = await sharp(LOGO_PATH)
    .resize(logoWidth)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = resized;
  const whitePixels = Buffer.from(data);
  const shadowPixels = Buffer.alloc(data.length);
  data.copy(shadowPixels);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      a = data[i + 3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum > WHITE_THRESHOLD || a === 0) {
      // Background → transparent
      whitePixels[i + 3] = 0;
      shadowPixels[i + 3] = 0;
    } else {
      // All logo content → white
      const strength = (255 - lum) / 255;
      whitePixels[i] = 255;
      whitePixels[i + 1] = 255;
      whitePixels[i + 2] = 255;
      whitePixels[i + 3] = Math.round(strength * 255 * LOGO_OPACITY);
      // Shadow
      shadowPixels[i] = 0;
      shadowPixels[i + 1] = 0;
      shadowPixels[i + 2] = 0;
      shadowPixels[i + 3] = Math.round(strength * 255 * SHADOW_OPACITY);
    }
  }

  const whiteLogo = await sharp(whitePixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const shadow = await sharp(shadowPixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .blur(SHADOW_BLUR)
    .png()
    .toBuffer();

  // Combine on a transparent canvas with padding for blur bleed
  const pad = Math.ceil(SHADOW_BLUR * 3) + SHADOW_OFFSET;
  const canvasW = info.width + pad * 2;
  const canvasH = info.height + pad * 2;

  const combined = await sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: shadow, top: pad + SHADOW_OFFSET, left: pad + SHADOW_OFFSET },
      { input: whiteLogo, top: pad, left: pad },
    ])
    .png()
    .toBuffer();

  return { buffer: combined, width: canvasW, height: canvasH };
}

// ── Subtle dark gradient at the bottom for logo readability ────────
async function createBottomGradient(width, height) {
  const gradH = Math.round(height * 0.12);
  const pixels = Buffer.alloc(width * gradH * 4);

  for (let y = 0; y < gradH; y++) {
    const t = y / gradH;
    const alpha = Math.round(t * t * 60); // quadratic ease-in, max 60/255 ≈ 24%

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      pixels[idx] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
      pixels[idx + 3] = alpha;
    }
  }

  return sharp(pixels, {
    raw: { width, height: gradH, channels: 4 },
  })
    .png()
    .toBuffer();
}

// ── Process a single image ─────────────────────────────────────────
async function processImage(inputPath, outputPath, logo, fileName, overrides) {
  // Rotate first to get true dimensions
  const rotatedBuf = await sharp(inputPath).rotate().toBuffer();
  let img = sharp(rotatedBuf);

  // Apply per-image crop overrides if defined
  const ov = overrides[fileName];
  if (ov) {
    const m = await img.metadata();
    const cl = ov.cropLeft || 0;
    const cr = ov.cropRight || 0;
    const ct = ov.cropTop || 0;
    const cb = ov.cropBottom || 0;
    img = img.extract({
      left: cl,
      top: ct,
      width: m.width - cl - cr,
      height: m.height - ct - cb,
    });
  }

  // Color grade + resize
  const graded = await img
    .modulate({
      brightness: GRADE.brightness,
      saturation: GRADE.saturation,
      hue: GRADE.hue,
    })
    .linear(GRADE.contrast, -(128 * (GRADE.contrast - 1)))
    .resize(OUTPUT_WIDTH > 0 ? { width: OUTPUT_WIDTH } : undefined)
    .toBuffer();

  // Get real dimensions after rotation + resize
  const meta = await sharp(graded).metadata();
  const w = meta.width;
  const h = meta.height;

  // Bottom gradient for logo readability
  const gradient = await createBottomGradient(w, h);
  const gradMeta = await sharp(gradient).metadata();
  const gradTop = h - gradMeta.height;

  // Logo position: bottom-center with edge padding
  const padY = Math.round(h * LOGO_EDGE_PADDING);
  const logoLeft = Math.round((w - logo.width) / 2);
  const logoTop = h - logo.height - padY;

  // Pass 2: composite gradient + logo onto graded image
  await sharp(graded)
    .composite([
      { input: gradient, top: gradTop, left: 0 },
      { input: logo.buffer, top: logoTop, left: logoLeft },
    ])
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(outputPath);
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const files = await readdir(INPUT_DIR);
  const images = files.filter((f) => /\.(jpe?g|png|heic)$/i.test(f));

  console.log(`Found ${images.length} images in ${INPUT_DIR}`);
  if (images.length === 0) return;

  // Load per-image overrides from project folder (optional)
  let overrides = {};
  try {
    const raw = await readFile(path.join(INPUT_DIR, "brand-overrides.json"), "utf8");
    overrides = JSON.parse(raw);
    console.log(`Loaded overrides for ${Object.keys(overrides).length} image(s)`);
  } catch {
    // No overrides file — that's fine
  }

  const targetW = OUTPUT_WIDTH > 0 ? OUTPUT_WIDTH : 4032;
  console.log("Preparing logo watermark...");
  const logo = await prepareLogo(targetW);
  console.log(`Logo: ${logo.width}x${logo.height}px\n`);

  let ok = 0;
  for (const file of images) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file.replace(/\.\w+$/, ".jpg"));

    try {
      await processImage(inputPath, outputPath, logo, file, overrides);
      ok++;
      console.log(`  [${ok}/${images.length}] ${file}`);
    } catch (err) {
      console.error(`  FAIL ${file}: ${err.message}`);
    }
  }

  console.log(`\nDone — ${ok}/${images.length} images → ${OUTPUT_DIR}`);
}

main();
