import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "../src/styles/tokens.css";
import "../src/styles/themes.css";
import "../src/styles/navbar.css";
import "../src/styles/overlay.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
