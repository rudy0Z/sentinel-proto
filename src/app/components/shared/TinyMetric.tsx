import { T, font } from "../../tokens";

interface TinyMetricProps {
  label: string;
  value: string;
}

/** Compact metric display — single source replacing duplicates in ActionBar, LeftPanel, RightPanel */
export function TinyMetric({ label, value }: TinyMetricProps) {
  return (
    <div>
      <div style={{ fontFamily: font.sans, fontSize: 10, color: T.textMuted }}>{label}</div>
      <div style={{ fontFamily: font.mono, fontSize: 11, color: T.textPrimary, marginTop: 2 }}>{value}</div>
    </div>
  );
}
