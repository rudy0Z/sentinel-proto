import { createContext } from "react";

/**
 * Signals to panel primitives that they're rendered inside a single-focus
 * RailStack (whose tab switcher is the shared header), so they should render
 * body-only and skip their own redundant title header.
 */
export const RailChromeContext = createContext<{ chromeless: boolean }>({ chromeless: false });
