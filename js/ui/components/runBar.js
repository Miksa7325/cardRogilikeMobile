// Верхняя панель забега: HP, золото и эссенции, которые герой несёт, этаж, колода, зелья и реликвии.
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
// Во всех местах игры реликвии слева, а зелья справа: так их не приходится искать заново на каждом экране
export function createItemsRow(relics, potions, options = {}) {
  const row = el("div", "bar-items");
  row.append(...createRelicButtons(relics), el("span", "bar-items__gap"), ...createPotionButtons(potions, options));
  return row;
}

// В бою реликвии слева, а зелья справа — как в подземелье и на верхней панели
export function createCombatItems(relics, potions, options = {}) {
  const row = el("div", "combat__items");
  const relicGroup = el("div", "combat__relics");
  relicGroup.append(...createRelicButtons(relics));
  const potionGroup = el("div", "combat__potions");
  potionGroup.append(...createPotionButtons(potions, options));
  row.append(relicGroup, potionGroup);
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

// Реликвии столбцом у левого края экрана, зелья — у правого: так они не теснят верхнюю панель
export function createItemColumns(relics, potions) {
  const relicColumn = el("div", "item-column item-column--relics");
  relicColumn.append(...createRelicButtons(relics));
  const potionColumn = el("div", "item-column item-column--potions");
  potionColumn.append(...createPotionButtons(potions, {}));
  return [relicColumn, potionColumn];
}

// В бою передаём combat: HP меняется раньше, чем попадает в забег.
// Кнопка колоды и предметы только вне боя: в бою их заменяют стопки и отдельный ряд предметов.
// allSaved: true только в подземелье — там всё сохранено, и выйти можно сразу.
// showItems: false — предметы показаны столбцами по бокам экрана. onStats — кнопка статистики забега
export function createRunBar(run, { combat = null, allSaved = false, showItems = true, onStats = null } = {}) {
  const bar = el("div", "run-bar");
  const hp = combat ? combat.hero.hp : run.hp;

  bar.append(
    el("span", "bar-hp", `❤️ ${hp}/${run.maxHp}`),
    el("span", "", `💰 ${run.gold}`),
    el("span", "", `🔮 ${run.essences}`),
    el("span", "", TEXTS.floorLabel(run.act, getCurrentFloor(run))),
  );
  if (!combat) bar.append(createIconButton("🃏", () => openCardList([{ title: TEXTS.deck, cards: run.deck }])));
  if (onStats) {
    const stats = createIconButton("📊", onStats);
    stats.setAttribute("aria-label", TEXTS.stats.button);
    bar.append(stats);
  }
  // Ряд предметов растягивается и прижимает кнопку меню вправо; без него (и в бою) это делает пустая распорка
  bar.append(!combat && showItems ? createItemsRow(run.relics, run.potions) : el("span", "run-bar__spacer"));
  bar.append(
    createMenuButton({ needsConfirm: !allSaved, confirmText: combat ? TEXTS.menuConfirmCombat : TEXTS.menuConfirm }),
  );
  return bar;
}
