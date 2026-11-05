// Как выглядит город: дома для красоты, деревья, мелочи и места интереса. Здания со службами — в data/buildings.js.
// Координаты — во всём городе: западная слобода 0–260, старый город 260–620, восточная слобода 620–880, высота 780.
// Дороги: главная — по x 420–460 сверху до входа в подземелье, поперечные — по y 243–283, 388–428 и 532–572.
// Рисунки — 3D-модели KayKit (assets/images/city/имя.png); земля нарисована в assets/images/city/ground.jpg по этим же данным.

// Жилые дома, мельницы и башни: к ним нельзя зайти, но они загораживают проход. x и y — левый верхний угол места 88×76
export const DECOR_HOUSES = [
  { sprite: "deco-home-a-red", x: 272, y: 34 },
  { sprite: "deco-home-b-yellow", x: 520, y: 30 },
  { sprite: "deco-home-a-green", x: 272, y: 600 },
  { sprite: "deco-home-b-green", x: 520, y: 600 },
  { sprite: "deco-windmill", x: 22, y: 30 },
  { sprite: "deco-home-a-yellow", x: 22, y: 296 },
  { sprite: "deco-home-b-red", x: 22, y: 440 },
  { sprite: "deco-lumbermill", x: 40, y: 600 },
  { sprite: "deco-home-a-red", x: 160, y: 612 },
  { sprite: "deco-watermill", x: 650, y: 30 },
  { sprite: "deco-tower", x: 778, y: 140 },
  { sprite: "deco-home-a-yellow", x: 772, y: 296 },
  { sprite: "deco-home-b-green", x: 772, y: 440 },
  { sprite: "deco-home-b-red", x: 650, y: 600 },
  { sprite: "deco-home-a-green", x: 770, y: 612 },
];

// Деревья и мелочи: x и y — точка, где предмет стоит на земле; size — ширина рисунка на карте
export const DECOR_PROPS = [
  // Деревья
  { sprite: "tree-b", x: 380, y: 112, size: 54 },
  { sprite: "tree-a", x: 395, y: 200, size: 46 },
  { sprite: "trees-b", x: 490, y: 120, size: 59 },
  { sprite: "trees-a", x: 150, y: 120, size: 76 },
  { sprite: "tree-b", x: 236, y: 60, size: 51 },
  { sprite: "tree-b", x: 40, y: 220, size: 49 },
  { sprite: "trees-b", x: 740, y: 230, size: 62 },
  { sprite: "tree-a", x: 700, y: 140, size: 46 },
  { sprite: "trees-a", x: 852, y: 90, size: 62 },
  { sprite: "tree-a", x: 240, y: 520, size: 43 },
  { sprite: "tree-b", x: 380, y: 760, size: 54 },
  { sprite: "trees-a", x: 300, y: 765, size: 73 },
  { sprite: "trees-b", x: 520, y: 770, size: 68 },
  { sprite: "tree-a", x: 600, y: 745, size: 49 },
  { sprite: "trees-a", x: 120, y: 770, size: 73 },
  { sprite: "tree-b", x: 220, y: 760, size: 51 },
  { sprite: "trees-b", x: 700, y: 772, size: 70 },
  { sprite: "tree-a", x: 860, y: 760, size: 46 },
  { sprite: "tree-b", x: 870, y: 552, size: 41 },
  { sprite: "tree-a", x: 10, y: 530, size: 41 },
  // Хозяйство
  { sprite: "prop-barrel", x: 300, y: 700, size: 18 },
  { sprite: "prop-barrel", x: 314, y: 708, size: 18 },
  { sprite: "prop-crates", x: 612, y: 690, size: 20 },
  { sprite: "prop-sack", x: 588, y: 700, size: 18 },
  { sprite: "prop-wheelbarrow", x: 140, y: 700, size: 26 },
  { sprite: "prop-lumber", x: 24, y: 704, size: 26 },
  { sprite: "prop-weaponrack", x: 760, y: 376, size: 24 },
  { sprite: "prop-target", x: 636, y: 376, size: 22 },
  { sprite: "prop-barrel", x: 120, y: 218, size: 16 },
  { sprite: "prop-crates", x: 610, y: 516, size: 18 },
];

// Места интереса: колодец желаний, доска объявлений и дом летописца. x и y — левый верхний угол, width и height — размер
export const POINTS_OF_INTEREST = {
  well: { sprite: "well", x: 362, y: 470, width: 52, height: 46 },
  board: { sprite: "board", x: 362, y: 628, width: 52, height: 46 },
  chronicler: { sprite: "chronicler", x: 136, y: 148, width: 88, height: 76 },
};

// Фонтан нарисован на земле у верхнего перекрёстка: центр и радиус чаши
export const FOUNTAIN = { x: 440, y: 263, radius: 19 };
