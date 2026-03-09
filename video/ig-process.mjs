#!/usr/bin/env node

/**
 * ig-process.mjs — Tribe Shipping Instagram photo processor
 *
 * Usage:
 *   node video/ig-process.mjs <input-path> [options]
 *
 * Options:
 *   --type product|build   Processing profile (auto-detected if omitted)
 *   --ratio 3:4|4:5|1:1|9:16   Aspect ratio (default: 3:4)
 *   --note "..."           Note stored in meta.json
 *   --no-logo              Skip logo watermark
 *   --rerun <NNN>          Re-run with settings from a previous run
 */

import sharp from "sharp";
import {
  readdir,
  mkdir,
  readFile,
  writeFile,
  symlink,
  unlink,
  lstat,
  stat,
} from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ── Aspect ratios ──────────────────────────────────────────────────
const RATIOS = {
  "3:4": { w: 1080, h: 1440 },
  "4:5": { w: 1080, h: 1350 },
  "1:1": { w: 1080, h: 1080 },
  "9:16": { w: 1080, h: 1920 },
};

// ── Processing profiles ────────────────────────────────────────────
const PROFILES = {
  product: {
    brightness: 1.03,
    saturation: 1.0,
    hue: 0,
    contrast: 1.02,
  },
  build: {
    brightness: 1.06,
    saturation: 0.85,
    hue: 8,
    contrast: 1.05,
  },
};

// ── Sharpening (same for both profiles) ────────────────────────────
const SHARPENING = { sigma: 0.5, m1: 1.0, m2: 0.5 };

// ── Logo / watermark ───────────────────────────────────────────────
const LOGO_PATH = path.resolve(REPO_ROOT, "assets/logo/youtube300.png");
const LOGO_WIDTH_RATIO = 0.12; // 12% of output width (~130px at 1080w)
const LOGO_EDGE_PADDING = 0.035;
const LOGO_OPACITY = 0.7;
const SHADOW_OPACITY = 0.7;
const SHADOW_BLUR = 3.5;
const SHADOW_OFFSET = 2;
const WHITE_THRESHOLD = 225;

// ── Output ─────────────────────────────────────────────────────────
const JPEG_QUALITY = 92;
const WEBP_QUALITY = 85;
const IG_READY_DIR = path.resolve(REPO_ROOT, "ig-ready");
const IMAGE_RE = /\.(jpe?g|png|heic|heif|webp|tiff?)$/i;

// ── Auto-detection ─────────────────────────────────────────────────
const PRODUCT_INDICATORS = [
  "infinity", "autotecknic", "cts", "ecs", "ind", "bootmod3", "femto",
  "titan", "vrsf", "vtt", "pure", "dorch", "schirmer", "aeroluxe",
  "macht", "maxton", "bc-racing", "clutch-masters",
];
const BUILD_INDICATORS = [
  "m2", "m3", "m4", "m5", "g87", "g8x", "g80", "g82", "g42", "g20",
  "f87", "f8x", "f80", "f82", "e92", "e60", "f10", "f90", "g9x",
  "volvo", "lerda", "abel", "ranger", "raptor",
];

function detectType(inputPath) {
  const lower = inputPath.toLowerCase();
  for (const kw of PRODUCT_INDICATORS) {
    if (lower.includes(kw)) return "product";
  }
  for (const kw of BUILD_INDICATORS) {
    if (lower.includes(kw)) return "build";
  }
  return "build"; // default
}

// ── Logo preparation (white silhouette + drop shadow) ──────────────
async function prepareLogo(outputWidth) {
  const logoWidth = Math.round(outputWidth * LOGO_WIDTH_RATIO);

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
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum > WHITE_THRESHOLD || a === 0) {
      whitePixels[i + 3] = 0;
      shadowPixels[i + 3] = 0;
    } else {
      const strength = (255 - lum) / 255;
      whitePixels[i] = 255;
      whitePixels[i + 1] = 255;
      whitePixels[i + 2] = 255;
      whitePixels[i + 3] = Math.round(strength * 255 * LOGO_OPACITY);
      shadowPixels[i] = 0;
      shadowPixels[i + 1] = 0;
      shadowPixels[i + 2] = 0;
      shadowPixels[i + 3] = Math.round(strength * 255 * SHADOW_OPACITY);
    }
  }

  const whiteLogo = await sharp(whitePixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();

  const shadow = await sharp(shadowPixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).blur(SHADOW_BLUR).png().toBuffer();

  const pad = Math.ceil(SHADOW_BLUR * 3) + SHADOW_OFFSET;
  const canvasW = info.width + pad * 2;
  const canvasH = info.height + pad * 2;

  const combined = await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, top: pad + SHADOW_OFFSET, left: pad + SHADOW_OFFSET },
      { input: whiteLogo, top: pad, left: pad },
    ])
    .png()
    .toBuffer();

  return { buffer: combined, width: canvasW, height: canvasH };
}

// ── Bottom gradient for logo readability ───────────────────────────
async function createBottomGradient(width, height) {
  const gradH = Math.round(height * 0.12);
  const pixels = Buffer.alloc(width * gradH * 4);

  for (let y = 0; y < gradH; y++) {
    const t = y / gradH;
    const alpha = Math.round(t * t * 60);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      pixels[idx] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
      pixels[idx + 3] = alpha;
    }
  }

  return sharp(pixels, { raw: { width, height: gradH, channels: 4 } })
    .png()
    .toBuffer();
}

// ── Process a single image ─────────────────────────────────────────
async function processImage(inputPath, outputDir, baseName, grade, dims, logo) {
  // Auto-rotate to get true dimensions
  const rotatedBuf = await sharp(inputPath).rotate().toBuffer();
  let img = sharp(rotatedBuf);

  const meta = await img.metadata();
  const srcW = meta.width;
  const srcH = meta.height;

  // Center crop to target aspect ratio
  const targetAspect = dims.w / dims.h;
  const srcAspect = srcW / srcH;

  let extractOpts;
  if (srcAspect > targetAspect) {
    // Source is wider → crop sides
    const cropW = Math.round(srcH * targetAspect);
    extractOpts = {
      left: Math.round((srcW - cropW) / 2),
      top: 0,
      width: cropW,
      height: srcH,
    };
  } else {
    // Source is taller → crop top/bottom
    const cropH = Math.round(srcW / targetAspect);
    extractOpts = {
      left: 0,
      top: Math.round((srcH - cropH) / 2),
      width: srcW,
      height: cropH,
    };
  }

  // Color grade, crop, resize, sharpen → buffer
  const graded = await sharp(rotatedBuf)
    .extract(extractOpts)
    .modulate({
      brightness: grade.brightness,
      saturation: grade.saturation,
      hue: grade.hue,
    })
    .linear(grade.contrast, -(128 * (grade.contrast - 1)))
    .resize(dims.w, dims.h)
    .sharpen({ sigma: SHARPENING.sigma, m1: SHARPENING.m1, m2: SHARPENING.m2 })
    .toColorspace("srgb")
    .toBuffer();

  // Compositing layers
  const layers = [];

  if (logo) {
    const gradient = await createBottomGradient(dims.w, dims.h);
    const gradMeta = await sharp(gradient).metadata();
    layers.push({ input: gradient, top: dims.h - gradMeta.height, left: 0 });

    const padY = Math.round(dims.h * LOGO_EDGE_PADDING);
    const logoLeft = Math.round((dims.w - logo.width) / 2);
    const logoTop = dims.h - logo.height - padY;
    layers.push({ input: logo.buffer, top: logoTop, left: logoLeft });
  }

  const composed = layers.length > 0
    ? await sharp(graded).composite(layers).toBuffer()
    : graded;

  // Output JPEG
  const jpgName = `${baseName}-ig.jpg`;
  await sharp(composed)
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(path.join(outputDir, jpgName));

  // Output WebP archive
  const webpName = `${baseName}-ig.webp`;
  await sharp(composed)
    .webp({ quality: WEBP_QUALITY })
    .toFile(path.join(outputDir, webpName));

  return jpgName;
}

// ── Run numbering ──────────────────────────────────────────────────
async function nextRunNumber() {
  const runsDir = path.join(IG_READY_DIR, "runs");
  await mkdir(runsDir, { recursive: true });
  let max = 0;
  try {
    const entries = await readdir(runsDir);
    for (const e of entries) {
      const n = parseInt(e, 10);
      if (!isNaN(n) && n > max) max = n;
    }
  } catch { /* empty */ }
  return max + 1;
}

function padRun(n) {
  return String(n).padStart(3, "0");
}

// ── Update latest symlink ──────────────────────────────────────────
async function updateLatestSymlink(runId) {
  const linkPath = path.join(IG_READY_DIR, "latest");
  try {
    await lstat(linkPath);
    await unlink(linkPath);
  } catch { /* doesn't exist yet */ }
  await symlink(`runs/${runId}`, linkPath);
}

// ── Rerun support ──────────────────────────────────────────────────
async function loadRerunMeta(runId) {
  const metaPath = path.join(IG_READY_DIR, "runs", padRun(parseInt(runId, 10)), "meta.json");
  const raw = await readFile(metaPath, "utf8");
  return JSON.parse(raw);
}

// ── Collect input files ────────────────────────────────────────────
async function collectFiles(inputPath) {
  const s = await stat(inputPath);
  if (s.isFile()) {
    return [inputPath];
  }
  const entries = await readdir(inputPath);
  return entries
    .filter((f) => IMAGE_RE.test(f))
    .sort()
    .map((f) => path.join(inputPath, f));
}

// ── Safe output subdirectory relative to repo root ─────────────────
// When input is inside the repo, mirror the source tree structure.
// When input is external, use only the leaf directory name so the
// output stays inside the run directory.
function safeRelDir(absPath) {
  const rel = path.relative(REPO_ROOT, absPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    // External path — use the leaf directory name only
    return path.basename(absPath);
  }
  return rel;
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      type: { type: "string" },
      ratio: { type: "string", default: "3:4" },
      note: { type: "string", default: "" },
      "no-logo": { type: "boolean", default: false },
      rerun: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || positionals.length === 0) {
    console.log(`Usage: node video/ig-process.mjs <input-path> [options]

Options:
  --type product|build   Processing profile (auto-detected if omitted)
  --ratio 3:4|4:5|1:1|9:16   Aspect ratio (default: 3:4)
  --note "..."           Note stored in meta.json
  --no-logo              Skip logo watermark
  --rerun <NNN>          Re-run with settings from a previous run
  -h, --help             Show this help`);
    process.exit(0);
  }

  const rawInput = positionals[0];
  const inputPath = path.resolve(rawInput);

  // Validate input exists
  try {
    await stat(inputPath);
  } catch {
    console.error(`Error: input path not found: ${rawInput}`);
    process.exit(1);
  }

  // Determine settings (rerun overrides CLI flags)
  let type = values.type;
  let ratio = values.ratio;
  let note = values.note;
  let noLogo = values["no-logo"];

  if (values.rerun) {
    try {
      const prev = await loadRerunMeta(values.rerun);
      console.log(`Re-running with settings from run ${values.rerun}`);
      type = type || prev.type;
      ratio = prev.ratio || ratio;
      noLogo = noLogo || !prev.logo;
      if (!note && prev.note) note = `rerun of ${padRun(parseInt(values.rerun, 10))}: ${prev.note}`;
    } catch (err) {
      console.error(`Error loading rerun meta: ${err.message}`);
      process.exit(1);
    }
  }

  // Auto-detect type if not specified
  if (!type) {
    type = detectType(inputPath);
    console.log(`Auto-detected type: ${type}`);
  }

  // Validate
  if (!PROFILES[type]) {
    console.error(`Error: unknown type "${type}" (use product or build)`);
    process.exit(1);
  }
  if (!RATIOS[ratio]) {
    console.error(`Error: unknown ratio "${ratio}" (use ${Object.keys(RATIOS).join(", ")})`);
    process.exit(1);
  }

  const grade = PROFILES[type];
  const dims = RATIOS[ratio];
  const useLogo = !noLogo;

  // Collect files
  const files = await collectFiles(inputPath);
  if (files.length === 0) {
    console.error("No image files found.");
    process.exit(1);
  }

  console.log(`\nTribe IG Process`);
  const inputRel = path.relative(REPO_ROOT, inputPath);
  const inputDisplay = inputRel.startsWith("..") || path.isAbsolute(inputRel)
    ? inputPath
    : inputRel;
  console.log(`  Input:  ${inputDisplay}`);
  console.log(`  Type:   ${type}`);
  console.log(`  Ratio:  ${ratio} (${dims.w}x${dims.h})`);
  console.log(`  Logo:   ${useLogo ? "yes" : "no"}`);
  console.log(`  Files:  ${files.length}`);
  if (note) console.log(`  Note:   ${note}`);
  console.log();

  // Create run directory
  const runNum = await nextRunNumber();
  const runId = padRun(runNum);
  const runDir = path.join(IG_READY_DIR, "runs", runId);

  // Determine output subdirectory (mirror source path if internal,
  // use leaf dir name if external so output stays inside runDir)
  const inputStat = await stat(inputPath);
  const sourceDir = inputStat.isFile() ? path.dirname(inputPath) : inputPath;
  const sourceRelDir = safeRelDir(sourceDir);
  const outputDir = path.join(runDir, sourceRelDir);
  await mkdir(outputDir, { recursive: true });

  // Prepare logo
  let logo = null;
  if (useLogo) {
    console.log("Preparing logo watermark...");
    logo = await prepareLogo(dims.w);
    console.log(`Logo: ${logo.width}x${logo.height}px\n`);
  }

  // Process
  let filesOk = 0;
  let filesFailed = 0;

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);

    try {
      const outName = await processImage(filePath, outputDir, baseName, grade, dims, logo);
      filesOk++;
      console.log(`  [${filesOk + filesFailed}/${files.length}] ${path.basename(filePath)} → ${outName}`);
    } catch (err) {
      filesFailed++;
      console.error(`  [${filesOk + filesFailed}/${files.length}] FAIL ${path.basename(filePath)}: ${err.message}`);
    }
  }

  // Write meta.json
  const metaData = {
    version: 1,
    timestamp: new Date().toISOString(),
    type,
    ratio,
    grade,
    sharpening: SHARPENING,
    logo: useLogo,
    jpegQuality: JPEG_QUALITY,
    webpQuality: WEBP_QUALITY,
    inputPath: inputDisplay,
    filesProcessed: files.length,
    filesOk,
    filesFailed,
    note,
  };

  await writeFile(path.join(runDir, "meta.json"), JSON.stringify(metaData, null, 2) + "\n");

  // Update latest symlink
  await updateLatestSymlink(runId);

  console.log(`\nDone — run ${runId}: ${filesOk}/${files.length} images`);
  console.log(`  Output: ig-ready/runs/${runId}/${sourceRelDir}/`);
  console.log(`  Latest: ig-ready/latest → runs/${runId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
