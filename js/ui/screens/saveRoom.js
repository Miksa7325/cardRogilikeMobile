// Комната сохранения: только отсюда можно подняться из подземелья в город, а потом вернуться сюда же и идти дальше.
import { TEXTS } from "../../data/texts.ru.js";
import { saveRun } from "../../save.js";
import { state } from "../../state.js";
import { createRunBar } from "../components/runBar.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { trackPlayTime } from "../playTime.js";
import { showScreen } from "../router.js";
import { openCity } from "./city.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderSaveRoomScreen(root) {
  const run = state.run;
  // Комнату записываем сразу: если закрыть игру здесь, забег продолжится из неё и в город можно будет подняться
  trackPlayTime(run);
  if (!saveRun(run)) showTooltip(TEXTS.saveFailed);

  const screen = el("main", "center-screen center-screen--with-bar");
  screen.append(
    createRunBar(run, { allSaved: true }),
    el("h1", "center-screen__title", TEXTS.saveRoom.title),
    el("p", "reward__line", TEXTS.saveRoom.text),
    createButton(TEXTS.saveRoom.toCity, "button--large", () => openCity("gate")),
    createButton(TEXTS.saveRoom.onward, "button--secondary", () => showScreen("dungeon")),
  );
  root.append(screen);
}
