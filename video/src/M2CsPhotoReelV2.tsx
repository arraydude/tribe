import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { BuildSpec } from "./components/BuildSpec";
import { Branding } from "./components/Branding";
import { BUILD_SPEC_DURATION } from "./data/m2cs-build-spec";

export const PRE_EDITED_VIDEO_FRAMES = 982; // ceil(32.716667s × 30fps)
const TRANSITION_FRAMES = 15;

const FadeOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 15], [1, 0], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 24, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp" }
  );

  const opacity = Math.max(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

export const M2CsPhotoReelV2: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Audio volume: fade out during build spec / outro
  const audioFadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const audioFadeOut = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const volume = audioFadeIn * audioFadeOut;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Pre-edited video + crossfade into build spec */}
      <TransitionSeries>
        <TransitionSeries.Sequence
          durationInFrames={PRE_EDITED_VIDEO_FRAMES}
        >
          <OffthreadVideo
            src={staticFile("m2_cs/M2_CS_PHOTOREEL_PREEDITED.MP4")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            volume={volume}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={BUILD_SPEC_DURATION}>
          <BuildSpec />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Fade in/out black overlay */}
      <FadeOverlay />

      {/* Logo end card */}
      <Sequence from={durationInFrames - 75}>
        <Branding />
      </Sequence>
    </AbsoluteFill>
  );
};
