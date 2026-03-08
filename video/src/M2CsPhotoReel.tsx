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
import { PhotoSlide } from "./components/PhotoSlide";
import { BuildSpec } from "./components/BuildSpec";
import { Branding } from "./components/Branding";
import { M2CS_PHOTOS } from "./data/m2cs-photos";
import { BUILD_SPEC_DURATION } from "./data/m2cs-build-spec";

const TRANSITION_FRAMES = 15; // 0.5s crossfade — slightly longer for photos

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

export const M2CsPhotoReel: React.FC = () => {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Photo slides with crossfade transitions */}
      <TransitionSeries>
        {M2CS_PHOTOS.map((photo, i) => (
          <React.Fragment key={photo.src}>
            <TransitionSeries.Sequence durationInFrames={photo.durationInFrames}>
              <PhotoSlide photo={photo} />
            </TransitionSeries.Sequence>
            {i < M2CS_PHOTOS.length - 1 && (
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

      {/* Background music — Don Toliver - ATM (from 0:25) */}
      <Audio
        src={staticFile("m2_cs/atm.mp3")}
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
