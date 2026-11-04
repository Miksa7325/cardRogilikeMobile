// Лавка в подземелье. Платят золотом, которое несёт герой: карта подземелья на этот акт и избавление от одной карты
// из колоды. Этот файл не трогает HTML.
import { CONFIG } from "../config.js";
import { getAct, removeCardFromDeck } from "./run.js";

// В каждой лавке от карты можно избавиться один раз: запоминаем лавку по акту и комнате
function shopKey(run) {
  return `${run.act}:${run.currentNodeId}`;
}

// В кромешной тьме карта бесполезна: её и не продают
export function canBuyShopMap(run) {
  return !run.hasMap && !getAct(run).mechanic.noMap && run.gold >= CONFIG.shop.mapPrice;
}

// Покупает карту подземелья на этот акт. Возвращает false, если она уже есть или не хватает золота
export function buyShopMap(run) {
  if (!canBuyShopMap(run)) return false;
  run.gold -= CONFIG.shop.mapPrice;
  run.hasMap = true;
  return true;
}

export function isShopRemovalUsed(run) {
  return run.shopRemovals.includes(shopKey(run));
}

export function canRemoveCardAtShop(run) {
  return !isShopRemovalUsed(run) && run.gold >= CONFIG.shop.removePrice && run.deck.length > 0;
}

// Убирает карту из колоды навсегда. Возвращает false, если в этой лавке это уже сделано или не хватает золота
export function removeCardAtShop(run, uid) {
  if (!canRemoveCardAtShop(run) || !run.deck.some((card) => card.uid === uid)) return false;
  run.gold -= CONFIG.shop.removePrice;
  removeCardFromDeck(run, uid);
  run.shopRemovals.push(shopKey(run));
  return true;
}
