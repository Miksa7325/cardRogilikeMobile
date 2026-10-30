// Все карты игры. Новая карта — новая запись здесь.
// В описании {damage}, {block} и {имя статуса} заменяются на итоговые числа.
export const CARDS = {
  strike: {
    id: "strike",
    name: "Удар",
    type: "attack",
    rarity: "starter",
    cost: 1,
    target: "enemy",
    effects: [{ type: "damage", amount: 6 }],
    description: "Нанести {damage} урона.",
  },
  defend: {
    id: "defend",
    name: "Защита",
    type: "skill",
    rarity: "starter",
    cost: 1,
    target: "self",
    effects: [{ type: "block", amount: 5 }],
    description: "Получить {block} блока.",
  },
  bash: {
    id: "bash",
    name: "Сокрушение",
    type: "attack",
    rarity: "starter",
    cost: 2,
    target: "enemy",
    effects: [
      { type: "damage", amount: 8 },
      { type: "applyStatus", status: "vulnerable", amount: 2 },
    ],
    description: "Нанести {damage} урона. {vulnerable} Уязвимости.",
  },
};
