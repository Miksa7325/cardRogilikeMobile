// Все герои игры: здоровье и стартовая колода.
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
  },
};
