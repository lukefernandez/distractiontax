import { ankiGateReady, reviewedToday, startProgress, updateProgress } from "../anki.ts";
import { getAnkiMode } from "../anki-mode.ts";
import { drawChallenge } from "../quiz.ts";
import type { ChallengeItem, WordItem } from "../quiz.ts";
import { grantWindow, WINDOW_MINUTES } from "../windows.ts";
import { el } from "./dom.ts";
import { resolveTarget } from "./target.ts";
import type { ChallengeTarget } from "./target.ts";
import { advanceAfterHitMs, advanceAfterMissMs } from "./timing.json";
import wordlist from "../wordlist.json";

const ITEM_COUNT = 10;
const ANKI_POLL_MS = 1500;

const SPEAK_ICON = `<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 2.5 4.5 5.5H2a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2.5L8 13.5v-11Z"></path><path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.7a6 6 0 0 1 0 8.6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"></path></svg>`;
const CHECK_ICON = `<svg width="26" height="26" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m3 8.5 3.2 3L13 4.5" stroke="var(--leaf-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

function ankiModeLink(): HTMLElement {
  const link = el("button", "mode-link", "Anki mode");
  link.setAttribute("type", "button");
  link.title = "On offers Anki. Off starts the Challenge.";
  link.addEventListener("click", () => {
    void chrome.runtime.openOptionsPage();
  });
  return link;
}

function renderFrame(app: HTMLElement, card: HTMLElement, target: ChallengeTarget): void {
  app.replaceChildren(
    el("h1", "title", "Pay Your Distraction Tax"),
    card,
    el("p", "footnote", `${target.name} will be unlocked for ${WINDOW_MINUTES} minutes.`),
    ankiModeLink(),
  );
}

function dotMeter(): { row: HTMLElement; paint: (earned: number) => void } {
  const dots = Array.from({ length: ITEM_COUNT }, () => el("i"));
  const row = el("div", "dots");
  row.setAttribute("aria-hidden", "true");
  row.append(...dots);
  return {
    row,
    paint(earned) {
      dots.forEach((dot, i) => dot.classList.toggle("earned", i < earned));
    },
  };
}

function meterTop(count: HTMLElement, dots: HTMLElement): HTMLElement {
  const top = el("div", "top");
  top.append(count, dots);
  return top;
}

let spanishVoice: SpeechSynthesisVoice | null = null;
let speakButton: HTMLElement | null = null;

function resolveSpanishVoice(): void {
  const voices = speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("es"));
  spanishVoice = voices.find((voice) => voice.localService) ?? voices[0] ?? null;
}

function syncSpeakButton(): void {
  if (speakButton) speakButton.hidden = spanishVoice === null;
}

speechSynthesis.addEventListener("voiceschanged", () => {
  resolveSpanishVoice();
  syncSpeakButton();
});

const keyboard: {
  speak: (() => void) | null;
  pick: ((option: number) => void) | null;
} = { speak: null, pick: null };

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === "p") {
    keyboard.speak?.();
    return;
  }
  const option = Number.parseInt(event.key, 10);
  if (option >= 1) keyboard.pick?.(option - 1);
});

function speakPrompt(word: string): void {
  if (!spanishVoice) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.voice = spanishVoice;
  utterance.lang = spanishVoice.lang;
  utterance.rate = 0.9;
  speechSynthesis.speak(utterance);
}

async function pass(app: HTMLElement, target: ChallengeTarget): Promise<void> {
  await grantWindow(target.surface);
  speechSynthesis.cancel();
  keyboard.speak = null;
  keyboard.pick = null;
  const check = el("span", "check");
  check.innerHTML = CHECK_ICON;
  const card = el("div", "card pass");
  card.append(check, el("p", "passed-title", `${target.name} unlocked`));
  app.replaceChildren(card);
  setTimeout(() => location.replace(target.returnUrl), 800);
}

function renderAnkiPrompt(app: HTMLElement, target: ChallengeTarget): void {
  const study = el("p", "study", "Open Anki to review your cards.");
  study.title =
    `This page checks for Anki every couple of seconds and starts on its own ` +
    `once ${ITEM_COUNT} cards are due.`;

  const start = el("button", "btn", "Answer Spanish words");
  start.setAttribute("type", "button");

  const card = el("div", "card");
  card.append(study, start);
  renderFrame(app, card, target);

  let stopped = false;
  let polling = false;
  const timer = setInterval(async () => {
    if (polling) return;
    polling = true;
    const ready = await ankiGateReady(ITEM_COUNT);
    polling = false;
    if (ready && !stopped) {
      stopped = true;
      clearInterval(timer);
      void renderAnkiGate(app, target);
    }
  }, ANKI_POLL_MS);

  start.addEventListener("click", () => {
    stopped = true;
    clearInterval(timer);
    renderQuiz(app, target);
  });
}

async function renderAnkiGate(app: HTMLElement, target: ChallengeTarget): Promise<void> {
  let progress = startProgress(await reviewedToday());

  const count = el("p", "count", `0 of ${ITEM_COUNT}`);
  count.title =
    `${ITEM_COUNT} reviews in Anki open ${target.name} for ${WINDOW_MINUTES} minutes. ` +
    `Counted from today's total — progress never moves backwards.`;
  const { row: dots, paint } = dotMeter();

  const study = el("p", "study", "Review your cards in Anki.");

  const swap = el("button", "swap", "use Spanish words instead");
  swap.setAttribute("type", "button");

  const card = el("div", "card");
  card.append(meterTop(count, dots), study, swap);
  renderFrame(app, card, target);

  let polling = false;
  const timer = setInterval(async () => {
    if (polling) return;
    polling = true;
    try {
      progress = updateProgress(progress, await reviewedToday());
    } catch {
      return;
    } finally {
      polling = false;
    }
    const done = Math.min(progress.done, ITEM_COUNT);
    count.textContent = `${done} of ${ITEM_COUNT}`;
    paint(done);
    if (progress.done >= ITEM_COUNT) {
      clearInterval(timer);
      void pass(app, target);
    }
  }, ANKI_POLL_MS);

  swap.addEventListener("click", () => {
    clearInterval(timer);
    renderQuiz(app, target);
  });
}

function renderQuiz(app: HTMLElement, target: ChallengeTarget): void {
  const items = drawChallenge(wordlist as WordItem[], ITEM_COUNT);
  let index = 0;
  let correct = 0;
  let finished = false;
  let busy = false;

  const count = el("p", "count", `0 of ${ITEM_COUNT}`);
  count.title =
    `${ITEM_COUNT} correct answers open ${target.name} for ${WINDOW_MINUTES} minutes. ` +
    `A miss doesn't count — a fresh word takes its place.`;
  const { row: dots, paint } = dotMeter();

  const prompt = el("span", "prompt");
  prompt.setAttribute("lang", "es");
  const speak = el("button", "speak");
  speak.innerHTML = SPEAK_ICON;
  speak.setAttribute("type", "button");
  speak.setAttribute("aria-label", "Hear the word (P)");
  speak.title = "Hear the word (P)";
  speak.addEventListener("click", () => speakPrompt(items[index].prompt));
  keyboard.speak = () => speakPrompt(items[index].prompt);
  keyboard.pick = (option) => {
    if (index < items.length && option < items[index].options.length) onPick(option);
  };
  speakButton = speak;
  resolveSpanishVoice();
  syncSpeakButton();
  const promptRow = el("p", "prompt-row");
  promptRow.append(prompt, speak);
  const options = el("div", "options");

  const card = el("div", "card");
  card.append(meterTop(count, dots), promptRow, options);
  renderFrame(app, card, target);

  function advance(): void {
    index += 1;
    if (index >= items.length) items.push(...drawChallenge(wordlist as WordItem[], ITEM_COUNT));
    renderItem(true);
  }

  function renderItem(animate: boolean): void {
    speechSynthesis.cancel();
    options.classList.remove("locked", "shake");
    const item: ChallengeItem = items[index];
    count.textContent = `${correct} of ${ITEM_COUNT}`;
    paint(correct);
    prompt.textContent = item.prompt;
    options.replaceChildren(
      ...item.options.map((option, optionIndex) => {
        const button = el("button", undefined, option);
        button.prepend(el("kbd", undefined, String(optionIndex + 1)));
        button.setAttribute("type", "button");
        button.addEventListener("click", () => onPick(optionIndex));
        return button;
      }),
    );
    if (animate) {
      for (const node of [promptRow, options]) {
        node.style.animation = "none";
        void node.offsetWidth;
        node.style.animation = "slide-in 0.45s var(--ease-out-expo) both";
      }
    }
  }

  function onPick(optionIndex: number): void {
    if (finished || busy) return;
    busy = true;
    speechSynthesis.cancel();
    const item = items[index];
    const picked = options.children[optionIndex];
    options.classList.add("locked");

    if (optionIndex !== item.correctIndex) {
      picked.classList.add("miss");
      options.children[item.correctIndex].classList.add("reveal");
      options.classList.add("shake");
      setTimeout(() => {
        busy = false;
        advance();
      }, advanceAfterMissMs);
      return;
    }

    picked.classList.add("hit");
    correct += 1;
    count.textContent = `${correct} of ${ITEM_COUNT}`;
    paint(correct);
    if (correct >= ITEM_COUNT) {
      finished = true;
      setTimeout(() => void pass(app, target), 550);
      return;
    }
    setTimeout(() => {
      busy = false;
      advance();
    }, advanceAfterHitMs);
  }

  renderItem(false);
}

async function main(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;

  const target = resolveTarget(new URLSearchParams(location.search), location.hash);
  if (!target) {
    app.replaceChildren(el("p", "footnote", "Nothing to unlock here."));
    return;
  }

  if (!(await getAnkiMode())) {
    renderQuiz(app, target);
    return;
  }

  app.replaceChildren(el("p", "footnote", "Checking Anki…"));
  if (await ankiGateReady(ITEM_COUNT)) {
    await renderAnkiGate(app, target);
  } else {
    renderAnkiPrompt(app, target);
  }
}

void main();
