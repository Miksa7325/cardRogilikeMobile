// Подземелье от первого лица: герой стоит в комнате или коридоре и выбирает, куда идти. Туннели вверх, от одного
// до трёх, — на дальней стене, спуски в комнаты этажом ниже — люки в полу. Что за новым проходом, не видно.
// Карта акта открывается отдельной кнопкой.
import { TEXTS } from "../../data/texts.ru.js";
import { startEvent } from "../../engine/events.js";
import { countReadyQuests, getLockedContent, mergeSeen } from "../../engine/meta.js";
import {
  canGoBack, canReturnToCity, createRun, enterNode, getAvailableNodeIds, getCurrentNode, getLowerNodeIds, getPreviousNodeId,
  goBack, isNodeCleared, openChest, travelTo,
} from "../../engine/run.js";
import { createShop } from "../../engine/shop.js";
import { loadMeta, saveMeta, saveRun } from "../../save.js";
import { state } from "../../state.js";
import { NODE_ICONS, openDungeonMap } from "../components/dungeonMap.js";
import { createRunBar } from "../components/runBar.js";
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

// Стрелка разворота для кнопки «Назад»
const BACK_ICON = `<svg class="back-button__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4 4 9l5 5M4 9h9.5a6 6 0 0 1 0 12H10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Три стрелки на полу коридора, направленные к игроку: туда, откуда он пришёл
const FLOOR_ARROWS = `<svg class="corridor__back-arrows" viewBox="0 0 60 36" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="10,4 30,12 50,4"/><polyline points="10,14 30,22 50,14"/><polyline points="10,24 30,32 50,24"/></g></svg>`;

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
  // Комнату, откуда герой пришёл, ведёт «Назад»: в туннелях и спусках её не повторяем.
  // Проходы слева направо в том же порядке, что узлы на карте
  const previous = getPreviousNodeId(run);
  const tunnels = getAvailableNodeIds(run).filter((id) => id !== previous).map((id) => run.map.nodes[id]).sort((a, b) => a.column - b.column);
  const descents = getLowerNodeIds(run).filter((id) => id !== previous).map((id) => (id === null ? START_ROOM : run.map.nodes[id]))
    .sort((a, b) => a.column - b.column);

  // Пока герой идёт, второй выбор не принимаем
  let walking = false;
  const move = (start) => {
    if (walking) return;
    walking = true;
    start();
  };
  const choose = (index) => move(() => walkInto(corridor, index, tunnels.length, () => enterTunnel(run, tunnels[index].id)));
  const chooseDown = (index) => move(() => walkDown(corridor, index, descents.length, () => enterTunnel(run, descents[index].id)));
  const back = canGoBack(run)
    ? () => move(() => walkBack(corridor, () => {
      goBack(run);
      showScreen("dungeon");
    }))
    : null;
  const corridor = createCorridor(run, { tunnels, descents, choose, chooseDown, back });

  const heading = el("div", "dungeon__place");
  heading.append(el("h1", "dungeon__title", place.title), el("p", "dungeon__hint", describeWay(place, tunnels.length, descents.length)));

  screen.append(createRunBar(run, { allSaved: true }), heading, corridor, createTunnelButtons(run, tunnels, choose, back));
  if (descents.length > 0) screen.append(createDescentButtons(run, descents, chooseDown));
  screen.append(createLinks(run, meta));
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

// Начальная комната как место, куда можно спуститься из первого ряда
const START_ROOM = { id: null, type: "start", column: 0 };

// Коридор в перспективе: стены, пол и потолок — грани коробки, на дальней стене входы в туннели, в полу люки вниз.
// В комнате коробка короче и шире на вид, а сверху падает свет. В тупике на стене нет ни одного входа
function createCorridor(run, { tunnels, descents, choose, chooseDown, back: onBack }) {
  const corridor = el("div", "corridor");
  corridor.dataset.act = String(run.act);
  if (describePlace(run).room) corridor.classList.add("corridor--room");

  const end = el("div", "corridor__end");
  tunnels.forEach((node, index) => end.append(createTunnel(run, node, index, tunnels.length, choose)));
  const floor = el("div", "corridor__floor");
  descents.forEach((node, index) => floor.append(createHatch(run, node, index, descents.length, chooseDown)));

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
  // Назад — туда, откуда герой пришёл: за спиной, поэтому на полу у самого края светятся стрелки к игроку
  if (onBack) {
    const back = el("button", "corridor__back");
    back.type = "button";
    back.setAttribute("aria-label", TEXTS.dungeon.back);
    back.innerHTML = FLOOR_ARROWS;
    back.append(el("span", "corridor__back-label", TEXTS.dungeon.back));
    back.addEventListener("click", onBack);
    corridor.append(back);
  }
  return corridor;
}

// Середина туннеля на дальней стене, в процентах её ширины: входы стоят равномерно
function tunnelPosition(index, count) {
  return ((index + 0.5) / count) * 100;
}

// Что за новым туннелем, не видно: знак висит только над пройденным, с галочкой — там уже пусто
function createTunnel(run, node, index, count, onChoose) {
  const tunnel = el("button", "tunnel");
  tunnel.type = "button";
  tunnel.style.left = `${tunnelPosition(index, count)}%`;
  tunnel.setAttribute("aria-label", describeTunnel(run, node, index, count));
  if (isNodeCleared(run, node.id)) {
    tunnel.classList.add("tunnel--cleared");
    tunnel.append(el("span", "tunnel__sign", NODE_ICONS[node.type]));
  }
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

// Герой разворачивается и уходит назад: коридор отдаляется и темнеет
function walkBack(corridor, onArrive) {
  corridor.classList.add("corridor--retreating");
  setTimeout(() => {
    if (corridor.isConnected) onArrive();
  }, animationMs(WALK_ANIMATIONS));
}

// Люк в полу со ступенями вниз. Как и у туннелей, знак есть только у пройденного: туда уже спускался
function createHatch(run, node, index, count, onChoose) {
  const hatch = el("button", "hatch");
  hatch.type = "button";
  hatch.style.left = `${tunnelPosition(index, count)}%`;
  hatch.setAttribute("aria-label", describeTunnel(run, node, index, count, TEXTS.dungeon.downDirections));
  if (isNodeCleared(run, node.id)) {
    hatch.classList.add("hatch--cleared");
    hatch.append(el("span", "hatch__sign", NODE_ICONS[node.type]));
  }
  hatch.addEventListener("click", () => onChoose(index));
  return hatch;
}

// Герой спускается в люк: коридор уходит вверх и надвигается, всё темнеет
function walkDown(corridor, index, count, onArrive) {
  corridor.style.setProperty("--walk-x", `${50 - tunnelPosition(index, count)}%`);
  corridor.classList.add("corridor--descending");
  corridor.querySelectorAll(".hatch")[index].classList.add("hatch--chosen");
  setTimeout(() => {
    if (corridor.isConnected) onArrive();
  }, animationMs(WALK_ANIMATIONS));
}

// Новый проход называем по направлению, пройденный — по тому, что в нём было
function describeTunnel(run, node, index, count, directions = TEXTS.dungeon.directions) {
  if (isNodeCleared(run, node.id)) return TEXTS.dungeon.cleared(`${NODE_ICONS[node.type]} ${TEXTS.dungeon.nodes[node.type]}`);
  return directions[count]?.[index] ?? TEXTS.dungeon.tunnel(index + 1);
}

// Те же туннели кнопками под коридором. Первой стоит дорога назад: каменная табличка со стрелкой разворота
function createTunnelButtons(run, tunnels, choose, back) {
  const row = el("div", "dungeon__tunnels");
  if (back) {
    const button = el("button", "back-button");
    button.type = "button";
    button.innerHTML = BACK_ICON;
    button.append(el("span", "back-button__label", TEXTS.dungeon.back));
    button.addEventListener("click", back);
    row.append(button);
  }
  tunnels.forEach((node, index) => {
    const button = el("button", "button button--secondary", describeTunnel(run, node, index, tunnels.length));
    button.type = "button";
    button.addEventListener("click", () => choose(index));
    row.append(button);
  });
  return row;
}

// Спуски вниз — отдельным рядом под туннелями
function createDescentButtons(run, descents, chooseDown) {
  const row = el("div", "dungeon__tunnels dungeon__tunnels--down");
  descents.forEach((node, index) => {
    const label = describeTunnel(run, node, index, descents.length, TEXTS.dungeon.downDirections);
    const button = el("button", "button button--secondary", isNodeCleared(run, node.id) ? TEXTS.dungeon.below(label) : label);
    button.type = "button";
    button.addEventListener("click", () => chooseDown(index));
    row.append(button);
  });
  return row;
}

function createLink(text, onTap) {
  const button = el("button", "map__stats", text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

function createLinks(run, meta) {
  const links = el("div", "map__links");
  links.append(
    createLink(TEXTS.dungeon.mapButton, () => openDungeonMap(run, (nodeId) => {
      if (!travelTo(run, nodeId)) return;
      showScreen("dungeon");
      showTooltip(TEXTS.dungeon.traveled);
    })),
    createLink(TEXTS.stats.button, () => openRunStats(run)),
  );
  if (canReturnToCity(run)) links.append(createCityButton(meta));
  return links;
}

// Подняться в город можно только из комнаты сохранения: там строят дома и забирают награды за задания.
// Если награды ждут, кнопка подсвечена
function createCityButton(meta) {
  const ready = countReadyQuests(meta);
  const button = createLink(ready > 0 ? TEXTS.city.buttonReady(ready) : TEXTS.city.button, () => openCity("gate"));
  if (ready > 0) button.classList.add("map__stats--attention");
  return button;
}

// Входит в комнату за туннелем. В пройденной и в пустом тупике ничего не случается: герой просто стоит там
function enterTunnel(run, nodeId) {
  const cleared = isNodeCleared(run, nodeId);
  if (!enterNode(run, nodeId)) return;
  notifyTutorial("nodeEntered");

  const type = getCurrentNode(run).type;
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
