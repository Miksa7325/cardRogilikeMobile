// Город: с него начинается игра. Карта с видом сверху, по которой ходит герой. Подсвеченные дома можно открыть:
// в каждом построенном доме работает служба (ui/screens/cityServices.js), в гильдии меняют эссенции на золото,
// у торговца покупают припасы. У статуи в центре стоит старейшина с заданиями, в конце южной дороги — вход в подземелье.
// По бокам старого города — слободы. Здания, дома для красоты, деревья и вход в подземелье — отрисованные 3D-модели,
// земля с дорогами и фонтаном — одна картинка ground.jpg. Что где стоит, описано в data/buildings.js и data/cityLayout.js.
// В городе есть места интереса: колодец желаний, доска объявлений и дом летописца.
import { CONFIG } from "../../config.js";
import { BUILDINGS } from "../../data/buildings.js";
import { DECOR_HOUSES, DECOR_PROPS, FOUNTAIN, POINTS_OF_INTEREST } from "../../data/cityLayout.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import {
  bankLoot, buyBuilding, countReadyQuests, exchangeEssences, getAliveHeroIds, getHeroEquipment, getStartableActs, getTraderGoods,
  isHeroDead, payForReturn, selectHero, throwWishCoin,
} from "../../engine/meta.js";
import { canReturnToCity, getCurrentFloor, getReturnPrice, healInCity } from "../../engine/run.js";
import { isBuilt } from "../../engine/town.js";
import { loadMeta, loadRun, saveMeta, saveRun } from "../../save.js";
import { state } from "../../state.js";
import { applyHeroLook, ELDER_ART, heroSprite } from "../art.js";
import { playSound } from "../audio.js";
import { shakeCard } from "../components/card.js";
import { openQuestDialog } from "../components/questDialog.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { appendService, createGood } from "./cityServices.js";
import { continueRun, startNewRun } from "./dungeon.js";

// Размеры в пикселях карты: положение на экране считаем в процентах от неё
const CENTER_WIDTH = 360; // старый город посередине
const MAP_HEIGHT = 780;
const DISTRICT_WIDTH = 260; // слобода сбоку от старого города
const BUILDING_WIDTH = 88;
const BUILDING_HEIGHT = 76;
const HERO_WIDTH = 30;
const ELDER_WIDTH = 30;
const GATE_WIDTH = 72;
const STATUE_WIDTH = 124;

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

const ELDER = { x: 236, y: 420 }; // старейшина стоит у статуи; это точка его ног
const GATE = { x: 180, y: 778 }; // вход в подземелье в конце южной дороги; это середина его нижнего края
const GATE_SPOT = { x: 180, y: 706 }; // где стоит герой у входа в подземелье
// Статуя лучшего игрока стоит в центре города, на перекрёстке между фонарями; это середина низа постамента
const STATUE = { x: 180, y: 430 };

// Гильдия и торговец живут в домиках у центральной площади. x и y — левый верхний угол
const GUILD = { x: 210, y: 320, width: 52, height: 46 };
const TRADER = { x: 211, y: 464, width: 51, height: 46 };

// Фонтан нарисован на земле: обойти его можно только по краю площади. Остальные препятствия — дома и деревья
const FOUNTAIN_OBSTACLE = { x: FOUNTAIN.x - FOUNTAIN.radius, y: FOUNTAIN.y - FOUNTAIN.radius, width: FOUNTAIN.radius * 2, height: FOUNTAIN.radius * 2 };

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

// Рисунок из assets/images/city: здания, дома, деревья и мелочи
function createSpriteImage(name, className = "") {
  const image = el("img", className);
  image.src = `assets/images/city/${name}.png`;
  image.alt = "";
  image.draggable = false;
  return image;
}

// Значок здания в его окне: та же 3D-модель, что стоит на карте
function createBuildingArt(name) {
  const art = el("div", "building__art building__art--model");
  art.append(createSpriteImage(name));
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
  // Герой забега, поднявшийся в город, сдаёт добычу в казну и отдыхает: здоровье восстанавливается полностью
  const run = loadRun();
  const news = [];
  if (run !== null && canReturnToCity(run)) {
    const meta = loadMeta();
    const loot = bankLoot(meta, run);
    if (loot.gold > 0 || loot.essences > 0) news.push(TEXTS.city.banked(loot.gold, loot.essences));
    const healed = healInCity(run);
    if (healed > 0) news.push(TEXTS.city.healed(healed));
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
  const { well, board, chronicler } = POINTS_OF_INTEREST;
  const places = [
    ...Object.values(BUILDINGS).map((building) => createBuildingPlace(meta, building)),
    createServicePlace(inCity(GUILD), "guild", TEXTS.guild.title, openGuild),
    createServicePlace(inCity(TRADER), "trader", TEXTS.trader.title, openTrader),
    createServicePlace(well, well.sprite, TEXTS.city.well.title, openWell),
    createServicePlace(board, board.sprite, TEXTS.city.board.title, openBoard),
    createServicePlace(chronicler, chronicler.sprite, TEXTS.city.chronicler.title, openChronicler),
    createElderPlace(meta),
    createStatuePlace(),
    createGatePlace(),
  ];
  const hero = createHero(loadRun()?.heroId ?? meta.selectedHero, meta);
  const map = el("div", "city__map");
  // Карта шире экрана, когда выросли слободы: её ширина — доля от ширины старого города
  map.style.width = `calc(min(100vw, calc(100dvh * 9 / 16)) * ${layout.width / CENTER_WIDTH})`;
  map.style.aspectRatio = `${layout.width} / ${MAP_HEIGHT}`;
  const decor = createDecor();
  map.append(...createGround(), ...decor.map((item) => item.element), ...places.map((place) => place.element), hero);

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

  const walker = startWalking({ screen, map, hero, header, actions, places, decor });
  for (const place of places) place.element.addEventListener("click", () => walker.walkTo(place));
}

// Земля города — одна картинка на весь город, над слободами — их названия
function createGround() {
  const ground = el("div", "city__ground");
  const names = [[0, TEXTS.city.westDistrict], [layout.eastX, TEXTS.city.eastDistrict]].map(([x, name]) => {
    const label = el("div", "city__district-name", name);
    label.style.left = percent(x, layout.width);
    label.style.width = percent(DISTRICT_WIDTH, layout.width);
    return label;
  });
  return [ground, ...names];
}

// Дома для красоты, деревья и мелочи: войти нельзя, но и пройти сквозь них тоже
function createDecor() {
  const houses = DECOR_HOUSES.map((house) => {
    const element = el("div", "city-decor");
    element.style.left = percent(house.x, layout.width);
    element.style.top = percent(house.y, MAP_HEIGHT);
    element.style.width = percent(BUILDING_WIDTH, layout.width);
    element.style.zIndex = house.y + BUILDING_HEIGHT;
    element.append(createSpriteImage(house.sprite, "city-decor__art"));
    return { element, obstacle: { x: house.x + 6, y: house.y + 30, width: BUILDING_WIDTH - 12, height: BUILDING_HEIGHT - 34 } };
  });
  const props = DECOR_PROPS.map((prop) => {
    const element = el("div", "city-prop");
    element.style.left = percent(prop.x, layout.width);
    element.style.top = percent(prop.y, MAP_HEIGHT);
    element.style.width = percent(prop.size, layout.width);
    element.style.zIndex = prop.y;
    element.append(createSpriteImage(prop.sprite, "city-decor__art"));
    // Непроходим только низ: ствол дерева или основание бочки
    const foot = prop.size * 0.4;
    return { element, obstacle: { x: prop.x - foot / 2, y: prop.y - 8, width: foot, height: 8 } };
  });
  return [...houses, ...props];
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
    open: () => {
      playSound("door");
      openBuilding(building);
    },
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

// Пока здание не построено, на его месте стройплощадка
function createBuildingSprite(building, built) {
  return createSpriteImage(built ? building.id : "plot", "building__sprite");
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

// Мраморная статуя лучшего игрока. Подойдёшь — откроется её большое изображение
function createStatuePlace() {
  const at = inCity(STATUE);
  const statue = el("button", "city-statue");
  statue.type = "button";
  statue.style.left = percent(at.x, layout.width);
  statue.style.top = percent(at.y, MAP_HEIGHT);
  statue.style.width = percent(STATUE_WIDTH, layout.width);
  statue.style.zIndex = at.y;
  const image = el("img", "city-statue__art");
  image.src = "assets/images/city/statue.png";
  image.alt = "";
  image.draggable = false;
  statue.append(image, el("span", "building__label", TEXTS.city.statue.label));
  return {
    element: statue,
    action: TEXTS.city.statue.look,
    spot: { x: at.x, y: at.y + 12 },
    obstacle: { x: at.x - 16, y: at.y - 14, width: 32, height: 14 },
    open: openStatue,
  };
}

function openStatue() {
  const overlay = el("div", "card-preview");
  const dialog = el("div", "quest-dialog statue-dialog");
  const image = el("img", "statue-dialog__art");
  image.src = "assets/images/city/statue-large.png";
  image.alt = TEXTS.city.statue.name;
  dialog.append(
    image,
    el("h2", "event__title statue-dialog__name", TEXTS.city.statue.name),
    el("p", "statue-dialog__title", TEXTS.city.statue.title),
    createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()),
  );
  overlay.append(dialog);
  document.getElementById("app").append(overlay);
}

// Вход в подземелье: старая шахта в конце южной дороги
function createGatePlace() {
  const at = inCity(GATE);
  const gate = el("button", "city-gate");
  gate.type = "button";
  gate.style.left = percent(at.x, layout.width);
  gate.style.top = percent(at.y, MAP_HEIGHT);
  gate.style.width = percent(GATE_WIDTH, layout.width);
  gate.style.zIndex = at.y;
  gate.append(createSpriteImage("gate", "city-gate__art"), el("span", "building__label", TEXTS.city.gate));

  return {
    element: gate,
    action: TEXTS.city.gateEnter,
    spot: inCity(GATE_SPOT),
    obstacle: { x: at.x - GATE_WIDTH / 2 + 6, y: at.y - 40, width: GATE_WIDTH - 12, height: 40 },
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
  dialog.append(createBuildingArt("gate"), el("h2", "event__title", TEXTS.city.gateTitle), el("p", "quest-dialog__speech", TEXTS.city.gateText));

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

// Домик службы или место интереса: гильдия, торговец, колодец, доска объявлений, дом летописца.
// rect — место на карте, sprite — рисунок из assets/images/city. Непроходим только низ, за крышу можно зайти
function createServicePlace(rect, sprite, name, open) {
  const house = el("button", "building building--built city-service");
  house.type = "button";
  house.style.left = percent(rect.x, layout.width);
  house.style.top = percent(rect.y, MAP_HEIGHT);
  house.style.width = percent(rect.width, layout.width);
  house.style.zIndex = rect.y + rect.height;
  house.append(createSpriteImage(sprite, "building__sprite"), el("span", "building__label", name));
  const solidTop = rect.y + rect.height * 0.45;
  return {
    element: house,
    action: TEXTS.city.enter(name),
    spot: { x: rect.x + rect.width / 2, y: rect.y + rect.height + 6 },
    obstacle: { x: rect.x + 4, y: solidTop, width: rect.width - 8, height: rect.y + rect.height - solidTop - 2 },
    open,
  };
}

// Окно поверх города: рисунок места, название и описание. Возвращает его содержимое, чтобы добавить остальное
function openDialog(sprite, title, text) {
  const overlay = el("div", "card-preview");
  const dialog = el("div", "quest-dialog");
  dialog.append(createBuildingArt(sprite), el("h2", "event__title", title), el("p", "quest-dialog__speech", text));
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
  const { overlay, dialog } = openDialog("guild", TEXTS.guild.title, TEXTS.guild.text(CONFIG.city.essencesPerGold));
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
  const { overlay, dialog } = openDialog("trader", TEXTS.trader.title, TEXTS.trader.text);
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

// Колодец желаний: монетка из казны в колодец. Иногда колодец отвечает эссенциями или возвращает золото вдвое
function openWell() {
  const meta = loadMeta();
  const texts = TEXTS.city.well;
  const { overlay, dialog } = openDialog("well", texts.title, texts.text);
  const result = el("p", "quests__hint", "");
  const balance = createBalance(meta);
  const button = createButton(texts.throw(CONFIG.city.wellPrice), "button--large", () => {
    const outcome = throwWishCoin(meta, Math.random());
    if (!outcome.ok) {
      shakeCard(button);
      showTooltip(TEXTS.trader.notEnoughGold);
      return;
    }
    if (!saveMeta(meta)) showTooltip(TEXTS.saveFailed);
    playSound(outcome.outcome === "wish" ? "gem" : "buy");
    result.textContent = outcome.outcome === "wish" ? texts.wishes[Math.floor(Math.random() * texts.wishes.length)] : texts.results[outcome.outcome](outcome.amount);
    balance.replaceWith(createBalance(meta));
    button.disabled = meta.gold < CONFIG.city.wellPrice;
  });
  button.disabled = meta.gold < CONFIG.city.wellPrice;
  dialog.append(balance, button, result, createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));
}

// Доска объявлений: три случайных совета и новости города
function openBoard() {
  const meta = loadMeta();
  const texts = TEXTS.city.board;
  const { overlay, dialog } = openDialog("board", texts.title, texts.text);
  const tips = [...texts.tips].sort(() => Math.random() - 0.5).slice(0, 3);
  const list = el("div", "quest-dialog__list");
  for (const tip of tips) list.append(el("div", "quest notice", tip));
  const ready = countReadyQuests(meta);
  if (ready > 0) list.prepend(el("div", "quest notice notice--news", texts.elderNews(ready)));
  dialog.append(list, createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));
}

// Дом летописца: итоги всех забегов и каждого героя
function openChronicler() {
  const meta = loadMeta();
  const texts = TEXTS.city.chronicler;
  const { overlay, dialog } = openDialog("chronicler", texts.title, meta.runsPlayed > 0 ? texts.text : texts.empty);
  const totals = meta.totals ?? {};
  const list = el("div", "quest-dialog__list");
  for (const [key, label] of texts.lines) {
    const value = key === "bestFloor" ? meta.bestFloor : key === "runs" ? meta.runsPlayed : key === "wins" ? meta.wins : totals[key] ?? 0;
    const row = el("div", "quest chronicle");
    row.append(el("span", "chronicle__label", label), el("b", "chronicle__value", String(value)));
    list.append(row);
  }
  for (const [heroId, hero] of Object.entries(HEROES)) {
    const stats = meta.heroStats?.[heroId];
    if (!stats) continue;
    const row = el("div", "quest chronicle");
    const fate = isHeroDead(meta, heroId) ? texts.fallen : "";
    row.append(el("span", "chronicle__label", hero.name + fate), el("b", "chronicle__value", texts.heroLine(stats.runs, stats.wins)));
    list.append(row);
  }
  dialog.append(list, createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));
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
function startWalking({ screen, map, hero, header, actions, places, decor }) {
  const obstacles = [FOUNTAIN_OBSTACLE, ...decor.map((item) => item.obstacle), ...places.map((place) => place.obstacle)];
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
    createBuildingArt(building.id),
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
