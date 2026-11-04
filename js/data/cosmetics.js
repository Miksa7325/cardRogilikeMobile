// Окраски героев из лавки красок. filter — как перекрасить рисунок героя (CSS filter), price — цена в золоте.
// Купленную окраску можно надеть любому герою. Обычный вид — без окраски.
export const COSMETICS = {
  crimson: { id: "crimson", name: "Багровая", filter: "hue-rotate(-40deg) saturate(1.8)", price: 30 },
  emerald: { id: "emerald", name: "Изумрудная", filter: "hue-rotate(90deg) saturate(1.5)", price: 30 },
  azure: { id: "azure", name: "Лазурная", filter: "hue-rotate(190deg) saturate(1.4)", price: 30 },
  golden: { id: "golden", name: "Золотая", filter: "sepia(1) saturate(2.5) hue-rotate(-10deg) brightness(1.15)", price: 60 },
  shadow: { id: "shadow", name: "Теневая", filter: "grayscale(1) brightness(0.65) contrast(1.4)", price: 45 },
  spectral: { id: "spectral", name: "Призрачная", filter: "grayscale(0.6) hue-rotate(160deg) brightness(1.3) opacity(0.75)", price: 70 },
};
