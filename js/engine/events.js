// Логика событий: выбор события на узле и исполнение варианта. Этот файл не трогает HTML.
import { EVENTS, TRAVEL_EVENTS } from "../data/events.js";
import { pickRandom } from "./rng.js";
import { applyRunEffects, nodeRng } from "./run.js";

// Данные текущего события: из комнаты или встреча в пути. null — такого события больше нет (старое сохранение)
export function getEventData(active) {
  return (active.travel ? TRAVEL_EVENTS : EVENTS)[active.eventId] ?? null;
}

// Выбирает событие, которого ещё не было в этом забеге; если были все, берём из всех
export function startEvent(run) {
  const allIds = Object.keys(EVENTS).filter((id) => !run.lockedEventIds.includes(id));
  const unseen = allIds.filter((id) => !run.seenEventIds.includes(id));
  const eventId = pickRandom(nodeRng(run, "event"), unseen.length > 0 ? unseen : allIds);
  run.seenEventIds.push(eventId);
  run.activeEvent = { eventId, chosenIndex: null, gains: [] };
}

// Встреча при быстром переходе по карте: свой набор событий, тоже без повторов, пока не встретятся все.
// Случайность привязана к номеру перехода: в одну и ту же комнату можно прийти с разными встречами
export function startTravelEvent(run) {
  const allIds = Object.keys(TRAVEL_EVENTS);
  run.seenTravelEventIds ??= [];
  const unseen = allIds.filter((id) => !run.seenTravelEventIds.includes(id));
  const eventId = pickRandom(nodeRng(run, `travelEvent:${run.teleports ?? 0}`), unseen.length > 0 ? unseen : allIds);
  run.seenTravelEventIds.push(eventId);
  run.activeEvent = { eventId, travel: true, chosenIndex: null, gains: [] };
}

// Исполняет вариант события. Возвращает false, если он недоступен или выбор уже сделан
export function chooseEventOption(run, index) {
  const active = run.activeEvent;
  const choice = getEventData(active)?.choices[index];
  if (!choice || active.chosenIndex !== null) return false;

  active.chosenIndex = index;
  active.gains = applyRunEffects(run, choice.effects, nodeRng(run, active.travel ? `travelResult:${run.teleports ?? 0}` : "eventResult"));
  return true;
}

export function finishEvent(run) {
  run.activeEvent = null;
}
