// Экран переноса сохранения: экспорт и импорт текстом.
// Браузер может очистить данные сайта, а текст останется у игрока.
import { TEXTS } from "../../data/texts.ru.js";
import { exportSave, importSave, loadRun } from "../../save.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

export function renderSaveTransferScreen(root) {
  const screen = el("main", "center-screen save-transfer");
  screen.append(el("h1", "event__title", TEXTS.saveTransfer.title));
  appendExport(screen);
  appendImport(screen);
  screen.append(createButton(TEXTS.saveTransfer.back, "button--secondary", () => showScreen("start")));
  root.append(screen);
}

function appendExport(screen) {
  const code = exportSave();
  if (!code) {
    screen.append(el("p", "reward__line", TEXTS.saveTransfer.nothingToExport));
    return;
  }

  const output = el("textarea", "save-transfer__text");
  output.readOnly = true;
  output.value = code;
  screen.append(
    el("p", "reward__line", TEXTS.saveTransfer.exportTitle),
    output,
    createButton(TEXTS.saveTransfer.copy, "", () => copyText(output)),
  );
}

// Быстрый способ копирования работает только по HTTPS, поэтому есть запасной
async function copyText(textarea) {
  try {
    await navigator.clipboard.writeText(textarea.value);
    showTooltip(TEXTS.saveTransfer.copied);
  } catch {
    textarea.select();
    const copied = document.execCommand("copy");
    showTooltip(copied ? TEXTS.saveTransfer.copied : TEXTS.saveTransfer.copyFailed);
  }
}

function appendImport(screen) {
  const input = el("textarea", "save-transfer__text");
  let confirmed = false;

  const button = createButton(TEXTS.saveTransfer.importButton, "", () => {
    if (!input.value.trim()) return;
    // Загрузка заменит текущий забег, поэтому сначала просим подтвердить
    if (loadRun() && !confirmed) {
      confirmed = true;
      button.textContent = TEXTS.saveTransfer.confirmImport;
      return;
    }
    const result = importSave(input.value);
    if (result.ok) {
      showScreen("start");
      showTooltip(TEXTS.saveTransfer.imported);
    } else {
      showTooltip(TEXTS.saveTransfer[result.reason]);
    }
  });

  screen.append(el("p", "reward__line", TEXTS.saveTransfer.importTitle), input, button);
}
