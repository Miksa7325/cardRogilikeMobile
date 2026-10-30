// Экран победы или поражения: в забеге и в тестовом бою.
import { TEXTS } from "../../data/texts.ru.js";
import { getCurrentFloor } from "../../engine/run.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { startNewRun } from "./map.js";

export function renderResultScreen(root) {
  if (state.test.enabled) {
    const title = state.combat.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;
    renderResult(root, title, null, TEXTS.newCombat, () => showScreen("testSetup"));
    return;
  }

  const run = state.run;
  const title = run.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;
  const summary = TEXTS.runSummary(getCurrentFloor(run), run.gold);
  renderResult(root, title, summary, TEXTS.newRun, startNewRun);
}

function renderResult(root, title, summary, buttonText, onTap) {
  const screen = el("main", "center-screen");
  screen.append(el("h1", "center-screen__title", title));
  if (summary) screen.append(el("p", "reward__line", summary));

  const button = el("button", "button button--large", buttonText);
  button.type = "button";
  button.addEventListener("click", onTap);
  screen.append(button);
  root.append(screen);
}
