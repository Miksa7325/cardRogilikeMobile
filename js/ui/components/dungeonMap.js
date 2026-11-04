// Карта акта поверх подземелья. На ней только то, что герой видел сам: пройденные комнаты и туннели между ними.
// Из развилок торчат обрывки неизведанных туннелей, но куда они ведут, не видно. Только посмотреть:
// путь выбирают в туннелях на экране подземелья.
import { CONFIG } from "../../config.js";
import { TEXTS } from "../../data/texts.ru.js";
import { getAct, getLowerNodeIds } from "../../engine/run.js";
import { el } from "../dom.js";

const ROW_HEIGHT = 64; // расстояние между этажами на карте, px
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const UNKNOWN_SHARE = 0.4; // какая доля неизведанного туннеля видна от развилки

// Начальная комната на карте: ниже первого этажа, посередине. Из неё туннели ведут в первый ряд
function startRoom(run) {
  return { id: null, floor: 0, column: (CONFIG.map.columns - 1) / 2, type: "start", next: run.map.rows[0] };
}

export const NODE_ICONS = {
  battle: "⚔️",
  elite: "👹",
  event: "❓",
  shop: "🛒",
  rest: "🔥",
  chest: "🎁",
  save: "🌀",
  deadEnd: "🧱",
  boss: "💀",
  start: "🚪",
};

// onTravel(nodeId) — быстрый переход в пройденную комнату: на неё достаточно нажать.
// nodeId — null для начальной комнаты
export function openDungeonMap(run, onTravel) {
  const overlay = el("div", "map dungeon-map");
  const scroller = el("div", "map__scroller");
  scroller.append(createMapContent(run, onTravel));
  const close = el("button", "button button--secondary dungeon-map__close", TEXTS.dungeon.close);
  close.type = "button";
  close.addEventListener("click", () => overlay.remove());
  overlay.append(
    el("h2", "event__title dungeon-map__title", TEXTS.dungeon.mapTitle(run.act)),
    el("p", "map__legend dungeon-map__hint", TEXTS.dungeon.mapActMechanic(getAct(run).mechanic.name, getAct(run).mechanic.text)),
    el("p", "map__legend", TEXTS.mapLegend),
    createTeleportHint(run),
    scroller,
    close,
  );
  document.getElementById("app").append(overlay);

  // Показываем, где герой: прокрутка работает, только когда карта уже на странице
  const here = scroller.querySelector(".map-node--current");
  scroller.scrollTop = here.offsetTop - scroller.clientHeight / 2;
}

function createMapContent(run, onTravel) {
  const content = el("div", "map__content");
  content.style.height = `${(topFloor() + 1) * ROW_HEIGHT}px`;

  const known = [startRoom(run), ...run.visitedNodeIds.map((id) => run.map.nodes[id])];
  content.append(createLines(run, known));
  for (const node of known) content.append(createNode(run, node, onTravel));
  return content;
}

// Колонку переводим в доли ширины: так карта тянется по экрану
function getNodeX(node) {
  return ((node.column + 0.5) / CONFIG.map.columns) * 100;
}

// Самый высокий этаж, где может оказаться комната: босс бывает на этаж выше основных путей
function topFloor() {
  return CONFIG.map.floors + 1;
}

// Начальная комната внизу, на нулевом этаже, верхние этажи наверху
function getNodeY(run, node) {
  return (topFloor() - node.floor) * ROW_HEIGHT + ROW_HEIGHT / 2;
}

// Туннель между двумя пройденными комнатами — линия целиком. Неизведанный — только обрывок у развилки:
// его направление видно, а куда он ведёт — нет. По горизонтали координаты в процентах ширины, по вертикали в пикселях
function createLines(run, known) {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.classList.add("map__lines");

  for (const node of known) {
    for (const nextId of node.next) {
      const explored = run.visitedNodeIds.includes(nextId);
      svg.append(createLine(run, node, run.map.nodes[nextId], explored));
    }
    // Туннели двусторонние: из пройденной комнаты виден и спуск в неизведанную комнату ниже.
    // Спуск в пройденную уже нарисован снизу, от неё
    for (const lowerId of getLowerNodeIds(run, node.id)) {
      if (lowerId !== null && !run.visitedNodeIds.includes(lowerId)) svg.append(createLine(run, node, run.map.nodes[lowerId], false));
    }
  }
  return svg;
}

function createLine(run, from, to, explored) {
  const share = explored ? 1 : UNKNOWN_SHARE;
  const x1 = getNodeX(from);
  const y1 = getNodeY(run, from);
  const line = document.createElementNS(SVG_NAMESPACE, "line");
  line.setAttribute("x1", `${x1}%`);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", `${x1 + (getNodeX(to) - x1) * share}%`);
  line.setAttribute("y2", y1 + (getNodeY(run, to) - y1) * share);
  line.classList.add(explored ? "map__line--walked" : "map__line--unknown");
  return line;
}

// Подсказка: переход бесплатный, но в пути может случиться событие
function createTeleportHint() {
  return el("p", "map__legend dungeon-map__hint", TEXTS.dungeon.mapHint);
}

// Где стоит герой, тот узел обведён. Остальные пройденные — кнопки быстрого перехода
function createNode(run, node, onTravel) {
  const here = node.id === run.currentNodeId;
  const marker = el(here ? "div" : "button", "map-node map-node--visited", NODE_ICONS[node.type]);
  marker.style.left = `${getNodeX(node)}%`;
  marker.style.top = `${getNodeY(run, node)}px`;
  if (here) {
    marker.classList.add("map-node--current");
  } else {
    marker.type = "button";
    marker.classList.add("map-node--travel");
    marker.setAttribute("aria-label", TEXTS.dungeon.travelTo(TEXTS.dungeon.nodes[node.type] ?? TEXTS.dungeon.startRoom));
    marker.addEventListener("click", () => onTravel(node.id));
  }
  return marker;
}
