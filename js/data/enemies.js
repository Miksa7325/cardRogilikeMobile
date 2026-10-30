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
  skeleton: {
    id: "skeleton",
    name: "Скелет",
    hp: [36, 42],
    moves: {
      hack: {
        intent: "attack",
        effects: [{ type: "damage", amount: 9 }],
      },
      guard: {
        intent: "defend",
        effects: [{ type: "block", amount: 9, target: "self" }],
      },
      flurry: {
        intent: "attack",
        effects: [
          { type: "damage", amount: 4 },
          { type: "damage", amount: 4 },
        ],
      },
    },
    pattern: ["hack", "guard", "flurry"],
  },
  spider: {
    id: "spider",
    name: "Паук",
    hp: [18, 24],
    moves: {
      bite: {
        intent: "attack",
        effects: [{ type: "damage", amount: 5 }],
      },
      venom: {
        intent: "debuff",
        effects: [{ type: "applyStatus", status: "poison", amount: 3 }],
      },
      web: {
        intent: "debuff",
        effects: [
          { type: "applyStatus", status: "weak", amount: 2 },
          { type: "applyStatus", status: "frail", amount: 2 },
        ],
      },
    },
    pattern: ["bite", "venom", "web"],
  },

  // Элита
  fallen_knight: {
    id: "fallen_knight",
    name: "Падший рыцарь",
    hp: [72, 78],
    moves: {
      curse: {
        intent: "debuff",
        effects: [
          { type: "applyStatus", status: "vulnerable", amount: 2 },
          { type: "addCard", cardId: "wound", pile: "discard" },
        ],
      },
      slam: {
        intent: "attack",
        effects: [{ type: "damage", amount: 13 }],
      },
      combo: {
        intent: "attack",
        effects: [
          { type: "damage", amount: 6 },
          { type: "damage", amount: 6 },
        ],
      },
      fortify: {
        intent: "buff",
        effects: [
          { type: "applyStatus", status: "strength", amount: 2, target: "self" },
          { type: "block", amount: 8, target: "self" },
        ],
      },
    },
    pattern: ["curse", "slam", "combo", "fortify"],
  },

  // Босс акта 1
  crypt_warden: {
    id: "crypt_warden",
    name: "Хранитель склепа",
    hp: [150, 150],
    moves: {
      hex: {
        intent: "debuff",
        effects: [
          { type: "applyStatus", status: "weak", amount: 2 },
          { type: "applyStatus", status: "frail", amount: 2 },
          { type: "addCard", cardId: "wound", pile: "discard" },
        ],
      },
      scythe: {
        intent: "attack",
        effects: [{ type: "damage", amount: 15 }],
      },
      flurry: {
        intent: "attack",
        effects: [
          { type: "damage", amount: 5 },
          { type: "damage", amount: 5 },
          { type: "damage", amount: 5 },
        ],
      },
      fortify: {
        intent: "buff",
        effects: [
          { type: "applyStatus", status: "strength", amount: 2, target: "self" },
          { type: "block", amount: 12, target: "self" },
        ],
      },
    },
    pattern: ["hex", "scythe", "flurry", "fortify"],
  },
};

// Группы врагов для обычного боя: из них случайно выбирается одна
export const ENCOUNTERS = [
  ["cultist"],
  ["skeleton"],
  ["spider", "spider"],
  ["skeleton", "spider"],
  ["spider", "spider", "spider"],
];

export const ELITE_ENCOUNTERS = [["fallen_knight"]];

export const BOSS_ENCOUNTER = ["crypt_warden"];
