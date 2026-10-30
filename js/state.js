// Состояние игры: единственный источник правды. Интерфейс читает данные отсюда.
export const state = {
  run: null, // текущий забег, его создаёт createRun из engine/run.js
  combat: null, // текущий бой, его создаёт createCombat из engine/combat.js
  selectedCardUid: null, // какую карту игрок выбрал в руке
  test: {
    enabled: false, // идёт ли сейчас бой в тестовом режиме
    enemyIds: ["cultist"], // каких врагов выбрали для тестового боя
    pickerOpen: false, // открыт ли список карт поверх боя
    addUpgraded: false, // добавлять ли карты из списка улучшенными
  },
};
