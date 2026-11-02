// Экран города: карта с видом сверху. Подсвеченные дома можно открыть, остальное нарисовано на карте как декор.
import { BUILDINGS } from "../../data/buildings.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { buyBuilding, isHeroUnlocked } from "../../engine/meta.js";
import { loadMeta, saveMeta } from "../../save.js";
import { heroSprite } from "../art.js";
import { playSound } from "../audio.js";
import { BUILDING_ART } from "../cardArt.js";
import { shakeCard } from "../components/card.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

// Размер карты и рисунка здания в пикселях: положение на экране считаем в процентах от карты
const MAP_WIDTH = 360;
const MAP_HEIGHT = 780;
const BUILDING_WIDTH = 88;

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

export function renderCityScreen(root) {
  const meta = loadMeta();
  const screen = el("main", "city");

  const map = el("div", "city__map");
  for (const building of Object.values(BUILDINGS)) map.append(createBuildingTile(meta, building));

  const header = el("div", "city__header");
  header.append(
    el("h1", "city__title", TEXTS.city.title),
    el("p", "city__balance", TEXTS.city.balance(meta.crowns)),
    el("p", "city__hint", TEXTS.city.hint),
  );
  const actions = el("div", "button-row city__actions");
  actions.append(
    createButton(TEXTS.quests.button, "button--secondary", () => showScreen("quests")),
    createButton(TEXTS.city.back, "button--secondary", () => showScreen("start")),
  );
  screen.append(map, header, actions);
  root.append(screen);
}

function createBuildingTile(meta, building) {
  const built = meta.buildings.includes(building.id);
  const tile = el("button", "building");
  tile.type = "button";
  tile.classList.add(built ? "building--built" : "building--locked");
  if (!built && meta.crowns >= building.price) tile.classList.add("building--affordable");
  tile.style.left = `${(building.x / MAP_WIDTH) * 100}%`;
  tile.style.top = `${(building.y / MAP_HEIGHT) * 100}%`;
  tile.style.width = `${(BUILDING_WIDTH / MAP_WIDTH) * 100}%`;

  // Пока здание не построено, на его месте стройплощадка
  const image = el("img", "building__sprite");
  image.src = `assets/images/city/${built ? building.id : "plot"}.png`;
  image.alt = "";
  image.draggable = false;
  const label = el("span", "building__label", building.name);
  if (!built) label.append(el("span", "building__price", TEXTS.city.locked(building.price)));
  tile.append(image, label);
  tile.addEventListener("click", () => openBuilding(building));
  return tile;
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
