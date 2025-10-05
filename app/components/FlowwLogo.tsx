// FlowwLogo.tsx
// React + Tailwind components for the Floww brand.
// - <FlowwWordmark/>: gradient script-like wordmark "Floww"
// - <FlowwIcon/>: square app icon with rounded corners and monoline "F"

import React, { useEffect } from "react";

/** Inject Google Font once (Pacifico). You can remove if you bundle fonts yourself. */
function useGoogleFont() {
  useEffect(() => {
    const id = "floww-font";
    if (document.getElementById(id)) return;
    const link1 = document.createElement("link");
    link1.id = id;
    link1.rel = "stylesheet";
    link1.href = "https://fonts.googleapis.com/css2?family=Pacifico&display=swap";
    document.head.appendChild(link1);
  }, []);
}

/** Brand colors */
const FLOWW_GRADIENT = {
  from: "#2D7CF7", // blue
  via: "#7A4FFF",  // indigo
  to: "#9E3BFF",   // purple
};

/**
 * FlowwWordmark — gradient text wordmark.
 *
 * Props:
 *  - size: number (px) font size height, default 56
 *  - weight: CSS font weight fallback for non-script fonts
 *  - className: Tailwind/extra classes
 */
export function FlowwWordmark({
  size = 56,
  weight = 600,
  className = "",
  title = "Floww",
}: {
  size?: number;
  weight?: number | string;
  className?: string;
  title?: string;
}) {
  useGoogleFont();
  return (
    <div
      role="img"
      aria-label={title}
      className={`inline-block select-none ${className}`}
      style={{
        fontFamily: '"Pacifico", "Kaushan Script", "Segoe Script", system-ui, cursive',
        fontSize: size,
        fontWeight: weight as any,
        lineHeight: 1.2,
        backgroundImage: `linear-gradient(90deg, ${FLOWW_GRADIENT.from}, ${FLOWW_GRADIENT.via}, ${FLOWW_GRADIENT.to})`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
        display: "inline-block",
        paddingBottom: size * 0.1,
        paddingLeft: size * 0.05,
        paddingRight: size * 0.05,
      }}
      title={title}
    >
      Floww
    </div>
  );
}

/**
 * FlowwIcon — scalable SVG app icon.
 * Designed as a rounded square with a monoline "F".
 *
 * Props:
 *  - size: number (px) — output size, default 160
 *  - radius: number — corner radius, default 56 (squircle-ish)
 *  - shadow: boolean — drop shadow, default true
 *  - title: accessible label
 */
export function FlowwIcon({
  size = 160,
  radius = 56,
  shadow = true,
  title = "Floww app icon",
  className = "",
}: {
  size?: number;
  radius?: number;
  shadow?: boolean;
  title?: string;
  className?: string;
}) {
  const id = React.useId();
  const gradId = `g-${id}`;
  const shadowId = `s-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={FLOWW_GRADIENT.from} />
          <stop offset="55%" stopColor={FLOWW_GRADIENT.via} />
          <stop offset="100%" stopColor={FLOWW_GRADIENT.to} />
        </linearGradient>
        {shadow && (
          <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.18" />
          </filter>
        )}
      </defs>

      {/* Background rounded square */}
      <rect
        x="8"
        y="8"
        width="240"
        height="240"
        rx={radius}
        fill={`url(#${gradId})`}
        filter={shadow ? `url(#${shadowId})` : undefined}
      />

      {/* Monoline F */}
      <path
        d="M88 192 V68 H172 M88 128 H152"
        fill="none"
        stroke="#ffffff"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
