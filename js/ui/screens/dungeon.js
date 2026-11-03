// Подземелье от первого лица: герой стоит в комнате или коридоре и выбирает, куда идти. Туннели вверх, от одного
// до трёх, — на дальней стене, спуски в комнаты этажом ниже — люки в полу. Что за новым проходом, не видно.
// Карта акта открывается отдельной кнопкой.
import { CONFIG } from "../../config.js";
import { TEXTS } from "../../data/texts.ru.js";
import { startEvent } from "../../engine/events.js";
import { countReadyQuests, getLockedContent, mergeSeen } from "../../engine/meta.js";
import {
  canReturnToCity, createRun, enterNode, getAvailableNodeIds, getCurrentNode, getLowerNodeIds, getPreviousNodeId,
  isNodeCleared, openChest, travelTo,
} from "../../engine/run.js";
import { createShop } from "../../engine/shop.js";
import { loadMeta, saveMeta, saveRun } from "../../save.js";
import { state } from "../../state.js";
import { NODE_ICONS, openDungeonMap } from "../components/dungeonMap.js";
import { createItemColumns, createRunBar } from "../components/runBar.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { resetPlayTimer, trackPlayTime } from "../playTime.js";
import { showScreen } from "../router.js";
import { animationMs } from "../settings.js";
import { createTutorialBanner, notifyTutorial, startTutorial } from "../tutorial.js";
import { openCity } from "./city.js";
import { resumeCombat, startNodeCombat } from "./combat.js";
import { openRunStats } from "./runStats.js";

const WALK_ANIMATIONS = 2.4; // шаг в туннель длится столько обычных анимаций

// Сложенная карта для кнопки карты: три листа и пунктир пути с крестиком
const MAP_ICON = `<svg class="map-button__icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M3 8l8-3 10 3 8-3v19l-8 3-10-3-8 3z" fill="#e8d3a2" stroke="#5a3d1e" stroke-width="2" stroke-linejoin="round"/><path d="M11 5v19M21 8v19" stroke="#5a3d1e" stroke-width="1.5" opacity=".55"/><path d="M6 21c3-1 4-6 8-6s4 4 9-1" fill="none" stroke="#8a2a1e" stroke-width="1.6" stroke-dasharray="2 2"/><path d="M22 10l3 3m0-3-3 3" stroke="#b0281a" stroke-width="2" stroke-linecap="round"/></svg>`;

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
  showScreen("dungeon");
}

// Продолжает сохранённый забег там, где игрок остановился: на награде, в бою или в подземелье
export function continueRun(run) {
  state.run = run;
  state.test.enabled = false;
  resetPlayTimer();
  if (run.pendingReward) showScreen("reward");
  else if (run.savedCombat) resumeCombat();
  else showScreen("dungeon");
}

export function renderDungeonScreen(root) {
  const run = state.run;
  const meta = loadMeta();
  const screen = el("main", "dungeon");
  const place = describePlace(run);
  // Дорога назад — такой же проход, как остальные: люк, если герой пришёл снизу, арка, если сверху.
  // Проходы слева направо в том же порядке, что узлы на карте
  const previous = getPreviousNodeId(run);
  const tunnels = getAvailableNodeIds(run).map((id) => run.map.nodes[id]).sort((a, b) => a.column - b.column);
  const descents = getLowerNodeIds(run).map((id) => (id === null ? START_ROOM : run.map.nodes[id])).sort((a, b) => a.column - b.column);

  // Пока герой идёт, второй выбор не принимаем
  let walking = false;
  const move = (start) => {
    if (walking) return;
    walking = true;
    start();
  };
  const choose = (index) => move(() => walkInto(corridor, index, tunnels.length, () => enterTunnel(run, tunnels[index].id)));
  const hatchPositions = layoutFloor(run, descents);
  const chooseDown = (index) => move(() => walkDown(corridor, index, hatchPositions[index], () => enterTunnel(run, descents[index].id)));
  const corridor = createCorridor(run, { tunnels, descents, hatchPositions, previous, choose, chooseDown });

  const heading = el("div", "dungeon__place");
  heading.append(el("h1", "dungeon__title", place.title), el("p", "dungeon__hint", describeWay(place, tunnels.length, descents.length)));

  // Переходят, нажимая на сами проходы: туннели и люки. Предметы висят по бокам, карта и город — в нижних углах
  corridor.append(...createItemColumns(run.relics, run.potions), createCorridorActions(run, meta));
  screen.append(createRunBar(run, { allSaved: true, showItems: false, onStats: () => openRunStats(run) }), heading, corridor);
  const banner = createTutorialBanner("dungeon");
  if (banner) screen.append(banner);
  root.append(screen);

  // Сюда игрок попадает только между узлами, поэтому здесь и сохраняем забег
  trackPlayTime(run);
  run.savedCombat = null;
  mergeSeen(meta, run);
  if (!saveRun(run) || !saveMeta(meta)) showTooltip(TEXTS.saveFailed);
}

// Где стоит герой: в начальной комнате акта, в комнате сохранения или в коридоре
function describePlace(run) {
  if (!run.currentNodeId) {
    return run.act === 1
      ? { title: TEXTS.dungeon.startRoom, hint: TEXTS.dungeon.startHint, room: true }
      : { title: TEXTS.dungeon.actStart(run.act), hint: TEXTS.dungeon.hint, room: true };
  }
  const type = getCurrentNode(run).type;
  if (type === "save") return { title: TEXTS.saveRoom.title, hint: TEXTS.dungeon.hint, room: true };
  if (type === "deadEnd") return { title: TEXTS.dungeon.nodes.deadEnd, hint: TEXTS.dungeon.deadEndHint, room: false };
  return { title: TEXTS.dungeon.corridor, hint: TEXTS.dungeon.hint, room: false };
}

// Подсказка под названием: сколько дальше дорог и есть ли они вообще
function describeWay(place, tunnelCount, descentCount) {
  if (tunnelCount === 0) return descentCount > 0 ? TEXTS.dungeon.onlyDown : TEXTS.dungeon.deadEndHint;
  if (tunnelCount === 1) return TEXTS.dungeon.oneTunnel;
  return place.hint;
}

// Начальная комната как место, куда можно спуститься из первого ряда. На карте она посередине
const START_ROOM = { id: null, type: "start", column: (CONFIG.map.columns - 1) / 2 };

// Места на полу, в процентах ширины: слева, посередине, справа
const FLOOR_SLOTS = [22, 50, 78];

// Сторона, где лежит соседняя комната: по разнице колонок на карте
function floorSlot(run, node) {
  const here = run.currentNodeId ? getCurrentNode(run).column : START_ROOM.column;
  const shift = node.column - here;
  if (shift < -0.25) return 0;
  return shift > 0.25 ? 2 : 1;
}

// Где на полу люки вниз. Каждый — с той стороны, где его комната: пришёл справа — люк назад справа,
// а остальные слева и посередине. Если двум люкам выпала одна сторона, расставляем все равномерно,
// сохраняя порядок слева направо
function layoutFloor(run, descents) {
  const slots = descents.map((node) => floorSlot(run, node));
  const crowded = new Set(slots).size < slots.length;
  return descents.map((_, index) => (crowded ? tunnelPosition(index, descents.length) : FLOOR_SLOTS[slots[index]]));
}

// Коридор в перспективе: стены, пол и потолок — грани коробки, на дальней стене входы в туннели, в полу люки вниз.
// В комнате коробка короче и шире на вид, а сверху падает свет. В тупике на стене нет ни одного входа
function createCorridor(run, { tunnels, descents, hatchPositions, previous, choose, chooseDown }) {
  const corridor = el("div", "corridor");
  corridor.dataset.act = String(run.act);
  if (describePlace(run).room) corridor.classList.add("corridor--room");

  const end = el("div", "corridor__end");
  tunnels.forEach((node, index) => end.append(createTunnel(run, node, index, tunnels.length, previous, choose)));
  const floor = el("div", "corridor__floor");
  descents.forEach((node, index) => floor.append(createHatch(run, node, index, descents.length, hatchPositions[index], previous, chooseDown)));

  const world = el("div", "corridor__world");
  world.append(
    el("div", "corridor__wall corridor__wall--left"),
    el("div", "corridor__wall corridor__wall--right"),
    floor,
    el("div", "corridor__ceiling"),
    end,
  );
  corridor.append(world, el("div", "corridor__shade"));
  if (!run.currentNodeId) corridor.append(el("div", "corridor__light"));
  return corridor;
}

// Знак над проходом. Над новым его нет: что там, не видно. Над пройденным — что там было, с галочкой.
// Над тем, откуда герой пришёл, — стрелка назад
function createSign(run, node, previous, className) {
  if (node.id === previous) return el("span", `${className} ${className}--back`, `↩ ${NODE_ICONS[node.type]}`);
  return isNodeCleared(run, node.id) ? el("span", className, NODE_ICONS[node.type]) : null;
}

// Середина туннеля на дальней стене, в процентах её ширины: входы стоят равномерно
function tunnelPosition(index, count) {
  return ((index + 0.5) / count) * 100;
}

function createTunnel(run, node, index, count, previous, onChoose) {
  const tunnel = el("button", "tunnel");
  tunnel.type = "button";
  tunnel.style.left = `${tunnelPosition(index, count)}%`;
  tunnel.setAttribute("aria-label", describeTunnel(run, node, index, count, previous));
  if (isNodeCleared(run, node.id)) tunnel.classList.add("tunnel--cleared");
  const sign = createSign(run, node, previous, "tunnel__sign");
  if (sign) tunnel.append(sign);
  tunnel.addEventListener("click", () => onChoose(index));
  return tunnel;
}

// Герой идёт в выбранный туннель: коридор надвигается и темнеет, потом открывается то, что там ждёт
function walkInto(corridor, index, count, onArrive) {
  corridor.style.setProperty("--walk-x", `${50 - tunnelPosition(index, count)}%`);
  corridor.classList.add("corridor--walking");
  corridor.querySelectorAll(".tunnel")[index].classList.add("tunnel--chosen");
  // Пока герой шёл, игрок мог уйти в меню: тогда в туннель не входим
  setTimeout(() => {
    if (corridor.isConnected) onArrive();
  }, animationMs(WALK_ANIMATIONS));
}

// Люк в полу со ступенями вниз. Знаки над ним те же, что над туннелями
function createHatch(run, node, index, count, position, previous, onChoose) {
  const hatch = el("button", "hatch");
  hatch.type = "button";
  hatch.style.left = `${position}%`;
  hatch.setAttribute("aria-label", describeTunnel(run, node, index, count, previous, TEXTS.dungeon.downDirections));
  if (isNodeCleared(run, node.id)) hatch.classList.add("hatch--cleared");
  const sign = createSign(run, node, previous, "hatch__sign");
  if (sign) hatch.append(sign);
  hatch.addEventListener("click", () => onChoose(index));
  return hatch;
}

// Герой спускается в люк: коридор уходит вверх и надвигается, всё темнеет
function walkDown(corridor, index, position, onArrive) {
  corridor.style.setProperty("--walk-x", `${50 - position}%`);
  corridor.classList.add("corridor--descending");
  corridor.querySelectorAll(".hatch")[index].classList.add("hatch--chosen");
  setTimeout(() => {
    if (corridor.isConnected) onArrive();
  }, animationMs(WALK_ANIMATIONS));
}

// Новый проход называем по направлению, пройденный — по тому, что в нём было
function describeTunnel(run, node, index, count, previous, directions = TEXTS.dungeon.directions) {
  if (node.id === previous) return TEXTS.dungeon.cameFrom(TEXTS.dungeon.nodes[node.type]);
  if (isNodeCleared(run, node.id)) return TEXTS.dungeon.cleared(`${NODE_ICONS[node.type]} ${TEXTS.dungeon.nodes[node.type]}`);
  return directions[count]?.[index] ?? TEXTS.dungeon.tunnel(index + 1);
}

// Нижние углы коридора: слева город, когда в него можно подняться, справа карта
function createCorridorActions(run, meta) {
  const actions = el("div", "corridor__actions");
  actions.append(canReturnToCity(run) ? createCityButton(meta) : el("span", ""), createMapButton(run));
  return actions;
}

// Карта — свёрнутый лист пергамента. На карте можно нажать на пройденную комнату и быстро перейти туда
function createMapButton(run) {
  const button = el("button", "map-button");
  button.type = "button";
  button.innerHTML = MAP_ICON;
  button.append(el("span", "map-button__label", TEXTS.dungeon.mapButton));
  button.addEventListener("click", () => openDungeonMap(run, (nodeId) => {
    if (!travelTo(run, nodeId)) return;
    showScreen("dungeon");
    showTooltip(TEXTS.dungeon.traveled);
  }));
  return button;
}

// Подняться в город можно только из комнаты сохранения: там строят дома и забирают награды за задания.
// Если награды ждут, кнопка подсвечена
function createCityButton(meta) {
  const ready = countReadyQuests(meta);
  const button = el("button", "corridor__city", ready > 0 ? TEXTS.city.buttonReady(ready) : TEXTS.city.button);
  button.type = "button";
  if (ready > 0) button.classList.add("corridor__city--attention");
  button.addEventListener("click", () => openCity("gate"));
  return button;
}

// Входит в комнату за туннелем. В пройденной и в пустом тупике ничего не случается: герой просто стоит там
function enterTunnel(run, nodeId) {
  const cleared = isNodeCleared(run, nodeId);
  if (!enterNode(run, nodeId)) return;
  notifyTutorial("nodeEntered");

  // В начальной комнате узла нет, но она всегда пройдена: тип не нужен
  const type = cleared ? null : getCurrentNode(run).type;
  if (cleared || type === "deadEnd") {
    showScreen("dungeon");
  } else if (type === "rest") {
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
