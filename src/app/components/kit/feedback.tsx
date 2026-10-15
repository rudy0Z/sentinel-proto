/*
 * ─── Obsidian-glass kit: feedback primitives ────────────────────────────────
 * Redesign 2026 (docs/redesign-2026/04 §2, §5).
 *   TranscriptBars — elevenlabs-ui bar-visualizer, CSS port (no canvas —
 *                    vault 09's no-canvas-stacking law holds).
 *   UndoToast      — sonner pattern, re-tokenized; carries "opened by TALON ·
 *                    undo" receipts for intent pops (doc 03 R6).
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { T, border, font, materialGlass, motion, radius, space, tracking, typeStyle, typeWeight, tint } from "../../tokens";
import { PanelGlass } from "./core";

/* ─── TranscriptBars — voice visualizer (CSS only) ────────────────────────── */

export function TranscriptBars({
  active,
  bars = 24,
  tone = T.cyan,
  height = 22,
}: {
  active: boolean;
  bars?: number;
  tone?: string;
  height?: number;
}) {
  return (
    <div
      role="img"
      aria-label={active ? "TALON voice active" : "TALON voice idle"}
      style={{ display: "flex", alignItems: "center", gap: 2, height }}
    >
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          data-kit-anim={active ? "true" : undefined}
          style={{
            width: 2,
            height: active ? height : 2,
            borderRadius: radius.pill,
            background: tone,
            opacity: active ? 0.85 : 0.3,
            transformOrigin: "center",
            animation: active ? `kitWave ${0.9 + (i % 5) * 0.13}s ease-in-out ${(i % 7) * 0.06}s infinite` : undefined,
            transition: `height ${motion.normal}, opacity ${motion.normal}`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── UndoToast — reversible-action receipt (sonner pattern) ──────────────── */

export interface ToastState {
  id: string;
  text: string;
  onUndo?: () => void;
  /** Auto-dismiss ms; 0 keeps until dismissed. */
  ttlMs?: number;
}

export function UndoToast({
  toast,
  onDismiss,
  bottomOffset = 112,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
  bottomOffset?: number;
}) {
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(timerRef.current);
    if (toast?.ttlMs) {
      timerRef.current = window.setTimeout(onDismiss, toast.ttlMs);
    }
    return () => window.clearTimeout(timerRef.current);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div
      role="status"
      data-kit-anim="true"
      style={{
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: bottomOffset,
        zIndex: 70,
        animation: "kitRise 200ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      <PanelGlass
        variant="raised"
        padding={`${space.md}px ${space.lg}px`}
        style={{ display: "flex", alignItems: "center", gap: space.lg, maxWidth: 520 }}
      >
        <span style={{ fontFamily: font.sans, fontSize: typeStyle.body.size, color: T.textSecondary }}>{toast.text}</span>
        {toast.onUndo ? (
          <button
            type="button"
            onClick={() => {
              toast.onUndo?.();
              onDismiss();
            }}
            style={{
              fontFamily: font.sans,
              fontSize: typeStyle.control.size,
              fontWeight: typeWeight.semibold,
              color: T.cyan,
              background: tint(T.cyan, 0.10),
              border: `1px solid tint(T.cyan, 0.45)`,
              borderRadius: radius.control,
              padding: `${space.xs + 2}px ${space.md}px`,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Undo
          </button>
        ) : null}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            color: T.textMuted,
            fontFamily: font.mono,
            fontSize: typeStyle.metadata.size,
            cursor: "pointer",
            padding: `${space.xs}px ${space.sm}px`,
            minWidth: 28,
            minHeight: 28,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </PanelGlass>
    </div>
  );
}
