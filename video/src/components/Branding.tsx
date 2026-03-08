import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Branding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo scales up + fades in
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.8 },
  });

  // Text follows 8 frames later
  const textProgress = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });

  const logoScale = interpolate(enterProgress, [0, 1], [0.85, 1]);
  const logoOpacity = enterProgress;

  const textY = interpolate(textProgress, [0, 1], [20, 0]);
  const textOpacity = Math.max(0, textProgress);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        <Img
          src={staticFile("logo/youtube300.png")}
          style={{
            width: 240,
            height: 240,
            objectFit: "contain",
          }}
        />
      </div>
      <div
        style={{
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
          color: "white",
          fontSize: 32,
          fontFamily:
            "Futura, 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontWeight: 500,
          letterSpacing: 1,
          marginTop: 16,
        }}
      >
        @tribeshipping
      </div>
    </AbsoluteFill>
  );
};
