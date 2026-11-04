// Объём карт: карта вне руки и большая карта наклоняются к пальцу или мыши, а блик глянца бежит следом.
// Карты в руке не трогаем: их перетаскивают, и наклон мешал бы попасть по врагу.
const TILTABLE = ".card-row .card, .card--large";
const MAX_TILT = 12; // градусов

let tilted = null;

function reset(card) {
  card.style.removeProperty("--tilt-x");
  card.style.removeProperty("--tilt-y");
  card.style.removeProperty("--glare-x");
  card.style.removeProperty("--glare-y");
}

function onMove(event) {
  const card = event.target.closest?.(TILTABLE);
  if (tilted && tilted !== card) reset(tilted);
  tilted = card;
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
  card.style.setProperty("--tilt-x", `${((0.5 - y) * MAX_TILT * 2).toFixed(1)}deg`);
  card.style.setProperty("--tilt-y", `${((x - 0.5) * MAX_TILT * 2).toFixed(1)}deg`);
  card.style.setProperty("--glare-x", `${Math.round(x * 100)}%`);
  card.style.setProperty("--glare-y", `${Math.round(y * 100)}%`);
}

function onLeave() {
  if (tilted) reset(tilted);
  tilted = null;
}

export function enableCardTilt() {
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerup", onLeave, { passive: true });
  document.addEventListener("pointercancel", onLeave, { passive: true });
  document.addEventListener("pointerleave", onLeave, { passive: true });
}
