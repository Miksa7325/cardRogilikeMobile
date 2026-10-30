// Все реликвии игры. trigger — когда срабатывает, effects — что происходит.
export const RELICS = {
  burning_blood: {
    id: "burning_blood",
    name: "Горящая кровь",
    icon: "🔥",
    rarity: "starter",
    trigger: "onCombatEnd",
    effects: [{ type: "heal", amount: 6 }],
  },
};
