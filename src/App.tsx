import { createBrowserRouter, RouterProvider } from "react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { routes } from "./routes";

const router = createBrowserRouter(routes);

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
