// Экран боя: показывает состояние боя и передаёт действия игрока в логику.
import { CONFIG } from "../../config.js";
import { ENEMIES } from "../../data/enemies.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { canPlayCard, createCombat, createRandomCombat, endTurn, getEnemyIntent, playCard } from "../../engine/combat.js";
import { getCardData } from "../../engine/deck.js";
import { state } from "../../state.js";
import { createCardElement, shakeCard } from "../components/card.js";
import { createCardPicker } from "../components/cardPicker.js";
import { createHpBar } from "../components/hpBar.js";
import { createStatusIcons } from "../components/statusIcons.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

const INTENT_ICONS = {
  attack: "⚔️",
  defend: "🛡️",
  buff: "💪",
  debuff: "🌀",
};

// Запускает новый бой. Время как seed задаём здесь: в логике случайность только через rng.js
export function startNewCombat() {
  state.combat = createRandomCombat({ heroId: "warrior", seed: Date.now() });
  state.test.enabled = false;
  state.selectedCardUid = null;
  showScreen("combat");
}

// Запускает бой с врагами, выбранными в тестовом режиме
export function startTestCombat() {
  state.combat = createCombat({ heroId: "warrior", enemyIds: state.test.enemyIds, seed: Date.now() });
  state.test.enabled = true;
  state.selectedCardUid = null;
  showScreen("combat");
}

// Рисует экран заново: так картинка всегда совпадает с состоянием боя
export function renderCombatScreen(root) {
  const combat = state.combat;
  const screen = el("main", "combat");
  screen.append(
    createTopBar(combat),
    createEnemies(combat),
    createHero(combat),
    el("p", "combat__hint", getHint()),
    createHand(combat),
    createBottomBar(combat),
  );
  if (state.test.pickerOpen) screen.append(createCardPicker());
  root.append(screen);
}

function createTopBar(combat) {
  const bar = el("div", "combat__top-bar");
  bar.append(
    el("span", "", `❤️ ${combat.hero.hp}/${combat.hero.maxHp}`),
    el("span", "", `${TEXTS.turn} ${combat.turn}`),
  );
  if (state.test.enabled) {
    const testButton = el("button", "button button--secondary", "🧪");
    testButton.type = "button";
    testButton.addEventListener("click", () => {
      state.test.pickerOpen = true;
      showScreen("combat");
    });
    bar.append(testButton);
  }
  return bar;
}

function createEnemies(combat) {
  const list = el("div", "combat__enemies");
  const alive = combat.enemies.filter((enemy) => enemy.hp > 0);
  for (const enemy of alive) {
    list.append(createEnemy(combat, enemy, alive.length > 1));
  }
  return list;
}

function createEnemy(combat, enemy, compact) {
  const element = el("div", "unit");
  if (getSelectedCard()?.target === "enemy") element.classList.add("unit--targetable");

  element.append(
    el("div", "unit__intent", formatIntent(combat, enemy)),
    el("div", "unit__name", ENEMIES[enemy.enemyId].name),
    createHpBar(enemy),
    createStatusIcons(enemy, { compact }),
  );
  element.addEventListener("click", () => onEnemyTap(enemy));
  return element;
}

// Например: «⚔️ 9» за один удар, «⚔️ 6×2» за два, «🛡️ 9» за блок
function formatIntent(combat, enemy) {
  const { intent, damage, hits, block } = getEnemyIntent(combat, enemy);
  if (intent === "attack") {
    const hitsText = hits > 1 ? `×${hits}` : "";
    return `${INTENT_ICONS.attack} ${damage}${hitsText}`;
  }
  if (intent === "defend") return `${INTENT_ICONS.defend} ${block}`;
  return INTENT_ICONS[intent];
}

function createHero(combat) {
  const wrapper = el("div", "combat__hero");
  const unit = el("div", "unit");
  // Когда значков много, сокращаем их, чтобы герой не занял место врагов
  const iconCount = Object.keys(combat.hero.statuses).length + combat.hero.powers.length;
  unit.append(
    el("div", "unit__name", HEROES[combat.hero.heroId].name),
    createHpBar(combat.hero),
    createStatusIcons(combat.hero, { compact: iconCount > 2 }),
  );
  wrapper.append(unit);
  return wrapper;
}

function createHand(combat) {
  const hand = el("div", "hand");
  const count = combat.piles.hand.length;
  const middle = (count - 1) / 2;
  // Чем больше карт в руке, тем меньше наклон, иначе крайние уйдут за экран
  const spread = Math.min(1, CONFIG.cardsPerTurn / count);
  hand.style.setProperty("--card-count", count);

  combat.piles.hand.forEach((instance, index) => {
    const element = createCardElement(instance, combat.hero, {
      playable: canPlayCard(combat, instance),
      selected: instance.uid === state.selectedCardUid,
      onTap: (cardElement) => onCardTap(instance, cardElement),
    });
    // Чем дальше карта от центра, тем сильнее наклон и ниже положение: получается веер
    const offset = (index - middle) * spread;
    element.style.setProperty("--fan-angle", `${offset * 3}deg`);
    element.style.setProperty("--fan-drop", `${offset * offset * 2}px`);
    hand.append(element);
  });
  return hand;
}

function createBottomBar(combat) {
  const bar = el("div", "combat__bottom-bar");
  const endTurnButton = el("button", "button", TEXTS.endTurn);
  endTurnButton.type = "button";
  endTurnButton.addEventListener("click", onEndTurnTap);

  const piles = el("div", "combat__piles");
  piles.append(
    el("div", "", `${TEXTS.drawPile}: ${combat.piles.draw.length} · ${TEXTS.discardPile}: ${combat.piles.discard.length}`),
    el("div", "", `${TEXTS.exhaustPile}: ${combat.piles.exhaust.length}`),
  );

  bar.append(
    el("div", "combat__energy", `⚡ ${combat.energy}/${CONFIG.energyPerTurn}`),
    piles,
    endTurnButton,
  );
  return bar;
}

function getSelectedCard() {
  if (state.selectedCardUid === null) return null;
  return getCardData(state.combat.piles.hand.find((card) => card.uid === state.selectedCardUid));
}

function getHint() {
  const card = getSelectedCard();
  if (!card) return "";
  return card.target === "enemy" ? TEXTS.hintPickTarget : TEXTS.hintTapAgain;
}

function onCardTap(instance, element) {
  if (!canPlayCard(state.combat, instance)) {
    shakeCard(element);
    return;
  }

  const alreadySelected = state.selectedCardUid === instance.uid;
  if (alreadySelected && getCardData(instance).target !== "enemy") {
    playSelectedCard(null);
    return;
  }

  // Повторный тап по карте с целью снимает выбор, тап по другой карте выбирает её
  state.selectedCardUid = alreadySelected ? null : instance.uid;
  showScreen("combat");
}

function onEnemyTap(enemy) {
  if (getSelectedCard()?.target === "enemy") playSelectedCard(enemy.instanceId);
}

function playSelectedCard(targetId) {
  playCard(state.combat, state.selectedCardUid, targetId);
  state.selectedCardUid = null;
  showCurrentScreen();
}

function onEndTurnTap() {
  state.selectedCardUid = null;
  endTurn(state.combat);
  showCurrentScreen();
}

// Бой продолжается — рисуем его заново, закончился — показываем результат
function showCurrentScreen() {
  showScreen(state.combat.status === "playerTurn" ? "combat" : "result");
}
