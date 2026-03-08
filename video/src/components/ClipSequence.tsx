import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import type { Clip } from "../data/m2cs-clips";

export const ClipSequence: React.FC<{ clip: Clip }> = ({ clip }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo
        src={staticFile(clip.src)}
        startFrom={clip.startFrom}
        volume={0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
};
