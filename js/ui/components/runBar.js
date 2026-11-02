// Верхняя панель забега: HP, золото, этаж, колода, зелья и реликвии.
import { POTIONS } from "../../data/potions.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { getCurrentFloor } from "../../engine/run.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { openCardList } from "./cardList.js";
import { showTooltip } from "./tooltip.js";

const MENU_CONFIRM_MS = 3000; // столько живёт предупреждение: столько же, сколько видна подсказка

function showItemDescription(item) {
  showTooltip(TEXTS.itemDescription(item.name, item.description));
}

function createIconButton(icon, onTap) {
  const button = el("button", "bar-icon", icon);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

// Кнопка выхода в главное меню. needsConfirm: прогресс текущего узла не сохранён,
// поэтому первое нажатие только предупреждает, а через несколько секунд предупреждение сбрасывается
export function createMenuButton({ needsConfirm = false, confirmText = TEXTS.menuConfirm } = {}) {
  let confirmed = !needsConfirm;
  return createIconButton("🏠", () => {
    if (confirmed) {
      state.test.pickerOpen = false;
      showScreen("start");
      return;
    }
    confirmed = true;
    showTooltip(confirmText);
    setTimeout(() => {
      confirmed = false;
    }, MENU_CONFIRM_MS);
  });
}

// Зелья и реликвии в ряд: нажатие показывает описание.
// onPotionTap есть только в бою: там нажатие на зелье выбирает его.
export function createItemsRow(relics, potions, options = {}) {
  const row = el("div", "bar-items");
  row.append(...createPotionButtons(potions, options), ...createRelicButtons(relics));
  return row;
}

// В бою зелья стоят слева, а реликвии справа
export function createCombatItems(relics, potions, options = {}) {
  const row = el("div", "combat__items");
  const potionGroup = el("div", "combat__potions");
  potionGroup.append(...createPotionButtons(potions, options));
  const relicGroup = el("div", "combat__relics");
  relicGroup.append(...createRelicButtons(relics));
  row.append(potionGroup, relicGroup);
  return row;
}

function createPotionButtons(potions, { onPotionTap = null, selectedPotionIndex = null }) {
  return potions.map((potionId, index) => {
    const potion = POTIONS[potionId];
    // Сначала выбор зелья: он перерисовывает экран и убирает старую подсказку
    const button = createIconButton(potion.icon, () => {
      onPotionTap?.(index);
      showItemDescription(potion);
    });
    button.classList.add("bar-icon--potion");
    if (index === selectedPotionIndex) button.classList.add("bar-icon--selected");
    return button;
  });
}

function createRelicButtons(relics) {
  return relics.map((relicId) => createIconButton(RELICS[relicId].icon, () => showItemDescription(RELICS[relicId])));
}

// В бою передаём combat: HP меняется раньше, чем попадает в забег.
// Кнопка колоды и предметы только вне боя: в бою их заменяют стопки и отдельный ряд предметов.
// allSaved: true только на карте — там всё сохранено, и выйти можно сразу.
export function createRunBar(run, { combat = null, allSaved = false } = {}) {
  const bar = el("div", "run-bar");
  const hp = combat ? combat.hero.hp : run.hp;

  bar.append(
    el("span", "bar-hp", `❤️ ${hp}/${run.maxHp}`),
    el("span", "", `💰 ${run.gold}`),
    el("span", "", TEXTS.floorLabel(run.act, getCurrentFloor(run))),
  );
  if (!combat) {
    bar.append(
      createIconButton("🃏", () => openCardList([{ title: TEXTS.deck, cards: run.deck }])),
      createItemsRow(run.relics, run.potions),
    );
  }
  bar.append(
    createMenuButton({ needsConfirm: !allSaved, confirmText: combat ? TEXTS.menuConfirmCombat : TEXTS.menuConfirm }),
  );
  return bar;
}
