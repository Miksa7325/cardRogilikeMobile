// Точка входа: отсюда запускается вся игра.
import { ENEMIES } from "./data/enemies.js";
import { HEROES } from "./data/heroes.js";
import { TEXTS } from "./data/texts.ru.js";
import { requestPersistentStorage } from "./save.js";
import { preloadSprites } from "./ui/art.js";
import { playSound, unlockAudio } from "./ui/audio.js";
import { enableReliableTaps } from "./ui/reliableTap.js";
import { registerScreen, showScreen } from "./ui/router.js";
import { createScene } from "./ui/scene.js";
import { renderCollectionScreen } from "./ui/screens/collection.js";
import { renderCreditsScreen } from "./ui/screens/credits.js";
import { renderCombatScreen } from "./ui/screens/combat.js";
import { renderEventScreen } from "./ui/screens/event.js";
import { renderHeroSelectScreen } from "./ui/screens/heroSelect.js";
import { renderMapScreen } from "./ui/screens/map.js";
import { renderRestScreen, renderRestUpgradeScreen } from "./ui/screens/rest.js";
import { renderResultScreen } from "./ui/screens/result.js";
import { renderRewardScreen } from "./ui/screens/reward.js";
import { renderSaveTransferScreen } from "./ui/screens/saveTransfer.js";
import { renderSettingsScreen } from "./ui/screens/settings.js";
import { renderShopScreen } from "./ui/screens/shop.js";
import { renderStartScreen } from "./ui/screens/start.js";
import { renderTestSetupScreen } from "./ui/screens/testSetup.js";
import { applySettings } from "./ui/settings.js";

document.title = TEXTS.gameTitle;

// Сообщаем роутеру, какие экраны есть в игре
registerScreen("start", renderStartScreen);
registerScreen("heroSelect", renderHeroSelectScreen);
registerScreen("collection", renderCollectionScreen);
registerScreen("credits", renderCreditsScreen);
registerScreen("map", renderMapScreen);
registerScreen("combat", renderCombatScreen);
registerScreen("reward", renderRewardScreen);
registerScreen("rest", renderRestScreen);
registerScreen("restUpgrade", renderRestUpgradeScreen);
registerScreen("shop", renderShopScreen);
registerScreen("event", renderEventScreen);
registerScreen("result", renderResultScreen);
registerScreen("saveTransfer", renderSaveTransferScreen);
registerScreen("settings", renderSettingsScreen);
registerScreen("testSetup", renderTestSetupScreen);

enableReliableTaps();
applySettings();
createScene();
preloadSprites(Object.keys(ENEMIES), Object.keys(HEROES));
showScreen("start");

requestPersistentStorage();

// Браузер разрешает звук только после нажатия. Каждая кнопка заодно тихо щёлкает
document.addEventListener("pointerdown", unlockAudio);
document.addEventListener("click", (event) => {
  if (event.target.closest("button")) playSound("click");
});

// Service worker даёт игру без интернета. Работает только по HTTPS или на localhost
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
