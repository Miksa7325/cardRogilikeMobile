// Полоска здоровья с числами и блоком.
import { el } from "../dom.js";

// Заполнение полоски: доля от 0 до 1. Это transform, а не ширина: анимация не пересчитывает раскладку
export function setHpFill(fill, share) {
  fill.style.transform = `scaleX(${Math.max(0, Math.min(1, share))})`;
}

export function createHpBar(unit) {
  const bar = el("div", "hp-bar");
  if (unit.block > 0) bar.classList.add("hp-bar--blocked");

  const fill = el("div", "hp-bar__fill");
  setHpFill(fill, unit.hp / unit.maxHp);

  const blockText = unit.block > 0 ? ` 🛡️${unit.block}` : "";
  bar.append(fill, el("div", "hp-bar__label", `${unit.hp}/${unit.maxHp}${blockText}`));
  return bar;
}
