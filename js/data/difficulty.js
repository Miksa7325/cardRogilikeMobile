// Уровни сложности: открываются после первой победы. Каждый уровень включает все предыдущие.
// Сами числа лежат в config.js, а логика проверяет уровень через hasDifficulty в engine/run.js.
export const DIFFICULTY_LEVELS = [
  { level: 1, description: "У обычных врагов больше HP" },
  { level: 2, description: "У элиты больше HP" },
  { level: 3, description: "У боссов больше HP" },
  { level: 4, description: "Элита начинает бой с Силой" },
  { level: 5, description: "Отдых лечит меньше" },
  { level: 6, description: "Меньше золота за бои" },
  { level: 7, description: "Меньше максимального HP" },
  { level: 8, description: "В стартовой колоде есть Рана" },
  { level: 9, description: "В магазине всё дороже" },
  { level: 10, description: "Все враги начинают бой с Силой" },
];
