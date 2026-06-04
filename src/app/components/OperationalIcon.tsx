import type { CSSProperties } from "react";
import {
  Activity,
  AlertTriangle,
  Ban,
  Bell,
  Bot,
  Check,
  ClipboardCheck,
  Crosshair,
  Eye,
  Flame,
  MapPinned,
  Mic,
  Navigation,
  Plane,
  Radio,
  RadioTower,
  RotateCcw,
  Route,
  Send,
  ShieldCheck,
  Square,
  UserRound,
  Users,
} from "lucide-react";
import type { QuickActionId } from "../tokens";

interface OperationalIconProps {
  actionId?: QuickActionId | string;
  name?: "alert" | "check" | "mic" | "radio" | "operator" | "bot" | "warning" | "reset";
  color: string;
  size?: number;
  style?: CSSProperties;
}

const ACTION_ICONS: Record<string, typeof Activity> = {
  "surface-alert": Bell,
  "dispatch-scout": Plane,
  "open-verification": Eye,
  "monitor-only": Activity,
  "confirm-incident": ClipboardCheck,
  "deploy-survey": Crosshair,
  "stage-perimeter": Flame,
  "stage-responder-guidance": Navigation,
  "stage-residential-evacuation": ShieldCheck,
  "relay-field-intel": RadioTower,
  "notify-authorities": Send,
  "notify-teams": Users,
  "mark-high-risk": AlertTriangle,
  "override-plan": Route,
  "open-degraded": MapPinned,
  "authorize-containment": ShieldCheck,
  "emergency-evacuate": AlertTriangle,
  "activate-automatic-route": Route,
  "deploy-navigation-drone": Navigation,
  "deploy-backup": Plane,
  "acknowledge-exception": Check,
  "abort-mission": Ban,
  "stand-down": Square,
  "shift-handover": UserRound,
};

const NAMED_ICONS: Record<NonNullable<OperationalIconProps["name"]>, typeof Activity> = {
  alert: AlertTriangle,
  check: Check,
  mic: Mic,
  radio: Radio,
  operator: UserRound,
  bot: Bot,
  warning: AlertTriangle,
  reset: RotateCcw,
};

export function OperationalIcon({ actionId, name, color, size = 18, style }: OperationalIconProps) {
  const Icon = name ? NAMED_ICONS[name] : actionId ? ACTION_ICONS[actionId] ?? Activity : Activity;
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={2}
      style={{
        display: "block",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
