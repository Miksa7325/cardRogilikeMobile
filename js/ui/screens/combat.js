// Экран боя: показывает состояние боя и передаёт действия игрока в логику.
import { CONFIG } from "../../config.js";
import { ENEMIES } from "../../data/enemies.js";
import { HEROES } from "../../data/heroes.js";
import { POTIONS } from "../../data/potions.js";
import { TEXTS } from "../../data/texts.ru.js";
import { canPlayCard, createCombat, endTurn, getEnemyIntent, playCard, usePotion } from "../../engine/combat.js";
import { getCardData } from "../../engine/deck.js";
import { createNodeCombat, finishCombat } from "../../engine/run.js";
import { saveRun } from "../../save.js";
import { state } from "../../state.js";
import { captureCombatView, flyCardAway, playCombatFeedback, playEnemyTurn, showDrawnCards } from "../animations.js";
import { ENEMY_ART, HERO_ART, IDLE_STYLES } from "../art.js";
import { enableCardDrag } from "../cardDrag.js";
import { createCardElement, describeCard, shakeCard } from "../components/card.js";
import { openCardList } from "../components/cardList.js";
import { createCardPicker } from "../components/cardPicker.js";
import { createHpBar } from "../components/hpBar.js";
import { createItemsRow, createMenuButton, createRunBar } from "../components/runBar.js";
import { createStatusIcons } from "../components/statusIcons.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { animationMs } from "../settings.js";
import { createTutorialBanner, finishTutorial, isTutorialTarget, notifyTutorial } from "../tutorial.js";

const INTENT_ICONS = {
  attack: "⚔️",
  defend: "🛡️",
  buff: "💪",
  debuff: "🌀",
};

// Запускает бой на текущем узле забега
export function startNodeCombat() {
  state.combat = createNodeCombat(state.run);
  state.test.enabled = false;
  clearSelection();
  saveTurnStart();
  showScreen("combat");
}

// Продолжает бой из сохранения: с начала того хода, на котором игрок вышел
export function resumeCombat() {
  state.combat = state.run.savedCombat;
  state.test.enabled = false;
  clearSelection();
  showScreen("combat");
}

// Запускает бой с врагами, выбранными в тестовом режиме
export function startTestCombat() {
  state.combat = createCombat({ heroId: state.test.heroId, enemyIds: state.test.enemyIds, seed: Date.now() });
  state.test.enabled = true;
  clearSelection();
  showScreen("combat");
}

// Сохраняет бой в начале хода, чтобы закрытая игра продолжилась с этого места
function saveTurnStart() {
  state.run.savedCombat = state.combat;
  saveRun(state.run);
}

function clearSelection() {
  state.selectedPotionIndex = null;
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
  const banner = state.test.enabled ? null : createTutorialBanner("combat", combat);
  if (banner) screen.append(banner);
  root.append(screen);
}

function createTopBar(combat) {
  const potionOptions = { onPotionTap: onPotionTap, selectedPotionIndex: state.selectedPotionIndex };
  if (!state.test.enabled) return createRunBar(state.run, { combat, ...potionOptions });

  const bar = el("div", "combat__top-bar");
  bar.append(
    el("span", "bar-hp", `❤️ ${combat.hero.hp}/${combat.hero.maxHp}`),
    el("span", "", `${TEXTS.turn} ${combat.turn}`),
    createItemsRow(combat.relics, combat.potions, potionOptions),
  );
  const testButton = el("button", "button button--secondary", "🧪");
  testButton.type = "button";
  testButton.addEventListener("click", () => {
    state.test.pickerOpen = true;
    showScreen("combat");
  });
  bar.append(testButton, createMenuButton());
  return bar;
}

// idle — как модель двигается в покое: классы анимаций лежат в css/theme.css
function createPortrait(art, idle = "breathe") {
  const portrait = el("div", `unit__portrait idle--${idle}`);
  portrait.innerHTML = art;
  return portrait;
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
  element.dataset.unitId = enemy.instanceId;
  if (getSelectedTargetType() === "enemy") element.classList.add("unit--targetable");
  if (isTutorialTarget("enemy")) element.classList.add("tutorial-target");

  element.append(
    el("div", "unit__intent", formatIntent(combat, enemy)),
    createPortrait(ENEMY_ART[enemy.enemyId], IDLE_STYLES[enemy.enemyId]),
    el("div", "unit__name", ENEMIES[enemy.enemyId].name),
    createHpBar(enemy),
    createStatusIcons(enemy, { compact }),
  );
  element.addEventListener("click", () => onEnemyTap(combat, enemy));
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

// Текст подсказки при нажатии на бойца: что он сделает и что значат его статусы
function describeStatuses(unit) {
  const lines = Object.entries(unit.statuses).map(([status, amount]) => (
    `${TEXTS.statuses[status]} ${amount}: ${TEXTS.statusDescriptions[status]}.`
  ));
  return lines.length > 0 ? lines.join(" ") : TEXTS.inspect.noStatuses;
}

function describeEnemy(combat, enemy) {
  const { intent, damage, hits, block } = getEnemyIntent(combat, enemy);
  const texts = TEXTS.inspect.intents;
  const intentText = { attack: texts.attack(damage, hits), defend: texts.defend(block), buff: texts.buff, debuff: texts.debuff }[intent];
  return `${ENEMIES[enemy.enemyId].name}. ${intentText} ${describeStatuses(enemy)}`;
}

function createHero(combat) {
  const wrapper = el("div", "combat__hero");
  const unit = el("div", "unit unit--hero");
  unit.dataset.unitId = "hero";
  // Когда значков много, сокращаем их, чтобы герой не занял место врагов
  const iconCount = Object.keys(combat.hero.statuses).length + combat.hero.powers.length;

  const details = el("div", "unit__details");
  details.append(
    el("div", "unit__name", HEROES[combat.hero.heroId].name),
    createHpBar(combat.hero),
    createStatusIcons(combat.hero, { compact: iconCount > 2 }),
  );
  unit.append(createPortrait(HERO_ART[combat.hero.heroId]), details);
  unit.addEventListener("click", () => showTooltip(describeStatuses(combat.hero)));
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
      selected: false,
      onTap: (cardElement) => onCardTap(combat, instance, cardElement),
    });
    enableCardDrag(element, {
      targetType: getCardData(instance).target,
      canPlay: () => canPlayCard(combat, instance),
      onBlocked: shakeCard,
      onDragState: (dragging) => showDragHint(dragging, getCardData(instance).target),
      onDrop: (targetId, ghost) => playDroppedCard(instance, targetId, ghost),
    });
    if (canPlayCard(combat, instance) && isTutorialTarget("card", instance)) element.classList.add("tutorial-target");
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
  if (isTutorialTarget("endTurn")) endTurnButton.classList.add("tutorial-target");

  const piles = el("button", "combat__piles");
  piles.type = "button";
  piles.append(
    el("div", "", `${TEXTS.drawPile}: ${combat.piles.draw.length} · ${TEXTS.discardPile}: ${combat.piles.discard.length}`),
    el("div", "", `${TEXTS.exhaustPile}: ${combat.piles.exhaust.length}`),
  );
  piles.addEventListener("click", () => openPiles(combat));

  const energy = el("div", "combat__energy", `⚡ ${combat.energy}/${CONFIG.energyPerTurn}`);
  if (isTutorialTarget("energy")) energy.classList.add("tutorial-target");

  bar.append(energy, piles, endTurnButton);
  return bar;
}

// Добор показываем по порядку id, иначе игрок узнает, какая карта придёт следующей
function openPiles(combat) {
  const sortedDraw = [...combat.piles.draw].sort((a, b) => a.cardId.localeCompare(b.cardId));
  openCardList([
    { title: TEXTS.drawPile, cards: sortedDraw },
    { title: TEXTS.discardPile, cards: combat.piles.discard },
    { title: TEXTS.exhaustPile, cards: combat.piles.exhaust },
  ]);
}

function getSelectedPotion() {
  if (state.selectedPotionIndex === null) return null;
  return POTIONS[state.combat.potions[state.selectedPotionIndex]];
}

// На кого нацелено выбранное зелье
function getSelectedTargetType() {
  return getSelectedPotion()?.target ?? null;
}

// Без выбранного зелья подсказка напоминает главное действие: карты перетаскиваются
function getHint() {
  const targetType = getSelectedTargetType();
  if (!targetType) return TEXTS.hintDragCard;
  return targetType === "enemy" ? TEXTS.hintPickTarget : TEXTS.hintPotionTapAgain;
}

// Подсказка, пока палец несёт карту. Экран нельзя перерисовывать: перенос бы оборвался
function showDragHint(dragging, targetType) {
  const hint = document.querySelector(".combat__hint");
  if (!hint) return;
  if (!dragging) hint.textContent = getHint();
  else hint.textContent = targetType === "enemy" ? TEXTS.hintDropOnEnemy : TEXTS.hintDropAbove;
}

// Нажатие на карту показывает её описание. Разыграть её можно только перетаскиванием
function onCardTap(combat, instance, element) {
  if (!canPlayCard(combat, instance)) shakeCard(element);
  showTooltip(describeCard(instance, combat.hero));
}

function onPotionTap(index) {
  const alreadySelected = state.selectedPotionIndex === index;
  if (alreadySelected && POTIONS[state.combat.potions[index]].target !== "enemy") {
    useSelectedPotion(null);
    return;
  }

  clearSelection();
  state.selectedPotionIndex = alreadySelected ? null : index;
  showScreen("combat");
}

// С выбранной картой нажатие на врага — удар, а без неё — описание врага
function onEnemyTap(combat, enemy) {
  if (getSelectedTargetType() === "enemy") useSelectedPotion(enemy.instanceId);
  else showTooltip(describeEnemy(combat, enemy));
}

// Карту отпустили на цели
function playDroppedCard(instance, targetId, ghost) {
  const before = captureCombatView(state.combat);
  const blockBefore = state.combat.hero.block;
  const card = getCardData(instance);

  const result = playCard(state.combat, instance.uid, targetId);
  if (!result.ok) {
    ghost.remove();
    return;
  }
  flyCardAway(ghost);
  clearSelection();

  if (card.target === "enemy") notifyTutorial("attackPlayed");
  if (state.combat.hero.block > blockBefore) notifyTutorial("blockGained");
  showCurrentScreen(before, { heroAttacked: card.type === "attack" });
}

function useSelectedPotion(targetId) {
  const before = captureCombatView(state.combat);
  usePotion(state.combat, state.selectedPotionIndex, targetId);
  clearSelection();
  showCurrentScreen(before);
}

// Логика считает ход врагов мгновенно, а экран показывает его по шагам и только потом рисует новый ход
async function onEndTurnTap() {
  const before = captureCombatView(state.combat);
  clearSelection();
  endTurn(state.combat);
  notifyTutorial("turnEnded");

  // Новый ход начался: это точка сохранения посреди боя
  if (!state.test.enabled && state.combat.status === "playerTurn") saveTurnStart();

  await playEnemyTurn(before, state.combat);
  showScreen("combat");
  showDrawnCards(before.handUids, state.combat);
  finishCombatIfOver();
}

// Рисует итог действия. Если бой закончился, сначала даём увидеть последний удар
function showCurrentScreen(before, feedbackOptions = {}) {
  showScreen("combat");
  playCombatFeedback(before, state.combat, feedbackOptions);
  finishCombatIfOver();
}

function finishCombatIfOver() {
  if (state.combat.status === "playerTurn") return;

  // Пока идёт пауза, нажатия не должны доходить до экрана
  document.getElementById("app").append(el("div", "input-blocker"));
  setTimeout(showCombatEnd, animationMs(2));
}

// Тестовый бой заканчивается результатом, а в забеге победа ведёт к награде и только поражение — к результату
function showCombatEnd() {
  if (state.tutorialStep !== null) finishTutorial();
  if (state.test.enabled) {
    showScreen("result");
    return;
  }
  finishCombat(state.run, state.combat);
  if (state.run.status === "lost") {
    showScreen("result");
    return;
  }
  // Награда сохраняется сразу: закрытая игра вернётся на этот же экран
  saveRun(state.run);
  showScreen("reward");
}
