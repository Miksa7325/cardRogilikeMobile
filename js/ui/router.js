// Переключение экранов: очищает страницу и рисует нужный экран.
import { setMusicMood } from "./audio.js";
import { hideTooltip } from "./components/tooltip.js";

const screens = {};

// Запоминает функцию, которая рисует экран с этим именем
export function registerScreen(name, render) {
  screens[name] = render;
}

export function showScreen(name) {
  const app = document.getElementById("app");
  hideTooltip();
  setMusicMood(name === "combat" ? "combat" : "calm");
  app.replaceChildren();
  screens[name](app);
}
