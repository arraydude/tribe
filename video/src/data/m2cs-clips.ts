export interface Clip {
  src: string;
  startFrom: number; // frames to skip from start (at 30fps)
  durationInFrames: number;
  label: string;
}

// 30fps — each second = 30 frames
export const M2CS_CLIPS: Clip[] = [
  {
    src: "m2_cs/DJI_20260130_180356_759_video.MP4",
    startFrom: 15,
    durationInFrames: 105,
    label: "Full car reveal — front 3/4",
  },
  {
    src: "m2_cs/DJI_20260130_183459_668_video.MP4",
    startFrom: 15,
    durationInFrames: 90,
    label: "CS hood from above",
  },
  {
    src: "m2_cs/DJI_20260130_181506_310_video.MP4",
    startFrom: 15,
    durationInFrames: 90,
    label: "M2 kidney grille close-up",
  },
  {
    src: "m2_cs/DJI_20260130_181642_006_video.MP4",
    startFrom: 15,
    durationInFrames: 90,
    label: "Side profile",
  },
  {
    src: "m2_cs/DJI_20260130_181532_301_video.MP4",
    startFrom: 15,
    durationInFrames: 90,
    label: "Front approach",
  },
  {
    src: "m2_cs/DJI_20260130_181733_158_video.MP4",
    startFrom: 15,
    durationInFrames: 90,
    label: "BMW center cap detail",
  },
  {
    src: "m2_cs/DJI_20260130_183408_737_video.MP4",
    startFrom: 15,
    durationInFrames: 105,
    label: "Rear detail",
  },
  {
    src: "m2_cs/DJI_20260130_183054_107_video.MP4",
    startFrom: 60,
    durationInFrames: 90,
    label: "Rear 3/4 carbon exhaust",
  },
  {
    src: "m2_cs/DJI_20260130_183442_085_video.MP4",
    startFrom: 30,
    durationInFrames: 105,
    label: "Carbon spoiler + Bavarian shop",
  },
];
