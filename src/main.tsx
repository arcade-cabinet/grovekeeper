import { WorldProvider } from "koota/react";
import React from "react";
import ReactDOM from "react-dom/client";
import { koota } from "@/koota";
import App from "./App.tsx";
import "./index.css";

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed by index.html
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WorldProvider world={koota}>
      <App />
    </WorldProvider>
  </React.StrictMode>,
);
