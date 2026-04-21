import type { CSSProperties, ReactNode } from "react";
import type { QuickActionId } from "../tokens";

interface ActionGlyphProps {
  actionId: QuickActionId;
  color?: string;
  size?: number;
  style?: CSSProperties;
}

function Glyph({
  children,
  color = "currentColor",
  size = 20,
  style,
}: {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

export function ActionGlyph({ actionId, color, size = 20, style }: ActionGlyphProps) {
  switch (actionId) {
    case "surface-alert":
      return (
        <Glyph color={color} size={size} style={style}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 4.5v3.5" />
          <path d="M19.5 12H16" />
          <path d="M12 19.5V16" />
          <path d="M4.5 12H8" />
          <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
        </Glyph>
      );
    case "dispatch-scout":
    case "confirm-incident":
    case "open-verification":
      return (
        <Glyph color={color} size={size} style={style}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="3.5" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
          <circle cx="12" cy="12" r="2.25" fill="currentColor" stroke="none" />
        </Glyph>
      );
    case "monitor-only":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" />
          <circle cx="12" cy="12" r="2.75" />
        </Glyph>
      );
    case "deploy-survey":
      return (
        <Glyph color={color} size={size} style={style}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 4.5v2.5" />
          <path d="M19.5 12H17" />
          <path d="M12 19.5V17" />
          <path d="M4.5 12H7" />
        </Glyph>
      );
    case "stage-perimeter":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M4 9.5h16" />
          <path d="M4 14.5h16" />
          <path d="M7.5 7l2 5" />
          <path d="M12 7l-2 5" />
          <path d="M14.5 12l2 5" />
          <path d="M9.5 12l-2 5" />
        </Glyph>
      );
    case "stage-responder-guidance":
    case "deploy-navigation-drone":
      return (
        <Glyph color={color} size={size} style={style}>
          <circle cx="6.5" cy="7" r="1.5" />
          <circle cx="17.5" cy="17" r="1.5" />
          <path d="M8 7h5c1.2 0 2.2 1 2.2 2.2v1.1" />
          <path d="M15.2 14.5v-1.2c0-1.2 1-2.2 2.2-2.2H20" />
          <path d="M10 15h5" />
        </Glyph>
      );
    case "stage-residential-evacuation":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M6 13V9l11-4v14l-11-4Z" />
          <path d="M6 12H3.5" />
          <path d="M18.5 9.5c1 .9 1.5 1.7 1.5 2.5s-.5 1.6-1.5 2.5" />
        </Glyph>
      );
    case "relay-field-intel":
      return (
        <Glyph color={color} size={size} style={style}>
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <path d="M8.5 8.5a5 5 0 0 0 0 7" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M5.2 5.2a9.2 9.2 0 0 0 0 13.6" />
          <path d="M18.8 5.2a9.2 9.2 0 0 1 0 13.6" />
        </Glyph>
      );
    case "notify-authorities":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M12 4v11" />
          <path d="M8 9l4-5 4 5" />
          <path d="M6.5 20h11" />
          <path d="M8.5 15.5h7" />
        </Glyph>
      );
    case "notify-teams":
      return (
        <Glyph color={color} size={size} style={style}>
          <rect x="8" y="4.5" width="8" height="15" rx="2" />
          <path d="M10.5 7.5h3" />
          <path d="M10.5 11.5h3" />
          <path d="M11.5 15.5h1" />
          <path d="M7 8.5H5.5" />
          <path d="M18.5 8.5H17" />
        </Glyph>
      );
    case "mark-high-risk":
    case "emergency-evacuate":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M12 4.5 20 18H4L12 4.5Z" />
          <path d="M12 9v4.8" />
          <circle cx="12" cy="16.7" r="1" fill="currentColor" stroke="none" />
        </Glyph>
      );
    case "override-plan":
    case "open-degraded":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M4 6.5h16" />
          <path d="M4 12h10" />
          <path d="M4 17.5h16" />
          <path d="m16 9 4 3-4 3" />
        </Glyph>
      );
    case "authorize-containment":
    case "stand-down":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M12 4.5 18 6.7v5c0 4-2.2 6.7-6 8.8-3.8-2.1-6-4.8-6-8.8v-5l6-2.2Z" />
          {actionId === "authorize-containment" ? (
            <path d="m9.4 12.6 1.8 1.8 3.6-3.9" />
          ) : null}
        </Glyph>
      );
    case "activate-automatic-route":
      return (
        <Glyph color={color} size={size} style={style}>
          <circle cx="6.5" cy="17" r="1.4" />
          <circle cx="17.5" cy="7" r="1.4" />
          <path d="M8 16.2c3.8 0 5.2-1.6 6.3-3.2 1-1.5 1.8-2.6 4.7-2.6" />
          <path d="m15.5 5.2 2 1.8-2 1.8" />
        </Glyph>
      );
    case "deploy-backup":
      return (
        <Glyph color={color} size={size} style={style}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </Glyph>
      );
    case "acknowledge-exception":
      return (
        <Glyph color={color} size={size} style={style}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5v6" />
          <circle cx="12" cy="16.8" r="1" fill="currentColor" stroke="none" />
        </Glyph>
      );
    case "abort-mission":
      return (
        <Glyph color={color} size={size} style={style}>
          <path d="M12 5.5v8.5" />
          <circle cx="12" cy="18.2" r="1.3" fill="currentColor" stroke="none" />
        </Glyph>
      );
  }
}
