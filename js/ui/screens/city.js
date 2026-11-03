// Город: карта с видом сверху, по которой ходит герой забега. Подсвеченные дома можно открыть,
// у фонтана стоит старейшина с заданиями. Остальное нарисовано на карте как декор.
import { BUILDINGS } from "../../data/buildings.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { buyBuilding, countReadyQuests, isHeroUnlocked } from "../../engine/meta.js";
import { loadMeta, saveMeta } from "../../save.js";
import { state } from "../../state.js";
import { ELDER_ART, heroSprite } from "../art.js";
import { playSound } from "../audio.js";
import { BUILDING_ART } from "../cardArt.js";
import { shakeCard } from "../components/card.js";
import { openQuestDialog } from "../components/questDialog.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

// Размеры в пикселях карты: положение на экране считаем в процентах от неё
const MAP_WIDTH = 360;
const MAP_HEIGHT = 780;
const BUILDING_WIDTH = 88;
const BUILDING_HEIGHT = 76;
const HERO_WIDTH = 30;
const ELDER_WIDTH = 26;

const HERO_SPEED = 120; // пикселей карты в секунду
const ARRIVE_DISTANCE = 2; // ближе этого герой уже дошёл до точки
const TALK_DISTANCE = 30; // так близко ко входу или старейшине можно войти или заговорить
const MAX_FRAME_S = 0.05; // после долгой паузы герой не должен перепрыгнуть через стену
const CAMERA_SPEED = 6; // как быстро камера догоняет героя
const CELL = 6; // шаг сетки для поиска пути, пикселей карты
const COLUMNS = MAP_WIDTH / CELL;
const ROWS = MAP_HEIGHT / CELL;
const LINE_STEP = 2; // через столько пикселей проверяем, свободна ли прямая

const START = { x: 180, y: 750 }; // герой приходит в город по южной дороге из подземелья
const ELDER = { x: 236, y: 420 }; // старейшина стоит у фонтана; это точка его ног

// Куда нельзя зайти: дома, колодец и лоток, нарисованные на карте, и фонтан. x и y — левый верхний угол
const DECOR_OBSTACLES = [
  { x: 0, y: 62, width: 38, height: 45 },
  { x: 45, y: 72, width: 50, height: 45 },
  { x: 100, y: 170, width: 50, height: 45 },
  { x: 215, y: 70, width: 50, height: 45 },
  { x: 272, y: 62, width: 52, height: 45 },
  { x: 102, y: 322, width: 48, height: 30 },
  { x: 210, y: 320, width: 52, height: 46 },
  { x: 162, y: 390, width: 36, height: 36 },
  { x: 116, y: 478, width: 20, height: 24 },
  { x: 211, y: 464, width: 51, height: 46 },
  { x: 0, y: 584, width: 42, height: 46 },
  { x: 47, y: 590, width: 50, height: 45 },
  { x: 250, y: 590, width: 52, height: 45 },
  { x: 310, y: 584, width: 50, height: 46 },
];

// Стрелки и WASD: куда шагает герой
const MOVE_KEYS = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};
const ACTION_KEYS = ["Enter", "Space", "KeyE"];

// Где стоит герой. Живёт между перерисовками: после покупки дома или награды герой остаётся на месте
let heroPosition = { ...START };

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

function createBuildingArt(building) {
  const art = el("div", "building__art");
  art.innerHTML = `<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="${BUILDING_ART[building.id]}"/></svg>`;
  return art;
}

function percent(value, total) {
  return `${(value / total) * 100}%`;
}

// Вход в город из забега: герой появляется на южной дороге
export function openCity() {
  heroPosition = { ...START };
  showScreen("city");
}

export function renderCityScreen(root) {
  const meta = loadMeta();
  const screen = el("main", "city");

  // Места, к которым можно подойти: дома и старейшина
  const places = [...Object.values(BUILDINGS).map((building) => createBuildingPlace(meta, building)), createElderPlace(meta)];
  const hero = createHero();
  const map = el("div", "city__map");
  map.append(...places.map((place) => place.element), hero);

  const header = el("div", "city__header");
  header.append(
    el("h1", "city__title", TEXTS.city.title),
    el("p", "city__balance", TEXTS.city.balance(meta.crowns)),
    el("p", "city__hint", TEXTS.city.hint),
  );
  const prompt = el("div", "city__prompt");
  const actions = el("div", "button-row city__actions");
  actions.append(createButton(TEXTS.city.back, "button--secondary", () => showScreen("map")));
  screen.append(map, header, prompt, actions);
  root.append(screen);

  const walker = startWalking({ screen, map, hero, header, prompt, actions, places });
  for (const place of places) place.element.addEventListener("click", () => walker.walkTo(place));
}

function createHero() {
  const hero = el("div", "city-hero");
  hero.style.width = percent(HERO_WIDTH, MAP_WIDTH);
  const image = el("img", "city-hero__sprite");
  image.src = heroSprite(state.run?.heroId ?? "warrior");
  image.alt = "";
  image.draggable = false;
  hero.append(image);
  return hero;
}

function createBuildingPlace(meta, building) {
  return {
    element: createBuildingTile(meta, building),
    action: TEXTS.city.enter(building.name),
    // Вход — под серединой дома. Непроходима только нижняя часть дома: за крышу герой заходит, и она его заслоняет
    spot: { x: building.x + BUILDING_WIDTH / 2, y: building.y + BUILDING_HEIGHT + 6 },
    obstacle: { x: building.x + 6, y: building.y + 30, width: BUILDING_WIDTH - 12, height: BUILDING_HEIGHT - 34 },
    open: () => openBuilding(building),
  };
}

function createBuildingTile(meta, building) {
  const built = meta.buildings.includes(building.id);
  const tile = el("button", "building");
  tile.type = "button";
  tile.classList.add(built ? "building--built" : "building--locked");
  if (!built && meta.crowns >= building.price) tile.classList.add("building--affordable");
  tile.style.left = percent(building.x, MAP_WIDTH);
  tile.style.top = percent(building.y, MAP_HEIGHT);
  tile.style.width = percent(BUILDING_WIDTH, MAP_WIDTH);
  tile.style.zIndex = building.y + BUILDING_HEIGHT;

  // Пока здание не построено, на его месте стройплощадка
  const image = el("img", "building__sprite");
  image.src = `assets/images/city/${built ? building.id : "plot"}.png`;
  image.alt = "";
  image.draggable = false;
  const label = el("span", "building__label", building.name);
  if (!built) label.append(el("span", "building__price", TEXTS.city.locked(building.price)));
  tile.append(image, label);
  return tile;
}

// Старейшина. Восклицательный знак над головой — есть награды, которые можно забрать
function createElderPlace(meta) {
  const elder = el("button", "city-npc");
  elder.type = "button";
  elder.style.left = percent(ELDER.x, MAP_WIDTH);
  elder.style.top = percent(ELDER.y, MAP_HEIGHT);
  elder.style.width = percent(ELDER_WIDTH, MAP_WIDTH);
  elder.style.zIndex = ELDER.y;
  const art = el("div", "city-npc__art");
  art.innerHTML = ELDER_ART;
  elder.append(art, el("span", "building__label", TEXTS.quests.elder));
  if (countReadyQuests(meta) > 0) elder.append(el("span", "city-npc__marker", "!"));

  return {
    element: elder,
    action: TEXTS.quests.talk,
    spot: { x: ELDER.x, y: ELDER.y + 14 },
    obstacle: { x: ELDER.x - 8, y: ELDER.y - 8, width: 16, height: 10 },
    open: openElder,
  };
}

function openElder() {
  openQuestDialog(() => {
    showScreen("city");
    openElder();
  });
}

function isDialogOpen() {
  return document.querySelector(".card-preview") !== null;
}

function isInside(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cellCenter(cell) {
  return { x: (cell % COLUMNS) * CELL + CELL / 2, y: Math.floor(cell / COLUMNS) * CELL + CELL / 2 };
}

function cellOf(point) {
  const column = clamp(Math.floor(point.x / CELL), 0, COLUMNS - 1);
  const row = clamp(Math.floor(point.y / CELL), 0, ROWS - 1);
  return row * COLUMNS + column;
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Путь в обход домов: обходим сетку в ширину от героя, а потом выпрямляем ломаную.
// Если до точки не дойти (нажали на крышу), идём к ближайшему месту, куда можно
function findPath(from, to, freeCells, isFree) {
  const start = cellOf(from);
  const finish = cellOf(to);
  const parents = new Int32Array(COLUMNS * ROWS).fill(-1);
  parents[start] = start;
  const queue = [start];
  let best = start;
  let bestDistance = distance(cellCenter(start), to);
  for (let head = 0; head < queue.length && best !== finish; head++) {
    const cell = queue[head];
    const cellDistance = distance(cellCenter(cell), to);
    if (cellDistance < bestDistance) {
      best = cell;
      bestDistance = cellDistance;
    }
    const column = cell % COLUMNS;
    const row = (cell - column) / COLUMNS;
    for (const [dx, dy] of NEIGHBOURS) {
      const nextColumn = column + dx;
      const nextRow = row + dy;
      if (nextColumn < 0 || nextRow < 0 || nextColumn >= COLUMNS || nextRow >= ROWS) continue;
      const next = nextRow * COLUMNS + nextColumn;
      if (parents[next] !== -1 || !freeCells[next]) continue;
      // По диагонали не срезаем угол дома
      if (dx && dy && (!freeCells[row * COLUMNS + nextColumn] || !freeCells[nextRow * COLUMNS + column])) continue;
      parents[next] = cell;
      queue.push(next);
    }
  }

  const points = [];
  for (let cell = best; cell !== start; cell = parents[cell]) points.unshift(cellCenter(cell));
  if (best === finish && isFree(to)) points.splice(-1, 1, to);
  return straightenPath(from, points, isFree);
}

function canWalkStraight(from, to, isFree) {
  const steps = Math.ceil(distance(from, to) / LINE_STEP);
  for (let step = 1; step <= steps; step++) {
    const share = step / steps;
    if (!isFree({ x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share })) return false;
  }
  return true;
}

// Из каждой точки идём сразу к самой дальней, до которой видно по прямой: так герой не петляет по клеткам
function straightenPath(from, points, isFree) {
  const result = [];
  let current = from;
  let index = 0;
  while (index < points.length) {
    let farthest = index;
    for (let candidate = points.length - 1; candidate > index; candidate--) {
      if (canWalkStraight(current, points[candidate], isFree)) {
        farthest = candidate;
        break;
      }
    }
    result.push(points[farthest]);
    current = points[farthest];
    index = farthest + 1;
  }
  return result;
}

// Движение героя. Касание земли ведёт героя туда, а если не отпускать палец, он идёт следом.
// Касание дома или старейшины ведёт ко входу, и там окно открывается само.
// На компьютере можно ходить стрелками или WASD, а Enter, пробел или E — войти
function startWalking({ screen, map, hero, header, prompt, actions, places }) {
  const obstacles = [...DECOR_OBSTACLES, ...places.map((place) => place.obstacle)];
  const isFree = (point) => !obstacles.some((rect) => isInside(point, rect));
  // Герой не выходит за край карты: ноги не ниже нижнего края, голова не выше верхнего
  const keepOnMap = (point) => ({
    x: clamp(point.x, HERO_WIDTH / 2, MAP_WIDTH - HERO_WIDTH / 2),
    y: clamp(point.y, HERO_WIDTH, MAP_HEIGHT - 2),
  });
  const freeCells = Array.from({ length: COLUMNS * ROWS }, (_, cell) => {
    const center = cellCenter(cell);
    const kept = keepOnMap(center);
    return isFree(center) && kept.x === center.x && kept.y === center.y;
  });

  const position = heroPosition;
  const keys = new Set();
  let path = []; // точки, через которые идёт герой
  let goal = null; // дом или старейшина, которого откроем, когда герой дойдёт
  let dragging = false;
  let dragCell = null; // клетка под пальцем: путь пересчитываем, только когда она меняется
  let nearest = null; // к чему герой стоит вплотную: для него показываем кнопку
  let cameraY = null;
  let lastTime = performance.now();

  const toMapPoint = (event) => {
    const rect = map.getBoundingClientRect();
    return keepOnMap({
      x: ((event.clientX - rect.left) / rect.width) * MAP_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * MAP_HEIGHT,
    });
  };
  const walkToPoint = (point) => {
    path = findPath(position, point, freeCells, isFree);
    dragCell = cellOf(point);
  };

  screen.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button") || isDialogOpen()) return;
    dragging = true;
    goal = null;
    walkToPoint(toMapPoint(event));
  });
  screen.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const point = toMapPoint(event);
    if (cellOf(point) !== dragCell) walkToPoint(point);
  });
  for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
    screen.addEventListener(type, () => {
      dragging = false;
    });
  }

  const onKeyDown = (event) => {
    if (isDialogOpen()) return;
    if (MOVE_KEYS[event.code]) {
      event.preventDefault();
      keys.add(event.code);
      path = [];
      goal = null;
    } else if (ACTION_KEYS.includes(event.code) && nearest) {
      event.preventDefault();
      nearest.open();
    }
  };
  const onKeyUp = (event) => keys.delete(event.code);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  // Герой дошёл или упёрся: если шёл к дому и стоит рядом со входом, открываем его
  const arrive = () => {
    if (goal && distance(position, goal.spot) <= TALK_DISTANCE) goal.open();
    path = [];
    goal = null;
  };

  // Куда и на сколько шагнуть за этот кадр; null — стоять
  const getStep = (length) => {
    if (keys.size > 0) {
      const sum = { x: 0, y: 0 };
      for (const code of keys) {
        sum.x += MOVE_KEYS[code].x;
        sum.y += MOVE_KEYS[code].y;
      }
      const size = Math.hypot(sum.x, sum.y);
      return size > 0 ? { x: (sum.x / size) * length, y: (sum.y / size) * length } : null;
    }
    if (path.length === 0) return null;
    const target = path[0];
    const left = distance(position, target);
    if (left <= ARRIVE_DISTANCE) {
      path.shift();
      if (path.length === 0) arrive();
      return null;
    }
    const size = Math.min(length, left);
    return { x: ((target.x - position.x) / left) * size, y: ((target.y - position.y) / left) * size };
  };

  // Шагаем по каждой оси отдельно: так герой скользит вдоль стены, а не застревает в ней
  const move = (step) => {
    const before = { ...position };
    const nextX = keepOnMap({ x: position.x + step.x, y: position.y });
    if (isFree(nextX)) position.x = nextX.x;
    const nextY = keepOnMap({ x: position.x, y: position.y + step.y });
    if (isFree(nextY)) position.y = nextY.y;
    if (step.x < -0.01) hero.classList.add("city-hero--left");
    if (step.x > 0.01) hero.classList.remove("city-hero--left");
    return distance(before, position) > 0.01;
  };

  const showPrompt = (place) => {
    if (place === nearest) return;
    nearest = place;
    prompt.replaceChildren();
    if (place) prompt.append(createButton(place.action, "button--attention", () => place.open()));
  };

  // Камера держит героя посередине между шапкой и кнопками, но не уходит за край карты
  const updateCamera = (seconds) => {
    const top = header.getBoundingClientRect().bottom;
    const bottom = actions.getBoundingClientRect().top;
    const scale = map.offsetWidth / MAP_WIDTH;
    const lowest = bottom - map.offsetHeight;
    let wanted = (top + bottom) / 2 - position.y * scale;
    wanted = lowest > top ? (lowest + top) / 2 : clamp(wanted, lowest, top);
    cameraY = cameraY === null ? wanted : cameraY + (wanted - cameraY) * Math.min(1, seconds * CAMERA_SPEED);
    map.style.transform = `translate(-50%, ${cameraY}px)`;
  };

  const frame = (now) => {
    // Экран сменился: перестаём слушать клавиши, иначе герой ходил бы на чужом экране
    if (!screen.isConnected) {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      return;
    }
    const seconds = Math.min((now - lastTime) / 1000, MAX_FRAME_S);
    lastTime = now;

    let walking = false;
    if (isDialogOpen()) {
      keys.clear();
      dragging = false;
    } else {
      const step = getStep(HERO_SPEED * seconds);
      if (step) {
        walking = move(step);
        // Упёрся в стену по пути к точке: дальше не пройти
        if (!walking && keys.size === 0 && !dragging) arrive();
      }
    }

    hero.classList.toggle("city-hero--walking", walking);
    hero.style.left = percent(position.x, MAP_WIDTH);
    hero.style.top = percent(position.y, MAP_HEIGHT);
    hero.style.zIndex = Math.round(position.y);
    showPrompt(places.find((place) => distance(position, place.spot) <= TALK_DISTANCE) ?? null);
    updateCamera(seconds);
    requestAnimationFrame(frame);
  };
  frame(lastTime);

  return {
    walkTo(place) {
      if (isDialogOpen()) return;
      keys.clear();
      walkToPoint(place.spot);
      goal = place;
    },
  };
}

// Что здание добавляет в забеги: количество без названий, чтобы оставить сюрприз
function describeUnlocks(building) {
  const { events = [], potions = [], relics = [] } = building.unlocks;
  const parts = [];
  if (events.length) parts.push(TEXTS.city.events(events.length));
  if (potions.length) parts.push(TEXTS.city.potions(potions.length));
  if (relics.length) parts.push(TEXTS.city.relics(relics.length));
  return parts.join(", ");
}

// Окно здания поверх города
function openBuilding(building) {
  const meta = loadMeta();
  const built = meta.buildings.includes(building.id);
  const overlay = el("div", "card-preview");
  const details = el("div", "building-details");
  details.append(
    createBuildingArt(building),
    el("h2", "event__title", building.name),
    el("p", "building-details__text", building.description),
  );

  const unlocks = describeUnlocks(building);
  if (unlocks) details.append(el("p", "building-details__note", `${built ? TEXTS.city.opened : TEXTS.city.opens} ${unlocks}`));
  if (building.id === "home") appendHomeDetails(details, meta);

  if (!built) {
    const missing = building.price - meta.crowns;
    const buy = createButton(missing > 0 ? TEXTS.city.notEnough(missing) : TEXTS.city.buy(building.price), "button--large", () => onBuy(building, buy));
    details.append(buy);
  }
  details.append(createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));

  overlay.append(details);
  document.getElementById("app").append(overlay);
}

function onBuy(building, button) {
  const meta = loadMeta();
  const result = buyBuilding(meta, building.id);
  if (!result.ok) {
    shakeCard(button);
    return;
  }
  saveMeta(meta);
  playSound("buy");
  showScreen("city");
  showTooltip(TEXTS.city.nextRun);
}

// Внутри дома — герои и итоги всех забегов
function appendHomeDetails(details, meta) {
  details.append(
    el("p", "building-details__note", TEXTS.city.homeTitle),
    el("p", "building-details__text", TEXTS.city.homeTotals(meta.runsPlayed, meta.wins, meta.bestFloor, meta.totals.kills ?? 0)),
  );
  for (const hero of Object.values(HEROES)) {
    const unlocked = isHeroUnlocked(meta, hero.id);
    const stats = meta.heroStats[hero.id] ?? { runs: 0, wins: 0 };
    const row = el("div", "building-details__hero");
    if (!unlocked) row.classList.add("building-details__hero--locked");

    const image = el("img", "");
    image.src = heroSprite(hero.id);
    image.alt = "";
    const text = el("div", "");
    text.append(
      el("div", "building__name", hero.name),
      el("div", "building-details__note", unlocked ? TEXTS.city.heroRow(stats.runs, stats.wins) : TEXTS.city.heroLocked),
    );
    row.append(image, text);
    details.append(row);
  }
}
