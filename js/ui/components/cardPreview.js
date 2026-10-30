// Большая карта поверх экрана: полное описание, термины и что даст улучшение.
import { TEXTS } from "../../data/texts.ru.js";
import { canUpgradeCard, getCardData } from "../../engine/deck.js";
import { el } from "../dom.js";
import { fillCardFace, formatDescription } from "./card.js";
import { hideTooltip } from "./tooltip.js";

// Числа и термины в тексте выделяются. Текст собираем из узлов, поэтому разметка в него не попадёт
const HIGHLIGHT = /(\d+|Сжечь|Сжечь Раны|Яд[а-я]*|Уязвимост[а-я]*|Слабост[а-я]*|Сил[а-я]*|Ловкост[а-я]*|Хрупкост[а-я]*|Ран[а-я]*|блок[а-я]*)/g;

function createRichText(className, text) {
  const paragraph = el("p", className);
  let last = 0;
  for (const match of text.matchAll(HIGHLIGHT)) {
    paragraph.append(text.slice(last, match.index));
    const isNumber = /^\d/.test(match[0]);
    paragraph.append(el("b", isNumber ? "preview__number" : "preview__keyword", match[0]));
    last = match.index + match[0].length;
  }
  paragraph.append(text.slice(last));
  return paragraph;
}

// Какие термины встречаются в описании
function createGlossary(text) {
  const entries = Object.entries(TEXTS.glossary).filter(([word]) => text.includes(word));
  if (entries.length === 0) return null;
  const list = el("div", "preview__glossary");
  for (const [, explanation] of entries) list.append(el("p", "preview__term", explanation));
  return list;
}

// Что изменится после улучшения. Карте со сниженной ценой хватит строки о цене
function createUpgradeNote(instance, hero) {
  if (instance.upgraded || !canUpgradeCard(instance.cardId)) return null;
  const normal = getCardData(instance);
  const upgraded = getCardData({ ...instance, upgraded: true });
  const parts = [];
  const text = formatDescription(upgraded, hero);
  if (text !== formatDescription(normal, hero)) parts.push(text);
  if (upgraded.cost !== normal.cost) parts.push(TEXTS.preview.upgradeCost(upgraded.cost));
  return parts.length > 0 ? createRichText("preview__upgrade", `${TEXTS.preview.upgrade} ${parts.join(" ")}`) : null;
}

export function openCardPreview(instance, hero) {
  hideTooltip();
  const card = getCardData(instance);
  const overlay = el("div", "card-preview");

  const big = el("div", `card card--large card--${card.type} card--${card.rarity} card--playable`);
  fillCardFace(big, instance, hero);

  const text = formatDescription(card, hero);
  const details = el("div", "preview__details");
  details.append(
    el("p", "preview__kind", `${TEXTS.preview.types[card.type]} · ${TEXTS.preview.rarities[card.rarity]}`),
    createRichText("preview__text", text),
  );
  const glossary = createGlossary(text);
  if (glossary) details.append(glossary);
  const upgrade = createUpgradeNote(instance, hero);
  if (upgrade) details.append(upgrade);
  details.append(el("p", "preview__close", TEXTS.preview.close));

  overlay.append(big, details);

  // Закрываем только касанием, которое началось уже на большой карте.
  // Иначе карта, открытая удержанием, закрылась бы сразу, как только игрок отпустит палец
  let pressedHere = false;
  overlay.addEventListener("pointerdown", () => {
    pressedHere = true;
  });
  overlay.addEventListener("click", () => {
    if (pressedHere) overlay.remove();
  });
  document.getElementById("app").append(overlay);
}
