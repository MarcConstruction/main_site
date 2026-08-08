import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Page from "../pages/Contact.jsx";
import "../styles/marc.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Page />
  </StrictMode>
);