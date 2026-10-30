// Исполнение эффектов в бою: от карт, врагов, сил, реликвий и зелий.
// Новый тип эффекта — новая запись в EFFECT_HANDLERS.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { RELICS } from "../data/relics.js";
import { createCardInstance, drawCards } from "./deck.js";

// Формула урона: (база + Сила) × 0.75 при Слабости × 1.5 при Уязвимости цели, округление вниз.
// target может быть null: тогда это число для описания карты, без учёта цели.
export function calculateDamage(base, attacker, target) {
  let damage = base + (attacker.statuses.strength ?? 0);
  if (attacker.statuses.weak) damage *= CONFIG.weakMultiplier;
  if (target && target.statuses.vulnerable) damage *= CONFIG.vulnerableMultiplier;
  return Math.floor(damage);
}

// Ловкость прибавляется только к блоку от карт, Хрупкость уменьшает любой блок
export function calculateBlock(base, unit, fromCard) {
  let block = base + (fromCard ? unit.statuses.dexterity ?? 0 : 0);
  if (unit.statuses.frail) block *= CONFIG.frailMultiplier;
  return Math.floor(block);
}

// Исполняет эффекты по очереди; после каждого проверяет победу и поражение.
// context: source — кто действует, targets — цели, fromCard — эффект идёт от разыгранной карты
export function executeEffects(combat, effects, context) {
  for (const effect of effects) {
    if (combat.status !== "playerTurn") return;
    EFFECT_HANDLERS[effect.type](combat, effect, context);
    checkCombatEnd(combat);
  }
}

// Запускает силы и реликвии героя с этим триггером. details.cardType — тип разыгранной карты
export function fireTrigger(combat, trigger, details = {}) {
  for (const power of combat.hero.powers) {
    const typeMatches = !power.cardType || power.cardType === details.cardType;
    if (power.trigger === trigger && typeMatches) runTriggerEffects(combat, power.effects);
  }
  for (const relicId of combat.relics) {
    const relic = RELICS[relicId];
    if (relic.trigger === trigger && relicConditionMet(combat, relic, details)) {
      runTriggerEffects(combat, relic.effects);
    }
  }
}

function runTriggerEffects(combat, effects) {
  executeEffects(combat, effects, { source: combat.hero, targets: [], fromCard: false });
}

// Проверяет условия реликвии: нужный тип карты и «каждый N-й раз»
function relicConditionMet(combat, relic, details) {
  if (relic.cardType && relic.cardType !== details.cardType) return false;
  if (!relic.everyN) return true;
  const count = (combat.relicCounters[relic.id] ?? 0) + 1;
  combat.relicCounters[relic.id] = count;
  return count % relic.everyN === 0;
}

// Записывает, что произошло в бою. Логика считается мгновенно, а интерфейс потом
// проигрывает эти события по очереди: удары, числа урона, изменение HP
export function recordEvent(combat, event) {
  (combat.events ??= []).push(event);
}

function unitId(combat, unit) {
  return unit === combat.hero ? "hero" : unit.instanceId;
}

// Яд: урон равен числу стаков, игнорирует блок, потом стаков становится на 1 меньше
export function applyPoison(combat, unit) {
  const stacks = unit.statuses.poison;
  if (!stacks) return;
  unit.hp = Math.max(0, unit.hp - stacks);
  recordEvent(combat, { type: "poison", targetId: unitId(combat, unit), amount: stacks, hp: unit.hp, block: unit.block });
  reduceStatus(unit, "poison");
  notifyIfEnemyDied(combat, unit);
  checkCombatEnd(combat);
}

export function reduceStatus(unit, status) {
  if (!unit.statuses[status]) return;
  unit.statuses[status] -= 1;
  if (unit.statuses[status] === 0) delete unit.statuses[status];
}

function checkCombatEnd(combat) {
  if (combat.hero.hp <= 0) {
    combat.status = "lost";
  } else if (combat.enemies.every((enemy) => enemy.hp <= 0)) {
    combat.status = "won";
  }
}

function notifyIfEnemyDied(combat, unit) {
  if (unit !== combat.hero && unit.hp === 0) fireTrigger(combat, "onEnemyDeath");
}

// target в эффекте главнее целей карты: "self" — сам действующий, "allEnemies" — все живые враги
function getTargets(combat, effect, context) {
  if (effect.target === "self") return [context.source];
  if (effect.target === "allEnemies") return combat.enemies.filter((enemy) => enemy.hp > 0);
  return context.targets.filter((target) => target.hp > 0);
}

// Урон сначала снимает блок, остаток — HP
function dealDamage(combat, source, target, damage) {
  const absorbed = Math.min(target.block, damage);
  const hpLost = damage - absorbed;
  target.block -= absorbed;
  target.hp = Math.max(0, target.hp - hpLost);
  recordEvent(combat, {
    type: "hit",
    sourceId: unitId(combat, source),
    targetId: unitId(combat, target),
    hpLost,
    blocked: absorbed,
    hp: target.hp,
    block: target.block,
  });
  if (target === combat.hero && hpLost > 0) fireTrigger(combat, "onDamageTaken");
  notifyIfEnemyDied(combat, target);
}

const EFFECT_HANDLERS = {
  damage(combat, effect, context) {
    for (const target of getTargets(combat, effect, context)) {
      const amount = effect.fixed ? effect.amount : calculateDamage(effect.amount, context.source, target);
      dealDamage(combat, context.source, target, amount);
    }
  },
  block(combat, effect, context) {
    for (const target of getTargets(combat, effect, context)) {
      const amount = calculateBlock(effect.amount, target, context.fromCard);
      target.block += amount;
      recordEvent(combat, { type: "block", targetId: unitId(combat, target), amount, hp: target.hp, block: target.block });
    }
  },
  applyStatus(combat, effect, context) {
    for (const target of getTargets(combat, effect, context)) {
      target.statuses[effect.status] = (target.statuses[effect.status] ?? 0) + effect.amount;
      recordEvent(combat, { type: "status", targetId: unitId(combat, target), status: effect.status, amount: effect.amount });
    }
  },
  heal(combat, effect, context) {
    const unit = context.source;
    const before = unit.hp;
    unit.hp = Math.min(unit.maxHp, unit.hp + effect.amount);
    recordEvent(combat, { type: "heal", targetId: unitId(combat, unit), amount: unit.hp - before, hp: unit.hp, block: unit.block });
  },
  // Плата своим HP за сильную карту: блок не помогает, силы «при потере HP от атаки» не срабатывают
  loseHp(combat, effect, context) {
    const unit = context.source;
    unit.hp = Math.max(0, unit.hp - effect.amount);
    recordEvent(combat, { type: "hpLoss", targetId: unitId(combat, unit), amount: effect.amount, hp: unit.hp, block: unit.block });
  },
  draw(combat, effect) {
    drawCards(combat.piles, effect.amount, combat.rng);
  },
  gainEnergy(combat, effect) {
    combat.energy += effect.amount;
  },
  addCard(combat, effect) {
    combat.piles[effect.pile].push(createCardInstance(combat.piles, effect.cardId));
  },
  // Сжигает разыгранную карту: куда её положить, решает playCard, когда эффекты закончатся
  exhaust(combat, effect, context) {
    context.exhausted = true;
  },
  // Умножает статус цели: например, удваивает Яд. Если статуса нет, ничего не происходит
  multiplyStatus(combat, effect, context) {
    for (const target of getTargets(combat, effect, context)) {
      if (target.statuses[effect.status]) target.statuses[effect.status] *= effect.factor;
    }
  },
  // Сжигает все Раны и другие карты, которые нельзя разыграть, из руки
  exhaustWounds(combat) {
    const { piles } = combat;
    const wounds = piles.hand.filter((card) => CARDS[card.cardId].cost === null);
    piles.hand = piles.hand.filter((card) => !wounds.includes(card));
    for (const card of wounds) {
      piles.exhaust.push(card);
      fireTrigger(combat, "onExhaust");
    }
  },
};
