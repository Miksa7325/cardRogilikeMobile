// Экран авторов: лицензии требуют указать, чьи рисунки использует игра.
import { ICON_AUTHORS } from "../../data/credits.js";
import { TEXTS } from "../../data/texts.ru.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

function createLink(text, url) {
  const link = el("a", "credits__link", text);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

export function renderCreditsScreen(root) {
  const { credits } = TEXTS;
  const screen = el("main", "center-screen credits");
  screen.append(el("h1", "event__title", credits.title));

  const sprites = el("section", "credits__block");
  sprites.append(
    el("h2", "credits__heading", credits.spritesTitle),
    el("p", "credits__text", credits.spritesText),
    createLink(credits.spritesLink, "https://github.com/crawl/tiles"),
    createLink(credits.ccZero, "https://creativecommons.org/publicdomain/zero/1.0/"),
  );

  const icons = el("section", "credits__block");
  icons.append(
    el("h2", "credits__heading", credits.iconsTitle),
    el("p", "credits__text", credits.iconsText),
    el("p", "credits__authors", Object.keys(ICON_AUTHORS).join(", ")),
    createLink(credits.iconsLink, "https://game-icons.net"),
    createLink(credits.ccBy, "https://creativecommons.org/licenses/by/3.0/"),
  );

  const back = el("button", "button button--secondary", credits.back);
  back.type = "button";
  back.addEventListener("click", () => showScreen("start"));

  screen.append(sprites, icons, back);
  root.append(screen);
}
