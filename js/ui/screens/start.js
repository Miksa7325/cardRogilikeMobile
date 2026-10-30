// Стартовый экран: название игры, продолжение забега, новый забег, перенос сохранения и тест-режим.
import { TEXTS } from "../../data/texts.ru.js";
import { loadRun } from "../../save.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { startNewRun } from "./map.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderStartScreen(root) {
  const savedRun = loadRun();
  const screen = el("main", "center-screen");
  screen.append(el("h1", "center-screen__title", TEXTS.gameTitle));

  if (savedRun) {
    screen.append(createButton(TEXTS.continueButton, "button--large", () => {
      state.run = savedRun;
      state.test.enabled = false;
      showScreen("map");
    }));
  }
  screen.append(
    createNewRunButton(savedRun !== null),
    createButton(TEXTS.saveTransferButton, "button--secondary", () => showScreen("saveTransfer")),
    createButton(TEXTS.testModeButton, "button--secondary", () => showScreen("testSetup")),
  );
  root.append(screen);
}

// Новый забег сотрёт сохранённый, поэтому при наличии сохранения просим нажать дважды
function createNewRunButton(hasSavedRun) {
  let confirmed = !hasSavedRun;
  const button = createButton(TEXTS.startButton, hasSavedRun ? "button--secondary" : "button--large", () => {
    if (confirmed) {
      startNewRun();
      return;
    }
    confirmed = true;
    button.textContent = TEXTS.confirmNewRun;
  });
  return button;
}
