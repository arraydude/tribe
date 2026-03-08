import React from "react";
import { Composition } from "remotion";
import { M2CsReel } from "./M2CsReel";
import { M2CsPhotoReel } from "./M2CsPhotoReel";
import { M2CsPhotoReelV2, PRE_EDITED_VIDEO_FRAMES } from "./M2CsPhotoReelV2";
import { M2CS_CLIPS } from "./data/m2cs-clips";
import { M2CS_PHOTOS } from "./data/m2cs-photos";
import { BUILD_SPEC_DURATION } from "./data/m2cs-build-spec";
import { RangerRaptorPhotoReel } from "./RangerRaptorPhotoReel";
import { RANGER_RAPTOR_PHOTOS } from "./data/ranger-raptor-photos";
import { RANGER_RAPTOR_BUILD_SPEC_DURATION } from "./data/ranger-raptor-build-spec";
import { M5G90Reel } from "./M5G90Reel";
import { M5_G90_CLIPS } from "./data/m5-g90-clips";
import { M5_G90_BUILD_SPEC_DURATION } from "./data/m5-g90-build-spec";

const VIDEO_TRANSITION_FRAMES = 10;
const PHOTO_TRANSITION_FRAMES = 15;
const OUTRO_FRAMES = 75; // 2.5s logo end card

// Video reel duration (clips + build spec slide + outro)
const totalClipFrames = M2CS_CLIPS.reduce((sum, c) => sum + c.durationInFrames, 0);
const totalVideoTransitions = M2CS_CLIPS.length * VIDEO_TRANSITION_FRAMES; // includes clip→buildspec
const totalVideoFrames = totalClipFrames + BUILD_SPEC_DURATION - totalVideoTransitions + OUTRO_FRAMES;

// Photo reel duration (photos + build spec slide + outro)
const totalPhotoFrames = M2CS_PHOTOS.reduce((sum, p) => sum + p.durationInFrames, 0);
const totalPhotoTransitions = M2CS_PHOTOS.length * PHOTO_TRANSITION_FRAMES; // includes photo→buildspec
const totalPhotoReelFrames = totalPhotoFrames + BUILD_SPEC_DURATION - totalPhotoTransitions + OUTRO_FRAMES;

// Photo reel V2 duration (pre-edited video + build spec + outro)
const PHOTO_REEL_V2_TRANSITION = 15;
const totalPhotoReelV2Frames = PRE_EDITED_VIDEO_FRAMES + BUILD_SPEC_DURATION - PHOTO_REEL_V2_TRANSITION + OUTRO_FRAMES;

// Ranger Raptor photo reel duration
const totalRaptorPhotoFrames = RANGER_RAPTOR_PHOTOS.reduce((sum, p) => sum + p.durationInFrames, 0);
const totalRaptorTransitions = RANGER_RAPTOR_PHOTOS.length * PHOTO_TRANSITION_FRAMES;
const totalRaptorReelFrames = totalRaptorPhotoFrames + RANGER_RAPTOR_BUILD_SPEC_DURATION - totalRaptorTransitions + OUTRO_FRAMES;

// M5 G90 reel duration (clips + build spec + outro)
const totalM5G90ClipFrames = M5_G90_CLIPS.reduce((sum, c) => sum + c.durationInFrames, 0);
const totalM5G90Transitions = M5_G90_CLIPS.length * VIDEO_TRANSITION_FRAMES; // includes clip→buildspec
const totalM5G90Frames = totalM5G90ClipFrames + M5_G90_BUILD_SPEC_DURATION - totalM5G90Transitions + OUTRO_FRAMES;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="M2CsReel"
        component={M2CsReel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={totalVideoFrames}
      />
      <Composition
        id="M2CsPhotoReel"
        component={M2CsPhotoReel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={totalPhotoReelFrames}
      />
      <Composition
        id="M2CsPhotoReelV2"
        component={M2CsPhotoReelV2}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={totalPhotoReelV2Frames}
      />
      <Composition
        id="RangerRaptorPhotoReel"
        component={RangerRaptorPhotoReel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={totalRaptorReelFrames}
      />
      <Composition
        id="M5G90Reel"
        component={M5G90Reel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={totalM5G90Frames}
      />
    </>
  );
};
