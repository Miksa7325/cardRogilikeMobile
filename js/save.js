// Сохранение и загрузка. Два ключа в localStorage: текущий забег и мета-прогресс.
// Смерть стирает только забег. Браузер может запретить хранилище, поэтому всё обёрнуто в try.
import { BUILDINGS } from "./data/buildings.js";
import { CARDS } from "./data/cards.js";
import { ENEMIES } from "./data/enemies.js";
import { POTIONS } from "./data/potions.js";
import { RELICS } from "./data/relics.js";
import { createMeta } from "./engine/meta.js";

const RUN_KEY = "cardRpg.run";
const META_KEY = "cardRpg.meta";

// Меняешь формат сохранения: увеличь версию и добавь сюда функцию перевода со старой версии.
// Например, MIGRATIONS[1] получает сохранение версии 1 и возвращает версию 2.
export const SAVE_VERSION = 5;
const MIGRATIONS = {
  // Версия 2: появились акты и статистика забега. Старый забег продолжается в акте 1
  1: (save) => (save.run ? { ...save, run: { ...save.run, act: 1, stats: { combats: [], playMs: 0 } } } : save),
  // Версия 3: появились герои, сложность и коллекция. Старый забег идёт на сложности 0 со всеми картами
  2: (save) => (save.run ? {
    ...save,
    run: {
      ...save.run,
      difficulty: 0,
      lockedCardIds: [],
      lockedRelicIds: [],
      seen: { cards: save.run.deck.map((card) => card.cardId), enemies: [], relics: [...save.run.relics] },
    },
  } : save),
  // Версия 4: появились сохранение посреди боя и обучающий бой
  3: (save) => (save.run ? { ...save, run: { ...save.run, savedCombat: null, tutorialFight: false } } : save),
  // Версия 5: появились город и задания. Содержимое зданий в старый забег не попадает: город ещё пуст
  4: (save) => (save.run ? {
    ...save,
    run: {
      ...save.run,
      lockedEventIds: Object.values(BUILDINGS).flatMap((building) => building.unlocks.events ?? []),
      lockedPotionIds: Object.values(BUILDINGS).flatMap((building) => building.unlocks.potions ?? []),
      lockedRelicIds: [...save.run.lockedRelicIds, ...Object.values(BUILDINGS).flatMap((building) => building.unlocks.relics ?? [])],
      stats: { ...save.run.stats, totals: {} },
    },
  } : save),
};

// Просит браузер не удалять данные сайта при нехватке места. Браузер может отказать, это не ошибка
export function requestPersistentStorage() {
  navigator.storage?.persist?.().catch(() => {});
}

function writeKey(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readKey(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Доводит сохранение до текущей версии. Если перевести нельзя, возвращает null
export function migrateSave(save, migrations = MIGRATIONS, currentVersion = SAVE_VERSION) {
  if (!save || !Number.isInteger(save.version) || save.version > currentVersion) return null;

  let migrated = save;
  while (migrated.version < currentVersion) {
    const migrate = migrations[migrated.version];
    if (!migrate) return null;
    migrated = { ...migrate(migrated), version: migrated.version + 1 };
  }
  return migrated;
}

// Проверяет, что забег можно продолжить: иначе испорченные данные сломали бы игру
function isValidRun(run) {
  if (!run || run.status !== "active") return false;
  if (!Number.isFinite(run.hp) || !Number.isFinite(run.maxHp) || !Number.isFinite(run.gold) || run.hp <= 0) return false;
  if (!Array.isArray(run.deck) || !Array.isArray(run.relics) || !Array.isArray(run.potions)) return false;
  if (!run.map?.nodes || !Array.isArray(run.map.rows) || !Array.isArray(run.visitedNodeIds)) return false;
  if (!Number.isInteger(run.act) || !Array.isArray(run.stats?.combats)) return false;
  if (!Number.isInteger(run.difficulty) || !Array.isArray(run.lockedCardIds) || !Array.isArray(run.lockedRelicIds)) return false;
  if (!Array.isArray(run.lockedEventIds) || !Array.isArray(run.lockedPotionIds)) return false;
  if (!Array.isArray(run.seen?.cards) || !Array.isArray(run.seen?.enemies) || !Array.isArray(run.seen?.relics)) return false;
  if (run.currentNodeId !== null && !run.map.nodes[run.currentNodeId]) return false;
  if (run.savedCombat && !isValidCombat(run.savedCombat)) return false;

  return run.deck.every((card) => CARDS[card.cardId])
    && run.relics.every((relicId) => RELICS[relicId])
    && run.potions.every((potionId) => POTIONS[potionId]);
}

// Проверяет бой из сохранения: те же причины, что и у забега
function isValidCombat(combat) {
  if (combat.status !== "playerTurn" || !combat.rng || !combat.hero || !Array.isArray(combat.enemies)) return false;
  const { draw, hand, discard, exhaust } = combat.piles ?? {};
  if (![draw, hand, discard, exhaust].every(Array.isArray)) return false;
  return [...draw, ...hand, ...discard, ...exhaust].every((card) => CARDS[card.cardId])
    && combat.enemies.every((enemy) => ENEMIES[enemy.enemyId])
    && combat.relics.every((relicId) => RELICS[relicId])
    && combat.potions.every((potionId) => POTIONS[potionId]);
}

function isValidMeta(meta) {
  return meta && Number.isFinite(meta.xp) && meta.xp >= 0;
}

// Сохраняет забег. Возвращает false, если браузер не дал записать
export function saveRun(run) {
  return writeKey(RUN_KEY, JSON.stringify({ version: SAVE_VERSION, run }));
}

// Возвращает забег или null, если сохранения нет или оно испорчено
export function loadRun() {
  const save = migrateSave(parseJson(readKey(RUN_KEY)));
  return save && isValidRun(save.run) ? save.run : null;
}

export function clearRun() {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    // Хранилище недоступно: стирать нечего
  }
}

// Возвращает мета-прогресс. Недостающие поля берутся из значений по умолчанию
export function loadMeta() {
  const save = migrateSave(parseJson(readKey(META_KEY)));
  const defaults = createMeta();
  return {
    ...defaults,
    ...save,
    seen: { ...defaults.seen, ...save?.seen },
    settings: { ...defaults.settings, ...save?.settings },
    // Дом есть всегда, даже если сохранение испорчено
    buildings: [...new Set(["home", ...(save?.buildings ?? [])])],
    // Кто уже играл до появления обучения, тому оно не нужно
    tutorialDone: save?.tutorialDone ?? (save?.runsPlayed ?? 0) > 0,
  };
}

// Сброс прогресса: стирает забег, опыт и коллекцию, но оставляет настройки звука и анимаций
export function resetProgress() {
  const { settings } = loadMeta();
  clearRun();
  saveMeta({ ...createMeta(), settings });
}

export function saveMeta(meta) {
  return writeKey(META_KEY, JSON.stringify({ ...meta, version: SAVE_VERSION }));
}

// Текст из любых символов → base64 и обратно. Такой текст не портится при пересылке в мессенджере
function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(code) {
  const binary = atob(code.trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Собирает всё сохранение в одну строку текста. Если сохранять нечего, возвращает null
export function exportSave() {
  const run = loadRun();
  const meta = loadMeta();
  if (!run && meta.runsPlayed === 0) return null;
  return encodeBase64(JSON.stringify({ version: SAVE_VERSION, run, meta }));
}

// Загружает сохранение из текста. Возвращает { ok: true } или { ok: false, reason: "..." }
export function importSave(code) {
  let raw;
  try {
    raw = JSON.parse(decodeBase64(code));
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (Number.isInteger(raw?.version) && raw.version > SAVE_VERSION) return { ok: false, reason: "tooNew" };
  const save = migrateSave(raw);
  if (!save) return { ok: false, reason: "invalid" };

  // В тексте может не быть забега: тогда он содержит только мета-прогресс
  const hasRun = save.run !== null && save.run !== undefined;
  if (hasRun && !isValidRun(save.run)) return { ok: false, reason: "invalid" };
  if (!hasRun && !isValidMeta(save.meta)) return { ok: false, reason: "invalid" };

  const runSaved = !hasRun || saveRun(save.run);
  const metaSaved = !isValidMeta(save.meta) || saveMeta(save.meta);
  return runSaved && metaSaved ? { ok: true } : { ok: false, reason: "storageFailed" };
}
