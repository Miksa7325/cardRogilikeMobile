// Все враги игры. hp — диапазон, pattern — порядок ходов по кругу.
export const ENEMIES = {
  cultist: {
    id: "cultist",
    name: "Культист",
    hp: [48, 54],
    moves: {
      ritual: {
        intent: "buff",
        effects: [{ type: "applyStatus", status: "strength", amount: 3, target: "self" }],
      },
      slash: {
        intent: "attack",
        effects: [{ type: "damage", amount: 6 }],
      },
    },
    pattern: ["ritual", "slash", "slash"],
  },
};
