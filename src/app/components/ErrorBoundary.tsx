import { Component, type ReactNode } from "react";
import { T, font, radius, border } from "../tokens";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: T.bgBase,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font.sans,
          gap: 24,
          padding: 32,
        }}
      >
        {/* Corner accents */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
          {[
            { top: 0, left: 0, borderTop: `2px solid ${T.red}`, borderLeft: `2px solid ${T.red}`, borderTopLeftRadius: radius.xl },
            { top: 0, right: 0, borderTop: `2px solid ${T.red}`, borderRight: `2px solid ${T.red}`, borderTopRightRadius: radius.xl },
            { bottom: 0, left: 0, borderBottom: `2px solid ${T.red}`, borderLeft: `2px solid ${T.red}`, borderBottomLeftRadius: radius.xl },
            { bottom: 0, right: 0, borderBottom: `2px solid ${T.red}`, borderRight: `2px solid ${T.red}`, borderBottomRightRadius: radius.xl },
          ].map((style, i) => (
            <div key={i} style={{ position: "absolute", width: 48, height: 48, ...style, opacity: 0.5 }} />
          ))}
        </div>

        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.xl,
            background: `rgba(229,83,60,0.10)`,
            border: `1px solid rgba(229,83,60,0.30)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 9,
              color: T.red,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            SENTINEL · INTERFACE FAULT
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: T.textPrimary,
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            Interface error
          </div>
          <div
            style={{
              fontSize: 13,
              color: T.textSecondary,
              lineHeight: 1.6,
            }}
          >
            A component encountered an unexpected error. TALON's evidence and audit data remain intact.
            Restart the interface to continue from the last stable state.
          </div>
        </div>

        {this.state.error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: radius.md,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${border.soft}`,
              fontFamily: font.mono,
              fontSize: 9,
              color: T.textMuted,
              maxWidth: 480,
              width: "100%",
              letterSpacing: "0.04em",
              lineHeight: 1.5,
            }}
          >
            {this.state.error.message}
          </div>
        )}

        <button
          type="button"
          onClick={this.handleRestart}
          style={{
            padding: "12px 32px",
            borderRadius: radius.lg,
            background: "rgba(229,83,60,0.10)",
            border: `1px solid ${T.red}`,
            color: T.red,
            fontFamily: font.sans,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Restart Interface
        </button>
      </div>
    );
  }
}
