// Логика забега: карта, переходы между узлами, награды, отдых. Этот файл не трогает HTML.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { ACTS } from "../data/enemies.js";
import { HEROES } from "../data/heroes.js";
import { POTIONS } from "../data/potions.js";
import { RELICS } from "../data/relics.js";
import { createCombat } from "./combat.js";
import { canUpgradeCard, upgradeCard } from "./deck.js";
import { generateMap } from "./map.js";
import { createRng, deriveSeed, nextFloat, nextInt, pickRandom, pickWeighted, shuffle } from "./rng.js";

// difficulty — уровень сложности (0 — без усложнений).
// locked...Ids — что ещё не открыто за опыт и постройки: это не выпадет в забеге
// tutorialFight: первый бой забега — лёгкий и один на один, для обучения
export function createRun({
  heroId, seed, difficulty = 0, lockedCardIds = [], lockedRelicIds = [], lockedEventIds = [], lockedPotionIds = [], tutorialFight = false,
}) {
  const hero = HEROES[heroId];
  const maxHp = hero.maxHp - (difficulty >= 7 ? CONFIG.difficulty.maxHpLoss : 0);
  const run = {
    seed,
    heroId,
    difficulty,
    lockedCardIds,
    lockedRelicIds,
    lockedEventIds,
    lockedPotionIds,
    status: "active", // active | won | lost
    act: 1,
    hp: maxHp,
    maxHp,
    gold: 0,
    deck: [],
    nextCardUid: 0,
    relics: [],
    potions: [],
    map: generateActMap(seed, 1),
    stats: { combats: [], playMs: 0, totals: {} }, // статистика забега и счётчики для заданий
    seen: { cards: [], enemies: [], relics: [] }, // что игрок встретил: это пойдёт в коллекцию
    tutorialFight,
    savedCombat: null, // бой на начало текущего хода: так игра продолжается посреди боя
    currentNodeId: null,
    visitedNodeIds: [],
    pendingReward: null,
    shop: null, // магазин на текущем узле, его создаёт engine/shop.js
    activeEvent: null, // событие на текущем узле, его создаёт engine/events.js
    seenEventIds: [], // какие события уже были в этом забеге
  };
  for (const cardId of hero.deck) addCardToDeck(run, cardId);
  if (hasDifficulty(run, 8)) addCardToDeck(run, "wound");
  for (const relicId of hero.relics) addRelic(run, relicId);
  return run;
}

// Действует ли усложнение этого уровня: каждый уровень включает все предыдущие
export function hasDifficulty(run, level) {
  return run.difficulty >= level;
}

function markSeen(run, kind, id) {
  if (!run.seen[kind].includes(id)) run.seen[kind].push(id);
}

// У каждого акта своя карта
function generateActMap(seed, act) {
  return generateMap(createRng(deriveSeed(seed, `map:${act}`)));
}

// У каждого узла свой генератор: результат зависит только от seed забега, акта и самого узла
export function nodeRng(run, purpose) {
  return createRng(deriveSeed(run.seed, `${purpose}:${run.act}:${run.currentNodeId}`));
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

// Создаёт бой для текущего узла с HP, колодой, реликвиями и зельями забега
export function createNodeCombat(run) {
  const rng = nodeRng(run, "encounter");
  const type = getCurrentNode(run).type;
  const act = ACTS[run.act - 1];
  let enemyIds = act.boss;
  if (type === "battle") enemyIds = pickRandom(rng, act.encounters);
  if (type === "elite") enemyIds = pickRandom(rng, act.elites);
  if (run.tutorialFight && type === "battle") {
    enemyIds = act.encounters[0];
    run.tutorialFight = false;
  }
  for (const enemyId of enemyIds) markSeen(run, "enemies", enemyId);

  return createCombat({
    heroId: run.heroId,
    enemyIds,
    seed: deriveSeed(run.seed, `combat:${run.act}:${run.currentNodeId}`),
    hp: run.hp,
    maxHp: run.maxHp,
    deck: run.deck,
    relics: run.relics,
    potions: run.potions,
    ...getEnemyModifiers(run, type),
  });
}

// Усложнения врагов для этого типа узла
function getEnemyModifiers(run, nodeType) {
  const { normalHpMultiplier, eliteHpMultiplier, bossHpMultiplier, eliteStrength, enemyStrength } = CONFIG.difficulty;
  let enemyHpMultiplier = 1;
  if (nodeType === "battle" && hasDifficulty(run, 1)) enemyHpMultiplier = normalHpMultiplier;
  if (nodeType === "elite" && hasDifficulty(run, 2)) enemyHpMultiplier = eliteHpMultiplier;
  if (nodeType === "boss" && hasDifficulty(run, 3)) enemyHpMultiplier = bossHpMultiplier;

  let strength = hasDifficulty(run, 10) ? enemyStrength : 0;
  if (nodeType === "elite" && hasDifficulty(run, 4)) strength += eliteStrength;
  return { enemyHpMultiplier, enemyStrength: strength };
}

// Переносит итог боя в забег: HP, зелья, реликвии конца боя и награду
export function finishCombat(run, combat) {
  run.savedCombat = null;
  recordCombat(run, combat);
  run.hp = combat.hero.hp;
  run.potions = combat.potions;
  if (combat.status === "lost") {
    run.status = "lost";
    return;
  }

  applyRelicTrigger(run, "onCombatEnd");
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

// Записывает бой в статистику: сколько длился и сколько HP стоил. Счётчики идут в задания
function recordCombat(run, combat) {
  const node = getCurrentNode(run);
  const totals = (run.stats.totals ??= {});
  const add = (key, amount) => {
    totals[key] = (totals[key] ?? 0) + amount;
  };
  for (const [key, amount] of Object.entries(combat.tally ?? {})) add(key, amount);
  add("kills", combat.enemies.filter((enemy) => enemy.hp <= 0).length);
  if (combat.status === "won" && node.type === "elite") add("elites", 1);
  if (combat.status === "won" && node.type === "boss") add("bosses", 1);
  run.stats.combats.push({
    act: run.act,
    floor: node.floor,
    type: node.type,
    enemyIds: combat.enemies.map((enemy) => enemy.enemyId),
    turns: combat.turn,
    hpBefore: run.hp,
    hpAfter: combat.hero.hp,
    won: combat.status === "won",
  });
}

// Реликвии, которые срабатывают вне боя
function applyRelicTrigger(run, trigger) {
  for (const relicId of run.relics) {
    const relic = RELICS[relicId];
    if (relic.trigger === trigger) applyRunEffects(run, relic.effects, nodeRng(run, `relic:${relicId}`));
  }
}

// Эффекты вне боя: от событий и реликвий. Возвращает список того, что игрок получил,
// чтобы интерфейс мог это показать: [{ kind: "card", id: "strike" }, ...]
export function applyRunEffects(run, effects, rng) {
  const gains = [];
  for (const effect of effects) {
    const gain = RUN_EFFECT_HANDLERS[effect.type](run, effect, rng);
    if (gain) gains.push(...gain);
  }
  return gains;
}

const RUN_EFFECT_HANDLERS = {
  heal(run, effect) {
    run.hp = Math.min(run.maxHp, run.hp + effect.amount);
  },
  // Вне боя потеря HP не убивает: смерть — только в бою
  loseHp(run, effect) {
    run.hp = Math.max(1, run.hp - effect.amount);
  },
  gainGold(run, effect) {
    run.gold += effect.amount;
  },
  loseGold(run, effect) {
    run.gold = Math.max(0, run.gold - effect.amount);
  },
  gainMaxHp(run, effect) {
    run.maxHp += effect.amount;
    run.hp += effect.amount;
  },
  loseMaxHp(run, effect) {
    run.maxHp -= effect.amount;
    run.hp = Math.max(1, Math.min(run.hp, run.maxHp));
  },
  // Конкретная карта (cardId) или случайная заданной редкости (rarity)
  addCard(run, effect, rng) {
    const cardId = effect.cardId ?? pickRandom(rng, getCardPool(run).filter((card) => card.rarity === effect.rarity)).id;
    addCardToDeck(run, cardId);
    return [{ kind: "card", id: cardId }];
  },
  removeRandomCard(run, effect, rng) {
    const candidates = run.deck.filter((card) => CARDS[card.cardId].rarity === effect.rarity);
    if (candidates.length === 0) return [];
    const card = pickRandom(rng, candidates);
    removeCardFromDeck(run, card.uid);
    return [{ kind: "cardRemoved", id: card.cardId }];
  },
  upgradeRandomCards(run, effect, rng) {
    const candidates = getUpgradableCards(run);
    shuffle(rng, candidates);
    return candidates.slice(0, effect.count).map((card) => {
      upgradeCard(card);
      return { kind: "cardUpgraded", id: card.cardId };
    });
  },
  gainRelic(run, effect, rng) {
    const relic = grantRandomRelic(run, rng);
    return [relic.relicId ? { kind: "relic", id: relic.relicId } : { kind: "gold", amount: relic.relicFallbackGold }];
  },
  gainPotion(run, effect, rng) {
    const potionId = grantRandomPotion(run, rng);
    return [potionId ? { kind: "potion", id: potionId } : { kind: "potionsFull" }];
  },
};

export function addCardToDeck(run, cardId) {
  run.deck.push({ uid: run.nextCardUid, cardId, upgraded: false });
  run.nextCardUid += 1;
  markSeen(run, "cards", cardId);
}

export function removeCardFromDeck(run, uid) {
  run.deck = run.deck.filter((card) => card.uid !== uid);
}

// Добавляет реликвию и сразу применяет её эффект получения, если он есть
export function addRelic(run, relicId) {
  run.relics.push(relicId);
  markSeen(run, "relics", relicId);
  const relic = RELICS[relicId];
  if (relic.trigger === "onPickup") applyRunEffects(run, relic.effects, nodeRng(run, `relic:${relicId}`));
}

// Новые реликвии заданных редкостей, которых у игрока ещё нет
export function getRelicPool(run, rarities) {
  return Object.values(RELICS).filter((relic) => (
    rarities.includes(relic.rarity) && !run.relics.includes(relic.id) && !run.lockedRelicIds.includes(relic.id)
  ));
}

// Показанная в магазине реликвия тоже считается встреченной
export function markRelicSeen(run, relicId) {
  markSeen(run, "relics", relicId);
}

// Золото с учётом уровня сложности
function rollGold(run, rng, range) {
  const gold = nextInt(rng, ...range);
  return hasDifficulty(run, 6) ? Math.floor(gold * CONFIG.difficulty.goldMultiplier) : gold;
}

// Даёт случайную новую реликвию. Если новых нет, вместо неё золото
function grantRandomRelic(run, rng, rarities = ["common", "uncommon"]) {
  const pool = getRelicPool(run, rarities);
  if (pool.length === 0) {
    run.gold += CONFIG.rewards.relicFallbackGold;
    return { relicId: null, relicFallbackGold: CONFIG.rewards.relicFallbackGold };
  }
  const relic = pickRandom(rng, pool);
  addRelic(run, relic.id);
  return { relicId: relic.id, relicFallbackGold: 0 };
}

// Зелья, которые могут выпасть: без тех, что ещё не открыты постройками
export function getPotionPool(run) {
  return Object.keys(POTIONS).filter((potionId) => !run.lockedPotionIds.includes(potionId));
}

export function canCarryPotion(run) {
  return run.potions.length < CONFIG.maxPotions;
}

// Даёт случайное зелье и возвращает его id; если места нет, возвращает null
function grantRandomPotion(run, rng) {
  if (!canCarryPotion(run)) return null;
  const potionId = pickRandom(rng, getPotionPool(run));
  run.potions.push(potionId);
  return potionId;
}

// Зелье в награду за бой выпадает с шансом; если места нет, игрок об этом узнает
function rollPotionReward(run, rng) {
  if (nextFloat(rng) >= CONFIG.rewards.potionChance) return { potionId: null, potionsFull: false };
  const potionId = grantRandomPotion(run, rng);
  return { potionId, potionsFull: potionId === null };
}

function createBattleReward(run) {
  const rng = nodeRng(run, "reward");
  const gold = rollGold(run, rng, CONFIG.rewards.battleGold);
  run.gold += gold;
  return { gold, relicId: null, relicFallbackGold: 0, ...rollPotionReward(run, rng), cardIds: rollCardChoices(run, rng) };
}

function createEliteReward(run) {
  const rng = nodeRng(run, "reward");
  const gold = rollGold(run, rng, CONFIG.rewards.eliteGold);
  run.gold += gold;
  return { gold, ...grantRandomRelic(run, rng), ...rollPotionReward(run, rng), cardIds: rollCardChoices(run, rng) };
}

// После босса: реликвия босса и только редкие карты, их столько, сколько есть, но не больше cardChoices
function createBossReward(run) {
  const rng = nodeRng(run, "reward");
  return {
    gold: 0,
    ...grantRandomRelic(run, rng, ["boss"]),
    potionId: null,
    potionsFull: false,
    cardIds: rollCardChoices(run, rng, "rare"),
  };
}

// Открывает сундук на текущем узле: внутри реликвия
export function openChest(run) {
  const rng = nodeRng(run, "chest");
  run.pendingReward = { gold: 0, ...grantRandomRelic(run, rng), potionId: null, potionsFull: false, cardIds: [] };
}

// Карты, которые можно получить в награду и купить: только карты своего героя и только открытые.
// Статусы, проклятия и стартовые сюда не попадают
function getCardPool(run) {
  return Object.values(CARDS).filter((card) => (
    card.hero === run.heroId && card.rarity !== "starter" && !run.lockedCardIds.includes(card.id)
  ));
}

// Выбирает разные карты с учётом редкости. onlyRarity оставляет только одну редкость
export function rollCardChoices(run, rng, onlyRarity = null, count = CONFIG.rewards.cardChoices) {
  const pool = getCardPool(run);
  const choices = [];

  while (choices.length < count) {
    const free = pool.filter((card) => !choices.includes(card.id));
    if (free.length === 0) break;
    const rarity = onlyRarity ?? pickWeighted(rng, CONFIG.rewards.rarityWeights);
    const sameRarity = free.filter((card) => card.rarity === rarity);
    if (onlyRarity && sameRarity.length === 0) break;
    choices.push(pickRandom(rng, sameRarity.length > 0 ? sameRarity : free).id);
  }
  for (const cardId of choices) markSeen(run, "cards", cardId);
  return choices;
}

// Завершает награду: cardId — выбранная карта или null, если игрок пропустил
export function completeReward(run, cardId) {
  if (cardId) addCardToDeck(run, cardId);
  run.pendingReward = null;
  if (getCurrentNode(run).type === "boss") finishAct(run);
}

// После босса начинается следующий акт с новой картой, а после последнего босса — победа
function finishAct(run) {
  if (run.act >= ACTS.length) {
    run.status = "won";
    return;
  }
  run.act += 1;
  run.map = generateActMap(run.seed, run.act);
  run.currentNodeId = null;
  run.visitedNodeIds = [];
}

// Сколько HP вылечит отдых прямо сейчас
export function getRestHealAmount(run) {
  const share = hasDifficulty(run, 5) ? CONFIG.difficulty.restHealShare : CONFIG.restHealShare;
  const heal = Math.floor(run.maxHp * share);
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
