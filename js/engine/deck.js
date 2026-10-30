// Колода в бою: стопка добора → рука → стопка сброса.
import { CONFIG } from "../config.js";
import { shuffle } from "./rng.js";

// У каждой карты свой uid: в колоде несколько одинаковых Ударов, а различать их нужно
export function createPiles(cardIds, rng) {
  const draw = cardIds.map((cardId, index) => ({ uid: index, cardId }));
  shuffle(rng, draw);
  return { draw, hand: [], discard: [] };
}

// Добирает карты; если добор пуст, сброс перемешивается и становится добором
export function drawCards(piles, count, rng) {
  for (let i = 0; i < count; i++) {
    if (piles.hand.length >= CONFIG.maxHandSize) return;
    if (piles.draw.length === 0) {
      if (piles.discard.length === 0) return;
      piles.draw = piles.discard;
      piles.discard = [];
      shuffle(rng, piles.draw);
    }
    piles.hand.push(piles.draw.pop());
  }
}

// Убирает карту из руки и возвращает её
export function takeFromHand(piles, uid) {
  const index = piles.hand.findIndex((card) => card.uid === uid);
  return piles.hand.splice(index, 1)[0];
}

// Вся рука уходит в сброс
export function discardHand(piles) {
  piles.discard.push(...piles.hand);
  piles.hand = [];
}
