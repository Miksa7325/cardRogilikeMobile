// Сохранение и загрузка. Два ключа в localStorage: текущий забег и мета-прогресс.
// Смерть стирает только забег. Браузер может запретить хранилище, поэтому всё обёрнуто в try.
import { CARDS } from "./data/cards.js";
import { POTIONS } from "./data/potions.js";
import { RELICS } from "./data/relics.js";

const RUN_KEY = "cardRpg.run";
const META_KEY = "cardRpg.meta";

// Меняешь формат сохранения: увеличь версию и добавь сюда функцию перевода со старой версии.
// Например, MIGRATIONS[1] получает сохранение версии 1 и возвращает версию 2.
export const SAVE_VERSION = 2;
const MIGRATIONS = {
  // Версия 2: появились акты и статистика забега. Старый забег продолжается в акте 1
  1: (save) => (save.run ? { ...save, run: { ...save.run, act: 1, stats: { combats: [], playMs: 0 } } } : save),
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
  if (run.currentNodeId !== null && !run.map.nodes[run.currentNodeId]) return false;

  return run.deck.every((card) => CARDS[card.cardId])
    && run.relics.every((relicId) => RELICS[relicId])
    && run.potions.every((potionId) => POTIONS[potionId]);
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

// Мета-прогресс появится на этапе 7, пока это только версия
function loadMeta() {
  return migrateSave(parseJson(readKey(META_KEY))) ?? { version: SAVE_VERSION };
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

// Собирает всё сохранение в одну строку текста. Если забега нет, возвращает null
export function exportSave() {
  const run = loadRun();
  if (!run) return null;
  return encodeBase64(JSON.stringify({ version: SAVE_VERSION, run, meta: loadMeta() }));
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
  if (!save || !isValidRun(save.run)) return { ok: false, reason: "invalid" };

  const saved = saveRun(save.run) && writeKey(META_KEY, JSON.stringify(save.meta ?? { version: SAVE_VERSION }));
  return saved ? { ok: true } : { ok: false, reason: "storageFailed" };
}
