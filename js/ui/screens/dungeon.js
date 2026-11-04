// Подземелье от первого лица: герой стоит в комнате или коридоре и выбирает, куда идти. Туннели вверх, от одного
// до трёх, — на дальней стене, спуски в комнаты этажом ниже — люки в полу. Что за новым проходом, не видно.
// Карта акта открывается отдельной кнопкой, если её купили у торговца. Банка светлячков освещает неизведанный проход.
import { CONFIG } from "../../config.js";
import { TEXTS } from "../../data/texts.ru.js";
import { startEvent } from "../../engine/events.js";
import {
  bankLoot, countReadyQuests, getHeroEquipment, getLockedContent, isHeroDead, keepEquipment, mergeSeen, payForActStart, takeSupplies,
} from "../../engine/meta.js";
import {
  canReturnToCity, createRun, enterNode, getAct, getAvailableNodeIds, getCurrentNode, getLowerNodeIds, getPreviousNodeId, getStepCost,
  isNodeCleared, isNodeRevealed, openChest, rechargeFireflies, releaseFireflies, travelTo,
} from "../../engine/run.js";
import { loadMeta, loadRun, saveMeta, saveRun } from "../../save.js";
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

// Запускает новый забег с начала акта: первый бесплатно, остальные за золото из казны. Комнаты каждый раз новые.
// Время как seed задаём здесь: в логике случайность только через rng.js.
// Герой берёт своё снаряжение с прошлых забегов и припасы, купленные у торговца: из казны они уходят.
// Если идёт другой забег, он заканчивается: его герой возвращается домой со всем, что у него есть.
// Возвращает false, если герой погиб или не хватило золота
export function startNewRun(heroId, startAct = 1) {
  const meta = loadMeta();
  if (isHeroDead(meta, heroId) || !payForActStart(meta, startAct)) return false;
  const previous = loadRun();
  if (previous) {
    bankLoot(meta, previous);
    keepEquipment(meta, previous);
  }
  const supplies = takeSupplies(meta);
  state.run = createRun({
    heroId,
    seed: Date.now(),
    startAct,
    tutorialFight: !meta.tutorialDone && startAct === 1,
    ...getLockedContent(meta),
    equipment: getHeroEquipment(meta, heroId),
    potions: supplies.potions,
    hasMap: supplies.hasMap,
    fireflies: supplies.fireflies,
    blessing: supplies.blessing,
  });
  saveMeta(meta);
  state.test.enabled = false;
  if (state.run.tutorialFight) startTutorial();
  resetPlayTimer();
  showScreen("dungeon");
  return true;
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

  // Пока герой идёт, второй выбор не принимаем. Если открыта банка светлячков, нажатие на проход освещает его, а не ведёт туда
  let walking = false;
  let aiming = false;
  const move = (node, start) => {
    if (aiming) {
      lightUp(run, node);
      return;
    }
    if (walking) return;
    walking = true;
    start();
  };
  const tunnelPlaces = layoutBySide(run, tunnels, TUNNEL_WIDTH);
  const hatchPlaces = layoutBySide(run, descents, HATCH_WIDTH);
  const choose = (index) => move(tunnels[index], () => walkInto(corridor, index, tunnelPlaces[index], () => enterTunnel(run, tunnels[index].id)));
  const chooseDown = (index) => move(descents[index], () => walkDown(corridor, index, hatchPlaces[index], () => enterTunnel(run, descents[index].id)));
  const toggleAiming = () => {
    aiming = !aiming;
    corridor.classList.toggle("corridor--aiming", aiming);
    if (aiming) showTooltip(TEXTS.dungeon.fireflies.aim);
  };
  const corridor = createCorridor(run, { tunnels, descents, tunnelPlaces, hatchPlaces, previous, choose, chooseDown });

  const heading = el("div", "dungeon__place");
  heading.append(el("h1", "dungeon__title", place.title), el("p", "dungeon__hint", describeWay(place, tunnels.length, descents.length)));

  // Переходят, нажимая на сами проходы: туннели и люки. Предметы висят по бокам, карта и город — в нижних углах
  corridor.append(...createItemColumns(run.relics, run.potions), createCorridorActions(run, meta, toggleAiming));
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
// В начальной комнате акта видно его название и особенность: игрок узнаёт, к чему готовиться
function describePlace(run) {
  if (!run.currentNodeId) {
    const act = getAct(run);
    return { title: TEXTS.dungeon.actTitle(run.act, act.name), hint: TEXTS.dungeon.actMechanic(act.mechanic.name, act.mechanic.text), room: true };
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

// Ширина арки и люка, в процентах ширины стены и пола
const TUNNEL_WIDTH = 26;
const HATCH_WIDTH = 26;
const THIRD = 100 / 3;

// Сторона, куда ведёт проход: 0 — налево, 1 — прямо, 2 — направо. По разнице колонок на карте
function sideOf(run, node) {
  const here = run.currentNodeId ? getCurrentNode(run).column : START_ROOM.column;
  const shift = node.column - here;
  if (shift < -0.25) return 0;
  return shift > 0.25 ? 2 : 1;
}

// Где стоят арки на стене и люки на полу. Каждый проход — на своей трети, смотря куда ведёт, сколько бы их ни было:
// единственный туннель налево стоит слева. Если на одну треть выпало несколько, они делят её поровну и становятся уже.
// nodes уже отсортированы слева направо, поэтому порядок внутри трети тот же, что на карте
function layoutBySide(run, nodes, width) {
  const sides = nodes.map((node) => sideOf(run, node));
  return nodes.map((_, index) => {
    const group = sides.filter((side) => side === sides[index]).length;
    const rank = sides.slice(0, index).filter((side) => side === sides[index]).length;
    return {
      side: sides[index],
      position: THIRD * (sides[index] + (rank + 0.5) / group),
      width: Math.min(width, (THIRD / group) * 0.9),
    };
  });
}

function putAt(element, { position, width }) {
  element.style.left = `${position}%`;
  element.style.width = `${width}%`;
}

// Коридор в перспективе: стены, пол и потолок — грани коробки, на дальней стене входы в туннели, в полу люки вниз.
// В комнате коробка короче и шире на вид, а сверху падает свет. В тупике на стене нет ни одного входа
function createCorridor(run, { tunnels, descents, tunnelPlaces, hatchPlaces, previous, choose, chooseDown }) {
  const corridor = el("div", "corridor");
  corridor.dataset.act = String(run.act);
  if (describePlace(run).room) corridor.classList.add("corridor--room");

  const end = el("div", "corridor__end");
  tunnels.forEach((node, index) => end.append(createTunnel(run, node, index, tunnelPlaces[index], previous, choose)));
  const floor = el("div", "corridor__floor");
  descents.forEach((node, index) => floor.append(createHatch(run, node, index, hatchPlaces[index], previous, chooseDown)));

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
// Над тем, откуда герой пришёл, — стрелка назад. Над освещённым светлячками — что там ждёт
function createSign(run, node, previous, className) {
  if (node.id === previous) return el("span", `${className} ${className}--back`, `↩ ${NODE_ICONS[node.type]}`);
  if (isNodeRevealed(run, node.id) && !isNodeCleared(run, node.id)) {
    return el("span", `${className} ${className}--revealed`, `✨ ${NODE_ICONS[node.type]}`);
  }
  return isNodeCleared(run, node.id) ? el("span", className, NODE_ICONS[node.type]) : null;
}

// Светлячки летят в выбранный проход и показывают, что там. В пройденный светить незачем
function lightUp(run, node) {
  if (isNodeCleared(run, node.id)) {
    showTooltip(TEXTS.dungeon.fireflies.known);
    return;
  }
  if (!releaseFireflies(run, node.id)) return;
  showScreen("dungeon");
  showTooltip(TEXTS.dungeon.fireflies.revealed(`${NODE_ICONS[node.type]} ${TEXTS.dungeon.nodes[node.type]}`));
}

function createTunnel(run, node, index, spot, previous, onChoose) {
  const tunnel = el("button", "tunnel");
  tunnel.type = "button";
  putAt(tunnel, spot);
  tunnel.setAttribute("aria-label", describeTunnel(run, node, spot.side, previous, TEXTS.dungeon.sides));
  if (isNodeCleared(run, node.id)) tunnel.classList.add("tunnel--cleared");
  const sign = createSign(run, node, previous, "tunnel__sign");
  if (sign) tunnel.append(sign);
  tunnel.addEventListener("click", () => onChoose(index));
  return tunnel;
}

// Герой идёт в выбранный туннель: коридор надвигается и темнеет, потом открывается то, что там ждёт
function walkInto(corridor, index, spot, onArrive) {
  corridor.style.setProperty("--walk-x", `${50 - spot.position}%`);
  corridor.classList.add("corridor--walking");
  corridor.querySelectorAll(".tunnel")[index].classList.add("tunnel--chosen");
  // Пока герой шёл, игрок мог уйти в меню: тогда в туннель не входим
  setTimeout(() => {
    if (corridor.isConnected) onArrive();
  }, animationMs(WALK_ANIMATIONS));
}

// Люк в полу со ступенями вниз. Знаки над ним те же, что над туннелями
function createHatch(run, node, index, spot, previous, onChoose) {
  const hatch = el("button", "hatch");
  hatch.type = "button";
  putAt(hatch, spot);
  hatch.setAttribute("aria-label", describeTunnel(run, node, spot.side, previous, TEXTS.dungeon.downSides));
  if (isNodeCleared(run, node.id)) hatch.classList.add("hatch--cleared");
  const sign = createSign(run, node, previous, "hatch__sign");
  if (sign) hatch.append(sign);
  hatch.addEventListener("click", () => onChoose(index));
  return hatch;
}

// Герой спускается в люк: коридор уходит вверх и надвигается, всё темнеет
function walkDown(corridor, index, spot, onArrive) {
  corridor.style.setProperty("--walk-x", `${50 - spot.position}%`);
  corridor.classList.add("corridor--descending");
  corridor.querySelectorAll(".hatch")[index].classList.add("hatch--chosen");
  setTimeout(() => {
    if (corridor.isConnected) onArrive();
  }, animationMs(WALK_ANIMATIONS));
}

// Новый проход называем по направлению, пройденный — по тому, что в нём было
function describeTunnel(run, node, side, previous, sideNames) {
  if (node.id === previous) return TEXTS.dungeon.cameFrom(TEXTS.dungeon.nodes[node.type]);
  if (isNodeCleared(run, node.id)) return TEXTS.dungeon.cleared(`${NODE_ICONS[node.type]} ${TEXTS.dungeon.nodes[node.type]}`);
  if (isNodeRevealed(run, node.id)) return `${sideNames[side]}: ${TEXTS.dungeon.nodes[node.type]}`;
  return sideNames[side];
}

// Нижние углы коридора: слева город, когда в него можно подняться, справа банка светлячков и карта — если они куплены
function createCorridorActions(run, meta, toggleAiming) {
  const actions = el("div", "corridor__actions");
  const tools = el("div", "corridor__tools");
  // Кромешная тьма: ни карта, ни светлячки здесь не помогают
  const dark = getAct(run).mechanic.noMap;
  if (run.fireflies && !dark) tools.append(createFirefliesButton(run, toggleAiming));
  if (run.hasMap && !dark) tools.append(createMapButton(run));
  // Слева — выход в город, а в начальной комнате акта ещё и лавка
  const exits = el("div", "corridor__tools");
  if (canReturnToCity(run)) exits.append(createCityButton(meta));
  if (!run.currentNodeId) exits.append(createShopButton());
  actions.append(exits, tools);
  return actions;
}

// Лавка в начальной комнате акта: карта подземелья и избавление от карты
function createShopButton() {
  const button = el("button", "corridor__city", TEXTS.dungeon.shopButton);
  button.type = "button";
  button.addEventListener("click", () => showScreen("shop"));
  return button;
}

// Банка светлячков: полная светится, пустая тёмная до следующего отдыха или комнаты сохранения
function createFirefliesButton(run, toggleAiming) {
  const charged = run.fireflies.charged;
  const button = el("button", `fireflies-button${charged ? " fireflies-button--charged" : ""}`);
  button.type = "button";
  button.append(el("span", "fireflies-button__jar", charged ? "✨" : "·"), el("span", "map-button__label", TEXTS.dungeon.fireflies.button));
  button.addEventListener("click", () => {
    if (!charged) {
      showTooltip(TEXTS.dungeon.fireflies.empty);
      return;
    }
    button.classList.toggle("fireflies-button--aiming");
    toggleAiming();
  });
  return button;
}

// Карта — свёрнутый лист пергамента. На карте можно нажать на пройденную комнату и быстро перейти туда
function createMapButton(run) {
  const button = el("button", "map-button");
  button.type = "button";
  button.innerHTML = MAP_ICON;
  button.append(el("span", "map-button__label", TEXTS.dungeon.mapButton));
  button.addEventListener("click", () => openDungeonMap(run, (nodeId) => {
    const result = travelTo(run, nodeId);
    if (!result.ok) return;
    if (result.event) {
      startEvent(run);
      showScreen("event");
      showTooltip(TEXTS.dungeon.ambushed);
      return;
    }
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

// Входит в комнату за туннелем. В пройденной и в пустом тупике ничего не случается: герой просто стоит там.
// Только лавка открывается и в пройденной комнате: в неё возвращаются за картой подземелья
function enterTunnel(run, nodeId) {
  const cleared = isNodeCleared(run, nodeId);
  const chill = getStepCost(run, nodeId);
  if (!enterNode(run, nodeId)) return;
  notifyTutorial("nodeEntered");
  showRoom(run, cleared);
  // Ледяная вода: подсказку показываем, когда новая комната уже на экране
  if (chill > 0) showTooltip(TEXTS.dungeon.coldWater(chill));
}

// Показывает, что в комнате: бой, событие, отдых и так далее. В пройденной ничего не случается заново
function showRoom(run, cleared) {
  if (getCurrentNode(run)?.type === "shop") {
    showScreen("shop");
    return;
  }
  // В начальной комнате узла нет, но она всегда пройдена: тип не нужен
  const type = cleared ? null : getCurrentNode(run).type;
  // На отдыхе и в комнате сохранения светлячки снова собираются в банку
  if (type === "rest" || type === "save") rechargeFireflies(run);
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
  } else {
    startNodeCombat();
  }
}
