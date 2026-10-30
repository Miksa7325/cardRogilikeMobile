// Анимации боя. Логика считает всё мгновенно и записывает события в combat.events,
// а этот файл проигрывает их: удары врагов, вылетающие числа урона, изменение HP.
import { TEXTS } from "../data/texts.ru.js";
import { ATTACK_STYLES } from "./art.js";
import { playSound } from "./audio.js";
import { STATUS_ICONS } from "./components/statusIcons.js";
import { hideTooltip } from "./components/tooltip.js";
import { el } from "./dom.js";
import { animationMs, vibrate } from "./settings.js";

const STRIKE_MS = 340; // длительность выпада врага
const HIT_MOMENT = 0.55; // в какой момент выпада удар достигает цели
const PROJECTILE_MS = 240; // полёт снаряда мага
const CAST_MS = 380; // усиление, блок или ослабление
const PAUSE_BETWEEN_ENEMIES_MS = 130;
const PLAYER_HIT_STAGGER_MS = 110; // удары одной карты идут друг за другом

// Пока идёт ход врагов, игрок может нажать на экран, чтобы досмотреть быстрее
let skipping = false;

// Обычные анимации подчиняются настройке скорости. Пропуск сводит паузы почти к нулю
function scaled(ms) {
  return skipping ? 0 : animationMs(ms / 300);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, scaled(ms)));
}

function animate(element, frames, ms, easing = "ease-in-out") {
  if (!element) return Promise.resolve();
  const animation = element.animate(frames, { duration: Math.max(1, scaled(ms)), easing });
  // Если элемент уже убрали с экрана, анимация отменяется: это не ошибка
  return animation.finished.catch(() => {});
}

function allUnits(combat) {
  return [
    { id: "hero", unit: combat.hero },
    ...combat.enemies.map((enemy) => ({ id: enemy.instanceId, unit: enemy })),
  ];
}

function findUnit(id) {
  return document.querySelector(`[data-unit-id="${id}"]`);
}

function portraitOf(id) {
  return findUnit(id)?.querySelector(".unit__portrait") ?? null;
}

function centerOf(rect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Запоминает состояние боя и положение бойцов на экране перед действием
export function captureCombatView(combat) {
  const units = {};
  for (const { id, unit } of allUnits(combat)) {
    const element = findUnit(id);
    units[id] = {
      hp: unit.hp,
      block: unit.block,
      maxHp: unit.maxHp,
      rect: element?.getBoundingClientRect() ?? null,
      portraitRect: element?.querySelector(".unit__portrait")?.getBoundingClientRect() ?? null,
      clone: element?.cloneNode(true) ?? null,
    };
  }
  return { units, handUids: combat.piles.hand.map((card) => card.uid) };
}

// Показывает результат карты или зелья: экран уже нарисован заново, остаются числа и удары
export function playCombatFeedback(before, combat, { heroAttacked = false } = {}) {
  for (const { id, unit } of allUnits(combat)) {
    const previous = before.units[id];
    const element = findUnit(id);
    if (element && previous) animateHpBar(element, previous);
    if (previous && id !== "hero" && unit.hp <= 0 && previous.hp > 0) showDyingEnemy(previous);
  }
  if (heroAttacked) {
    animate(portraitOf("hero"), [
      { transform: "none" },
      { transform: "translate(14px, -20px) scale(1.15) rotate(6deg)", offset: 0.4 },
      { transform: "none" },
    ], 280);
  }

  // Каждый удар многоударной карты получает своё число
  let hitIndex = 0;
  for (const event of combat.events) {
    const delay = event.type === "hit" ? animationMs((hitIndex * PLAYER_HIT_STAGGER_MS) / 300) : 0;
    if (event.type === "hit") hitIndex += 1;
    setTimeout(() => showEvent(event, before), delay);
  }
  showDrawnCards(before.handUids, combat);
}

// Ход врагов: экран пока показывает старое состояние, и события меняют его шаг за шагом.
// Когда всё проиграно, вызывающий код рисует экран заново уже с новым ходом
export async function playEnemyTurn(before, combat) {
  skipping = false;
  hideTooltip();
  document.querySelector(".tutorial")?.remove();
  document.querySelector(".combat__hint").textContent = TEXTS.enemyTurn;
  discardHandView();

  const blocker = el("div", "input-blocker");
  blocker.addEventListener("pointerdown", () => {
    skipping = true;
  });
  document.getElementById("app").append(blocker);

  for (const event of combat.events) {
    if (event.type === "enemyAction") {
      await wait(PAUSE_BETWEEN_ENEMIES_MS);
      if (event.intent !== "attack") await castAnimation(event.enemyId);
    } else if (event.type === "hit" && event.sourceId !== "hero") {
      await strike(event, before);
    } else {
      showEvent(event, before);
      if (event.type === "poison" || event.type === "hpLoss") await wait(200);
    }
  }
  await wait(PAUSE_BETWEEN_ENEMIES_MS);
  blocker.remove();
  skipping = false;
}

// Рука уходит в сброс сразу, как только ход закончен
function discardHandView() {
  for (const card of document.querySelectorAll(".hand .card")) {
    animate(card, [
      { translate: "0 0", opacity: 1 },
      { translate: "60px 60px", opacity: 0 },
    ], 220, "ease-in").then(() => {
      card.style.visibility = "hidden";
    });
  }
}

function castAnimation(enemyId) {
  return animate(portraitOf(enemyId), [
    { transform: "none", filter: "none" },
    { transform: "translateY(-8px) scale(1.12)", filter: "brightness(1.8) drop-shadow(0 0 12px #c77dff)", offset: 0.5 },
    { transform: "none", filter: "none" },
  ], CAST_MS);
}

// Один удар врага. Боец нападает по-своему, а результат виден в момент попадания
async function strike(event, before) {
  const attacker = before.units[event.sourceId];
  const target = before.units[event.targetId];
  const portrait = portraitOf(event.sourceId);
  if (!attacker?.portraitRect || !target?.portraitRect || !portrait) {
    showEvent(event, before);
    return;
  }

  const enemyId = event.sourceId.slice(0, event.sourceId.lastIndexOf("-"));
  const style = ATTACK_STYLES[enemyId] ?? { kind: "slash" };
  if (style.kind === "magic") {
    await castProjectile(portrait, attacker, target, style.color);
    showHit(event, before, "burst");
  } else {
    const from = centerOf(attacker.portraitRect);
    const to = centerOf(target.portraitRect);
    const dx = (to.x - from.x) * 0.72;
    const dy = (to.y - from.y) * 0.72;
    const motion = animate(portrait, [
      { transform: "none" },
      { transform: `translate(${-dx * 0.08}px, ${-dy * 0.1}px) scale(0.94)`, offset: 0.3 },
      { transform: `translate(${dx}px, ${dy}px) scale(1.18)`, offset: HIT_MOMENT },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5}px) scale(1.05)`, offset: 0.75 },
      { transform: "none" },
    ], STRIKE_MS);
    await wait(STRIKE_MS * HIT_MOMENT);
    showHit(event, before, style.kind);
    await motion;
  }
}

// Маг откидывается назад, а снаряд летит к цели
async function castProjectile(portrait, attacker, target, color) {
  animate(portrait, [
    { transform: "none", filter: "none" },
    { transform: "translateY(4px) scale(1.08)", filter: `brightness(1.7) drop-shadow(0 0 10px ${color})`, offset: 0.4 },
    { transform: "none", filter: "none" },
  ], PROJECTILE_MS + 80);

  const from = centerOf(attacker.portraitRect);
  const to = centerOf(target.portraitRect);
  const projectile = el("div", "projectile");
  projectile.style.setProperty("--projectile-color", color);
  projectile.style.left = `${from.x}px`;
  projectile.style.top = `${from.y}px`;
  document.body.append(projectile);
  await animate(projectile, [
    { transform: "translate(-50%, -50%) scale(0.5)" },
    { transform: `translate(calc(-50% + ${to.x - from.x}px), calc(-50% + ${to.y - from.y}px)) scale(1.2)` },
  ], PROJECTILE_MS, "ease-in");
  projectile.remove();
}

// Проигрывает одно событие без движения атакующего: числа, вспышки, полоску HP
function showEvent(event, before) {
  const target = before.units[event.targetId];
  if (!target?.rect) return;

  if (event.type === "hit") {
    showHit(event, before, "slash");
  } else if (event.type === "block") {
    showNumber(target.rect, `🛡️+${event.amount}`, "number--block");
    updateUnitView(event, before);
    animate(portraitOf(event.targetId), [
      { transform: "none", filter: "none" },
      { transform: "scale(1.1)", filter: "brightness(1.4) drop-shadow(0 0 10px #6db2ff)", offset: 0.4 },
      { transform: "none", filter: "none" },
    ], 300);
    playSound("block");
  } else if (event.type === "heal") {
    if (event.amount <= 0) return;
    showNumber(target.rect, `+${event.amount}`, "number--heal");
    updateUnitView(event, before);
    playSound("heal");
  } else if (event.type === "poison" || event.type === "hpLoss") {
    showNumber(target.rect, `-${event.amount}`, event.type === "poison" ? "number--poison" : "number--damage", event.amount);
    updateUnitView(event, before);
    markDeadEnemy(event, target);
  } else if (event.type === "status") {
    showNumber(target.rect, `${STATUS_ICONS[event.status]}+${event.amount}`, "number--status");
  }
}

// Удар достиг цели: след удара, числа, тряска и новое HP
function showHit(event, before, impactKind) {
  const target = before.units[event.targetId];
  if (!target?.rect) return;

  showImpact(target.portraitRect ?? target.rect, impactKind);
  if (event.hpLost > 0) showNumber(target.rect, `-${event.hpLost}`, "number--damage", event.hpLost);
  if (event.blocked > 0) showNumber(target.rect, `🛡️${event.blocked}`, "number--blocked");

  updateUnitView(event, before);
  animate(portraitOf(event.targetId), [
    { transform: "none", filter: "none" },
    { transform: "translateX(-8px) rotate(-7deg)", filter: "brightness(2.4) saturate(0.2)", offset: 0.15 },
    { transform: "translateX(6px) rotate(4deg)", filter: "brightness(1.3)", offset: 0.45 },
    { transform: "none", filter: "none" },
  ], 300);

  playSound(event.hpLost > 0 ? "hit" : "block");
  if (event.targetId === "hero" && event.hpLost > 0) {
    vibrate(60);
    animate(document.querySelector(".combat"), [
      { transform: "none" },
      { transform: "translate(-5px, 3px)", offset: 0.2 },
      { transform: "translate(5px, -3px)", offset: 0.45 },
      { transform: "translate(-3px, 1px)", offset: 0.7 },
      { transform: "none" },
    ], 240);
  }
  markDeadEnemy(event, target);
}

// Яд убил врага в его ход: на его месте растворяется копия
function markDeadEnemy(event, target) {
  if (event.targetId === "hero" || event.hp > 0) return;
  const element = findUnit(event.targetId);
  if (!element || element.style.visibility === "hidden") return;
  element.style.visibility = "hidden";
  showDyingEnemy(target);
}

// Меняет HP и блок на ещё не перерисованном экране
function updateUnitView(event, before) {
  const target = before.units[event.targetId];
  const element = findUnit(event.targetId);
  if (!element || !target) return;

  element.querySelector(".hp-bar__fill").style.width = `${(event.hp / target.maxHp) * 100}%`;
  const blockText = event.block > 0 ? ` 🛡️${event.block}` : "";
  element.querySelector(".hp-bar__label").textContent = `${event.hp}/${target.maxHp}${blockText}`;
  element.querySelector(".hp-bar").classList.toggle("hp-bar--blocked", event.block > 0);
  if (event.targetId === "hero") {
    const barHp = document.querySelector(".bar-hp");
    if (barHp) barHp.textContent = `❤️ ${event.hp}/${target.maxHp}`;
  }
}

// Вылетающее число: чем больше урон, тем оно крупнее. Разлетаются в разные стороны, чтобы не слипаться
function showNumber(rect, text, className, value = 0) {
  const label = el("div", `number ${className}`, text);
  const { x } = centerOf(rect);
  label.style.left = `${x + (Math.random() - 0.5) * rect.width * 0.35}px`;
  label.style.top = `${rect.top + rect.height * 0.3}px`;
  label.style.setProperty("--fly-x", `${(Math.random() - 0.5) * 70}px`);
  if (value > 0) label.style.fontSize = `${Math.min(46, 24 + value * 0.8)}px`;
  label.addEventListener("animationend", () => label.remove());
  document.body.append(label);
}

// След удара поверх цели: рубящий, рваный от когтей или вспышка магии
function showImpact(rect, kind) {
  const impact = el("div", `impact impact--${kind}`);
  const { x, y } = centerOf(rect);
  impact.style.left = `${x}px`;
  impact.style.top = `${y}px`;
  impact.style.rotate = `${-55 + Math.random() * 40}deg`;
  impact.addEventListener("animationend", () => impact.remove());
  document.body.append(impact);
}

// Полоска HP плавно едет от старого значения к новому
function animateHpBar(element, previous) {
  const fill = element.querySelector(".hp-bar__fill");
  if (!fill) return;
  const target = fill.style.width;
  fill.style.transition = "none";
  fill.style.width = `${(previous.hp / previous.maxHp) * 100}%`;
  fill.getBoundingClientRect(); // браузер должен применить старую ширину до начала анимации
  fill.style.transition = "";
  fill.style.width = target;
}

// Убитый враг уже исчез из боя, поэтому на его месте растворяется копия
function showDyingEnemy(previous) {
  if (!previous.clone || !previous.rect) return;
  const ghost = previous.clone.cloneNode(true);
  ghost.classList.add("unit--dying");
  ghost.classList.remove("unit--targetable", "unit--drop-target", "tutorial-target");
  ghost.style.visibility = "";
  ghost.style.left = `${previous.rect.left}px`;
  ghost.style.top = `${previous.rect.top}px`;
  ghost.style.width = `${previous.rect.width}px`;
  ghost.addEventListener("animationend", () => ghost.remove());
  document.body.append(ghost);
}

// Новые карты в руке появляются по очереди
export function showDrawnCards(previousUids, combat) {
  const cards = document.querySelectorAll(".hand .card");
  let order = 0;
  combat.piles.hand.forEach((card, index) => {
    if (previousUids.includes(card.uid)) return;
    const element = cards[index];
    if (!element) return;
    element.classList.add("card--drawn");
    element.style.animationDelay = `calc(${order} * 50ms * var(--anim-speed, 1))`;
    element.addEventListener("animationend", () => {
      element.classList.remove("card--drawn");
      element.style.animationDelay = "";
    }, { once: true });
    order += 1;
  });
}

// Брошенная карта вспыхивает и растворяется там, где её отпустили
export function flyCardAway(ghost) {
  ghost.classList.remove("card--ghost-ready");
  ghost.classList.add("card--played");
  ghost.addEventListener("animationend", () => ghost.remove());
  // Запасной вариант: если анимации отключены, копия всё равно должна исчезнуть
  setTimeout(() => ghost.remove(), 800);
  playSound("card");
}
