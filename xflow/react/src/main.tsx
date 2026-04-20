import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootId = "react-map-root";

function mount(): void {
  const el = document.getElementById(rootId);
  if (!el) return;
  createRoot(el).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

mount();
