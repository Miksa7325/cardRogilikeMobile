// Мета-прогресс: казна города, постройки, задания, выбранный герой и коллекция. Этот файл не трогает хранилище и HTML:
// сохраняет данные save.js, а показывает их интерфейс.
import { CONFIG } from "../config.js";
import { ACTS } from "../data/acts.js";
import { BUILDINGS } from "../data/buildings.js";
import { POTIONS } from "../data/potions.js";
import { QUESTS } from "../data/quests.js";
import { POTION_PRICE, TRADER_GOODS } from "../data/trader.js";

export function createMeta() {
  return {
    gold: 0, // казна города: на золото строят дома и покупают у торговца
    essences: 0, // эссенции с монстров: в гильдии их меняют на золото
    selectedHero: "warrior", // кем герой спустится в подземелье: выбирают в доме героев
    supplies: createSupplies(), // что куплено у торговца для следующего забега
    buildings: ["home"], // построенные здания: дом есть с самого начала
    totals: {}, // счётчики всех забегов для заданий
    claimedQuests: [], // задания, за которые уже получена награда
    runsPlayed: 0,
    wins: 0,
    bestFloor: 0, // самый дальний этаж за все забеги, считая этажи всех актов
    bestAct: 1, // самый дальний акт, куда доходил герой: с начала любого из них можно начать забег
    heroStats: {}, // { warrior: { runs: 3, wins: 1 } }
    seen: { cards: [], enemies: [], relics: [], potions: [] }, // коллекция: всё, что игрок встретил
    tutorialDone: false, // пройдено ли обучение в первом бою
  };
}

// Припасы на следующий забег: зелья в сумку, карта подземелья и банка светлячков
export function createSupplies() {
  return { potions: [], hasMap: false, fireflies: false };
}

// Что пока закрыто: содержимое ещё не построенных зданий. Эти списки попадают в новый забег и не меняются до его конца
export function getLockedContent(meta) {
  const unbuilt = Object.values(BUILDINGS).filter((building) => !meta.buildings.includes(building.id));
  return {
    lockedCardIds: [],
    lockedRelicIds: unbuilt.flatMap((building) => building.unlocks.relics ?? []),
    lockedEventIds: unbuilt.flatMap((building) => building.unlocks.events ?? []),
    lockedPotionIds: unbuilt.flatMap((building) => building.unlocks.potions ?? []),
  };
}

// Покупка здания. Возвращает { ok: true } или { ok: false, reason: "..." }
export function buyBuilding(meta, buildingId) {
  const building = BUILDINGS[buildingId];
  if (meta.buildings.includes(buildingId)) return { ok: false, reason: "owned" };
  if (meta.gold < building.price) return { ok: false, reason: "notEnoughGold" };
  meta.gold -= building.price;
  meta.buildings.push(buildingId);
  return { ok: true };
}

export function selectHero(meta, heroId) {
  meta.selectedHero = heroId;
}

// Обмен в гильдии: все эссенции, которых хватает на целое золото, превращаются в золото.
// Остаток меньше курса остаётся. Возвращает, сколько золота получено
export function exchangeEssences(meta) {
  const { essencesPerGold } = CONFIG.city;
  const gold = Math.floor(meta.essences / essencesPerGold);
  meta.essences -= gold * essencesPerGold;
  meta.gold += gold;
  return gold;
}

// Запоминает, что герой дошёл до этого акта
function reachAct(meta, act) {
  meta.bestAct = Math.max(meta.bestAct, act);
}

// С каких актов можно начать забег: с первого и со всех, до которых уже доходил
export function getStartableActs(meta) {
  return ACTS.slice(0, meta.bestAct).map((act, index) => ({ number: index + 1, ...act }));
}

// Начало забега с акта: первый бесплатно, остальные за золото из казны. Возвращает false, если нельзя или не хватает
export function payForActStart(meta, actNumber) {
  const act = ACTS[actNumber - 1];
  if (!act || actNumber > meta.bestAct || meta.gold < act.startPrice) return false;
  meta.gold -= act.startPrice;
  return true;
}

// Сдаёт в казну добычу, которую герой несёт из подземелья. Возвращает, сколько сдано
export function bankLoot(meta, run) {
  reachAct(meta, run.act);
  const loot = { gold: run.gold, essences: run.essences };
  meta.gold += run.gold;
  meta.essences += run.essences;
  run.gold = 0;
  run.essences = 0;
  return loot;
}

// Что продаёт торговец: карту, банку светлячков и все открытые зелья
export function getTraderGoods(meta) {
  const { lockedPotionIds } = getLockedContent(meta);
  const potions = Object.values(POTIONS)
    .filter((potion) => !lockedPotionIds.includes(potion.id))
    .map((potion) => ({
      id: potion.id, kind: "potion", potionId: potion.id, icon: potion.icon, name: potion.name, description: potion.description, price: POTION_PRICE,
    }));
  return [...TRADER_GOODS, ...potions];
}

// Куда уйдёт покупка у торговца: в текущий забег, если он идёт, иначе в припасы на следующий
function getHolder(meta, run) {
  return run ?? meta.supplies;
}

// Есть ли уже этот товар: карту и банку второй раз не купить
export function isTraderGoodOwned(meta, run, good) {
  const holder = getHolder(meta, run);
  if (good.kind === "map") return holder.hasMap;
  if (good.kind === "fireflies") return Boolean(holder.fireflies);
  return false;
}

// Покупка у торговца. Возвращает { ok: true } или { ok: false, reason: "..." }
export function buyFromTrader(meta, run, good) {
  const holder = getHolder(meta, run);
  if (isTraderGoodOwned(meta, run, good)) return { ok: false, reason: "owned" };
  if (good.kind === "potion" && holder.potions.length >= CONFIG.maxPotions) return { ok: false, reason: "potionsFull" };
  if (meta.gold < good.price) return { ok: false, reason: "notEnoughGold" };

  meta.gold -= good.price;
  if (good.kind === "potion") {
    holder.potions.push(good.potionId);
    if (run && !run.seen.potions.includes(good.potionId)) run.seen.potions.push(good.potionId);
  }
  if (good.kind === "map") holder.hasMap = true;
  // В забеге банка сразу заряжена, в припасах это просто отметка, что она куплена
  if (good.kind === "fireflies") holder.fireflies = run ? { charged: true } : true;
  return { ok: true };
}

// Забирает припасы в новый забег: в казне их больше нет
export function takeSupplies(meta) {
  const supplies = meta.supplies;
  meta.supplies = createSupplies();
  return supplies;
}

export function getQuestProgress(meta, quest) {
  return Math.min(meta.totals[quest.stat] ?? 0, quest.goal);
}

export function isQuestClaimed(meta, quest) {
  return meta.claimedQuests.includes(quest.id);
}

export function isQuestReady(meta, quest) {
  return !isQuestClaimed(meta, quest) && getQuestProgress(meta, quest) >= quest.goal;
}

export function countReadyQuests(meta) {
  return QUESTS.filter((quest) => isQuestReady(meta, quest)).length;
}

// Забирает награду за выполненное задание. Возвращает false, если забирать нечего
export function claimQuest(meta, questId) {
  const quest = QUESTS.find((item) => item.id === questId);
  if (!quest || !isQuestReady(meta, quest)) return false;
  meta.claimedQuests.push(questId);
  meta.gold += quest.reward;
  return true;
}

// Этаж с учётом всех актов: босс не считается отдельным этажом
export function getTotalFloor(run, currentFloor) {
  const { floors } = CONFIG.map;
  return (run.act - 1) * floors + Math.min(currentFloor, floors);
}

// Переносит встреченное в забеге в коллекцию
export function mergeSeen(meta, run) {
  for (const kind of ["cards", "enemies", "relics", "potions"]) {
    meta.seen[kind] = [...new Set([...meta.seen[kind], ...run.seen[kind]])];
  }
}

// Записывает итог законченного забега. Добыча, которую герой нёс, уходит в казну. Возвращает, что игрок получил
export function applyRunToMeta(meta, run, currentFloor) {
  const readyBefore = QUESTS.filter((quest) => isQuestReady(meta, quest)).map((quest) => quest.id);
  const loot = bankLoot(meta, run);

  // Счётчики заданий: то, что набралось в забеге, плюс сам забег
  const add = (key, amount) => {
    meta.totals[key] = (meta.totals[key] ?? 0) + amount;
  };
  for (const [key, amount] of Object.entries(run.stats.totals ?? {})) add(key, amount);
  add("floors", getTotalFloor(run, currentFloor));
  add("runs", 1);
  add(`runs_${run.heroId}`, 1);
  if (run.status === "won") add("wins", 1);
  meta.runsPlayed += 1;
  if (run.status === "won") meta.wins += 1;
  meta.bestFloor = Math.max(meta.bestFloor, getTotalFloor(run, currentFloor));

  const stats = meta.heroStats[run.heroId] ?? { runs: 0, wins: 0 };
  stats.runs += 1;
  if (run.status === "won") stats.wins += 1;
  meta.heroStats[run.heroId] = stats;

  mergeSeen(meta, run);

  return {
    goldGained: loot.gold,
    essencesGained: loot.essences,
    questsReady: QUESTS.filter((quest) => isQuestReady(meta, quest) && !readyBefore.includes(quest.id)).map((quest) => quest.title),
  };
}
