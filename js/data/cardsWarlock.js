// Карты Чернокнижника: плата своим HP, сжигание и Раны.
import {
  allStatus, block, burn, card, cheaperPower, damage, draw, energy, exhaustWounds, fixedDamageToAll, heal, hits,
  loseHp, selfStatus, status, triggerPower, wound,
} from "./cardHelpers.js";

export const WARLOCK_CARDS = [
  // Стартовые
  card("w_bolt", "Тёмный разряд", "attack", "starter", 1, "enemy", "Нанести {damage} урона.", [damage(6)], { effects: [damage(9)] }),
  card("w_shield", "Щит тьмы", "skill", "starter", 1, "self", "Получить {block} блока.", [block(5)], { effects: [block(8)] }),
  card("w_sacrifice", "Жертва", "attack", "starter", 1, "enemy", "Нанести {damage} урона. Потерять {loseHp} HP.", [damage(11), loseHp(3)], { effects: [damage(15), loseHp(3)] }),

  // Обычные атаки
  card("w_drain", "Вытягивание", "attack", "common", 1, "enemy", "Нанести {damage} урона. Вылечить {heal} HP.", [damage(6), heal(2)], { effects: [damage(8), heal(3)] }),
  card("w_shadow_lash", "Плеть тени", "attack", "common", 1, "enemy", "Нанести {damage} урона.", [damage(8)], { effects: [damage(11)] }),
  card("w_blood_bolt", "Кровавая стрела", "attack", "common", 0, "enemy", "Нанести {damage} урона. Потерять {loseHp} HP.", [damage(6), loseHp(2)], { effects: [damage(9), loseHp(2)] }),
  card("w_curse_hit", "Проклятый удар", "attack", "common", 1, "enemy", "Нанести {damage} урона. {vulnerable} Уязвимости.", [damage(5), status("vulnerable", 1)], { effects: [damage(7), status("vulnerable", 2)] }),
  card("w_hex_bolt", "Стрела порчи", "attack", "common", 1, "enemy", "Нанести {damage} урона. {weak} Слабости.", [damage(5), status("weak", 1)], { effects: [damage(7), status("weak", 2)] }),
  card("w_dark_wave", "Тёмная волна", "attack", "common", 1, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(5)], { effects: [damage(7)] }),
  card("w_soul_burn", "Ожог души", "attack", "common", 1, "enemy", "Нанести {damage} урона. Сжечь.", [damage(13), burn], { effects: [damage(18), burn] }),
  card("w_cursed_blade", "Проклятый клинок", "attack", "common", 1, "enemy", "Нанести {damage} урона. Рана в сброс.", [damage(11), wound], { effects: [damage(14), wound] }),
  card("w_twin_shadow", "Двойная тень", "attack", "common", 1, "enemy", "Нанести {damage} урона 2 раза.", hits(4, 2), { effects: hits(6, 2) }),
  card("w_grave_bolt", "Могильный разряд", "attack", "common", 2, "enemy", "Нанести {damage} урона. {block} блока.", [damage(13), block(4)], { effects: [damage(17), block(6)] }),
  card("w_sap", "Иссушение", "attack", "common", 1, "enemy", "Нанести {damage} урона. {poison} Яда.", [damage(4), status("poison", 3)], { effects: [damage(5), status("poison", 5)] }),
  card("w_pain_echo", "Эхо боли", "attack", "common", 0, "enemy", "Нанести {damage} урона. Взять {draw} карту. Потерять {loseHp} HP.", [damage(3), draw(1), loseHp(1)], { effects: [damage(5), draw(1), loseHp(1)] }),
  card("w_ritual_knife", "Ритуальный нож", "attack", "common", 1, "enemy", "{damage} урона. +{draw} карта. Потерять {loseHp} HP.", [damage(7), draw(1), loseHp(2)], { effects: [damage(9), draw(1), loseHp(2)] }),
  card("w_shadow_swarm", "Рой теней", "attack", "common", 2, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(9)], { effects: [damage(12)] }),

  // Обычные навыки
  card("w_ward", "Оберег", "skill", "common", 1, "self", "Получить {block} блока.", [block(7)], { effects: [block(10)] }),
  card("w_veil", "Завеса", "skill", "common", 0, "self", "Получить {block} блока.", [block(3)], { effects: [block(5)] }),
  card("w_omen", "Знамение", "skill", "common", 1, "self", "Взять {draw} карты.", [draw(2)], { effects: [draw(3)] }),
  card("w_blood_price", "Кровавая цена", "skill", "common", 0, "self", "+{energy} энергия. Потерять {loseHp} HP. Сжечь.", [energy(1), loseHp(3), burn], { effects: [energy(2), loseHp(3), burn] }),
  card("w_weaken", "Порча", "skill", "common", 0, "enemy", "{weak} Слабости. Сжечь.", [status("weak", 1), burn], { effects: [status("weak", 2), burn] }),
  card("w_cauterize", "Прижигание", "skill", "common", 0, "self", "Сжечь Раны в руке. {block} блока.", [exhaustWounds, block(2)], { effects: [exhaustWounds, block(4)] }),
  card("w_dark_pact", "Тёмный договор", "skill", "common", 1, "self", "Взять {draw} карты. Рана в сброс.", [draw(3), wound], { effects: [draw(4), wound] }),
  card("w_leech", "Пиявка", "skill", "common", 1, "self", "Вылечить {heal} HP. Сжечь.", [heal(4), burn], { effects: [heal(6), burn] }),
  card("w_gloom", "Мрак", "skill", "common", 1, "allEnemies", "{vulnerable} Уязвимости всем. Сжечь.", [status("vulnerable", 1), burn], { effects: [status("vulnerable", 2), burn] }),
  card("w_bone_armor", "Костяная броня", "skill", "common", 1, "self", "{block} блока. Потерять {loseHp} HP.", [block(9), loseHp(2)], { effects: [block(12), loseHp(2)] }),
  card("w_embers", "Тлеющие угли", "skill", "common", 1, "allEnemies", "{poison} Яда всем врагам.", [status("poison", 3)], { effects: [status("poison", 5)] }),
  card("w_empower", "Усиление", "skill", "common", 1, "self", "+{strength} Сила. Сжечь.", [selfStatus("strength", 1), burn], { effects: [selfStatus("strength", 2), burn] }),
  card("w_helper", "Тень-помощник", "skill", "common", 1, "self", "{block} блока. Взять {draw} карту.", [block(4), draw(1)], { effects: [block(6), draw(1)] }),

  // Необычные атаки
  card("w_doom_bolt", "Разряд рока", "attack", "uncommon", 3, "enemy", "Нанести {damage} урона.", [damage(28)], { effects: [damage(36)] }),
  card("w_blood_rite", "Кровавый обряд", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. Потерять {loseHp} HP.", [damage(15), loseHp(5)], { effects: [damage(20), loseHp(5)] }),
  card("w_life_drain", "Похищение жизни", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. Вылечить {heal} HP.", [damage(10), heal(5)], { effects: [damage(14), heal(7)] }),
  card("w_nether_storm", "Буря бездны", "attack", "uncommon", 2, "allEnemies", "Нанести {damage} урона всем 2 раза.", hits(6, 2), { effects: hits(8, 2) }),
  card("w_soul_harvest", "Жатва душ", "attack", "uncommon", 2, "allEnemies", "Нанести {damage} урона всем. Вылечить {heal} HP. Сжечь.", [damage(8), heal(4), burn], { effects: [damage(11), heal(6), burn] }),
  card("w_curse_weak", "Проклятие немощи", "attack", "uncommon", 2, "enemy", "Нанести {damage} урона. {weak} Слабости. {vulnerable} Уязвимости.", [damage(8), status("weak", 2), status("vulnerable", 2)], { effects: [damage(11), status("weak", 3), status("vulnerable", 3)] }),
  card("w_black_flame", "Чёрное пламя", "attack", "uncommon", 1, "enemy", "{damage} урона. Рана в сброс. Взять {draw} карту.", [damage(9), wound, draw(1)], { effects: [damage(12), wound, draw(1)] }),
  card("w_spite", "Злоба", "attack", "uncommon", 1, "enemy", "Нанести {damage} урона. {block} блока.", [damage(7), block(5)], { effects: [damage(9), block(7)] }),
  card("w_sacrificial", "Жертвенный удар", "attack", "uncommon", 0, "enemy", "Нанести {damage} урона. Потерять {loseHp} HP.", [damage(9), loseHp(4)], { effects: [damage(13), loseHp(4)] }),

  // Необычные навыки
  card("w_agony", "Агония", "skill", "uncommon", 2, "enemy", "{poison} Яда.", [status("poison", 9)], { effects: [status("poison", 12)] }),
  card("w_fuel", "Топливо", "skill", "uncommon", 1, "self", "Сжечь Раны в руке. +{energy} энергии. Сжечь.", [exhaustWounds, energy(2), burn], { effects: [exhaustWounds, energy(3), burn] }),
  card("w_bargain", "Сделка", "skill", "uncommon", 1, "self", "+{energy} энергии. Потерять {loseHp} HP. Сжечь.", [energy(2), loseHp(5), burn], { effects: [energy(3), loseHp(5), burn] }),
  card("w_shadow_wall", "Стена тьмы", "skill", "uncommon", 2, "self", "Получить {block} блока.", [block(13)], { effects: [block(17)] }),
  card("w_dread", "Ужас", "skill", "uncommon", 2, "allEnemies", "{weak} Слабости. {vulnerable} Уязвимости всем. Сжечь.", [status("weak", 2), status("vulnerable", 1), burn], { effects: [status("weak", 3), status("vulnerable", 2), burn] }),
  card("w_forbidden", "Запретное знание", "skill", "uncommon", 1, "self", "Взять {draw} карты. 2 Раны в сброс.", [draw(4), wound, wound], { effects: [draw(5), wound, wound] }),
  card("w_ritual", "Ритуал", "skill", "uncommon", 1, "self", "+{strength} Силы. Потерять {loseHp} HP. Сжечь.", [selfStatus("strength", 2), loseHp(3), burn], { effects: [selfStatus("strength", 3), loseHp(3), burn] }),
  card("w_blood_shield", "Кровавый щит", "skill", "uncommon", 1, "self", "{block} блока. Потерять {loseHp} HP.", [block(12), loseHp(3)], { effects: [block(16), loseHp(3)] }),
  card("w_consume", "Поглощение", "skill", "uncommon", 1, "self", "Сжечь Раны в руке. Вылечить {heal} HP. Сжечь.", [exhaustWounds, heal(5), burn], { effects: [exhaustWounds, heal(8), burn] }),
  card("w_mass_hex", "Массовая порча", "skill", "uncommon", 2, "allEnemies", "{poison} Яда всем врагам.", [status("poison", 6)], { effects: [status("poison", 9)] }),
  card("w_abyss_gaze", "Взгляд бездны", "skill", "uncommon", 1, "enemy", "{vulnerable} Уязвимости. Взять {draw} карту.", [status("vulnerable", 3), draw(1)], { effects: [status("vulnerable", 4), draw(1)] }),

  // Необычные силы
  triggerPower("w_dark_embrace", "Объятия тьмы", "uncommon", 1, "Когда карта сгорает: {block} блока.", "onExhaust", [block(3)], [block(4)]),
  cheaperPower("w_numbness", "Онемение", "uncommon", 1, "Когда карта сгорает: взять {draw} карту.", "onExhaust", [draw(1)], 0),
  triggerPower("w_pain_power", "Сила боли", "uncommon", 1, "Теряя HP от атаки: {block} блока.", "onDamageTaken", [block(3)], [block(4)]),
  triggerPower("w_soul_link", "Связь душ", "uncommon", 1, "Когда враг умирает, вылечить {heal} HP.", "onEnemyDeath", [heal(4)], [heal(6)]),
  triggerPower("w_ritual_circle", "Круг ритуала", "uncommon", 1, "В конце хода {block} блока.", "onTurnEnd", [block(2)], [block(3)]),
  card("w_demon_skin", "Кожа демона", "power", "uncommon", 2, "self", "Получить {dexterity} Ловкости.", [selfStatus("dexterity", 3)], { effects: [selfStatus("dexterity", 4)] }),
  triggerPower("w_curse_aura", "Аура порчи", "uncommon", 1, "В конце хода {poison} Яда всем.", "onTurnEnd", [allStatus("poison", 1)], [allStatus("poison", 2)]),
  cheaperPower("w_hunger", "Голод", "uncommon", 1, "В начале хода +{strength} Сила и −{loseHp} HP.", "onTurnStart", [selfStatus("strength", 1), loseHp(1)], 0),

  // Редкие атаки
  card("w_annihilate", "Уничтожение", "attack", "rare", 3, "enemy", "Нанести {damage} урона.", [damage(40)], { effects: [damage(52)] }),
  card("w_apocalypse", "Апокалипсис", "attack", "rare", 3, "allEnemies", "Нанести {damage} урона всем врагам.", [damage(20)], { effects: [damage(26)] }),
  card("w_soul_feast", "Пир душ", "attack", "rare", 2, "allEnemies", "Нанести {damage} урона всем. Вылечить {heal} HP. Сжечь.", [damage(10), heal(8), burn], { effects: [damage(13), heal(10), burn] }),
  card("w_immolate", "Самосожжение", "attack", "rare", 2, "allEnemies", "Нанести {damage} урона всем. 2 Раны в сброс.", [damage(22), wound, wound], { effects: [damage(28), wound, wound] }),

  // Редкие навыки
  card("w_last_pact", "Последний договор", "skill", "rare", 0, "self", "+{energy} энергии. Потерять {loseHp} HP. Сжечь.", [energy(3), loseHp(8), burn], { effects: [energy(4), loseHp(8), burn] }),
  card("w_dark_fortress", "Тёмная крепость", "skill", "rare", 2, "self", "{block} блока. Сжечь.", [block(30), burn], { effects: [block(40), burn] }),
  card("w_mind_rot", "Гниение разума", "skill", "rare", 2, "enemy", "{poison} Яда. {weak} Слабости. Сжечь.", [status("poison", 14), status("weak", 3), burn], { effects: [status("poison", 18), status("weak", 3), burn] }),
  card("w_necromancy", "Некромантия", "skill", "rare", 0, "self", "Взять {draw} карты. +{energy} энергия. Сжечь.", [draw(3), energy(1), burn], { effects: [draw(4), energy(2), burn] }),

  // Редкие силы
  card("w_lich_form", "Форма лича", "power", "rare", 3, "self", "+{strength} Силы. +{dexterity} Ловкости.", [selfStatus("strength", 3), selfStatus("dexterity", 3)], { cost: 2 }),
  cheaperPower("w_blood_god", "Бог крови", "rare", 1, "В начале хода +{energy} энергия и −{loseHp} HP.", "onTurnStart", [energy(1), loseHp(2)], 0),
  cheaperPower("w_corruption", "Порча мира", "rare", 1, "Каждая карта: {damage} урона всем.", "onCardPlayed", [fixedDamageToAll(2)], 0),
  triggerPower("w_ashes", "Пепел", "rare", 1, "Когда карта сгорает: {damage} урона всем.", "onExhaust", [fixedDamageToAll(5)], [fixedDamageToAll(7)]),
];
