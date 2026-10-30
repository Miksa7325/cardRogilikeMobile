// Экран события: текст ситуации, варианты выбора и результат.
import { CARDS } from "../../data/cards.js";
import { EVENTS } from "../../data/events.js";
import { POTIONS } from "../../data/potions.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { canChooseEventOption, chooseEventOption, finishEvent } from "../../engine/events.js";
import { state } from "../../state.js";
import { createRunBar } from "../components/runBar.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

export function renderEventScreen(root) {
  const run = state.run;
  const active = run.activeEvent;
  const event = EVENTS[active.eventId];

  const screen = el("main", "center-screen center-screen--with-bar");
  screen.append(createRunBar(run), el("h1", "event__title", event.title));

  if (active.chosenIndex === null) {
    screen.append(el("p", "reward__line", event.text));
    event.choices.forEach((choice, index) => screen.append(createChoiceButton(run, choice, index)));
  } else {
    screen.append(el("p", "reward__line", event.choices[active.chosenIndex].result));
    for (const gain of active.gains) screen.append(el("p", "reward__line", formatGain(gain)));
    screen.append(createNextButton(run));
  }
  root.append(screen);
}

function createChoiceButton(run, choice, index) {
  const button = el("button", "button event__choice", choice.text);
  button.type = "button";
  button.disabled = !canChooseEventOption(run, choice);
  button.addEventListener("click", () => {
    chooseEventOption(run, index);
    showScreen("event");
  });
  return button;
}

function createNextButton(run) {
  const button = el("button", "button button--large", TEXTS.event.next);
  button.type = "button";
  button.addEventListener("click", () => {
    finishEvent(run);
    showScreen("map");
  });
  return button;
}

// Что именно игрок получил: случайные карты, реликвии и зелья
function formatGain(gain) {
  switch (gain.kind) {
    case "card":
      return TEXTS.event.gainCard(CARDS[gain.id].name);
    case "cardRemoved":
      return TEXTS.event.cardRemoved(CARDS[gain.id].name);
    case "cardUpgraded":
      return TEXTS.event.cardUpgraded(CARDS[gain.id].name);
    case "relic":
      return TEXTS.event.gainRelic(RELICS[gain.id].name, RELICS[gain.id].icon);
    case "potion":
      return TEXTS.event.gainPotion(POTIONS[gain.id].name, POTIONS[gain.id].icon);
    case "gold":
      return TEXTS.event.gainGold(gain.amount);
    default:
      return TEXTS.event.potionsFull;
  }
}
