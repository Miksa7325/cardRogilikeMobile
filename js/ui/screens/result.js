// Экран победы или поражения: в забеге и в тестовом бою.
import { TEXTS } from "../../data/texts.ru.js";
import { applyRunToMeta } from "../../engine/meta.js";
import { getDeepestFloor } from "../../engine/run.js";
import { clearRun, loadMeta, saveMeta } from "../../save.js";
import { state } from "../../state.js";
import { playSound } from "../audio.js";
import { el } from "../dom.js";
import { trackPlayTime } from "../playTime.js";
import { showScreen } from "../router.js";
import { openCity } from "./city.js";
import { openRunStats } from "./runStats.js";

export function renderResultScreen(root) {
  if (state.test.enabled) {
    const title = state.combat.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;
    renderResult(root, title, [], TEXTS.newCombat, () => showScreen("testSetup"));
    return;
  }

  // Забег закончен: сохранение больше не нужно. Мета-прогресс при этом остаётся
  clearRun();

  const run = state.run;
  trackPlayTime(run);
  // Итог записываем один раз, даже если экран нарисуют повторно
  if (!run.metaResult) {
    const meta = loadMeta();
    // Этажи для заданий — по самому глубокому: герой мог погибнуть, возвращаясь назад. Добыча уходит в казну
    run.metaResult = applyRunToMeta(meta, run, getDeepestFloor(run));
    saveMeta(meta);
    playSound(run.status === "won" ? "victory" : "defeat");
  }

  const title = run.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;
  const summary = TEXTS.runSummary(run.act, getDeepestFloor(run));
  renderResult(root, title, [summary, ...formatMetaResult(run.metaResult)], TEXTS.city.toCity, () => openCity("gate"));

  const statsButton = el("button", "button button--secondary", TEXTS.stats.button);
  statsButton.type = "button";
  statsButton.addEventListener("click", () => openRunStats(run));
  root.querySelector(".center-screen").append(statsButton);
}

// Добыча, сданная в казну, выполненные задания и открытая сложность
function formatMetaResult(result) {
  const lines = [TEXTS.meta.banked(result.goldGained, result.essencesGained)];
  for (const title of result.questsReady) lines.push(TEXTS.meta.questReady(title));
  if (result.difficultyJustUnlocked) lines.push(TEXTS.meta.difficultyUnlocked);
  return lines;
}

function renderResult(root, title, lines, buttonText, onTap) {
  const screen = el("main", "center-screen");
  screen.append(el("h1", "center-screen__title", title));
  for (const line of lines) screen.append(el("p", "reward__line", line));

  const button = el("button", "button button--large", buttonText);
  button.type = "button";
  button.addEventListener("click", onTap);

  const menuButton = el("button", "button button--secondary", TEXTS.mainMenu);
  menuButton.type = "button";
  menuButton.addEventListener("click", () => showScreen("start"));

  screen.append(button, menuButton);
  root.append(screen);
}
