// Значки статусов и сил бойца.
import { CARDS } from "../../data/cards.js";
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";

const STATUS_ICONS = {
  vulnerable: "💔",
  strength: "💪",
  dexterity: "🤸",
  weak: "🥀",
  frail: "🧊",
  poison: "☠️",
};

// compact: true показывает только иконку и число, когда места мало (несколько врагов в ряд)
export function createStatusIcons(unit, { compact = false } = {}) {
  const list = el("div", "statuses");
  for (const [status, amount] of Object.entries(unit.statuses)) {
    const label = compact ? `${STATUS_ICONS[status]}${amount}` : `${STATUS_ICONS[status]} ${TEXTS.statuses[status]} ${amount}`;
    list.append(el("span", "", label));
  }
  // Одинаковые силы показываем одним значком: «✨ Ярость ×2»
  const powerCounts = {};
  for (const power of unit.powers ?? []) {
    powerCounts[power.cardId] = (powerCounts[power.cardId] ?? 0) + 1;
  }
  for (const [cardId, count] of Object.entries(powerCounts)) {
    const countText = count > 1 ? ` ×${count}` : "";
    list.append(el("span", "", `✨ ${CARDS[cardId].name}${countText}`));
  }
  return list;
}
