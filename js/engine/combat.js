// Логика боя. Этот файл не трогает HTML: только меняет данные боя.
import { CONFIG } from "../config.js";
import { ENCOUNTERS, ENEMIES } from "../data/enemies.js";
import { HEROES } from "../data/heroes.js";
import { createCardInstance, createPiles, discardHand, drawCards, getCardData, takeFromHand } from "./deck.js";
import { applyPoison, calculateBlock, calculateDamage, executeEffects, fireTrigger, reduceStatus } from "./effects.js";
import { createRng, nextInt } from "./rng.js";

// Статусы, которые убывают на 1 в конце хода владельца. Сила и Ловкость сюда не входят, у Яда свой порядок.
const DECAYING_STATUSES = ["vulnerable", "weak", "frail"];

// Создаёт бой со случайной группой врагов из ENCOUNTERS
export function createRandomCombat({ heroId, seed }) {
  const rng = createRng(seed);
  const enemyIds = ENCOUNTERS[nextInt(rng, 0, ENCOUNTERS.length - 1)];
  return buildCombat(heroId, enemyIds, rng);
}

// Создаёт бой с заданными врагами
export function createCombat({ heroId, enemyIds, seed }) {
  return buildCombat(heroId, enemyIds, createRng(seed));
}

function buildCombat(heroId, enemyIds, rng) {
  const heroData = HEROES[heroId];

  const combat = {
    rng,
    status: "playerTurn", // playerTurn | won | lost
    turn: 0,
    energy: 0,
    hero: {
      heroId,
      hp: heroData.maxHp,
      maxHp: heroData.maxHp,
      block: 0,
      statuses: {},
      powers: [], // разыгранные карты-силы с триггерами
    },
    enemies: enemyIds.map((enemyId, index) => createEnemy(enemyId, index, rng)),
    piles: createPiles(heroData.deck, rng),
  };

  startPlayerTurn(combat);
  return combat;
}

function createEnemy(enemyId, index, rng) {
  const data = ENEMIES[enemyId];
  const hp = nextInt(rng, data.hp[0], data.hp[1]);
  return {
    instanceId: `${enemyId}-${index}`,
    enemyId,
    hp,
    maxHp: hp,
    block: 0,
    statuses: {},
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
  const targets = findCardTargets(combat, card, targetId);
  if (targets.length === 0) return { ok: false, reason: "invalidTarget" };

  combat.energy -= card.cost;
  takeFromHand(combat.piles, uid);

  // Сила остаётся до конца боя, поэтому её карта не попадает ни в одну стопку
  if (card.power) combat.hero.powers.push({ cardId: card.id, ...card.power });

  const context = { source: combat.hero, targets, fromCard: true, exhausted: false };
  executeEffects(combat, card.effects, context);

  if (context.exhausted) {
    combat.piles.exhaust.push(instance);
  } else if (card.type !== "power") {
    combat.piles.discard.push(instance);
  }
  return { ok: true };
}

// Игрок нажал «Конец хода»: срабатывают эффекты конца хода, рука уходит в сброс, ходят враги
export function endTurn(combat) {
  if (combat.status !== "playerTurn") return;

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

    const context = { source: enemy, targets: [combat.hero], fromCard: false };
    executeEffects(combat, getCurrentMove(enemy).effects, context);
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

function findCardTargets(combat, card, targetId) {
  const alive = combat.enemies.filter((enemy) => enemy.hp > 0);
  if (card.target === "enemy") return alive.filter((enemy) => enemy.instanceId === targetId);
  if (card.target === "allEnemies") return alive;
  return [combat.hero];
}

function decayStatuses(unit) {
  for (const status of DECAYING_STATUSES) reduceStatus(unit, status);
}
