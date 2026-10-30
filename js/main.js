// Точка входа: отсюда запускается вся игра.
import { TEXTS } from "./data/texts.ru.js";
import { registerScreen, showScreen } from "./ui/router.js";
import { renderCombatScreen } from "./ui/screens/combat.js";
import { renderResultScreen } from "./ui/screens/result.js";
import { renderStartScreen } from "./ui/screens/start.js";
import { renderTestSetupScreen } from "./ui/screens/testSetup.js";

document.title = TEXTS.gameTitle;

// Сообщаем роутеру, какие экраны есть в игре
registerScreen("start", renderStartScreen);
registerScreen("combat", renderCombatScreen);
registerScreen("result", renderResultScreen);
registerScreen("testSetup", renderTestSetupScreen);

showScreen("start");
