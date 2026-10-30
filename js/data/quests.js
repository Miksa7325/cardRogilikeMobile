// Задания. stat — какой счётчик считаем за все забеги, goal — сколько нужно, reward — награда в кронах.
// Счётчики обновляются в конце забега: их список — в applyRunToMeta из engine/meta.js.
export const QUESTS = [
  { id: "kills_1", title: "Первая кровь", description: "Убей 10 врагов", stat: "kills", goal: 10, reward: 10 },
  { id: "kills_2", title: "Гроза подземелья", description: "Убей 50 врагов", stat: "kills", goal: 50, reward: 25 },
  { id: "kills_3", title: "Истребитель", description: "Убей 150 врагов", stat: "kills", goal: 150, reward: 60 },
  { id: "elites_1", title: "Охотник", description: "Убей 3 элитных врагов", stat: "elites", goal: 3, reward: 20 },
  { id: "elites_2", title: "Убийца чудовищ", description: "Убей 15 элитных врагов", stat: "elites", goal: 15, reward: 50 },
  { id: "bosses_1", title: "Победитель", description: "Убей босса", stat: "bosses", goal: 1, reward: 20 },
  { id: "bosses_2", title: "Гибель владык", description: "Убей 6 боссов", stat: "bosses", goal: 6, reward: 50 },
  { id: "floors_1", title: "Путник", description: "Пройди 30 этажей", stat: "floors", goal: 30, reward: 15 },
  { id: "floors_2", title: "Исследователь", description: "Пройди 150 этажей", stat: "floors", goal: 150, reward: 40 },
  { id: "cards_1", title: "Новичок", description: "Разыграй 100 карт", stat: "cardsPlayed", goal: 100, reward: 15 },
  { id: "cards_2", title: "Мастер колоды", description: "Разыграй 500 карт", stat: "cardsPlayed", goal: 500, reward: 40 },
  { id: "damage_1", title: "Тяжёлая рука", description: "Нанеси 1000 урона", stat: "damageDealt", goal: 1000, reward: 20 },
  { id: "damage_2", title: "Разрушитель", description: "Нанеси 5000 урона", stat: "damageDealt", goal: 5000, reward: 50 },
  { id: "potions_1", title: "Дегустатор", description: "Выпей 10 зелий", stat: "potionsUsed", goal: 10, reward: 15 },
  { id: "runs_1", title: "Упорство", description: "Заверши 5 забегов", stat: "runs", goal: 5, reward: 20 },
  { id: "wins_1", title: "Герой подземелья", description: "Выиграй забег", stat: "wins", goal: 1, reward: 50 },
  { id: "assassin_1", title: "Тень в ночи", description: "Заверши забег Убийцей", stat: "runs_assassin", goal: 1, reward: 15 },
  { id: "warlock_1", title: "Цена силы", description: "Заверши забег Чернокнижником", stat: "runs_warlock", goal: 1, reward: 15 },
];
