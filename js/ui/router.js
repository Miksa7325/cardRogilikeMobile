// Переключение экранов: очищает страницу и рисует нужный экран.
import { state } from "../state.js";
import { setMusicMood } from "./audio.js";
import { hideTooltip } from "./components/tooltip.js";
import { setSceneAct } from "./scene.js";

const screens = {};

// Все анимации покоя длятся столько, чтобы укладываться в 12 секунд. Экран рисуется заново после
// каждого действия, а фаза считается по часам: поэтому модели не дёргаются при перерисовке
const IDLE_CYCLE_MS = 12000;

// Музыка экранов. Остальные экраны — подземелье; у боя своя музыка, у боя с боссом — своя.
// На экране итогов играет джингл победы или поражения, музыка молчит
const MUSIC_BY_SCREEN = {
  start: "menu", saves: "menu", settings: "menu", collection: "menu", credits: "menu", saveTransfer: "menu", testSetup: "menu",
  city: "town",
  result: "silence",
};

function getMusicMood(name) {
  if (name !== "combat") return MUSIC_BY_SCREEN[name] ?? "dungeon";
  const run = state.run;
  const bossFight = !state.arena && !state.test.enabled && run?.currentNodeId && run.map.nodes[run.currentNodeId]?.type === "boss";
  return bossFight ? "boss" : "combat";
}

// На этих экранах фон меню, а не текущего акта
const MENU_SCREENS = ["start", "collection", "settings", "saveTransfer", "credits", "testSetup", "city", "saves"];

// Запоминает функцию, которая рисует экран с этим именем
export function registerScreen(name, render) {
  screens[name] = render;
}

export function showScreen(name) {
  const app = document.getElementById("app");
  hideTooltip();
  setMusicMood(getMusicMood(name));
  setSceneAct(MENU_SCREENS.includes(name) ? 0 : state.test.enabled ? 1 : state.run?.act ?? 0);
  document.documentElement.style.setProperty("--idle-phase", `-${Date.now() % IDLE_CYCLE_MS}ms`);
  app.replaceChildren();
  screens[name](app);
}
