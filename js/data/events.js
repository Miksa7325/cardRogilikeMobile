// Все события игры. У каждого варианта: text — кнопка, result — текст после выбора,
// effects — что произойдёт, requiresGold — сколько золота нужно, чтобы вариант был доступен.
export const EVENTS = {
  abandoned_altar: {
    id: "abandoned_altar",
    title: "Заброшенный алтарь",
    text: "На алтаре лежит вещица в засохшей крови. Алтарь просит крови и у тебя.",
    choices: [
      {
        text: "Порезать ладонь (−10 HP, реликвия)",
        result: "Камень впитывает кровь, и вещица падает тебе в руку.",
        effects: [{ type: "loseHp", amount: 10 }, { type: "gainRelic" }],
      },
      { text: "Уйти", result: "Ты проходишь мимо, не оглядываясь.", effects: [] },
    ],
  },
  wandering_alchemist: {
    id: "wandering_alchemist",
    title: "Бродячий алхимик",
    text: "Старик звенит склянками и протягивает руку за монетами.",
    choices: [
      {
        text: "Заплатить 15 золота (зелье)",
        result: "Старик вкладывает в ладонь склянку и исчезает в тумане.",
        requiresGold: 15,
        effects: [{ type: "loseGold", amount: 15 }, { type: "gainPotion" }],
      },
      { text: "Отказаться", result: "Старик пожимает плечами.", effects: [] },
    ],
  },
  trapped_chest: {
    id: "trapped_chest",
    title: "Подозрительный сундук",
    text: "Крышка сундука приоткрыта, из щели торчит игла.",
    choices: [
      {
        text: "Открыть (−6 HP, +35 золота)",
        result: "Игла вонзается в руку, зато внутри монеты.",
        effects: [{ type: "loseHp", amount: 6 }, { type: "gainGold", amount: 35 }],
      },
      { text: "Не трогать", result: "Жадность губит чаще, чем чудовища.", effects: [] },
    ],
  },
  healing_spring: {
    id: "healing_spring",
    title: "Целебный источник",
    text: "Вода светится слабым голубым светом. Её хватит только на один раз.",
    choices: [
      { text: "Напиться (+18 HP)", result: "Раны затягиваются прямо на глазах.", effects: [{ type: "heal", amount: 18 }] },
      { text: "Наполнить флягу (зелье)", result: "Вода во фляге меняет цвет.", effects: [{ type: "gainPotion" }] },
    ],
  },
  ghost_smith: {
    id: "ghost_smith",
    title: "Кузнец-призрак",
    text: "Призрак молча кивает на наковальню. За хорошую работу он просит плату.",
    choices: [
      {
        text: "Заплатить 25 золота (улучшить 2 карты)",
        result: "Молот бьёт беззвучно, но оружие становится острее.",
        requiresGold: 25,
        effects: [{ type: "loseGold", amount: 25 }, { type: "upgradeRandomCards", count: 2 }],
      },
      {
        text: "Попросить бесплатно (улучшить 1 карту, −5 HP)",
        result: "Призрак недоволен, и искры обжигают тебя.",
        effects: [{ type: "loseHp", amount: 5 }, { type: "upgradeRandomCards", count: 1 }],
      },
    ],
  },
  cursed_idol: {
    id: "cursed_idol",
    title: "Проклятый идол",
    text: "Золотой идол тяжёл и холоден. Стоит коснуться его, и по телу идёт боль.",
    choices: [
      {
        text: "Забрать (+60 золота, Рана в колоду)",
        result: "Идол твой, но рана от него не заживает.",
        effects: [{ type: "gainGold", amount: 60 }, { type: "addCard", cardId: "wound" }],
      },
      { text: "Оставить", result: "Идол смотрит тебе вслед.", effects: [] },
    ],
  },
  training_ground: {
    id: "training_ground",
    title: "Старый плац",
    text: "Манекены из соломы стоят рядами, словно ждали именно тебя.",
    choices: [
      {
        text: "Тренироваться (−6 HP, необычная карта)",
        result: "Ты узнал новый приём.",
        effects: [{ type: "loseHp", amount: 6 }, { type: "addCard", rarity: "uncommon" }],
      },
      { text: "Перевести дух (+8 HP)", result: "Немного покоя никому не вредит.", effects: [{ type: "heal", amount: 8 }] },
    ],
  },
  blood_pact: {
    id: "blood_pact",
    title: "Кровавый договор",
    text: "Голос из тени предлагает знание в обмен на часть твоей жизни.",
    choices: [
      {
        text: "Подписать (−6 к максимуму HP, редкая карта)",
        result: "Что-то внутри тебя навсегда затихает.",
        effects: [{ type: "loseMaxHp", amount: 6 }, { type: "addCard", rarity: "rare" }],
      },
      { text: "Отказаться", result: "Голос тихо смеётся.", effects: [] },
    ],
  },
  confessor: {
    id: "confessor",
    title: "Исповедник",
    text: "Монах предлагает избавить тебя от старых привычек. Небесплатно.",
    choices: [
      {
        text: "Заплатить 15 золота (убрать стартовую карту)",
        result: "В колоде стало на одну карту меньше.",
        requiresGold: 15,
        effects: [{ type: "loseGold", amount: 15 }, { type: "removeRandomCard", rarity: "starter" }],
      },
      { text: "Уйти", result: "Монах кивает и возвращается к молитве.", effects: [] },
    ],
  },
  mushroom_circle: {
    id: "mushroom_circle",
    title: "Грибной круг",
    text: "Светящиеся грибы растут идеальным кольцом. Пахнет сладко и опасно.",
    choices: [
      {
        text: "Съесть гриб (+7 к максимуму HP, −4 HP)",
        result: "Мир плывёт, но ты чувствуешь себя крепче.",
        effects: [{ type: "gainMaxHp", amount: 7 }, { type: "loseHp", amount: 4 }],
      },
      {
        text: "Продать сборщику (+20 золота)",
        result: "Сборщик платит не торгуясь.",
        effects: [{ type: "gainGold", amount: 20 }],
      },
    ],
  },
};
