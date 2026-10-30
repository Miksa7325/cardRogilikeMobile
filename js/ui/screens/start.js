// Стартовый экран: продолжение забега, новый забег, коллекция, перенос сохранения и тест-режим.
import { TEXTS } from "../../data/texts.ru.js";
import { getNextUnlock } from "../../engine/meta.js";
import { loadMeta, loadRun } from "../../save.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { resetPlayTimer } from "../playTime.js";
import { showScreen } from "../router.js";

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
  screen.append(el("h1", "center-screen__title", TEXTS.gameTitle));

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
      showScreen("map");
    }));
  }
  screen.append(
    createNewRunButton(savedRun !== null),
    createButton(TEXTS.collection.title, "button--secondary", () => showScreen("collection")),
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
      showScreen("heroSelect");
      return;
    }
    confirmed = true;
    button.textContent = TEXTS.confirmNewRun;
  });
  return button;
}
