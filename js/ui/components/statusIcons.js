// Значки статусов бойца: иконка, название и число стаков.
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";

const STATUS_ICONS = {
  vulnerable: "💔",
  strength: "💪",
};

export function createStatusIcons(unit) {
  const list = el("div", "statuses");
  for (const [status, amount] of Object.entries(unit.statuses)) {
    list.append(el("span", "", `${STATUS_ICONS[status]} ${TEXTS.statuses[status]} ${amount}`));
  }
  return list;
}
