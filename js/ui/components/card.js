// Рисует одну карту в руке.
import { TEXTS } from "../../data/texts.ru.js";
import { getCardData } from "../../engine/deck.js";
import { calculateBlock, calculateDamage } from "../../engine/effects.js";
import { playSound } from "../audio.js";
import { el } from "../dom.js";
import { addLongPress } from "../longPress.js";
import { showTooltip } from "./tooltip.js";

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
      return text.replace("{damage}", effect.fixed ? effect.amount : calculateDamage(effect.amount, hero, null));
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
    case "loseHp":
      return text.replace("{loseHp}", effect.amount);
    default:
      return text;
  }
}

// Подробное описание при удержании: полный текст и объяснение незнакомых слов
function describeCard(card, name, description) {
  const glossary = Object.entries(TEXTS.glossary)
    .filter(([word]) => description.includes(word))
    .map(([, explanation]) => explanation);
  return [`${name}: ${description}`, ...glossary].join(" ");
}

export function createCardElement(instance, hero, { playable, selected, onTap }) {
  const card = getCardData(instance);
  const element = el("div", `card card--${card.type} card--${card.rarity}`);
  element.classList.add(playable ? "card--playable" : "card--unplayable");
  if (selected) element.classList.add("card--selected");

  const name = instance.upgraded ? `${card.name}+` : card.name;
  const description = formatDescription(card, hero);

  // У карт, которые нельзя разыграть, значка стоимости нет
  if (card.cost !== null) element.append(el("div", "card__cost", card.cost));
  element.append(el("div", "card__name", name), el("div", "card__description", description));
  element.addEventListener("click", () => onTap(element));
  addLongPress(element, () => showTooltip(describeCard(card, name, description)));
  return element;
}

// Трясёт карту, когда её нельзя разыграть
export function shakeCard(element) {
  element.classList.add("card--shake");
  element.addEventListener("animationend", () => element.classList.remove("card--shake"), { once: true });
  playSound("error");
}
