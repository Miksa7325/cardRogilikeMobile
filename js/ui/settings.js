// Применяет настройки игрока: громкость и скорость анимаций. Сами настройки лежат в мета-прогрессе.
import { loadMeta } from "../save.js";
import { setVolumes } from "./audio.js";

const ANIMATION_MS = 300; // обычная длительность анимации
let speedFactor = 1;

export function applySettings() {
  const { settings } = loadMeta();
  setVolumes(settings.music, settings.effects);
  speedFactor = settings.fastAnimations ? 0.5 : 1;
  // Системная настройка «уменьшить движение» важнее: почти убираем анимации
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) speedFactor = 0.01;
  // CSS берёт скорость из этой переменной
  document.documentElement.style.setProperty("--anim-speed", speedFactor);
}

// Длительность с учётом ускорения: для пауз в коде, а не в CSS
export function animationMs(multiplier = 1) {
  return ANIMATION_MS * multiplier * speedFactor;
}

// Вибрация работает на Android, а браузер на iPhone её не поддерживает
export function isVibrationSupported() {
  return typeof navigator.vibrate === "function";
}

export function vibrate(milliseconds) {
  if (isVibrationSupported() && loadMeta().settings.vibration) navigator.vibrate(milliseconds);
}
