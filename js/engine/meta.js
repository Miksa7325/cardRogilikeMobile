// Мета-прогресс: опыт, открытия и коллекция. Этот файл не трогает хранилище и HTML:
// сохраняет данные save.js, а показывает их интерфейс.
import { CONFIG } from "../config.js";
import { BUILDINGS } from "../data/buildings.js";
import { QUESTS } from "../data/quests.js";
import { UNLOCKS } from "../data/unlocks.js";

export function createMeta() {
  return {
    xp: 0,
    crowns: 0, // валюта города
    buildings: ["home"], // построенные здания: дом есть с самого начала
    totals: {}, // счётчики всех забегов для заданий
    claimedQuests: [], // задания, за которые уже получена награда
    runsPlayed: 0,
    wins: 0,
    bestFloor: 0, // самый дальний этаж за все забеги, считая этажи всех актов
    heroStats: {}, // { warrior: { runs: 3, wins: 1 } }
    seen: { cards: [], enemies: [], relics: [] }, // коллекция: всё, что игрок встретил
    tutorialDone: false, // пройдено ли обучение в первом бою
    // Настройки лежат здесь же: они живут между забегами и остаются после сброса прогресса
    settings: { music: 0.5, effects: 0.8, fastAnimations: false, vibration: true },
  };
}

// Открытия, до которых игрок ещё не дошёл
function getLockedUnlocks(meta) {
  return UNLOCKS.filter((unlock) => unlock.xp > meta.xp);
}

// Что пока закрыто: эти списки попадают в новый забег и не меняются до его конца
export function getLockedContent(meta) {
  const locked = getLockedUnlocks(meta);
  const unbuilt = Object.values(BUILDINGS).filter((building) => !meta.buildings.includes(building.id));
  return {
    lockedCardIds: locked.flatMap((unlock) => unlock.cards ?? []),
    lockedRelicIds: [
      ...locked.flatMap((unlock) => unlock.relics ?? []),
      ...unbuilt.flatMap((building) => building.unlocks.relics ?? []),
    ],
    lockedEventIds: unbuilt.flatMap((building) => building.unlocks.events ?? []),
    lockedPotionIds: unbuilt.flatMap((building) => building.unlocks.potions ?? []),
  };
}

// Покупка здания. Возвращает { ok: true } или { ok: false, reason: "..." }
export function buyBuilding(meta, buildingId) {
  const building = BUILDINGS[buildingId];
  if (meta.buildings.includes(buildingId)) return { ok: false, reason: "owned" };
  if (meta.crowns < building.price) return { ok: false, reason: "notEnoughCrowns" };
  meta.crowns -= building.price;
  meta.buildings.push(buildingId);
  return { ok: true };
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
  meta.crowns += quest.reward;
  return true;
}

// Кроны зависят от пройденных этажей, убитых элит и боссов и оставшегося золота
export function calculateRunCrowns(run, currentFloor) {
  const totals = run.stats.totals ?? {};
  const { perFloor, perElite, perBoss, goldPerCrown } = CONFIG.crowns;
  return getTotalFloor(run, currentFloor) * perFloor
    + (totals.elites ?? 0) * perElite
    + (totals.bosses ?? 0) * perBoss
    + Math.floor(run.gold / goldPerCrown);
}

// Сколько опыта нужно для героя. Если герой не указан в открытиях, он доступен сразу
export function getHeroUnlockXp(heroId) {
  return UNLOCKS.find((unlock) => unlock.hero === heroId)?.xp ?? 0;
}

export function isHeroUnlocked(meta, heroId) {
  return meta.xp >= getHeroUnlockXp(heroId);
}

// Следующее открытие, чтобы показать игроку цель; null, если открыто всё
export function getNextUnlock(meta) {
  return getLockedUnlocks(meta)[0] ?? null;
}

// Уровни сложности открываются после первой победы
export function isDifficultyUnlocked(meta) {
  return meta.wins > 0;
}

// Этаж с учётом всех актов: босс не считается отдельным этажом
export function getTotalFloor(run, currentFloor) {
  const { floors } = CONFIG.map;
  return (run.act - 1) * floors + Math.min(currentFloor, floors);
}

// Опыт зависит от пройденных этажей, убитых элит и боссов
export function calculateRunXp(run, currentFloor) {
  const won = run.stats.combats.filter((combat) => combat.won);
  const elites = won.filter((combat) => combat.type === "elite").length;
  const bosses = won.filter((combat) => combat.type === "boss").length;
  const { perFloor, perElite, perBoss } = CONFIG.xp;
  return getTotalFloor(run, currentFloor) * perFloor + elites * perElite + bosses * perBoss;
}

// Переносит встреченное в забеге в коллекцию
export function mergeSeen(meta, run) {
  for (const kind of ["cards", "enemies", "relics"]) {
    meta.seen[kind] = [...new Set([...meta.seen[kind], ...run.seen[kind]])];
  }
}

// Записывает итог законченного забега. Возвращает, что игрок получил
export function applyRunToMeta(meta, run, currentFloor) {
  const wasDifficultyUnlocked = isDifficultyUnlocked(meta);
  const xpBefore = meta.xp;
  const xpGained = calculateRunXp(run, currentFloor);
  const crownsGained = calculateRunCrowns(run, currentFloor);
  const readyBefore = QUESTS.filter((quest) => isQuestReady(meta, quest)).map((quest) => quest.id);

  meta.xp += xpGained;
  meta.crowns += crownsGained;

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
    xpGained,
    xpTotal: meta.xp,
    crownsGained,
    questsReady: QUESTS.filter((quest) => isQuestReady(meta, quest) && !readyBefore.includes(quest.id)).map((quest) => quest.title),
    newUnlocks: UNLOCKS.filter((unlock) => unlock.xp > xpBefore && unlock.xp <= meta.xp),
    difficultyJustUnlocked: !wasDifficultyUnlocked && isDifficultyUnlocked(meta),
  };
}
