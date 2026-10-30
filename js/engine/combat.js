// Логика боя. Этот файл не трогает HTML: только меняет данные боя.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { ENEMIES } from "../data/enemies.js";
import { HEROES } from "../data/heroes.js";
import { createPiles, discardHand, drawCards, takeFromHand } from "./deck.js";
import { createRng, nextInt } from "./rng.js";

// Статусы, которые убывают на 1 в конце хода владельца. Сила сюда не входит.
const DECAYING_STATUSES = ["vulnerable"];

// Создаёт новый бой и сразу начинает первый ход игрока
export function createCombat({ heroId, enemyIds, seed }) {
  const rng = createRng(seed);
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

// Формула урона: (база + Сила) × 1.5 при Уязвимости цели, округление вниз.
// target может быть null: тогда это число для описания карты, без учёта цели.
export function calculateDamage(base, attacker, target) {
  let damage = base + (attacker.statuses.strength ?? 0);
  if (target && target.statuses.vulnerable) {
    damage *= CONFIG.vulnerableMultiplier;
  }
  return Math.floor(damage);
}

// Хватает ли энергии на эту карту
export function canAffordCard(combat, cardInstance) {
  return CARDS[cardInstance.cardId].cost <= combat.energy;
}

// Что показать над врагом: тип намерения, урон за удар и количество ударов
export function getEnemyIntent(combat, enemy) {
  const move = getCurrentMove(enemy);
  const attacks = move.effects.filter((effect) => effect.type === "damage");
  return {
    intent: move.intent,
    hits: attacks.length,
    damage: attacks.length > 0 ? calculateDamage(attacks[0].amount, enemy, combat.hero) : 0,
  };
}

// Разыгрывает карту из руки. Возвращает { ok: true } или { ok: false, reason: "..." }
export function playCard(combat, uid, targetId) {
  if (combat.status !== "playerTurn") return { ok: false, reason: "notPlayerTurn" };

  const instance = combat.piles.hand.find((card) => card.uid === uid);
  if (!instance) return { ok: false, reason: "cardNotInHand" };
  if (!canAffordCard(combat, instance)) return { ok: false, reason: "notEnoughEnergy" };

  const card = CARDS[instance.cardId];
  const target = findCardTarget(combat, card, targetId);
  if (!target) return { ok: false, reason: "invalidTarget" };

  combat.energy -= card.cost;
  takeFromHand(combat.piles, uid);
  runEffects(combat, card.effects, combat.hero, target);
  combat.piles.discard.push(instance);
  return { ok: true };
}

// Игрок нажал «Конец хода»: рука уходит в сброс, ходят враги, начинается новый ход
export function endTurn(combat) {
  if (combat.status !== "playerTurn") return;

  discardHand(combat.piles);
  decayStatuses(combat.hero);
  runEnemyTurn(combat);

  if (combat.status === "playerTurn") startPlayerTurn(combat);
}

function startPlayerTurn(combat) {
  combat.turn += 1;
  combat.hero.block = 0;
  combat.energy = CONFIG.energyPerTurn;
  drawCards(combat.piles, CONFIG.cardsPerTurn, combat.rng);
}

function runEnemyTurn(combat) {
  for (const enemy of combat.enemies) {
    if (enemy.hp <= 0) continue;

    enemy.block = 0;
    runEffects(combat, getCurrentMove(enemy).effects, enemy, combat.hero);
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

function findCardTarget(combat, card, targetId) {
  if (card.target === "self") return combat.hero;
  return combat.enemies.find((enemy) => enemy.instanceId === targetId && enemy.hp > 0);
}

// Исполняет эффекты по очереди; после каждого проверяет победу и поражение
function runEffects(combat, effects, source, target) {
  for (const effect of effects) {
    applyEffect(effect, source, effect.target === "self" ? source : target);
    checkCombatEnd(combat);
    if (combat.status !== "playerTurn") return;
  }
}

function applyEffect(effect, source, target) {
  if (effect.type === "damage") {
    dealDamage(target, calculateDamage(effect.amount, source, target));
  } else if (effect.type === "block") {
    target.block += effect.amount;
  } else if (effect.type === "applyStatus") {
    target.statuses[effect.status] = (target.statuses[effect.status] ?? 0) + effect.amount;
  }
}

// Урон сначала снимает блок, остаток — HP
function dealDamage(target, damage) {
  const absorbed = Math.min(target.block, damage);
  target.block -= absorbed;
  target.hp = Math.max(0, target.hp - (damage - absorbed));
}

function decayStatuses(unit) {
  for (const status of DECAYING_STATUSES) {
    if (!unit.statuses[status]) continue;
    unit.statuses[status] -= 1;
    if (unit.statuses[status] === 0) delete unit.statuses[status];
  }
}

function checkCombatEnd(combat) {
  if (combat.hero.hp <= 0) {
    combat.status = "lost";
  } else if (combat.enemies.every((enemy) => enemy.hp <= 0)) {
    combat.status = "won";
  }
}
