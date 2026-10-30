// Короткая подсказка поверх экрана: сама исчезает через несколько секунд.
import { el } from "../dom.js";

const VISIBLE_MS = 3000;
let current = null;
let timer = null;

export function showTooltip(text) {
  hideTooltip();
  current = el("div", "tooltip", text);
  document.body.append(current);
  timer = setTimeout(hideTooltip, VISIBLE_MS);
}

export function hideTooltip() {
  current?.remove();
  clearTimeout(timer);
}
