// Все герои игры: здоровье, описание, стартовая колода и реликвия.
import { CONFIG } from "../config.js";

export const HEROES = {
  warrior: {
    id: "warrior",
    name: "Воин",
    description: "Сила и блок. Простой и надёжный герой.",
    maxHp: CONFIG.warriorMaxHp,
    deck: [
      "strike", "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "bash",
    ],
    relics: ["burning_blood"],
  },
  assassin: {
    id: "assassin",
    name: "Убийца",
    description: "Яд, дешёвые карты и добор.",
    maxHp: CONFIG.assassinMaxHp,
    deck: [
      "a_strike", "a_strike", "a_strike", "a_strike", "a_strike",
      "a_dodge", "a_dodge", "a_dodge", "a_dodge",
      "a_dart",
    ],
    relics: ["venom_ring"],
  },
  warlock: {
    id: "warlock",
    name: "Чернокнижник",
    description: "Плата своим HP, сжигание и Раны.",
    maxHp: CONFIG.warlockMaxHp,
    deck: [
      "w_bolt", "w_bolt", "w_bolt", "w_bolt", "w_bolt",
      "w_shield", "w_shield", "w_shield", "w_shield",
      "w_sacrifice",
    ],
    relics: ["soul_chalice"],
  },
};
