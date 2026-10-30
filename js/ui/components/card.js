// Рисует одну карту в руке.
import { CARDS } from "../../data/cards.js";
import { calculateDamage } from "../../engine/combat.js";
import { el } from "../dom.js";

// Подставляет в описание итоговые числа: например, {damage} с учётом Силы героя
function formatDescription(card, hero) {
  let text = card.description;
  for (const effect of card.effects) {
    if (effect.type === "damage") {
      text = text.replace("{damage}", calculateDamage(effect.amount, hero, null));
    } else if (effect.type === "block") {
      text = text.replace("{block}", effect.amount);
    } else if (effect.type === "applyStatus") {
      text = text.replace(`{${effect.status}}`, effect.amount);
    }
  }
  return text;
}

export function createCardElement(instance, hero, { playable, selected, onTap }) {
  const card = CARDS[instance.cardId];
  const element = el("div", `card card--${card.type}`);
  element.classList.add(playable ? "card--playable" : "card--unplayable");
  if (selected) element.classList.add("card--selected");

  element.append(
    el("div", "card__cost", card.cost),
    el("div", "card__name", card.name),
    el("div", "card__description", formatDescription(card, hero)),
  );
  element.addEventListener("click", () => onTap(element));
  return element;
}

// Трясёт карту, когда её нельзя разыграть
export function shakeCard(element) {
  element.classList.add("card--shake");
  element.addEventListener("animationend", () => element.classList.remove("card--shake"), { once: true });
}
