// Экран коллекции: всё, что игрок встретил, и статистика забегов.
import { CARDS } from "../../data/cards.js";
import { ENEMIES } from "../../data/enemies.js";
import { HEROES } from "../../data/heroes.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { loadMeta } from "../../save.js";
import { createCardElement } from "../components/card.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

// Вне боя статусов нет: числа на картах показываем без них
const HERO_OUTSIDE_COMBAT = { statuses: {} };
const TABS = ["cards", "enemies", "relics"];

// Выбранная вкладка живёт между перерисовками экрана
let currentTab = "cards";

export function renderCollectionScreen(root) {
  const meta = loadMeta();
  const screen = el("main", "center-screen collection");
  screen.append(el("h1", "event__title", TEXTS.collection.title), createStats(meta), createTabs());

  if (currentTab === "cards") screen.append(createCardsTab(meta));
  if (currentTab === "enemies") screen.append(createListTab(meta.seen.enemies, ENEMIES, (enemy) => enemy.name));
  if (currentTab === "relics") {
    screen.append(createListTab(meta.seen.relics, RELICS, (relic) => `${relic.icon} ${relic.name}: ${relic.description}`));
  }

  const backButton = el("button", "button button--secondary", TEXTS.collection.back);
  backButton.type = "button";
  backButton.addEventListener("click", () => showScreen("start"));
  screen.append(backButton);
  root.append(screen);
}

function createStats(meta) {
  const stats = el("div", "collection__stats");
  stats.append(
    el("p", "reward__line", TEXTS.collection.xp(meta.xp)),
    el("p", "reward__line", TEXTS.collection.runs(meta.runsPlayed, meta.wins, meta.bestFloor)),
  );
  for (const hero of Object.values(HEROES)) {
    const heroStats = meta.heroStats[hero.id];
    if (heroStats) stats.append(el("p", "reward__line", TEXTS.collection.heroRuns(hero.name, heroStats.runs, heroStats.wins)));
  }
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

// Карты сгруппированы по героям. Встреченных показываем, остальные только считаем
function createCardsTab(meta) {
  const tab = el("div", "collection__tab");
  for (const hero of Object.values(HEROES)) {
    const all = Object.values(CARDS).filter((card) => card.hero === hero.id);
    const seen = all.filter((card) => meta.seen.cards.includes(card.id));
    tab.append(el("p", "shop__section", TEXTS.collection.progress(hero.name, seen.length, all.length)));

    const row = el("div", "card-row");
    seen.forEach((card, index) => {
      row.append(createCardElement({ uid: index, cardId: card.id, upgraded: false }, HERO_OUTSIDE_COMBAT, {
        playable: true,
        selected: false,
        onTap: () => {},
      }));
    });
    tab.append(row);
  }
  return tab;
}

function createListTab(seenIds, catalog, format) {
  const tab = el("div", "collection__tab");
  const all = Object.values(catalog);
  const seen = all.filter((item) => seenIds.includes(item.id));
  tab.append(el("p", "shop__section", TEXTS.collection.total(seen.length, all.length)));
  for (const item of seen) tab.append(el("p", "stats__row", format(item)));
  return tab;
}
