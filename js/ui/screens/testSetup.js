// Тестовый режим: выбор любых врагов для боя.
import { CONFIG } from "../../config.js";
import { ENEMIES } from "../../data/enemies.js";
import { TEXTS } from "../../data/texts.ru.js";
import { state } from "../../state.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { startTestCombat } from "./combat.js";

export function renderTestSetupScreen(root) {
  const { test } = state;
  const screen = el("main", "center-screen");
  screen.append(
    el("h1", "center-screen__title", TEXTS.test.title),
    el("p", "test-setup__label", TEXTS.test.chooseEnemies),
  );

  const available = el("div", "test-setup__list");
  for (const enemy of Object.values(ENEMIES)) {
    const button = createButton(enemy.name, "button--secondary", () => {
      if (test.enemyIds.length < CONFIG.maxEnemiesInCombat) {
        test.enemyIds.push(enemy.id);
        showScreen("testSetup");
      }
    });
    available.append(button);
  }

  const selected = el("div", "test-setup__list");
  test.enemyIds.forEach((enemyId, index) => {
    const button = createButton(ENEMIES[enemyId].name, "", () => {
      test.enemyIds.splice(index, 1);
      showScreen("testSetup");
    });
    selected.append(button);
  });

  const startButton = createButton(TEXTS.test.start, "button--large", startTestCombat);
  startButton.disabled = test.enemyIds.length === 0;

  screen.append(
    available,
    el("p", "test-setup__label", TEXTS.test.selectedEnemies),
    selected,
    startButton,
    createButton(TEXTS.test.back, "button--secondary", () => showScreen("start")),
  );
  root.append(screen);
}

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}
