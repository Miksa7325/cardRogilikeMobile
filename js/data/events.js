// Все события игры. У каждого варианта: text — кнопка, result — текст после выбора,
// effects — что произойдёт. Цену и награду в скобках на кнопке («−6 HP, зелье») игра пишет сама по effects,
// поэтому в text чисел нет: так надпись не разойдётся с тем, что случится на самом деле.
// EVENTS — события в комнатах подземелья. TRAVEL_EVENTS — редкие встречи при быстром переходе по карте:
// они короче, и почти все неприятные — герой выбирает, чем заплатить за спешку.
export const EVENTS = {
  abandoned_altar: {
    id: "abandoned_altar",
    title: "Заброшенный алтарь",
    text: "На алтаре лежит вещица в засохшей крови. Алтарь просит крови и у тебя.",
    choices: [
      {
        text: "Порезать ладонь",
        result: "Камень впитывает кровь, и вещица падает тебе в руку.",
        effects: [{ type: "loseHp", amount: 10 }, { type: "gainRelic" }],
      },
      { text: "Уйти", result: "Ты проходишь мимо, не оглядываясь.", effects: [] },
    ],
  },
  wandering_alchemist: {
    id: "wandering_alchemist",
    title: "Бродячий алхимик",
    text: "Старик звенит склянками. Монеты ему не нужны: для зелий ему нужна живая кровь.",
    choices: [
      {
        text: "Отдать кровь",
        result: "Старик вкладывает в ладонь склянку и исчезает в тумане.",
        effects: [{ type: "loseHp", amount: 6 }, { type: "gainPotion" }],
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
        text: "Открыть",
        result: "Игла вонзается в руку, зато внутри монеты.",
        effects: [{ type: "loseHp", amount: 6 }, { type: "gainGold", amount: 15 }],
      },
      { text: "Не трогать", result: "Жадность губит чаще, чем чудовища.", effects: [] },
    ],
  },
  healing_spring: {
    id: "healing_spring",
    title: "Целебный источник",
    text: "Вода светится слабым голубым светом. Её хватит только на один раз.",
    choices: [
      { text: "Напиться", result: "Раны затягиваются прямо на глазах.", effects: [{ type: "heal", amount: 18 }] },
      { text: "Наполнить флягу", result: "Вода во фляге меняет цвет.", effects: [{ type: "gainPotion" }] },
    ],
  },
  ghost_smith: {
    id: "ghost_smith",
    title: "Кузнец-призрак",
    text: "Призрак молча кивает на наковальню. За хорошую работу он просит раздуть горн собственным жаром.",
    choices: [
      {
        text: "Раздуть горн",
        result: "Молот бьёт беззвучно, но оружие становится острее.",
        effects: [{ type: "loseHp", amount: 10 }, { type: "upgradeRandomCards", count: 2 }],
      },
      {
        text: "Попросить о малой услуге",
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
        text: "Забрать",
        result: "Идол твой, но рана от него не заживает.",
        effects: [{ type: "gainGold", amount: 30 }, { type: "addCard", cardId: "wound" }],
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
        text: "Тренироваться",
        result: "Ты узнал новый приём.",
        effects: [{ type: "loseHp", amount: 6 }, { type: "addCard", rarity: "uncommon" }],
      },
      { text: "Перевести дух", result: "Немного покоя никому не вредит.", effects: [{ type: "heal", amount: 8 }] },
    ],
  },
  blood_pact: {
    id: "blood_pact",
    title: "Кровавый договор",
    text: "Голос из тени предлагает знание в обмен на часть твоей жизни.",
    choices: [
      {
        text: "Подписать",
        result: "Что-то внутри тебя навсегда затихает.",
        effects: [{ type: "loseMaxHp", amount: 6 }, { type: "addCard", rarity: "rare" }],
      },
      { text: "Отказаться", result: "Голос тихо смеётся.", effects: [] },
    ],
  },
  confessor: {
    id: "confessor",
    title: "Исповедник",
    text: "Монах предлагает избавить тебя от старых привычек. Покаяние будет болезненным.",
    choices: [
      {
        text: "Покаяться",
        result: "В колоде стало на одну карту меньше.",
        effects: [{ type: "loseHp", amount: 7 }, { type: "removeRandomCard", rarity: "starter" }],
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
        text: "Съесть гриб",
        result: "Мир плывёт, но ты чувствуешь себя крепче.",
        effects: [{ type: "gainMaxHp", amount: 7 }, { type: "loseHp", amount: 4 }],
      },
      {
        text: "Собрать грибы на продажу",
        result: "Грибник у выхода из пещеры платит не торгуясь.",
        effects: [{ type: "gainGold", amount: 10 }],
      },
    ],
  },

  // Открываются Таверной
  card_sharp: {
    id: "card_sharp",
    title: "Шулер",
    text: "За столом ухмыляется игрок с колодой в рукаве. Золото здесь не в ходу — ставят на кровь.",
    choices: [
      {
        text: "Сыграть на кровь",
        result: "Ты проиграл, зато подсмотрел его лучший приём.",
        effects: [{ type: "loseHp", amount: 8 }, { type: "addCard", rarity: "uncommon" }],
      },
      { text: "Пройти мимо", result: "Шулер пожимает плечами и ищет другого простака.", effects: [] },
    ],
  },
  drunk_veteran: {
    id: "drunk_veteran",
    title: "Пьяный ветеран",
    text: "Старый солдат хватает тебя за рукав и обещает показать настоящий удар.",
    choices: [
      {
        text: "Потренироваться с ним",
        result: "Синяки пройдут, а приём останется.",
        effects: [{ type: "loseHp", amount: 5 }, { type: "upgradeRandomCards", count: 1 }],
      },
      {
        text: "Выслушать его байки",
        result: "Растроганный ветеран суёт тебе горсть трофейных монет.",
        effects: [{ type: "gainGold", amount: 5 }],
      },
    ],
  },
  lost_pilgrim: {
    id: "lost_pilgrim",
    title: "Заблудший паломник",
    text: "Паломник просит проводить его к выходу. В благодарность он предлагает снадобье.",
    choices: [
      {
        text: "Проводить",
        result: "Дорога была опасной, но паломник держит слово.",
        effects: [{ type: "loseHp", amount: 4 }, { type: "gainPotion" }],
      },
      { text: "Указать дорогу", result: "Он благословляет тебя, и становится легче.", effects: [{ type: "heal", amount: 6 }] },
    ],
  },
  smuggler: {
    id: "smuggler",
    title: "Контрабандист",
    text: "В тёмном углу открывается сундук. Монет контрабандист не берёт: только то, без чего не проживёшь.",
    choices: [
      {
        text: "Отдать часть жизни",
        result: "Контрабандист исчезает раньше, чем ты рассмотрел покупку.",
        effects: [{ type: "loseMaxHp", amount: 6 }, { type: "gainRelic" }],
      },
      { text: "Уйти", result: "Сундук захлопывается за твоей спиной.", effects: [] },
    ],
  },

  // Открываются Библиотекой
  forbidden_tome: {
    id: "forbidden_tome",
    title: "Запретный том",
    text: "Страницы шевелятся сами. Прочитаешь — узнаешь многое, но что-то потеряешь.",
    choices: [
      {
        text: "Читать",
        result: "Знание жжёт изнутри.",
        effects: [{ type: "loseMaxHp", amount: 5 }, { type: "addCard", rarity: "rare" }],
      },
      { text: "Закрыть книгу", result: "Шёпот со страниц стихает.", effects: [] },
    ],
  },
  mad_scholar: {
    id: "mad_scholar",
    title: "Безумный учёный",
    text: "Он не замечает тебя и спорит сам с собой. На столе лежат его заметки.",
    choices: [
      {
        text: "Изучить заметки",
        result: "Ты понял больше, чем хотел бы.",
        effects: [{ type: "upgradeRandomCards", count: 2 }, { type: "addCard", cardId: "wound" }],
      },
      { text: "Забрать чернила", result: "Редкие чернила стоят немало.", effects: [{ type: "gainGold", amount: 8 }] },
    ],
  },
  mirror_hall: {
    id: "mirror_hall",
    title: "Зал зеркал",
    text: "Твоё отражение улыбается и предлагает обмен: старая привычка в обмен на боль.",
    choices: [
      {
        text: "Согласиться",
        result: "В зеркале теперь кто-то другой.",
        effects: [{ type: "removeRandomCard", rarity: "starter" }, { type: "loseHp", amount: 6 }],
      },
      { text: "Разбить зеркало", result: "Осколки серебра звенят под ногами.", effects: [{ type: "gainGold", amount: 4 }] },
    ],
  },
  old_map: {
    id: "old_map",
    title: "Старая карта",
    text: "На карте отмечен тайник. Пометка рядом предупреждает о ловушке.",
    choices: [
      {
        text: "Найти тайник",
        result: "Ловушка сработала, но тайник того стоил.",
        effects: [{ type: "loseHp", amount: 7 }, { type: "addCard", rarity: "uncommon" }, { type: "gainGold", amount: 8 }],
      },
      { text: "Сжечь карту", result: "Ты греешься у огня и отдыхаешь.", effects: [{ type: "heal", amount: 5 }] },
    ],
  },
};

// Встречи в пути: случаются изредка, когда герой быстро переходит по карте (CONFIG.teleportEventChance).
// Спешка в подземелье наказуема: почти всегда выбор только в том, чем заплатить
export const TRAVEL_EVENTS = {
  rat_swarm: {
    id: "rat_swarm",
    title: "Крысиная стая",
    text: "Из трещин в стене хлынули крысы. Их слишком много, чтобы просто пройти.",
    choices: [
      { text: "Прорываться", result: "Ты расшвыриваешь крыс, но они успевают покусать.", effects: [{ type: "loseHp", amount: 7 }] },
      { text: "Бросить им сумку с едой", result: "Пока крысы дерутся за сумку, ты уходишь.", effects: [{ type: "losePotion", fallbackHp: 4 }] },
    ],
  },
  pickpocket: {
    id: "pickpocket",
    title: "Карманник",
    text: "В тесном переходе кто-то задевает тебя плечом. Кошель становится легче.",
    choices: [
      { text: "Догнать вора", result: "Ты отбираешь монеты, но вор успевает полоснуть ножом.", effects: [{ type: "loseHp", amount: 5 }] },
      { text: "Отпустить", result: "Шаги вора стихают в темноте вместе с твоим золотом.", effects: [{ type: "loseGold", amount: 20 }] },
    ],
  },
  cave_in: {
    id: "cave_in",
    title: "Обвал",
    text: "Знакомый коридор завален камнями. Сверху всё ещё сыплется пыль.",
    choices: [
      { text: "Разбирать завал", result: "Камни поддаются, но один из них падает тебе на плечо.", effects: [{ type: "loseHp", amount: 8 }] },
      { text: "Искать обход", result: "Обход нашёлся, но в узком лазе ты сильно ободрался.", effects: [{ type: "addCard", cardId: "wound" }] },
    ],
  },
  poison_mist: {
    id: "poison_mist",
    title: "Ядовитые испарения",
    text: "Из пола поднимается зелёный туман. Он сладко пахнет и режет глаза.",
    choices: [
      { text: "Задержать дыхание и бежать", result: "Ты выскакиваешь из тумана, кашляя и шатаясь.", effects: [{ type: "loseHp", amount: 6 }] },
      { text: "Переждать в нише", result: "Туман рассеялся, но надышаться ты успел. Это не пройдёт бесследно.", effects: [{ type: "loseMaxHp", amount: 3 }] },
    ],
  },
  sprung_trap: {
    id: "sprung_trap",
    title: "Капкан",
    text: "Под ногой щёлкает железо: кто-то поставил капкан там, где раньше было чисто.",
    choices: [
      { text: "Вырваться силой", result: "Нога свободна, но зубья оставили глубокие следы.", effects: [{ type: "loseHp", amount: 9 }] },
      { text: "Разжать осторожно", result: "Ты возишься долго, и рана успевает загноиться.", effects: [{ type: "loseHp", amount: 3 }, { type: "addCard", cardId: "wound" }] },
    ],
  },
  dark_whisper: {
    id: "dark_whisper",
    title: "Шёпот во тьме",
    text: "Голос из темноты зовёт тебя по имени и обещает показать короткую дорогу.",
    choices: [
      { text: "Пойти на голос", result: "Голос привёл тебя назад, но кое-чему научил по пути.", effects: [{ type: "loseMaxHp", amount: 4 }, { type: "upgradeRandomCards", count: 1 }] },
      { text: "Заткнуть уши и идти", result: "Шёпот ещё долго звучит в голове.", effects: [{ type: "addCard", cardId: "wound" }] },
    ],
  },
  dead_seeker: {
    id: "dead_seeker",
    title: "Мёртвый искатель",
    text: "У стены сидит искатель приключений. Он мёртв недавно, а рядом с ним — его кошель.",
    choices: [
      { text: "Обыскать тело", result: "Монеты твои, но мертвец был болен, и ты это чувствуешь.", effects: [{ type: "gainGold", amount: 12 }, { type: "addCard", cardId: "wound" }] },
      { text: "Пройти мимо", result: "Ты отводишь взгляд и ускоряешь шаг.", effects: [] },
    ],
  },
};
