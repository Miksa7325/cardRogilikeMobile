import { ASSASSIN_CARDS } from "./cardsAssassin.js";
import { block, burn, card, damage, draw, energy, heal, hits, allStatus, loseHp, selfStatus, status, wound } from "./cardHelpers.js";
import { WARLOCK_CARDS } from "./cardsWarlock.js";

// Все карты игры. Новая карта — новая запись здесь или в таблице её героя.
// В описании {damage}, {block}, {draw}, {energy}, {heal} и {имя статуса} заменяются на итоговые числа.
// upgraded — поля, которые заменяются у улучшенной карты.
// power — постоянный эффект карты-силы: при каком триггере и какие эффекты срабатывают.
export const CARDS = {
  // Стартовые карты
  strike: {
    id: "strike",
    name: "Удар",
    type: "attack",
    rarity: "starter",
    cost: 1,
    target: "enemy",
    effects: [{ type: "damage", amount: 6 }],
    upgraded: { effects: [{ type: "damage", amount: 9 }] },
    description: "Нанести {damage} урона.",
  },
  defend: {
    id: "defend",
    name: "Защита",
    type: "skill",
    rarity: "starter",
    cost: 1,
    target: "self",
    effects: [{ type: "block", amount: 5 }],
    upgraded: { effects: [{ type: "block", amount: 8 }] },
    description: "Получить {block} блока.",
  },
  bash: {
    id: "bash",
    name: "Сокрушение",
    type: "attack",
    rarity: "starter",
    cost: 2,
    target: "enemy",
    effects: [
      { type: "damage", amount: 8 },
      { type: "applyStatus", status: "vulnerable", amount: 2 },
    ],
    upgraded: {
      effects: [
        { type: "damage", amount: 10 },
        { type: "applyStatus", status: "vulnerable", amount: 3 },
      ],
    },
    description: "Нанести {damage} урона. Наложить {vulnerable} Уязвимости.",
  },

  // Атаки
  cleave: {
    id: "cleave",
    name: "Рассечение",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "allEnemies",
    effects: [{ type: "damage", amount: 8 }],
    upgraded: { effects: [{ type: "damage", amount: 11 }] },
    description: "Нанести {damage} урона всем врагам.",
  },
  twin_strike: {
    id: "twin_strike",
    name: "Двойной удар",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    effects: [
      { type: "damage", amount: 5 },
      { type: "damage", amount: 5 },
    ],
    upgraded: {
      effects: [
        { type: "damage", amount: 7 },
        { type: "damage", amount: 7 },
      ],
    },
    description: "Нанести {damage} урона 2 раза.",
  },
  knee_strike: {
    id: "knee_strike",
    name: "Удар в колено",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    effects: [
      { type: "damage", amount: 6 },
      { type: "applyStatus", status: "weak", amount: 2 },
    ],
    upgraded: {
      effects: [
        { type: "damage", amount: 8 },
        { type: "applyStatus", status: "weak", amount: 3 },
      ],
    },
    description: "Нанести {damage} урона. Наложить {weak} Слабости.",
  },
  poison_blade: {
    id: "poison_blade",
    name: "Отравленный клинок",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    effects: [
      { type: "damage", amount: 3 },
      { type: "applyStatus", status: "poison", amount: 4 },
    ],
    upgraded: {
      effects: [
        { type: "damage", amount: 4 },
        { type: "applyStatus", status: "poison", amount: 6 },
      ],
    },
    description: "Нанести {damage} урона. Наложить {poison} Яда.",
  },
  quick_slash: {
    id: "quick_slash",
    name: "Быстрый выпад",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    effects: [
      { type: "damage", amount: 5 },
      { type: "draw", amount: 1 },
    ],
    upgraded: {
      effects: [
        { type: "damage", amount: 7 },
        { type: "draw", amount: 1 },
      ],
    },
    description: "Нанести {damage} урона. Взять {draw} карту.",
  },
  shield_bash: {
    id: "shield_bash",
    name: "Удар щитом",
    type: "attack",
    rarity: "common",
    cost: 1,
    target: "enemy",
    effects: [
      { type: "damage", amount: 5 },
      { type: "block", amount: 5, target: "self" },
    ],
    upgraded: {
      effects: [
        { type: "damage", amount: 7 },
        { type: "block", amount: 7, target: "self" },
      ],
    },
    description: "Нанести {damage} урона. Получить {block} блока.",
  },
  heavy_blow: {
    id: "heavy_blow",
    name: "Тяжёлый удар",
    type: "attack",
    rarity: "uncommon",
    cost: 2,
    target: "enemy",
    effects: [{ type: "damage", amount: 14 }],
    upgraded: { effects: [{ type: "damage", amount: 18 }] },
    description: "Нанести {damage} урона.",
  },

  // Навыки
  second_wind: {
    id: "second_wind",
    name: "Второе дыхание",
    type: "skill",
    rarity: "common",
    cost: 1,
    target: "self",
    effects: [
      { type: "block", amount: 4 },
      { type: "draw", amount: 1 },
    ],
    upgraded: {
      effects: [
        { type: "block", amount: 6 },
        { type: "draw", amount: 1 },
      ],
    },
    description: "Получить {block} блока. Взять {draw} карту.",
  },
  iron_wall: {
    id: "iron_wall",
    name: "Железная стена",
    type: "skill",
    rarity: "uncommon",
    cost: 2,
    target: "self",
    effects: [{ type: "block", amount: 13 }],
    upgraded: { effects: [{ type: "block", amount: 17 }] },
    description: "Получить {block} блока.",
  },
  focus: {
    id: "focus",
    name: "Фокус",
    type: "skill",
    rarity: "uncommon",
    cost: 0,
    target: "self",
    effects: [
      { type: "draw", amount: 2 },
      { type: "addCard", cardId: "wound", pile: "discard" },
    ],
    upgraded: {
      effects: [
        { type: "draw", amount: 3 },
        { type: "addCard", cardId: "wound", pile: "discard" },
      ],
    },
    description: "Взять {draw} карты. Добавить Рану в сброс.",
  },
  adrenaline: {
    id: "adrenaline",
    name: "Прилив сил",
    type: "skill",
    rarity: "uncommon",
    cost: 0,
    target: "self",
    effects: [{ type: "gainEnergy", amount: 1 }, { type: "exhaust" }],
    upgraded: { effects: [{ type: "gainEnergy", amount: 2 }, { type: "exhaust" }] },
    description: "Получить {energy} энергии. Сжечь.",
  },
  bandage: {
    id: "bandage",
    name: "Перевязка",
    type: "skill",
    rarity: "uncommon",
    cost: 1,
    target: "self",
    effects: [{ type: "heal", amount: 6 }, { type: "exhaust" }],
    upgraded: { effects: [{ type: "heal", amount: 9 }, { type: "exhaust" }] },
    description: "Вылечить {heal} HP. Сжечь.",
  },
  intimidate: {
    id: "intimidate",
    name: "Устрашение",
    type: "skill",
    rarity: "uncommon",
    cost: 1,
    target: "allEnemies",
    effects: [{ type: "applyStatus", status: "weak", amount: 2 }, { type: "exhaust" }],
    upgraded: { effects: [{ type: "applyStatus", status: "weak", amount: 3 }, { type: "exhaust" }] },
    description: "Наложить {weak} Слабости всем врагам. Сжечь.",
  },

  // Силы
  stance: {
    id: "stance",
    name: "Боевая стойка",
    type: "power",
    rarity: "uncommon",
    cost: 1,
    target: "self",
    effects: [{ type: "applyStatus", status: "dexterity", amount: 2 }],
    upgraded: { effects: [{ type: "applyStatus", status: "dexterity", amount: 3 }] },
    description: "Получить {dexterity} Ловкости.",
  },
  iron_skin: {
    id: "iron_skin",
    name: "Железная кожа",
    type: "power",
    rarity: "uncommon",
    cost: 1,
    target: "self",
    effects: [],
    power: { trigger: "onTurnEnd", effects: [{ type: "block", amount: 3, target: "self" }] },
    upgraded: { power: { trigger: "onTurnEnd", effects: [{ type: "block", amount: 4, target: "self" }] } },
    description: "В конце хода {block} блока.",
  },
  rage: {
    id: "rage",
    name: "Ярость",
    type: "power",
    rarity: "rare",
    cost: 1,
    target: "self",
    effects: [],
    power: { trigger: "onTurnStart", effects: [{ type: "applyStatus", status: "strength", amount: 1, target: "self" }] },
    upgraded: { cost: 0 },
    description: "В начале хода +{strength} Сила.",
  },
  blood_rage: {
    id: "blood_rage",
    name: "Кровавый гнев",
    type: "power",
    rarity: "rare",
    cost: 2,
    target: "self",
    effects: [],
    power: { trigger: "onDamageTaken", effects: [{ type: "applyStatus", status: "strength", amount: 1, target: "self" }] },
    upgraded: { cost: 1 },
    description: "Теряя HP от атаки, +{strength} Сила.",
  },

  // Мусор в колоде: не входит в 20 карт Воина
  wound: {
    id: "wound",
    name: "Рана",
    type: "status",
    rarity: "common",
    cost: null, // null — карту нельзя разыграть
    target: "none",
    effects: [],
    description: "Нельзя разыграть.",
  },
};

const MORE_WARRIOR_CARDS = [
  // Обычные атаки
  card("deep_cut", "Глубокий порез", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {poison} Яда.", [damage(4), status("poison", 3)], { effects: [damage(5), status("poison", 5)] }),
  card("kick", "Пинок", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {vulnerable} Уязвимости.", [damage(7), status("vulnerable", 1)], { effects: [damage(9), status("vulnerable", 2)] }),
  card("triple_slash", "Тройной удар", "attack", "common", 2, "enemy", "Нанести {damage} урона 3 раза.", hits(5, 3), { effects: hits(7, 3) }),
  card("reckless_swing", "Безрассудный взмах", "attack", "common", 0, "enemy", "Нанести {damage} урона. Потерять {loseHp} HP.", [damage(7), loseHp(3)], { effects: [damage(10), loseHp(3)] }),
  card("guarded_strike", "Осторожный удар", "attack", "common", 1, "enemy", "Нанести {damage} урона. Получить {block} блока.", [damage(6), block(3)], { effects: [damage(8), block(4)] }),
  card("wide_swing", "Размашистый удар", "attack", "common", 1, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(6)], { effects: [damage(9)] }),
  card("hilt_bash", "Удар рукоятью", "attack", "common", 0, "enemy", "Нанести {damage} урона. Взять {draw} карту.", [damage(3), draw(1)], { effects: [damage(5), draw(1)] }),
  card("hamstring", "Подрезать жилы", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {weak} Слабости. Наложить {vulnerable} Уязвимости.", [damage(4), status("weak", 1), status("vulnerable", 1)], { effects: [damage(6), status("weak", 2), status("vulnerable", 1)] }),
  card("finishing_blow", "Добивание", "attack", "common", 1, "enemy", "Нанести {damage} урона. Сжечь.", [damage(12), burn], { effects: [damage(16), burn] }),
  card("wild_slash", "Дикий взмах", "attack", "common", 1, "enemy", "Нанести {damage} урона. Добавить Рану в сброс.", [damage(11), wound], { effects: [damage(14), wound] }),
  card("shoulder_charge", "Таран плечом", "attack", "common", 2, "enemy", "Нанести {damage} урона. Получить {block} блока.", [damage(11), block(5)], { effects: [damage(14), block(7)] }),

  // Обычные навыки
  card("brace", "Упор", "skill", "common", 1, "self", "Получить {block} блока.", [block(7)], { effects: [block(10)] }),
  card("parry", "Парирование", "skill", "common", 0, "self", "Получить {block} блока.", [block(3)], { effects: [block(5)] }),
  card("taunt", "Насмешка", "skill", "common", 1, "enemy", "Наложить {vulnerable} Уязвимости. Получить {block} блока.", [status("vulnerable", 2), block(4)], { effects: [status("vulnerable", 3), block(6)] }),
  card("rally", "Собраться с духом", "skill", "common", 1, "self", "Взять {draw} карты.", [draw(2)], { effects: [draw(3)] }),
  card("dirty_trick", "Грязный приём", "skill", "common", 0, "enemy", "Наложить {weak} Слабости. Сжечь.", [status("weak", 1), burn], { effects: [status("weak", 2), burn] }),
  card("tourniquet", "Жгут", "skill", "common", 0, "self", "Вылечить {heal} HP. Сжечь.", [heal(2), burn], { effects: [heal(4), burn] }),
  card("warm_up", "Разминка", "skill", "common", 1, "self", "Получить {strength} Силу. Сжечь.", [selfStatus("strength", 1), burn], { effects: [selfStatus("strength", 2), burn] }),
  card("battle_cry", "Боевой клич", "skill", "common", 1, "allEnemies", "Наложить {vulnerable} Уязвимости всем. Сжечь.", [status("vulnerable", 1), burn], { effects: [status("vulnerable", 2), burn] }),
  card("poison_cloud", "Ядовитое облако", "skill", "common", 1, "allEnemies", "Наложить {poison} Яда всем врагам.", [status("poison", 3)], { effects: [status("poison", 5)] }),

  // Необычные атаки
  card("sunder", "Раскол брони", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. Наложить {vulnerable} Уязвимости.", [damage(5), status("vulnerable", 2)], { effects: [damage(7), status("vulnerable", 3)] }),
  card("whirlwind", "Вихрь", "attack", "uncommon", 2, "allEnemies", "Нанести {damage} урона всем 2 раза.", hits(6, 2), { effects: hits(8, 2) }),
  card("executioner", "Палач", "attack", "uncommon", 3, "enemy", "Нанести {damage} урона.", [damage(28)], { effects: [damage(36)] }),
  card("blood_strike", "Кровавый удар", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. Потерять {loseHp} HP.", [damage(13), loseHp(4)], { effects: [damage(17), loseHp(4)] }),
  card("counterattack", "Контратака", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. Получить {block} блока.", [damage(10), block(10)], { effects: [damage(13), block(13)] }),
  card("venom_strike", "Ядовитый укус", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. Наложить {poison} Яда.", [damage(6), status("poison", 8)], { effects: [damage(8), status("poison", 11)] }),
  card("momentum", "Натиск", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. Получить {energy} энергию. Сжечь.", [damage(6), energy(1), burn], { effects: [damage(9), energy(1), burn] }),
  card("stunning_blow", "Оглушающий удар", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. Наложить {weak} Слабости. Наложить {vulnerable} Уязвимости.", [damage(9), status("weak", 2), status("vulnerable", 2)], { effects: [damage(12), status("weak", 3), status("vulnerable", 3)] }),

  // Необычные навыки
  card("shield_wall", "Стена щитов", "skill", "uncommon", 2, "self", "Получить {block} блока. Наложить {weak} Слабости всем.", [block(10), allStatus("weak", 1)], { effects: [block(14), allStatus("weak", 1)] }),
  card("plague_blade", "Чумной клинок", "skill", "uncommon", 2, "allEnemies", "Наложить {poison} Яда всем врагам.", [status("poison", 6)], { effects: [status("poison", 9)] }),
  card("blood_surge", "Прилив крови", "skill", "uncommon", 1, "self", "Получить {energy} энергии. Потерять {loseHp} HP. Сжечь.", [energy(2), loseHp(5), burn], { effects: [energy(3), loseHp(5), burn] }),
  card("retreat", "Отход", "skill", "uncommon", 1, "self", "Получить {block} блока. Взять {draw} карты.", [block(6), draw(2)], { effects: [block(8), draw(2)] }),
  card("war_drum", "Боевой барабан", "skill", "uncommon", 1, "self", "Получить {strength} Силы. Сжечь.", [selfStatus("strength", 2), burn], { effects: [selfStatus("strength", 3), burn] }),
  card("calculation", "Точный расчёт", "skill", "uncommon", 1, "self", "Взять {draw} карты. Добавить Рану в сброс.", [draw(3), wound], { effects: [draw(4), wound] }),
  card("fortress", "Крепость", "skill", "uncommon", 3, "self", "Получить {block} блока.", [block(22)], { effects: [block(28)] }),

  // Необычные силы
  card("iron_will", "Железная воля", "power", "uncommon", 1, "self", "В начале хода {block} блока.", [], { power: { trigger: "onTurnStart", effects: [block(4)] } }, { trigger: "onTurnStart", effects: [block(3)] }),
  card("venom_mastery", "Знаток ядов", "power", "uncommon", 1, "self", "В конце хода {poison} Яда всем.", [], { power: { trigger: "onTurnEnd", effects: [allStatus("poison", 2)] } }, { trigger: "onTurnEnd", effects: [allStatus("poison", 1)] }),
  card("battle_trance", "Боевой транс", "power", "uncommon", 1, "self", "Каждая атака: {block} блока.", [], { power: { trigger: "onCardPlayed", cardType: "attack", effects: [block(2)] } }, { trigger: "onCardPlayed", cardType: "attack", effects: [block(1)] }),
  card("thick_hide", "Толстая шкура", "power", "uncommon", 2, "self", "Получить {dexterity} Ловкости.", [selfStatus("dexterity", 3)], { effects: [selfStatus("dexterity", 4)] }),
  card("bloodthirst", "Кровожадность", "power", "uncommon", 1, "self", "Когда враг умирает, вылечить {heal} HP.", [], { power: { trigger: "onEnemyDeath", effects: [heal(5)] } }, { trigger: "onEnemyDeath", effects: [heal(3)] }),

  // Редкие атаки
  card("earthquake", "Землетрясение", "attack", "rare", 3, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(20)], { effects: [damage(26)] }),
  card("reaper", "Жнец", "attack", "rare", 2, "allEnemies", "Нанести {damage} урона всем. Вылечить {heal} HP. Сжечь.", [damage(9), heal(6), burn], { effects: [damage(12), heal(8), burn] }),
  card("decapitate", "Обезглавить", "attack", "rare", 2, "enemy", "Нанести {damage} урона.", [damage(24)], { effects: [damage(32)] }),

  // Редкие навыки
  card("last_stand", "Последний рубеж", "skill", "rare", 2, "self", "Получить {block} блока. Сжечь.", [block(30), burn], { effects: [block(40), burn] }),
  card("adrenal_rush", "Всплеск", "skill", "rare", 0, "self", "Получить {energy} энергии. Взять {draw} карты. Сжечь.", [energy(2), draw(2), burn], { effects: [energy(3), draw(3), burn] }),
  card("plague", "Чума", "skill", "rare", 2, "allEnemies", "Наложить {poison} Яда всем. Сжечь.", [status("poison", 10), burn], { effects: [status("poison", 14), burn] }),

  // Редкие силы
  card("berserker", "Берсерк", "power", "rare", 0, "self", "Получить {strength} Силы. Потерять {loseHp} HP.", [selfStatus("strength", 3), loseHp(6)], { effects: [selfStatus("strength", 4), loseHp(6)] }),
  card("war_avatar", "Аватар войны", "power", "rare", 3, "self", "Получить {strength} Силы. Получить {dexterity} Ловкости.", [selfStatus("strength", 3), selfStatus("dexterity", 3)], { cost: 2 }),
  card("thousand_cuts", "Тысяча порезов", "power", "rare", 1, "self", "Каждая карта: {damage} урона всем.", [], { power: { trigger: "onCardPlayed", effects: [{ type: "damage", amount: 2, fixed: true, target: "allEnemies" }] } }, { trigger: "onCardPlayed", effects: [{ type: "damage", amount: 1, fixed: true, target: "allEnemies" }] }),
  card("perfect_form", "Идеальная форма", "power", "rare", 1, "self", "В начале хода взять {draw} карту.", [], { cost: 0 }, { trigger: "onTurnStart", effects: [draw(1)] }),
];

for (const warriorCard of MORE_WARRIOR_CARDS) {
  CARDS[warriorCard.id] = warriorCard;
}

// У каждой карты свой герой: только его карты выпадают ему в наградах и магазине
for (const warriorCard of Object.values(CARDS)) {
  if (warriorCard.id !== "wound") warriorCard.hero = "warrior";
}
for (const assassinCard of ASSASSIN_CARDS) {
  CARDS[assassinCard.id] = { ...assassinCard, hero: "assassin" };
}
for (const warlockCard of WARLOCK_CARDS) {
  CARDS[warlockCard.id] = { ...warlockCard, hero: "warlock" };
}
