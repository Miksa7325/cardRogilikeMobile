// Акты подземелья. Каждый следующий опаснее, у каждого своя особенность, а награды в нём ценнее.
// encounters, elites, boss — группы врагов из data/enemies.js. enemyHpMultiplier — во сколько раз враги акта крепче.
// mechanic — особенность акта: name и text видит игрок, остальное — её числа:
//   deadEnds — сколько боковых туннелей с тупиком (вместо CONFIG.map.deadEnds)
//   coldWater — сколько HP стоит шаг в неизведанную комнату
//   enemyBlock — с каким блоком враги начинают бой
//   heroPoison — сколько Яда у героя в начале боя
//   noRest — в акте нет отдыха; enemyStrength — Сила всех врагов
// rewards: essences — множитель эссенций за бои, rarityWeights — шансы редкости карт в наградах,
//   relics — какой редкости реликвии у элит и в сундуках, potionChance — шанс зелья после боя.
// startPrice — сколько золота из казны стоит начать забег с этого акта: так можно не проходить уже пройденные
export const ACTS = [
  {
    name: "Катакомбы",
    mechanic: { name: "Лабиринт", text: "Боковых туннелей с тупиками здесь больше обычного.", deadEnds: 6 },
    encounters: [
      ["cultist"],
      ["skeleton"],
      ["spider", "spider"],
      ["skeleton", "spider"],
      ["spider", "spider", "spider"],
    ],
    elites: [["fallen_knight"], ["grave_hound"]],
    boss: ["crypt_warden"],
    enemyHpMultiplier: 1,
    rewards: { essences: 1, rarityWeights: { common: 60, uncommon: 30, rare: 10 }, relics: ["common", "uncommon"], potionChance: 0.4 },
    startPrice: 0,
  },
  {
    name: "Затопленный склеп",
    mechanic: { name: "Ледяная вода", text: "Каждый шаг в неизведанную комнату стоит 2 HP.", coldWater: 2 },
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
    enemyHpMultiplier: 1,
    rewards: { essences: 1.4, rarityWeights: { common: 50, uncommon: 35, rare: 15 }, relics: ["common", "uncommon"], potionChance: 0.45 },
    startPrice: 40,
  },
  {
    name: "Логово нежити",
    mechanic: { name: "Костяные доспехи", text: "Враги начинают каждый бой с 8 блока.", enemyBlock: 8 },
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
    enemyHpMultiplier: 1,
    rewards: { essences: 1.8, rarityWeights: { common: 40, uncommon: 40, rare: 20 }, relics: ["uncommon"], potionChance: 0.5 },
    startPrice: 80,
  },
  {
    name: "Ядовитые топи",
    mechanic: { name: "Ядовитые испарения", text: "Герой начинает каждый бой с 4 Яда.", heroPoison: 4 },
    encounters: [
      ["ghoul", "rat_swarm"],
      ["spider", "spider", "banshee"],
      ["warlock", "wraith"],
      ["golem"],
      ["acolyte", "ghoul", "rat_swarm"],
      ["blood_priest", "banshee"],
    ],
    elites: [["witch_queen"], ["bone_colossus"], ["demon"]],
    boss: ["vampire_lord", "rat_swarm", "rat_swarm"],
    enemyHpMultiplier: 1.2,
    rewards: { essences: 2.3, rarityWeights: { common: 30, uncommon: 42, rare: 28 }, relics: ["uncommon"], potionChance: 0.55 },
    startPrice: 130,
  },
  {
    name: "Цитадель тьмы",
    mechanic: { name: "Без передышки", text: "Отдыха в этом акте нет, а все враги получают +1 Силу.", noRest: true, enemyStrength: 1 },
    encounters: [
      ["golem", "acolyte"],
      ["hellhound", "hellhound"],
      ["assassin", "blood_priest"],
      ["wraith", "wraith", "acolyte"],
      ["gargoyle", "golem"],
      ["ghoul", "ghoul", "acolyte"],
    ],
    elites: [["death_knight", "acolyte"], ["demon"], ["bone_colossus", "acolyte"]],
    boss: ["lich_king", "acolyte", "acolyte"],
    enemyHpMultiplier: 1.35,
    rewards: { essences: 2.8, rarityWeights: { common: 20, uncommon: 45, rare: 35 }, relics: ["uncommon", "boss"], potionChance: 0.6 },
    startPrice: 180,
  },
];
