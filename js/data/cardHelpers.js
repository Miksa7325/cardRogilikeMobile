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

// Механики классов. Ресурсы — статусы героя: rage — Ярость, combo — Комбо, darkness — Тьма, reagents — Реагенты.
// spend: потратить N ресурса на эффекты; если ресурса меньше, ничего не случится
export const spend = (resource, amount, effects) => ({ type: "spend", status: resource, amount, effects });
// grow: эффект растёт на per за каждую единицу ресурса: grow(damage(4), "rage", 2) — 4 урона +2 за Ярость
export const grow = (effect, resource, per) => ({ ...effect, bonus: { status: resource, per } });
export const gainResource = (resource, amount) => selfStatus(resource, amount);
// brew: Алхимик варит зелье в бою
export const brew = (amount = 1) => ({ type: "brewPotion", amount });

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
