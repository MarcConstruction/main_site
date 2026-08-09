import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../console/App.jsx";
import "../styles/console.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
