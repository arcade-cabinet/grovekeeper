import { render } from "solid-js/web";
import App from "./App.tsx";
import "./index.css";
import { installDebugGlobals } from "@/shared/utils/debugState";

// Install window.__grove debug helpers in DEV mode or when ?debug is in the
// URL. No-op in production so the bundle is unaffected.
installDebugGlobals();

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed by index.html
render(() => <App />, document.getElementById("root")!);
