import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import AppWrapper from "./AppWrapper";
import { getStoredTheme, getThemeById, applyTheme } from "./lib/themes";

// Apply saved theme before render to prevent flash
const savedTheme = getStoredTheme();
applyTheme(getThemeById(savedTheme));

console.log('App starting...');

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>
);
