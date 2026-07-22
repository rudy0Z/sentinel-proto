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
  { path: "*", loader: () => redirect("/") },
]);
