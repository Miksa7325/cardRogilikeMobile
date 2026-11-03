// Экран ячеек сохранения: в каждой свой забег и мета-прогресс. Здесь ячейку выбирают и очищают.
import { CONFIG } from "../../config.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { getCurrentFloor } from "../../engine/run.js";
import { deleteSlot, getActiveSlot, hasSave, loadMeta, loadRun, setActiveSlot } from "../../save.js";
import { state } from "../../state.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderSavesScreen(root) {
  const screen = el("main", "center-screen saves");
  screen.append(el("h1", "event__title", TEXTS.saves.title));
  for (let slot = 1; slot <= CONFIG.saveSlots; slot++) screen.append(createSlot(slot));
  screen.append(createButton(TEXTS.saves.back, "button--secondary", () => showScreen("start")));
  root.append(screen);
}

function createSlot(slot) {
  const active = slot === getActiveSlot();
  const filled = hasSave(slot);
  const card = el("div", "save-slot");
  if (active) card.classList.add("save-slot--active");

  const title = el("div", "save-slot__title", TEXTS.saves.slot(slot));
  if (active) title.append(el("span", "save-slot__badge", TEXTS.saves.active));
  card.append(title);

  if (filled) {
    const meta = loadMeta(slot);
    const run = loadRun(slot);
    card.append(
      el("div", "save-slot__line", TEXTS.saves.progress(meta.runsPlayed, meta.wins, meta.gold)),
      el("div", "save-slot__line", run ? TEXTS.saves.run((HEROES[run.heroId] ?? HEROES.warrior).name,TEXTS.floorLabel(run.act, getCurrentFloor(run))) : TEXTS.saves.noRun),
    );
  } else {
    card.append(el("div", "save-slot__line", TEXTS.saves.empty));
  }

  const row = el("div", "button-row");
  if (!active) row.append(createButton(filled ? TEXTS.saves.select : TEXTS.saves.startEmpty, "", () => onSelect(slot)));
  if (filled) row.append(createRemoveButton(slot));
  if (row.children.length > 0) card.append(row);
  return card;
}

function onSelect(slot) {
  setActiveSlot(slot);
  // Забег и обучение прошлой ячейки здесь ни при чём: начнём с главного меню новой
  state.run = null;
  state.tutorialStep = null;
  showScreen("start");
  showTooltip(TEXTS.saves.selected(slot));
}

// Удаление необратимо, поэтому сначала просим подтвердить вторым нажатием
function createRemoveButton(slot) {
  let confirmed = false;
  const button = createButton(TEXTS.saves.remove, "button--secondary", () => {
    if (!confirmed) {
      confirmed = true;
      button.textContent = TEXTS.saves.removeConfirm;
      return;
    }
    deleteSlot(slot);
    showScreen("saves");
    showTooltip(TEXTS.saves.removed);
  });
  return button;
}
