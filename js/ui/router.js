// Переключение экранов: очищает страницу и рисует нужный экран.
import { hideTooltip } from "./components/tooltip.js";

const screens = {};

// Запоминает функцию, которая рисует экран с этим именем
export function registerScreen(name, render) {
  screens[name] = render;
}

export function showScreen(name) {
  const app = document.getElementById("app");
  hideTooltip();
  app.replaceChildren();
  screens[name](app);
}
