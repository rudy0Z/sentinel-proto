import { RouterProvider } from "react-router";
import { router } from "./routes";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <div
        style={{
          width: "100vw",
          height: "100vh",
          overflow: "auto",
          background: "#060A12",
        }}
      >
        <RouterProvider router={router} />
      </div>
    </ErrorBoundary>
  );
}
