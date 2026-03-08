import React from "react";
import {
  AbsoluteFill,
  Img,
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
import { RANGER_RAPTOR_PHOTOS } from "./data/ranger-raptor-photos";
import {
  RANGER_RAPTOR_BUILD_SPEC,
  RANGER_RAPTOR_BUILD_SPEC_DURATION,
} from "./data/ranger-raptor-build-spec";

const TRANSITION_FRAMES = 15; // 0.5s crossfade

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

export const RangerRaptorPhotoReel: React.FC = () => {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Photo slides with crossfade transitions */}
      <TransitionSeries>
        {RANGER_RAPTOR_PHOTOS.map((photo, i) => (
          <React.Fragment key={photo.src}>
            <TransitionSeries.Sequence durationInFrames={photo.durationInFrames}>
              <PhotoSlide photo={photo} />
            </TransitionSeries.Sequence>
            {i < RANGER_RAPTOR_PHOTOS.length - 1 && (
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
        <TransitionSeries.Sequence durationInFrames={RANGER_RAPTOR_BUILD_SPEC_DURATION}>
          <BuildSpec
            title="FORD RANGER RAPTOR"
            subtitle="BUILD SPEC"
            items={RANGER_RAPTOR_BUILD_SPEC}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Bottom gradient for watermark readability */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, transparent 82%, rgba(0,0,0,0.24) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Logo watermark — pre-processed white silhouette with drop shadow */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 67,
          pointerEvents: "none",
        }}
      >
        <Img
          src={staticFile("logo/watermark.png")}
          style={{
            width: 182,
            height: 182,
            objectFit: "contain",
          }}
        />
      </AbsoluteFill>

      {/* Fade in/out black overlay */}
      <FadeOverlay />

      {/* Logo end card — appears after fade to black */}
      <Sequence from={durationInFrames - 75}>
        <Branding />
      </Sequence>
    </AbsoluteFill>
  );
};
