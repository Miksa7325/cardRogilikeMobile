// Карты Убийцы: Яд, дешёвые карты и добор.
import {
  allStatus, block, burn, card, cheaperPower, damage, draw, energy, fixedDamageToAll, heal, hits,
  multiplyStatus, selfStatus, status, triggerPower, wound,
} from "./cardHelpers.js";

export const ASSASSIN_CARDS = [
  // Стартовые
  card("a_strike", "Удар кинжалом", "attack", "starter", 1, "enemy", "Нанести {damage} урона.", [damage(6)], { effects: [damage(9)] }),
  card("a_dodge", "Уклонение", "skill", "starter", 1, "self", "Получить {block} блока.", [block(5)], { effects: [block(8)] }),
  card("a_dart", "Отравленный дротик", "attack", "starter", 1, "enemy", "Нанести {damage} урона. Наложить {poison} Яда.", [damage(3), status("poison", 4)], { effects: [damage(4), status("poison", 6)] }),

  // Обычные атаки
  card("a_stab", "Укол", "attack", "common", 0, "enemy", "Нанести {damage} урона.", [damage(4)], { effects: [damage(6)] }),
  card("a_twin_daggers", "Парные кинжалы", "attack", "common", 1, "enemy", "Нанести {damage} урона 2 раза.", hits(4, 2), { effects: hits(6, 2) }),
  card("a_venom_nick", "Ядовитый надрез", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {poison} Яда.", [damage(2), status("poison", 5)], { effects: [damage(3), status("poison", 7)] }),
  card("a_lunge", "Резкий выпад", "attack", "common", 1, "enemy", "Нанести {damage} урона.", [damage(8)], { effects: [damage(11)] }),
  card("a_backstab", "Удар в спину", "attack", "common", 1, "enemy", "Нанести {damage} урона. Сжечь.", [damage(12), burn], { effects: [damage(16), burn] }),
  card("a_quick_cut", "Быстрый порез", "attack", "common", 0, "enemy", "Нанести {damage} урона. Взять {draw} карту.", [damage(3), draw(1)], { effects: [damage(5), draw(1)] }),
  card("a_throwing_knives", "Метательные ножи", "attack", "common", 1, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(4)], { effects: [damage(6)] }),
  card("a_bleed", "Глубокая рана", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {weak} Слабости.", [damage(5), status("weak", 1)], { effects: [damage(7), status("weak", 2)] }),
  card("a_trip", "Подсечка", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {vulnerable} Уязвимости.", [damage(5), status("vulnerable", 1)], { effects: [damage(7), status("vulnerable", 2)] }),
  card("a_fan_knives", "Веер ножей", "attack", "common", 2, "allEnemies", "Нанести {damage} урона всем 3 раза.", hits(3, 3), { effects: hits(4, 3) }),
  card("a_garrote", "Удавка", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {weak} Слабости.", [damage(4), status("weak", 2)], { effects: [damage(5), status("weak", 3)] }),
  card("a_flurry", "Град ударов", "attack", "common", 2, "enemy", "Нанести {damage} урона 4 раза.", hits(3, 4), { effects: hits(4, 4) }),
  card("a_feint", "Обманный выпад", "attack", "common", 1, "enemy", "Нанести {damage} урона. Получить {block} блока.", [damage(6), block(3)], { effects: [damage(8), block(4)] }),
  card("a_toxic_throw", "Токсичный бросок", "attack", "common", 1, "allEnemies", "Нанести {damage} урона всем. Наложить {poison} Яда.", [damage(2), status("poison", 2)], { effects: [damage(3), status("poison", 3)] }),

  // Обычные навыки
  card("a_smoke", "Дымовая завеса", "skill", "common", 1, "self", "Получить {block} блока.", [block(7)], { effects: [block(10)] }),
  card("a_roll", "Перекат", "skill", "common", 0, "self", "Получить {block} блока.", [block(3)], { effects: [block(5)] }),
  card("a_prep", "Подготовка", "skill", "common", 0, "self", "Взять {draw} карту.", [draw(1)], { effects: [draw(2)] }),
  card("a_sharpen", "Заточка", "skill", "common", 1, "self", "Взять {draw} карты.", [draw(2)], { effects: [draw(3)] }),
  card("a_vial", "Склянка яда", "skill", "common", 0, "enemy", "Наложить {poison} Яда. Сжечь.", [status("poison", 3), burn], { effects: [status("poison", 5), burn] }),
  card("a_distract", "Отвлечение", "skill", "common", 0, "enemy", "Наложить {weak} Слабости. Сжечь.", [status("weak", 1), burn], { effects: [status("weak", 2), burn] }),
  card("a_toxic_fumes", "Ядовитые пары", "skill", "common", 1, "allEnemies", "Наложить {poison} Яда всем врагам.", [status("poison", 3)], { effects: [status("poison", 5)] }),
  card("a_shadow_step", "Шаг в тень", "skill", "common", 1, "self", "Получить {block} блока. Взять {draw} карту.", [block(5), draw(1)], { effects: [block(7), draw(1)] }),
  card("a_mark", "Метка", "skill", "common", 1, "enemy", "Наложить {vulnerable} Уязвимости. Взять {draw} карту.", [status("vulnerable", 2), draw(1)], { effects: [status("vulnerable", 3), draw(1)] }),
  card("a_focus", "Концентрация", "skill", "common", 1, "self", "Получить {strength} Силу. Сжечь.", [selfStatus("strength", 1), burn], { effects: [selfStatus("strength", 2), burn] }),
  card("a_balm", "Бальзам", "skill", "common", 0, "self", "Вылечить {heal} HP. Сжечь.", [heal(2), burn], { effects: [heal(4), burn] }),
  card("a_camouflage", "Маскировка", "skill", "common", 1, "self", "Получить {dexterity} Ловкость. Сжечь.", [selfStatus("dexterity", 1), burn], { effects: [selfStatus("dexterity", 2), burn] }),
  card("a_caltrops", "Шипы", "skill", "common", 1, "allEnemies", "Наложить {weak} Слабости. Наложить {poison} Яда всем. Сжечь.", [status("weak", 1), status("poison", 1), burn], { effects: [status("weak", 2), status("poison", 2), burn] }),

  // Необычные атаки
  card("a_assassinate", "Устранение", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона.", [damage(18)], { effects: [damage(24)] }),
  card("a_deathblow", "Смертельный удар", "attack", "uncommon", 3, "enemy", "Нанести {damage} урона.", [damage(26)], { effects: [damage(34)] }),
  card("a_blade_dance", "Танец клинков", "attack", "uncommon", 2, "allEnemies", "Нанести {damage} урона всем 2 раза.", hits(5, 2), { effects: hits(7, 2) }),
  card("a_ambush", "Засада", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. Получить {energy} энергию. Сжечь.", [damage(7), energy(1), burn], { effects: [damage(10), energy(1), burn] }),
  card("a_cheap_shot", "Подлый удар", "attack", "uncommon", 0, "enemy", "Нанести {damage} урона. Наложить {vulnerable} Уязвимости. Сжечь.", [damage(5), status("vulnerable", 1), burn], { effects: [damage(7), status("vulnerable", 2), burn] }),
  card("a_crippling", "Калечащий удар", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. Наложить {weak} Слабости. Наложить {vulnerable} Уязвимости.", [damage(9), status("weak", 2), status("vulnerable", 2)], { effects: [damage(12), status("weak", 3), status("vulnerable", 3)] }),
  card("a_scorpion", "Жало скорпиона", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. Наложить {poison} Яда.", [damage(6), status("poison", 9)], { effects: [damage(8), status("poison", 12)] }),
  card("a_riposte", "Ответный выпад", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. Получить {block} блока.", [damage(7), block(5)], { effects: [damage(9), block(7)] }),
  card("a_knife_storm", "Буря ножей", "attack", "uncommon", 3, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(12)], { effects: [damage(16)] }),
  card("a_choke", "Удушение", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. Наложить {poison} Яда. Наложить {weak} Слабости.", [damage(8), status("poison", 5), status("weak", 1)], { effects: [damage(10), status("poison", 7), status("weak", 2)] }),

  // Необычные навыки
  card("a_envenom", "Смазать ядом", "skill", "uncommon", 1, "enemy", "Наложить {poison} Яда.", [status("poison", 8)], { effects: [status("poison", 11)] }),
  card("a_double_dose", "Двойная доза", "skill", "uncommon", 1, "enemy", "Удвоить Яд на цели. Сжечь.", [multiplyStatus("poison", 2), burn], { cost: 0 }),
  card("a_dash", "Рывок", "skill", "uncommon", 1, "self", "Получить {block} блока. Взять {draw} карты.", [block(7), draw(2)], { effects: [block(9), draw(2)] }),
  card("a_adrenaline", "Адреналин", "skill", "uncommon", 0, "self", "Получить {energy} энергию. Взять {draw} карту. Сжечь.", [energy(1), draw(1), burn], { effects: [energy(2), draw(2), burn] }),
  card("a_evade", "Уход в тень", "skill", "uncommon", 2, "self", "Получить {block} блока.", [block(13)], { effects: [block(17)] }),
  card("a_contagion", "Зараза", "skill", "uncommon", 2, "allEnemies", "Наложить {poison} Яда всем врагам.", [status("poison", 6)], { effects: [status("poison", 9)] }),
  card("a_lethal_mix", "Смертельная смесь", "skill", "uncommon", 2, "enemy", "Наложить {poison} Яда. Наложить {weak} Слабости. Наложить {vulnerable} Уязвимости.", [status("poison", 5), status("weak", 2), status("vulnerable", 1)], { effects: [status("poison", 8), status("weak", 2), status("vulnerable", 2)] }),
  card("a_siphon", "Кража силы", "skill", "uncommon", 1, "enemy", "Наложить {weak} Слабости. Получить {strength} Силу. Сжечь.", [status("weak", 2), selfStatus("strength", 1), burn], { effects: [status("weak", 3), selfStatus("strength", 2), burn] }),
  card("a_swift_hands", "Ловкие руки", "skill", "uncommon", 1, "self", "Взять {draw} карты. Добавить Рану в сброс.", [draw(3), wound], { effects: [draw(4), wound] }),
  card("a_fade", "Раствориться", "skill", "uncommon", 1, "self", "Получить {block} блока. Наложить {weak} Слабости всем.", [block(6), allStatus("weak", 1)], { effects: [block(8), allStatus("weak", 1)] }),

  // Необычные силы
  triggerPower("a_toxic_blades", "Отравленные клинки", "uncommon", 2, "Каждая атака: {poison} Яда всем.", "onCardPlayed", [allStatus("poison", 1)], [allStatus("poison", 2)], "attack"),
  card("a_light_feet", "Лёгкая поступь", "power", "uncommon", 1, "self", "Получить {dexterity} Ловкости.", [selfStatus("dexterity", 2)], { effects: [selfStatus("dexterity", 3)] }),
  triggerPower("a_quick_wit", "Смекалка", "uncommon", 1, "Каждый навык: {block} блока.", "onCardPlayed", [block(2)], [block(3)], "skill"),
  triggerPower("a_venom_aura", "Ядовитая аура", "uncommon", 1, "В конце хода {poison} Яда всем.", "onTurnEnd", [allStatus("poison", 1)], [allStatus("poison", 2)]),
  triggerPower("a_killer_instinct", "Чутьё убийцы", "uncommon", 1, "Когда враг умирает, взять {draw} карты.", "onEnemyDeath", [draw(2)], [draw(3)]),
  triggerPower("a_shadow_cloak", "Плащ теней", "uncommon", 1, "В начале хода {block} блока.", "onTurnStart", [block(3)], [block(4)]),
  card("a_agility", "Гибкость", "power", "uncommon", 1, "self", "Получить {strength} Силу. Получить {dexterity} Ловкость.", [selfStatus("strength", 1), selfStatus("dexterity", 1)], { effects: [selfStatus("strength", 2), selfStatus("dexterity", 2)] }),
  triggerPower("a_cold_blood", "Хладнокровие", "uncommon", 1, "В конце хода {block} блока.", "onTurnEnd", [block(2)], [block(3)]),

  // Редкие атаки
  card("a_perfect_kill", "Идеальное убийство", "attack", "rare", 3, "enemy", "Нанести {damage} урона.", [damage(40)], { effects: [damage(52)] }),
  card("a_night_storm", "Ночная буря", "attack", "rare", 2, "allEnemies", "Нанести {damage} урона всем. Сжечь.", [damage(14), burn], { effects: [damage(18), burn] }),
  card("a_phantom", "Призрачная атака", "attack", "rare", 2, "enemy", "Нанести {damage} урона 3 раза.", hits(6, 3), { effects: hits(8, 3) }),

  // Редкие навыки
  card("a_death_mark", "Метка смерти", "skill", "rare", 2, "enemy", "Наложить {poison} Яда. Наложить {vulnerable} Уязвимости. Сжечь.", [status("poison", 12), status("vulnerable", 2), burn], { effects: [status("poison", 16), status("vulnerable", 3), burn] }),
  card("a_thousand_poisons", "Тысяча ядов", "skill", "rare", 1, "enemy", "Утроить Яд на цели. Сжечь.", [multiplyStatus("poison", 3), burn], { cost: 0 }),
  card("a_vanish", "Исчезновение", "skill", "rare", 2, "self", "Получить {block} блока. Сжечь.", [block(28), burn], { effects: [block(38), burn] }),
  card("a_second_chance", "Второй шанс", "skill", "rare", 0, "self", "Получить {energy} энергии. Взять {draw} карты. Сжечь.", [energy(2), draw(2), burn], { effects: [energy(3), draw(3), burn] }),
  card("a_pandemic", "Пандемия", "skill", "rare", 2, "allEnemies", "Наложить {poison} Яда всем. Сжечь.", [status("poison", 11), burn], { effects: [status("poison", 15), burn] }),

  // Редкие силы
  cheaperPower("a_master_poisoner", "Мастер ядов", "rare", 2, "В начале хода {poison} Яда всем.", "onTurnStart", [allStatus("poison", 3)], 1),
  card("a_shadow_form", "Форма тени", "power", "rare", 3, "self", "Получить {strength} Силы. Получить {dexterity} Ловкости. Каждый ход +{draw} карта.", [selfStatus("strength", 2), selfStatus("dexterity", 2)], { cost: 2 }, { trigger: "onTurnStart", effects: [draw(1)] }),
  cheaperPower("a_quickness", "Быстрота", "rare", 1, "В начале хода взять {draw} карту.", "onTurnStart", [draw(1)], 0),
  cheaperPower("a_thousand_blades", "Тысяча клинков", "rare", 1, "Каждая карта: {damage} урона всем.", "onCardPlayed", [fixedDamageToAll(2)], 0),
];
