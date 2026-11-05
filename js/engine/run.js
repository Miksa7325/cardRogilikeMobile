// Логика забега: карта, переходы между узлами, награды, отдых. Этот файл не трогает HTML.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { ACTS } from "../data/acts.js";
import { HEROES, getMaxPotions } from "../data/heroes.js";
import { POTIONS } from "../data/potions.js";
import { RELICS } from "../data/relics.js";
import { createCombat } from "./combat.js";
import { canUpgradeCard, upgradeCard } from "./deck.js";
import { generateMap } from "./map.js";
import { createRng, deriveSeed, nextFloat, nextInt, pickRandom, pickWeighted, shuffle } from "./rng.js";

// startAct — с какого акта начинается забег: пройденные акты можно пропустить за золото.
// locked...Ids — что ещё не открыто постройками: это не выпадет в забеге.
// tutorialFight: первый бой забега — лёгкий и один на один, для обучения.
// equipment — снаряжение героя с прошлых забегов (getEquipment); без него герой идёт со стартовым набором.
// potions, hasMap, fireflies, blessing — припасы, купленные в городе: blessing — реликвия от гадалки
export function createRun({
  heroId, seed, startAct = 1, lockedCardIds = [], lockedRelicIds = [], lockedEventIds = [], lockedPotionIds = [], tutorialFight = false,
  equipment = null, potions = [], hasMap = false, fireflies = false, blessing = false,
}) {
  const hero = HEROES[heroId];
  const maxHp = hero.maxHp;
  const run = {
    seed,
    heroId,
    startAct, // с какого акта начался забег
    lockedCardIds,
    lockedRelicIds,
    lockedEventIds,
    lockedPotionIds,
    status: "active", // active | won | lost
    act: startAct,
    hp: maxHp,
    maxHp,
    gold: 0, // золото из событий: в подземелье его не потратить, оно уходит в казну города
    essences: 0, // эссенции с монстров: в городе их меняют на золото
    hasMap: false, // куплена ли карта подземелья на этот акт: без неё карту не открыть, в новом акте нужна новая
    fireflies: null, // банка светлячков: { charged } — заряжена ли она до следующего отдыха или комнаты сохранения
    revealedNodeIds: [], // комнаты, которые осветили светлячки: видно, что там, хотя герой там не был
    deck: [],
    nextCardUid: 0,
    relics: [],
    potions: [],
    map: generateActMap(seed, startAct),
    stats: { combats: [], playMs: 0, totals: {} }, // статистика забега и счётчики для заданий
    seen: { cards: [], enemies: [], relics: [], potions: [] }, // что игрок встретил: это пойдёт в коллекцию
    tutorialFight,
    savedCombat: null, // бой на начало текущего хода: так игра продолжается посреди боя
    currentNodeId: null,
    visitedNodeIds: [], // пройденные комнаты акта: в них ничего не случается заново
    trail: [], // путь героя по акту от начальной комнаты: по нему он возвращается назад
    shopRemovals: [], // лавки, в которых герой уже избавился от карты: в каждой только раз
    pendingReward: null,
    activeEvent: null, // событие на текущем узле, его создаёт engine/events.js
    seenEventIds: [], // какие события уже были в этом забеге
  };
  if (equipment) {
    takeEquipment(run, equipment);
  } else {
    for (const cardId of hero.deck) addCardToDeck(run, cardId);
    for (const relicId of hero.relics) addRelic(run, relicId);
  }
  for (const potionId of potions) {
    if (!canCarryPotion(run)) break;
    run.potions.push(potionId);
    markSeen(run, "potions", potionId);
  }
  run.hasMap = hasMap;
  run.fireflies = fireflies || equipment?.fireflies ? { charged: true } : null;
  // Предсказание гадалки: случайная реликвия в начале спуска
  if (blessing) grantRandomRelic(run, createRng(deriveSeed(seed, "blessing")), ["common", "uncommon"]);
  return run;
}

// Снаряжение героя, которое остаётся у него между забегами: колода с улучшениями, реликвии, зелья,
// запас здоровья и банка светлячков. Здоровье не сохраняется: в город герой возвращается отдохнувшим
export function getEquipment(run) {
  return {
    deck: run.deck.map((card) => ({ ...card })),
    nextCardUid: run.nextCardUid,
    relics: [...run.relics],
    potions: [...run.potions],
    maxHp: run.maxHp,
    blessings: run.blessings ?? 0,
    fireflies: Boolean(run.fireflies),
  };
}

// Герой берёт снаряжение с прошлых забегов. Эффекты получения реликвий уже сработали, второй раз они не нужны.
// Карты, реликвии и зелья, которых больше нет в игре, отбрасываем: иначе испорченные данные сломали бы бой
function takeEquipment(run, equipment) {
  run.deck = equipment.deck.filter((card) => CARDS[card.cardId]).map((card) => ({ ...card }));
  run.nextCardUid = equipment.nextCardUid;
  run.relics = equipment.relics.filter((relicId) => RELICS[relicId]);
  run.potions = equipment.potions.filter((potionId) => POTIONS[potionId]).slice(0, getMaxPotions(run.heroId));
  run.maxHp = equipment.maxHp;
  run.hp = equipment.maxHp;
  run.blessings = equipment.blessings ?? 0;
  for (const card of run.deck) markSeen(run, "cards", card.cardId);
  for (const relicId of run.relics) markSeen(run, "relics", relicId);
  for (const potionId of run.potions) markSeen(run, "potions", potionId);
}

// Акт, в котором сейчас герой: его враги, особенность и награды
export function getAct(run) {
  return ACTS[run.act - 1];
}

function markSeen(run, kind, id) {
  if (!run.seen[kind].includes(id)) run.seen[kind].push(id);
}

// У каждого акта своя карта, а особенность акта может её менять: больше тупиков, нет отдыха
function generateActMap(seed, act) {
  return generateMap(createRng(deriveSeed(seed, `map:${act}`)), ACTS[act - 1].mechanic);
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

// Подняться в город можно из комнаты сохранения и из начальной комнаты акта: у входа, пока забег не начался,
// и после победы над боссом прошлого акта — это награда за босса
export function canReturnToCity(run) {
  if (!run.currentNodeId) return true;
  return getCurrentNode(run).type === "save";
}

// На какие узлы можно перейти: в начале это весь нижний ряд
export function getAvailableNodeIds(run) {
  return run.currentNodeId ? getCurrentNode(run).next : run.map.rows[0];
}

// Комнаты этажом ниже, из которых туннель ведёт в эту: туннели двусторонние, по ним можно спуститься.
// Для первого ряда нижняя комната — начальная (null), у самой начальной нижних нет
export function getLowerNodeIds(run, nodeId = run.currentNodeId) {
  if (nodeId === null) return [];
  if (run.map.rows[0].includes(nodeId)) return [null];
  return Object.values(run.map.nodes).filter((node) => node.next.includes(nodeId)).map((node) => node.id);
}

// Сколько HP стоит шаг в эту комнату: в акте с ледяной водой ранит каждый шаг в неизведанную
export function getStepCost(run, nodeId) {
  return isNodeCleared(run, nodeId) ? 0 : getAct(run).mechanic.coldWater ?? 0;
}

// Переходит в соседнюю комнату: вверх по туннелю или вниз по спуску, null — в начальную.
// Возвращает false, если туда нельзя
export function enterNode(run, nodeId) {
  if (![...getAvailableNodeIds(run), ...getLowerNodeIds(run)].includes(nodeId)) return false;
  // Шаг не убивает: ниже 1 HP не опускаемся
  run.hp = Math.max(1, run.hp - getStepCost(run, nodeId));
  run.currentNodeId = nodeId;
  if (nodeId === null) {
    run.trail = [];
    return true;
  }
  // Пришёл в комнату, через которую уже шёл: путь укорачивается до неё, и «Назад» ведёт как раньше
  const index = run.trail.indexOf(nodeId);
  if (index >= 0) run.trail.length = index + 1;
  else run.trail.push(nodeId);
  if (!run.visitedNodeIds.includes(nodeId)) run.visitedNodeIds.push(nodeId);
  return true;
}

// Пройдена ли комната: тогда в ней ничего не случается заново. Начальная пройдена всегда
export function isNodeCleared(run, nodeId) {
  return nodeId === null || run.visitedNodeIds.includes(nodeId);
}

// Откуда герой пришёл: комната, null — начальная. undefined — он в начальной, позади ничего
// Вернуться туда — обычный переход: enterNode укоротит путь до этой комнаты
export function getPreviousNodeId(run) {
  return run.trail.length > 0 ? run.trail.at(-2) ?? null : undefined;
}

// Путь от начальной комнаты до пройденной комнаты только по пройденным: по нему герой быстро переходит по карте.
// Туннели двусторонние, поэтому путь может идти и вверх, и вниз. Возвращает список комнат или null, если дороги нет
function findKnownPath(run, nodeId) {
  const known = new Set(run.visitedNodeIds);
  const parents = new Map();
  const queue = run.map.rows[0].filter((id) => known.has(id));
  for (const id of queue) parents.set(id, null);
  for (let head = 0; head < queue.length && !parents.has(nodeId); head++) {
    const neighbours = [...run.map.nodes[queue[head]].next, ...getLowerNodeIds(run, queue[head])];
    for (const nextId of neighbours) {
      if (!known.has(nextId) || parents.has(nextId)) continue;
      parents.set(nextId, queue[head]);
      queue.push(nextId);
    }
  }
  if (!parents.has(nodeId)) return null;
  const path = [];
  for (let id = nodeId; id !== null; id = parents.get(id)) path.unshift(id);
  return path;
}

// Телепорт в пройденную комнату или в начальную (nodeId — null). Стоит золота, которое несёт герой.
// Возвращает { ok: true } или { ok: false, reason: "..." }
export function travelTo(run, nodeId) {
  const path = nodeId === null ? [] : isNodeCleared(run, nodeId) && findKnownPath(run, nodeId);
  if (!path) return { ok: false, reason: "noPath" };
  run.trail = path;
  run.currentNodeId = nodeId;
  // Переход бесплатный, но в пути может случиться событие. Счётчик переходов — чтобы шанс не зависел от комнаты
  run.teleports = (run.teleports ?? 0) + 1;
  const event = nextFloat(nodeRng(run, `teleport:${run.teleports}`)) < CONFIG.teleportEventChance;
  return { ok: true, event };
}

// Сколько золота из казны стоит вернуться в подземелье. Из начальной комнаты акта — бесплатно,
// из комнаты сохранения — плата растёт с актом
export function getReturnPrice(run) {
  if (!run.currentNodeId || getCurrentNode(run).type !== "save") return 0;
  return CONFIG.returnPrice.base + CONFIG.returnPrice.perAct * run.act;
}

// Светлячки из банки освещают одну неизведанную соседнюю комнату: видно, что там, хотя герой туда не ходил.
// После этого банка пуста до следующего отдыха или комнаты сохранения. Возвращает false, если светить нечего или нечем
export function releaseFireflies(run, nodeId) {
  if (!run.fireflies?.charged || nodeId === null || isNodeCleared(run, nodeId)) return false;
  if (![...getAvailableNodeIds(run), ...getLowerNodeIds(run)].includes(nodeId)) return false;
  run.fireflies.charged = false;
  if (!run.revealedNodeIds.includes(nodeId)) run.revealedNodeIds.push(nodeId);
  return true;
}

// На отдыхе и в комнате сохранения светлячки снова собираются в банку
export function rechargeFireflies(run) {
  if (run.fireflies) run.fireflies.charged = true;
}

// Освещена ли светлячками неизведанная комната
export function isNodeRevealed(run, nodeId) {
  return nodeId !== null && run.revealedNodeIds.includes(nodeId);
}

// Самый глубокий этаж акта, куда дошёл герой: по нему считаются опыт и кроны, даже если он вернулся назад
export function getDeepestFloor(run) {
  return Math.max(0, ...run.visitedNodeIds.map((id) => run.map.nodes[id].floor));
}

// Создаёт бой для текущего узла с HP, колодой, реликвиями и зельями забега. Враги и особенность — из акта
export function createNodeCombat(run) {
  const rng = nodeRng(run, "encounter");
  const type = getCurrentNode(run).type;
  const act = getAct(run);
  let enemyIds = act.boss;
  if (type === "battle") enemyIds = pickRandom(rng, act.encounters);
  if (type === "elite") enemyIds = pickRandom(rng, act.elites);
  if (run.tutorialFight && type === "battle") {
    enemyIds = act.encounters[0];
    run.tutorialFight = false;
  } else if (type === "battle" && act.mechanic.extraEnemy && enemyIds.length < CONFIG.maxEnemiesInCombat) {
    // Орды: в обычном бою на одного врага больше
    enemyIds = [...enemyIds, pickRandom(rng, act.encounters.flat())];
  }
  for (const enemyId of enemyIds) markSeen(run, "enemies", enemyId);

  // Чем глубже этаж акта, тем враги крепче и сильнее: обойти все комнаты не должно быть бесплатно.
  // У босса своя настройка в акте, этаж на него не влияет
  const depth = type === "boss" ? 0 : getCurrentNode(run).floor;
  const depthHp = 1 + CONFIG.depth.hpPerFloor * depth;
  const depthStrength = Math.floor(depth / CONFIG.depth.floorsPerStrength);

  // Зараза: в колоду каждого боя замешаны Раны. После боя они исчезают вместе с колодой боя
  const wounds = Array.from({ length: act.mechanic.wounds ?? 0 }, () => ({ cardId: "wound", upgraded: false }));
  return createCombat({
    heroId: run.heroId,
    enemyIds,
    seed: deriveSeed(run.seed, `combat:${run.act}:${run.currentNodeId}`),
    hp: run.hp,
    maxHp: run.maxHp,
    deck: [...run.deck, ...wounds],
    relics: run.relics,
    potions: run.potions,
    // У босса своё здоровье: он и так копит Силу весь бой, и общий множитель акта сделал бы его непробиваемым
    enemyHpMultiplier: CONFIG.enemyHpMultiplier * depthHp * (type === "boss" ? act.bossHpMultiplier ?? act.enemyHpMultiplier : act.enemyHpMultiplier),
    // Сила врагов: своя у каждого акта, прибавка от особенности и от глубины
    enemyStrength: act.enemyStrength + (act.mechanic.enemyStrength ?? 0) + depthStrength,
    enemyBlock: act.mechanic.enemyBlock ?? 0,
    enemyRamp: act.mechanic.enemyRamp ?? 0,
    heroStatuses: act.mechanic.heroPoison ? { poison: act.mechanic.heroPoison } : {},
    extraPassives: act.mechanic.heroPassives ?? [],
    potionPool: getPotionPool(run),
  });
}

// Переносит итог боя в забег: HP, зелья, реликвии конца боя и награду
export function finishCombat(run, combat) {
  run.savedCombat = null;
  recordCombat(run, combat);
  run.hp = combat.hero.hp;
  run.potions = combat.potions;
  // Алхимик мог сварить зелья в бою: они попадают в коллекцию
  for (const potionId of run.potions) markSeen(run, "potions", potionId);
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

// То же для зелий: и показанное в магазине, и полученное
export function markPotionSeen(run, potionId) {
  markSeen(run, "potions", potionId);
}

// Эссенции за бой: в каждом следующем акте их больше
function rollEssences(run, rng, range) {
  return Math.round(nextInt(rng, ...range) * getAct(run).rewards.essences);
}

// Даёт случайную новую реликвию. Если новых нет, вместо неё золото. Без rarities — какие положены в этом акте
function grantRandomRelic(run, rng, rarities = getAct(run).rewards.relics) {
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
  return run.potions.length < getMaxPotions(run.heroId);
}

// Даёт случайное зелье и возвращает его id; если места нет, возвращает null
function grantRandomPotion(run, rng) {
  if (!canCarryPotion(run)) return null;
  const potionId = pickRandom(rng, getPotionPool(run));
  run.potions.push(potionId);
  markPotionSeen(run, potionId);
  return potionId;
}

// Зелье в награду за бой выпадает с шансом; если места нет, игрок об этом узнает
function rollPotionReward(run, rng) {
  if (nextFloat(rng) >= getAct(run).rewards.potionChance) return { potionId: null, potionsFull: false };
  const potionId = grantRandomPotion(run, rng);
  return { potionId, potionsFull: potionId === null };
}

// С монстров падают эссенции, а не золото
function createBattleReward(run) {
  const rng = nodeRng(run, "reward");
  const essences = rollEssences(run, rng, CONFIG.rewards.battleEssences);
  run.essences += essences;
  return { essences, relicId: null, relicFallbackGold: 0, ...rollPotionReward(run, rng), cardIds: rollCardChoices(run, rng) };
}

function createEliteReward(run) {
  const rng = nodeRng(run, "reward");
  const essences = rollEssences(run, rng, CONFIG.rewards.eliteEssences);
  run.essences += essences;
  return { essences, ...grantRandomRelic(run, rng), ...rollPotionReward(run, rng), cardIds: rollCardChoices(run, rng) };
}

// После босса: эссенции, реликвия босса и только редкие карты, их столько, сколько есть, но не больше cardChoices
function createBossReward(run) {
  const rng = nodeRng(run, "reward");
  const essences = rollEssences(run, rng, CONFIG.rewards.bossEssences);
  run.essences += essences;
  return {
    essences,
    ...grantRandomRelic(run, rng, ["boss"]),
    potionId: null,
    potionsFull: false,
    cardIds: rollCardChoices(run, rng, "rare"),
  };
}

// Открывает сундук на текущем узле: внутри реликвия
export function openChest(run) {
  const rng = nodeRng(run, "chest");
  run.pendingReward = { essences: 0, ...grantRandomRelic(run, rng), potionId: null, potionsFull: false, cardIds: [] };
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
    const rarity = onlyRarity ?? pickWeighted(rng, getAct(run).rewards.rarityWeights);
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
  run.trail = [];
  run.revealedNodeIds = [];
  // Карта подземелья — на один акт: комнаты нового акта на ней не нарисованы
  run.hasMap = false;
}

// Сколько HP вылечит отдых прямо сейчас
export function getRestHealAmount(run) {
  const heal = Math.floor(run.maxHp * CONFIG.restHealShare);
  return Math.min(heal, run.maxHp - run.hp);
}

export function restHeal(run) {
  run.hp += getRestHealAmount(run);
}

// В городе герой отдыхает и полностью залечивает раны. Без конца этим не воспользоваться:
// вернуться в подземелье из комнаты сохранения стоит золота (getReturnPrice). Возвращает, сколько HP вылечено
export function healInCity(run) {
  const healed = run.maxHp - run.hp;
  run.hp = run.maxHp;
  return healed;
}

// Карты колоды, которые можно улучшить на отдыхе
export function getUpgradableCards(run) {
  return run.deck.filter((card) => !card.upgraded && canUpgradeCard(card.cardId));
}

export function restUpgrade(run, uid) {
  upgradeCard(run.deck.find((card) => card.uid === uid));
}
