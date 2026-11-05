// Рисует карту. На самой карте — значки с числами, полный текст показывает большая карта (cardPreview.js).
import { TEXTS } from "../../data/texts.ru.js";
import { getCardData } from "../../engine/deck.js";
import { calculateBlock, calculateDamage, getBonus } from "../../engine/effects.js";
import { playSound } from "../audio.js";
import { el } from "../dom.js";
import { CARD_ART } from "../cardArt.js";
import { addLongPress } from "../longPress.js";
import { STATUS_ICONS } from "./statusIcons.js";

const NAME_FIT_LETTERS = 8; // столько букв помещается в строку названия обычным шрифтом

// Эффекты карты вместе с теми, что спрятаны внутри «потратить ресурс»: числа в описании идут в этом порядке
function flattenEffects(effects) {
  return effects.flatMap((effect) => (effect.type === "spend" ? [effect, ...flattenEffects(effect.effects)] : [effect]));
}

// Подставляет в полное описание итоговые числа: например, {damage} с учётом Силы, Слабости и ресурса героя
export function formatDescription(card, hero) {
  let text = card.description;
  for (const effect of flattenEffects(card.effects)) {
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
    case "damage": {
      const base = effect.amount + getBonus(effect, hero);
      return text.replace("{damage}", effect.fixed ? base : calculateDamage(base, hero, null));
    }
    case "block":
      return text.replace("{block}", calculateBlock(effect.amount + getBonus(effect, hero), hero, fromCard));
    case "applyStatus":
      return text.replace(`{${effect.status}}`, effect.amount + getBonus(effect, hero));
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

// Цвет рисунка зависит от главного, что делает карта
function pickArtColor(card) {
  const effects = flattenEffects([...card.effects, ...(card.power?.effects ?? [])]);
  const has = (type) => effects.some((effect) => effect.type === type);
  const hasStatus = (...names) => effects.some((effect) => names.includes(effect.status));
  if (card.cost === null) return "skull";
  if (hasStatus("poison")) return "poison";
  if (hasStatus("leech")) return "heart";
  if (card.type === "power") return "star";
  if (has("damage")) {
    if (card.target === "allEnemies") return "wave";
    return effects.filter((effect) => effect.type === "damage").length > 1 ? "blades" : "sword";
  }
  if (has("block")) return "shield";
  if (hasStatus("weak", "vulnerable", "frail")) return "hex";
  if (has("heal")) return "heart";
  if (has("gainEnergy")) return "bolt";
  if (has("draw")) return "scroll";
  if (has("exhaustWounds")) return "flame";
  if (has("brewPotion")) return "poison";
  return "star";
}

// Число сравниваем с базовым: зелёное — усилено, красное — ослаблено
function createValue(text, current, base) {
  const value = el("b", "card__value", text);
  if (current > base) value.classList.add("card__value--up");
  if (current < base) value.classList.add("card__value--down");
  return value;
}

function createLine(icon, valueElement, suffix = "") {
  const line = el("div", "card__line");
  line.append(el("span", "card__icon", icon));
  if (valueElement) line.append(valueElement);
  if (suffix) line.append(el("span", "card__suffix", suffix));
  return line;
}

// Превращает список эффектов в короткие строки со значками. Эффект с целью «все» подписывается,
// а эффект, который растёт от ресурса героя, — сколько он прибавляет: «+2/💢»
function createEffectLines(effects, card, hero, fromCard) {
  const { face } = TEXTS;
  const lines = [];
  const allSuffix = (effect) => (card.target === "allEnemies" || effect.target === "allEnemies" ? face.all : "");
  const growSuffix = (effect) => (effect.bonus ? `+${effect.bonus.per}/${STATUS_ICONS[effect.bonus.status]}` : "");
  const suffix = (effect) => [allSuffix(effect), growSuffix(effect)].filter(Boolean).join(" ");

  for (let i = 0; i < effects.length; i++) {
    const effect = effects[i];
    switch (effect.type) {
      case "damage": {
        // Несколько одинаковых ударов подряд — одна строка: «⚔️ 5×3»
        let hits = 1;
        while (effects[i + hits]?.type === "damage" && effects[i + hits].amount === effect.amount) hits += 1;
        i += hits - 1;
        const base = effect.amount + getBonus(effect, hero);
        const amount = effect.fixed ? base : calculateDamage(base, hero, null);
        const text = hits > 1 ? `${amount}×${hits}` : String(amount);
        lines.push(createLine("⚔️", createValue(text, amount, effect.amount), suffix(effect)));
        break;
      }
      case "block": {
        const amount = calculateBlock(effect.amount + getBonus(effect, hero), hero, fromCard);
        lines.push(createLine("🛡️", createValue(String(amount), amount, effect.amount), growSuffix(effect)));
        break;
      }
      case "applyStatus": {
        const amount = effect.amount + getBonus(effect, hero);
        lines.push(createLine(STATUS_ICONS[effect.status], createValue(String(amount), amount, effect.amount), suffix(effect)));
        break;
      }
      // «Ярость 3:» и под ней то, что случится, если ресурса хватит
      case "spend":
        lines.push(createLine(STATUS_ICONS[effect.status], createValue(`${effect.amount}:`, 0, 0), face.spend));
        lines.push(...createEffectLines(effect.effects, card, hero, fromCard));
        break;
      case "brewPotion":
        lines.push(createLine("🧪", createValue(`+${effect.amount}`, 0, 0), face.brew));
        break;
      case "multiplyStatus":
        lines.push(createLine(STATUS_ICONS[effect.status], createValue(`×${effect.factor}`, 0, 0)));
        break;
      case "draw":
        lines.push(createLine("🃏", createValue(`+${effect.amount}`, 0, 0)));
        break;
      case "gainEnergy":
        lines.push(createLine("⚡", createValue(`+${effect.amount}`, 0, 0)));
        break;
      case "heal":
        lines.push(createLine("❤️", createValue(`+${effect.amount}`, 0, 0)));
        break;
      case "loseHp":
        lines.push(createLine("🩸", createValue(`−${effect.amount}`, 0, 0)));
        break;
      case "addCard": {
        // Несколько Ран подряд — одна строка
        let count = 1;
        while (effects[i + count]?.type === "addCard") count += 1;
        i += count - 1;
        lines.push(createLine("🩹", createValue(`+${count}`, 0, 0), face.wound));
        break;
      }
      case "exhaustWounds":
        lines.push(createLine("🔥", null, face.burnWounds));
        break;
      default: // Сжигание показывается отдельной пометкой внизу карты
        break;
    }
  }
  return lines;
}

// Смысл карты в значках: эффекты, условие силы и пометка «Сжечь»
function createEffects(card, hero) {
  const block = el("div", "card__effects");
  block.append(...createEffectLines(card.effects, card, hero, true));

  if (card.power) {
    const label = card.power.cardType ? TEXTS.face.triggers[card.power.cardType] : TEXTS.face.triggers[card.power.trigger];
    block.append(el("div", "card__trigger", label), ...createEffectLines(card.power.effects, card, hero, false));
  }
  if (card.cost === null) block.append(el("div", "card__trigger", TEXTS.face.unplayable));
  if (card.effects.some((effect) => effect.type === "exhaust")) block.append(el("div", "card__burn", TEXTS.face.burn));
  return block;
}

// Лицо карты. Его же использует большая карта в cardPreview.js
export function fillCardFace(element, instance, hero) {
  const card = getCardData(instance);
  const fullName = instance.upgraded ? `${card.name}+` : card.name;

  if (card.cost !== null) element.append(el("div", "card__cost", card.cost));

  const art = el("div", `card__art card__art--${pickArtColor(card)}`);
  art.innerHTML = `<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="${CARD_ART[instance.cardId]}"/></svg>`;

  // Длинное слово в названии получает шрифт поменьше, иначе в руке оно разорвётся на части
  const longestWord = Math.max(...fullName.split(" ").map((word) => word.length));
  element.style.setProperty("--name-fit", Math.min(1, NAME_FIT_LETTERS / longestWord));

  const name = el("div", "card__name", fullName);
  if (instance.upgraded) name.classList.add("card__name--upgraded");
  element.append(name, art, createEffects(card, hero));
}

// Значок карты для коллекции: только рисунок на цвете её типа, рамка показывает редкость
export function createCardIcon(card) {
  const icon = el("div", `collection-tile__icon collection-tile__icon--card card--${card.type} card--${card.rarity}`);
  icon.innerHTML = `<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="${CARD_ART[card.id]}"/></svg>`;
  return icon;
}

export function createCardElement(instance, hero, { playable, selected, onTap, onHold = null }) {
  const card = getCardData(instance);
  const element = el("div", `card card--${card.type} card--${card.rarity}`);
  element.classList.add(playable ? "card--playable" : "card--unplayable");
  if (selected) element.classList.add("card--selected");
  fillCardFace(element, instance, hero);

  element.addEventListener("click", () => onTap(element));
  if (onHold) addLongPress(element, onHold);
  return element;
}

// Трясёт карту, когда её нельзя разыграть
export function shakeCard(element) {
  element.classList.add("card--shake");
  element.addEventListener("animationend", () => element.classList.remove("card--shake"), { once: true });
  playSound("error");
}
