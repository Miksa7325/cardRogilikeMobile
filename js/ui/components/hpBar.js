// Полоска здоровья с числами и блоком.
import { el } from "../dom.js";

export function createHpBar(unit) {
  const bar = el("div", "hp-bar");
  if (unit.block > 0) bar.classList.add("hp-bar--blocked");

  const fill = el("div", "hp-bar__fill");
  fill.style.width = `${(unit.hp / unit.maxHp) * 100}%`;

  const blockText = unit.block > 0 ? ` 🛡️${unit.block}` : "";
  bar.append(fill, el("div", "hp-bar__label", `${unit.hp}/${unit.maxHp}${blockText}`));
  return bar;
}
