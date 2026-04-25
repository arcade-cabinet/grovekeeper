import { render } from "solid-js/web";
import App from "./App.tsx";
import "./index.css";
import { installDebugGlobals } from "@/shared/utils/debugState";

// Install window.__grove debug helpers in DEV mode or when ?debug is in the
// URL. No-op in production so the bundle is unaffected.
installDebugGlobals();

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed by index.html
render(() => <App />, document.getElementById("root")!);

// Signal the static landing vignette in index.html to fade out, revealing
// the Solid UI underneath. The CSS transition handles the actual fade —
// JS only flips the flag once Solid has mounted.
if (typeof document !== "undefined") {
  document.body.setAttribute("data-hydrated", "true");
}
