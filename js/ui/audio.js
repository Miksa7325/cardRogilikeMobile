// Звук и музыка. Короткие звуки — записи из assets/sounds/sfx, музыка — петли из assets/sounds/music.
// Все записи — CC0 с OpenGameArt, авторы перечислены на экране «Авторы».
// Браузеры запрещают автозапуск звука, поэтому звук включается только после первого нажатия.
let context = null;
let musicGain = null;
let effectsGain = null;
let volumes = { music: 0.5, effects: 0.8 };

// Сколько вариантов у звука: каждый раз играет случайный, чтобы удары не звучали одинаково.
// Файлы называются имя-1.mp3, имя-2.mp3…; у джинглов вариант один и номера нет
const SOUND_VARIANTS = {
  click: 2, error: 2, swing: 3, skill: 3, power: 2, hit: 4, claw: 3, magicCast: 2, magicHit: 2,
  block: 3, shield: 2, heal: 2, poison: 3, death: 2, enemyCast: 3, draw: 2, potion: 2, buy: 3,
  gem: 2, cardPick: 2, step: 2, chest: 2, door: 2, stone: 2, victory: 0, defeat: 0,
};

// Громкость отдельных звуков относительно остальных: щелчки и шаги звучат часто, поэтому тише
const SOUND_GAIN = { click: 0.45, step: 0.6, draw: 0.7, skill: 0.8, victory: 1.1, defeat: 1.1 };

// Звуки, которым не меняем высоту: у мелодий и щелчков она должна быть одинаковой
const FIXED_PITCH = ["victory", "defeat", "click"];

// Музыка по настроению экрана. silence — тишина, например пока играет джингл победы
const MUSIC_MOODS = ["menu", "town", "dungeon", "combat", "boss"];
const CROSSFADE_SECONDS = 1.2;

const buffers = {}; // имя звука → массив AudioBuffer
const lastVariant = {};
const lastPlayedAt = {};
const musicUrls = {}; // настроение → blob: URL сжатого файла
let mood = "menu";
let music = null; // { mood, element, gain }
let musicRequest = 0;

// Вызывается на каждом нажатии: первое включает звук, остальные возобновляют его, если браузер его приостановил
export function unlockAudio() {
  if (context) {
    if (context.state !== "running") context.resume();
    // Если браузер не дал запустить музыку без нажатия, запускаем её сейчас
    if (music?.element.paused && !document.hidden) music.element.play().catch(() => {});
    return;
  }
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;

  context = new AudioContextClass();
  musicGain = context.createGain();
  effectsGain = context.createGain();
  musicGain.connect(context.destination);
  effectsGain.connect(context.destination);
  applyVolumes();
  loadSounds();
  switchMusic(mood);

  // Свернули игру — звук молчит и не тратит батарею
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      context.suspend();
      music?.element.pause();
    } else {
      context.resume();
      music?.element.play().catch(() => {});
    }
  });
}

function applyVolumes() {
  if (!context) return;
  musicGain.gain.value = volumes.music * 0.55;
  effectsGain.gain.value = volumes.effects * 0.9;
}

export function setVolumes(musicVolume, effectsVolume) {
  volumes = { music: musicVolume, effects: effectsVolume };
  applyVolumes();
}

// Загружает все короткие звуки. Они маленькие, поэтому хранятся уже раскодированными и играют без задержки
function loadSounds() {
  for (const [name, count] of Object.entries(SOUND_VARIANTS)) {
    const files = count === 0 ? [`${name}.mp3`] : Array.from({ length: count }, (_, index) => `${name}-${index + 1}.mp3`);
    buffers[name] = [];
    for (const file of files) {
      fetch(`assets/sounds/sfx/${file}`)
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => buffers[name].push(buffer))
        .catch(() => {});
    }
  }
}

export function playSound(name) {
  if (!context || context.state !== "running" || volumes.effects === 0) return;
  const variants = buffers[name];
  if (!variants?.length) return;
  // Один и тот же звук не чаще раза в 40 мс: многоударная карта не должна сливаться в треск
  const now = context.currentTime;
  if (now - (lastPlayedAt[name] ?? -1) < 0.04) return;
  lastPlayedAt[name] = now;

  // Случайный вариант, но не тот же, что в прошлый раз
  let index = Math.floor(Math.random() * variants.length);
  if (variants.length > 1 && index === lastVariant[name]) index = (index + 1) % variants.length;
  lastVariant[name] = index;

  const source = context.createBufferSource();
  source.buffer = variants[index];
  // Чуть другая высота каждый раз: так повторы звучат живее
  if (!FIXED_PITCH.includes(name)) source.playbackRate.value = 0.94 + Math.random() * 0.12;
  const gain = context.createGain();
  gain.gain.value = SOUND_GAIN[name] ?? 1;
  source.connect(gain);
  gain.connect(effectsGain);
  source.start();
}

// Звук по типу разыгранной карты: атака — взмах, навык — шорох, сила — заклинание
export function playCardSound(type) {
  playSound(type === "attack" ? "swing" : type === "power" ? "power" : "skill");
}

export function setMusicMood(newMood) {
  if (newMood === mood) return;
  mood = newMood;
  if (context) switchMusic(mood);
}

// Плавно сменяет музыку. Файл берём целиком через fetch (его кэширует service worker) и играем из памяти:
// так музыка работает и без сети, а в памяти лежит только сжатый файл
async function switchMusic(newMood) {
  if (music?.mood === newMood) return;
  const request = ++musicRequest;
  fadeOutMusic();
  if (!MUSIC_MOODS.includes(newMood)) return;

  try {
    musicUrls[newMood] ??= URL.createObjectURL(await (await fetch(`assets/sounds/music/${newMood}.mp3`)).blob());
  } catch {
    return;
  }
  // Пока файл грузился, игрок мог уйти на другой экран
  if (request !== musicRequest) return;

  const element = new Audio(musicUrls[newMood]);
  element.loop = true;
  const gain = context.createGain();
  gain.gain.value = 0.0001;
  context.createMediaElementSource(element).connect(gain);
  gain.connect(musicGain);
  gain.gain.exponentialRampToValueAtTime(1, context.currentTime + CROSSFADE_SECONDS);
  music = { mood: newMood, element, gain };
  if (!document.hidden) element.play().catch(() => {});
}

function fadeOutMusic() {
  if (!music) return;
  const { element, gain } = music;
  music = null;
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + CROSSFADE_SECONDS);
  setTimeout(() => {
    element.pause();
    gain.disconnect();
  }, CROSSFADE_SECONDS * 1000 + 100);
}
