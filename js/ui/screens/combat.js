// Экран боя: показывает состояние боя и передаёт действия игрока в логику.
import { CONFIG } from "../../config.js";
import { CARDS } from "../../data/cards.js";
import { ENEMIES } from "../../data/enemies.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { canAffordCard, createCombat, endTurn, getEnemyIntent, playCard } from "../../engine/combat.js";
import { state } from "../../state.js";
import { createCardElement, shakeCard } from "../components/card.js";
import { createHpBar } from "../components/hpBar.js";
import { createStatusIcons } from "../components/statusIcons.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

const INTENT_ICONS = {
  attack: "⚔️",
  buff: "💪",
};

// Запускает новый бой. Время как seed задаём здесь: в логике случайность только через rng.js
export function startNewCombat() {
  state.combat = createCombat({ heroId: "warrior", enemyIds: ["cultist"], seed: Date.now() });
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
  root.append(screen);
}

function createTopBar(combat) {
  const bar = el("div", "combat__top-bar");
  bar.append(
    el("span", "", `❤️ ${combat.hero.hp}/${combat.hero.maxHp}`),
    el("span", "", `${TEXTS.turn} ${combat.turn}`),
  );
  return bar;
}

function createEnemies(combat) {
  const list = el("div", "combat__enemies");
  for (const enemy of combat.enemies) {
    if (enemy.hp > 0) list.append(createEnemy(combat, enemy));
  }
  return list;
}

function createEnemy(combat, enemy) {
  const element = el("div", "unit");
  if (getSelectedCard()?.target === "enemy") element.classList.add("unit--targetable");

  element.append(
    el("div", "unit__intent", formatIntent(combat, enemy)),
    el("div", "unit__name", ENEMIES[enemy.enemyId].name),
    createHpBar(enemy),
    createStatusIcons(enemy),
  );
  element.addEventListener("click", () => onEnemyTap(enemy));
  return element;
}

// Например: «⚔️ 9» за один удар или «⚔️ 6×2» за два
function formatIntent(combat, enemy) {
  const { intent, damage, hits } = getEnemyIntent(combat, enemy);
  if (intent !== "attack") return INTENT_ICONS[intent];
  const hitsText = hits > 1 ? `×${hits}` : "";
  return `${INTENT_ICONS.attack} ${damage}${hitsText}`;
}

function createHero(combat) {
  const wrapper = el("div", "combat__hero");
  const unit = el("div", "unit");
  unit.append(
    el("div", "unit__name", HEROES[combat.hero.heroId].name),
    createHpBar(combat.hero),
    createStatusIcons(combat.hero),
  );
  wrapper.append(unit);
  return wrapper;
}

function createHand(combat) {
  const hand = el("div", "hand");
  const middle = (combat.piles.hand.length - 1) / 2;

  combat.piles.hand.forEach((instance, index) => {
    const element = createCardElement(instance, combat.hero, {
      playable: canAffordCard(combat, instance),
      selected: instance.uid === state.selectedCardUid,
      onTap: (cardElement) => onCardTap(instance, cardElement),
    });
    // Чем дальше карта от центра, тем сильнее наклон и ниже положение: получается веер
    const offset = index - middle;
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

  bar.append(
    el("div", "combat__energy", `⚡ ${combat.energy}/${CONFIG.energyPerTurn}`),
    el("div", "combat__piles", `${TEXTS.drawPile}: ${combat.piles.draw.length} · ${TEXTS.discardPile}: ${combat.piles.discard.length}`),
    endTurnButton,
  );
  return bar;
}

function getSelectedCard() {
  if (state.selectedCardUid === null) return null;
  const instance = state.combat.piles.hand.find((card) => card.uid === state.selectedCardUid);
  return CARDS[instance.cardId];
}

function getHint() {
  const card = getSelectedCard();
  if (!card) return "";
  return card.target === "enemy" ? TEXTS.hintPickTarget : TEXTS.hintTapAgain;
}

function onCardTap(instance, element) {
  if (!canAffordCard(state.combat, instance)) {
    shakeCard(element);
    return;
  }

  const alreadySelected = state.selectedCardUid === instance.uid;
  if (alreadySelected && CARDS[instance.cardId].target === "self") {
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
