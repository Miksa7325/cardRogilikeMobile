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
// Раскодированная музыка: настроение → AudioBuffer. Держим только последние треки, остальные грузим заново
const musicBuffers = new Map();
const MUSIC_CACHE_SIZE = 2;
// Музыку храним моно и с частотой 24 кГц: так трек занимает в памяти вчетверо меньше, чем стерео 48 кГц
const MUSIC_SAMPLE_RATE = 24000;
let mood = "menu";
let music = null; // { mood, source, gain }
let musicRequest = 0;

let started = false;

// Готовит звук заранее, пока игрок смотрит на меню: создать AudioContext на слабом телефоне — это десятки
// миллисекунд, и в обработчике первого нажатия они ощущались как подвисание. До нажатия контекст молчит
export function prepareAudio() {
  if (context) return;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;

  context = new AudioContextClass();
  musicGain = context.createGain();
  effectsGain = context.createGain();
  musicGain.connect(context.destination);
  effectsGain.connect(context.destination);
  applyVolumes();

  // Свернули игру — звук молчит и не тратит батарею. Музыка играет через Web Audio, а не через <audio>:
  // поэтому она не занимает системный проигрыватель телефона и не появляется на экране блокировки
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) context.suspend();
    else if (started) context.resume();
  });
}

// Вызывается на каждом нажатии: браузер разрешает звук только после него. Первое нажатие включает звук,
// остальные возобновляют его, если браузер его приостановил. Загрузка звуков идёт уже после нажатия, не задерживая его
export function unlockAudio() {
  prepareAudio();
  if (!context) return;
  if (context.state !== "running" && !document.hidden) context.resume();
  if (started) return;
  started = true;
  setTimeout(() => {
    loadSounds();
    switchMusic(mood);
  }, 0);
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

// Загружает все короткие звуки. Они маленькие, поэтому хранятся уже раскодированными и играют без задержки.
// Грузим по три файла за раз, а не все полсотни сразу: так слабый телефон не захлёбывается в начале игры
const SOUND_LOADS_AT_ONCE = 3;
function loadSounds() {
  const queue = [];
  for (const [name, count] of Object.entries(SOUND_VARIANTS)) {
    const files = count === 0 ? [`${name}.mp3`] : Array.from({ length: count }, (_, index) => `${name}-${index + 1}.mp3`);
    buffers[name] = [];
    for (const file of files) queue.push({ name, file });
  }
  const next = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        const data = await (await fetch(`assets/sounds/sfx/${item.file}`)).arrayBuffer();
        buffers[item.name].push(await context.decodeAudioData(data));
      } catch {
        // Звук не загрузился: игра просто обойдётся без него
      }
    }
  };
  for (let i = 0; i < SOUND_LOADS_AT_ONCE; i++) next();
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
  if (started) switchMusic(mood);
}

// Плавно сменяет музыку. Файл берём через fetch (его кэширует service worker), поэтому музыка работает и без сети
async function switchMusic(newMood) {
  if (music?.mood === newMood) return;
  const request = ++musicRequest;
  fadeOutMusic();
  if (!MUSIC_MOODS.includes(newMood)) return;

  let buffer;
  try {
    buffer = await loadMusic(newMood);
  } catch {
    return;
  }
  // Пока файл грузился, игрок мог уйти на другой экран
  if (request !== musicRequest) return;

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, context.currentTime + CROSSFADE_SECONDS);
  source.connect(gain);
  gain.connect(musicGain);
  source.start();
  music = { mood: newMood, source, gain };
}

async function loadMusic(name) {
  if (musicBuffers.has(name)) {
    // Свежий трек переносим в конец очереди: из памяти уходит самый давний
    const cached = musicBuffers.get(name);
    musicBuffers.delete(name);
    musicBuffers.set(name, cached);
    return cached;
  }
  const data = await (await fetch(`assets/sounds/music/${name}.mp3`)).arrayBuffer();
  const buffer = await decodeCompact(data);
  musicBuffers.set(name, buffer);
  while (musicBuffers.size > MUSIC_CACHE_SIZE) musicBuffers.delete(musicBuffers.keys().next().value);
  return buffer;
}

// Раскодирует трек сразу в 24 кГц и сводит стерео в моно. Сводит сам браузер в своём звуковом потоке,
// а не цикл на JavaScript: цикл по миллионам отсчётов подвешивал слабый телефон при каждой смене музыки.
// Если браузер так не умеет — обычное раскодирование
async function decodeCompact(data) {
  const Offline = window.OfflineAudioContext ?? window.webkitOfflineAudioContext;
  try {
    const decoded = await new Offline(1, 1, MUSIC_SAMPLE_RATE).decodeAudioData(data.slice(0));
    if (decoded.numberOfChannels === 1) return decoded;
    const mixer = new Offline(1, decoded.length, decoded.sampleRate);
    const source = mixer.createBufferSource();
    source.buffer = decoded;
    source.connect(mixer.destination);
    source.start();
    return await mixer.startRendering();
  } catch {
    return context.decodeAudioData(data);
  }
}

function fadeOutMusic() {
  if (!music) return;
  const { source, gain } = music;
  music = null;
  const now = context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + CROSSFADE_SECONDS);
  source.onended = () => gain.disconnect();
  source.stop(now + CROSSFADE_SECONDS + 0.05);
}
