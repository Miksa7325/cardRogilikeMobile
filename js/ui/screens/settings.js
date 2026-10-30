// Экран настроек: громкость, скорость анимаций, вибрация, обучение и сброс прогресса.
import { TEXTS } from "../../data/texts.ru.js";
import { loadMeta, resetProgress, saveMeta } from "../../save.js";
import { playSound } from "../audio.js";
import { showTooltip } from "../components/tooltip.js";
import { el } from "../dom.js";
import { showScreen } from "../router.js";
import { applySettings, isVibrationSupported, vibrate } from "../settings.js";

function createButton(text, modifier, onTap) {
  const button = el("button", `button ${modifier}`, text);
  button.type = "button";
  button.addEventListener("click", onTap);
  return button;
}

function changeSettings(change) {
  const meta = loadMeta();
  change(meta.settings);
  saveMeta(meta);
  applySettings();
}

export function renderSettingsScreen(root) {
  const { settings } = loadMeta();
  const screen = el("main", "center-screen settings");
  screen.append(
    el("h1", "event__title", TEXTS.settings.title),
    createSlider(TEXTS.settings.music, settings.music, (value) => changeSettings((s) => { s.music = value; })),
    createSlider(TEXTS.settings.effects, settings.effects, (value) => {
      changeSettings((s) => { s.effects = value; });
      playSound("card");
    }),
    createToggle(settings.fastAnimations ? TEXTS.settings.speedFast : TEXTS.settings.speedNormal, () => {
      changeSettings((s) => { s.fastAnimations = !s.fastAnimations; });
      showScreen("settings");
    }),
    createVibrationControl(settings),
    createButton(TEXTS.settings.replayTutorial, "button--secondary", () => {
      const meta = loadMeta();
      meta.tutorialDone = false;
      saveMeta(meta);
      showTooltip(TEXTS.settings.tutorialReady);
    }),
    createResetButton(),
    createButton(TEXTS.settings.back, "button--secondary", () => showScreen("start")),
  );
  root.append(screen);
}

function createSlider(label, value, onChange) {
  const wrapper = el("label", "settings__slider");
  const input = el("input", "");
  input.type = "range";
  input.min = "0";
  input.max = "100";
  input.value = String(Math.round(value * 100));
  input.addEventListener("input", () => onChange(Number(input.value) / 100));
  wrapper.append(el("span", "", label), input);
  return wrapper;
}

function createToggle(text, onTap) {
  return createButton(text, "button--secondary settings__toggle", onTap);
}

function createVibrationControl(settings) {
  if (!isVibrationSupported()) return el("p", "picker__empty", TEXTS.settings.vibrationUnsupported);
  return createToggle(settings.vibration ? TEXTS.settings.vibrationOn : TEXTS.settings.vibrationOff, () => {
    changeSettings((s) => { s.vibration = !s.vibration; });
    vibrate(60);
    showScreen("settings");
  });
}

// Сброс необратим, поэтому сначала просим подтвердить вторым нажатием
function createResetButton() {
  let confirmed = false;
  const button = createButton(TEXTS.settings.reset, "button--secondary", () => {
    if (!confirmed) {
      confirmed = true;
      button.textContent = TEXTS.settings.resetConfirm;
      return;
    }
    resetProgress();
    showScreen("start");
    showTooltip(TEXTS.settings.resetDone);
  });
  return button;
}
