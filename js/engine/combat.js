// Логика боя. Этот файл не трогает HTML: только меняет данные боя.
import { CONFIG } from "../config.js";
import { ENEMIES } from "../data/enemies.js";
import { HEROES } from "../data/heroes.js";
import { POTIONS } from "../data/potions.js";
import { RELICS } from "../data/relics.js";
import { createCardInstance, createPiles, discardHand, drawCards, getCardData, takeFromHand } from "./deck.js";
import { applyPoison, calculateBlock, calculateDamage, executeEffects, fireTrigger, recordEvent, reduceStatus } from "./effects.js";
import { createRng, nextInt } from "./rng.js";

// Статусы, которые убывают на 1 в конце хода владельца. Сила и Ловкость сюда не входят, у Яда свой порядок.
const DECAYING_STATUSES = ["vulnerable", "weak", "frail"];

// Создаёт бой. hp, maxHp, deck, relics и potions приходят из забега; в тестовом режиме их нет,
// тогда берём стартовые значения героя, а реликвий и зелий у него нет.
// enemyHpMultiplier и enemyStrength усиливают врагов на высокой сложности
export function createCombat({
  heroId, enemyIds, seed, hp, maxHp, deck, relics = [], potions = [], enemyHpMultiplier = 1, enemyStrength = 0,
}) {
  const rng = createRng(seed);
  const heroData = HEROES[heroId];
  const startingDeck = heroData.deck.map((cardId) => ({ cardId, upgraded: false }));

  const combat = {
    rng,
    status: "playerTurn", // playerTurn | won | lost
    turn: 0,
    energy: 0,
    hero: {
      heroId,
      hp: hp ?? heroData.maxHp,
      maxHp: maxHp ?? heroData.maxHp,
      block: 0,
      statuses: {},
      powers: [], // разыгранные карты-силы с триггерами
    },
    enemies: enemyIds.map((enemyId, index) => createEnemy(enemyId, index, rng, enemyHpMultiplier, enemyStrength)),
    piles: createPiles(deck ?? startingDeck, rng),
    relics: [...relics],
    relicCounters: {}, // счётчики реликвий «каждый N-й раз»
    potions: [...potions],
    events: [], // что произошло за последнее действие игрока: интерфейс проигрывает это как анимацию
  };

  startPlayerTurn(combat);
  // Начало боя идёт после первого хода: блок и энергия от реликвий не обнулятся
  fireTrigger(combat, "onCombatStart");
  return combat;
}

function createEnemy(enemyId, index, rng, hpMultiplier, strength) {
  const data = ENEMIES[enemyId];
  const hp = Math.floor(nextInt(rng, data.hp[0], data.hp[1]) * hpMultiplier);
  return {
    instanceId: `${enemyId}-${index}`,
    enemyId,
    hp,
    maxHp: hp,
    block: 0,
    statuses: strength > 0 ? { strength } : {},
    patternIndex: 0, // какой ход из pattern сейчас показан как намерение
  };
}

// Можно ли разыграть карту: статусы и проклятия нельзя (у них cost: null), на остальные нужна энергия
export function canPlayCard(combat, cardInstance) {
  const { cost } = getCardData(cardInstance);
  return cost !== null && cost <= combat.energy;
}

// Что показать над врагом: тип намерения, урон за удар, количество ударов и блок
export function getEnemyIntent(combat, enemy) {
  const move = getCurrentMove(enemy);
  const attacks = move.effects.filter((effect) => effect.type === "damage");
  const blockEffect = move.effects.find((effect) => effect.type === "block");
  // Статусы героя убывают в конце его хода, то есть раньше удара: считаем по тем, что останутся
  const heroWhenHit = { statuses: { ...combat.hero.statuses } };
  decayStatuses(heroWhenHit);
  return {
    intent: move.intent,
    hits: attacks.length,
    damage: attacks.length > 0 ? calculateDamage(attacks[0].amount, enemy, heroWhenHit) : 0,
    block: blockEffect ? calculateBlock(blockEffect.amount, enemy, false) : 0,
  };
}

// Разыгрывает карту из руки. Возвращает { ok: true } или { ok: false, reason: "..." }
export function playCard(combat, uid, targetId) {
  if (combat.status !== "playerTurn") return { ok: false, reason: "notPlayerTurn" };

  const instance = combat.piles.hand.find((card) => card.uid === uid);
  if (!instance) return { ok: false, reason: "cardNotInHand" };
  if (!canPlayCard(combat, instance)) return { ok: false, reason: "cannotPlay" };

  const card = getCardData(instance);
  const targets = findTargets(combat, card.target, targetId);
  if (targets.length === 0) return { ok: false, reason: "invalidTarget" };

  combat.events = [];
  combat.energy -= card.cost;
  takeFromHand(combat.piles, uid);

  // Сила остаётся до конца боя, поэтому её карта не попадает ни в одну стопку
  if (card.power) combat.hero.powers.push({ cardId: card.id, ...card.power });

  const context = { source: combat.hero, targets, fromCard: true, exhausted: false };
  executeEffects(combat, card.effects, context);
  fireTrigger(combat, "onCardPlayed", { cardType: card.type });

  if (context.exhausted) {
    combat.piles.exhaust.push(instance);
    fireTrigger(combat, "onExhaust");
  } else if (card.type !== "power") {
    combat.piles.discard.push(instance);
  }
  return { ok: true };
}

// Выпивает зелье. Возвращает { ok: true } или { ok: false, reason: "..." }
export function usePotion(combat, index, targetId) {
  if (combat.status !== "playerTurn") return { ok: false, reason: "notPlayerTurn" };

  const potion = POTIONS[combat.potions[index]];
  if (!potion) return { ok: false, reason: "noPotion" };

  const targets = findTargets(combat, potion.target, targetId);
  if (targets.length === 0) return { ok: false, reason: "invalidTarget" };

  combat.events = [];
  combat.potions.splice(index, 1);
  executeEffects(combat, potion.effects, { source: combat.hero, targets, fromCard: false });
  return { ok: true };
}

// Игрок нажал «Конец хода»: срабатывают эффекты конца хода, рука уходит в сброс, ходят враги
export function endTurn(combat) {
  if (combat.status !== "playerTurn") return;

  combat.events = [];
  fireTrigger(combat, "onTurnEnd");
  discardHand(combat.piles);
  decayStatuses(combat.hero);
  runEnemyTurn(combat);

  if (combat.status === "playerTurn") startPlayerTurn(combat);
}

// Для тестового режима: кладёт любую карту в руку. Возвращает false, если рука полна
export function addCardToHand(combat, cardId, upgraded) {
  if (combat.piles.hand.length >= CONFIG.maxHandSize) return false;
  combat.piles.hand.push(createCardInstance(combat.piles, cardId, upgraded));
  return true;
}

// Для тестового режима: даёт реликвию посреди боя. Эффект начала боя срабатывает сразу
export function addRelicToCombat(combat, relicId) {
  combat.relics.push(relicId);
  if (RELICS[relicId].trigger !== "onCombatStart") return;
  executeEffects(combat, RELICS[relicId].effects, { source: combat.hero, targets: [], fromCard: false });
}

// Для тестового режима: даёт зелье. Возвращает false, если места нет
export function addPotionToCombat(combat, potionId) {
  if (combat.potions.length >= CONFIG.maxPotions) return false;
  combat.potions.push(potionId);
  return true;
}

function startPlayerTurn(combat) {
  combat.turn += 1;
  combat.hero.block = 0;
  combat.energy = CONFIG.energyPerTurn;

  applyPoison(combat, combat.hero);
  fireTrigger(combat, "onTurnStart");
  if (combat.status !== "playerTurn") return;

  drawCards(combat.piles, CONFIG.cardsPerTurn, combat.rng);
}

function runEnemyTurn(combat) {
  for (const enemy of combat.enemies) {
    if (enemy.hp <= 0) continue;

    enemy.block = 0;
    applyPoison(combat, enemy);
    if (combat.status !== "playerTurn") return;
    if (enemy.hp <= 0) continue;

    const move = getCurrentMove(enemy);
    recordEvent(combat, { type: "enemyAction", enemyId: enemy.instanceId, intent: move.intent });
    const context = { source: enemy, targets: [combat.hero], fromCard: false };
    executeEffects(combat, move.effects, context);
    if (combat.status !== "playerTurn") return;

    decayStatuses(enemy);
    chooseNextIntent(enemy);
  }
}

function getCurrentMove(enemy) {
  const data = ENEMIES[enemy.enemyId];
  return data.moves[data.pattern[enemy.patternIndex]];
}

// Намерения идут по кругу
function chooseNextIntent(enemy) {
  const pattern = ENEMIES[enemy.enemyId].pattern;
  enemy.patternIndex = (enemy.patternIndex + 1) % pattern.length;
}

// Кого затронет карта или зелье: одного врага, всех врагов или самого героя
function findTargets(combat, targetType, targetId) {
  const alive = combat.enemies.filter((enemy) => enemy.hp > 0);
  if (targetType === "enemy") return alive.filter((enemy) => enemy.instanceId === targetId);
  if (targetType === "allEnemies") return alive;
  return [combat.hero];
}

function decayStatuses(unit) {
  for (const status of DECAYING_STATUSES) reduceStatus(unit, status);
}
