// Здания города. Они не усиливают героя: каждое добавляет в забеги новые события, зелья или реликвии.
// price — цена в кронах, у дома её нет: он есть с самого начала.
// x и y — где здание стоит на карте города (размер карты 360×780). Рисунки: assets/images/city.
export const BUILDINGS = {
  home: {
    id: "home",
    x: 6,
    y: 440,
    name: "Дом героев",
    description: "Здесь живут твои герои и хранятся итоги всех забегов.",
    price: 0,
    unlocks: {},
  },
  tavern: {
    id: "tavern",
    x: 6,
    y: 296,
    name: "Таверна",
    description: "Путники приносят слухи: в забегах появятся новые события.",
    price: 50,
    unlocks: { events: ["card_sharp", "drunk_veteran", "lost_pilgrim", "smuggler"] },
  },
  alchemist: {
    id: "alchemist",
    x: 266,
    y: 296,
    name: "Лавка алхимика",
    description: "Алхимик делится рецептами: в забегах появятся новые зелья.",
    price: 80,
    unlocks: { potions: ["weakness_potion", "decay_potion", "fog_potion", "stone_potion"] },
  },
  library: {
    id: "library",
    x: 266,
    y: 148,
    name: "Библиотека",
    description: "Старые книги хранят тайны: в забегах появятся новые события.",
    price: 110,
    unlocks: { events: ["forbidden_tome", "mad_scholar", "mirror_hall", "old_map"] },
  },
  forge: {
    id: "forge",
    x: 266,
    y: 440,
    name: "Кузница",
    description: "Кузнец куёт диковины: в забегах появятся новые реликвии.",
    price: 140,
    unlocks: { relics: ["chainmail", "smith_hammer", "keen_edge", "horseshoe", "steel_pauldron"] },
  },
  temple: {
    id: "temple",
    x: 6,
    y: 148,
    name: "Храм",
    description: "Паломники несут святыни: в забегах появятся новые реликвии.",
    price: 180,
    unlocks: { relics: ["prayer_beads", "holy_water", "censer", "memorial_candle", "evil_eye"] },
  },
};
