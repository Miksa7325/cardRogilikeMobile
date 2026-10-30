// Верхняя панель забега: HP, золото, этаж, колода, зелья и реликвии.
import { POTIONS } from "../../data/potions.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { getCurrentFloor } from "../../engine/run.js";
import { el } from "../dom.js";
import { openCardList } from "./cardList.js";
import { showTooltip } from "./tooltip.js";

function showItemDescription(item) {
  showTooltip(TEXTS.itemDescription(item.name, item.description));
}

function createIconButton(icon, onTap) {
  const button = el("button", "bar-icon", icon);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

// Зелья и реликвии в ряд: нажатие показывает описание.
// onPotionTap есть только в бою: там нажатие на зелье выбирает его.
export function createItemsRow(relics, potions, { onPotionTap = null, selectedPotionIndex = null } = {}) {
  const row = el("div", "bar-items");
  potions.forEach((potionId, index) => {
    const potion = POTIONS[potionId];
    // Сначала выбор зелья: он перерисовывает экран и убирает старую подсказку
    const button = createIconButton(potion.icon, () => {
      onPotionTap?.(index);
      showItemDescription(potion);
    });
    button.classList.add("bar-icon--potion");
    if (index === selectedPotionIndex) button.classList.add("bar-icon--selected");
    row.append(button);
  });
  for (const relicId of relics) {
    row.append(createIconButton(RELICS[relicId].icon, () => showItemDescription(RELICS[relicId])));
  }
  return row;
}

// В бою передаём combat: HP и зелья меняются раньше, чем попадают в забег.
// Кнопка колоды вне боя: в бою её заменяют стопки в нижней панели.
export function createRunBar(run, { combat = null, onPotionTap = null, selectedPotionIndex = null } = {}) {
  const bar = el("div", "run-bar");
  const hp = combat ? combat.hero.hp : run.hp;
  const potions = combat ? combat.potions : run.potions;

  bar.append(
    el("span", "", `❤️ ${hp}/${run.maxHp}`),
    el("span", "", `💰 ${run.gold}`),
    el("span", "", `${TEXTS.floor} ${getCurrentFloor(run)}`),
  );
  if (!combat) {
    bar.append(createIconButton("🃏", () => openCardList([{ title: TEXTS.deck, cards: run.deck }])));
  }
  bar.append(createItemsRow(run.relics, potions, { onPotionTap, selectedPotionIndex }));
  return bar;
}
