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
          <span style={{ fontFamily: font.mono, fontSize: typeScale.label, color: T.textMuted, letterSpacing: tracking.telemetry, textTransform: "uppercase" }}>Review</span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Collapse review dock" : "Expand review dock"}
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.control,
            border: `1px solid ${border.strong}`,
            background: surface.control,
            color: T.textSecondary,
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
