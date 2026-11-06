// Страховка от потерянных нажатий. Сразу после быстрого перетаскивания браузер может принять касание
// за остановку инерции и не прислать click. Если палец коснулся кнопки и отпустил её, а click не пришёл,
// выполняем нажатие сами.
const TAPPABLE = "button, .card, .unit";
const MOVE_TOLERANCE_PX = 10; // палец сдвинулся дальше — это перенос, а не нажатие
const HOLD_LIMIT_MS = 400; // палец держали дольше — это удержание, а не нажатие
const WAIT_FOR_CLICK_MS = 60; // столько ждём настоящего click от браузера
const SCROLL_PAUSE_MS = 300; // только что листали: касание останавливает прокрутку, это не нажатие

export function enableReliableTaps() {
  let press = null;
  let clickSeen = false;
  // Кнопка, за которую мы уже нажали сами: опоздавший настоящий click по ней не должен сработать второй раз.
  // Ждём его не по таймеру, а до следующего касания: на медленном телефоне click может опоздать надолго,
  // и тогда покупка или «Конец хода» сработали бы дважды
  let pressedForBrowser = null;
  let lastScrollTime = -Infinity;

  document.addEventListener("scroll", () => {
    lastScrollTime = performance.now();
  }, { capture: true, passive: true });

  document.addEventListener("pointerdown", (event) => {
    press = {
      target: event.target.closest(TAPPABLE),
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
    clickSeen = false;
    pressedForBrowser = null;
  }, true);

  document.addEventListener("pointerup", (event) => {
    if (!press?.target) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    const heldFor = performance.now() - press.time;
    const target = press.target;
    press = null;
    if (moved > MOVE_TOLERANCE_PX || heldFor > HOLD_LIMIT_MS) return;
    if (performance.now() - lastScrollTime < SCROLL_PAUSE_MS) return;

    setTimeout(() => {
      // Экран мог смениться: тогда кнопки уже нет, и нажимать нечего
      if (clickSeen || !target.isConnected || target.disabled) return;
      pressedForBrowser = target;
      target.click();
    }, WAIT_FOR_CLICK_MS);
  }, true);

  document.addEventListener("click", (event) => {
    // click, вызванный кодом выше, браузер помечает как недоверенный: его пропускаем
    if (event.isTrusted && pressedForBrowser) {
      pressedForBrowser = null;
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    clickSeen = true;
  }, true);
}
