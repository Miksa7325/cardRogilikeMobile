// Страховка от потерянных нажатий. Сразу после быстрого перетаскивания браузер может принять касание
// за остановку инерции и не прислать click. Если палец коснулся кнопки и отпустил её, а click не пришёл,
// выполняем нажатие сами.
const TAPPABLE = "button, .card, .unit";
const MOVE_TOLERANCE_PX = 10; // палец сдвинулся дальше — это перенос, а не нажатие
const HOLD_LIMIT_MS = 400; // палец держали дольше — это удержание, а не нажатие
const WAIT_FOR_CLICK_MS = 60; // столько ждём настоящего click от браузера
const LATE_CLICK_WINDOW_MS = 350; // опоздавший настоящий click в этот промежуток не должен сработать второй раз

export function enableReliableTaps() {
  let press = null;
  let clickSeen = false;
  let ignoreClicksUntil = 0;

  document.addEventListener("pointerdown", (event) => {
    press = {
      target: event.target.closest(TAPPABLE),
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    clickSeen = false;
  }, true);

  document.addEventListener("pointerup", (event) => {
    if (!press?.target) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    const heldFor = performance.now() - press.time;
    const target = press.target;
    press = null;
    if (moved > MOVE_TOLERANCE_PX || heldFor > HOLD_LIMIT_MS) return;

    setTimeout(() => {
      // Экран мог смениться: тогда кнопки уже нет, и нажимать нечего
      if (clickSeen || !target.isConnected || target.disabled) return;
      ignoreClicksUntil = performance.now() + LATE_CLICK_WINDOW_MS;
      target.click();
    }, WAIT_FOR_CLICK_MS);
  }, true);

  document.addEventListener("click", (event) => {
    // click, вызванный кодом выше, браузер помечает как недоверенный: его пропускаем
    if (event.isTrusted && performance.now() < ignoreClicksUntil) {
      ignoreClicksUntil = 0;
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    clickSeen = true;
  }, true);
}
