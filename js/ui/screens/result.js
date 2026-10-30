// Экран победы или поражения: в забеге и в тестовом бою.
import { TEXTS } from "../../data/texts.ru.js";
import { getCurrentFloor } from "../../engine/run.js";
import { clearRun } from "../../save.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { trackPlayTime } from "../playTime.js";
import { showScreen } from "../router.js";
import { startNewRun } from "./map.js";
import { openRunStats } from "./runStats.js";

export function renderResultScreen(root) {
  if (state.test.enabled) {
    const title = state.combat.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;
    renderResult(root, title, null, TEXTS.newCombat, () => showScreen("testSetup"));
    return;
  }

  // Забег закончен: сохранение больше не нужно. Мета-прогресс при этом остаётся
  clearRun();

  const run = state.run;
  trackPlayTime(run);
  const title = run.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;
  const summary = TEXTS.runSummary(run.act, getCurrentFloor(run), run.gold);
  renderResult(root, title, summary, TEXTS.newRun, startNewRun);

  const statsButton = el("button", "button button--secondary", TEXTS.stats.button);
  statsButton.type = "button";
  statsButton.addEventListener("click", () => openRunStats(run));
  root.querySelector(".center-screen").append(statsButton);
}

function renderResult(root, title, summary, buttonText, onTap) {
  const screen = el("main", "center-screen");
  screen.append(el("h1", "center-screen__title", title));
  if (summary) screen.append(el("p", "reward__line", summary));

  const button = el("button", "button button--large", buttonText);
  button.type = "button";
  button.addEventListener("click", onTap);

  const menuButton = el("button", "button button--secondary", TEXTS.mainMenu);
  menuButton.type = "button";
  menuButton.addEventListener("click", () => showScreen("start"));

  screen.append(button, menuButton);
  root.append(screen);
}
