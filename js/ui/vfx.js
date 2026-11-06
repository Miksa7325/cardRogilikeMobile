// Эффекты карт на поле боя: не на карте, а во всей комнате, где идёт бой. Здесь — общие приёмы и эффекты Мага,
// эффекты остальных карт собираются из этих приёмов в ui/vfxCards.js.
// Частицы (снег, искры, угли, звёзды) рисуются на холсте поверх боя, молнии, кольца, лучи и вспышки — элементами
// с анимацией. Все длительности умножаются на --anim-speed: при ускорении ×2 эффекты тоже вдвое короче.
import { el } from "./dom.js";
import { getAnimationSpeed, isLiteGraphics } from "./settings.js";

// Какой эффект у какой карты
export const CARD_VFX = {
  m_spark: "spark", m_barrier: "barrier", m_frostbolt: "frostbolt", m_arcane_blast: "arcaneBlast",
  m_fireball: "fireball", m_flame_wave: "flameWave", m_lightning: "lightning", m_ice_armor: "iceArmor",
  m_missiles: "missiles", m_frost_nova: "frostNova", m_static: "staticField", m_ignite: "ignite",
  m_mana_shield: "manaShield", m_blizzard: "blizzard", m_chain_lightning: "chainLightning", m_meteor: "meteor",
  m_surge: "surgeBeam", m_overload: "overload", m_frost_aura: "frostAura", m_focus: "focus",
  m_time_warp: "timeWarp", m_inferno: "inferno", m_starfall: "starfall", m_archmage: "archmage", m_mana_storm: "manaStorm",
  m_ice_shards: "frostbolt", m_scorch: "ignite", m_arcane_veil: "manaShield", m_spark_rain: "starfall", m_thunderclap: "chainLightning",
  m_mana_tap: "overload", m_spell_echo: "archmage", m_pyroblast: "fireball", m_clear_mind: "focus", m_absolute_zero: "frostNova",
};

// Цвета стихий
export const FIRE = ["#fff3b0", "#ffb02e", "#ff5a12", "#c21a00"];
export const FROST = ["#ffffff", "#c8f0ff", "#7fd0ff", "#3a8cff"];
export const ARCANE = ["#ffffff", "#f0c8ff", "#b46cff", "#6a2cff"];
export const STORM = ["#ffffff", "#e8f4ff", "#9fd8ff", "#5a9cff"];
export const GOLD = ["#fffbe0", "#ffe27a", "#ffb21e", "#c56d00"];

let canvas = null;
let context = null;
let particles = [];
let running = false;
let lastTime = 0;
let listening = false;

// Больше частиц слабый телефон не потянет: лишние просто не появляются, эффект остаётся узнаваемым
const MAX_PARTICLES = 320;
// Светящиеся частицы рисуются готовой картинкой, а не новым градиентом на каждом кадре
const glowSprites = new Map();
const GLOW_SPRITE_SIZE = 64;

export function ms(value) {
  return value * getAnimationSpeed();
}

export const random = (min, max) => min + Math.random() * (max - min);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Проигрывает особый эффект карты Мага. from — где стоит герой, targets — центры целей (враги или сам герой).
// Возвращает false, если у карты нет своего эффекта
export function playCardVfx(cardId, { from, targets }) {
  const effect = EFFECTS[CARD_VFX[cardId]];
  if (!effect || !from) return false;
  ensureCanvas();
  effect(from, targets.length > 0 ? targets : [from]);
  return true;
}

// ---------- Холст частиц ----------
export function ensureCanvas() {
  if (canvas?.isConnected) return;
  canvas = el("canvas", "vfx-canvas");
  document.body.append(canvas);
  context = canvas.getContext("2d");
  resizeCanvas();
  if (!listening) {
    listening = true;
    window.addEventListener("resize", resizeCanvas);
  }
}

// Частицы мягкие, поэтому холсту хватает полуторной чёткости: на телефоне с плотным экраном это вдвое меньше работы
function resizeCanvas() {
  if (!canvas) return;
  const ratio = isLiteGraphics() ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

// Частица: позиция, скорость, ускорение, жизнь в мс, размер, цвет и форма
export function spawn(particle) {
  if (particles.length >= MAX_PARTICLES) return;
  // Лёгкая графика: каждая вторая частица не появляется, эффект остаётся узнаваемым
  if (isLiteGraphics() && Math.random() < 0.5) return;
  particles.push({
    vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, size: 4, grow: 0, life: 800, age: 0, shape: "glow", spin: 0, angle: 0, wobble: 0, seed: Math.random() * 6,
    delay: 0, ...particle, life: ms(particle.life ?? 800), delay: ms(particle.delay ?? 0),
  });
  if (!running) {
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(tick);
  }
}

function tick(now) {
  try {
    drawFrame(now);
  } catch {
    // Ошибка рисования не должна навсегда остановить эффекты: сбрасываем частицы этого кадра
    particles = [];
  }
  if (particles.length > 0) {
    requestAnimationFrame(tick);
  } else {
    running = false;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function drawFrame(now) {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
  context.globalCompositeOperation = "lighter";
  particles = particles.filter((p) => {
    if (p.delay > 0) {
      p.delay -= dt;
      return true;
    }
    p.age += dt;
    if (p.age >= p.life) return false;
    const step = dt / 1000;
    p.vx += p.ax * step;
    p.vy += p.ay * step;
    if (p.drag) {
      p.vx *= 1 - p.drag * step;
      p.vy *= 1 - p.drag * step;
    }
    p.x += (p.vx + (p.wobble ? Math.sin((p.age / 180) + p.seed) * p.wobble : 0)) * step;
    p.y += p.vy * step;
    p.angle += p.spin * step;
    drawParticle(p, 1 - p.age / p.life);
    return true;
  });
}

function drawParticle(p, left) {
  const size = Math.max(0.1, p.size + p.grow * (1 - left));
  const alpha = Math.min(1, left * 1.6) * (p.alpha ?? 1);
  context.globalAlpha = alpha;
  if (p.shape === "glow") {
    context.drawImage(glowSprite(p.color, p.core ?? "#ffffff"), p.x - size, p.y - size, size * 2, size * 2);
  } else if (p.shape === "flake") {
    context.strokeStyle = p.color;
    context.lineWidth = Math.max(1, size / 4);
    context.save();
    context.translate(p.x, p.y);
    context.rotate(p.angle);
    context.beginPath();
    for (let arm = 0; arm < 3; arm++) {
      const a = (arm * Math.PI) / 3;
      context.moveTo(Math.cos(a) * -size, Math.sin(a) * -size);
      context.lineTo(Math.cos(a) * size, Math.sin(a) * size);
    }
    context.stroke();
    context.restore();
  } else if (p.shape === "streak") {
    const length = Math.hypot(p.vx, p.vy) * (p.trail ?? 0.05);
    const angle = Math.atan2(p.vy, p.vx);
    context.strokeStyle = p.color;
    context.lineWidth = size;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(p.x, p.y);
    context.lineTo(p.x - Math.cos(angle) * length, p.y - Math.sin(angle) * length);
    context.stroke();
  } else if (p.shape === "shard") {
    context.fillStyle = p.color;
    context.save();
    context.translate(p.x, p.y);
    context.rotate(p.angle);
    context.beginPath();
    context.moveTo(0, -size);
    context.lineTo(size * 0.35, 0);
    context.lineTo(0, size);
    context.lineTo(-size * 0.35, 0);
    context.closePath();
    context.fill();
    context.restore();
  } else if (p.shape === "bubble") {
    context.strokeStyle = p.color;
    context.lineWidth = Math.max(1, size / 5);
    context.beginPath();
    context.arc(p.x, p.y, size, 0, Math.PI * 2);
    context.stroke();
  } else if (p.shape === "plus") {
    context.fillStyle = p.color;
    context.fillRect(p.x - size, p.y - size / 3, size * 2, (size * 2) / 3);
    context.fillRect(p.x - size / 3, p.y - size, (size * 2) / 3, size * 2);
  } else if (p.shape === "card") {
    // Карта непрозрачная: рисуем её обычным наложением, а не сложением света
    context.save();
    context.globalCompositeOperation = "source-over";
    context.translate(p.x, p.y);
    context.rotate(p.angle);
    context.fillStyle = "rgba(60, 30, 10, 0.9)";
    context.strokeStyle = p.color;
    context.lineWidth = 2;
    context.beginPath();
    // roundRect есть не во всех браузерах: в старых карта будет с прямыми углами
    if (context.roundRect) context.roundRect(-size * 0.7, -size, size * 1.4, size * 2, size * 0.25);
    else context.rect(-size * 0.7, -size, size * 1.4, size * 2);
    context.fill();
    context.stroke();
    context.restore();
  } else if (p.shape === "star") {
    context.fillStyle = p.color;
    context.save();
    context.translate(p.x, p.y);
    context.rotate(p.angle);
    context.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? size : size * 0.42;
      const a = (i * Math.PI) / 5;
      context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    context.closePath();
    context.fill();
    context.restore();
  }
  context.globalAlpha = 1;
}

// Круглое свечение одного цвета: рисуется один раз и дальше только масштабируется
function glowSprite(color, core) {
  const key = color + core;
  let sprite = glowSprites.get(key);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = GLOW_SPRITE_SIZE;
  sprite.height = GLOW_SPRITE_SIZE;
  const g = sprite.getContext("2d");
  const r = GLOW_SPRITE_SIZE / 2;
  const gradient = g.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, core);
  gradient.addColorStop(0.35, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
  glowSprites.set(key, sprite);
  return sprite;
}

// ---------- Общие приёмы ----------
// Вспышка-взрыв частиц во все стороны
export function burst(at, palette, { count = 26, speed: velocity = 260, size = 6, life = 600, shape = "glow", gravity = 0, spread = 1 } = {}) {
  if (reduced()) count = Math.ceil(count / 3);
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const v = random(0.25, 1) * velocity * spread;
    spawn({
      x: at.x, y: at.y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, ay: gravity, drag: 2.2,
      size: random(0.5, 1.2) * size, life: random(0.6, 1) * life, color: pick(palette), core: palette[0], shape, spin: random(-8, 8),
    });
  }
}

// Снаряд летит от героя к цели, за ним тянется след. Возвращает промис: снаряд долетел
export function projectile(from, to, palette, { size = 14, duration = 320, trail = "glow", arc = 0, trailSize = 6 } = {}) {
  return new Promise((resolve) => {
    const time = ms(duration);
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / time);
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * arc;
      spawn({ x, y, size, life: 90, color: palette[1], core: palette[0] });
      spawn({ x: x + random(-4, 4), y: y + random(-4, 4), vx: random(-30, 30), vy: random(-30, 30), size: trailSize, life: 380, color: pick(palette), shape: trail, spin: random(-6, 6) });
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

// Элемент поверх боя с анимацией; после анимации исчезает сам
export function overlay(className, styles, frames, duration, easing = "ease-out") {
  const element = el("div", `vfx ${className}`);
  Object.assign(element.style, styles);
  document.body.append(element);
  element.animate(frames, { duration: ms(duration), easing, fill: "forwards" }).finished.then(() => element.remove(), () => element.remove());
  return element;
}

// Вспышка на весь экран
export function flash(color, duration = 260, strength = 0.55) {
  overlay("vfx-flash", { background: color }, [{ opacity: strength }, { opacity: 0 }], duration);
}

// Кольцо расходится от точки
export function ring(at, color, { size = 220, duration = 520, width = 6 } = {}) {
  overlay("vfx-ring", {
    left: `${at.x}px`, top: `${at.y}px`, width: `${size}px`, height: `${size}px`,
    border: `${width}px solid ${color}`, boxShadow: `0 0 18px ${color}, inset 0 0 18px ${color}`,
  }, [
    { transform: "translate(-50%, -50%) scale(0.05)", opacity: 1 },
    { transform: "translate(-50%, -50%) scale(1)", opacity: 0 },
  ], duration);
}

// Тряска экрана боя
export function shake(strength = 6, duration = 320) {
  const combat = document.querySelector(".combat");
  combat?.animate([
    { transform: "none" },
    { transform: `translate(${-strength}px, ${strength / 2}px)` },
    { transform: `translate(${strength}px, ${-strength / 2}px)` },
    { transform: `translate(${-strength / 2}px, ${strength / 3}px)` },
    { transform: "none" },
  ], { duration: ms(duration) });
}

// Ломаная молния из точки в точку (SVG поверх боя)
export function bolt(from, to, color, { width = 4, duration = 380, jitter = 26 } = {}) {
  const points = [from];
  const segments = 9;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    points.push({ x: from.x + (to.x - from.x) * t + random(-jitter, jitter), y: from.y + (to.y - from.y) * t + random(-jitter / 2, jitter / 2) });
  }
  points.push(to);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "vfx vfx-bolt");
  svg.setAttribute("width", window.innerWidth);
  svg.setAttribute("height", window.innerHeight);
  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  svg.innerHTML = `<polyline points="${line}" fill="none" stroke="${color}" stroke-width="${width * 2.6}" stroke-linejoin="round" opacity="0.45"/>`
    + `<polyline points="${line}" fill="none" stroke="#ffffff" stroke-width="${width}" stroke-linejoin="round"/>`;
  svg.style.filter = `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color})`;
  document.body.append(svg);
  svg.animate([{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }, { opacity: 0 }], { duration: ms(duration) }).finished.then(() => svg.remove(), () => svg.remove());
}

export const wait = (value) => new Promise((resolve) => setTimeout(resolve, ms(value)));
export const screen = () => ({ width: window.innerWidth, height: window.innerHeight });

// ---------- Эффекты карт ----------
const EFFECTS = {
  async spark(from, [target]) {
    await projectile(from, target, ARCANE, { size: 10, duration: 240 });
    burst(target, ARCANE, { count: 18, size: 5, speed: 220, shape: "star" });
  },

  barrier(from) {
    shield(from, "rgba(150, 200, 255, 0.85)", FROST);
  },

  manaShield(from) {
    shield(from, "rgba(190, 130, 255, 0.85)", ARCANE);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      spawn({ x: from.x + Math.cos(angle) * 70, y: from.y + Math.sin(angle) * 70, vx: -Math.sin(angle) * 120, vy: Math.cos(angle) * 120, size: 7, life: 900, color: pick(ARCANE), shape: "shard", spin: 6 });
    }
  },

  async frostbolt(from, [target]) {
    await projectile(from, target, FROST, { size: 12, duration: 300, trail: "flake", trailSize: 5 });
    burst(target, FROST, { count: 24, size: 9, speed: 300, shape: "shard" });
    burst(target, FROST, { count: 12, size: 5, speed: 120, shape: "flake", life: 900 });
    ring(target, "rgba(160, 220, 255, 0.9)", { size: 160 });
  },

  async arcaneBlast(from, [target]) {
    await projectile(from, target, ARCANE, { size: 16, duration: 260, arc: 40 });
    ring(target, "rgba(200, 120, 255, 0.95)", { size: 200 });
    ring(target, "rgba(255, 220, 255, 0.8)", { size: 120, duration: 380 });
    burst(target, ARCANE, { count: 30, size: 7, speed: 340 });
  },

  async fireball(from, [target]) {
    await projectile(from, target, FIRE, { size: 22, duration: 360, arc: 70, trailSize: 9 });
    burst(target, FIRE, { count: 40, size: 12, speed: 380, life: 700, gravity: -200 });
    ring(target, "rgba(255, 140, 40, 0.9)", { size: 210 });
    flash("rgba(255, 120, 30, 1)", 220, 0.25);
    shake(5);
  },

  flameWave(from) {
    const { width, height } = screen();
    overlay("vfx-flame-wave", {}, [
      { transform: "translateX(-110%)", opacity: 0.2 },
      { transform: "translateX(-10%)", opacity: 1, offset: 0.5 },
      { transform: "translateX(110%)", opacity: 0 },
    ], 900, "ease-in-out");
    for (let i = 0; i < (reduced() ? 20 : 70); i++) {
      spawn({ x: random(-40, width * 0.3), y: random(height * 0.12, height * 0.55), vx: random(500, 800), vy: random(-120, -40), size: random(6, 16), life: random(500, 900), color: pick(FIRE), core: FIRE[0], delay: random(0, 250) });
    }
    shake(4);
  },

  lightning(from, [target]) {
    const sky = { x: target.x + random(-40, 40), y: 0 };
    bolt(sky, target, "#8fc8ff", { width: 5 });
    setTimeout(() => bolt(sky, target, "#8fc8ff", { width: 3, duration: 260 }), ms(90));
    flash("rgba(220, 235, 255, 1)", 200, 0.45);
    burst(target, STORM, { count: 22, size: 4, speed: 360, shape: "streak" });
    shake(4, 220);
  },

  iceArmor(from) {
    for (let i = 0; i < 26; i++) {
      const angle = random(0, Math.PI * 2);
      const distance = random(90, 140);
      spawn({ x: from.x + Math.cos(angle) * distance, y: from.y + Math.sin(angle) * distance, vx: -Math.cos(angle) * distance * 2.2, vy: -Math.sin(angle) * distance * 2.2, drag: 3, size: random(7, 12), life: 650, color: pick(FROST), shape: "shard", angle, spin: 0 });
    }
    setTimeout(() => shield(from, "rgba(170, 225, 255, 0.9)", FROST), ms(350));
  },

  async missiles(from, targets) {
    for (let i = 0; i < 3; i++) {
      const target = targets[i % targets.length];
      projectile(from, { x: target.x + random(-14, 14), y: target.y + random(-14, 14) }, ARCANE, { size: 9, duration: 300, arc: random(-80, 80) })
        .then(() => burst(target, ARCANE, { count: 12, size: 5, speed: 200, shape: "star" }));
      await wait(110);
    }
  },

  frostNova(from, targets) {
    ring(from, "rgba(170, 225, 255, 0.95)", { size: Math.max(screen().width, screen().height) * 1.6, duration: 800, width: 10 });
    overlay("vfx-frost-edge", {}, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], 1200);
    for (const target of targets) setTimeout(() => burst(target, FROST, { count: 16, size: 9, speed: 200, shape: "shard" }), ms(300));
  },

  staticField(from, targets) {
    const points = [from, ...targets];
    for (let i = 0; i < points.length - 1; i++) {
      setTimeout(() => bolt(points[i], points[i + 1], "#bfe4ff", { width: 2, duration: 260, jitter: 14 }), ms(i * 70));
    }
    for (const target of targets) burst(target, STORM, { count: 14, size: 3, speed: 260, shape: "streak" });
  },

  ignite(from, [target]) {
    for (let i = 0; i < (reduced() ? 15 : 45); i++) {
      spawn({ x: target.x + random(-36, 36), y: target.y + random(10, 40), vx: random(-20, 20), vy: random(-220, -90), size: random(6, 14), life: random(500, 1000), color: pick(FIRE), core: FIRE[0], delay: random(0, 500), wobble: 30, seed: random(0, 6) });
    }
  },

  // Снежная буря: ветер и снег через всю комнату
  blizzard(from, targets) {
    const { width, height } = screen();
    overlay("vfx-blizzard-fog", {}, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], 1900);
    const flakes = reduced() ? 50 : 170;
    for (let i = 0; i < flakes; i++) {
      spawn({ x: random(-width * 0.5, width), y: random(-height * 0.2, height * 0.8), vx: random(420, 720), vy: random(140, 260), size: random(2, 6), life: random(900, 1500), color: pick(FROST), shape: i % 3 === 0 ? "flake" : "glow", core: "#ffffff", delay: random(0, 700), spin: random(-5, 5), wobble: 40, seed: random(0, 6) });
    }
    const gusts = reduced() ? 10 : 34;
    for (let i = 0; i < gusts; i++) {
      spawn({ x: random(-width * 0.6, 0), y: random(0, height * 0.75), vx: random(900, 1300), vy: random(60, 160), size: random(1, 2.5), life: random(700, 1100), color: "rgba(220, 240, 255, 0.7)", shape: "streak", trail: 0.12, delay: random(0, 900) });
    }
    for (const target of targets) setTimeout(() => burst(target, FROST, { count: 10, size: 8, speed: 160, shape: "shard" }), ms(600));
  },

  chainLightning(from, targets) {
    const points = [from, ...targets];
    flash("rgba(200, 225, 255, 1)", 180, 0.3);
    for (let i = 0; i < points.length - 1; i++) {
      setTimeout(() => {
        bolt(points[i], points[i + 1], "#7fb8ff", { width: 4, jitter: 30 });
        burst(points[i + 1], STORM, { count: 18, size: 4, speed: 300, shape: "streak" });
      }, ms(i * 140));
    }
  },

  // Метеор падает с неба на врага
  async meteor(from, [target]) {
    const start = { x: target.x + screen().width * 0.45, y: -60 };
    overlay("vfx-meteor-shadow", { left: `${target.x}px`, top: `${target.y + 30}px` }, [
      { transform: "translate(-50%, -50%) scale(0.3)", opacity: 0 },
      { transform: "translate(-50%, -50%) scale(1)", opacity: 0.8 },
    ], 480);
    await projectile(start, target, FIRE, { size: 34, duration: 480, trailSize: 14 });
    flash("rgba(255, 170, 60, 1)", 320, 0.5);
    ring(target, "rgba(255, 160, 60, 0.95)", { size: 340, duration: 600, width: 10 });
    burst(target, FIRE, { count: 60, size: 14, speed: 520, life: 900, gravity: 300 });
    burst(target, ["#8a6a50", "#5a4030", "#3a2a20"], { count: 24, size: 7, speed: 420, shape: "shard", gravity: 700, life: 900 });
    shake(12, 480);
  },

  // Луч силы от героя к врагу
  surgeBeam(from, [target]) {
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const length = Math.hypot(dx, dy);
    overlay("vfx-beam", {
      left: `${from.x}px`, top: `${from.y}px`, width: `${length}px`, transform: `rotate(${Math.atan2(dy, dx)}rad)`,
    }, [
      { opacity: 0, height: "4px" },
      { opacity: 1, height: "22px", offset: 0.25 },
      { opacity: 1, height: "14px", offset: 0.7 },
      { opacity: 0, height: "2px" },
    ], 650);
    burst(target, ARCANE, { count: 30, size: 8, speed: 300 });
  },

  overload(from) {
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 4;
      const radius = 20 + i * 2.5;
      spawn({ x: from.x + Math.cos(angle) * radius, y: from.y + Math.sin(angle) * radius, vx: -Math.sin(angle) * 220, vy: Math.cos(angle) * 220 - 40, size: random(4, 8), life: 900, color: pick(ARCANE), delay: i * 12 });
    }
    ring(from, "rgba(190, 120, 255, 0.9)", { size: 180 });
  },

  frostAura(from) {
    for (let i = 0; i < 30; i++) {
      spawn({ x: from.x + random(-90, 90), y: from.y - random(60, 120), vy: random(40, 90), size: random(3, 6), life: random(1000, 1600), color: pick(FROST), shape: "flake", delay: random(0, 600), wobble: 20, seed: random(0, 6), spin: random(-2, 2) });
    }
    shield(from, "rgba(170, 225, 255, 0.6)", FROST);
  },

  focus(from) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      spawn({ x: from.x + Math.cos(angle) * 60, y: from.y + Math.sin(angle) * 60, vx: -Math.sin(angle) * 90, vy: Math.cos(angle) * 90, size: 9, life: 1000, color: pick(GOLD), shape: "star", spin: 3 });
    }
    ring(from, "rgba(255, 220, 120, 0.85)", { size: 150, duration: 700 });
  },

  // Остановка времени: мир на миг замирает и выцветает, по комнате идёт рябь
  timeWarp(from, targets) {
    const combat = document.querySelector(".combat");
    combat?.animate([{ filter: "none" }, { filter: "grayscale(1) contrast(1.2) hue-rotate(180deg)", offset: 0.3 }, { filter: "grayscale(0.6)", offset: 0.7 }, { filter: "none" }], { duration: ms(1100) });
    for (let i = 0; i < 4; i++) setTimeout(() => ring(from, "rgba(200, 230, 255, 0.7)", { size: 600, duration: 900, width: 3 }), ms(i * 160));
    for (const target of targets) burst(target, ["#ffffff", "#d8e8ff", "#a0b8e0"], { count: 10, size: 4, speed: 60, life: 1100 });
  },

  // Инферно: вся комната в огне
  inferno(from, targets) {
    const { width, height } = screen();
    overlay("vfx-inferno", {}, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0.8, offset: 0.7 }, { opacity: 0 }], 1600);
    for (let i = 0; i < (reduced() ? 40 : 160); i++) {
      spawn({ x: random(0, width), y: height * random(0.55, 0.75), vx: random(-40, 40), vy: random(-600, -260), size: random(8, 20), life: random(600, 1200), color: pick(FIRE), core: FIRE[0], delay: random(0, 700), wobble: 50, seed: random(0, 6) });
    }
    for (const target of targets) setTimeout(() => burst(target, FIRE, { count: 26, size: 12, speed: 320 }), ms(400));
    shake(9, 700);
  },

  // Звездопад: падающие звёзды бьют по каждому врагу
  starfall(from, targets) {
    overlay("vfx-night", {}, [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], 1500);
    for (let i = 0; i < 4; i++) {
      for (const target of targets) {
        setTimeout(() => {
          const start = { x: target.x - 160 + random(-30, 30), y: -40 };
          projectile(start, { x: target.x + random(-10, 10), y: target.y + random(-10, 10) }, GOLD, { size: 12, duration: 280, trail: "star", trailSize: 5 })
            .then(() => burst(target, GOLD, { count: 12, size: 6, speed: 220, shape: "star" }));
        }, ms(i * 200 + random(0, 80)));
      }
    }
  },

  archmage(from) {
    overlay("vfx-pillar", { left: `${from.x}px`, top: "0px", height: `${from.y + 50}px` }, [
      { transform: "translateX(-50%) scaleX(0.1)", opacity: 0 },
      { transform: "translateX(-50%) scaleX(1)", opacity: 1, offset: 0.3 },
      { transform: "translateX(-50%) scaleX(0.6)", opacity: 0 },
    ], 1100);
    for (let i = 0; i < 40; i++) {
      spawn({ x: from.x + random(-40, 40), y: from.y + random(0, 40), vy: random(-260, -120), size: random(4, 9), life: random(700, 1200), color: pick(GOLD), shape: i % 2 ? "star" : "glow", delay: random(0, 500), spin: 3 });
    }
  },

  // Буря маны: по комнате кружит чародейский вихрь и бьёт по каждому врагу
  manaStorm(from, targets) {
    const { width, height } = screen();
    overlay("vfx-mana-storm", {}, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], 1400);
    for (let i = 0; i < (reduced() ? 30 : 110); i++) {
      const angle = random(0, Math.PI * 2);
      const radius = random(40, Math.min(width, height) * 0.5);
      const center = { x: width / 2, y: height * 0.32 };
      spawn({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * 0.6, vx: -Math.sin(angle) * 380, vy: Math.cos(angle) * 230, size: random(3, 8), life: random(700, 1200), color: pick(ARCANE), delay: random(0, 400) });
    }
    targets.forEach((target, index) => setTimeout(() => {
      bolt({ x: target.x + random(-60, 60), y: 0 }, target, "#c48cff", { width: 3 });
      burst(target, ARCANE, { count: 22, size: 7, speed: 300 });
    }, ms(300 + index * 150)));
  },
};

// Сфера щита вокруг героя
export function shield(at, color, palette) {
  overlay("vfx-shield", { left: `${at.x}px`, top: `${at.y}px`, borderColor: color, boxShadow: `0 0 24px ${color}, inset 0 0 30px ${color}` }, [
    { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0 },
    { transform: "translate(-50%, -50%) scale(1.05)", opacity: 1, offset: 0.35 },
    { transform: "translate(-50%, -50%) scale(1)", opacity: 0.8, offset: 0.7 },
    { transform: "translate(-50%, -50%) scale(1.15)", opacity: 0 },
  ], 900);
  burst(at, palette, { count: 14, size: 5, speed: 160, shape: "star", life: 700 });
}
