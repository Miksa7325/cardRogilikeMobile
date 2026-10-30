// Экран победы или поражения: в забеге и в тестовом бою.
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { applyRunToMeta, getNextUnlock } from "../../engine/meta.js";
import { getCurrentFloor } from "../../engine/run.js";
import { clearRun, loadMeta, saveMeta } from "../../save.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { trackPlayTime } from "../playTime.js";
import { showScreen } from "../router.js";
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
    run.metaResult = applyRunToMeta(meta, run, getCurrentFloor(run));
    saveMeta(meta);
  }

  const title = run.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;
  const summary = TEXTS.runSummary(run.act, getCurrentFloor(run), run.gold);
  renderResult(root, title, [summary, ...formatMetaResult(run.metaResult)], TEXTS.newRun, () => showScreen("heroSelect"));

  const statsButton = el("button", "button button--secondary", TEXTS.stats.button);
  statsButton.type = "button";
  statsButton.addEventListener("click", () => openRunStats(run));
  root.querySelector(".center-screen").append(statsButton);
}

// Опыт, новые открытия и следующая цель
function formatMetaResult(result) {
  const lines = [TEXTS.meta.xpGained(result.xpGained, result.xpTotal)];
  for (const unlock of result.newUnlocks) {
    if (unlock.hero) lines.push(TEXTS.meta.newHero(HEROES[unlock.hero].name));
    if (unlock.cards) lines.push(TEXTS.meta.newCards(unlock.cards.length));
    if (unlock.relics) lines.push(TEXTS.meta.newRelics(unlock.relics.length));
  }
  if (result.difficultyJustUnlocked) lines.push(TEXTS.meta.difficultyUnlocked);

  const next = getNextUnlock({ xp: result.xpTotal });
  if (next) lines.push(TEXTS.meta.nextUnlock(next.xp - result.xpTotal));
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
