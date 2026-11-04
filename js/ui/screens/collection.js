// Экран коллекции: значки всего, что игрок открыл, и статистика забегов. Нажатие на значок показывает параметры.
import { CARDS } from "../../data/cards.js";
import { ACTS } from "../../data/acts.js";
import { ENEMIES } from "../../data/enemies.js";
import { HEROES } from "../../data/heroes.js";
import { POTIONS } from "../../data/potions.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { loadMeta } from "../../save.js";
import { enemySprite, heroSprite } from "../art.js";
import { createCardIcon } from "../components/card.js";
import { openCardPreview } from "../components/cardPreview.js";
import { openItemDetails } from "../components/itemDetails.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

// Вне боя статусов нет: числа на картах показываем без них
const HERO_OUTSIDE_COMBAT = { statuses: {} };
const TABS = ["cards", "enemies", "relics", "potions", "heroes"];

// Выбранная вкладка живёт между перерисовками экрана
let currentTab = "cards";

export function renderCollectionScreen(root) {
  const meta = loadMeta();
  const screen = el("main", "center-screen collection");
  screen.append(el("h1", "event__title", TEXTS.collection.title), createStats(meta), createTabs());

  if (currentTab === "cards") screen.append(createCardsTab(meta));
  if (currentTab === "enemies") screen.append(createEnemiesTab(meta));
  if (currentTab === "relics") screen.append(createRelicsTab(meta));
  if (currentTab === "potions") screen.append(createPotionsTab(meta));
  if (currentTab === "heroes") screen.append(createHeroesTab(meta));

  const backButton = el("button", "button button--secondary", TEXTS.collection.back);
  backButton.type = "button";
  backButton.addEventListener("click", () => showScreen("start"));
  screen.append(backButton);
  root.append(screen);
}

function createStats(meta) {
  const stats = el("div", "collection__stats");
  stats.append(
    el("p", "reward__line", TEXTS.collection.runs(meta.runsPlayed, meta.wins, meta.bestFloor)),
  );
  return stats;
}

function createTabs() {
  const tabs = el("div", "collection__tabs");
  for (const tab of TABS) {
    const button = el("button", `button ${tab === currentTab ? "" : "button--secondary"}`, TEXTS.collection.tabs[tab]);
    button.type = "button";
    button.addEventListener("click", () => {
      currentTab = tab;
      showScreen("collection");
    });
    tabs.append(button);
  }
  return tabs;
}

// Значок: маленький рисунок с подписью
function createTile(icon, name, onTap) {
  const tile = el("button", "collection-tile");
  tile.type = "button";
  tile.append(icon, el("span", "collection-tile__name", name));
  tile.addEventListener("click", onTap);
  return tile;
}

function createGrid(tiles) {
  const grid = el("div", "collection__grid");
  grid.append(...tiles);
  return grid;
}

function createEmojiIcon(emoji) {
  return el("div", "collection-tile__icon collection-tile__icon--emoji", emoji);
}

function createSpriteIcon(src) {
  const image = el("img", "collection-tile__icon collection-tile__icon--sprite");
  image.src = src;
  image.alt = "";
  image.draggable = false;
  return image;
}

// Вкладка из одного списка: сколько открыто из всего и значки открытого
function createListTab(seenIds, catalog, toTile) {
  const tab = el("div", "collection__tab");
  const all = Object.values(catalog);
  const seen = all.filter((item) => seenIds.includes(item.id));
  tab.append(el("p", "shop__section", TEXTS.collection.total(seen.length, all.length)), createGrid(seen.map(toTile)));
  return tab;
}

// Карты сгруппированы по героям; карты без героя (Рана и другие) идут отдельной группой
function createCardsTab(meta) {
  const tab = el("div", "collection__tab");
  const groups = [
    ...Object.values(HEROES).map((hero) => ({ title: hero.name, heroId: hero.id })),
    { title: TEXTS.collection.otherCards, heroId: undefined },
  ];
  for (const { title, heroId } of groups) {
    const all = Object.values(CARDS).filter((card) => card.hero === heroId);
    const seen = all.filter((card) => meta.seen.cards.includes(card.id));
    tab.append(
      el("p", "shop__section", TEXTS.collection.progress(title, seen.length, all.length)),
      createGrid(seen.map(createCardTile)),
    );
  }
  return tab;
}

function createCardTile(card) {
  const instance = { uid: 0, cardId: card.id, upgraded: false };
  return createTile(createCardIcon(card), card.name, () => openCardPreview(instance, HERO_OUTSIDE_COMBAT));
}

function createEnemiesTab(meta) {
  return createListTab(meta.seen.enemies, ENEMIES, (enemy) => createTile(createSpriteIcon(enemySprite(enemy.id)), enemy.name, () => openItemDetails({
    icon: createSpriteIcon(enemySprite(enemy.id)),
    title: enemy.name,
    kind: describeEnemyKind(enemy.id),
    lines: [
      TEXTS.collection.enemyHp(enemy.hp[0], enemy.hp[1]),
      TEXTS.collection.enemyMoves,
      ...enemy.pattern.map((moveId, index) => `${index + 1}. ${describeMove(enemy.moves[moveId])}`),
    ],
  })));
}

// Где враг встречается: акт и кто он там
function describeEnemyKind(enemyId) {
  for (const [index, act] of ACTS.entries()) {
    if (act.boss.includes(enemyId)) return TEXTS.collection.enemyKind(index + 1, "boss");
    if (act.elites.flat().includes(enemyId)) return TEXTS.collection.enemyKind(index + 1, "elite");
    if (act.encounters.flat().includes(enemyId)) return TEXTS.collection.enemyKind(index + 1, "normal");
  }
  return "";
}

// Ход врага одной строкой: одинаковые удары считаем вместе
function describeMove(move) {
  const hits = move.effects.filter((effect) => effect.type === "damage");
  const wounds = move.effects.filter((effect) => effect.type === "addCard").length;
  const parts = [];
  if (hits.length > 0) parts.push(TEXTS.collection.moveAttack(hits[0].amount, hits.length));
  for (const effect of move.effects) {
    if (effect.type === "block") parts.push(TEXTS.collection.moveBlock(effect.amount));
    if (effect.type === "applyStatus") {
      const onSelf = effect.target === "self";
      parts.push(TEXTS.collection.moveStatus(TEXTS.statuses[effect.status], effect.amount, onSelf));
    }
  }
  if (wounds > 0) parts.push(TEXTS.collection.moveWounds(wounds));
  return parts.join(", ");
}

function createRelicsTab(meta) {
  return createListTab(meta.seen.relics, RELICS, (relic) => createTile(createEmojiIcon(relic.icon), relic.name, () => openItemDetails({
    icon: createEmojiIcon(relic.icon),
    title: relic.name,
    kind: TEXTS.collection.relicKind(relic.rarity),
    text: relic.description,
  })));
}

function createPotionsTab(meta) {
  return createListTab(meta.seen.potions, POTIONS, (potion) => createTile(createEmojiIcon(potion.icon), potion.name, () => openItemDetails({
    icon: createEmojiIcon(potion.icon),
    title: potion.name,
    kind: TEXTS.collection.potionKind,
    text: potion.description,
  })));
}

function createHeroesTab(meta) {
  return createListTab(Object.keys(HEROES), HEROES, (hero) => createTile(createSpriteIcon(heroSprite(hero.id)), hero.name, () => {
    const stats = meta.heroStats[hero.id] ?? { runs: 0, wins: 0 };
    openItemDetails({
      icon: createSpriteIcon(heroSprite(hero.id)),
      title: hero.name,
      kind: TEXTS.collection.heroKind,
      text: hero.description,
      lines: [
        TEXTS.collection.heroHp(hero.maxHp),
        TEXTS.collection.heroRelic(RELICS[hero.relics[0]].name),
        TEXTS.collection.heroDeck(hero.deck.length),
        TEXTS.collection.heroMechanic(hero.mechanic.name, hero.mechanic.text),
        TEXTS.collection.heroRuns(stats.runs, stats.wins),
      ],
    });
  }));
}
