import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

// Best effort: ask the browser not to evict our IndexedDB data.
void navigator.storage?.persist?.();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
