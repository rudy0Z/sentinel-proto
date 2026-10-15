import { useCallback, useEffect, useId, useRef, useState } from "react";
import type {
  TalonConversationChangeHandler,
  TalonConversationState,
  TalonSessionRecommendation,
} from "../../tokens";
import { TALON_SESSION_TIMING, T, border, radius, shadow, surface } from "../../tokens";
import {
  cancelTalonConversation,
  getTalonChipResponse,
  getTalonSessionView,
  updateTalonConversation,
} from "../../domain/talon";
import { TALON_CHIP_PROMPTS } from "../../domain/microcopy";
import { TalonMark, markStateForPhase, type TalonMarkState } from "./TalonMark";
import { TalonStream } from "./TalonStream";
import "./talon.css";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export interface TalonSessionContext {
  recommendation: TalonSessionRecommendation;
  statusLabel?: string;
  detail?: string;
  defaultTranscript?: string;
  scriptedReply?: string;
  /*
   * What the mark should say when no session is running. Without this the mark
   * sits at `watching` in every scene and the aperture becomes decoration —
   * it would only ever animate if you talked to TALON. The product state is
   * itself a TALON state: if the incident is parked on a human gate, the
   * aperture should be closed whether or not anyone opened the session.
   */
  ambientMarkState?: TalonMarkState;
  /**
   * The incident-derived ring tone from deriveTalonSurface. While the session
   * is only watching, the orb speaks for the INCIDENT — not for an idle
   * conversation — so the ring carries the same color as the voice panel
   * instead of a constant idle cyan.
   */
  ambientTone?: string;
  /**
   * Continuity: the posture the ambient voice was stating before the session
   * opened. The session renders it as its header so opening TALON never erases
   * what TALON was saying.
   */
  postureLabel?: string;
  postureLine?: string;
  /** Suggested questions for this scene (from SCENE_CHIPS_MAP). */
  chips?: Array<{ id: string; label: string }>;
}

export interface TalonSessionProps {
  conversation: TalonConversationState;
  context: TalonSessionContext;
  onConversationChange?: TalonConversationChangeHandler;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  variant?: "command" | "compact" | "modal" | "floating";
  legacyMode?: boolean;
}

function stateColor(conversation: TalonConversationState, fallback: string): string {
  const { phase } = getTalonSessionView(conversation);
  if (phase === "input" || phase === "review") return T.talonListening;
  if (phase === "checking" || phase === "executing") return T.talonProcessing;
  if (phase === "recommendation" || phase === "human-gate" || phase === "receipt") {
    return T.talonResponded;
  }
  if (phase === "error") return T.red;
  return fallback || T.talonIdle;
}

function stateLabel(conversation: TalonConversationState): string {
  const { phase, inputMode } = getTalonSessionView(conversation);
  const labels = {
    watching: "Watching",
    input: inputMode === "typed" ? "Typing command" : "Listening",
    review: "Review transcript",
    checking: "Checking evidence",
    recommendation: "Recommendation ready",
    "human-gate": "Human approval required",
    executing: "Supervised execution",
    receipt: "Receipt written",
    error: "Session error",
    cancelled: "Input cancelled",
  } satisfies Record<typeof phase, string>;
  return labels[phase];
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="m3 5 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckingIcon() {
  return (
    <svg className="talon-session__activity" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2a8 8 0 1 1-5.66 2.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TalonSession({
  conversation,
  context,
  onConversationChange,
  expanded = false,
  onExpandedChange,
  variant = "command",
  legacyMode = false,
}: TalonSessionProps) {
  const transcriptId = useId();
  const [speechSupported, setSpeechSupported] = useState(false);
  const [draftTranscript, setDraftTranscript] = useState(conversation.transcript ?? "");
  const latestConversation = useRef(conversation);
  const draftRef = useRef(draftTranscript);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const manualStopRef = useRef(false);
  /*
   * The authored reply for the chip currently being answered. Kept in a ref so
   * `completeRecommendation` can surface the chip's response without threading
   * it through the shared conversation state.
   */
  const chipReplyRef = useRef<{ title: string; body: string } | null>(null);

  const view = getTalonSessionView(conversation);
  /*
   * While no session work is running, the orb reports the INCIDENT via the
   * derived surface tone (gate amber, failure red, watch cyan). Session phases
   * — input, checking, recommendation — override with their own state colors,
   * because then the orb is reporting the conversation, not the incident.
   */
  const color =
    (view.phase === "watching" || view.phase === "cancelled") && context.ambientTone
      ? context.ambientTone
      : stateColor(conversation, T.talonIdle);
  const isBusy = view.phase === "input" || view.phase === "review" || view.phase === "checking" || view.phase === "executing";
  const canWriteSession = Boolean(onConversationChange);

  useEffect(() => {
    latestConversation.current = conversation;
    if (conversation.transcript !== undefined) {
      setDraftTranscript(conversation.transcript);
      draftRef.current = conversation.transcript;
    }
  }, [conversation]);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    setSpeechSupported(Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.abort();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const emit = useCallback(
    (patch: Partial<TalonConversationState>) => {
      const next = updateTalonConversation(latestConversation.current, patch);
      latestConversation.current = next;
      onConversationChange?.(next);
    },
    [onConversationChange],
  );

  const clearActiveWork = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const cancelSession = useCallback(() => {
    clearActiveWork();
    const next = cancelTalonConversation(latestConversation.current);
    latestConversation.current = next;
    onConversationChange?.(next);
  }, [clearActiveWork, onConversationChange]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onExpandedChange?.(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => window.removeEventListener("pointerdown", handlePointerDown, true);
  }, [expanded, onExpandedChange]);

  useEffect(() => {
    if (!expanded && variant !== "modal") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        /* Window-CAPTURE: this outranks every bubble-phase handler, including the
         * ActionModal's own Escape. When a command modal is open, the modal owns
         * Escape for its lifetime. Without this guard an expanded session behind
         * a modal swallows the key and the operator cannot dismiss the dialog. */
        if (document.querySelector('[role="dialog"]')) return;
        event.preventDefault();
        event.stopPropagation();
        if (isBusy) {
          cancelSession();
        } else {
          onExpandedChange?.(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [cancelSession, expanded, isBusy, onExpandedChange, variant]);

  const completeRecommendation = useCallback(() => {
    const answer = chipReplyRef.current;
    chipReplyRef.current = null;
    const recommendation = {
      ...context.recommendation,
      title: answer?.title ?? context.recommendation.title,
      body: answer?.body ?? context.scriptedReply ?? context.recommendation.body,
      // A chip answer is complete on its own; the scene's evidence list reads
      // as noise under it.
      evidence: answer ? [] : context.recommendation.evidence,
    };
    emit({
      phase: recommendation.requiresHumanGate ? "human-gate" : "recommendation",
      inputMode: null,
      interimTranscript: "",
      recommendation,
      error: null,
      confirmedPhase: recommendation.requiresHumanGate ? "human-gate" : "recommendation",
      contextActionId: recommendation.actionId ?? null,
    });
  }, [context.recommendation, context.scriptedReply, emit]);

  const scheduleRecommendation = useCallback(() => {
    emit({ phase: "checking", interimTranscript: "", error: null });
    const timer = setTimeout(completeRecommendation, TALON_SESSION_TIMING.evidenceCheck);
    timersRef.current.push(timer);
  }, [completeRecommendation, emit]);

  const runScriptedFallback = useCallback(() => {
    if (!canWriteSession) return;
    clearActiveWork();
    chipReplyRef.current = null;
    const transcript =
      context.defaultTranscript ??
      "TALON, brief me on the current picture.";
    setDraftTranscript(transcript);
    draftRef.current = transcript;
    emit({
      phase: "input",
      inputMode: "scripted",
      transcript,
      interimTranscript: "",
      scriptedFallback: true,
      error: null,
      contextActionId: context.recommendation.actionId ?? null,
    });
    const captureTimer = setTimeout(scheduleRecommendation, TALON_SESSION_TIMING.scriptedCapture);
    timersRef.current.push(captureTimer);
  }, [canWriteSession, clearActiveWork, context.defaultTranscript, context.recommendation, emit, scheduleRecommendation]);

  /*
   * A suggested question runs as a first-class conversation turn: the operator
   * "asks" the chip's question in their own voice, and TALON answers with the
   * authored response for that question — not a repurposed recommendation.
   */
  const runChipQuestion = useCallback(
    (chipId: string) => {
      if (!canWriteSession) return;
      clearActiveWork();
      const response = getTalonChipResponse(chipId as never);
      chipReplyRef.current = { title: response.title, body: response.body };
      const transcript = TALON_CHIP_PROMPTS[chipId as never];
      setDraftTranscript(transcript);
      draftRef.current = transcript;
      emit({
        phase: "input",
        inputMode: "scripted",
        transcript,
        interimTranscript: "",
        scriptedFallback: true,
        error: null,
        contextActionId: context.recommendation.actionId ?? null,
      });
      const captureTimer = setTimeout(scheduleRecommendation, TALON_SESSION_TIMING.scriptedCapture);
      timersRef.current.push(captureTimer);
    },
    [canWriteSession, clearActiveWork, context.recommendation.actionId, emit, scheduleRecommendation],
  );

  const startTypedInput = useCallback(() => {
    if (!canWriteSession) return;
    clearActiveWork();
    chipReplyRef.current = null;
    const transcript = draftRef.current || context.defaultTranscript || "";
    setDraftTranscript(transcript);
    draftRef.current = transcript;
    emit({
      phase: "input",
      inputMode: "typed",
      transcript,
      interimTranscript: "",
      scriptedFallback: false,
      error: null,
      contextActionId: context.recommendation.actionId ?? null,
    });
  }, [canWriteSession, clearActiveWork, context.defaultTranscript, context.recommendation.actionId, emit]);

  const startVoiceInput = useCallback(() => {
    if (!canWriteSession) return;
    if (legacyMode || !speechSupported) {
      runScriptedFallback();
      return;
    }

    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      runScriptedFallback();
      return;
    }

    clearActiveWork();
    chipReplyRef.current = null;
    manualStopRef.current = false;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    emit({
      phase: "input",
      inputMode: "voice",
      transcript: draftRef.current,
      interimTranscript: "",
      scriptedFallback: false,
      error: null,
      contextActionId: context.recommendation.actionId ?? null,
    });

    recognition.onresult = (event) => {
      let finalText = draftRef.current;
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result) continue;
        if (result.isFinal) {
          finalText = `${finalText} ${result[0].transcript}`.trim();
        } else {
          interimText += result[0].transcript;
        }
      }
      setDraftTranscript(finalText);
      draftRef.current = finalText;
      emit({ transcript: finalText, interimTranscript: interimText });
    };

    recognition.onerror = (event) => {
      recognitionRef.current = null;
      emit({
        phase: draftRef.current ? "review" : "error",
        transcript: draftRef.current,
        interimTranscript: "",
        error: draftRef.current ? null : `Speech capture stopped (${event.error}). Type your command instead.`,
      });
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (manualStopRef.current) return;
      emit({
        phase: draftRef.current ? "review" : "error",
        transcript: draftRef.current,
        interimTranscript: "",
        error: draftRef.current ? null : "No speech was captured. Type your command instead.",
      });
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      emit({
        phase: "error",
        error: "Speech capture is unavailable here. Type your command instead.",
      });
    }
  }, [
    canWriteSession,
    clearActiveWork,
    context.recommendation.actionId,
    emit,
    legacyMode,
    runScriptedFallback,
    speechSupported,
  ]);

  const stopVoiceInput = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    emit({
      phase: draftRef.current ? "review" : "error",
      transcript: draftRef.current,
      interimTranscript: "",
      error: draftRef.current ? null : "No speech was captured. Type your command instead.",
    });
  }, [emit]);

  const saveDraft = (value: string) => {
    setDraftTranscript(value);
    draftRef.current = value;
    emit({ transcript: value, interimTranscript: "" });
  };

  const reviewTypedInput = () => {
    if (!draftTranscript.trim()) {
      emit({ phase: "error", error: "Enter a command before review." });
      return;
    }
    emit({ phase: "review", transcript: draftTranscript.trim(), error: null });
  };

  /*
   * One resolution point for the mark. An active session always wins — if the
   * operator is talking to TALON, that is the truth. Only when the session is
   * idle does the mark fall back to what the incident itself is waiting on.
   */
  const markState: TalonMarkState =
    view.phase === "watching" && context.ambientMarkState
      ? context.ambientMarkState
      : markStateForPhase(view.phase);

  const status = stateLabel(conversation);
  const detail =
    view.phase === "watching"
      ? context.detail ?? context.recommendation.body
      : view.phase === "human-gate"
        ? context.recommendation.actionLabel
        : view.phase === "receipt"
          ? conversation.receipt?.summary ?? "Supervised action recorded"
          : view.interimTranscript || context.statusLabel || context.recommendation.title;

  const handlePrimaryControl = () => {
    if (variant === "compact") {
      startVoiceInput();
      return;
    }
    onExpandedChange?.(!expanded);
  };

  return (
    <div
      ref={containerRef}
      className={`talon-session talon-session--${variant}`}
      style={{
        "--talon-state": color,
        "--talon-overlay": surface.overlay,
        "--talon-panel": surface.panel,
        "--talon-control": surface.control,
        "--talon-inset": surface.inset,
        "--talon-border": border.default,
        "--talon-border-strong": border.strong,
        "--talon-radius-overlay": `${radius.overlay}px`,
        "--talon-radius": `${radius.control}px`,
        "--talon-radius-panel": `${radius.panel}px`,
        "--talon-radius-tile": `${radius.tile}px`,
        "--talon-shadow": shadow.edgeOverlay,
        "--talon-shadow-quiet": shadow.edgePopover,
        "--talon-text": T.textPrimary,
        "--talon-text-secondary": T.textSecondary,
      } as React.CSSProperties}
    >
      {variant === "floating" ? (
        <button
          type="button"
          className="talon-session__orb"
          onClick={() => onExpandedChange?.(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? "Close TALON session" : "Open TALON session"}
          title={`TALON · ${status}`}
        >
          {view.phase === "input" ? <span className="talon-session__orb-ripple" aria-hidden="true" /> : null}
          <TalonMark color="currentColor" size={28} decorative state={markState} />
        </button>
      ) : null}

      {variant !== "modal" && variant !== "floating" ? (
        <div className="talon-session__control">
          <button
            type="button"
            className="talon-session__mark-button"
            onClick={handlePrimaryControl}
            aria-label={
              variant === "compact"
                ? speechSupported && !legacyMode
                  ? "Speak to TALON"
                  : "Ask TALON for a brief"
                : expanded
                  ? "Close TALON session"
                  : "Open TALON session"
            }
            disabled={variant === "compact" && isBusy}
          >
            <TalonMark color="currentColor" size={36} decorative state={markState} />
          </button>
          <div className="talon-session__summary" aria-live="polite">
            <div className="talon-session__name">TALON · {status}</div>
            <div className="talon-session__status">{context.recommendation.title}</div>
            <div className="talon-session__detail">{detail}</div>
          </div>
          <button
            type="button"
            className="talon-session__toggle"
            onClick={() => onExpandedChange?.(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide TALON session details" : "Show TALON session details"}
          >
            <ChevronIcon />
          </button>
        </div>
      ) : null}

      {(expanded || variant === "modal") ? (
        <section className="talon-session__surface" aria-label="TALON command session">
          <div className="talon-session__surface-header">
            <div className="talon-session__status-row">
              <TalonMark color={color} size={28} state={markState} />
              <div>
                <div className="talon-session__name">{context.postureLabel ?? "TALON session"}</div>
                <div className="talon-session__detail" role="status" aria-live="polite">
                  {view.phase === "watching" || view.phase === "cancelled"
                    ? context.postureLine ?? status
                    : status}
                </div>
              </div>
            </div>
            {view.phase === "checking" || view.phase === "executing" ? <CheckingIcon /> : null}
          </div>

          <div className="talon-session__body">
            {view.phase === "watching" || view.phase === "cancelled" || view.phase === "error" ? (
              <>
                <p className="talon-session__copy">
                  <strong>{context.recommendation.title}.</strong> {context.recommendation.body}
                </p>
                {view.error ? <div className="talon-session__notice" role="alert">{view.error}</div> : null}
                {!canWriteSession ? (
                  <div className="talon-session__notice">
                    Session controls require the shared conversation callback from SentinelShell.
                  </div>
                ) : null}
                {context.chips?.length ? (
                  <div className="talon-session__chips">
                    {context.chips.slice(0, 3).map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        className="talon-session__chip"
                        onClick={() => runChipQuestion(chip.id)}
                        disabled={!canWriteSession}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="talon-session__actions">
                  <button type="button" className="talon-session__button talon-session__button--primary" onClick={startVoiceInput} disabled={!canWriteSession}>
                    {speechSupported && !legacyMode ? "Speak to TALON" : "Ask for a brief"}
                  </button>
                  <button type="button" className="talon-session__button" onClick={startTypedInput} disabled={!canWriteSession || legacyMode}>
                    Type command
                  </button>
                </div>
              </>
            ) : null}

            {view.phase === "input" ? (
              <>
                {view.inputMode === "voice" ? (
                  <>
                    <p className="talon-session__copy">
                      Speech capture is active. Stop to review the transcript before TALON checks it.
                    </p>
                    <div className="talon-session__notice">{draftTranscript || view.interimTranscript || "Listening for an operator command…"}</div>
                    <div className="talon-session__actions">
                      <button type="button" className="talon-session__button talon-session__button--primary" onClick={stopVoiceInput}>Stop and review</button>
                      <button type="button" className="talon-session__button" onClick={cancelSession}>Cancel input</button>
                    </div>
                  </>
                ) : view.inputMode === "scripted" ? (
                  <>
                    <p className="talon-session__copy">{draftTranscript}</p>
                    <button type="button" className="talon-session__button" onClick={cancelSession}>Cancel</button>
                  </>
                ) : (
                  <>
                    <label className="talon-session__meta" htmlFor={transcriptId}>Operator command</label>
                    <textarea
                      id={transcriptId}
                      className="talon-session__textarea"
                      value={draftTranscript}
                      onChange={(event) => saveDraft(event.target.value)}
                      placeholder="Describe the correction or question for TALON."
                      autoFocus
                    />
                    <div className="talon-session__actions">
                      <button type="button" className="talon-session__button talon-session__button--primary" onClick={reviewTypedInput}>Review command</button>
                      <button type="button" className="talon-session__button" onClick={cancelSession}>Cancel input</button>
                    </div>
                  </>
                )}
              </>
            ) : null}

            {view.phase === "review" ? (
              <>
                <label className="talon-session__meta" htmlFor={transcriptId}>Editable transcript review</label>
                <textarea
                  id={transcriptId}
                  className="talon-session__textarea"
                  value={draftTranscript}
                  onChange={(event) => saveDraft(event.target.value)}
                />
                <div className="talon-session__actions">
                  <button type="button" className="talon-session__button talon-session__button--primary" onClick={scheduleRecommendation} disabled={!draftTranscript.trim()}>
                    Check command
                  </button>
                  <button type="button" className="talon-session__button" onClick={startTypedInput}>Edit as typed input</button>
                  <button type="button" className="talon-session__button" onClick={cancelSession}>Cancel review</button>
                </div>
              </>
            ) : null}

            {view.phase === "checking" ? (
              <>
                <p className="talon-session__copy">
                  Checking the active evidence model, operating limits, and human authorization gate.
                </p>
                <button type="button" className="talon-session__button" onClick={cancelSession}>Cancel check</button>
              </>
            ) : null}

            {view.phase === "recommendation" || view.phase === "human-gate" ? (
              <>
                {/*
                  * The recommendation is TALON's answer — the one place a reply
                  * should read as arriving rather than appearing. Keyed on the
                  * body so a new answer restarts the reveal cleanly.
                  */}
                <p className="talon-session__copy">
                  <strong>{view.recommendation?.title ?? context.recommendation.title}.</strong>{" "}
                  <TalonStream
                    key={view.recommendation?.body ?? context.scriptedReply ?? context.recommendation.body}
                    text={view.recommendation?.body ?? context.scriptedReply ?? context.recommendation.body}
                  />
                </p>
                {(view.recommendation?.evidence ?? context.recommendation.evidence).length > 0 ? (
                  <ul className="talon-session__evidence">
                    {(view.recommendation?.evidence ?? context.recommendation.evidence).slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
                {(view.recommendation?.blocker ?? context.recommendation.blocker) ? (
                  <div className="talon-session__notice">
                    Blocker: {view.recommendation?.blocker ?? context.recommendation.blocker}
                  </div>
                ) : null}
                {view.phase === "human-gate" ? (
                  <div className="talon-session__notice">
                    Authorization is yours — the staged command on the command bar sends it.
                  </div>
                ) : null}
              </>
            ) : null}

            {view.phase === "executing" ? (
              <p className="talon-session__copy">Supervising the authorized action and waiting for an execution receipt.</p>
            ) : null}

            {view.phase === "receipt" ? (
              <>
                <div className="talon-session__notice">
                  <strong>{conversation.receipt?.id}</strong><br />
                  {conversation.receipt?.summary}
                </div>
                {/*
                 * A receipt closes a command, not the conversation — the session
                 * always offers a way back in.
                 */}
                <div className="talon-session__meta">Ask TALON something new</div>
                {context.chips?.length ? (
                  <div className="talon-session__chips">
                    {context.chips.slice(0, 3).map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        className="talon-session__chip"
                        onClick={() => runChipQuestion(chip.id)}
                        disabled={!canWriteSession}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="talon-session__actions">
                  <button type="button" className="talon-session__button talon-session__button--primary" onClick={startVoiceInput} disabled={!canWriteSession}>
                    {speechSupported && !legacyMode ? "Speak to TALON" : "Ask for a brief"}
                  </button>
                  <button type="button" className="talon-session__button" onClick={startTypedInput} disabled={!canWriteSession || legacyMode}>
                    Type command
                  </button>
                </div>
              </>
            ) : null}

          </div>
        </section>
      ) : null}
    </div>
  );
}
