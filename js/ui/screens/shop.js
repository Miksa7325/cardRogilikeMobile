// Лавка в подземелье: карта подземелья на этот акт и избавление от карты из колоды за золото, которое несёт герой.
// В лавку можно вернуться: карта подземелья продаётся, пока её нет, а от карты избавляют один раз.
import { CONFIG } from "../../config.js";
import { TEXTS } from "../../data/texts.ru.js";
import { buyShopMap, canBuyShopMap, canRemoveCardAtShop, isShopRemovalUsed, removeCardAtShop } from "../../engine/shop.js";
import { saveRun } from "../../save.js";
import { state } from "../../state.js";
import { playSound } from "../audio.js";
import { openCardList } from "../components/cardList.js";
import { createRunBar } from "../components/runBar.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderShopScreen(root) {
  const run = state.run;
  const screen = el("main", "center-screen center-screen--with-bar");
  screen.append(
    createRunBar(run),
    el("h1", "center-screen__title", TEXTS.shop.title),
    el("p", "reward__line", TEXTS.shop.text),
    createMapButton(run),
    createRemoveButton(run),
    createButton(TEXTS.shop.leave, "button--large", () => showScreen("dungeon")),
  );
  root.append(screen);
}

// Покупку сразу записываем: иначе, закрыв игру в лавке, герой остался бы без карты, но и без золота
function bought(run) {
  if (!saveRun(run)) showTooltip(TEXTS.saveFailed);
  playSound("buy");
  showScreen("shop");
}

function createMapButton(run) {
  const text = run.hasMap ? TEXTS.shop.mapOwned : TEXTS.shop.map(CONFIG.shop.mapPrice);
  const button = createButton(text, "button--secondary", () => {
    if (buyShopMap(run)) bought(run);
  });
  button.disabled = !canBuyShopMap(run);
  return button;
}

function createRemoveButton(run) {
  const text = isShopRemovalUsed(run) ? TEXTS.shop.removeUsed : TEXTS.shop.remove(CONFIG.shop.removePrice);
  const button = createButton(text, "button--secondary", () => {
    openCardList([{ title: TEXTS.shop.removeTitle, cards: run.deck }], (card) => {
      if (removeCardAtShop(run, card.uid)) bought(run);
    });
  });
  button.disabled = !canRemoveCardAtShop(run);
  return button;
}
