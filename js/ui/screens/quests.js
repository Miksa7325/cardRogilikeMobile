// Экран заданий: прогресс и награды в кронах. Сначала то, что можно забрать, в конце уже полученное.
import { QUESTS } from "../../data/quests.js";
import { TEXTS } from "../../data/texts.ru.js";
import { claimQuest, getQuestProgress, isQuestClaimed, isQuestReady } from "../../engine/meta.js";
import { loadMeta, saveMeta } from "../../save.js";
import { playSound } from "../audio.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderQuestsScreen(root) {
  const meta = loadMeta();
  const screen = el("main", "center-screen quests");
  screen.append(
    el("h1", "event__title", TEXTS.quests.title),
    el("p", "city__balance", TEXTS.city.balance(meta.crowns)),
    el("p", "city__hint", TEXTS.quests.hint),
  );

  // Кнопки сверху: иначе до них пришлось бы листать весь список
  const actions = el("div", "button-row");
  actions.append(
    createButton(TEXTS.city.button, "button--secondary", () => showScreen("city")),
    createButton(TEXTS.quests.back, "button--secondary", () => showScreen("start")),
  );
  screen.append(actions);

  const order = (quest) => {
    if (isQuestReady(meta, quest)) return 0;
    return isQuestClaimed(meta, quest) ? 2 : 1;
  };
  for (const quest of [...QUESTS].sort((a, b) => order(a) - order(b))) screen.append(createQuest(meta, quest));
  root.append(screen);
}

function createQuest(meta, quest) {
  const ready = isQuestReady(meta, quest);
  const claimed = isQuestClaimed(meta, quest);
  const progress = getQuestProgress(meta, quest);

  const card = el("div", "quest");
  if (ready) card.classList.add("quest--ready");
  if (claimed) card.classList.add("quest--claimed");
  card.append(el("div", "quest__title", quest.title), el("div", "quest__description", quest.description));

  const row = el("div", "quest__row");
  if (ready) {
    row.append(createButton(TEXTS.quests.claim(quest.reward), "", () => onClaim(quest.id)));
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

function onClaim(questId) {
  const meta = loadMeta();
  if (!claimQuest(meta, questId)) return;
  saveMeta(meta);
  playSound("buy");
  showScreen("quests");
}
