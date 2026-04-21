import { createBrowserRouter, redirect } from "react-router";
import ScanPage from "./pages/ScanPage";
import ComponentsPage from "./pages/ComponentsPage";
import DesignSystemPage from "./pages/DesignSystemPage";

export const router = createBrowserRouter([
  { path: "/", Component: ScanPage },
  { path: "/components", Component: ComponentsPage },
  { path: "/design-system", Component: DesignSystemPage },
  { path: "*", loader: () => redirect("/") },
]);
