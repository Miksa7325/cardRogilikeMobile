// Стартовый экран: продолжение забега, новый забег, город, задания, коллекция, перенос сохранения и тест-режим.
import { TEXTS } from "../../data/texts.ru.js";
import { countReadyQuests, getNextUnlock } from "../../engine/meta.js";
import { loadMeta, loadRun } from "../../save.js";
import { state } from "../../state.js";
import { LOGO_ART } from "../art.js";
import { el } from "../dom.js";
import { resetPlayTimer } from "../playTime.js";
import { showScreen } from "../router.js";
import { resumeCombat } from "./combat.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderStartScreen(root) {
  const savedRun = loadRun();
  const meta = loadMeta();
  const screen = el("main", "center-screen");
  const logo = el("div", "start-logo");
  logo.innerHTML = LOGO_ART;
  screen.append(logo, el("h1", "center-screen__title", TEXTS.gameTitle));

  // Опыт показываем, когда он уже есть: так видно, сколько осталось до открытия
  if (meta.xp > 0) {
    const next = getNextUnlock(meta);
    screen.append(el("p", "reward__line", next ? TEXTS.meta.progress(meta.xp, next.xp) : TEXTS.meta.allUnlocked(meta.xp)));
  }

  if (savedRun) {
    screen.append(createButton(TEXTS.continueButton, "button--large", () => {
      state.run = savedRun;
      state.test.enabled = false;
      resetPlayTimer();
      // Возвращаем игрока туда, где он остановился: на награду, в бой или на карту
      if (savedRun.pendingReward) showScreen("reward");
      else if (savedRun.savedCombat) resumeCombat();
      else showScreen("map");
    }));
  }
  // Кнопки стоят парами, чтобы всё меню помещалось на экран телефона без прокрутки
  screen.append(
    createNewRunButton(savedRun !== null),
    createButtonRow(
      createButton(TEXTS.city.button, "button--secondary", () => showScreen("city")),
      createQuestsButton(meta),
    ),
    createButtonRow(
      createButton(TEXTS.collection.title, "button--secondary", () => showScreen("collection")),
      createButton(TEXTS.settings.button, "button--secondary", () => showScreen("settings")),
    ),
    createButton(TEXTS.saveTransferButton, "button--secondary", () => showScreen("saveTransfer")),
    createButtonRow(
      createButton(TEXTS.testModeButton, "button--secondary", () => showScreen("testSetup")),
      createButton(TEXTS.credits.button, "button--secondary", () => showScreen("credits")),
    ),
  );
  root.append(screen);
}

function createButtonRow(...buttons) {
  const row = el("div", "button-row");
  row.append(...buttons);
  return row;
}

// Кнопка заданий подсказывает, что есть награды, которые можно забрать
function createQuestsButton(meta) {
  const ready = countReadyQuests(meta);
  const button = createButton(ready > 0 ? TEXTS.quests.buttonReady(ready) : TEXTS.quests.button, "button--secondary", () => showScreen("quests"));
  if (ready > 0) button.classList.add("button--attention");
  return button;
}

// Новый забег сотрёт сохранённый, поэтому при наличии сохранения просим нажать дважды
function createNewRunButton(hasSavedRun) {
  let confirmed = !hasSavedRun;
  const button = createButton(TEXTS.startButton, hasSavedRun ? "button--secondary" : "button--large", () => {
    if (confirmed) {
      showScreen("heroSelect");
      return;
    }
    confirmed = true;
    button.textContent = TEXTS.confirmNewRun;
  });
  return button;
}
