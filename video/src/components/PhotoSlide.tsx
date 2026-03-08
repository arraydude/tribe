import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Photo } from "../data/m2cs-photos";

export const PhotoSlide: React.FC<{ photo: Photo }> = ({ photo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { kenBurns } = photo;

  const progress = frame / durationInFrames;

  const scale = interpolate(progress, [0, 1], [kenBurns.startScale, kenBurns.endScale]);
  const translateX = interpolate(progress, [0, 1], [kenBurns.startX, kenBurns.endX]);
  const translateY = interpolate(progress, [0, 1], [kenBurns.startY, kenBurns.endY]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Img
        src={staticFile(photo.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`,
        }}
      />
    </AbsoluteFill>
  );
};
