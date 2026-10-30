// Логика магазина: товары, покупка, удаление карты. Этот файл не трогает HTML.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { POTIONS } from "../data/potions.js";
import { shuffle } from "./rng.js";
import { addCardToDeck, addRelic, canCarryPotion, getRelicPool, nodeRng, removeCardFromDeck, rollCardChoices } from "./run.js";

// Заполняет магазин на текущем узле. Товары зависят только от seed забега и узла
export function createShop(run) {
  const rng = nodeRng(run, "shop");
  const { cardCount, relicCount, potionCount, cardPrices, relicPrices, potionPrice, removePrice } = CONFIG.shop;

  const relicPool = getRelicPool(run, ["common", "uncommon"]);
  shuffle(rng, relicPool);
  const potionPool = Object.keys(POTIONS);
  shuffle(rng, potionPool);

  run.shop = {
    cards: rollCardChoices(rng, null, cardCount).map((id) => ({ id, price: cardPrices[CARDS[id].rarity], sold: false })),
    relics: relicPool.slice(0, relicCount).map((relic) => ({ id: relic.id, price: relicPrices[relic.rarity], sold: false })),
    potions: potionPool.slice(0, potionCount).map((id) => ({ id, price: potionPrice, sold: false })),
    removePrice,
    removeUsed: false,
  };
}

// Покупка товара. section: "cards", "relics" или "potions".
// Возвращает { ok: true } или { ok: false, reason: "..." }
export function buyShopItem(run, section, index) {
  const item = run.shop[section][index];
  if (item.sold) return { ok: false, reason: "sold" };
  if (run.gold < item.price) return { ok: false, reason: "notEnoughGold" };
  if (section === "potions" && !canCarryPotion(run)) return { ok: false, reason: "potionsFull" };

  run.gold -= item.price;
  item.sold = true;
  if (section === "cards") addCardToDeck(run, item.id);
  if (section === "relics") addRelic(run, item.id);
  if (section === "potions") run.potions.push(item.id);
  return { ok: true };
}

export function canRemoveCardAtShop(run) {
  return !run.shop.removeUsed && run.gold >= run.shop.removePrice && run.deck.length > 0;
}

// Удаление карты из колоды: один раз за магазин
export function removeCardAtShop(run, uid) {
  if (!canRemoveCardAtShop(run)) return false;
  run.gold -= run.shop.removePrice;
  run.shop.removeUsed = true;
  removeCardFromDeck(run, uid);
  return true;
}
