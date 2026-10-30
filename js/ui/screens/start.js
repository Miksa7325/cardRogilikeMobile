// Стартовый экран: название игры, кнопка «Начать» и вход в тестовый режим.
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { startNewRun } from "./map.js";

export function renderStartScreen(root) {
  const screen = el("main", "center-screen");

  const startButton = el("button", "button button--large", TEXTS.startButton);
  startButton.type = "button";
  startButton.addEventListener("click", startNewRun);

  const testButton = el("button", "button button--secondary", TEXTS.testModeButton);
  testButton.type = "button";
  testButton.addEventListener("click", () => showScreen("testSetup"));

  screen.append(el("h1", "center-screen__title", TEXTS.gameTitle), startButton, testButton);
  root.append(screen);
}
