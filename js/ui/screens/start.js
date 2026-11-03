// Стартовый экран: вход в город, ячейки сохранения, коллекция, перенос сохранения и тест-режим.
// Игра начинается в городе: оттуда герой спускается в подземелье, там же продолжается сохранённый забег.
// Но если герой в подземелье не в комнате сохранения, в город ему нельзя: «Играть» сразу продолжает забег.
import { TEXTS } from "../../data/texts.ru.js";
import { getNextUnlock } from "../../engine/meta.js";
import { canReturnToCity } from "../../engine/run.js";
import { getActiveSlot, loadMeta, loadRun } from "../../save.js";
import { LOGO_ART } from "../art.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { openCity } from "./city.js";
import { continueRun } from "./map.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderStartScreen(root) {
  const meta = loadMeta();
  const run = loadRun();
  const inDungeon = run !== null && !canReturnToCity(run);
  const screen = el("main", "center-screen");
  const logo = el("div", "start-logo");
  logo.innerHTML = LOGO_ART;
  screen.append(logo, el("h1", "center-screen__title", TEXTS.gameTitle), el("p", "reward__line", TEXTS.saves.current(getActiveSlot())));

  // Опыт показываем, когда он уже есть: так видно, сколько осталось до открытия
  if (meta.xp > 0) {
    const next = getNextUnlock(meta);
    screen.append(el("p", "reward__line", next ? TEXTS.meta.progress(meta.xp, next.xp) : TEXTS.meta.allUnlocked(meta.xp)));
  }

  // Все кнопки одного размера и стоят парами: так меню помещается на экран телефона без прокрутки
  const menu = el("div", "start-menu");
  menu.append(
    inDungeon
      ? createButton(TEXTS.city.continueRun, "button--large", () => continueRun(run))
      : createButton(TEXTS.startButton, "button--large", () => openCity("home")),
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
