import { ankiModeSection } from "./anki-mode-section.ts";

async function main(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;
  app.replaceChildren(...(await ankiModeSection()));
}

void main();
