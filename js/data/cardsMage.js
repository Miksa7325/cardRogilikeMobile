// Карты Мага: дорогие сильные заклинания и Прилив.
// Энергии у Мага с каждым ходом всё больше, а новых карт в руку почти не приходит: важно, какие карты сыграть
// и когда. Чародейские карты растут от Прилива. Как каждая карта выглядит на поле боя — в ui/vfx.js.
import {
  allStatus, block, burn, card, cheaperPower, damage, draw, gainResource, grow, hits, selfStatus, status, triggerPower,
} from "./cardHelpers.js";

export const MAGE_CARDS = [
  // Стартовые
  card("m_spark", "Искра", "attack", "starter", 1, "enemy", "Нанести {damage} урона.", [damage(5)], { effects: [damage(8)] }),
  card("m_barrier", "Барьер", "skill", "starter", 1, "self", "Получить {block} блока.", [block(5)], { effects: [block(8)] }),
  card("m_frostbolt", "Ледяная стрела", "attack", "starter", 2, "enemy", "Нанести {damage} урона. Наложить {weak} Слабости.",
    [damage(10), status("weak", 1)], { effects: [damage(13), status("weak", 2)] }),
  card("m_arcane_blast", "Чародейский взрыв", "attack", "starter", 1, "enemy", "Нанести {damage} урона, +2 за каждый Прилив.",
    [grow(damage(4), "surge", 2)], { effects: [grow(damage(6), "surge", 3)] }),

  // Обычные
  card("m_fireball", "Огненный шар", "attack", "common", 2, "enemy", "Нанести {damage} урона.", [damage(14)], { effects: [damage(19)] }),
  card("m_flame_wave", "Огненная волна", "attack", "common", 2, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(8)], { effects: [damage(11)] }),
  card("m_lightning", "Молния", "attack", "common", 1, "enemy", "Нанести {damage} урона.", [damage(8)], { effects: [damage(11)] }),
  card("m_ice_armor", "Ледяная броня", "skill", "common", 2, "self", "Получить {block} блока.", [block(12)], { effects: [block(16)] }),
  card("m_missiles", "Чародейские стрелы", "attack", "common", 2, "enemy", "Нанести {damage} урона 3 раза.", hits(4, 3), { effects: hits(5, 3) }),
  card("m_frost_nova", "Кольцо льда", "skill", "common", 2, "allEnemies", "Наложить {weak} Слабости всем. Получить {block} блока.",
    [allStatus("weak", 2), block(6)], { effects: [allStatus("weak", 3), block(8)] }),
  card("m_static", "Статический разряд", "attack", "common", 1, "allEnemies", "Нанести {damage} урона всем. Наложить {vulnerable} Уязвимости всем.",
    [damage(4), allStatus("vulnerable", 1)], { effects: [damage(6), allStatus("vulnerable", 2)] }),
  card("m_ignite", "Поджог", "skill", "common", 1, "enemy", "Наложить {poison} Яда: враг горит.", [status("poison", 6)], { effects: [status("poison", 9)] }),
  card("m_mana_shield", "Щит маны", "skill", "common", 1, "self", "Получить {block} блока, +2 за каждый Прилив.",
    [grow(block(4), "surge", 2)], { effects: [grow(block(6), "surge", 3)] }),

  // Необычные
  card("m_blizzard", "Снежная буря", "attack", "uncommon", 3, "allEnemies", "Нанести {damage} урона всем 2 раза. Наложить {weak} Слабости всем.",
    [...hits(5, 2), allStatus("weak", 1)], { effects: [...hits(7, 2), allStatus("weak", 2)] }),
  card("m_chain_lightning", "Цепная молния", "attack", "uncommon", 3, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(12)], { effects: [damage(16)] }),
  card("m_meteor", "Метеор", "attack", "uncommon", 4, "enemy", "Нанести {damage} урона.", [damage(30)], { effects: [damage(40)] }),
  card("m_surge", "Поток силы", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона, +4 за каждый Прилив.",
    [grow(damage(6), "surge", 4)], { effects: [grow(damage(8), "surge", 5)] }),
  cheaperPower("m_overload", "Перегрузка", "uncommon", 2, "В начале хода ещё +{surge} Прилив.", "onTurnStart", [gainResource("surge", 1)], 1),
  triggerPower("m_frost_aura", "Иней", "uncommon", 1, "В конце хода {block} блока.", "onTurnEnd", [block(4)], [block(6)]),
  card("m_focus", "Медитация", "skill", "uncommon", 1, "self", "Взять {draw} карты. Сжечь.", [draw(2), burn], { effects: [draw(3), burn] }),
  card("m_time_warp", "Остановка времени", "skill", "uncommon", 3, "allEnemies", "Наложить {weak} Слабости и {vulnerable} Уязвимости всем. Сжечь.",
    [allStatus("weak", 2), allStatus("vulnerable", 2), burn], { cost: 2 }),

  // Редкие
  card("m_inferno", "Инферно", "attack", "rare", 5, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(22)], { effects: [damage(30)] }),
  card("m_starfall", "Звездопад", "attack", "rare", 4, "allEnemies", "Нанести {damage} урона всем 4 раза.", hits(5, 4), { effects: hits(7, 4) }),
  card("m_archmage", "Архимаг", "power", "rare", 3, "self", "Получить {strength} Силы.", [selfStatus("strength", 3)], { cost: 2 }),
  card("m_mana_storm", "Буря маны", "attack", "rare", 3, "allEnemies", "Нанести {damage} урона всем, +3 за каждый Прилив.",
    [grow(damage(4), "surge", 3)], { effects: [grow(damage(6), "surge", 4)] }),
];
