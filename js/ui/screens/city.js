// Город: с него начинается игра. Карта с видом сверху, по которой ходит герой. Подсвеченные дома можно открыть:
// в каждом построенном доме работает служба (ui/screens/cityServices.js), в гильдии меняют эссенции на золото,
// у торговца покупают припасы. У фонтана стоит старейшина с заданиями, в конце южной дороги — вход в подземелье.
// Город растёт в стороны: когда построено достаточно домов, по бокам старого города вырастают слободы.
import { CONFIG } from "../../config.js";
import { BUILDINGS } from "../../data/buildings.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import {
  bankLoot, buyBuilding, countReadyQuests, exchangeEssences, getAliveHeroIds, getHeroEquipment, getStartableActs, getTraderGoods,
  isHeroDead, payForReturn, selectHero,
} from "../../engine/meta.js";
import { canReturnToCity, getCurrentFloor, getReturnPrice, hasHealedHere, healInCity } from "../../engine/run.js";
import { isBuilt } from "../../engine/town.js";
import { loadMeta, loadRun, saveMeta, saveRun } from "../../save.js";
import { state } from "../../state.js";
import { applyHeroLook, buildingArt, ELDER_ART, GATE_ART, heroSprite } from "../art.js";
import { playSound } from "../audio.js";
import { BUILDING_ART } from "../cardArt.js";
import { shakeCard } from "../components/card.js";
import { openQuestDialog } from "../components/questDialog.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { appendService, createGood } from "./cityServices.js";
import { continueRun, startNewRun } from "./dungeon.js";

// Размеры в пикселях карты: положение на экране считаем в процентах от неё
const CENTER_WIDTH = 360; // старый город на рисунке map.png
const MAP_HEIGHT = 780;
const DISTRICT_WIDTH = 260; // слобода сбоку от старого города
// Дороги старого города уходят в слободы на тех же высотах: от и до
const ROADS = [[243, 283], [388, 428], [532, 572]];
const BUILDING_WIDTH = 88;
const BUILDING_HEIGHT = 76;
const HERO_WIDTH = 30;
const ELDER_WIDTH = 26;
const GATE_WIDTH = 44;

const HERO_SPEED = 120; // пикселей карты в секунду
const ARRIVE_DISTANCE = 2; // ближе этого герой уже дошёл до точки
const TALK_DISTANCE = 30; // так близко ко входу или старейшине можно войти или заговорить
const MAX_FRAME_S = 0.05; // после долгой паузы герой не должен перепрыгнуть через стену
const CAMERA_SPEED = 6; // как быстро камера догоняет героя
const CELL = 6; // шаг сетки для поиска пути, пикселей карты
const ROWS = MAP_HEIGHT / CELL;
// Как устроен город: западная слобода, старый город и восточная слобода. Слободы стоят с самого начала.
// Все точки старого города (старейшина, вход, декор) хранятся в его координатах и сдвигаются на centerX
const layout = {
  width: DISTRICT_WIDTH + CENTER_WIDTH + DISTRICT_WIDTH,
  centerX: DISTRICT_WIDTH,
  eastX: DISTRICT_WIDTH + CENTER_WIDTH,
};
const gridColumns = Math.ceil(layout.width / CELL); // столбцов сетки поиска пути

// Точка или прямоугольник старого города в координатах всего города
function inCity(point) {
  return { ...point, x: point.x + layout.centerX };
}

// Левый верхний угол здания в координатах всего города: в старом городе или в своей слободе
function buildingOrigin(building) {
  if (building.district === "east") return { x: layout.eastX + building.x, y: building.y };
  if (building.district === "west") return { x: building.x, y: building.y };
  return inCity(building);
}
const LINE_STEP = 2; // через столько пикселей проверяем, свободна ли прямая

const ELDER = { x: 236, y: 420 }; // старейшина стоит у фонтана; это точка его ног
const GATE = { x: 180, y: 778 }; // вход в подземелье в конце южной дороги; это середина его нижнего края
const GATE_SPOT = { x: 180, y: 734 }; // где стоит герой у входа в подземелье

// Гильдия и торговец живут в домах, нарисованных на карте у фонтана: подсвечиваем сами дома. x и y — левый верхний угол
const GUILD = { x: 210, y: 320, width: 52, height: 46 };
const TRADER = { x: 211, y: 464, width: 51, height: 46 };

// Куда нельзя зайти: дома, колодец и лоток, нарисованные на карте, и фонтан. x и y — левый верхний угол
const DECOR_OBSTACLES = [
  { x: 0, y: 62, width: 38, height: 45 },
  { x: 45, y: 72, width: 50, height: 45 },
  { x: 100, y: 170, width: 50, height: 45 },
  { x: 215, y: 70, width: 50, height: 45 },
  { x: 272, y: 62, width: 52, height: 45 },
  { x: 102, y: 322, width: 48, height: 30 },
  { x: 162, y: 390, width: 36, height: 36 },
  { x: 116, y: 478, width: 20, height: 24 },
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
let heroPosition = inCity(GATE_SPOT);

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

// Значок здания в его окне: у старых зданий — гравюра, у новых — их пиксельный рисунок
function createBuildingArt(building) {
  const art = el("div", "building__art");
  art.innerHTML = BUILDING_ART[building.id]
    ? `<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="${BUILDING_ART[building.id]}"/></svg>`
    : buildingArt(building.art);
  if (!BUILDING_ART[building.id]) art.classList.add("building__art--pixel");
  return art;
}

function percent(value, total) {
  return `${(value / total) * 100}%`;
}

// Вход под серединой дома
function buildingSpot(building) {
  const origin = buildingOrigin(building);
  return { x: origin.x + BUILDING_WIDTH / 2, y: origin.y + BUILDING_HEIGHT + 6 };
}

// Открывает город. entrance — где появится герой: "gate" — у входа в подземелье, когда он поднялся из забега,
// или id здания — у его двери: "home", когда игра только началась, "arena" — после боя на арене
export function openCity(entrance) {
  heroPosition = BUILDINGS[entrance] ? buildingSpot(BUILDINGS[entrance]) : inCity(GATE_SPOT);
  // Герой забега, поднявшийся в город, сдаёт добычу в казну и отдыхает: здоровье восстанавливается полностью.
  // Лечит каждая комната только раз: иначе можно было бы возвращаться к ней и лечиться снова
  const run = loadRun();
  const news = [];
  if (run !== null && canReturnToCity(run)) {
    const meta = loadMeta();
    const loot = bankLoot(meta, run);
    if (loot.gold > 0 || loot.essences > 0) news.push(TEXTS.city.banked(loot.gold, loot.essences));
    const restedBefore = run.hp < run.maxHp && hasHealedHere(run);
    const healed = healInCity(run);
    if (healed > 0) news.push(TEXTS.city.healed(healed));
    else if (restedBefore) news.push(TEXTS.city.restedBefore);
    state.run = run;
    if (!saveRun(run) || !saveMeta(meta)) news.push(TEXTS.saveFailed);
  }
  showScreen("city");
  if (news.length > 0) showTooltip(news.join(". "));
}

export function renderCityScreen(root) {
  const meta = loadMeta();
  const screen = el("main", "city");

  // Места, к которым можно подойти: дома, гильдия, торговец, старейшина и вход в подземелье
  const places = [
    ...Object.values(BUILDINGS).map((building) => createBuildingPlace(meta, building)),
    createServicePlace(inCity(GUILD), TEXTS.guild.title, openGuild),
    createServicePlace(inCity(TRADER), TEXTS.trader.title, openTrader),
    createElderPlace(meta),
    createGatePlace(),
  ];
  const hero = createHero(loadRun()?.heroId ?? meta.selectedHero, meta);
  const map = el("div", "city__map");
  // Карта шире экрана, когда выросли слободы: её ширина — доля от ширины старого города
  map.style.width = `calc(min(100vw, calc(100dvh * 9 / 16)) * ${layout.width / CENTER_WIDTH})`;
  map.style.aspectRatio = `${layout.width} / ${MAP_HEIGHT}`;
  map.append(...createGround(), ...places.map((place) => place.element), hero);

  const header = el("div", "city__header");
  header.append(
    el("h1", "city__title", TEXTS.city.title),
    el("p", "city__balance", TEXTS.city.balance(meta.gold, meta.essences)),
    el("p", "city__hint", TEXTS.city.hint),
  );
  const actions = el("div", "button-row city__actions");
  actions.append(createButton(TEXTS.mainMenu, "button--secondary", () => showScreen("start")));
  screen.append(map, header, actions);
  root.append(screen);

  const walker = startWalking({ screen, map, hero, header, actions, places });
  for (const place of places) place.element.addEventListener("click", () => walker.walkTo(place));
}

// Земля города: рисунок старого города посередине и слободы по бокам с продолжением его дорог
function createGround() {
  const parts = [];
  const center = el("div", "city__center");
  center.style.left = percent(layout.centerX, layout.width);
  center.style.width = percent(CENTER_WIDTH, layout.width);
  parts.push(center);
  parts.push(createDistrict(0, TEXTS.city.westDistrict), createDistrict(layout.eastX, TEXTS.city.eastDistrict));
  return parts;
}

function createDistrict(x, name) {
  const district = el("div", "city__district");
  district.style.left = percent(x, layout.width);
  district.style.width = percent(DISTRICT_WIDTH, layout.width);
  for (const [top, bottom] of ROADS) {
    const road = el("div", "city__road");
    road.style.top = percent(top, MAP_HEIGHT);
    road.style.height = percent(bottom - top, MAP_HEIGHT);
    district.append(road);
  }
  district.append(el("div", "city__district-name", name));
  return district;
}

// По городу ходит герой сохранённого забега, а если забега нет — тот, кого выбрали в доме героев. В своей окраске
function createHero(heroId, meta) {
  const hero = el("div", "city-hero");
  hero.style.width = percent(HERO_WIDTH, layout.width);
  const image = el("img", "city-hero__sprite");
  image.src = heroSprite(heroId);
  applyHeroLook(image, heroId, meta);
  image.alt = "";
  image.draggable = false;
  hero.append(image);
  return hero;
}

function createBuildingPlace(meta, building) {
  return {
    element: createBuildingTile(meta, building),
    action: TEXTS.city.enter(building.name),
    // Непроходима только нижняя часть дома: за крышу герой заходит, и она его заслоняет
    spot: buildingSpot(building),
    obstacle: { x: buildingOrigin(building).x + 6, y: building.y + 30, width: BUILDING_WIDTH - 12, height: BUILDING_HEIGHT - 34 },
    open: () => openBuilding(building),
  };
}

function createBuildingTile(meta, building) {
  const built = isBuilt(meta, building.id);
  const tile = el("button", "building");
  tile.type = "button";
  tile.classList.add(built ? "building--built" : "building--locked");
  if (!built && meta.gold >= building.price) tile.classList.add("building--affordable");
  tile.style.left = percent(buildingOrigin(building).x, layout.width);
  tile.style.top = percent(building.y, MAP_HEIGHT);
  tile.style.width = percent(BUILDING_WIDTH, layout.width);
  tile.style.zIndex = building.y + BUILDING_HEIGHT;

  const label = el("span", "building__label", building.name);
  if (!built) label.append(el("span", "building__price", TEXTS.city.locked(building.price)));
  tile.append(createBuildingSprite(building, built), label);
  return tile;
}

// Пока здание не построено, на его месте стройплощадка. Новым зданиям без картинки рисуем дом пикселями, с вывеской
function createBuildingSprite(building, built) {
  if (built && building.art) {
    const sprite = el("div", "building__sprite building__sprite--drawn");
    sprite.innerHTML = buildingArt(building.art);
    sprite.append(el("span", "building__sign", building.art.sign));
    return sprite;
  }
  const image = el("img", "building__sprite");
  image.src = `assets/images/city/${built ? building.id : "plot"}.png`;
  image.alt = "";
  image.draggable = false;
  return image;
}

// Старейшина. Восклицательный знак над головой — есть награды, которые можно забрать
function createElderPlace(meta) {
  const at = inCity(ELDER);
  const elder = el("button", "city-npc");
  elder.type = "button";
  elder.style.left = percent(at.x, layout.width);
  elder.style.top = percent(at.y, MAP_HEIGHT);
  elder.style.width = percent(ELDER_WIDTH, layout.width);
  elder.style.zIndex = at.y;
  const art = el("div", "city-npc__art");
  art.innerHTML = ELDER_ART;
  elder.append(art, el("span", "building__label", TEXTS.quests.elder));
  if (countReadyQuests(meta) > 0) elder.append(el("span", "city-npc__marker", "!"));

  return {
    element: elder,
    action: TEXTS.quests.talk,
    spot: { x: at.x, y: at.y + 14 },
    obstacle: { x: at.x - 8, y: at.y - 8, width: 16, height: 10 },
    open: openElder,
  };
}

// Вход в подземелье: каменная арка в конце южной дороги
function createGatePlace() {
  const at = inCity(GATE);
  const gate = el("button", "city-gate");
  gate.type = "button";
  gate.style.left = percent(at.x, layout.width);
  gate.style.top = percent(at.y, MAP_HEIGHT);
  gate.style.width = percent(GATE_WIDTH, layout.width);
  gate.style.zIndex = at.y;
  const art = el("div", "city-gate__art");
  art.innerHTML = GATE_ART;
  gate.append(art, el("span", "building__label", TEXTS.city.gate));

  return {
    element: gate,
    action: TEXTS.city.gateEnter,
    spot: inCity(GATE_SPOT),
    obstacle: { x: at.x - GATE_WIDTH / 2, y: at.y - 34, width: GATE_WIDTH, height: 34 },
    open: openGate,
  };
}

// Окно входа: продолжить сохранённый забег или начать новый с начала любого акта, до которого герой уже доходил.
// Первый акт бесплатно, остальные за золото из казны. Комнаты в начатом акте каждый раз новые
function openGate() {
  const run = loadRun();
  const meta = loadMeta();
  const overlay = el("div", "card-preview");
  const dialog = el("div", "quest-dialog");
  const art = el("div", "building__art");
  art.innerHTML = GATE_ART;
  dialog.append(art, el("h2", "event__title", TEXTS.city.gateTitle), el("p", "quest-dialog__speech", TEXTS.city.gateText));

  if (run) {
    const hero = (HEROES[run.heroId] ?? HEROES.warrior).name;
    dialog.append(el("p", "building-details__note", TEXTS.city.gateRun(hero, TEXTS.floorLabel(run.act, getCurrentFloor(run)))));
    dialog.append(...createContinueChoice(meta, run));
  }
  dialog.append(createBalance(meta));
  // Погибшего героя в подземелье не отправить: нужно выбрать живого в доме героев, а если живых нет — спускаться некому
  if (getAliveHeroIds(meta).length === 0) {
    dialog.append(el("p", "quests__hint", TEXTS.city.allHeroesDead));
  } else if (isHeroDead(meta, meta.selectedHero)) {
    dialog.append(el("p", "quests__hint", TEXTS.city.heroIsDead(HEROES[meta.selectedHero].name)));
  } else {
    const name = HEROES[meta.selectedHero].name;
    dialog.append(el("p", "quests__hint", run ? TEXTS.city.newRunOverRun(name) : TEXTS.city.gateHero(name)));
    const list = el("div", "quest-dialog__list");
    for (const act of getStartableActs(meta)) list.append(createActChoice(meta, act, run !== null));
    dialog.append(list);
  }
  dialog.append(createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));

  overlay.append(dialog);
  document.getElementById("app").append(overlay);
}

// Продолжить забег. Из комнаты сохранения в подземелье пускают за золото из казны, из начальной комнаты акта — даром
function createContinueChoice(meta, run) {
  const price = getReturnPrice(run);
  if (price === 0) return [createButton(TEXTS.city.continueRun, "button--large", () => continueRun(run))];
  const button = createButton(TEXTS.city.returnRun(price), "button--large", () => {
    if (!payForReturn(meta, price)) {
      shakeCard(button);
      showTooltip(TEXTS.trader.notEnoughGold);
      return;
    }
    if (!saveMeta(meta)) showTooltip(TEXTS.saveFailed);
    continueRun(run);
  });
  button.disabled = meta.gold < price;
  return [el("p", "quests__hint", TEXTS.city.returnHint), button];
}

// Начало акта: его название, особенность и цена. Если забег уже идёт, новый его закончит — просим нажать дважды
function createActChoice(meta, act, replacesRun) {
  const row = el("div", "quest");
  row.append(
    el("div", "quest__title", TEXTS.city.actTitle(act.number, act.name)),
    el("div", "quest__description", TEXTS.city.actMechanic(act.mechanic.name, act.mechanic.text)),
  );
  let confirmed = !replacesRun;
  const price = act.startPrice > 0 ? TEXTS.city.actPrice(act.startPrice) : TEXTS.city.actFree;
  const button = createButton(price, "", () => {
    if (!confirmed) {
      confirmed = true;
      button.textContent = TEXTS.confirmNewRun;
      return;
    }
    if (!startNewRun(meta.selectedHero, act.number)) {
      shakeCard(button);
      showTooltip(TEXTS.trader.notEnoughGold);
    }
  });
  button.disabled = meta.gold < act.startPrice;
  const actions = el("div", "quest__row");
  actions.append(button);
  row.append(actions);
  return row;
}

// Дом на карте, где работает гильдия или торговец: его контур светится, над ним подпись
function createServicePlace(rect, name, open) {
  const house = el("button", "city-service");
  house.type = "button";
  house.style.left = percent(rect.x, layout.width);
  house.style.top = percent(rect.y, MAP_HEIGHT);
  house.style.width = percent(rect.width, layout.width);
  house.style.height = percent(rect.height, MAP_HEIGHT);
  house.style.zIndex = rect.y + rect.height;
  house.append(el("span", "building__label", name));
  return {
    element: house,
    action: TEXTS.city.enter(name),
    spot: { x: rect.x + rect.width / 2, y: rect.y + rect.height + 6 },
    obstacle: rect,
    open,
  };
}

// Окно поверх города: значок, название и описание. Возвращает его содержимое, чтобы добавить остальное
function openDialog(icon, title, text) {
  const overlay = el("div", "card-preview");
  const dialog = el("div", "quest-dialog");
  dialog.append(el("div", "service__icon", icon), el("h2", "event__title", title), el("p", "quest-dialog__speech", text));
  overlay.append(dialog);
  document.getElementById("app").append(overlay);
  return { overlay, dialog };
}

function createBalance(meta) {
  return el("p", "quests__balance", TEXTS.city.balance(meta.gold, meta.essences));
}

// Перерисовывает город с новым балансом и снова открывает то же окно
function reopen(openWindow) {
  showScreen("city");
  openWindow();
}

// Гильдия скупает эссенции чудовищ за золото
function openGuild() {
  const meta = loadMeta();
  const { overlay, dialog } = openDialog("⚖️", TEXTS.guild.title, TEXTS.guild.text(CONFIG.city.essencesPerGold));
  const gold = Math.floor(meta.essences / CONFIG.city.essencesPerGold);
  const exchange = createButton(gold > 0 ? TEXTS.guild.exchange(gold * CONFIG.city.essencesPerGold, gold) : TEXTS.guild.notEnough, "button--large", () => {
    exchangeEssences(meta);
    saveMeta(meta);
    playSound("buy");
    reopen(openGuild);
  });
  exchange.disabled = gold === 0;
  dialog.append(createBalance(meta), exchange, createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));
}

// Торговец продаёт карту подземелья и банку светлячков. Если забег идёт, покупка сразу уходит герою,
// иначе он возьмёт её в следующий забег. Зелья продаёт лавка алхимика
function openTrader() {
  const meta = loadMeta();
  const run = loadRun();
  const { overlay, dialog } = openDialog("🛒", TEXTS.trader.title, TEXTS.trader.text);
  dialog.append(createBalance(meta), el("p", "quests__hint", run ? TEXTS.trader.intoRun : TEXTS.trader.intoNextRun));
  const list = el("div", "quest-dialog__list");
  const done = (gear) => {
    if (gear) state.run = gear;
    if (!saveMeta(meta) || (gear && !saveRun(gear))) showTooltip(TEXTS.saveFailed);
    playSound("buy");
    reopen(openTrader);
  };
  for (const good of getTraderGoods()) list.append(createGood(meta, run, good, done));
  dialog.append(list, createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));
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
  return { x: (cell % gridColumns) * CELL + CELL / 2, y: Math.floor(cell / gridColumns) * CELL + CELL / 2 };
}

function cellOf(point) {
  const column = clamp(Math.floor(point.x / CELL), 0, gridColumns - 1);
  const row = clamp(Math.floor(point.y / CELL), 0, ROWS - 1);
  return row * gridColumns + column;
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Путь в обход домов: обходим сетку в ширину от героя, а потом выпрямляем ломаную.
// Если до точки не дойти (нажали на крышу), идём к ближайшему месту, куда можно
function findPath(from, to, freeCells, isFree) {
  const start = cellOf(from);
  const finish = cellOf(to);
  const parents = new Int32Array(gridColumns * ROWS).fill(-1);
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
    const column = cell % gridColumns;
    const row = (cell - column) / gridColumns;
    for (const [dx, dy] of NEIGHBOURS) {
      const nextColumn = column + dx;
      const nextRow = row + dy;
      if (nextColumn < 0 || nextRow < 0 || nextColumn >= gridColumns || nextRow >= ROWS) continue;
      const next = nextRow * gridColumns + nextColumn;
      if (parents[next] !== -1 || !freeCells[next]) continue;
      // По диагонали не срезаем угол дома
      if (dx && dy && (!freeCells[row * gridColumns + nextColumn] || !freeCells[nextRow * gridColumns + column])) continue;
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
function startWalking({ screen, map, hero, header, actions, places }) {
  const obstacles = [...DECOR_OBSTACLES.map(inCity), ...places.map((place) => place.obstacle)];
  const isFree = (point) => !obstacles.some((rect) => isInside(point, rect));
  // Герой не выходит за край карты: ноги не ниже нижнего края, голова не выше верхнего
  const keepOnMap = (point) => ({
    x: clamp(point.x, HERO_WIDTH / 2, layout.width - HERO_WIDTH / 2),
    y: clamp(point.y, HERO_WIDTH, MAP_HEIGHT - 2),
  });
  const freeCells = Array.from({ length: gridColumns * ROWS }, (_, cell) => {
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
  let cameraX = null;
  let cameraY = null;
  let lastTime = performance.now();

  const toMapPoint = (event) => {
    const rect = map.getBoundingClientRect();
    return keepOnMap({
      x: ((event.clientX - rect.left) / rect.width) * layout.width,
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

  // Кнопка «Войти» встаёт в нижний ряд рядом с меню: так она не закрывает карту
  let promptButton = null;
  const showPrompt = (place) => {
    if (place === nearest) return;
    nearest = place;
    promptButton?.remove();
    promptButton = place ? createButton(place.action, "button--attention city__prompt", () => place.open()) : null;
    if (promptButton) actions.prepend(promptButton);
  };

  // Камера держит героя посередине между шапкой и кнопками, а по ширине — посередине экрана.
  // За край карты она не уходит; если карта уже экрана, карта стоит посередине
  const follow = (current, wanted, seconds) => (current === null ? wanted : current + (wanted - current) * Math.min(1, seconds * CAMERA_SPEED));
  const updateCamera = (seconds) => {
    const top = header.getBoundingClientRect().bottom;
    const bottom = actions.getBoundingClientRect().top;
    const scale = map.offsetWidth / layout.width;
    const lowest = bottom - map.offsetHeight;
    let wantedY = (top + bottom) / 2 - position.y * scale;
    wantedY = lowest > top ? (lowest + top) / 2 : clamp(wantedY, lowest, top);
    const viewWidth = screen.clientWidth;
    const leftmost = viewWidth - map.offsetWidth;
    let wantedX = viewWidth / 2 - position.x * scale;
    wantedX = leftmost > 0 ? leftmost / 2 : clamp(wantedX, leftmost, 0);
    cameraX = follow(cameraX, wantedX, seconds);
    cameraY = follow(cameraY, wantedY, seconds);
    map.style.transform = `translate(${cameraX}px, ${cameraY}px)`;
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
    hero.style.left = percent(position.x, layout.width);
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

// Окно здания поверх города: что это за дом и что он добавляет в забеги. Построенный дом показывает свою службу,
// непостроенный — цену. Длинные списки служб прокручиваются внутри окна
function openBuilding(building) {
  const meta = loadMeta();
  const built = isBuilt(meta, building.id);
  const overlay = el("div", "card-preview");
  const dialog = el("div", "quest-dialog building-dialog");
  dialog.append(
    createBuildingArt(building),
    el("h2", "event__title", building.name),
    el("p", "building-details__text", building.description),
  );

  const unlocks = describeUnlocks(building);
  if (unlocks) dialog.append(el("p", "building-details__note", `${built ? TEXTS.city.opened : TEXTS.city.opens} ${unlocks}`));

  if (!built) {
    const missing = building.price - meta.gold;
    const buy = createButton(missing > 0 ? TEXTS.city.notEnough(missing) : TEXTS.city.buy(building.price), "button--large", () => onBuy(building, buy));
    dialog.append(createBalance(meta), buy);
  } else if (building.service === "home") {
    appendHomeDetails(dialog, meta);
  } else {
    dialog.append(createBalance(meta));
    appendService(dialog, building, () => reopen(() => openBuilding(building)));
  }
  dialog.append(createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));

  overlay.append(dialog);
  document.getElementById("app").append(overlay);
}

// Постройка дома
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
  showTooltip(TEXTS.city.built);
}

// Внутри дома — герои и итоги всех забегов. Здесь выбирают, кем спуститься в подземелье.
// У каждого героя своё снаряжение, а погибшие остаются в доме только памятью
function appendHomeDetails(dialog, meta) {
  const details = el("div", "quest-dialog__list");
  dialog.append(
    el("p", "building-details__note", TEXTS.city.homeTitle),
    el("p", "building-details__text", TEXTS.city.homeTotals(meta.runsPlayed, meta.wins, meta.bestFloor, meta.totals.kills ?? 0)),
  );
  const run = loadRun();
  // Герой идущего забега не меняется: выбор будет в силе со следующего
  if (run) dialog.append(el("p", "building-details__note", TEXTS.city.heroNextRun));
  if (getAliveHeroIds(meta).length === 0) dialog.append(el("p", "building-details__note", TEXTS.city.allHeroesDead));
  dialog.append(details);
  for (const hero of Object.values(HEROES)) {
    const stats = meta.heroStats[hero.id] ?? { runs: 0, wins: 0 };
    const dead = isHeroDead(meta, hero.id);
    const selected = hero.id === meta.selectedHero && !dead;
    const row = el("div", "building-details__hero");
    if (selected) row.classList.add("building-details__hero--selected");
    if (dead) row.classList.add("building-details__hero--dead");

    const image = el("img", "");
    image.src = heroSprite(hero.id);
    image.alt = "";
    applyHeroLook(image, hero.id, meta);
    const text = el("div", "building-details__hero-text");
    text.append(
      el("div", "building__name", hero.name),
      el("div", "building-details__note", hero.mechanic.name),
      el("div", "building-details__note", dead ? TEXTS.city.heroDead : describeEquipment(meta, hero, run)),
      el("div", "building-details__note", TEXTS.city.heroRow(stats.runs, stats.wins)),
    );
    const label = dead ? TEXTS.city.heroDeadButton : selected ? TEXTS.city.heroSelected : TEXTS.city.heroChoose;
    const choose = createButton(label, selected || dead ? "" : "button--secondary", () => {
      selectHero(meta, hero.id);
      saveMeta(meta);
      showScreen("city");
      openBuilding(BUILDINGS.home);
    });
    choose.disabled = selected || dead;
    row.append(image, text, choose);
    details.append(row);
  }
}

// Что у героя с собой: стартовый набор, снаряжение с прошлых забегов или «сейчас в подземелье»
function describeEquipment(meta, hero, run) {
  if (run?.heroId === hero.id) return TEXTS.city.heroInDungeon;
  const equipment = getHeroEquipment(meta, hero.id);
  if (!equipment) return `${hero.description} ${TEXTS.heroSelect.hp(hero.maxHp)}`;
  return TEXTS.city.heroEquipment(equipment.deck.length, equipment.relics.length, equipment.potions.length, equipment.maxHp);
}
