// Экран выбора героя и уровня сложности перед забегом.
import { CONFIG } from "../../config.js";
import { DIFFICULTY_LEVELS } from "../../data/difficulty.js";
import { HEROES } from "../../data/heroes.js";
import { TEXTS } from "../../data/texts.ru.js";
import { getHeroUnlockXp, isDifficultyUnlocked, isHeroUnlocked } from "../../engine/meta.js";
import { loadMeta } from "../../save.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { startNewRun } from "./map.js";

// Выбор живёт между перерисовками экрана, поэтому хранится вне функции
let selectedHeroId = "warrior";
let selectedDifficulty = 0;

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderHeroSelectScreen(root) {
  const meta = loadMeta();
  // Если сохранение заменили, выбранный герой мог оказаться закрытым
  if (!isHeroUnlocked(meta, selectedHeroId)) selectedHeroId = "warrior";
  if (!isDifficultyUnlocked(meta)) selectedDifficulty = 0;

  const screen = el("main", "center-screen hero-select");
  screen.append(el("h1", "event__title", TEXTS.heroSelect.title));
  for (const hero of Object.values(HEROES)) screen.append(createHeroRow(meta, hero));
  if (isDifficultyUnlocked(meta)) screen.append(createDifficultyPicker());

  screen.append(
    createButton(TEXTS.heroSelect.start, "button--large", () => startNewRun(selectedHeroId, selectedDifficulty)),
    createButton(TEXTS.heroSelect.back, "button--secondary", () => showScreen("start")),
  );
  root.append(screen);
}

function createHeroRow(meta, hero) {
  const unlocked = isHeroUnlocked(meta, hero.id);
  const row = el("button", "hero-select__hero");
  row.type = "button";
  row.disabled = !unlocked;
  if (hero.id === selectedHeroId) row.classList.add("hero-select__hero--selected");

  const details = unlocked
    ? `${hero.description} ${TEXTS.heroSelect.hp(hero.maxHp)}`
    : TEXTS.heroSelect.locked(getHeroUnlockXp(hero.id), meta.xp);
  row.append(el("div", "hero-select__name", hero.name), el("div", "hero-select__details", details));
  row.addEventListener("click", () => {
    selectedHeroId = hero.id;
    showScreen("heroSelect");
  });
  return row;
}

function createDifficultyPicker() {
  const picker = el("div", "hero-select__difficulty");
  const lower = createButton("−", "button--secondary", () => changeDifficulty(-1));
  lower.disabled = selectedDifficulty === 0;
  const raise = createButton("+", "button--secondary", () => changeDifficulty(1));
  raise.disabled = selectedDifficulty === CONFIG.difficulty.maxLevel;

  const controls = el("div", "hero-select__controls");
  controls.append(lower, el("span", "hero-select__level", TEXTS.heroSelect.difficulty(selectedDifficulty)), raise);
  picker.append(controls);

  // Показываем, что добавляет именно выбранный уровень: остальные уже включены в него
  const level = DIFFICULTY_LEVELS.find((item) => item.level === selectedDifficulty);
  picker.append(el("p", "hero-select__details", level ? level.description : TEXTS.heroSelect.noDifficulty));
  return picker;
}

function changeDifficulty(step) {
  selectedDifficulty += step;
  showScreen("heroSelect");
}
