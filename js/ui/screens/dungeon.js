// Экран карты акта: узлы, линии между ними и выбор следующего узла.
import { CONFIG } from "../../config.js";
import { TEXTS } from "../../data/texts.ru.js";
import { startEvent } from "../../engine/events.js";
import { countReadyQuests, getLockedContent, mergeSeen } from "../../engine/meta.js";
import { canReturnToCity, createRun, enterNode, getAvailableNodeIds, getCurrentNode, openChest } from "../../engine/run.js";
import { createShop } from "../../engine/shop.js";
import { loadMeta, saveMeta, saveRun } from "../../save.js";
import { state } from "../../state.js";
import { createRunBar } from "../components/runBar.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { resetPlayTimer, trackPlayTime } from "../playTime.js";
import { showScreen } from "../router.js";
import { createTutorialBanner, notifyTutorial, startTutorial } from "../tutorial.js";
import { openCity } from "./city.js";
import { resumeCombat, startNodeCombat } from "./combat.js";
import { openRunStats } from "./runStats.js";

const ROW_HEIGHT = 64; // расстояние между этажами на карте, px
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const NODE_ICONS = {
  battle: "⚔️",
  elite: "👹",
  event: "❓",
  shop: "🛒",
  rest: "🔥",
  chest: "🎁",
  save: "🌀",
  boss: "💀",
};

// Запускает новый забег. Время как seed задаём здесь: в логике случайность только через rng.js
export function startNewRun(heroId, difficulty) {
  const meta = loadMeta();
  state.run = createRun({
    heroId,
    seed: Date.now(),
    difficulty,
    tutorialFight: !meta.tutorialDone,
    ...getLockedContent(meta),
  });
  state.test.enabled = false;
  if (!meta.tutorialDone) startTutorial();
  resetPlayTimer();
  showScreen("map");
}

// Продолжает сохранённый забег там, где игрок остановился: на награде, в бою или на карте
export function continueRun(run) {
  state.run = run;
  state.test.enabled = false;
  resetPlayTimer();
  if (run.pendingReward) showScreen("reward");
  else if (run.savedCombat) resumeCombat();
  else showScreen("map");
}

export function renderMapScreen(root) {
  const run = state.run;
  const meta = loadMeta();
  const screen = el("main", "map");
  const scroller = el("div", "map__scroller");
  scroller.append(createMapContent(run));
  const statsButton = el("button", "map__stats", TEXTS.stats.button);
  statsButton.type = "button";
  statsButton.addEventListener("click", () => openRunStats(run));
  const links = el("div", "map__links");
  links.append(statsButton);
  if (canReturnToCity(run)) links.append(createCityButton(meta));
  screen.append(createRunBar(run, { allSaved: true }), el("p", "map__legend", TEXTS.mapLegend), links, scroller);
  const banner = createTutorialBanner("map");
  if (banner) screen.append(banner);
  root.append(screen);

  // На карту игрок попадает только между узлами, поэтому здесь и сохраняем забег
  trackPlayTime(run);
  run.savedCombat = null;
  mergeSeen(meta, run);
  if (!saveRun(run) || !saveMeta(meta)) showTooltip(TEXTS.saveFailed);

  // Показываем ряд, куда можно идти: прокрутка работает, только когда карта уже на странице
  const firstAvailable = scroller.querySelector(".map-node--available");
  scroller.scrollTop = firstAvailable.offsetTop - scroller.clientHeight / 2;
}

// Подняться в город можно только из комнаты сохранения: там строят дома и забирают награды за задания.
// Если награды ждут, кнопка подсвечена
function createCityButton(meta) {
  const ready = countReadyQuests(meta);
  const button = el("button", "map__stats", ready > 0 ? TEXTS.city.buttonReady(ready) : TEXTS.city.button);
  button.type = "button";
  if (ready > 0) button.classList.add("map__stats--attention");
  button.addEventListener("click", () => openCity("gate"));
  return button;
}

function createMapContent(run) {
  const content = el("div", "map__content");
  content.style.height = `${run.map.rows.length * ROW_HEIGHT}px`;
  content.append(createLines(run));

  const available = getAvailableNodeIds(run);
  for (const node of Object.values(run.map.nodes)) {
    content.append(createNode(run, node, available.includes(node.id)));
  }
  return content;
}

function getNodeX(node) {
  return `${((node.column + 0.5) / CONFIG.map.columns) * 100}%`;
}

// Этаж 1 внизу, босс наверху
function getNodeY(run, node) {
  return (run.map.rows.length - node.floor) * ROW_HEIGHT + ROW_HEIGHT / 2;
}

function createLines(run) {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.classList.add("map__lines");

  for (const node of Object.values(run.map.nodes)) {
    for (const nextId of node.next) {
      const next = run.map.nodes[nextId];
      const line = document.createElementNS(SVG_NAMESPACE, "line");
      line.setAttribute("x1", getNodeX(node));
      line.setAttribute("y1", getNodeY(run, node));
      line.setAttribute("x2", getNodeX(next));
      line.setAttribute("y2", getNodeY(run, next));
      const walked = run.visitedNodeIds.includes(node.id) && run.visitedNodeIds.includes(nextId);
      line.classList.add(walked ? "map__line--walked" : "map__line");
      svg.append(line);
    }
  }
  return svg;
}

function createNode(run, node, isAvailable) {
  const button = el("button", "map-node", NODE_ICONS[node.type]);
  button.type = "button";
  button.style.left = getNodeX(node);
  button.style.top = `${getNodeY(run, node)}px`;

  if (isAvailable) {
    button.classList.add("map-node--available");
    button.addEventListener("click", () => onNodeTap(run, node.id));
  } else if (run.visitedNodeIds.includes(node.id)) {
    button.classList.add("map-node--visited");
  }
  return button;
}

function onNodeTap(run, nodeId) {
  if (!enterNode(run, nodeId)) return;
  notifyTutorial("nodeEntered");

  const type = getCurrentNode(run).type;
  if (type === "rest") {
    showScreen("rest");
  } else if (type === "save") {
    showScreen("saveRoom");
  } else if (type === "chest") {
    openChest(run);
    showScreen("reward");
  } else if (type === "event") {
    startEvent(run);
    showScreen("event");
  } else if (type === "shop") {
    createShop(run);
    showScreen("shop");
  } else {
    startNodeCombat();
  }
}
