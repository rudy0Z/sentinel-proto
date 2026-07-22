import {
  forwardRef,
  useEffect,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import {
  border,
  layer,
  motion,
  radius,
  shadow,
  surface,
} from "../../tokens";

interface PopoverSurfaceProps {
  children: ReactNode;
  ariaLabel: string;
  width?: number;
  origin?: "top-left" | "top-right";
  style?: CSSProperties;
}

export const PopoverSurface = forwardRef<HTMLDivElement, PopoverSurfaceProps>(
  function PopoverSurface(
    {
      children,
      ariaLabel,
      width = 280,
      origin = "top-right",
      style,
    },
    ref,
  ) {
    return (
      <>
        <style>{`
          @keyframes sentinelPopoverIn {
            from { opacity: 0; transform: translateY(-4px) scale(0.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-sentinel-popover] { animation: none !important; }
          }
        `}</style>
        <div
          ref={ref}
          data-sentinel-popover
          role="region"
          aria-label={ariaLabel}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: layer.popover,
            width,
            maxWidth: "calc(100vw - 32px)",
            background: surface.overlay,
            border: `1px solid ${border.default}`,
            borderRadius: radius.overlay,
            boxShadow: shadow.quiet,
            overflow: "hidden",
            transformOrigin: origin,
            animation: `sentinelPopoverIn ${motion.normal} both`,
            ...style,
          }}
        >
          {children}
        </div>
      </>
    );
  },
);

interface PopoverDismissalOptions {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement>;
  surfaceRef: RefObject<HTMLElement>;
}

export function usePopoverDismissal({
  open,
  onClose,
  triggerRef,
  surfaceRef,
}: PopoverDismissalOptions) {
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (surfaceRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      onClose();
      const interactiveTarget =
        target instanceof Element
          ? target.closest("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])")
          : null;
      if (!interactiveTarget) {
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, surfaceRef, triggerRef]);
}
