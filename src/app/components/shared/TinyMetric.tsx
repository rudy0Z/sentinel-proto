import { T, font, space, typeScale, typeWeight } from "../../tokens";

interface TinyMetricProps {
  label: string;
  value: string;
}

/** Compact metric display — single source replacing duplicates in ActionBar, LeftPanel, RightPanel */
export function TinyMetric({ label, value }: TinyMetricProps) {
  return (
    <div>
      <div style={{ fontFamily: font.sans, fontSize: typeScale.label, color: T.textMuted }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: typeScale.body, fontWeight: typeWeight.semibold, color: T.textPrimary, marginTop: space.xxs }}>{value}</div>
    </div>
  );
}
