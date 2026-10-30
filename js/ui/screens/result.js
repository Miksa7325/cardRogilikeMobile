// Экран победы или поражения.
import { TEXTS } from "../../data/texts.ru.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { startNewCombat } from "./combat.js";

export function renderResultScreen(root) {
  const title = state.combat.status === "won" ? TEXTS.victoryTitle : TEXTS.defeatTitle;

  const screen = el("main", "center-screen");
  const button = el("button", "button button--large", TEXTS.newCombat);
  button.type = "button";
  button.addEventListener("click", startNewCombat);

  screen.append(el("h1", "center-screen__title", title), button);
  root.append(screen);
}
