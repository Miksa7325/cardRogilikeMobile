// Все герои игры: здоровье, описание, стартовая колода, реликвия и особенность класса.
// mechanic — то, что отличает класс: resource — статус-ресурс героя, passives — как он его копит
// (триггер и эффекты, как у карт-сил). Ресурс тратят и усиливают карты класса.
import { CONFIG } from "../config.js";

const gain = (status, amount = 1) => [{ type: "applyStatus", status, amount, target: "self" }];

export const HEROES = {
  warrior: {
    id: "warrior",
    name: "Воин",
    description: "Ярость: чем дольше бой, тем страшнее его удары.",
    maxHp: CONFIG.warriorMaxHp,
    mechanic: {
      name: "Ярость",
      resource: "rage",
      text: "Каждая разыгранная атака и каждый пропущенный удар дают 1 Ярость. Карты «Ярость N» тратят её на мощные приёмы, другие бьют сильнее за каждую Ярость.",
      passives: [
        { trigger: "onCardPlayed", cardType: "attack", effects: gain("rage") },
        { trigger: "onDamageTaken", effects: gain("rage") },
      ],
    },
    deck: [
      "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "bash", "rage_burst",
    ],
    relics: ["burning_blood"],
  },
  assassin: {
    id: "assassin",
    name: "Убийца",
    description: "Комбо: много дешёвых карт за ход, а потом — добивание.",
    maxHp: CONFIG.assassinMaxHp,
    mechanic: {
      name: "Комбо",
      resource: "combo",
      text: "Каждая разыгранная карта даёт 1 Комбо, в конце хода Комбо сгорает. Добивания бьют сильнее за каждое Комбо, а приёмы «Комбо N» тратят его.",
      passives: [{ trigger: "onCardPlayed", effects: gain("combo") }],
    },
    deck: [
      "a_strike", "a_strike", "a_strike", "a_strike",
      "a_dodge", "a_dodge", "a_dodge", "a_dodge",
      "a_dart", "a_finisher",
    ],
    relics: ["venom_ring"],
  },
  warlock: {
    id: "warlock",
    name: "Чернокнижник",
    description: "Тьма: платит здоровьем и Ранами, а Тьма копится весь бой.",
    maxHp: CONFIG.warlockMaxHp,
    mechanic: {
      name: "Тьма",
      resource: "darkness",
      text: "Каждая плата своим здоровьем и каждая сожжённая Рана дают 1 Тьму. Тьма копится весь бой: тёмные карты растут от неё или тратят её.",
      passives: [
        { trigger: "onHpPaid", effects: gain("darkness") },
        { trigger: "onWoundBurned", effects: gain("darkness") },
      ],
    },
    deck: [
      "w_bolt", "w_bolt", "w_bolt", "w_bolt",
      "w_shield", "w_shield", "w_shield", "w_shield",
      "w_sacrifice", "w_dark_bolt",
    ],
    relics: ["soul_chalice"],
  },
  alchemist: {
    id: "alchemist",
    name: "Алхимик",
    description: "Варка: носит 4 зелья и варит их прямо в бою.",
    maxHp: CONFIG.alchemistMaxHp,
    maxPotions: 4,
    mechanic: {
      name: "Варка",
      resource: "reagents",
      text: "Носит 4 зелья вместо 3 и варит их картами прямо в бою. Каждое сваренное зелье даёт 1 Реагент, каждое выпитое — 2. Смеси тратят Реагенты, катализаторы растут от них.",
      passives: [
        { trigger: "onPotionBrewed", effects: gain("reagents") },
        { trigger: "onPotionUsed", effects: gain("reagents", 2) },
      ],
    },
    deck: [
      "al_toss", "al_toss", "al_toss", "al_toss",
      "al_guard", "al_guard", "al_guard", "al_guard",
      "al_brew", "al_catalyst",
    ],
    relics: ["field_cauldron"],
  },
  mage: {
    id: "mage",
    name: "Маг",
    description: "Прилив: с каждым ходом всё больше энергии на дорогие заклинания.",
    maxHp: CONFIG.mageMaxHp,
    mechanic: {
      name: "Прилив",
      resource: "surge",
      text: "В начале каждого хода Маг получает столько дополнительной энергии, сколько у него Прилива, а потом Прилив растёт на 1. Новых карт в руку почти не приходит: заклинания дорогие, их надо тратить с умом. Чародейские карты сильнее за каждый Прилив.",
      passives: [
        { trigger: "onTurnStart", effects: [{ type: "gainEnergy", amount: 0, bonus: { status: "surge", per: 1 } }, ...gain("surge")] },
      ],
    },
    deck: [
      "m_spark", "m_spark", "m_spark", "m_spark",
      "m_barrier", "m_barrier", "m_barrier", "m_barrier",
      "m_frostbolt", "m_arcane_blast",
    ],
    relics: ["moon_bell"],
  },
};

// Сколько зелий носит герой: Алхимик больше остальных
export function getMaxPotions(heroId) {
  return HEROES[heroId]?.maxPotions ?? CONFIG.maxPotions;
}
