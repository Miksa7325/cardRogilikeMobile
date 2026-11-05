// Эффекты всех карт на поле боя. У карт Мага свои эффекты (ui/vfx.js), остальные собираются из того,
// что карта делает: удар клинком, бросок, сокрушающий удар, тёмный снаряд, яд, порча, щит, лечение, добор, энергия.
// Цвет берётся из темы рисунка карты (CARD_THEME), поэтому огненная карта горит, а тёмная клубится тьмой.
import { CARD_THEME } from "./cardArt.js";
import {
  ARCANE, FIRE, FROST, GOLD, bolt, burst, ensureCanvas, flash, ms, overlay, pick, playCardVfx, projectile, random, reduced, ring, screen,
  shake, shield, spawn,
} from "./vfx.js";

// Палитры тем: от самого светлого к самому тёмному
const PALETTES = {
  steel: ["#ffffff", "#e4eeff", "#a8bfe6", "#5f77a6"],
  ember: FIRE,
  frost: FROST,
  poison: ["#f4ffc0", "#b4ff5a", "#5fd41e", "#2a8a0e"],
  arcane: ARCANE,
  rose: ["#fff0f2", "#ff8aa0", "#ff2a5a", "#9a0c30"],
  gold: GOLD,
  bone: ["#ffffff", "#ece6d2", "#b8c8b0", "#7a8a74"],
};
const POISON = PALETTES.poison;
const BLOOD = PALETTES.rose;
const HEX = ["#ffffff", "#e0a8ff", "#9a4aff", "#3a0a7a"];

// Слова в id карты, по которым видно, как она бьёт
const THROWN = /throw|dart|knife|knives|toss|fan_|caltrop|shuriken/;
const EXPLOSIVE = /bomb|mixture|elixir_blast|al_spark|immolate|annihilate|apocalypse/;
const SMASH = /bash|heavy|hammer|earthquake|shoulder|kick|knee|hilt|punch|bleed|stunning|executioner|decapitate|doom|berserk|reckless_charge|unstoppable|fortress/;
const MAGIC_THEMES = new Set(["arcane", "frost", "gold"]);
const RESOURCES = new Set(["rage", "darkness", "combo", "reagents", "surge"]);

// Главная точка входа: у карты Мага — свой эффект, у остальных — собранный из её действий
export function playCardEffect(card, positions) {
  if (playCardVfx(card.id, positions) || !positions.from) return;
  ensureCanvas();
  const theme = CARD_THEME[card.id] ?? "steel";
  const context = {
    card,
    palette: PALETTES[theme],
    theme,
    from: positions.from,
    targets: positions.targets.length > 0 ? positions.targets : [positions.from],
    allEnemies: card.target === "allEnemies",
    enemies: positions.enemies ?? positions.targets,
  };
  const effects = flatten([...card.effects, ...(card.power?.effects ?? [])]);
  if (card.type === "power") {
    powerAura(context);
    return;
  }
  const hits = card.effects.filter((effect) => effect.type === "damage").length + countSpendHits(card.effects);
  let delay = 0;
  if (hits > 0) delay = attack(context, Math.min(hits, 4));
  // Остальное, что делает карта, — короткие отголоски после удара
  const accents = pickAccents(effects, context);
  accents.forEach((accent, index) => setTimeout(() => accent(), ms(delay + index * 160)));
}

function flatten(effects) {
  return effects.flatMap((effect) => (effect.type === "spend" ? flatten(effect.effects) : [effect]));
}

function countSpendHits(effects) {
  return effects.filter((effect) => effect.type === "spend").reduce((sum, effect) => sum + effect.effects.filter((inner) => inner.type === "damage").length, 0);
}

// ---------- Атаки ----------
// Возвращает, через сколько мс удар достигнет цели: отголоски эффектов идут после него
function attack(context, hits) {
  const { card, theme } = context;
  if (EXPLOSIVE.test(card.id)) return explosion(context);
  if (THROWN.test(card.id)) return thrown(context, hits);
  if (SMASH.test(card.id) || card.cost >= 3) return smash(context);
  if (context.allEnemies) return MAGIC_THEMES.has(theme) || theme === "poison" ? darkWave(context) : sweep(context, hits);
  if (MAGIC_THEMES.has(theme)) return magicBolt(context, hits);
  if (theme === "ember") return fireSlash(context, hits);
  return slashes(context, hits);
}

// Рубящие удары клинком: светящийся росчерк поперёк цели и искры
function slashes({ targets, palette }, hits) {
  const [target] = targets;
  for (let i = 0; i < hits; i++) {
    setTimeout(() => {
      slashArc(target, palette, { angle: (i % 2 === 0 ? -35 : 35) + random(-12, 12), size: 150 });
      burst(target, palette, { count: 14, size: 4, speed: 300, shape: "streak", life: 380 });
    }, ms(i * 140));
  }
  shake(hits > 2 ? 5 : 3, 220);
  return hits * 140;
}

// Огненный росчерк: тот же удар, но с языками пламени
function fireSlash(context, hits) {
  const [target] = context.targets;
  const time = slashes(context, hits);
  for (let i = 0; i < (reduced() ? 8 : 24); i++) {
    spawn({ x: target.x + random(-40, 40), y: target.y + random(-10, 30), vx: random(-30, 30), vy: random(-260, -120), size: random(6, 12), life: random(400, 800), color: pick(FIRE), core: FIRE[0], delay: random(0, 200), wobble: 25 });
  }
  return time;
}

// Широкий взмах через всех врагов
function sweep({ targets, palette }, hits) {
  const { width } = screen();
  const y = targets.reduce((sum, target) => sum + target.y, 0) / targets.length;
  for (let i = 0; i < hits; i++) {
    setTimeout(() => {
      slashArc({ x: width / 2, y }, palette, { angle: i % 2 === 0 ? -8 : 8, size: width * 1.1, thickness: 14 });
      for (const target of targets) burst(target, palette, { count: 12, size: 4, speed: 280, shape: "streak", life: 380 });
    }, ms(i * 180));
  }
  shake(5, 300);
  return hits * 180;
}

// Брошенные ножи, дротики и склянки летят по дуге и разлетаются осколками
function thrown({ from, targets, palette, card }, hits) {
  const throws = Math.max(hits, card.target === "allEnemies" ? targets.length : 1);
  for (let i = 0; i < throws; i++) {
    const target = targets[i % targets.length];
    setTimeout(() => {
      projectile(from, { x: target.x + random(-10, 10), y: target.y + random(-10, 10) }, palette, { size: 7, duration: 260, arc: random(30, 90), trail: "shard", trailSize: 4 })
        .then(() => burst(target, palette, { count: 12, size: 6, speed: 240, shape: "shard", life: 420 }));
    }, ms(i * 110));
  }
  return 260 + throws * 110;
}

// Сокрушающий удар: ударная волна, обломки и тряска
function smash({ targets, palette, allEnemies }) {
  const list = allEnemies ? targets : [targets[0]];
  for (const target of list) {
    ring(target, palette[1], { size: 240, duration: 520, width: 9 });
    burst(target, palette, { count: 22, size: 7, speed: 380, life: 600 });
    burst(target, ["#9a8a74", "#6a5a48", "#3a3028"], { count: 16, size: 6, speed: 360, shape: "shard", gravity: 900, life: 800 });
  }
  if (allEnemies) {
    const { width, height } = screen();
    for (let i = 0; i < (reduced() ? 12 : 40); i++) {
      spawn({ x: random(0, width), y: height * random(0.35, 0.5), vy: random(-300, -120), ay: 900, size: random(3, 7), life: 800, color: pick(["#9a8a74", "#6a5a48", "#c8b08a"]), shape: "shard", spin: random(-8, 8), delay: random(0, 200) });
    }
  }
  flash("rgba(255, 240, 210, 1)", 160, 0.18);
  shake(allEnemies ? 12 : 9, 420);
  return 0;
}

// Чары: светящийся снаряд темы, на цели — схлопывающееся кольцо
function magicBolt({ from, targets, palette }, hits) {
  const [target] = targets;
  for (let i = 0; i < hits; i++) {
    setTimeout(() => {
      projectile(from, { x: target.x + random(-8, 8), y: target.y + random(-8, 8) }, palette, { size: 14, duration: 300, arc: random(-60, 60), trailSize: 6 })
        .then(() => {
          implode(target, palette);
          burst(target, palette, { count: 18, size: 6, speed: 260 });
        });
    }, ms(i * 150));
  }
  return 300 + hits * 150;
}

// Волна тьмы, мороза или яда катится через всю комнату
function darkWave({ targets, palette }) {
  const wave = overlay("vfx-wave", {}, [
    { transform: "translateX(-110%)", opacity: 0.2 },
    { transform: "translateX(-10%)", opacity: 1, offset: 0.5 },
    { transform: "translateX(110%)", opacity: 0 },
  ], 850, "ease-in-out");
  wave.style.setProperty("--wave-1", palette[1]);
  wave.style.setProperty("--wave-2", palette[2]);
  targets.forEach((target, index) => setTimeout(() => burst(target, palette, { count: 18, size: 7, speed: 280 }), ms(300 + index * 80)));
  shake(4, 300);
  return 400;
}

// Взрыв склянки или бомбы: снаряд по дуге, вспышка, огненное кольцо и обломки
function explosion({ from, targets, palette, allEnemies }) {
  const center = allEnemies
    ? { x: targets.reduce((sum, t) => sum + t.x, 0) / targets.length, y: targets.reduce((sum, t) => sum + t.y, 0) / targets.length }
    : targets[0];
  projectile(from, center, palette, { size: 12, duration: 340, arc: 120, trail: "glow", trailSize: 6 }).then(() => {
    flash("rgba(255, 190, 90, 1)", 260, 0.4);
    ring(center, "rgba(255, 170, 60, 0.95)", { size: allEnemies ? 420 : 260, duration: 560, width: 10 });
    burst(center, FIRE, { count: 50, size: 12, speed: 460, life: 760, gravity: -120 });
    burst(center, palette, { count: 24, size: 7, speed: 360, shape: "shard", gravity: 700, life: 800 });
    for (const target of targets) burst(target, FIRE, { count: 12, size: 8, speed: 200 });
    shake(10, 450);
  });
  return 360;
}

// ---------- Отголоски: то, что карта делает помимо урона ----------
function pickAccents(effects, context) {
  const { from, targets } = context;
  const list = [];
  const seen = new Set();
  const once = (key, accent) => {
    if (seen.has(key)) return;
    seen.add(key);
    list.push(accent);
  };
  for (const effect of effects) {
    // Статус на врагов от карты «на себя» или «всем» ложится на всех живых врагов
    const onEnemies = effect.target === "allEnemies" || context.card.target === "self" ? context.enemies : targets;
    switch (effect.type) {
      case "applyStatus":
        if (effect.target === "self" && RESOURCES.has(effect.status)) once(`resource-${effect.status}`, () => resourceAura(from, effect.status));
        else if (effect.target === "self") once(`self-${effect.status}`, () => aura(from, context.palette));
        else if (effect.status === "poison") once("poison", () => poisonCloud(onEnemies, context.allEnemies || effect.target === "allEnemies"));
        else if (effect.status === "leech") once("leech", () => bloodSeal(onEnemies));
        else once(`hex-${effect.status}`, () => hex(onEnemies, effect.status));
        break;
      case "multiplyStatus":
        once("multiply", () => poisonPulse(onEnemies));
        break;
      case "block":
        once("block", () => shield(from, shieldColor(context.theme), context.palette));
        break;
      case "heal":
        once("heal", () => healGlow(from));
        break;
      case "draw":
        once("draw", () => drawCards(effect.amount));
        break;
      case "gainEnergy":
        once("energy", () => energySpark(from));
        break;
      case "brewPotion":
        once("brew", () => brew(from));
        break;
      case "exhaustWounds":
        once("burnWounds", () => burnWounds());
        break;
      case "loseHp":
        once("loseHp", () => bloodLoss(from));
        break;
      case "addCard":
        once("wound", () => woundSlash(from));
        break;
      default:
        break;
    }
  }
  return list;
}

function shieldColor(theme) {
  return {
    ember: "rgba(255, 150, 60, 0.85)", poison: "rgba(140, 255, 90, 0.8)", arcane: "rgba(190, 120, 255, 0.85)",
    rose: "rgba(255, 90, 130, 0.85)", gold: "rgba(255, 215, 100, 0.85)", bone: "rgba(220, 230, 200, 0.8)",
  }[theme] ?? "rgba(150, 200, 255, 0.85)";
}

// Яд: зелёные пузыри поднимаются от врагов, при отравлении всех — ядовитый туман на всю комнату
function poisonCloud(targets, wide) {
  if (wide) overlay("vfx-poison-fog", {}, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], 1300);
  for (const target of targets) {
    for (let i = 0; i < (reduced() ? 6 : 18); i++) {
      spawn({ x: target.x + random(-40, 40), y: target.y + random(0, 40), vy: random(-120, -50), size: random(3, 8), life: random(700, 1200), color: pick(POISON), shape: i % 3 === 0 ? "glow" : "bubble", delay: random(0, 400), wobble: 20 });
    }
  }
}

// Удвоение яда: два зелёных удара пульса
function poisonPulse(targets) {
  for (const target of targets) {
    ring(target, "rgba(140, 255, 80, 0.9)", { size: 150, duration: 450 });
    setTimeout(() => ring(target, "rgba(200, 255, 120, 0.9)", { size: 220, duration: 500 }), ms(200));
    poisonCloud([target], false);
  }
}

// Порча: тёмные руны спиралью стекаются к врагу и сжимаются в кольцо
function hex(targets, status) {
  const palette = status === "weak" ? PALETTES.bone : status === "vulnerable" ? BLOOD : HEX;
  for (const target of targets) {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      spawn({ x: target.x + Math.cos(angle) * 80, y: target.y + Math.sin(angle) * 80, vx: -Math.cos(angle) * 160 - Math.sin(angle) * 120, vy: -Math.sin(angle) * 160 + Math.cos(angle) * 120, size: random(4, 7), life: 520, color: pick(palette), shape: "star", spin: 5 });
    }
    setTimeout(() => implode(target, palette), ms(260));
  }
}

// Печать крови: кровавое кольцо и капли на враге
function bloodSeal(targets) {
  for (const target of targets) {
    ring(target, "rgba(255, 40, 80, 0.95)", { size: 170, duration: 600, width: 5 });
    burst(target, BLOOD, { count: 16, size: 5, speed: 180, gravity: 500, life: 700 });
  }
}

// Кольцо, которое не расходится, а сжимается в точку
function implode(at, palette) {
  overlay("vfx-ring", {
    left: `${at.x}px`, top: `${at.y}px`, width: "200px", height: "200px",
    border: `5px solid ${palette[2]}`, boxShadow: `0 0 18px ${palette[1]}, inset 0 0 18px ${palette[1]}`,
  }, [
    { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
    { transform: "translate(-50%, -50%) scale(0.6)", opacity: 1, offset: 0.4 },
    { transform: "translate(-50%, -50%) scale(0.05)", opacity: 0 },
  ], 420, "ease-in");
}

// Лечение: зелёные крестики и свет поднимаются от героя
function healGlow(at) {
  for (let i = 0; i < (reduced() ? 8 : 22); i++) {
    spawn({ x: at.x + random(-50, 50), y: at.y + random(0, 50), vy: random(-160, -70), size: random(4, 8), life: random(700, 1100), color: pick(["#b8ffb0", "#6aff8a", "#ffffff"]), shape: i % 2 ? "plus" : "glow", delay: random(0, 350) });
  }
  ring(at, "rgba(120, 255, 150, 0.8)", { size: 170, duration: 700, width: 4 });
}

// Добор: карты вылетают из колоды и уходят в руку
function drawCards(amount) {
  const hand = document.querySelector(".hand")?.getBoundingClientRect();
  const { width, height } = screen();
  const to = hand ? { x: hand.left + hand.width / 2, y: hand.top + hand.height / 2 } : { x: width / 2, y: height * 0.85 };
  const start = { x: 30, y: height - 40 };
  for (let i = 0; i < Math.min(5, amount); i++) {
    const time = 0.5;
    spawn({ x: start.x, y: start.y, vx: (to.x - start.x + random(-60, 60)) / time, vy: (to.y - start.y - 120) / time, ay: 480, size: 12, life: time * 1000, color: "#ffd56a", shape: "card", angle: random(-0.5, 0.5), spin: random(-3, 3), delay: i * 90 });
  }
}

// Энергия: золотые молнии вокруг героя
function energySpark(at) {
  for (let i = 0; i < 3; i++) {
    const angle = random(0, Math.PI * 2);
    setTimeout(() => bolt({ x: at.x + Math.cos(angle) * 90, y: at.y + Math.sin(angle) * 70 }, at, "#ffd84a", { width: 2, duration: 260, jitter: 12 }), ms(i * 90));
  }
  burst(at, GOLD, { count: 18, size: 5, speed: 220, shape: "star" });
}

// Ресурс класса: Ярость вспыхивает огнём, Тьма клубится дымом, Комбо — золотыми искрами, Реагенты — пузырями
function resourceAura(at, status) {
  const palette = { rage: FIRE, darkness: HEX, combo: GOLD, reagents: POISON, surge: ARCANE }[status] ?? GOLD;
  for (let i = 0; i < (reduced() ? 8 : 24); i++) {
    const angle = random(0, Math.PI * 2);
    spawn({ x: at.x + Math.cos(angle) * 55, y: at.y + Math.sin(angle) * 45, vx: -Math.sin(angle) * 90, vy: random(-160, -60), size: random(5, 11), life: random(600, 1000), color: pick(palette), core: palette[0], shape: status === "reagents" ? "bubble" : "glow", delay: random(0, 300), wobble: 20 });
  }
}

// Сила, Ловкость и другие усиления: кольцо и поднимающиеся искры цвета карты
function aura(at, palette) {
  ring(at, palette[2], { size: 190, duration: 650, width: 5 });
  for (let i = 0; i < (reduced() ? 10 : 28); i++) {
    spawn({ x: at.x + random(-60, 60), y: at.y + random(10, 50), vy: random(-240, -100), size: random(3, 7), life: random(600, 1000), color: pick(palette), shape: i % 3 === 0 ? "star" : "glow", delay: random(0, 300), spin: 3 });
  }
}

// Сила: столп света над героем, кольца и звёзды — сила останется до конца боя
function powerAura({ from, palette }) {
  const pillar = overlay("vfx-pillar", { left: `${from.x}px`, top: "0px", height: `${from.y + 50}px` }, [
    { transform: "translateX(-50%) scaleX(0.1)", opacity: 0 },
    { transform: "translateX(-50%) scaleX(0.8)", opacity: 0.9, offset: 0.3 },
    { transform: "translateX(-50%) scaleX(0.4)", opacity: 0 },
  ], 1000);
  pillar.style.background = `linear-gradient(90deg, transparent, ${palette[2]} 35%, ${palette[0]} 50%, ${palette[2]} 65%, transparent)`;
  ring(from, palette[1], { size: 160, duration: 600 });
  setTimeout(() => ring(from, palette[2], { size: 240, duration: 700 }), ms(150));
  for (let i = 0; i < (reduced() ? 10 : 30); i++) {
    spawn({ x: from.x + random(-40, 40), y: from.y + random(0, 40), vy: random(-260, -120), size: random(4, 9), life: random(700, 1100), color: pick(palette), shape: i % 2 ? "star" : "glow", delay: random(0, 400), spin: 3 });
  }
}

// Варка зелья: пузыри и всплеск над героем
function brew(at) {
  for (let i = 0; i < (reduced() ? 8 : 26); i++) {
    spawn({ x: at.x + random(-25, 25), y: at.y + random(10, 30), vx: random(-40, 40), vy: random(-220, -90), size: random(3, 8), life: random(600, 1000), color: pick(POISON), shape: "bubble", delay: random(0, 400), wobble: 18 });
  }
  setTimeout(() => burst({ x: at.x, y: at.y - 60 }, POISON, { count: 18, size: 6, speed: 200, shape: "star" }), ms(450));
}

// Раны сгорают прямо в руке: снизу поднимается пламя
function burnWounds() {
  const hand = document.querySelector(".hand")?.getBoundingClientRect();
  const { width, height } = screen();
  const left = hand?.left ?? 0;
  const span = hand?.width ?? width;
  const bottom = hand?.bottom ?? height;
  for (let i = 0; i < (reduced() ? 15 : 50); i++) {
    spawn({ x: left + random(0, span), y: bottom - random(0, 40), vx: random(-20, 20), vy: random(-320, -140), size: random(7, 15), life: random(500, 900), color: pick(FIRE), core: FIRE[0], delay: random(0, 300), wobble: 30 });
  }
}

// Плата здоровьем: капли крови падают с героя
function bloodLoss(at) {
  burst(at, BLOOD, { count: 16, size: 5, speed: 200, gravity: 700, life: 700 });
}

// Рана в колоду: красный разрез у героя
function woundSlash(at) {
  slashArc(at, BLOOD, { angle: 40, size: 110, thickness: 6 });
}

// Светящаяся дуга-росчерк (SVG): так выглядит удар клинком
function slashArc(at, palette, { angle = 0, size = 150, thickness = 10 } = {}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "vfx vfx-slash");
  svg.setAttribute("viewBox", "-100 -100 200 200");
  Object.assign(svg.style, { left: `${at.x}px`, top: `${at.y}px`, width: `${size}px`, height: `${size}px`, filter: `drop-shadow(0 0 6px ${palette[2]}) drop-shadow(0 0 14px ${palette[2]})` });
  const width = (thickness / size) * 200;
  svg.innerHTML = `<path d="M-90 30 Q0 -60 90 30" fill="none" stroke="${palette[1]}" stroke-width="${width * 1.8}" stroke-linecap="round" opacity="0.6"/>`
    + `<path d="M-90 30 Q0 -60 90 30" fill="none" stroke="#ffffff" stroke-width="${width * 0.7}" stroke-linecap="round"/>`;
  document.body.append(svg);
  for (const path of svg.querySelectorAll("path")) {
    path.setAttribute("pathLength", "100");
    path.style.strokeDasharray = "100";
    path.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: ms(140), easing: "ease-out", fill: "forwards" });
  }
  svg.animate([
    { transform: `translate(-50%, -50%) rotate(${angle}deg) scale(0.9)`, opacity: 1 },
    { transform: `translate(-50%, -50%) rotate(${angle}deg) scale(1.05)`, opacity: 1, offset: 0.5 },
    { transform: `translate(-50%, -50%) rotate(${angle}deg) scale(1.1)`, opacity: 0 },
  ], { duration: ms(360), fill: "forwards" }).finished.then(() => svg.remove(), () => svg.remove());
}

