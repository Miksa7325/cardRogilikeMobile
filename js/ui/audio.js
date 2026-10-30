// Звук и музыка: всё синтезируется в браузере, файлы не нужны.
// Браузеры запрещают автозапуск звука, поэтому звук включается только после первого нажатия.
let context = null;
let musicGain = null;
let effectsGain = null;
let musicTimer = null;
let nextBeatTime = 0;
let beatIndex = 0;
let mood = "calm";
let volumes = { music: 0.5, effects: 0.8 };

const BEAT_SECONDS = { calm: 0.75, combat: 0.42 };
const SCHEDULE_AHEAD_SECONDS = 0.6;

// Ноты в герцах. 0 — пауза. Мелодии в миноре: подходит тёмному фэнтези
const MELODIES = {
  calm: [220, 0, 261.6, 0, 329.6, 0, 261.6, 0, 196, 0, 246.9, 0, 293.7, 0, 246.9, 0],
  combat: [110, 0, 110, 130.8, 0, 110, 164.8, 0, 98, 0, 98, 123.5, 0, 98, 146.8, 0],
};

// Вызывается на первом нажатии: только теперь браузер разрешает звук
export function unlockAudio() {
  if (context) {
    context.resume();
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
  startMusic();

  // Свернули игру — звук молчит и не тратит батарею
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) context.suspend();
    else context.resume();
  });
}

function applyVolumes() {
  if (!context) return;
  musicGain.gain.value = volumes.music * 0.25;
  effectsGain.gain.value = volumes.effects * 0.6;
}

export function setVolumes(music, effects) {
  volumes = { music, effects };
  applyVolumes();
}

export function setMusicMood(newMood) {
  mood = newMood;
}

function startMusic() {
  nextBeatTime = context.currentTime + 0.1;
  musicTimer = setInterval(scheduleMusic, 200);
}

// Планируем ноты немного вперёд: так музыка не сбивается, если страница занята
function scheduleMusic() {
  if (context.state !== "running") return;
  while (nextBeatTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
    const melody = MELODIES[mood];
    const note = melody[beatIndex % melody.length];
    const beat = BEAT_SECONDS[mood];
    if (note > 0 && volumes.music > 0) {
      playTone(note, beat * 1.6, "triangle", 0.5, musicGain, nextBeatTime);
      // Низкая нота в начале такта делает музыку плотнее
      if (beatIndex % 8 === 0) playTone(note / 2, beat * 6, "sine", 0.6, musicGain, nextBeatTime);
    }
    nextBeatTime += beat;
    beatIndex += 1;
  }
}

function playTone(frequency, duration, type, volume, output, startAt = context.currentTime, slideTo = null) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

// Короткий шум: удар и взмах
function playNoise(duration, volume) {
  const samples = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, samples, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / samples);
  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.value = volume;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(effectsGain);
  source.start();
}

const SOUNDS = {
  card: () => playTone(520, 0.09, "triangle", 0.5, effectsGain, undefined, 760),
  hit: () => { playNoise(0.14, 0.7); playTone(150, 0.14, "square", 0.3, effectsGain, undefined, 60); },
  block: () => playTone(880, 0.12, "sine", 0.5, effectsGain, undefined, 1200),
  heal: () => playTone(440, 0.28, "sine", 0.5, effectsGain, undefined, 880),
  error: () => playTone(140, 0.16, "square", 0.3, effectsGain, undefined, 110),
  click: () => playTone(640, 0.04, "sine", 0.3, effectsGain),
  buy: () => { playTone(780, 0.08, "triangle", 0.5, effectsGain); playTone(1040, 0.14, "triangle", 0.5, effectsGain, context.currentTime + 0.08); },
  victory: () => [392, 523, 659, 784].forEach((note, index) => playTone(note, 0.3, "triangle", 0.5, effectsGain, context.currentTime + index * 0.12)),
  defeat: () => [330, 262, 196, 131].forEach((note, index) => playTone(note, 0.45, "sawtooth", 0.25, effectsGain, context.currentTime + index * 0.2)),
};

export function playSound(name) {
  if (!context || context.state !== "running" || volumes.effects === 0) return;
  SOUNDS[name]();
}
