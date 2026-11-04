// Окна служб городских зданий: что можно сделать в построенном доме. Логика служб — в engine/town.js.
// Службы работают для героя, который сейчас в забеге, а если забега нет — для выбранного в доме героев.
// После каждой покупки город перерисовывается с новой казной и то же окно открывается снова (reopen).
import { CONFIG } from "../../config.js";
import { CARDS } from "../../data/cards.js";
import { COSMETICS } from "../../data/cosmetics.js";
import { ENEMIES } from "../../data/enemies.js";
import { HEROES, getMaxPotions } from "../../data/heroes.js";
import { RELICS } from "../../data/relics.js";
import { TEXTS } from "../../data/texts.ru.js";
import { buyFromTrader, getPotionGoods, isHeroDead, isTraderGoodOwned } from "../../engine/meta.js";
import { createRng } from "../../engine/rng.js";
import {
  blessHero, buyCosmetic, buyFortune, cleanseCard, forgeRelic, getArenaFights, getBlessingPrice, getGear, getLibraryOffers,
  getStudyPrice, getTrainableCards, hireHero, isCosmeticOwned, studyCard, trainCard, wearCosmetic,
} from "../../engine/town.js";
import { loadMeta, loadRun, saveMeta, saveRun } from "../../save.js";
import { state } from "../../state.js";
import { heroSprite } from "../art.js";
import { playSound } from "../audio.js";
import { formatDescription, shakeCard } from "../components/card.js";
import { openCardList } from "../components/cardList.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { startArenaCombat } from "./combat.js";

// Вне боя статусов нет: числа на картах показываем без них
const HERO_OUTSIDE_COMBAT = { statuses: {} };

// Выбор карты из окна здания. Окно здания лежит выше списка карт, поэтому на время выбора его убираем,
// а если ничего не выбрали — открываем снова
function pickFromDialog(dialog, reopen, sections, onPick) {
  dialog.closest(".card-preview")?.remove();
  openCardList(sections, onPick, reopen);
}

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

// Строка списка: заголовок, описание и кнопка справа внизу
function createRow(title, description, button) {
  const row = el("div", "quest");
  row.append(el("div", "quest__title", title), el("div", "quest__description", description));
  if (button) {
    const actions = el("div", "quest__row");
    actions.append(button);
    row.append(actions);
  }
  return row;
}

// Добавляет в окно здания то, что умеет его служба. reopen перерисовывает город и открывает окно снова
export function appendService(dialog, building, reopen) {
  const meta = loadMeta();
  const run = loadRun();
  const heroId = run?.heroId ?? meta.selectedHero;
  const context = { dialog, meta, run, heroId, reopen };
  // Записывает изменения: казну, а если снаряжение героя в забеге — и сам забег
  context.done = (gear) => {
    if (gear && gear === run) state.run = run;
    if (!saveMeta(meta) || (gear === run && !saveRun(run))) showTooltip(TEXTS.saveFailed);
    playSound("buy");
    reopen();
  };
  SERVICES[building.service]?.(context);
}

// Службы для героя не работают, если выбранный герой погиб и забега нет: сначала нужно выбрать живого
function appendHeroLine({ dialog, meta, run, heroId }) {
  if (!run && isHeroDead(meta, heroId)) {
    dialog.append(el("p", "quests__hint", TEXTS.city.heroIsDead(HEROES[heroId].name)));
    return false;
  }
  dialog.append(el("p", "quests__hint", TEXTS.services.forHero(HEROES[heroId].name)));
  return true;
}

function fail(button, reasonText) {
  shakeCard(button);
  showTooltip(reasonText);
}

const SERVICES = {
  // Таверна: нанять нового героя вместо павшего
  hire({ dialog, meta, done }) {
    const fallen = Object.values(HEROES).filter((hero) => isHeroDead(meta, hero.id));
    if (fallen.length === 0) {
      dialog.append(el("p", "quests__hint", TEXTS.services.nobodyFallen));
      return;
    }
    const list = el("div", "quest-dialog__list");
    for (const hero of fallen) {
      const hire = createButton(TEXTS.services.hire(CONFIG.city.prices.hire), "", () => {
        if (hireHero(meta, hero.id)) done();
        else fail(hire, TEXTS.trader.notEnoughGold);
      });
      hire.disabled = meta.gold < CONFIG.city.prices.hire;
      list.append(createRow(hero.name, TEXTS.services.hireText, hire));
    }
    dialog.append(list);
  },

  // Лавка алхимика: зелья в сумку героя. Если забега нет, герой возьмёт их в следующий
  potions({ dialog, meta, run, heroId, done }) {
    const holder = run ?? meta.supplies;
    dialog.append(
      el("p", "quests__hint", run ? TEXTS.trader.intoRun : TEXTS.trader.intoNextRun),
      el("p", "quests__hint", TEXTS.trader.bag(holder.potions.length, getMaxPotions(heroId))),
    );
    const list = el("div", "quest-dialog__list");
    for (const good of getPotionGoods(meta)) list.append(createGood(meta, run, good, done));
    dialog.append(list);
  },

  // Библиотека: выучить одну из трёх карт своего героя
  study(context) {
    const { dialog, meta, run, heroId, done } = context;
    if (!appendHeroLine(context)) return;
    const gear = getGear(meta, run, heroId);
    const list = el("div", "quest-dialog__list");
    for (const cardId of getLibraryOffers(meta, heroId, createRng(Date.now()))) {
      const card = CARDS[cardId];
      const price = getStudyPrice(cardId);
      const learn = createButton(TEXTS.services.study(price), "", () => {
        if (studyCard(meta, gear, heroId, cardId)) done(gear);
        else fail(learn, TEXTS.trader.notEnoughGold);
      });
      learn.disabled = meta.gold < price;
      list.append(createRow(TEXTS.services.cardTitle(card.name, TEXTS.preview.rarities[card.rarity]), formatDescription(card, HERO_OUTSIDE_COMBAT), learn));
    }
    // Предложения запоминаются, пока одно не выучат: сохраняем их сразу
    saveMeta(meta);
    dialog.append(list);
  },

  // Кузница: случайная реликвия в снаряжение героя
  forge(context) {
    const { dialog, meta, run, heroId, done } = context;
    if (!appendHeroLine(context)) return;
    const gear = getGear(meta, run, heroId);
    const forge = createButton(TEXTS.services.forge(CONFIG.city.prices.forge), "button--large", () => {
      const relicId = forgeRelic(meta, gear, createRng(Date.now()));
      if (!relicId) {
        fail(forge, meta.gold < CONFIG.city.prices.forge ? TEXTS.trader.notEnoughGold : TEXTS.services.forgeEmpty);
        return;
      }
      done(gear);
      const relic = RELICS[relicId];
      showTooltip(TEXTS.services.forged(relic.icon, relic.name, relic.description));
    });
    forge.disabled = meta.gold < CONFIG.city.prices.forge;
    dialog.append(forge);
  },

  // Храм: очистить колоду от карты и благословить на здоровье
  temple(context) {
    const { dialog, meta, run, heroId, done, reopen } = context;
    if (!appendHeroLine(context)) return;
    const gear = getGear(meta, run, heroId);
    const cleanse = createButton(TEXTS.services.cleanse(CONFIG.city.prices.cleanse), "button--secondary", () => {
      pickFromDialog(dialog, reopen, [{ title: TEXTS.services.cleanseTitle, cards: gear.deck }], (card) => {
        if (cleanseCard(meta, gear, card.uid)) done(gear);
        else reopen();
      });
    });
    cleanse.disabled = meta.gold < CONFIG.city.prices.cleanse || gear.deck.length === 0;
    const blessPrice = getBlessingPrice(gear);
    const bless = createButton(TEXTS.services.bless(CONFIG.city.blessingHp, blessPrice), "button--secondary", () => {
      if (blessHero(meta, gear)) done(gear);
    });
    bless.disabled = meta.gold < blessPrice;
    dialog.append(el("p", "quests__hint", TEXTS.services.maxHp(gear.maxHp)), cleanse, bless);
  },

  // Тренировочная арена: улучшить карту
  training(context) {
    const { dialog, meta, run, heroId, done, reopen } = context;
    if (!appendHeroLine(context)) return;
    const gear = getGear(meta, run, heroId);
    const trainable = getTrainableCards(gear);
    const train = createButton(TEXTS.services.train(CONFIG.city.prices.training), "button--large", () => {
      pickFromDialog(dialog, reopen, [{ title: TEXTS.services.trainTitle, cards: trainable }], (card) => {
        if (trainCard(meta, gear, card.uid)) done(gear);
        else reopen();
      });
    });
    train.disabled = meta.gold < CONFIG.city.prices.training || trainable.length === 0;
    dialog.append(train);
  },

  // Боевая арена: бои без смерти за золото и эссенции
  arena(context) {
    const { dialog, meta, run, heroId } = context;
    if (!appendHeroLine(context)) return;
    const gear = getGear(meta, run, heroId);
    const list = el("div", "quest-dialog__list");
    for (const fight of getArenaFights()) {
      const enemies = fight.enemyIds.map((id) => ENEMIES[id].name).join(", ");
      const start = createButton(TEXTS.services.fight, "", () => {
        saveMeta(meta);
        startArenaCombat(heroId, gear, fight);
      });
      list.append(createRow(fight.name, TEXTS.services.arenaFight(enemies, fight.reward.gold, fight.reward.essences), start));
    }
    dialog.append(el("p", "quests__hint", TEXTS.services.arenaRules), list);
  },

  // Лавка красок: купить окраску и надеть её на героя
  cosmetics({ dialog, meta, heroId, done }) {
    dialog.append(el("p", "quests__hint", TEXTS.services.forHero(HEROES[heroId].name)));
    const list = el("div", "quest-dialog__list");
    const worn = meta.cosmetics?.worn?.[heroId] ?? null;
    const plain = createButton(worn === null ? TEXTS.services.worn : TEXTS.services.wear, "", () => {
      wearCosmetic(meta, heroId, null);
      done();
    });
    plain.disabled = worn === null;
    list.append(createLookRow(heroId, "", TEXTS.services.plainLook, plain));
    for (const cosmetic of Object.values(COSMETICS)) {
      const owned = isCosmeticOwned(meta, cosmetic.id);
      let label = TEXTS.trader.buy(cosmetic.price);
      if (owned) label = worn === cosmetic.id ? TEXTS.services.worn : TEXTS.services.wear;
      const button = createButton(label, "", () => {
        if (!owned && !buyCosmetic(meta, cosmetic.id)) {
          fail(button, TEXTS.trader.notEnoughGold);
          return;
        }
        wearCosmetic(meta, heroId, cosmetic.id);
        done();
      });
      button.disabled = worn === cosmetic.id || (!owned && meta.gold < cosmetic.price);
      list.append(createLookRow(heroId, cosmetic.filter, cosmetic.name, button));
    }
    dialog.append(list);
  },

  // Гадалка: реликвия на следующий спуск
  fortune({ dialog, meta, done }) {
    if (meta.supplies.blessing) {
      dialog.append(el("p", "quests__hint", TEXTS.services.fortuneReady));
      return;
    }
    const fortune = createButton(TEXTS.services.fortune(CONFIG.city.prices.fortune), "button--large", () => {
      if (buyFortune(meta)) done();
    });
    fortune.disabled = meta.gold < CONFIG.city.prices.fortune;
    dialog.append(fortune);
  },
};

// Строка окраски: герой в этой окраске, её название и кнопка
function createLookRow(heroId, filter, name, button) {
  const row = el("div", "quest look-row");
  const image = el("img", "look-row__hero");
  image.src = heroSprite(heroId);
  image.alt = "";
  image.style.filter = filter;
  const text = el("div", "look-row__name", name);
  row.append(image, text, button);
  return row;
}

// Товар торговца или алхимика: название, описание и кнопка покупки
export function createGood(meta, run, good, done) {
  const owned = isTraderGoodOwned(meta, run, good);
  const buy = createButton(owned ? TEXTS.trader.owned : TEXTS.trader.buy(good.price), "", () => {
    const result = buyFromTrader(meta, run, good);
    if (result.ok) done(run);
    else fail(buy, TEXTS.trader[result.reason]);
  });
  buy.disabled = owned;
  return createRow(`${good.icon} ${good.name}`, good.description, buy);
}
