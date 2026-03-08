import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { ClipSequence } from "./components/ClipSequence";
import { BuildSpec } from "./components/BuildSpec";
import { Branding } from "./components/Branding";
import { M2CS_CLIPS } from "./data/m2cs-clips";
import { BUILD_SPEC_DURATION } from "./data/m2cs-build-spec";

const TRANSITION_FRAMES = 10; // ~0.33s crossfade between clips

const FadeOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in from black
  const fadeIn = interpolate(frame, [0, 15], [1, 0], {
    extrapolateRight: "clamp",
  });

  // Fade out to black
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

export const M2CsReel: React.FC = () => {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Video clips with crossfade transitions */}
      <TransitionSeries>
        {M2CS_CLIPS.map((clip, i) => (
          <React.Fragment key={clip.src}>
            <TransitionSeries.Sequence durationInFrames={clip.durationInFrames}>
              <ClipSequence clip={clip} />
            </TransitionSeries.Sequence>
            {i < M2CS_CLIPS.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            )}
          </React.Fragment>
        ))}
        {/* Crossfade into build spec */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={BUILD_SPEC_DURATION}>
          <BuildSpec />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Background music — Don Toliver - E85 */}
      <Audio
        src={staticFile("m2_cs/e85.mp3")}
        volume={(f) => {
          const fadeIn = interpolate(f, [0, 15], [0, 1], {
            extrapolateRight: "clamp",
          });
          const fadeOut = interpolate(
            f,
            [durationInFrames - 30, durationInFrames],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return fadeIn * fadeOut;
        }}
      />

      {/* Fade in/out black overlay */}
      <FadeOverlay />

      {/* Logo end card — appears after fade to black */}
      <Sequence from={durationInFrames - 75}>
        <Branding />
      </Sequence>
    </AbsoluteFill>
  );
};
