// Экран магазина: карты, реликвии, зелья и удаление карты из колоды.
import { POTIONS } from "../../data/potions.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { buyShopItem, canRemoveCardAtShop, removeCardAtShop } from "../../engine/shop.js";
import { state } from "../../state.js";
import { playSound } from "../audio.js";
import { createCardElement, shakeCard } from "../components/card.js";
import { openCardPreview } from "../components/cardPreview.js";
import { openCardList } from "../components/cardList.js";
import { createRunBar } from "../components/runBar.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

// Вне боя статусов нет: числа на картах показываем без них
const HERO_OUTSIDE_COMBAT = { statuses: {} };

export function renderShopScreen(root) {
  const run = state.run;
  const shop = run.shop;

  const screen = el("main", "center-screen center-screen--with-bar");
  screen.append(
    createRunBar(run),
    el("h1", "center-screen__title", TEXTS.shop.title),
    el("p", "shop__section", TEXTS.shop.cards),
    createCardGoods(shop),
    el("p", "shop__section", TEXTS.shop.relics),
    createItemGoods(shop, "relics", RELICS),
    el("p", "shop__section", TEXTS.shop.potions),
    createItemGoods(shop, "potions", POTIONS),
    createRemoveButton(run),
    createLeaveButton(),
  );
  root.append(screen);
}

function createCardGoods(shop) {
  const row = el("div", "card-row");
  shop.cards.forEach((item, index) => {
    const wrapper = el("div", "shop__card");
    const instance = { uid: index, cardId: item.id, upgraded: false };
    const card = createCardElement(instance, HERO_OUTSIDE_COMBAT, {
      playable: !item.sold,
      selected: false,
      onTap: (element) => tryBuy("cards", index, element),
      onHold: () => openCardPreview(instance, HERO_OUTSIDE_COMBAT),
    });
    wrapper.append(card, el("div", "shop__price", item.sold ? TEXTS.shop.sold : TEXTS.shop.price(item.price)));
    row.append(wrapper);
  });
  return row;
}

// Реликвии и зелья выглядят одинаково: строка с иконкой, описанием и ценой
function createItemGoods(shop, section, catalog) {
  const list = el("div", "shop__items");
  shop[section].forEach((item, index) => {
    const data = catalog[item.id];
    const price = item.sold ? TEXTS.shop.sold : TEXTS.shop.price(item.price);
    const row = el("button", "shop__item", `${data.icon} ${data.name}: ${data.description} ${price}`);
    row.type = "button";
    row.disabled = item.sold;
    row.addEventListener("click", () => tryBuy(section, index, row));
    list.append(row);
  });
  return list;
}

function tryBuy(section, index, element) {
  const result = buyShopItem(state.run, section, index);
  if (result.ok) {
    playSound("buy");
    showScreen("shop");
    return;
  }
  // Как и в бою: неверное действие — элемент трясётся, а подсказка объясняет почему
  shakeCard(element);
  if (result.reason === "notEnoughGold") showTooltip(TEXTS.shop.notEnoughGold);
  if (result.reason === "potionsFull") showTooltip(TEXTS.shop.potionsFull);
}

function createRemoveButton(run) {
  const text = run.shop.removeUsed ? TEXTS.shop.removeUsed : TEXTS.shop.remove(run.shop.removePrice);
  const button = el("button", "button button--secondary", text);
  button.type = "button";
  button.disabled = !canRemoveCardAtShop(run);
  button.addEventListener("click", () => {
    openCardList([{ title: TEXTS.shop.removeTitle, cards: run.deck }], (card) => {
      removeCardAtShop(run, card.uid);
      showScreen("shop");
    });
  });
  return button;
}

function createLeaveButton() {
  const button = el("button", "button button--large", TEXTS.shop.leave);
  button.type = "button";
  button.addEventListener("click", () => showScreen("map"));
  return button;
}
