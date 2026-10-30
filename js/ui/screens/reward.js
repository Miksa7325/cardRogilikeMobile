// Экран награды после боя, сундука и босса.
import { POTIONS } from "../../data/potions.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { completeReward, getCurrentNode } from "../../engine/run.js";
import { state } from "../../state.js";
import { createCardElement } from "../components/card.js";
import { createRunBar } from "../components/runBar.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

// Вне боя статусов нет: числа на картах показываем без них
const HERO_OUTSIDE_COMBAT = { statuses: {} };

export function renderRewardScreen(root) {
  const run = state.run;
  const reward = run.pendingReward;

  const screen = el("main", "center-screen center-screen--with-bar");
  // Награда сундука ещё не сохранена, а награда за бой уже сохранена
  const allSaved = getCurrentNode(run).type !== "chest";
  screen.append(createRunBar(run, { allSaved }), el("h1", "center-screen__title", getTitle(run)));

  if (reward.gold > 0) screen.append(el("p", "reward__line", TEXTS.reward.gold(reward.gold)));
  if (reward.relicId) {
    const relic = RELICS[reward.relicId];
    screen.append(el("p", "reward__line", TEXTS.reward.relic(relic.name, relic.icon, relic.description)));
  }
  if (reward.relicFallbackGold > 0) {
    screen.append(el("p", "reward__line", TEXTS.reward.noRelic(reward.relicFallbackGold)));
  }
  if (reward.potionId) {
    const potion = POTIONS[reward.potionId];
    screen.append(el("p", "reward__line", TEXTS.reward.potion(potion.name, potion.icon, potion.description)));
  }
  if (reward.potionsFull) screen.append(el("p", "reward__line", TEXTS.reward.potionsFull));

  if (reward.cardIds.length > 0) {
    screen.append(el("p", "reward__line", TEXTS.reward.chooseCard), createCardChoices(reward.cardIds));
  }

  // Когда есть карты, можно отказаться, а без карт кнопка просто ведёт дальше
  const label = reward.cardIds.length > 0 ? TEXTS.reward.skip : TEXTS.reward.next;
  const button = el("button", "button button--large", label);
  button.type = "button";
  button.addEventListener("click", () => finishReward(null));
  screen.append(button);

  root.append(screen);
}

function getTitle(run) {
  const type = getCurrentNode(run).type;
  if (type === "chest") return TEXTS.reward.chestTitle;
  if (type === "boss") return TEXTS.reward.bossTitle;
  return TEXTS.reward.title;
}

function createCardChoices(cardIds) {
  const row = el("div", "card-row");
  cardIds.forEach((cardId, index) => {
    const instance = { uid: index, cardId, upgraded: false };
    row.append(createCardElement(instance, HERO_OUTSIDE_COMBAT, {
      playable: true,
      selected: false,
      onTap: () => finishReward(cardId),
    }));
  });
  return row;
}

function finishReward(cardId) {
  completeReward(state.run, cardId);
  showScreen(state.run.status === "won" ? "result" : "map");
}
