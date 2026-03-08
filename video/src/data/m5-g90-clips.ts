export interface M5G90Clip {
  src: string;
  startFrom: number; // frames to skip from start (at source fps, typically 30)
  durationInFrames: number;
  label: string;
  volume: number; // 0 = muted (music only), 1 = full clip audio (exhaust)
}

// ~96 BPM — 1 bar (4 beats) ≈ 75 frames (2.5s) at 30fps
// Music drop at frame 472 (15.7s) — pre-drop: quiet guitar intro, post-drop: full band
//
// Pre-drop total: 75×6 + 82 = 532 - 6×10 transitions = 472 frames → hits drop exactly
// Post-drop: bar-aligned cuts every 75 frames

export const M5_G90_CLIPS: M5G90Clip[] = [
  // ─── PRE-DROP: HOOK (exhaust over quiet guitar intro) ───
  {
    src: "m5_g90_luis/IMG_1257_accel.mp4",
    startFrom: 0,
    durationInFrames: 75,
    label: "HOOK — car drives away, exhaust roar",
    volume: 1,
  },

  // ─── PRE-DROP: PRODUCT (Akrapovic system on shop floor) ───
  {
    src: "m5_g90_luis/VIDEO-2026-02-27-20-34-34.MP4",
    startFrom: 0,
    durationInFrames: 75,
    label: "Full system top-down reveal",
    volume: 0,
  },
  {
    src: "m5_g90_luis/VIDEO-2026-02-27-20-34-34 2.MP4",
    startFrom: 60,
    durationInFrames: 75,
    label: "Muffler close-up pan, titanium welds",
    volume: 0,
  },
  {
    src: "m5_g90_luis/VIDEO-2026-02-27-20-34-39.MP4",
    startFrom: 30,
    durationInFrames: 75,
    label: "Carbon tips Akrapovic branding",
    volume: 0,
  },
  {
    src: "m5_g90_luis/VIDEO-2026-02-27-20-34-40.MP4",
    startFrom: 30,
    durationInFrames: 75,
    label: "All 4 carbon tips in packaging",
    volume: 0,
  },

  // ─── PRE-DROP: INSTALLED (exhaust on the car) ───
  {
    src: "m5_g90_luis/DJI_20260227_154455_589_video.MP4",
    startFrom: 60,
    durationInFrames: 75,
    label: "Hexagonal tip installed close-up",
    volume: 0,
  },
  {
    src: "m5_g90_luis/DJI_20260227_154540_876_video.MP4",
    startFrom: 90,
    durationInFrames: 82, // slightly longer to hit the drop at frame 472
    label: "Undercarriage exhaust piping → DROP",
    volume: 0,
  },

  // ─── POST-DROP: CAR ROUND (bar-aligned, 75 frames each) ───
  {
    src: "m5_g90_luis/DJI_20260227_154856_823_video.MP4",
    startFrom: 15,
    durationInFrames: 75,
    label: "Rear — taillights on, quad Akrapovic tips",
    volume: 0,
  },
  {
    src: "m5_g90_luis/DJI_20260227_154801_621_video.MP4",
    startFrom: 120,
    durationInFrames: 75,
    label: "Orbit around car in shop",
    volume: 0,
  },
  {
    src: "m5_g90_luis/DJI_20260227_155116_323_video.MP4",
    startFrom: 15,
    durationInFrames: 75,
    label: "Interior — dashboard, M steering wheel",
    volume: 0,
  },
  {
    src: "m5_g90_luis/DJI_20260227_155138_343_video.MP4",
    startFrom: 15,
    durationInFrames: 75,
    label: "Front 3/4 with hood up",
    volume: 0,
  },

  // ─── POST-DROP: LEAVING (car on the street) ───
  {
    src: "m5_g90_luis/IMG_1257_leaving.mp4",
    startFrom: 30,
    durationInFrames: 75,
    label: "Rear leaving shop",
    volume: 0,
  },
  {
    src: "m5_g90_luis/IMG_1257_accel.mp4",
    startFrom: 0,
    durationInFrames: 435,
    label: "FINALE — street beauty + drives away, exhaust roar",
    volume: 1,
  },
];
