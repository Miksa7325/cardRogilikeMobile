// Считает время игры для статистики. Часы — это интерфейс, в логике боя времени нет.
import { CONFIG } from "../config.js";

let lastTick = null;

// Начинает отсчёт заново: при запуске или продолжении забега
export function resetPlayTimer() {
  lastTick = Date.now();
}

// Прибавляет время с прошлого вызова. Долгий простой не считаем: игрок мог закрыть игру
export function trackPlayTime(run) {
  const now = Date.now();
  if (lastTick !== null) {
    run.stats.playMs += Math.min(now - lastTick, CONFIG.maxPlayTimePerNodeMs);
  }
  lastTick = now;
}
