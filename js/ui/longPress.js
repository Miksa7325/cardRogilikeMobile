// Удержание пальца на элементе: через 400 мс показывает подробное описание.
const HOLD_MS = 400;

export function addLongPress(element, onHold) {
  let timer = null;
  let held = false;

  const cancel = () => clearTimeout(timer);
  element.addEventListener("pointerdown", () => {
    held = false;
    timer = setTimeout(() => {
      held = true;
      onHold();
    }, HOLD_MS);
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
