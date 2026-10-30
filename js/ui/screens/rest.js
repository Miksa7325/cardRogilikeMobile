// Экран отдыха: восстановить HP или улучшить карту.
import { TEXTS } from "../../data/texts.ru.js";
import { getRestHealAmount, getUpgradableCards, restHeal, restUpgrade } from "../../engine/run.js";
import { state } from "../../state.js";
import { createCardElement } from "../components/card.js";
import { createRunBar } from "../components/runBar.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

// Вне боя статусов нет: числа на картах показываем без них
const HERO_OUTSIDE_COMBAT = { statuses: {} };

function createButton(text, onTap) {
  const button = el("button", "button button--large", text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderRestScreen(root) {
  const run = state.run;
  const healAmount = getRestHealAmount(run);

  const healButton = createButton(TEXTS.rest.heal(healAmount), () => {
    restHeal(run);
    showScreen("map");
  });
  healButton.disabled = healAmount === 0;

  const upgradeButton = createButton(TEXTS.rest.upgrade, () => showScreen("restUpgrade"));
  upgradeButton.disabled = getUpgradableCards(run).length === 0;

  const screen = el("main", "center-screen center-screen--with-bar");
  screen.append(createRunBar(run), el("h1", "center-screen__title", TEXTS.rest.title), healButton, upgradeButton);
  root.append(screen);
}

// Показываем карты уже улучшенными: так видно, что игрок получит
export function renderRestUpgradeScreen(root) {
  const run = state.run;
  const row = el("div", "card-row");
  for (const card of getUpgradableCards(run)) {
    row.append(createCardElement({ ...card, upgraded: true }, HERO_OUTSIDE_COMBAT, {
      playable: true,
      selected: false,
      onTap: () => {
        restUpgrade(run, card.uid);
        showScreen("map");
      },
    }));
  }

  const backButton = el("button", "button button--secondary", TEXTS.rest.back);
  backButton.type = "button";
  backButton.addEventListener("click", () => showScreen("rest"));

  const screen = el("main", "center-screen center-screen--with-bar");
  screen.append(createRunBar(run), el("p", "reward__line", TEXTS.rest.upgradeTitle), row, backButton);
  root.append(screen);
}
