// Все враги игры. hp — диапазон, pattern — порядок ходов по кругу.

// Короткие записи для одинаковых ходов. Числа врагов меняй прямо в таблице ниже.
const attack = (damage, hits = 1) => ({
  intent: "attack",
  effects: Array.from({ length: hits }, () => ({ type: "damage", amount: damage })),
});
const guard = (block) => ({ intent: "defend", effects: [{ type: "block", amount: block, target: "self" }] });
const buff = (strength, block = 0) => ({
  intent: "buff",
  effects: [
    { type: "applyStatus", status: "strength", amount: strength, target: "self" },
    ...(block > 0 ? [{ type: "block", amount: block, target: "self" }] : []),
  ],
});
// statuses: { weak: 2, frail: 1 }; wounds — сколько Ран добавить в сброс героя
const debuff = (statuses, wounds = 0) => ({
  intent: "debuff",
  effects: [
    ...Object.entries(statuses).map(([status, amount]) => ({ type: "applyStatus", status, amount })),
    ...Array.from({ length: wounds }, () => ({ type: "addCard", cardId: "wound", pile: "discard" })),
  ],
});

export const ENEMIES = {
  // Акт 1: обычные
  cultist: {
    id: "cultist",
    name: "Культист",
    hp: [48, 54],
    moves: { ritual: buff(3), slash: attack(6) },
    pattern: ["ritual", "slash", "slash"],
  },
  skeleton: {
    id: "skeleton",
    name: "Скелет",
    hp: [36, 42],
    moves: { hack: attack(9), guard: guard(9), flurry: attack(4, 2) },
    pattern: ["hack", "guard", "flurry"],
  },
  spider: {
    id: "spider",
    name: "Паук",
    hp: [18, 24],
    moves: { bite: attack(5), venom: debuff({ poison: 3 }), web: debuff({ weak: 2, frail: 2 }) },
    pattern: ["bite", "venom", "web"],
  },

  // Акт 1: элита
  fallen_knight: {
    id: "fallen_knight",
    name: "Падший рыцарь",
    hp: [72, 78],
    moves: { curse: debuff({ vulnerable: 2 }, 1), slam: attack(13), combo: attack(6, 2), fortify: buff(2, 8) },
    pattern: ["curse", "slam", "combo", "fortify"],
  },
  grave_hound: {
    id: "grave_hound",
    name: "Могильный пёс",
    hp: [62, 68],
    moves: { maul: attack(5, 3), howl: buff(3), rend: attack(15) },
    pattern: ["maul", "howl", "rend"],
  },

  // Акт 1: босс
  crypt_warden: {
    id: "crypt_warden",
    name: "Хранитель склепа",
    hp: [150, 150],
    moves: { hex: debuff({ weak: 2, frail: 2 }, 1), scythe: attack(15), flurry: attack(5, 3), fortify: buff(2, 12) },
    pattern: ["hex", "scythe", "flurry", "fortify"],
  },

  // Акт 2: обычные
  ghoul: {
    id: "ghoul",
    name: "Упырь",
    hp: [48, 54],
    moves: { claw: attack(8), infect: debuff({ poison: 5 }), frenzy: attack(5, 2) },
    pattern: ["claw", "infect", "frenzy"],
  },
  bandit: {
    id: "bandit",
    name: "Разбойник",
    hp: [35, 40],
    moves: { stab: attack(9), dodge: guard(12), trip: debuff({ vulnerable: 2 }) },
    pattern: ["trip", "stab", "dodge"],
  },
  banshee: {
    id: "banshee",
    name: "Банши",
    hp: [30, 35],
    moves: { wail: debuff({ weak: 2, frail: 2 }), scream: attack(7, 2) },
    pattern: ["wail", "scream"],
  },
  gargoyle: {
    id: "gargoyle",
    name: "Горгулья",
    hp: [56, 62],
    moves: { harden: guard(16), dive: attack(12) },
    pattern: ["harden", "dive"],
  },
  warlock: {
    id: "warlock",
    name: "Чернокнижник",
    hp: [42, 46],
    moves: { ritual: buff(3), bolt: attack(8), wither: debuff({ vulnerable: 2 }, 1) },
    pattern: ["ritual", "bolt", "wither"],
  },
  rat_swarm: {
    id: "rat_swarm",
    name: "Стая крыс",
    hp: [21, 24],
    moves: { gnaw: attack(2, 3), plague: debuff({ poison: 3 }) },
    pattern: ["gnaw", "gnaw", "plague"],
  },

  // Акт 2: элита
  bone_colossus: {
    id: "bone_colossus",
    name: "Костяной колосс",
    hp: [100, 108],
    moves: { smash: attack(15), brace: buff(2, 18), sweep: attack(6, 3) },
    pattern: ["sweep", "brace", "smash"],
  },
  witch_queen: {
    id: "witch_queen",
    name: "Королева ведьм",
    hp: [80, 88],
    moves: { hex: debuff({ vulnerable: 2, weak: 2 }, 1), curse: debuff({ poison: 8 }), lash: attack(8, 2) },
    pattern: ["hex", "lash", "curse", "lash"],
  },

  // Акт 2: босс
  vampire_lord: {
    id: "vampire_lord",
    name: "Лорд вампиров",
    hp: [204, 204],
    moves: { drain: debuff({ weak: 2, vulnerable: 2 }, 1), bite: attack(16), swarm: attack(5, 4), feast: buff(3, 18) },
    pattern: ["drain", "bite", "swarm", "feast"],
  },

  // Акт 3: обычные
  wraith: {
    id: "wraith",
    name: "Призрак",
    hp: [44, 50],
    moves: { touch: attack(10), fade: guard(16), chill: debuff({ weak: 2, frail: 2 }) },
    pattern: ["chill", "touch", "fade"],
  },
  golem: {
    id: "golem",
    name: "Голем",
    hp: [79, 86],
    moves: { slam: attack(15), rebuild: guard(20), stomp: attack(6, 2) },
    pattern: ["stomp", "rebuild", "slam"],
  },
  blood_priest: {
    id: "blood_priest",
    name: "Жрец крови",
    hp: [54, 60],
    moves: { offering: buff(4), sacrifice: attack(9), curse: debuff({ vulnerable: 2 }, 2) },
    pattern: ["offering", "sacrifice", "curse"],
  },
  assassin: {
    id: "assassin",
    name: "Убийца",
    hp: [38, 42],
    moves: { mark: debuff({ vulnerable: 3 }), strike: attack(17), vanish: guard(18) },
    pattern: ["mark", "strike", "vanish"],
  },
  hellhound: {
    id: "hellhound",
    name: "Адская гончая",
    hp: [50, 54],
    moves: { bite: attack(5, 3), burn: debuff({ poison: 7 }), lunge: attack(13) },
    pattern: ["bite", "burn", "lunge"],
  },
  acolyte: {
    id: "acolyte",
    name: "Послушник лича",
    hp: [35, 39],
    moves: { bolt: attack(11), ward: guard(14), drain: debuff({ weak: 2 }, 1) },
    pattern: ["bolt", "drain", "ward"],
  },

  // Акт 3: элита
  death_knight: {
    id: "death_knight",
    name: "Рыцарь смерти",
    hp: [128, 139],
    moves: { cleave: attack(19), dread: debuff({ vulnerable: 2, frail: 2 }, 1), combo: attack(8, 3), oath: buff(3, 22) },
    pattern: ["dread", "cleave", "combo", "oath"],
  },
  demon: {
    id: "demon",
    name: "Демон бездны",
    hp: [113, 124],
    moves: { rend: attack(6, 4), flames: debuff({ poison: 10 }), roar: buff(4), crush: attack(21) },
    pattern: ["rend", "flames", "roar", "crush"],
  },

  // Акт 3: босс
  lich_king: {
    id: "lich_king",
    name: "Король-лич",
    hp: [272, 272],
    moves: {
      doom: debuff({ vulnerable: 2, weak: 2, frail: 2 }, 2),
      soulfire: attack(20),
      barrage: attack(6, 4),
      phylactery: buff(4, 26),
      plague: debuff({ poison: 12 }),
    },
    pattern: ["doom", "soulfire", "barrage", "plague", "phylactery"],
  },
};

// Акты: группы врагов для обычных боёв, элита и босс. Номер акта — индекс в массиве плюс 1
export const ACTS = [
  {
    encounters: [
      ["cultist"],
      ["skeleton"],
      ["spider", "spider"],
      ["skeleton", "spider"],
      ["spider", "spider", "spider"],
    ],
    elites: [["fallen_knight"], ["grave_hound"]],
    boss: ["crypt_warden"],
  },
  {
    encounters: [
      ["ghoul"],
      ["gargoyle"],
      ["bandit", "banshee"],
      ["warlock", "rat_swarm"],
      ["rat_swarm", "rat_swarm", "rat_swarm"],
      ["banshee", "bandit", "rat_swarm"],
    ],
    elites: [["bone_colossus"], ["witch_queen"]],
    boss: ["vampire_lord"],
  },
  {
    encounters: [
      ["golem"],
      ["wraith", "acolyte"],
      ["blood_priest", "assassin"],
      ["hellhound", "wraith"],
      ["assassin", "acolyte", "acolyte"],
      ["hellhound", "blood_priest"],
    ],
    elites: [["death_knight"], ["demon"]],
    boss: ["lich_king"],
  },
];
