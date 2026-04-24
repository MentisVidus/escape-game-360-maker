import "@xyflow/react/dist/style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { NodalCanvas } from "./view/NodalCanvas";
import { createDemoStore } from "./view/demoProject";

const rootEl = document.getElementById("app");
if (!rootEl) throw new Error("Missing #app root element");

const store = createDemoStore();
createRoot(rootEl).render(
  <StrictMode>
    <NodalCanvas store={store} />
  </StrictMode>
);

