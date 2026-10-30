// Тестовый режим: список всех карт поверх боя. Нажатие кладёт карту в руку.
import { CARDS } from "../../data/cards.js";
import { TEXTS } from "../../data/texts.ru.js";
import { addCardToHand } from "../../engine/combat.js";
import { canUpgradeCard } from "../../engine/deck.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

function createButton(text, onTap) {
  const button = el("button", "button", text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function createCardPicker() {
  const picker = el("div", "picker");
  const { test } = state;

  const toggle = createButton(test.addUpgraded ? TEXTS.test.upgradedOn : TEXTS.test.upgradedOff, () => {
    test.addUpgraded = !test.addUpgraded;
    showScreen("combat");
  });
  const close = createButton(TEXTS.test.close, () => {
    test.pickerOpen = false;
    showScreen("combat");
  });
  const leave = createButton(TEXTS.test.leave, () => {
    test.pickerOpen = false;
    showScreen("testSetup");
  });

  const controls = el("div", "picker__controls");
  controls.append(toggle, close, leave);
  picker.append(el("p", "picker__title", TEXTS.test.pickerTitle), controls);

  for (const card of Object.values(CARDS)) {
    const upgraded = test.addUpgraded && canUpgradeCard(card.id);
    const row = el("button", "picker__row", `${card.name}${upgraded ? "+" : ""}`);
    row.type = "button";
    row.addEventListener("click", () => {
      if (addCardToHand(state.combat, card.id, upgraded)) showScreen("combat");
    });
    picker.append(row);
  }
  return picker;
}
