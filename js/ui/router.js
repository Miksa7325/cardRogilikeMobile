// Переключение экранов: очищает страницу и рисует нужный экран.
import { state } from "../state.js";
import { setMusicMood } from "./audio.js";
import { hideTooltip } from "./components/tooltip.js";
import { setSceneAct } from "./scene.js";

const screens = {};

// Все анимации покоя длятся столько, чтобы укладываться в 12 секунд. Экран рисуется заново после
// каждого действия, а фаза считается по часам: поэтому модели не дёргаются при перерисовке
const IDLE_CYCLE_MS = 12000;

// Запоминает функцию, которая рисует экран с этим именем
export function registerScreen(name, render) {
  screens[name] = render;
}

export function showScreen(name) {
  const app = document.getElementById("app");
  hideTooltip();
  setMusicMood(name === "combat" ? "combat" : "calm");
  setSceneAct(state.run?.status === "active" && !state.test.enabled ? state.run.act : 1);
  document.documentElement.style.setProperty("--idle-phase", `-${Date.now() % IDLE_CYCLE_MS}ms`);
  app.replaceChildren();
  screens[name](app);
}
