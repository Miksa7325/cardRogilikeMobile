// Короткие записи для карт: большие таблицы карт героев собираются из них.
export const damage = (amount) => ({ type: "damage", amount });
export const hits = (amount, times) => Array.from({ length: times }, () => damage(amount));
export const fixedDamageToAll = (amount) => ({ type: "damage", amount, fixed: true, target: "allEnemies" });
export const block = (amount) => ({ type: "block", amount, target: "self" });
export const status = (name, amount) => ({ type: "applyStatus", status: name, amount });
export const selfStatus = (name, amount) => ({ ...status(name, amount), target: "self" });
export const allStatus = (name, amount) => ({ ...status(name, amount), target: "allEnemies" });
export const draw = (amount) => ({ type: "draw", amount });
export const energy = (amount) => ({ type: "gainEnergy", amount });
export const heal = (amount) => ({ type: "heal", amount });
export const loseHp = (amount) => ({ type: "loseHp", amount });
export const multiplyStatus = (name, factor) => ({ type: "multiplyStatus", status: name, factor });
export const exhaustWounds = { type: "exhaustWounds" };
export const wound = { type: "addCard", cardId: "wound", pile: "discard" };
export const burn = { type: "exhaust" };

// Порядок: id, название, тип, редкость, стоимость, цель, описание, эффекты, улучшение, сила
export function card(id, name, type, rarity, cost, target, description, effects, upgraded, power) {
  return { id, name, type, rarity, cost, target, description, effects, upgraded, ...(power ? { power } : {}) };
}

// Карта-сила с триггером. upgradedEffects — эффекты улучшенной версии
export function triggerPower(id, name, rarity, cost, description, trigger, effects, upgradedEffects, cardType) {
  const power = (list) => ({ trigger, ...(cardType ? { cardType } : {}), effects: list });
  return card(id, name, "power", rarity, cost, "self", description, [], { power: power(upgradedEffects) }, power(effects));
}

// То же, но улучшение только снижает стоимость
export function cheaperPower(id, name, rarity, cost, description, trigger, effects, upgradedCost, cardType) {
  const power = { trigger, ...(cardType ? { cardType } : {}), effects };
  return card(id, name, "power", rarity, cost, "self", description, [], { cost: upgradedCost }, power);
}
