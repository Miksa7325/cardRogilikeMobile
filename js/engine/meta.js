// Мета-прогресс: опыт, открытия и коллекция. Этот файл не трогает хранилище и HTML:
// сохраняет данные save.js, а показывает их интерфейс.
import { CONFIG } from "../config.js";
import { UNLOCKS } from "../data/unlocks.js";

export function createMeta() {
  return {
    xp: 0,
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
  return {
    lockedCardIds: locked.flatMap((unlock) => unlock.cards ?? []),
    lockedRelicIds: locked.flatMap((unlock) => unlock.relics ?? []),
  };
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

  meta.xp += xpGained;
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
    newUnlocks: UNLOCKS.filter((unlock) => unlock.xp > xpBefore && unlock.xp <= meta.xp),
    difficultyJustUnlocked: !wasDifficultyUnlocked && isDifficultyUnlocked(meta),
  };
}
