// Service worker: хранит файлы игры, чтобы она работала без интернета.
// Сначала пробуем свежий файл из сети, а если сети нет — берём сохранённую копию.
// Поэтому обновления доходят до игрока сами, версию кэша при каждой правке менять не нужно.
const CACHE_NAME = "card-rpg-v1";

// Новый файл игры добавляй и сюда: так он будет доступен офлайн сразу после первого запуска
const FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/main.css",
  "./css/screens.css",
  "./css/cards.css",
  "./assets/images/icon-180.png",
  "./assets/images/icon-192.png",
  "./assets/images/icon-512.png",
  "./js/main.js",
  "./js/config.js",
  "./js/state.js",
  "./js/save.js",
  "./js/engine/combat.js",
  "./js/engine/deck.js",
  "./js/engine/effects.js",
  "./js/engine/events.js",
  "./js/engine/map.js",
  "./js/engine/meta.js",
  "./js/engine/rng.js",
  "./js/engine/run.js",
  "./js/engine/shop.js",
  "./js/data/cardHelpers.js",
  "./js/data/cards.js",
  "./js/data/cardsAssassin.js",
  "./js/data/cardsWarlock.js",
  "./js/data/difficulty.js",
  "./js/data/unlocks.js",
  "./js/data/enemies.js",
  "./js/data/events.js",
  "./js/data/heroes.js",
  "./js/data/potions.js",
  "./js/data/relics.js",
  "./js/data/texts.ru.js",
  "./js/ui/dom.js",
  "./js/ui/router.js",
  "./js/ui/playTime.js",
  "./js/ui/components/card.js",
  "./js/ui/components/cardList.js",
  "./js/ui/components/cardPicker.js",
  "./js/ui/components/hpBar.js",
  "./js/ui/components/runBar.js",
  "./js/ui/components/statusIcons.js",
  "./js/ui/components/tooltip.js",
  "./js/ui/screens/collection.js",
  "./js/ui/screens/combat.js",
  "./js/ui/screens/event.js",
  "./js/ui/screens/heroSelect.js",
  "./js/ui/screens/map.js",
  "./js/ui/screens/rest.js",
  "./js/ui/screens/result.js",
  "./js/ui/screens/reward.js",
  "./js/ui/screens/runStats.js",
  "./js/ui/screens/saveTransfer.js",
  "./js/ui/screens/shop.js",
  "./js/ui/screens/start.js",
  "./js/ui/screens/testSetup.js",
];

// Установка: сохраняем все файлы. allSettled — один недоступный файл не должен сорвать установку
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(FILES.map((file) => cache.add(file)));
    await self.skipWaiting();
  })());
});

// Активация: удаляем кэши старых версий и сразу берём страницу под управление
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") return cache.match("./index.html");
    throw error;
  }
}
