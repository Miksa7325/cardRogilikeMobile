// Службы городских зданий: что они делают с героем и казной. Этот файл не трогает HTML и хранилище:
// сохраняет данные save.js, а показывает их ui/screens/cityServices.js.
// Все службы работают со снаряжением героя (getGear): если он сейчас в забеге — с тем, что при нём в забеге,
// иначе — с тем, что лежит в доме героев. У забега и у снаряжения одинаковые поля: deck, relics, potions, maxHp.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { COSMETICS } from "../data/cosmetics.js";
import { HEROES } from "../data/heroes.js";
import { RELICS } from "../data/relics.js";
import { canUpgradeCard } from "./deck.js";
import { getLockedContent, isHeroDead } from "./meta.js";
import { pickRandom, pickWeighted } from "./rng.js";

export function isBuilt(meta, buildingId) {
  return meta.buildings.includes(buildingId);
}

// Снаряжение героя, которого ещё не было в подземелье: стартовая колода и реликвия
function createStarterEquipment(heroId) {
  const hero = HEROES[heroId];
  return {
    deck: hero.deck.map((cardId, uid) => ({ uid, cardId, upgraded: false })),
    nextCardUid: hero.deck.length,
    relics: [...hero.relics],
    potions: [],
    maxHp: hero.maxHp,
    fireflies: false,
  };
}

// Снаряжение, с которым работают службы. Если героя ещё не было в подземелье, у него появляется стартовое
export function getGear(meta, run, heroId) {
  if (run && run.heroId === heroId) return run;
  meta.heroes[heroId] ??= { dead: false };
  meta.heroes[heroId].equipment ??= createStarterEquipment(heroId);
  return meta.heroes[heroId].equipment;
}

// Платит из казны. Возвращает false, если золота не хватает
function pay(meta, price) {
  if (meta.gold < price) return false;
  meta.gold -= price;
  return true;
}

// Тренировочная арена: какие карты можно улучшить
export function getTrainableCards(gear) {
  return gear.deck.filter((card) => !card.upgraded && canUpgradeCard(card.cardId));
}

export function trainCard(meta, gear, uid) {
  const card = gear.deck.find((item) => item.uid === uid);
  if (!card || card.upgraded || !canUpgradeCard(card.cardId) || !pay(meta, CONFIG.city.prices.training)) return false;
  card.upgraded = true;
  return true;
}

// Храм: очищение — карта уходит из колоды навсегда
export function cleanseCard(meta, gear, uid) {
  if (!gear.deck.some((card) => card.uid === uid) || !pay(meta, CONFIG.city.prices.cleanse)) return false;
  gear.deck = gear.deck.filter((card) => card.uid !== uid);
  return true;
}

// Храм: благословение прибавляет к запасу здоровья. Каждое следующее дороже: иначе золото без конца превращалось бы в HP.
// Герой в забеге сразу получает и сами HP
export function getBlessingPrice(gear) {
  return CONFIG.city.prices.blessing + (gear.blessings ?? 0) * CONFIG.city.prices.blessingStep;
}

export function blessHero(meta, gear) {
  if (!pay(meta, getBlessingPrice(gear))) return false;
  gear.blessings = (gear.blessings ?? 0) + 1;
  gear.maxHp += CONFIG.city.blessingHp;
  if (gear.hp !== undefined) gear.hp += CONFIG.city.blessingHp;
  return true;
}

// Кузница: реликвии, которые можно выковать. Без тех, что срабатывают при получении: им не на чем сработать в городе
function getForgePool(meta, gear) {
  const { lockedRelicIds } = getLockedContent(meta);
  return Object.values(RELICS).filter((relic) => (
    ["common", "uncommon"].includes(relic.rarity) && relic.trigger !== "onPickup"
    && !gear.relics.includes(relic.id) && !lockedRelicIds.includes(relic.id)
  ));
}

// Выковывает случайную реликвию. Возвращает её id или null, если ковать нечего или нечем платить
export function forgeRelic(meta, gear, rng) {
  const pool = getForgePool(meta, gear);
  if (pool.length === 0 || !pay(meta, CONFIG.city.prices.forge)) return null;
  const relic = pickRandom(rng, pool);
  gear.relics.push(relic.id);
  if (!meta.seen.relics.includes(relic.id)) meta.seen.relics.push(relic.id);
  return relic.id;
}

// Библиотека: три карты героя на выбор. Пока одну не выучат, выбор тот же: перебирать его бесплатно нельзя
export function getLibraryOffers(meta, heroId, rng) {
  meta.library ??= {};
  if (!meta.library[heroId]) {
    const pool = Object.values(CARDS).filter((card) => card.hero === heroId && !["starter", "status"].includes(card.rarity));
    const offers = [];
    while (offers.length < CONFIG.rewards.cardChoices && offers.length < pool.length) {
      const rarity = pickWeighted(rng, CONFIG.city.studyRarityWeights);
      const free = pool.filter((card) => !offers.includes(card.id));
      const sameRarity = free.filter((card) => card.rarity === rarity);
      offers.push(pickRandom(rng, sameRarity.length > 0 ? sameRarity : free).id);
    }
    meta.library[heroId] = offers;
  }
  return meta.library[heroId];
}

export function getStudyPrice(cardId) {
  return CONFIG.city.prices.study[CARDS[cardId].rarity] ?? CONFIG.city.prices.study.common;
}

// Учит карту из выбора библиотеки: она ложится в колоду, а выбор обновится при следующем визите
export function studyCard(meta, gear, heroId, cardId) {
  if (!meta.library?.[heroId]?.includes(cardId) || !pay(meta, getStudyPrice(cardId))) return false;
  gear.deck.push({ uid: gear.nextCardUid, cardId, upgraded: false });
  gear.nextCardUid += 1;
  delete meta.library[heroId];
  if (!meta.seen.cards.includes(cardId)) meta.seen.cards.push(cardId);
  return true;
}

// Таверна: вместо погибшего героя можно нанять нового того же класса — со стартовым снаряжением
export function hireHero(meta, heroId) {
  if (!isHeroDead(meta, heroId) || !pay(meta, CONFIG.city.prices.hire)) return false;
  delete meta.heroes[heroId];
  return true;
}

// Гадалка: следующий спуск начнётся со случайной реликвией
export function buyFortune(meta) {
  if (meta.supplies.blessing || !pay(meta, CONFIG.city.prices.fortune)) return false;
  meta.supplies.blessing = true;
  return true;
}

// Лавка красок: окраски покупаются один раз и подходят любому герою
export function isCosmeticOwned(meta, cosmeticId) {
  return (meta.cosmetics?.owned ?? []).includes(cosmeticId);
}

export function buyCosmetic(meta, cosmeticId) {
  const cosmetic = COSMETICS[cosmeticId];
  if (!cosmetic || isCosmeticOwned(meta, cosmeticId) || !pay(meta, cosmetic.price)) return false;
  meta.cosmetics ??= { owned: [], worn: {} };
  meta.cosmetics.owned.push(cosmeticId);
  return true;
}

// Надевает окраску на героя; null — обычный вид
export function wearCosmetic(meta, heroId, cosmeticId) {
  if (cosmeticId !== null && !isCosmeticOwned(meta, cosmeticId)) return false;
  meta.cosmetics ??= { owned: [], worn: {} };
  meta.cosmetics.worn[heroId] = cosmeticId;
  return true;
}

// Как перекрасить рисунок героя: фильтр его окраски или пусто
export function getHeroFilter(meta, heroId) {
  return COSMETICS[meta.cosmetics?.worn?.[heroId]]?.filter ?? "";
}

// Боевая арена: бои без смерти. Победа приносит золото и эссенции в казну
export function getArenaFights() {
  return CONFIG.city.arena;
}

export function awardArenaWin(meta, fightId) {
  const fight = CONFIG.city.arena.find((item) => item.id === fightId);
  if (!fight) return null;
  meta.gold += fight.reward.gold;
  meta.essences += fight.reward.essences;
  return fight.reward;
}
