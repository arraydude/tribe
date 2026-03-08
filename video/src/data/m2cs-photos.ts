export interface KenBurns {
  startScale: number;
  endScale: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface Photo {
  src: string;
  durationInFrames: number;
  label: string;
  kenBurns: KenBurns;
}

export const M2CS_PHOTOS: Photo[] = [
  {
    src: "m2_cs/DJI_20260130_180313_468.JPG",
    durationInFrames: 75,
    label: "Front 3/4 wide — full car reveal",
    kenBurns: { startScale: 1.0, endScale: 1.15, startX: 0, startY: 0, endX: -2, endY: -1 },
  },
  {
    src: "m2_cs/DJI_20260130_181246_610.JPG",
    durationInFrames: 75,
    label: "Overhead — CS hood + roof + second car",
    kenBurns: { startScale: 1.1, endScale: 1.1, startX: -3, startY: 0, endX: 3, endY: 0 },
  },
  {
    src: "m2_cs/DJI_20260130_182713_351.JPG",
    durationInFrames: 75,
    label: "Front 3/4 closer — headlights + grille",
    kenBurns: { startScale: 1.0, endScale: 1.18, startX: 0, startY: 0, endX: -1, endY: -1 },
  },
  {
    src: "m2_cs/DJI_20260130_182745_420.JPG",
    durationInFrames: 75,
    label: "Rear taillight + M2 badge close-up",
    kenBurns: { startScale: 1.1, endScale: 1.1, startX: 3, startY: 0, endX: -3, endY: 0 },
  },
  {
    src: "m2_cs/DJI_20260130_181308_091.JPG",
    durationInFrames: 75,
    label: "Carbon fiber roof detail from above",
    kenBurns: { startScale: 1.2, endScale: 1.05, startX: 0, startY: -1, endX: 0, endY: 1 },
  },
  {
    src: "m2_cs/DJI_20260130_182924_244.JPG",
    durationInFrames: 75,
    label: "Carbon roof close-up (different angle)",
    kenBurns: { startScale: 1.1, endScale: 1.1, startX: -3, startY: 0, endX: 3, endY: 0 },
  },
  {
    src: "m2_cs/DJI_20260130_182804_803.JPG",
    durationInFrames: 75,
    label: "Front face — kidney grilles + CS lip",
    kenBurns: { startScale: 1.0, endScale: 1.15, startX: 0, startY: 1, endX: 0, endY: -1 },
  },
  {
    src: "m2_cs/DJI_20260130_181207_054.JPG",
    durationInFrames: 75,
    label: "Rear — GT wing + Bavarian Motorsport plate",
    kenBurns: { startScale: 1.0, endScale: 1.15, startX: 1, startY: 0, endX: -1, endY: -1 },
  },
  {
    src: "m2_cs/DJI_20260130_181345_006.JPG",
    durationInFrames: 75,
    label: "Rear 3/4 — wing + 763M wheel",
    kenBurns: { startScale: 1.1, endScale: 1.1, startX: 2, startY: 0, endX: -2, endY: 0 },
  },
  {
    src: "m2_cs/DJI_20260130_182824_377.JPG",
    durationInFrames: 75,
    label: "Rear 3/4 — wing + taillights + shop",
    kenBurns: { startScale: 1.15, endScale: 1.0, startX: 0, startY: -1, endX: 0, endY: 0 },
  },
];
