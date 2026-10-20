import { createHashRouter, redirect } from "react-router";

export const router = createHashRouter([
  {
    path: "/",
    lazy: async () => ({ Component: (await import("./pages/ScanPage")).default }),
  },
  {
    path: "/components",
    lazy: async () => ({ Component: (await import("./pages/ComponentsPage")).default }),
  },
  {
    path: "/design-system",
    lazy: async () => ({ Component: (await import("./pages/DesignSystemPage")).default }),
  },
  // The /hairline-map route was removed with the hairline module (DECISIONS.md
  // §4.2 — a parallel renderer, no UI link, no gate). The map is rebuilt under
  // SPEC.md §1.1; there is no second map route.
  { path: "*", loader: () => redirect("/") },
]);
