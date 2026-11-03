// Как выглядят бойцы. Спрайты лежат в assets/images/units: откуда они взяты, написано на экране «Авторы».
// Заменить рисунок просто: положи файл с тем же именем.
export function heroSprite(heroId) {
  return `assets/images/units/hero-${heroId}.png`;
}

export function enemySprite(enemyId) {
  return `assets/images/units/enemy-${enemyId}.png`;
}

// Загружает все спрайты заранее: иначе модель могла бы мигнуть, когда экран рисуется заново
const preloaded = [];
export function preloadSprites(enemyIds, heroIds) {
  for (const src of [...enemyIds.map(enemySprite), ...heroIds.map(heroSprite)]) {
    const image = new Image();
    image.src = src;
    preloaded.push(image);
  }
}

// Как враг бьёт. Кого нет в таблице, тот рубит оружием.
// claw — бросается и рвёт когтями или зубами, magic — стреляет снарядом этого цвета
export const ATTACK_STYLES = {
  spider: { kind: "claw" },
  grave_hound: { kind: "claw" },
  ghoul: { kind: "claw" },
  rat_swarm: { kind: "claw" },
  gargoyle: { kind: "claw" },
  vampire_lord: { kind: "claw" },
  hellhound: { kind: "claw" },
  demon: { kind: "claw" },
  banshee: { kind: "magic", color: "#a9d8ff" },
  warlock: { kind: "magic", color: "#7de0ff" },
  witch_queen: { kind: "magic", color: "#c77dff" },
  wraith: { kind: "magic", color: "#9fe8ff" },
  blood_priest: { kind: "magic", color: "#ff5a5a" },
  acolyte: { kind: "magic", color: "#8ce0c4" },
  lich_king: { kind: "magic", color: "#7dd3ff" },
};

// Как двигается модель в покое. Кого нет в таблице, тот просто дышит
export const IDLE_STYLES = {
  spider: "scuttle",
  rat_swarm: "scuttle",
  banshee: "float",
  wraith: "float",
  gargoyle: "heavy",
  golem: "heavy",
  bone_colossus: "heavy",
  grave_hound: "pant",
  hellhound: "pant",
};

export const LOGO_ART = `<svg viewBox="0 0 512 512" aria-hidden="true"><g transform="rotate(-10 256 256)"><rect x="146" y="106" width="220" height="300" rx="22" fill="#5e2626" stroke="#e0b84c" stroke-width="12"/><g transform="rotate(45 256 256)" fill="#efe6d5"><path d="M244 136 L256 112 L268 136 L268 300 L244 300 Z"/><rect x="216" y="300" width="80" height="16" rx="6" fill="#e0b84c"/><rect x="246" y="316" width="20" height="48" rx="6" fill="#a89f91"/></g><g transform="rotate(-45 256 256)" fill="#efe6d5"><path d="M244 136 L256 112 L268 136 L268 300 L244 300 Z"/><rect x="216" y="300" width="80" height="16" rx="6" fill="#e0b84c"/><rect x="246" y="316" width="20" height="48" rx="6" fill="#a89f91"/></g></g></svg>`;

// Рисует пиксельный спрайт: каждая буква в строке — пиксель цвета из палитры, точка — пусто
function pixelArt(rows, palette) {
  const pixels = rows.flatMap((row, y) => [...row].map((char, x) =>
    char === "." ? "" : `<rect x="${x}" y="${y}" width="1" height="1" fill="${palette[char]}"/>`));
  return `<svg viewBox="0 0 ${rows[0].length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${pixels.join("")}</svg>`;
}

// Старейшина города: седой старик в синей мантии с посохом, у него задания
export const ELDER_ART = pixelArt([
  "....kkkkkkkk....",
  "...khhhhhhhhk...",
  "...khhsssshhk...",
  "...khsksskshk...",
  "...khsssssshk..g",
  "...khwwwwwwhk..t",
  "..kbbwwwwwwbbk.t",
  ".kbbbbwwwwbbbbkt",
  ".kbdbbbwwbbbdbst",
  ".kbdbbbgbbbbdbkt",
  "..kdbbbgbbbbdk.t",
  "..kdbbbgbbbbdk.t",
  "..kdbbbgbbbbdk.t",
  "..kddbbgbbbddk.t",
  "..kddbbgbbbddk.t",
  ".kdddbbgbbbdddkt",
  ".kkkkkkkkkkkkkkt",
  "...............t",
], {
  k: "#1a1420",
  h: "#6a4a2a",
  s: "#e8b890",
  w: "#e8e4dc",
  b: "#3a5a9a",
  d: "#26406e",
  g: "#e0b84c",
  t: "#8a5a2a",
});

// Вход в подземелье: каменная арка с факелами. Рисунок симметричный, поэтому задана левая половина
const GATE_HALF = [
  "......kkkk",
  "....kkssss",
  "...kssdsss",
  "..kssdkkkk",
  "..ksdkbbbb",
  ".ksskbbbbb",
  ".ksdkbbbbb",
  "oksskbbbbb",
  "fksdkbbbbb",
  "tksskbbbbb",
  "tksdkbbbbb",
  ".ksskbbbbb",
  ".ksdkbbbbb",
  "kssskbbbbb",
  "kddskbbbbb",
  "kkkkkkkkkk",
];

export const GATE_ART = pixelArt(GATE_HALF.map((row) => row + [...row].reverse().join("")), {
  k: "#1a1420",
  s: "#8a8478",
  d: "#5e5850",
  b: "#0a0810",
  o: "#ff6a20",
  f: "#ffb040",
  t: "#6a4a2a",
});
