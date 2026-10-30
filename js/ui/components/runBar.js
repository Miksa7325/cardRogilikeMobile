// Верхняя панель забега: HP, золото, этаж и реликвии.
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { getCurrentFloor } from "../../engine/run.js";
import { el } from "../dom.js";

// hp можно передать отдельно: в бою HP меняется раньше, чем попадает в забег
export function createRunBar(run, hp = run.hp) {
  const bar = el("div", "run-bar");
  const relics = el("div", "run-bar__relics");
  for (const relicId of run.relics) {
    relics.append(el("span", "", RELICS[relicId].icon));
  }

  bar.append(
    el("span", "", `❤️ ${hp}/${run.maxHp}`),
    el("span", "", `💰 ${run.gold}`),
    el("span", "", `${TEXTS.floor} ${getCurrentFloor(run)}`),
    relics,
  );
  return bar;
}
