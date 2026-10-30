// Обучение в первом бою: подсказки ведут игрока за руку, но ничего не запрещают.
// Шаг двигается сам, когда игрок делает нужное действие, или по кнопке «Дальше».
import { TEXTS } from "../data/texts.ru.js";
import { canPlayCard } from "../engine/combat.js";
import { getCardData } from "../engine/deck.js";
import { loadMeta, saveMeta } from "../save.js";
import { state } from "../state.js";
import { el } from "./dom.js";
import { showScreen } from "./router.js";

// waitFor — действие, которое завершает шаг; без него показывается кнопка «Дальше»
const STEPS = [
  { id: "map", screen: "map", waitFor: "nodeEntered" },
  { id: "intent", screen: "combat", highlight: "enemy" },
  { id: "energy", screen: "combat", highlight: "energy" },
  { id: "attack", screen: "combat", waitFor: "cardSelected", highlight: "attack" },
  { id: "target", screen: "combat", waitFor: "cardPlayed", highlight: "enemy" },
  { id: "block", screen: "combat", waitFor: "blockGained", highlight: "block" },
  { id: "endTurn", screen: "combat", waitFor: "turnEnded", highlight: "endTurn" },
  { id: "inspect", screen: "combat" },
];

function currentStep() {
  return state.tutorialStep === null ? null : STEPS[state.tutorialStep];
}

export function startTutorial() {
  state.tutorialStep = 0;
}

export function finishTutorial() {
  state.tutorialStep = null;
  const meta = loadMeta();
  meta.tutorialDone = true;
  saveMeta(meta);
}

function goToNextStep() {
  state.tutorialStep += 1;
  if (state.tutorialStep >= STEPS.length) finishTutorial();
}

// Сообщает обучению о действии игрока
export function notifyTutorial(action) {
  const step = currentStep();
  if (!step) return;
  if (step.waitFor === action) {
    goToNextStep();
  } else if (action === "turnEnded") {
    // Игрок завершил ход раньше подсказки: остальные шаги про ход уже не имеют смысла
    state.tutorialStep = STEPS.findIndex((item) => item.id === "inspect");
  }
}

// Шаг про блок нечем выполнить, если нет подходящей карты или энергии: тогда его пропускаем
function skipImpossibleSteps(combat) {
  if (currentStep()?.id !== "block") return;
  const hasBlockCard = combat.piles.hand.some((card) => isBlockCard(card) && canPlayCard(combat, card));
  if (!hasBlockCard) goToNextStep();
}

function isBlockCard(cardInstance) {
  const card = getCardData(cardInstance);
  return card.target === "self" && card.effects.some((effect) => effect.type === "block");
}

// Нужно ли подсветить этот элемент на текущем шаге
export function isTutorialTarget(kind, cardInstance = null) {
  const highlight = currentStep()?.highlight;
  if (highlight === kind) return true;
  if (!cardInstance) return false;
  if (highlight === "attack") return getCardData(cardInstance).target === "enemy";
  if (highlight === "block") return isBlockCard(cardInstance);
  return false;
}

// Плашка с подсказкой на экране. Возвращает null, если обучения сейчас нет
export function createTutorialBanner(screenName, combat = null) {
  if (combat) skipImpossibleSteps(combat);
  const step = currentStep();
  if (!step || step.screen !== screenName) return null;

  const banner = el("div", "tutorial");
  banner.append(el("p", "tutorial__text", TEXTS.tutorial[step.id]));

  const controls = el("div", "tutorial__controls");
  const skip = el("button", "tutorial__button", TEXTS.tutorial.skip);
  skip.type = "button";
  skip.addEventListener("click", () => {
    finishTutorial();
    showScreen(screenName);
  });
  controls.append(skip);

  if (!step.waitFor) {
    const next = el("button", "tutorial__button tutorial__button--main", TEXTS.tutorial.next);
    next.type = "button";
    next.addEventListener("click", () => {
      goToNextStep();
      showScreen(screenName);
    });
    controls.append(next);
  }
  banner.append(controls);
  return banner;
}
