import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { M2CS_BUILD_SPEC } from "../data/m2cs-build-spec";

const TRIBE_RED = "#ED1C24";
const FONT_FAMILY = "Futura, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface BuildSpecProps {
  title?: string;
  subtitle?: string;
  items?: string[];
}

export const BuildSpec: React.FC<BuildSpecProps> = ({
  title = "BMW M2 CS",
  subtitle = "BUILD SPEC",
  items = M2CS_BUILD_SPEC,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const springAt = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 18, stiffness: 120, mass: 0.8 },
    });

  const titleProgress = springAt(0);
  const subtitleProgress = springAt(5);
  const dividerProgress = springAt(10);
  const footerProgress = springAt(60);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "black",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 72px",
      }}
    >
      <div style={{ width: "100%", textAlign: "center" }}>
        {/* Title */}
        <div
          style={{
            color: "white",
            fontSize: 52,
            fontWeight: 700,
            fontFamily: FONT_FAMILY,
            letterSpacing: 3,
            marginBottom: 8,
            opacity: titleProgress,
            transform: `translateY(${interpolate(titleProgress, [0, 1], [-15, 0])}px)`,
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            color: TRIBE_RED,
            fontSize: 40,
            fontWeight: 500,
            fontFamily: FONT_FAMILY,
            letterSpacing: 6,
            marginBottom: 24,
            opacity: subtitleProgress,
            transform: `translateY(${interpolate(subtitleProgress, [0, 1], [-15, 0])}px)`,
          }}
        >
          {subtitle}
        </div>

        {/* Gold divider */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 36,
          }}
        >
          <div
            style={{
              width: 200,
              height: 1,
              backgroundColor: TRIBE_RED,
              opacity: 0.4,
              transform: `scaleX(${dividerProgress})`,
            }}
          />
        </div>

        {/* Parts list */}
        <div style={{ textAlign: "left", display: "inline-block" }}>
          {items.map((item, i) => {
            const itemProgress = springAt(15 + i * 3);
            return (
              <div
                key={i}
                style={{
                  color: "white",
                  fontSize: 32,
                  fontWeight: 400,
                  fontFamily: FONT_FAMILY,
                  lineHeight: "46px",
                  whiteSpace: "pre-line",
                  marginBottom: 4,
                  opacity: itemProgress,
                  transform: `translateX(${interpolate(itemProgress, [0, 1], [-10, 0])}px)`,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            color: "white",
            fontSize: 26,
            fontWeight: 500,
            fontFamily: FONT_FAMILY,
            letterSpacing: 1,
            marginTop: 40,
            opacity: interpolate(footerProgress, [0, 1], [0, 0.6]),
          }}
        >
          @tribeshipping
        </div>
      </div>
    </AbsoluteFill>
  );
};
