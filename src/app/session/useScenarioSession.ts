/**
 * useScenarioSession — client adapter for the Phase 4 session gateway.
 *
 * Stub by design: the Phase 6 debrief surface and the Phase 5 AI gateway both
 * consume this hook. It opens the telemetry socket, restores state from the
 * gateway on reconnect, and posts operator intents to /command.
 */
import { useEffect, useRef, useState } from "react";

const GATEWAY =
  (import.meta.env as unknown as Record<string, string | undefined>).VITE_SENTINEL_GATEWAY ??
  "http://127.0.0.1:4191";

export interface TelemetryFrame {
  clockMs: number;
  thermalF: number;
  structuresCleared: number;
  confidence: number;
  windBearing: number;
  windSpeedKts: number;
  lidar02EtaS: number | null;
  sceneHint: string;
}

export interface CommandResult {
  ok: boolean;
  to?: string;
  gate?: string;
  error?: string;
  reason?: string;
  receipt?: { id: string; digest: string };
}

export function useScenarioSession(operator = "A. Rao", seed = 20260915, enabled = true) {
  const [sessionId] = useState(() => `web-${Math.random().toString(36).slice(2, 10)}`);
  const [frame, setFrame] = useState<TelemetryFrame | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      setFrame(null);
      return;
    }
    const url = `${GATEWAY.replace("http", "ws")}/ws?session=${encodeURIComponent(sessionId)}&operator=${encodeURIComponent(operator)}&seed=${seed}`;
    let retry: ReturnType<typeof setTimeout>;
    const open = () => {
      const ws = new WebSocket(url);
      socketRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as { type: string; frame?: TelemetryFrame };
          if (msg.type === "telemetry" && msg.frame) setFrame(msg.frame);
        } catch { /* ignore malformed frames */ }
      };
      ws.onclose = () => { setConnected(false); retry = setTimeout(open, 2000); }; // vault 07 §3: reconnect < 2 s
      ws.onerror = () => ws.close();
    };
    open();
    return () => { clearTimeout(retry); socketRef.current?.close(); };
  }, [sessionId, operator, seed, enabled]);

  const dispatch = async (event: string, from: string): Promise<CommandResult> => {
    if (!enabled) return { ok: false, error: "live mode disabled" };
    const res = await fetch(`${GATEWAY}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, event, from, operator }),
    });
    return (await res.json()) as CommandResult;
  };

  return { sessionId, frame, connected, dispatch };
}
