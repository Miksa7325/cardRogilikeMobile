// Перетаскивание карты из руки. Карта с целью бросается на врага, остальные — в любое место выше руки.
import { hideTooltip } from "./components/tooltip.js";

const DRAG_THRESHOLD_PX = 8; // меньшее движение пальца считаем обычным нажатием
const GESTURE_END_DELAY_MS = 30; // за это время браузер успевает закончить жест

// options: targetType — на кого нацелена карта; canPlay() — можно ли её сейчас разыграть;
// onBlocked(element) — разыграть нельзя; onDragState(dragging) — перенос начался или закончился;
// onDrop(targetId, ghost) — карту отпустили на цели
export function enableCardDrag(element, { targetType, canPlay, onBlocked, onDragState, onDrop }) {
  let start = null;
  let ghost = null;
  let blocked = false;
  let offset = { x: 0, y: 0 };

  element.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    start = { x: event.clientX, y: event.clientY };
    blocked = false;
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!start) return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (!ghost && !blocked && distance >= DRAG_THRESHOLD_PX) {
      if (canPlay()) beginDrag(event);
      else {
        blocked = true;
        onBlocked(element);
      }
    }
    if (ghost) moveGhost(event);
  });

  element.addEventListener("pointerup", (event) => {
    if (!ghost) {
      start = null;
      return;
    }
    const targetId = findDropTarget(event);
    if (targetId === null) {
      returnGhost();
      return;
    }
    // Розыгрыш перерисует экран и уберёт эту карту. Ждём конца жеста: если убрать элемент раньше,
    // браузер может потерять следующее нажатие игрока
    const dropped = ghost;
    ghost = null;
    endDrag();
    setTimeout(() => onDrop(targetId === "" ? null : targetId, dropped), GESTURE_END_DELAY_MS);
  });

  element.addEventListener("pointercancel", () => {
    if (ghost) returnGhost();
    start = null;
  });

  // После переноса браузер может прислать обычное нажатие: оно уже не нужно
  element.addEventListener("click", (event) => {
    if (element.dataset.justDragged) {
      delete element.dataset.justDragged;
      event.stopImmediatePropagation();
    }
  }, true);

  function beginDrag(event) {
    hideTooltip();
    const rect = element.getBoundingClientRect();
    offset = { x: rect.width / 2, y: rect.height * 0.7 };

    ghost = element.cloneNode(true);
    ghost.classList.remove("tutorial-target", "card--drawn");
    ghost.classList.add("card--ghost");
    ghost.style.width = `${rect.width}px`;
    document.body.append(ghost);

    element.classList.add("card--lifted");
    element.dataset.justDragged = "1";
    onDragState(true);
    highlightTargets(true);
    moveGhost(event);
  }

  function moveGhost(event) {
    ghost.style.transform = `translate(${event.clientX - offset.x}px, ${event.clientY - offset.y}px) rotate(${(event.clientX - start.x) / 40}deg) scale(1.15)`;
    markHoveredTarget(event);
  }

  // Что сейчас под пальцем. Копия карты пропускает нажатия насквозь, поэтому она не мешает
  function findDropTarget(event) {
    const under = document.elementFromPoint(event.clientX, event.clientY);
    if (targetType === "enemy") {
      const unit = under?.closest(".combat__enemies [data-unit-id]");
      return unit ? unit.dataset.unitId : null;
    }
    const hand = document.querySelector(".hand").getBoundingClientRect();
    return event.clientY < hand.top ? "" : null;
  }

  function markHoveredTarget(event) {
    const targetId = findDropTarget(event);
    for (const unit of document.querySelectorAll(".unit--drop-target")) unit.classList.remove("unit--drop-target");
    ghost.classList.toggle("card--ghost-ready", targetId !== null);
    if (targetId) document.querySelector(`[data-unit-id="${targetId}"]`)?.classList.add("unit--drop-target");
  }

  // Цели, куда можно бросить карту, светятся всё время переноса
  function highlightTargets(on) {
    const selector = targetType === "enemy" || targetType === "allEnemies" ? ".combat__enemies .unit" : ".unit--hero";
    for (const unit of document.querySelectorAll(selector)) unit.classList.toggle("unit--targetable", on);
  }

  function endDrag() {
    highlightTargets(false);
    onDragState(false);
    element.classList.remove("card--lifted");
    start = null;
  }

  // Отпустили мимо цели: карта возвращается в руку
  function returnGhost() {
    const dropped = ghost;
    ghost = null;
    endDrag();
    const rect = element.getBoundingClientRect();
    dropped.style.transition = "transform calc(180ms * var(--anim-speed))";
    dropped.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    dropped.addEventListener("transitionend", () => dropped.remove(), { once: true });
    setTimeout(() => dropped.remove(), 400);
  }
}
