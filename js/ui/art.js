// Векторная графика героев и врагов. Рисунки хранятся прямо в коде, поэтому игре не нужны файлы.
// Части рисунка помечены классами art-*: их двигают анимации в css/theme.css.
// Настоящий арт можно подключить позже: достаточно заменить запись в этих таблицах.
const svg = (body) => `<svg viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;

// Части, которые встречаются у многих рисунков
const eyes = (color, y = 24, gap = 7) => `<g class="art-eyes"><circle cx="${32 - gap}" cy="${y}" r="2.5" fill="${color}"/><circle cx="${32 + gap}" cy="${y}" r="2.5" fill="${color}"/></g>`;
const hood = (color, shade = "#000") => `<path d="M32 6C18 6 12 20 12 34L8 60H56L52 34C52 20 46 6 32 6Z" fill="${color}"/><path d="M32 6C42 8 50 20 52 34L56 60H42C44 40 42 18 32 6Z" fill="${shade}" opacity=".22"/>`;
const skull = (y = 22) => `<circle cx="32" cy="${y}" r="13" fill="#d9d2c0"/><path d="M32 ${y - 13}A13 13 0 0 1 32 ${y + 13}Z" fill="#000" opacity=".12"/><rect x="25" y="${y + 9}" width="14" height="8" rx="2" fill="#d9d2c0"/><path d="M28 ${y + 10}V${y + 17}M32 ${y + 10}V${y + 17}M36 ${y + 10}V${y + 17}" stroke="#15121a"/><g class="art-eyes"><circle cx="27" cy="${y}" r="3.5" fill="#15121a"/><circle cx="37" cy="${y}" r="3.5" fill="#15121a"/></g>`;
const sword = (x, color = "#c9ced6") => `<g class="art-weapon"><path d="M${x - 2} 44V12L${x} 8L${x + 2} 12V44Z" fill="${color}"/><rect x="${x - 6}" y="42" width="12" height="3" fill="#e0b84c"/><rect x="${x - 1.5}" y="45" width="3" height="9" fill="#5c4630"/></g>`;
const orb = (x, y, r, color) => `<circle class="art-orb" cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;

export const HERO_ART = {
  warrior: svg(`<path d="M14 60C14 44 20 36 32 36S50 44 50 60Z" fill="#7a3030"/><path d="M32 36C44 36 50 44 50 60H40C42 50 40 40 32 36Z" fill="#000" opacity=".2"/><circle cx="32" cy="24" r="12" fill="#c9ced6"/><rect x="22" y="22" width="20" height="4" fill="#15121a"/><path d="M20 22C20 12 44 12 44 22" fill="#8a919b"/><path class="art-plume" d="M32 12C30 6 36 2 42 4C38 6 36 8 36 13Z" fill="#b53a3a"/>${sword(52)}`),
  assassin: svg(`${hood("#2c3a2c")}<path d="M20 26H44L38 36H26Z" fill="#101410"/>${eyes("#9be36b", 30, 6)}<g class="art-weapon"><path d="M8 50L22 38" stroke="#c9ced6" stroke-width="3"/><path d="M56 50L42 38" stroke="#c9ced6" stroke-width="3"/></g>`),
  warlock: svg(`${hood("#3a2350")}<path d="M21 28H43L39 40H25Z" fill="#120c1a"/>${eyes("#c77dff", 32, 6)}<g class="art-weapon"><rect x="51" y="20" width="4" height="40" fill="#5c4630"/>${orb(53, 16, 6, "#c77dff")}</g>`),
};

export const ENEMY_ART = {
  // Акт 1
  cultist: svg(`${hood("#5a1f1f")}<path d="M22 24H42L38 38H26Z" fill="#160a0a"/>${eyes("#ff9c5a", 30, 5)}`),
  skeleton: svg(`${skull()}<rect x="28" y="38" width="8" height="22" fill="#d9d2c0"/><rect x="18" y="42" width="28" height="3" fill="#d9d2c0"/><rect x="20" y="49" width="24" height="3" fill="#d9d2c0"/>${sword(54, "#9aa0a8")}`),
  spider: svg(`<path class="art-legs" d="M20 36L6 26M20 42L4 42M21 48L8 58M44 36L58 26M44 42L60 42M43 48L56 58" stroke="#2b2b35" stroke-width="3"/><ellipse cx="32" cy="40" rx="14" ry="12" fill="#2b2b35"/><ellipse cx="28" cy="36" rx="5" ry="3" fill="#fff" opacity=".08"/><circle cx="32" cy="24" r="8" fill="#3a3a48"/>${eyes("#e04848", 23, 3)}`),
  fallen_knight: svg(`<path d="M14 60C14 42 20 34 32 34S50 42 50 60Z" fill="#3b3f4a"/><path d="M20 10H44V30L32 38L20 30Z" fill="#555b68"/><path d="M32 10H44V30L32 38Z" fill="#000" opacity=".18"/><rect class="art-visor" x="24" y="20" width="16" height="4" fill="#e04848"/>${sword(52, "#6c1f1f")}`),
  grave_hound: svg(`<path d="M8 44L18 26L28 34H40L50 24L58 42L46 54H20Z" fill="#3a332b"/><path class="art-ear" d="M50 24L56 14L58 28Z" fill="#3a332b"/><g class="art-eyes"><circle cx="50" cy="32" r="2.5" fill="#e0b84c"/></g><path d="M46 44L52 40L54 46Z" fill="#d9d2c0"/>`),
  crypt_warden: svg(`${hood("#1f2b2b")}${skull(26)}<g class="art-weapon"><path d="M50 4Q62 14 54 28" stroke="#c9ced6" stroke-width="4" fill="none"/><rect x="50" y="10" width="3" height="50" fill="#5c4630"/></g>`),

  // Акт 2
  ghoul: svg(`<path d="M16 60C16 40 22 28 32 28S48 40 48 60Z" fill="#4f6146"/><circle cx="32" cy="22" r="11" fill="#65795a"/>${eyes("#e8e38a", 21, 4)}<path d="M26 28L29 32L32 28L35 32L38 28" stroke="#15121a" stroke-width="2" fill="none"/><path class="art-weapon" d="M16 42L6 50M48 42L58 50" stroke="#65795a" stroke-width="5" stroke-linecap="round"/>`),
  bandit: svg(`${hood("#4a3a28")}<rect x="20" y="24" width="24" height="6" fill="#15121a"/>${eyes("#efe6d5", 27, 5)}<rect x="20" y="33" width="24" height="9" fill="#7a2c2c"/><path class="art-weapon" d="M54 22L50 46L53 47L58 23Z" fill="#c9ced6"/>`),
  banshee: svg(`<path d="M32 6C20 6 16 18 16 30C16 44 10 52 8 60C14 54 18 60 24 54C28 60 36 60 40 54C46 60 50 54 56 60C54 52 48 44 48 30C48 18 44 6 32 6Z" fill="#a9c3d6" opacity=".85"/><ellipse class="art-mouth" cx="32" cy="34" rx="5" ry="8" fill="#15121a"/>${eyes("#15121a", 22, 6)}`),
  gargoyle: svg(`<path class="art-wing art-wing--left" d="M26 22L4 8L14 34L26 30Z" fill="#5b5f66"/><path class="art-wing art-wing--right" d="M38 22L60 8L50 34L38 30Z" fill="#5b5f66"/><rect x="24" y="24" width="16" height="30" rx="3" fill="#62666e"/><circle cx="32" cy="20" r="10" fill="#70757d"/><path d="M24 12L22 4L29 11M40 12L42 4L35 11" fill="#70757d"/>${eyes("#e0b84c", 20, 4)}`),
  warlock: svg(`${hood("#2a1c46")}<path d="M22 26H42L38 38H26Z" fill="#0f0a1a"/>${eyes("#7de0ff", 31, 5)}${orb(10, 46, 6, "#7de0ff")}`),
  rat_swarm: svg(`<ellipse cx="22" cy="46" rx="13" ry="8" fill="#463d36"/><ellipse cx="44" cy="44" rx="12" ry="7" fill="#524840"/><ellipse cx="32" cy="30" rx="13" ry="8" fill="#5e5249"/><g class="art-eyes"><circle cx="40" cy="28" r="1.5" fill="#e04848"/><circle cx="52" cy="42" r="1.5" fill="#e04848"/><circle cx="31" cy="44" r="1.5" fill="#e04848"/></g><path class="art-legs" d="M19 30Q8 26 6 34M34 44Q40 56 52 54" stroke="#8a6f65" stroke-width="2" fill="none"/>`),
  bone_colossus: svg(`${skull(18)}<rect x="14" y="34" width="36" height="22" rx="4" fill="#bdb6a4"/><path d="M14 40H50M14 46H50M14 52H50" stroke="#15121a" stroke-width="2"/><g class="art-weapon"><rect x="2" y="32" width="10" height="26" rx="4" fill="#d9d2c0"/><rect x="52" y="32" width="10" height="26" rx="4" fill="#d9d2c0"/></g>`),
  witch_queen: svg(`${hood("#351c3d")}<path d="M18 16L24 6L29 14L32 4L35 14L40 6L46 16Z" fill="#e0b84c"/><path d="M23 26H41L37 38H27Z" fill="#c9b4d6"/>${eyes("#7a1fa2", 31, 4)}${orb(10, 40, 5, "#c77dff")}${orb(54, 40, 5, "#c77dff")}`),
  vampire_lord: svg(`<path class="art-cape" d="M6 60L18 26L32 40L46 26L58 60Z" fill="#3a0f1a"/><circle cx="32" cy="24" r="12" fill="#d9ccd0"/><path d="M20 20L32 12L44 20L40 8L32 12L24 8Z" fill="#15121a"/>${eyes("#e01f3d", 24, 5)}<path d="M28 32L29.5 37L31 32M33 32L34.5 37L36 32" fill="#fff"/>`),

  // Акт 3
  wraith: svg(`<path d="M32 4C18 4 14 18 14 32C14 46 8 54 8 60L20 54L32 60L44 54L56 60C56 54 50 46 50 32C50 18 46 4 32 4Z" fill="#37465a" opacity=".85"/>${eyes("#9fe8ff", 24, 6)}`),
  golem: svg(`<rect x="16" y="8" width="32" height="20" rx="3" fill="#6b6459"/><rect x="10" y="30" width="44" height="26" rx="3" fill="#59534a"/><g class="art-weapon"><rect x="2" y="30" width="8" height="24" fill="#6b6459"/><rect x="54" y="30" width="8" height="24" fill="#6b6459"/></g>${eyes("#ff9c5a", 18, 7)}<path class="art-orb" d="M20 38L30 46L24 54M44 36L36 44" stroke="#ff9c5a" stroke-width="2" fill="none"/>`),
  blood_priest: svg(`${hood("#6b1420")}<path d="M22 24H42L38 38H26Z" fill="#1a0508"/>${eyes("#ffd1d1", 30, 5)}<path class="art-orb" d="M32 42C28 49 26 52 26 55A6 6 0 0 0 38 55C38 52 36 49 32 42Z" fill="#e04848"/>`),
  assassin: svg(`${hood("#1c1c24")}<path d="M21 26H43L37 34H27Z" fill="#050508"/>${eyes("#e04848", 30, 5)}<path class="art-weapon" d="M52 18L46 48L50 49L56 19Z" fill="#c9ced6"/>`),
  hellhound: svg(`<path d="M6 46L16 28L28 34H40L50 22L60 42L46 56H18Z" fill="#5a1810"/><path class="art-flame" d="M50 22L58 10L58 28Z" fill="#ff7a2e"/><path class="art-flame" d="M12 30L8 16L20 26ZM24 32L22 18L32 32Z" fill="#ff7a2e"/><g class="art-eyes"><circle cx="50" cy="32" r="3" fill="#ffe14d"/></g>`),
  acolyte: svg(`${hood("#25313d")}${skull(28)}${orb(10, 42, 5, "#8ce0c4")}${orb(54, 42, 5, "#8ce0c4")}`),
  death_knight: svg(`<path d="M12 60C12 40 20 34 32 34S52 40 52 60Z" fill="#20242c"/><path d="M18 8H46V30L32 40L18 30Z" fill="#30353f"/><path d="M18 8L10 2L20 16ZM46 8L54 2L44 16Z" fill="#30353f"/><rect class="art-visor" x="24" y="20" width="16" height="4" fill="#7dd3ff"/>${sword(56, "#7dd3ff")}`),
  demon: svg(`<path d="M12 60C12 42 20 34 32 34S52 42 52 60Z" fill="#6e1418"/><circle cx="32" cy="24" r="14" fill="#8a1c20"/><path d="M20 16L10 2L26 10ZM44 16L54 2L38 10Z" fill="#2b0d0d"/>${eyes("#ffe14d", 22, 6)}<path d="M24 31Q32 37 40 31" stroke="#15121a" stroke-width="2" fill="none"/><path class="art-flame" d="M8 60C4 50 10 46 12 38C14 46 18 50 14 60ZM56 60C60 50 54 46 52 38C50 46 46 50 50 60Z" fill="#ff7a2e"/>`),
  lich_king: svg(`${hood("#172033")}${skull(26)}<path d="M18 14L24 4L29 12L32 2L35 12L40 4L46 14Z" fill="#7dd3ff"/>${orb(27, 26, 2, "#7dd3ff")}${orb(37, 26, 2, "#7dd3ff")}<g class="art-weapon"><rect x="7" y="52" width="4" height="10" fill="#5c4630"/>${orb(9, 48, 6, "#7dd3ff")}</g>`),
};

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

// Значок на карте зависит от того, что карта делает. Он лежит за текстом полупрозрачно
export const CARD_GLYPHS = {
  sword: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 3L28 5L12 21L9 18Z" fill="currentColor"/><path d="M6 15L16 25L14 27L5 18Z" fill="currentColor"/><path d="M8 22L4 28L6 28L10 24Z" fill="currentColor"/></svg>`,
  blades: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M26 3L28 5L14 21L11 18Z" fill="currentColor"/><path d="M6 3L4 5L18 21L21 18Z" fill="currentColor"/><path d="M8 18L14 24L12 26L6 20ZM24 18L18 24L20 26L26 20Z" fill="currentColor"/></svg>`,
  wave: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 22C8 12 14 12 16 18C18 12 24 12 29 22C24 18 20 18 16 24C12 18 8 18 3 22Z" fill="currentColor"/><path d="M6 12C10 6 14 6 16 10C18 6 22 6 26 12C22 10 20 10 16 14C12 10 10 10 6 12Z" fill="currentColor"/></svg>`,
  shield: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3L27 7V15C27 22 22 27 16 29C10 27 5 22 5 15V7Z" fill="currentColor"/></svg>`,
  poison: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C11 11 7 15 7 20A9 9 0 0 0 25 20C25 15 21 11 16 3Z" fill="currentColor"/></svg>`,
  star: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 2L19 13L30 16L19 19L16 30L13 19L2 16L13 13Z" fill="currentColor"/></svg>`,
  heart: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28C4 19 3 13 5 9C8 4 14 5 16 10C18 5 24 4 27 9C29 13 28 19 16 28Z" fill="currentColor"/></svg>`,
  bolt: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19 2L6 18H14L12 30L26 12H17Z" fill="currentColor"/></svg>`,
  scroll: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 4H24V24C24 27 22 28 20 28H6C8 28 8 26 8 24ZM11 9V11H21V9ZM11 14V16H21V14ZM11 19V21H18V19Z" fill="currentColor" fill-rule="evenodd"/></svg>`,
  skull: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C9 3 5 8 5 14C5 18 7 20 10 22V27H22V22C25 20 27 18 27 14C27 8 23 3 16 3ZM11 12A3 3 0 1 1 11 18A3 3 0 0 1 11 12ZM21 12A3 3 0 1 1 21 18A3 3 0 0 1 21 12Z" fill="currentColor" fill-rule="evenodd"/></svg>`,
};
