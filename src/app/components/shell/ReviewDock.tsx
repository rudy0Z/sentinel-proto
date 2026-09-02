import type { SceneId } from "../../tokens";
import { T, border, font, layer, material, radius, space, surface, tint, tracking, typeScale, typeWeight } from "../../tokens";
import { REVIEW_SCENES } from "../../mockData";

export function ReviewDock({
  open,
  activeScene,
  bottomOffset,
  rightOffset,
  onToggle,
  onJumpToScene,
}: {
  open: boolean;
  activeScene: SceneId;
  bottomOffset: number;
  rightOffset: number;
  onToggle: () => void;
  onJumpToScene: (scene: SceneId) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomOffset,
        right: rightOffset,
        width: open ? 232 : "auto",
        maxHeight: open ? 420 : "auto",
        zIndex: layer.popover,
        ...material.popover,
        overflow: "hidden",
        transition: "width 180ms ease, max-height 180ms ease",
      }}
      role="complementary"
      aria-label="Prototype review dock"
    >
      <div
        style={{
          padding: open ? `${space.sm}px ${space.md}px ${space.sm}px` : `${space.sm}px ${space.md}px`,
          borderBottom: open ? `1px solid ${border.strong}` : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          gap: space.sm,
        }}
      >
        {open ? (
          <div>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: T.textPrimary }}>Review Dock</div>
            <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, marginTop: 1 }}>Prototype only · {REVIEW_SCENES.length} scenes</div>
          </div>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: space.xs, fontFamily: font.mono, fontSize: typeScale.label, color: T.cyan, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>
            {/* A muted grey "Review" label was reading as inert chrome against a dark
                map corner — the operator's own report was "I can't find this anywhere."
                Cyan + a small glyph makes it read as a live control, not furniture,
                without turning a dev utility into a product feature. */}
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M4.5 5h5M4.5 7.2h5M4.5 9.4h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Scenes
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Collapse review dock" : "Expand review dock"}
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.control,
            border: `1px solid ${open ? border.strong : tint(T.cyan, 0.4)}`,
            background: open ? surface.control : tint(T.cyan, 0.12),
            color: open ? T.textSecondary : T.cyan,
            cursor: "pointer",
            fontSize: typeScale.brand,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {open ? "–" : "+"}
        </button>
      </div>

      {open ? (
        <div style={{ padding: space.sm, display: "flex", flexDirection: "column", gap: space.sm, overflowY: "auto", maxHeight: 360 }}>
          {REVIEW_SCENES.map((scene) => {
            const active = scene.id === activeScene;
            return (
              <button
                type="button"
                key={scene.id}
                onClick={() => onJumpToScene(scene.id)}
                aria-label={`Jump to ${scene.label} scene${active ? " (current)" : ""}`}
                aria-current={active ? "true" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: radius.tile,
                  border: `1px solid ${active ? tint(T.cyan, 0.33) : border.default}`,
                  background: active ? tint(T.cyan, 0.14) : surface.control,
                  padding: `${space.sm}px ${space.sm}px`,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontFamily: font.sans, fontSize: typeScale.label, fontWeight: typeWeight.semibold, color: active ? T.cyan : T.textPrimary }}>{scene.label}</div>
                <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted, lineHeight: 1.35, marginTop: space.xs }}>{scene.note}</div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
