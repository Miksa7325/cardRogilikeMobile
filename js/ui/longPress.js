// Удержание пальца на элементе: через 400 мс показывает подробное описание.
const HOLD_MS = 400;
const MOVE_TOLERANCE_PX = 8; // палец сдвинулся дальше — это уже не удержание, а перенос

export function addLongPress(element, onHold) {
  let timer = null;
  let held = false;
  let start = null;

  const cancel = () => clearTimeout(timer);
  element.addEventListener("pointerdown", (event) => {
    held = false;
    start = { x: event.clientX, y: event.clientY };
    timer = setTimeout(() => {
      held = true;
      onHold();
    }, HOLD_MS);
  });
  element.addEventListener("pointermove", (event) => {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) >= MOVE_TOLERANCE_PX) cancel();
  });
  element.addEventListener("pointerup", cancel);
  element.addEventListener("pointerleave", cancel);
  element.addEventListener("pointercancel", cancel);

  // После удержания палец отпускают: это не должно считаться обычным нажатием
  element.addEventListener("click", (event) => {
    if (held) {
      event.stopImmediatePropagation();
      held = false;
    }
  }, true);

  // Браузер на телефоне не должен открывать своё меню при удержании
  element.addEventListener("contextmenu", (event) => event.preventDefault());
}
