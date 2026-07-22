import type { CSSProperties } from "react";

export interface TalonMarkProps {
  color: string;
  size?: number;
  style?: CSSProperties;
  title?: string;
  decorative?: boolean;
}

/**
 * Three source vectors converge on a guarded decision centre. The mark is
 * intentionally single-colour so its perimeter can carry the session state.
 */
export function TalonMark({
  color,
  size = 32,
  style,
  title = "TALON convergence gate",
  decorative = false,
}: TalonMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      color={color}
      style={style}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
    >
      <path
        d="M5 8h9l7 10M24 4v13M43 8h-9l-7 10"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 12 9 8l5-4M20 8l4-4 4 4M34 4l5 4-5 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".72"
      />
      <path
        d="M24 17 33 22v8.5c0 6.1-3.6 10.2-9 13-5.4-2.8-9-6.9-9-13V22l9-5Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="28" r="2.4" fill="currentColor" />
      <path
        d="M20.5 34.5h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
