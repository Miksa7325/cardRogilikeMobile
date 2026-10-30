// Логика забега: карта, переходы между узлами, награды, отдых. Этот файл не трогает HTML.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { BOSS_ENCOUNTER, ELITE_ENCOUNTERS, ENCOUNTERS } from "../data/enemies.js";
import { HEROES } from "../data/heroes.js";
import { RELICS } from "../data/relics.js";
import { createCombat } from "./combat.js";
import { canUpgradeCard, upgradeCard } from "./deck.js";
import { generateMap } from "./map.js";
import { createRng, deriveSeed, nextInt, pickRandom, pickWeighted } from "./rng.js";

export function createRun({ heroId, seed }) {
  const hero = HEROES[heroId];
  return {
    seed,
    heroId,
    status: "active", // active | won | lost
    hp: hero.maxHp,
    maxHp: hero.maxHp,
    gold: 0,
    deck: hero.deck.map((cardId, index) => ({ uid: index, cardId, upgraded: false })),
    nextCardUid: hero.deck.length,
    relics: [...hero.relics],
    map: generateMap(createRng(deriveSeed(seed, "map"))),
    currentNodeId: null,
    visitedNodeIds: [],
    pendingReward: null,
  };
}

// У каждого узла свой генератор: награда зависит только от seed забега и самого узла
function nodeRng(run, purpose) {
  return createRng(deriveSeed(run.seed, `${purpose}:${run.currentNodeId}`));
}

export function getCurrentNode(run) {
  return run.map.nodes[run.currentNodeId];
}

// Этаж, на котором сейчас игрок; до первого узла это 0
export function getCurrentFloor(run) {
  return run.currentNodeId ? getCurrentNode(run).floor : 0;
}

// На какие узлы можно перейти: в начале это весь нижний ряд
export function getAvailableNodeIds(run) {
  return run.currentNodeId ? getCurrentNode(run).next : run.map.rows[0];
}

// Переходит на узел. Возвращает false, если туда нельзя
export function enterNode(run, nodeId) {
  if (!getAvailableNodeIds(run).includes(nodeId)) return false;
  run.currentNodeId = nodeId;
  run.visitedNodeIds.push(nodeId);
  return true;
}

// Создаёт бой для текущего узла с HP и колодой забега
export function createNodeCombat(run) {
  const rng = nodeRng(run, "encounter");
  const type = getCurrentNode(run).type;
  let enemyIds = BOSS_ENCOUNTER;
  if (type === "battle") enemyIds = pickRandom(rng, ENCOUNTERS);
  if (type === "elite") enemyIds = pickRandom(rng, ELITE_ENCOUNTERS);

  return createCombat({
    heroId: run.heroId,
    enemyIds,
    seed: deriveSeed(run.seed, `combat:${run.currentNodeId}`),
    hp: run.hp,
    maxHp: run.maxHp,
    deck: run.deck,
  });
}

// Переносит итог боя в забег: HP, срабатывание реликвий и награду
export function finishCombat(run, combat) {
  run.hp = combat.hero.hp;
  if (combat.status === "lost") {
    run.status = "lost";
    return;
  }

  applyCombatEndRelics(run);
  const type = getCurrentNode(run).type;
  if (type === "boss") {
    run.hp = run.maxHp; // после босса полное лечение
    run.pendingReward = createBossReward(run);
  } else if (type === "elite") {
    run.pendingReward = createEliteReward(run);
  } else {
    run.pendingReward = createBattleReward(run);
  }
}

// Реликвии с триггером конца боя. Полная система триггеров появится вместе с новыми реликвиями
function applyCombatEndRelics(run) {
  for (const relicId of run.relics) {
    const relic = RELICS[relicId];
    if (relic.trigger !== "onCombatEnd") continue;
    for (const effect of relic.effects) {
      if (effect.type === "heal") run.hp = Math.min(run.maxHp, run.hp + effect.amount);
    }
  }
}

function createBattleReward(run) {
  const rng = nodeRng(run, "reward");
  const gold = nextInt(rng, ...CONFIG.rewards.battleGold);
  run.gold += gold;
  return { gold, relicId: null, relicFallbackGold: 0, cardIds: rollCardChoices(rng) };
}

function createEliteReward(run) {
  const rng = nodeRng(run, "reward");
  const gold = nextInt(rng, ...CONFIG.rewards.eliteGold);
  run.gold += gold;
  return { gold, ...grantRelic(run, rng), cardIds: rollCardChoices(rng) };
}

// После босса — только редкие карты: их на выбор столько, сколько есть, но не больше cardChoices
function createBossReward(run) {
  const rng = nodeRng(run, "reward");
  return { gold: 0, ...grantRelic(run, rng), cardIds: rollCardChoices(rng, "rare") };
}

// Открывает сундук на текущем узле: внутри реликвия
export function openChest(run) {
  const rng = nodeRng(run, "chest");
  run.pendingReward = { gold: 0, ...grantRelic(run, rng), cardIds: [] };
}

// Даёт случайную новую реликвию. Если новых нет, вместо неё золото
function grantRelic(run, rng) {
  const pool = Object.values(RELICS).filter(
    (relic) => relic.rarity !== "starter" && !run.relics.includes(relic.id),
  );
  if (pool.length === 0) {
    run.gold += CONFIG.rewards.relicFallbackGold;
    return { relicId: null, relicFallbackGold: CONFIG.rewards.relicFallbackGold };
  }
  const relic = pickRandom(rng, pool);
  run.relics.push(relic.id);
  return { relicId: relic.id, relicFallbackGold: 0 };
}

// Выбирает разные карты для награды. Статусы и проклятия сюда не попадают
function rollCardChoices(rng, onlyRarity = null) {
  const pool = Object.values(CARDS).filter(
    (card) => card.rarity !== "starter" && card.type !== "status" && card.type !== "curse",
  );
  const choices = [];

  while (choices.length < CONFIG.rewards.cardChoices) {
    const free = pool.filter((card) => !choices.includes(card.id));
    const rarity = onlyRarity ?? pickWeighted(rng, CONFIG.rewards.rarityWeights);
    const sameRarity = free.filter((card) => card.rarity === rarity);
    if (onlyRarity && sameRarity.length === 0) break;
    choices.push(pickRandom(rng, sameRarity.length > 0 ? sameRarity : free).id);
  }
  return choices;
}

// Завершает награду: cardId — выбранная карта или null, если игрок пропустил
export function completeReward(run, cardId) {
  if (cardId) {
    run.deck.push({ uid: run.nextCardUid, cardId, upgraded: false });
    run.nextCardUid += 1;
  }
  run.pendingReward = null;
  if (getCurrentNode(run).type === "boss") run.status = "won";
}

// Сколько HP вылечит отдых прямо сейчас
export function getRestHealAmount(run) {
  const heal = Math.floor(run.maxHp * CONFIG.restHealShare);
  return Math.min(heal, run.maxHp - run.hp);
}

export function restHeal(run) {
  run.hp += getRestHealAmount(run);
}

// Карты колоды, которые можно улучшить на отдыхе
export function getUpgradableCards(run) {
  return run.deck.filter((card) => !card.upgraded && canUpgradeCard(card.cardId));
}

export function restUpgrade(run, uid) {
  upgradeCard(run.deck.find((card) => card.uid === uid));
}
