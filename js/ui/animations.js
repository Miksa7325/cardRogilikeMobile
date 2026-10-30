// Анимации боя. Экран боя рисуется заново после каждого действия, поэтому мы запоминаем,
// как он выглядел до действия, и показываем разницу: удары, числа урона, плавную полоску HP.
import { getEnemyIntent } from "../engine/combat.js";
import { playSound } from "./audio.js";
import { el } from "./dom.js";
import { vibrate } from "./settings.js";

const ENEMY_STAGGER_MS = 140; // враги бьют не одновременно, а друг за другом

function allUnits(combat) {
  return [
    { id: "hero", unit: combat.hero },
    ...combat.enemies.map((enemy) => ({ id: enemy.instanceId, unit: enemy })),
  ];
}

function findUnitElement(id) {
  return document.querySelector(`[data-unit-id="${id}"]`);
}

// Запоминает состояние боя и положение бойцов на экране перед действием
export function captureCombatView(combat) {
  const units = {};
  for (const { id, unit } of allUnits(combat)) {
    const element = findUnitElement(id);
    units[id] = {
      hp: unit.hp,
      block: unit.block,
      maxHp: unit.maxHp,
      rect: element?.getBoundingClientRect() ?? null,
      clone: element?.cloneNode(true) ?? null,
    };
  }
  // Запоминаем намерения: после хода врага они уже сменятся на следующие
  const intents = {};
  for (const enemy of combat.enemies) {
    if (enemy.hp > 0) intents[enemy.instanceId] = getEnemyIntent(combat, enemy).intent;
  }
  return { units, intents, handUids: combat.piles.hand.map((card) => card.uid) };
}

// Показывает, что изменилось после действия.
// enemyTurn: ходили враги. heroAttacked: герой разыграл атаку и должен сделать выпад
export function playCombatFeedback(before, combat, { enemyTurn = false, heroAttacked = false } = {}) {
  let tookDamage = false;
  let dealtDamage = false;
  let gainedBlock = false;
  let healed = false;

  for (const { id, unit } of allUnits(combat)) {
    const previous = before.units[id];
    if (!previous || !previous.rect) continue;

    const hpChange = unit.hp - previous.hp;
    const blockChange = unit.block - previous.block;
    const element = findUnitElement(id);

    if (hpChange < 0) {
      showFloatingText(previous.rect, String(hpChange), "float-text--damage");
      showSlash(previous.rect);
      if (id === "hero") tookDamage = true;
      else dealtDamage = true;
      element?.classList.add("unit--hit");
    }
    if (hpChange > 0) {
      showFloatingText(previous.rect, `+${hpChange}`, "float-text--heal");
      healed = true;
    }
    if (blockChange > 0) {
      showFloatingText(previous.rect, `🛡️+${blockChange}`, "float-text--block");
      element?.classList.add("unit--blocking");
      gainedBlock = true;
    }
    if (element) animateHpBar(element, previous);
    if (id !== "hero" && unit.hp <= 0 && previous.hp > 0) showDyingEnemy(previous);
  }

  if (enemyTurn) playEnemyActions(before, combat);
  if (heroAttacked) findUnitElement("hero")?.classList.add("unit--lunge");
  if (tookDamage) document.querySelector(".combat")?.classList.add("combat--shake");

  showDrawnCards(before.handUids, combat);

  if (dealtDamage || tookDamage) playSound("hit");
  if (gainedBlock) playSound("block");
  if (healed) playSound("heal");
  if (tookDamage) vibrate(60);
}

// Атакующий враг бросается вперёд, остальные колдуют на месте. Каждый в свою очередь
function playEnemyActions(before, combat) {
  let order = 0;
  for (const enemy of combat.enemies) {
    const element = findUnitElement(enemy.instanceId);
    const intent = before.intents[enemy.instanceId];
    if (!element || enemy.hp <= 0 || !intent) continue;
    element.classList.add(intent === "attack" ? "unit--attacking" : "unit--casting");
    element.style.setProperty("--action-delay", `calc(${order * ENEMY_STAGGER_MS}ms * var(--anim-speed))`);
    order += 1;
  }
}

function showFloatingText(rect, text, className) {
  const label = el("div", `float-text ${className}`, text);
  label.style.left = `${rect.left + rect.width / 2}px`;
  label.style.top = `${rect.top + rect.height / 3}px`;
  label.addEventListener("animationend", () => label.remove());
  document.body.append(label);
}

// След удара поверх цели
function showSlash(rect) {
  const slash = el("div", "slash");
  slash.style.left = `${rect.left + rect.width / 2}px`;
  slash.style.top = `${rect.top + rect.height / 2}px`;
  slash.addEventListener("animationend", () => slash.remove());
  document.body.append(slash);
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
  if (!previous.clone) return;
  const ghost = previous.clone;
  ghost.classList.add("unit--dying");
  ghost.classList.remove("unit--targetable", "unit--drop-target");
  ghost.style.left = `${previous.rect.left}px`;
  ghost.style.top = `${previous.rect.top}px`;
  ghost.style.width = `${previous.rect.width}px`;
  ghost.addEventListener("animationend", () => ghost.remove());
  document.body.append(ghost);
}

// Новые карты в руке появляются по очереди
function showDrawnCards(previousUids, combat) {
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
