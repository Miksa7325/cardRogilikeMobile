// Все герои игры: здоровье, стартовая колода и реликвия.
import { CONFIG } from "../config.js";

export const HEROES = {
  warrior: {
    id: "warrior",
    name: "Воин",
    maxHp: CONFIG.warriorMaxHp,
    deck: [
      "strike", "strike", "strike", "strike", "strike",
      "defend", "defend", "defend", "defend",
      "bash",
    ],
    relics: ["burning_blood"],
  },
};
