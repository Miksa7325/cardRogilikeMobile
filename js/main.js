// Точка входа: отсюда запускается вся игра.
import { TEXTS } from "./data/texts.ru.js";

// Находим элементы страницы по их id
const title = document.getElementById("game-title");
const startButton = document.getElementById("start-button");
const startMessage = document.getElementById("start-message");

// Подставляем тексты из общего файла строк
document.title = TEXTS.gameTitle;
title.textContent = TEXTS.gameTitle;
startButton.textContent = TEXTS.startButton;

// Пока боя нет, кнопка только показывает сообщение: так видно, что JavaScript работает
startButton.addEventListener("click", () => {
  startMessage.textContent = TEXTS.startMessage;
});
