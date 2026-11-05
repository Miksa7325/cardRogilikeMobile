// Значки статусов и сил бойца. Сами значки — в ui/icons.js: у статуса и значка одно имя (poison, rage…)
import { CARDS } from "../../data/cards.js";
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";
import { createIcon } from "../icons.js";

// Значок с подписью: «[значок] Яд 5» или коротко «[значок]5», когда места мало (несколько врагов в ряд)
function createBadge(iconName, text) {
  const badge = el("span", "status-badge");
  badge.append(createIcon(iconName), el("span", "status-badge__text", text));
  return badge;
}

export function createStatusIcons(unit, { compact = false } = {}) {
  const list = el("div", "statuses");
  for (const [status, amount] of Object.entries(unit.statuses)) {
    list.append(createBadge(status, compact ? String(amount) : `${TEXTS.statuses[status]} ${amount}`));
  }
  // Одинаковые силы показываем одним значком: «Ярость ×2»
  const powerCounts = {};
  for (const power of unit.powers ?? []) {
    powerCounts[power.cardId] = (powerCounts[power.cardId] ?? 0) + 1;
  }
  for (const [cardId, count] of Object.entries(powerCounts)) {
    const countText = count > 1 ? ` ×${count}` : "";
    list.append(createBadge("power", `${CARDS[cardId].name}${countText}`));
  }
  return list;
}
