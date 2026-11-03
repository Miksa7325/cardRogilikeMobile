// Разговор со старейшиной в городе: задания и награды в кронах. Сначала то, что можно забрать, в конце уже полученное.
import { QUESTS } from "../../data/quests.js";
import { TEXTS } from "../../data/texts.ru.js";
import { claimQuest, countReadyQuests, getQuestProgress, isQuestClaimed, isQuestReady } from "../../engine/meta.js";
import { loadMeta, saveMeta } from "../../save.js";
import { ELDER_ART } from "../art.js";
import { playSound } from "../audio.js";
import { el } from "../dom.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

// onClaimed вызывается после получения награды: город перерисует баланс и снова откроет окно
export function openQuestDialog(onClaimed) {
  const meta = loadMeta();
  const overlay = el("div", "card-preview");
  const dialog = el("div", "quest-dialog");
  const portrait = el("div", "quest-dialog__portrait");
  portrait.innerHTML = ELDER_ART;
  dialog.append(
    portrait,
    el("h2", "event__title", TEXTS.quests.elder),
    el("p", "quest-dialog__speech", countReadyQuests(meta) > 0 ? TEXTS.quests.greetingReady : TEXTS.quests.greeting),
    el("p", "quests__balance", TEXTS.city.balance(meta.crowns)),
    el("p", "quests__hint", TEXTS.quests.hint),
  );

  const order = (quest) => {
    if (isQuestReady(meta, quest)) return 0;
    return isQuestClaimed(meta, quest) ? 2 : 1;
  };
  const list = el("div", "quest-dialog__list");
  for (const quest of [...QUESTS].sort((a, b) => order(a) - order(b))) list.append(createQuest(meta, quest, onClaimed));

  dialog.append(list, createButton(TEXTS.city.close, "button--secondary", () => overlay.remove()));
  overlay.append(dialog);
  document.getElementById("app").append(overlay);
}

function createQuest(meta, quest, onClaimed) {
  const ready = isQuestReady(meta, quest);
  const claimed = isQuestClaimed(meta, quest);
  const progress = getQuestProgress(meta, quest);

  const card = el("div", "quest");
  if (ready) card.classList.add("quest--ready");
  if (claimed) card.classList.add("quest--claimed");
  card.append(el("div", "quest__title", quest.title), el("div", "quest__description", quest.description));

  const row = el("div", "quest__row");
  if (ready) {
    row.append(createButton(TEXTS.quests.claim(quest.reward), "", () => onClaim(quest.id, onClaimed)));
  } else if (claimed) {
    row.append(el("div", "quest__reward", TEXTS.quests.claimed));
  } else {
    const bar = el("div", "quest__bar");
    const fill = el("div", "quest__fill");
    fill.style.width = `${(progress / quest.goal) * 100}%`;
    bar.append(fill, el("div", "quest__count", TEXTS.quests.progress(progress, quest.goal)));
    row.append(bar, el("div", "quest__reward", TEXTS.quests.reward(quest.reward)));
  }
  card.append(row);
  return card;
}

function onClaim(questId, onClaimed) {
  const meta = loadMeta();
  if (!claimQuest(meta, questId)) return;
  saveMeta(meta);
  playSound("buy");
  onClaimed();
}
