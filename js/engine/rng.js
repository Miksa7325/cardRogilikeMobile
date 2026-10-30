// Случайные числа с seed: одинаковый seed всегда даёт одинаковую последовательность.
// Состояние хранится обычным числом в объекте, поэтому его легко будет сохранить.

export function createRng(seed) {
  return { state: seed >>> 0 };
}

// Делает из seed забега отдельный seed для конкретной цели. Так награда на узле
// не зависит от того, сколько случайных чисел потратил предыдущий бой.
export function deriveSeed(seed, purpose) {
  let hash = seed >>> 0;
  for (const char of purpose) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  }
  return hash;
}

// Случайное дробное число от 0 до 1 (алгоритм mulberry32)
export function nextFloat(rng) {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Случайное целое число от min до max включительно
export function nextInt(rng, min, max) {
  return min + Math.floor(nextFloat(rng) * (max - min + 1));
}

// Случайный элемент массива
export function pickRandom(rng, items) {
  return items[nextInt(rng, 0, items.length - 1)];
}

// Случайный ключ объекта с учётом весов: { battle: 45, rest: 12 }
export function pickWeighted(rng, weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = nextFloat(rng) * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll < 0) return key;
  }
  return entries[entries.length - 1][0];
}

// Перемешивает массив на месте (алгоритм Фишера — Йетса)
export function shuffle(rng, items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(rng, 0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
}
