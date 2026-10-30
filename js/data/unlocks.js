// Что открывается за опыт. Опыт копится между забегами и не даёт прямой силы:
// он добавляет героев и расширяет пул необычными картами и реликвиями, а не самыми сильными.
export const UNLOCKS = [
  { xp: 50, cards: ["taunt", "poison_cloud", "venom_mastery", "plague", "blood_surge", "calculation"] },
  { xp: 100, relics: ["poison_vial", "whetstone", "mace_head", "lucky_coin"] },
  { xp: 150, hero: "assassin" },
  { xp: 225, cards: ["a_double_dose", "a_thousand_poisons", "a_toxic_blades", "a_killer_instinct", "a_swift_hands", "a_siphon"] },
  { xp: 300, relics: ["thorn_bracer", "light_boots", "dented_shield", "lantern"] },
  { xp: 400, hero: "warlock" },
  { xp: 500, cards: ["w_numbness", "w_ashes", "w_dark_embrace", "w_fuel", "w_forbidden", "w_cauterize"] },
  { xp: 625, cards: ["thousand_cuts", "adrenal_rush", "a_thousand_blades", "a_quickness", "w_corruption", "w_hunger"] },
];
