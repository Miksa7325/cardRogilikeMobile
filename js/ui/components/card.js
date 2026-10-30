// Рисует одну карту в руке.
import { getCardData } from "../../engine/deck.js";
import { calculateBlock, calculateDamage } from "../../engine/effects.js";
import { el } from "../dom.js";

// Подставляет в описание итоговые числа: например, {damage} с учётом Силы и Слабости героя
function formatDescription(card, hero) {
  let text = card.description;
  for (const effect of card.effects) {
    text = fillEffect(text, effect, hero, true);
  }
  // Эффекты силы идут не от разыгранной карты, поэтому Ловкость на них не влияет
  for (const effect of card.power?.effects ?? []) {
    text = fillEffect(text, effect, hero, false);
  }
  return text;
}

function fillEffect(text, effect, hero, fromCard) {
  switch (effect.type) {
    case "damage":
      return text.replace("{damage}", calculateDamage(effect.amount, hero, null));
    case "block":
      return text.replace("{block}", calculateBlock(effect.amount, hero, fromCard));
    case "applyStatus":
      return text.replace(`{${effect.status}}`, effect.amount);
    case "draw":
      return text.replace("{draw}", effect.amount);
    case "gainEnergy":
      return text.replace("{energy}", effect.amount);
    case "heal":
      return text.replace("{heal}", effect.amount);
    default:
      return text;
  }
}

export function createCardElement(instance, hero, { playable, selected, onTap }) {
  const card = getCardData(instance);
  const element = el("div", `card card--${card.type}`);
  element.classList.add(playable ? "card--playable" : "card--unplayable");
  if (selected) element.classList.add("card--selected");

  // У карт, которые нельзя разыграть, значка стоимости нет
  if (card.cost !== null) element.append(el("div", "card__cost", card.cost));
  element.append(
    el("div", "card__name", instance.upgraded ? `${card.name}+` : card.name),
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
