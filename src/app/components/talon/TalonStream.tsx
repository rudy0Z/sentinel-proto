import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Word-by-word reveal for TALON's replies.
 *
 * A synthesized answer that appears as one block reads as a lookup; the same
 * answer arriving progressively reads as reasoning. That difference matters
 * here because TALON's credibility is the product — but the motion is
 * deliberately *fast and monotone*, not a typewriter gimmick: this is an
 * emergency instrument, and an operator must never wait on an animation to
 * read a recommendation.
 *
 * Contract:
 *  - Text is fully present in the DOM for assistive tech from the first frame
 *    (the reveal is opacity-only), so streaming never delays a screen reader.
 *  - `prefers-reduced-motion` renders instantly and completely.
 *  - Re-keying on new text restarts cleanly; unmount cancels.
 */
const WORD_INTERVAL_MS = 26;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface TalonStreamProps {
  text: string;
  /** When false the text is shown complete with no reveal. */
  stream?: boolean;
  className?: string;
}

export function TalonStream({ text, stream = true, className }: TalonStreamProps) {
  /* Keep whitespace as its own token so spacing survives the split. */
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const wordCount = tokens.length;
  const instant = !stream || prefersReducedMotion();

  const [revealed, setRevealed] = useState(instant ? wordCount : 0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (instant) {
      setRevealed(wordCount);
      return;
    }
    setRevealed(0);
    let i = 0;
    const tick = () => {
      i += 1;
      setRevealed(i);
      if (i < wordCount) {
        timerRef.current = window.setTimeout(tick, WORD_INTERVAL_MS);
      } else {
        timerRef.current = null;
      }
    };
    timerRef.current = window.setTimeout(tick, WORD_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [text, instant, wordCount]);

  const streaming = revealed < wordCount;

  return (
    <span className={className}>
      {tokens.map((token, index) => (
        <span
          key={`${index}-${token}`}
          className="talon-stream__word"
          data-shown={index < revealed ? "true" : "false"}
        >
          {token}
        </span>
      ))}
      {streaming ? <span className="talon-stream__caret" aria-hidden="true" /> : null}
    </span>
  );
}
