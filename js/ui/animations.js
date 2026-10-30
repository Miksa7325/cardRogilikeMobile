// Анимации боя. Экран боя рисуется заново после каждого действия, поэтому мы запоминаем,
// как он выглядел до действия, и показываем разницу: числа урона, тряску, плавную полоску HP.
import { playSound } from "./audio.js";
import { el } from "./dom.js";
import { vibrate } from "./settings.js";

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
  return { units, handUids: combat.piles.hand.map((card) => card.uid) };
}

// Показывает, что изменилось после действия. attackers — кто бил (подрагивание врагов в их ход)
export function playCombatFeedback(before, combat, { enemyTurn = false } = {}) {
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
      gainedBlock = true;
    }
    if (element) animateHpBar(element, previous);
    if (id !== "hero" && unit.hp <= 0 && previous.hp > 0) showDyingEnemy(previous);
    if (enemyTurn && id !== "hero" && unit.hp > 0) element?.classList.add("unit--attacking");
  }

  showDrawnCards(before.handUids, combat);

  if (dealtDamage || tookDamage) playSound("hit");
  if (gainedBlock) playSound("block");
  if (healed) playSound("heal");
  if (tookDamage) vibrate(60);
}

function showFloatingText(rect, text, className) {
  const label = el("div", `float-text ${className}`, text);
  label.style.left = `${rect.left + rect.width / 2}px`;
  label.style.top = `${rect.top + rect.height / 3}px`;
  label.addEventListener("animationend", () => label.remove());
  document.body.append(label);
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
  ghost.classList.remove("unit--targetable");
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

// Разыгранная карта улетает вверх и растворяется. Вызывается до перерисовки экрана
export function flyCardAway(element) {
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const clone = element.cloneNode(true);
  clone.classList.remove("card--selected", "card--drawn", "tutorial-target");
  clone.classList.add("card--flying");
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.addEventListener("animationend", () => clone.remove());
  document.body.append(clone);
  playSound("card");
}
