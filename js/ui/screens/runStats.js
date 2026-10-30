// Страница статистики забега: помогает проверять баланс.
import { ENEMIES } from "../../data/enemies.js";
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";

// Открывается поверх текущего экрана: забег при этом никуда не уходит
export function openRunStats(run) {
  const overlay = el("div", "picker");
  const closeButton = el("button", "button", TEXTS.stats.back);
  closeButton.type = "button";
  closeButton.addEventListener("click", () => overlay.remove());

  const { combats, playMs } = run.stats;
  const turns = combats.reduce((sum, combat) => sum + combat.turns, 0);
  const hpLost = combats.reduce((sum, combat) => sum + Math.max(0, combat.hpBefore - combat.hpAfter), 0);

  overlay.append(
    closeButton,
    el("h1", "event__title", TEXTS.stats.title),
    el("p", "reward__line", TEXTS.stats.time(Math.round(playMs / 60000))),
    el("p", "reward__line", TEXTS.stats.fights(combats.length, turns, hpLost)),
    el("p", "reward__line", TEXTS.stats.deck(run.deck.length, run.relics.length)),
  );
  if (combats.length === 0) overlay.append(el("p", "picker__empty", TEXTS.stats.empty));

  // Бои по актам: так видно, где забег становится труднее
  const acts = [...new Set(combats.map((combat) => combat.act))];
  for (const act of acts) {
    overlay.append(el("p", "picker__title", TEXTS.stats.act(act)));
    for (const combat of combats.filter((item) => item.act === act)) {
      overlay.append(el("p", "stats__row", formatCombat(combat)));
    }
  }
  document.getElementById("app").append(overlay);
}

function formatCombat(combat) {
  const enemies = combat.enemyIds.map((enemyId) => ENEMIES[enemyId].name).join(", ");
  return TEXTS.stats.row(combat.floor, enemies, combat.turns, combat.hpBefore, combat.hpAfter);
}
