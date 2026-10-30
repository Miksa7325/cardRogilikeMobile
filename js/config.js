// Все числа баланса. Хочешь изменить правила игры — меняй здесь.
export const CONFIG = {
  energyPerTurn: 3, // энергия в начале каждого хода
  cardsPerTurn: 5, // сколько карт добирается за ход
  maxHandSize: 10, // больше карт в руке быть не может
  maxEnemiesInCombat: 3, // больше врагов в одном бою быть не может
  warriorMaxHp: 80, // здоровье Воина
  assassinMaxHp: 70, // здоровье Убийцы
  warlockMaxHp: 80, // здоровье Чернокнижника
  vulnerableMultiplier: 1.5, // во сколько раз растёт урон по цели с Уязвимостью
  weakMultiplier: 0.75, // во сколько раз падает урон атакующего со Слабостью
  frailMultiplier: 0.75, // во сколько раз падает получаемый блок при Хрупкости

  maxPlayTimePerNodeMs: 600000, // простой дольше 10 минут не считается временем игры

  map: {
    floors: 15, // этажей в акте, босс идёт после них
    columns: 4, // ширина карты: больше 4 узлов в ряду не поместится
    pathCount: 6, // сколько путей идёт снизу вверх
    minNodesInRow: 2,
    chestFloor: 8, // этаж, где всегда сундук
    restFloor: 15, // этаж перед боссом, где всегда отдых
    eliteMinFloor: 6, // раньше этого этажа элиты нет
    nodeWeights: { battle: 45, event: 22, rest: 12, elite: 8, shop: 5 }, // доли узлов
  },

  rewards: {
    battleGold: [10, 20], // золото за обычный бой: от и до
    eliteGold: [25, 35], // золото за элиту
    relicFallbackGold: 25, // золото вместо реликвии, если новых реликвий не осталось
    cardChoices: 3, // сколько карт предлагается на выбор
    rarityWeights: { common: 60, uncommon: 30, rare: 10 }, // шансы редкости карт в награде
    potionChance: 0.4, // шанс зелья после боя
  },

  maxPotions: 3, // сколько зелий можно носить с собой

  shop: {
    cardCount: 5, // сколько карт в продаже
    relicCount: 2, // сколько реликвий в продаже
    potionCount: 2, // сколько зелий в продаже
    cardPrices: { common: 15, uncommon: 25, rare: 45 },
    relicPrices: { common: 50, uncommon: 75 },
    potionPrice: 15,
    removePrice: 25, // цена удаления карты из колоды
  },

  restHealShare: 0.3, // какую долю максимального HP лечит отдых

  // Опыт за забег. Что он открывает — в data/unlocks.js
  xp: {
    perFloor: 2,
    perElite: 10,
    perBoss: 25,
  },

  // Кроны за забег: на них покупаются здания в городе
  crowns: {
    perFloor: 1,
    perElite: 5,
    perBoss: 15,
    goldPerCrown: 10, // сколько оставшегося золота даёт одну крону
  },

  // Числа уровней сложности. Описание уровней — в data/difficulty.js
  difficulty: {
    maxLevel: 10,
    normalHpMultiplier: 1.1, // уровень 1
    eliteHpMultiplier: 1.15, // уровень 2
    bossHpMultiplier: 1.1, // уровень 3
    eliteStrength: 1, // уровень 4
    restHealShare: 0.25, // уровень 5
    goldMultiplier: 0.75, // уровень 6
    maxHpLoss: 10, // уровень 7
    shopPriceMultiplier: 1.25, // уровень 9
    enemyStrength: 1, // уровень 10
  },
};
