// Исполнение эффектов в бою: от карт, врагов, сил, реликвий и зелий.
// Новый тип эффекта — новая запись в EFFECT_HANDLERS.
import { CONFIG } from "../config.js";
import { CARDS } from "../data/cards.js";
import { RELICS } from "../data/relics.js";
import { createCardInstance, drawCards } from "./deck.js";
import { nextInt } from "./rng.js";

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

// Прибавка к числу эффекта за ресурс героя: bonus: { status: "rage", per: 2 } — +2 за каждую Ярость.
// Так работают карты, которые растут от Ярости, Комбо, Тьмы и Реагентов
export function getBonus(effect, unit) {
  return effect.bonus ? effect.bonus.per * (unit.statuses[effect.bonus.status] ?? 0) : 0;
}

// Запускает силы, реликвии и врождённую особенность класса героя с этим триггером.
// details.cardType — тип разыгранной карты
export function fireTrigger(combat, trigger, details = {}) {
  for (const power of [...combat.hero.powers, ...(combat.hero.passives ?? [])]) {
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

// Счётчики боя для заданий: сколько карт разыграно, урона нанесено и зелий выпито
export function addTally(combat, key, amount = 1) {
  combat.tally ??= {};
  combat.tally[key] = (combat.tally[key] ?? 0) + amount;
}

function unitId(combat, unit) {
  return unit === combat.hero ? "hero" : unit.instanceId;
}

// Яд: урон равен числу стаков, игнорирует блок, потом стаков становится на 1 меньше
export function applyPoison(combat, unit) {
  const stacks = unit.statuses.poison;
  if (!stacks) return;
  // В задания идут только реально снятые HP: удар сильнее, чем осталось у врага, не накручивает счётчик
  if (unit !== combat.hero) addTally(combat, "damageDealt", Math.min(unit.hp, stacks));
  unit.hp = Math.max(0, unit.hp - stacks);
  recordEvent(combat, { type: "poison", targetId: unitId(combat, unit), amount: stacks, hp: unit.hp, block: unit.block });
  reduceStatus(unit, "poison");
  notifyIfEnemyDied(combat, unit);
  checkCombatEnd(combat);
}

// Печать крови на враге: он теряет HP по числу стаков мимо блока, а герой лечится на столько же.
// Стаки складываются, а после каждого срабатывания их становится на 1 меньше — как у Яда
export function applyLeech(combat, unit) {
  const stacks = unit.statuses.leech;
  if (!stacks || unit === combat.hero) return;
  const drained = Math.min(unit.hp, stacks);
  addTally(combat, "damageDealt", drained);
  unit.hp -= drained;
  recordEvent(combat, { type: "leech", targetId: unitId(combat, unit), amount: stacks, hp: unit.hp, block: unit.block });
  const hero = combat.hero;
  const before = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + drained);
  recordEvent(combat, { type: "heal", targetId: "hero", amount: hero.hp - before, hp: hero.hp, block: hero.block });
  reduceStatus(unit, "leech");
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
  if (target !== combat.hero) addTally(combat, "damageDealt", Math.min(target.hp, hpLost));
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
      const base = effect.amount + getBonus(effect, context.source);
      const amount = effect.fixed ? base : calculateDamage(base, context.source, target);
      dealDamage(combat, context.source, target, amount);
    }
  },
  block(combat, effect, context) {
    for (const target of getTargets(combat, effect, context)) {
      const amount = calculateBlock(effect.amount + getBonus(effect, context.source), target, context.fromCard);
      target.block += amount;
      recordEvent(combat, { type: "block", targetId: unitId(combat, target), amount, hp: target.hp, block: target.block });
    }
  },
  applyStatus(combat, effect, context) {
    const amount = effect.amount + getBonus(effect, context.source);
    if (amount <= 0) return;
    for (const target of getTargets(combat, effect, context)) {
      target.statuses[effect.status] = (target.statuses[effect.status] ?? 0) + amount;
      recordEvent(combat, { type: "status", targetId: unitId(combat, target), status: effect.status, amount });
    }
  },
  // Тратит ресурс героя (Ярость, Комбо, Тьму, Реагенты) на сильный эффект. Если ресурса не хватает, ничего не происходит
  spend(combat, effect, context) {
    const unit = context.source;
    if ((unit.statuses[effect.status] ?? 0) < effect.amount) return;
    unit.statuses[effect.status] -= effect.amount;
    if (unit.statuses[effect.status] === 0) delete unit.statuses[effect.status];
    executeEffects(combat, effect.effects, context);
  },
  // Алхимик варит случайное зелье прямо в бою, если в сумке есть место
  brewPotion(combat, effect) {
    for (let i = 0; i < effect.amount; i++) {
      if (combat.potions.length >= combat.maxPotions || combat.potionPool.length === 0) return;
      combat.potions.push(combat.potionPool[nextInt(combat.rng, 0, combat.potionPool.length - 1)]);
      fireTrigger(combat, "onPotionBrewed");
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
    // Чернокнижник копит Тьму, когда платит своим здоровьем
    if (unit === combat.hero && unit.hp > 0) fireTrigger(combat, "onHpPaid");
  },
  draw(combat, effect) {
    drawCards(combat.piles, effect.amount, combat.rng);
  },
  // Энергия может расти от ресурса: так Маг получает энергию за Прилив
  gainEnergy(combat, effect, context) {
    combat.energy += effect.amount + getBonus(effect, context.source);
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
      fireTrigger(combat, "onWoundBurned");
    }
  },
};
