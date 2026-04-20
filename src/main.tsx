import { render } from "solid-js/web";
import App from "./App.tsx";
import "./index.css";

// biome-ignore lint/style/noNonNullAssertion: root element is guaranteed by index.html
render(() => <App />, document.getElementById("root")!);
