// Стартовый экран: продолжение забега, новый забег, ячейки сохранения, коллекция, перенос сохранения и тест-режим.
// Город с заданиями открывается уже в забеге, с карты.
import { TEXTS } from "../../data/texts.ru.js";
import { getNextUnlock } from "../../engine/meta.js";
import { getActiveSlot, loadMeta, loadRun } from "../../save.js";
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
  screen.append(logo, el("h1", "center-screen__title", TEXTS.gameTitle), el("p", "reward__line", TEXTS.saves.current(getActiveSlot())));

  // Опыт показываем, когда он уже есть: так видно, сколько осталось до открытия
  if (meta.xp > 0) {
    const next = getNextUnlock(meta);
    screen.append(el("p", "reward__line", next ? TEXTS.meta.progress(meta.xp, next.xp) : TEXTS.meta.allUnlocked(meta.xp)));
  }

  const menu = el("div", "start-menu");
  if (savedRun) {
    menu.append(createButton(TEXTS.continueButton, "button--large", () => {
      state.run = savedRun;
      state.test.enabled = false;
      resetPlayTimer();
      // Возвращаем игрока туда, где он остановился: на награду, в бой или на карту
      if (savedRun.pendingReward) showScreen("reward");
      else if (savedRun.savedCombat) resumeCombat();
      else showScreen("map");
    }));
  }
  // Все кнопки одного размера и стоят парами: так меню помещается на экран телефона без прокрутки
  menu.append(
    createNewRunButton(savedRun !== null),
    createButton(TEXTS.saves.button, "button--secondary", () => showScreen("saves")),
    createButton(TEXTS.collection.title, "button--secondary", () => showScreen("collection")),
    createButton(TEXTS.settings.button, "button--secondary", () => showScreen("settings")),
    createButton(TEXTS.saveTransferButton, "button--secondary", () => showScreen("saveTransfer")),
    createButton(TEXTS.testModeButton, "button--secondary", () => showScreen("testSetup")),
    createButton(TEXTS.credits.button, "button--secondary", () => showScreen("credits")),
  );
  screen.append(menu);
  root.append(screen);
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
