// Окно с параметрами поверх экрана: для врага, реликвии, зелья или героя. Карты показывает cardPreview.js.
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";
import { closeOnTap, createGlossary, createRichText } from "./cardPreview.js";
import { hideTooltip } from "./tooltip.js";

// icon — готовый элемент с рисунком, kind — строка о типе предмета, text — описание, lines — строки параметров
export function openItemDetails({ icon, title, kind, text = "", lines = [] }) {
  hideTooltip();
  const overlay = el("div", "card-preview");
  const details = el("div", "preview__details");
  details.append(el("h2", "item-details__title", title), el("p", "preview__kind", kind));

  if (text) {
    details.append(createRichText("preview__text", text));
    const glossary = createGlossary(text);
    if (glossary) details.append(glossary);
  }
  for (const line of lines) details.append(el("p", "item-details__line", line));
  details.append(el("p", "preview__close", TEXTS.preview.close));

  icon.classList.add("item-details__icon");
  overlay.append(icon, details);
  closeOnTap(overlay);
  document.getElementById("app").append(overlay);
}
