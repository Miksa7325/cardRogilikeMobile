// Состояние игры: единственный источник правды. Интерфейс читает данные отсюда.
export const state = {
  combat: null, // текущий бой, его создаёт createCombat из engine/combat.js
  selectedCardUid: null, // какую карту игрок выбрал в руке
};
