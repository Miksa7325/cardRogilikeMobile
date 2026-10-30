// Помощник: создаёт HTML-элемент с классом и текстом одной строкой.
export function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
