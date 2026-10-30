// Список карт поверх экрана: просмотр колоды, стопок и выбор карты для удаления.
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";
import { createCardElement } from "./card.js";
import { hideTooltip } from "./tooltip.js";

// Вне боя статусов нет: числа на картах показываем без них
const HERO_OUTSIDE_COMBAT = { statuses: {} };

// sections: [{ title, cards }]. onPick необязателен: с ним нажатие на карту выбирает её
export function openCardList(sections, onPick = null) {
  hideTooltip();
  const overlay = el("div", "picker");

  const closeButton = el("button", "button", TEXTS.close);
  closeButton.type = "button";
  closeButton.addEventListener("click", () => overlay.remove());
  overlay.append(closeButton);

  for (const { title, cards } of sections) {
    overlay.append(el("p", "picker__title", `${title} (${cards.length})`));
    if (cards.length === 0) overlay.append(el("p", "picker__empty", TEXTS.emptyPile));

    const row = el("div", "card-row");
    for (const card of cards) {
      row.append(createCardElement(card, HERO_OUTSIDE_COMBAT, {
        playable: true,
        selected: false,
        onTap: () => {
          if (!onPick) return;
          overlay.remove();
          onPick(card);
        },
      }));
    }
    overlay.append(row);
  }
  document.getElementById("app").append(overlay);
}
