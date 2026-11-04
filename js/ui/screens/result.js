// Экран победы или поражения: в забеге и в тестовом бою.
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { applyRunToMeta } from "../../engine/meta.js";
import { awardArenaWin } from "../../engine/town.js";
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
  if (state.arena) {
    renderArenaResult(root);
    return;
  }
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
  renderResult(root, title, [summary, ...formatMetaResult(run.metaResult, HEROES[run.heroId].name)], TEXTS.city.toCity, () => openCity("gate"));

  const statsButton = el("button", "button button--secondary", TEXTS.stats.button);
  statsButton.type = "button";
  statsButton.addEventListener("click", () => openRunStats(run));
  root.querySelector(".center-screen").append(statsButton);
}

// Итог боя на арене: победа приносит награду в казну один раз, поражение ничего не стоит. Обратно — в город
function renderArenaResult(root) {
  const won = state.combat.status === "won";
  const lines = [];
  if (won && !state.arena.rewarded) {
    const meta = loadMeta();
    const reward = awardArenaWin(meta, state.arena.fightId);
    saveMeta(meta);
    state.arena.rewarded = true;
    state.arena.reward = reward;
    playSound("victory");
  }
  lines.push(won ? TEXTS.services.arenaWon(state.arena.reward.gold, state.arena.reward.essences) : TEXTS.services.arenaLost);
  renderResult(root, won ? TEXTS.victoryTitle : TEXTS.defeatTitle, lines, TEXTS.city.toCity, () => {
    state.arena = null;
    state.test.enabled = false;
    openCity("arena");
  });
}

// Гибель героя или добыча, сданная в казну, и выполненные задания
function formatMetaResult(result, heroName) {
  const lines = [result.died ? TEXTS.meta.heroDied(heroName) : TEXTS.meta.banked(result.goldGained, result.essencesGained)];
  for (const title of result.questsReady) lines.push(TEXTS.meta.questReady(title));
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
