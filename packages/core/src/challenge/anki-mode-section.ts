import { getAnkiMode, setAnkiMode } from "../anki-mode.ts";
import { el } from "./dom.ts";

export async function ankiModeSection(): Promise<HTMLElement[]> {
  let enabled = await getAnkiMode();

  const help = el(
    "p",
    "setting-help",
    "On, you open Anki or answer Spanish words. Off, the Challenge starts directly.",
  );
  help.id = "anki-mode-help";

  const state = el("span", "switch-state");
  state.setAttribute("aria-hidden", "true");

  const knob = el("i");
  knob.setAttribute("aria-hidden", "true");

  const sw = el("button", "switch");
  sw.setAttribute("type", "button");
  sw.setAttribute("role", "switch");
  sw.setAttribute("aria-label", "Anki mode");
  sw.setAttribute("aria-describedby", "anki-mode-help");
  sw.append(knob);

  const side = el("div", "switch-side");
  side.append(state, sw);

  const row = el("div", "setting");
  row.append(help, side);

  const card = el("div", "card");
  card.append(row);

  function paint(): void {
    sw.setAttribute("aria-checked", String(enabled));
    state.textContent = enabled ? "On" : "Off";
  }

  sw.addEventListener("click", () => {
    enabled = !enabled;
    paint();
    void setAnkiMode(enabled);
  });

  paint();
  return [
    el("h1", "title", "Anki mode"),
    card,
    el("p", "footnote", "Saved on this browser. Takes effect the next time a Gate opens."),
  ];
}
