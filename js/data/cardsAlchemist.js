// Карты Алхимика: варка зелий прямо в бою и Реагенты.
// Сваренное зелье даёт 1 Реагент, выпитое — 2. Смеси «Реагенты N» тратят их, катализаторы растут от них.
import {
  block, brew, burn, card, cheaperPower, damage, draw, energy, fixedDamageToAll, gainResource, grow, heal, hits, selfStatus, spend, status, triggerPower,
} from "./cardHelpers.js";

export const ALCHEMIST_CARDS = [
  // Стартовые
  card("al_toss", "Бросок склянки", "attack", "starter", 1, "enemy", "Нанести {damage} урона.", [damage(6)], { effects: [damage(9)] }),
  card("al_guard", "Стеклянный щит", "skill", "starter", 1, "self", "Получить {block} блока.", [block(5)], { effects: [block(8)] }),
  card("al_brew", "Варка зелья", "skill", "starter", 1, "self", "Сварить зелье.", [brew(1)], { cost: 0 }),
  card("al_catalyst", "Катализатор", "attack", "starter", 1, "enemy", "Нанести {damage} урона, +1 за каждый Реагент.", [grow(damage(4), "reagents", 1)], { effects: [grow(damage(6), "reagents", 2)] }),

  // Обычные
  card("al_acid", "Кислота", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {vulnerable} Уязвимости.", [damage(5), status("vulnerable", 1)], { effects: [damage(7), status("vulnerable", 2)] }),
  card("al_bomb", "Бомба", "attack", "common", 1, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(5)], { effects: [damage(7)] }),
  card("al_spark", "Вспышка пороха", "attack", "common", 0, "enemy", "Нанести {damage} урона. Взять {draw} карту.", [damage(3), draw(1)], { effects: [damage(5), draw(1)] }),
  card("al_fumes", "Едкий дым", "skill", "common", 1, "allEnemies", "Наложить {poison} Яда и {weak} Слабости всем.", [status("poison", 3), status("weak", 1)], { effects: [status("poison", 4), status("weak", 2)] }),
  card("al_flask_wall", "Стена колб", "skill", "common", 1, "self", "Получить {block} блока, +1 за каждый Реагент.", [grow(block(5), "reagents", 1)], { effects: [grow(block(7), "reagents", 2)] }),
  card("al_quick_brew", "Быстрая варка", "skill", "common", 1, "self", "Сварить зелье. Сжечь.", [brew(1), burn], { cost: 0 }),
  card("al_distill", "Перегонка", "skill", "common", 1, "self", "Получить {reagents} Реагента. Взять {draw} карту.", [gainResource("reagents", 3), draw(1)], { effects: [gainResource("reagents", 4), draw(1)] }),
  card("al_tincture", "Настойка", "skill", "common", 1, "self", "Вылечить {heal} HP. Сжечь.", [heal(6), burn], { effects: [heal(9), burn] }),
  card("al_caustic", "Едкая склянка", "attack", "common", 1, "enemy", "Нанести {damage} урона. Наложить {poison} Яда.", [damage(4), status("poison", 3)], { effects: [damage(6), status("poison", 4)] }),
  card("al_firebomb", "Зажигательная смесь", "attack", "common", 1, "allEnemies", "Нанести {damage} урона всем. Наложить {poison} Яда всем: враги горят.", [damage(3), status("poison", 2)], { effects: [damage(4), status("poison", 3)] }),
  card("al_smoke", "Дымовая шашка", "skill", "common", 1, "allEnemies", "Получить {block} блока. Наложить {weak} Слабости всем.", [block(5), status("weak", 1)], { effects: [block(7), status("weak", 2)] }),
  card("al_pouch", "Мешочек реагентов", "skill", "common", 0, "self", "Получить {reagents} Реагента.", [gainResource("reagents", 2)], { effects: [gainResource("reagents", 3)] }),

  // Необычные
  card("al_mixture", "Гремучая смесь", "attack", "uncommon", 2, "allEnemies", "Нанести {damage} урона всем. Реагенты 4: ещё 2 раза по {damage}.", [damage(6), spend("reagents", 4, hits(8, 2))], { effects: [damage(8), spend("reagents", 4, hits(10, 2))] }),
  card("al_double_brew", "Двойная варка", "skill", "uncommon", 2, "self", "Сварить 2 зелья. Сжечь.", [brew(2), burn], { cost: 1 }),
  card("al_transmute", "Трансмутация", "skill", "uncommon", 0, "self", "Реагенты 4: получить {energy} энергии.", [spend("reagents", 4, [energy(2)])], { effects: [spend("reagents", 3, [energy(2)])], description: "Реагенты 3: получить {energy} энергии." }),
  card("al_stoneskin", "Каменная кожа", "skill", "uncommon", 2, "self", "Получить {block} блока. Реагенты 5: ещё {block} блока.", [block(8), spend("reagents", 5, [block(16)])], { effects: [block(10), spend("reagents", 5, [block(20)])] }),
  cheaperPower("al_lab", "Походная лаборатория", "uncommon", 3, "В начале хода сварить зелье.", "onTurnStart", [brew(1)], 2),
  card("al_volatile", "Нестабильный раствор", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. Реагенты 2: ещё {damage} урона.", [damage(7), spend("reagents", 2, [damage(7)])], { effects: [damage(9), spend("reagents", 2, [damage(9)])] }),
  card("al_corrosion", "Коррозия", "skill", "uncommon", 1, "enemy", "Наложить {vulnerable} Уязвимости и {poison} Яда.", [status("vulnerable", 2), status("poison", 3)], { effects: [status("vulnerable", 3), status("poison", 4)] }),
  card("al_strength_elixir", "Эликсир силы", "skill", "uncommon", 1, "self", "Реагенты 4: получить {strength} Силы. Сжечь.", [spend("reagents", 4, [selfStatus("strength", 2)]), burn], { effects: [spend("reagents", 4, [selfStatus("strength", 3)]), burn] }),
  triggerPower("al_fermentation", "Брожение", "uncommon", 1, "В начале хода Реагенты +{reagents}.", "onTurnStart", [gainResource("reagents", 1)], [gainResource("reagents", 2)]),

  // Редкие
  triggerPower("al_philosopher", "Философский камень", "rare", 2, "Каждое выпитое зелье: Реагенты ещё +{reagents}.", "onPotionUsed", [gainResource("reagents", 1)], [gainResource("reagents", 2)]),
  card("al_grand_brew", "Великая варка", "skill", "rare", 3, "self", "Сварить 3 зелья. Сжечь.", [brew(3), burn], { cost: 2 }),
  triggerPower("al_chain_reaction", "Цепная реакция", "rare", 2, "Каждое сваренное зелье: {damage} урона всем врагам.", "onPotionBrewed", [fixedDamageToAll(5)], [fixedDamageToAll(7)]),
  card("al_elixir_blast", "Взрыв эликсира", "attack", "rare", 3, "enemy", "Нанести {damage} урона, +3 за каждый Реагент.", [grow(damage(8), "reagents", 3)], { effects: [grow(damage(12), "reagents", 3)] }),
];
