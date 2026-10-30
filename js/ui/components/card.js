// Рисует одну карту.
import { TEXTS } from "../../data/texts.ru.js";
import { getCardData } from "../../engine/deck.js";
import { calculateBlock, calculateDamage } from "../../engine/effects.js";
import { CARD_GLYPHS } from "../art.js";
import { playSound } from "../audio.js";
import { el } from "../dom.js";
import { addLongPress } from "../longPress.js";
import { showTooltip } from "./tooltip.js";

const NAME_FIT_LETTERS = 9; // столько букв помещается в строку названия обычным шрифтом

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

// Какой значок нарисовать на карте: по главному, что она делает
function pickGlyph(card) {
  const effects = [...card.effects, ...(card.power?.effects ?? [])];
  const has = (type) => effects.some((effect) => effect.type === type);
  if (card.cost === null) return "skull";
  if (card.type === "power") return "star";
  if (effects.some((effect) => effect.status === "poison")) return "poison";
  if (has("damage")) {
    if (card.target === "allEnemies") return "wave";
    return effects.filter((effect) => effect.type === "damage").length > 1 ? "blades" : "sword";
  }
  if (has("block")) return "shield";
  if (has("heal")) return "heart";
  if (has("gainEnergy")) return "bolt";
  if (has("draw")) return "scroll";
  return "star";
}

// Подробное описание: полный текст и объяснение незнакомых слов
export function describeCard(instance, hero) {
  const card = getCardData(instance);
  const name = instance.upgraded ? `${card.name}+` : card.name;
  const description = formatDescription(card, hero);
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

  const glyph = el("div", "card__glyph");
  glyph.innerHTML = CARD_GLYPHS[pickGlyph(card)];
  element.append(glyph);

  // Длинное слово в названии получает шрифт поменьше, иначе в руке оно разорвётся на части
  const fullName = instance.upgraded ? `${card.name}+` : card.name;
  const longestWord = Math.max(...fullName.split(" ").map((word) => word.length));
  element.style.setProperty("--name-fit", Math.min(1, NAME_FIT_LETTERS / longestWord));

  // У карт, которые нельзя разыграть, значка стоимости нет
  if (card.cost !== null) element.append(el("div", "card__cost", card.cost));
  element.append(
    el("div", "card__name", instance.upgraded ? `${card.name}+` : card.name),
    el("div", "card__description", formatDescription(card, hero)),
  );
  element.addEventListener("click", () => onTap(element));
  addLongPress(element, () => showTooltip(describeCard(instance, hero)));
  return element;
}

// Трясёт карту, когда её нельзя разыграть
export function shakeCard(element) {
  element.classList.add("card--shake");
  element.addEventListener("animationend", () => element.classList.remove("card--shake"), { once: true });
  playSound("error");
}
