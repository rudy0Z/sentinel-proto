import { HairlineMapCanvas } from "../map/hairline/HairlineMapCanvas";

/**
 * #/hairline-map — the Hairline Instrument rendition (docs/redesign-2026/14).
 * Exploratory standalone page: same world data, new render language. Does not
 * touch the production ScanPage map stack.
 */
export default function HairlineMapPage() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#0A111B" }}>
      <HairlineMapCanvas />
    </div>
  );
}
