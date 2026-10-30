// Логика событий: выбор события на узле и исполнение варианта. Этот файл не трогает HTML.
import { EVENTS } from "../data/events.js";
import { pickRandom } from "./rng.js";
import { applyRunEffects, nodeRng } from "./run.js";

// Выбирает событие, которого ещё не было в этом забеге; если были все, берём из всех
export function startEvent(run) {
  const allIds = Object.keys(EVENTS).filter((id) => !run.lockedEventIds.includes(id));
  const unseen = allIds.filter((id) => !run.seenEventIds.includes(id));
  const eventId = pickRandom(nodeRng(run, "event"), unseen.length > 0 ? unseen : allIds);
  run.seenEventIds.push(eventId);
  run.activeEvent = { eventId, chosenIndex: null, gains: [] };
}

export function canChooseEventOption(run, choice) {
  return run.gold >= (choice.requiresGold ?? 0);
}

// Исполняет вариант события. Возвращает false, если он недоступен или выбор уже сделан
export function chooseEventOption(run, index) {
  const active = run.activeEvent;
  const choice = EVENTS[active.eventId].choices[index];
  if (active.chosenIndex !== null || !canChooseEventOption(run, choice)) return false;

  active.chosenIndex = index;
  active.gains = applyRunEffects(run, choice.effects, nodeRng(run, "eventResult"));
  return true;
}

export function finishEvent(run) {
  run.activeEvent = null;
}
