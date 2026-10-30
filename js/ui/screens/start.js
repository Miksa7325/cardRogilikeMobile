// Стартовый экран: название игры и кнопка «Начать».
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";
import { startNewCombat } from "./combat.js";

export function renderStartScreen(root) {
  const screen = el("main", "center-screen");
  const button = el("button", "button button--large", TEXTS.startButton);
  button.type = "button";
  button.addEventListener("click", startNewCombat);

  screen.append(el("h1", "center-screen__title", TEXTS.gameTitle), button);
  root.append(screen);
}
