import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
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
import { M5_G90_CLIPS } from "./data/m5-g90-clips";
import {
  M5_G90_BUILD_SPEC,
  M5_G90_BUILD_SPEC_DURATION,
} from "./data/m5-g90-build-spec";

const TRANSITION_FRAMES = 10; // ~0.33s crossfade between clips

/**
 * Calculate the frame ranges where loud clips (volume > 0) play,
 * accounting for TransitionSeries overlap.
 */
function getLoudClipRanges() {
  const ranges: { start: number; end: number }[] = [];
  let position = 0;

  for (let i = 0; i < M5_G90_CLIPS.length; i++) {
    const clip = M5_G90_CLIPS[i];
    const clipStart = position;
    const clipEnd = position + clip.durationInFrames;

    if (clip.volume > 0) {
      ranges.push({ start: clipStart, end: clipEnd });
    }

    // Next clip starts at clipEnd minus transition overlap
    position = clipEnd - (i < M5_G90_CLIPS.length - 1 ? TRANSITION_FRAMES : 0);
  }

  return ranges;
}

const LOUD_CLIP_RANGES = getLoudClipRanges();

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

export const M5G90Reel: React.FC = () => {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* Video clips with crossfade transitions */}
      <TransitionSeries>
        {M5_G90_CLIPS.map((clip, i) => (
          <React.Fragment key={clip.src + i}>
            <TransitionSeries.Sequence durationInFrames={clip.durationInFrames}>
              <AbsoluteFill style={{ backgroundColor: "black" }}>
                <OffthreadVideo
                  src={staticFile(clip.src)}
                  startFrom={clip.startFrom}
                  volume={clip.volume}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </AbsoluteFill>
            </TransitionSeries.Sequence>
            {i < M5_G90_CLIPS.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({
                  durationInFrames: TRANSITION_FRAMES,
                })}
              />
            )}
          </React.Fragment>
        ))}
        {/* Crossfade into build spec */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence
          durationInFrames={M5_G90_BUILD_SPEC_DURATION}
        >
          <BuildSpec
            title="BMW M5 G90"
            subtitle="AKRAPOVIC"
            items={M5_G90_BUILD_SPEC}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Background music — Greta Van Fleet - Highway Tune */}
      <Audio
        src={staticFile(
          "music/Greta Van Fleet - Highway Tune (Audio) [cj56b8Ucjaw].mp3"
        )}
        volume={(f) => {
          // Fade in/out
          const fadeIn = interpolate(f, [0, 15], [0, 1], {
            extrapolateRight: "clamp",
          });
          const fadeOut = interpolate(
            f,
            [durationInFrames - 30, durationInFrames],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Duck music during loud clips (exhaust audio)
          let duck = 1;
          for (const range of LOUD_CLIP_RANGES) {
            // Ramp down 10 frames before loud clip starts
            const duckDown = interpolate(
              f,
              [range.start - 10, range.start],
              [1, 0.15],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            // Ramp back up 10 frames after loud clip ends
            const duckUp = interpolate(
              f,
              [range.end, range.end + 10],
              [0.15, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            // Inside the loud range, stay ducked
            if (f >= range.start && f <= range.end) {
              duck = Math.min(duck, 0.15);
            } else if (f < range.start && f >= range.start - 10) {
              duck = Math.min(duck, duckDown);
            } else if (f > range.end && f <= range.end + 10) {
              duck = Math.min(duck, duckUp);
            }
          }

          return fadeIn * fadeOut * duck;
        }}
      />

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
