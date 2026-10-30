// Фон игры: зал подземелья с факелами и искрами. Он лежит отдельным слоем под экранами,
// поэтому не перерисовывается вместе с ними и его анимация не сбивается.
const EMBER_COUNT = 10;

const SCENE_ART = `<svg class="scene__wall" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="scene-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2433"/><stop offset=".62" stop-color="#17131d"/><stop offset="1" stop-color="#0c0a10"/></linearGradient>
    <pattern id="scene-bricks" width="48" height="28" patternUnits="userSpaceOnUse"><path d="M0 0H48M0 14H48M0 0V14M24 14V28" stroke="#000" stroke-opacity=".28" fill="none"/></pattern>
    <radialGradient id="scene-glow"><stop offset="0" stop-color="#ffaa46" stop-opacity=".55"/><stop offset=".45" stop-color="#ff7828" stop-opacity=".14"/><stop offset="1" stop-color="#ff7828" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="360" height="640" fill="url(#scene-wall)"/>
  <rect width="360" height="400" fill="url(#scene-bricks)"/>
  <path d="M96 400V200C96 130 264 130 264 200V400Z" fill="#08060b"/>
  <path d="M96 400V200C96 130 264 130 264 200V400" fill="none" stroke="#3b3244" stroke-width="10"/>
  <path d="M0 400H360V640H0Z" fill="#100d15"/>
  <path d="M0 400H360" stroke="#3b3244" stroke-width="3"/>
  <path d="M0 470L90 400M120 640L150 400M240 640L210 400M360 470L270 400" stroke="#000" stroke-opacity=".4"/>
  <circle class="scene__glow" cx="42" cy="196" r="78" fill="url(#scene-glow)"/>
  <circle class="scene__glow scene__glow--late" cx="318" cy="196" r="78" fill="url(#scene-glow)"/>
  <rect x="38" y="210" width="8" height="34" fill="#4a3a28"/><rect x="314" y="210" width="8" height="34" fill="#4a3a28"/>
  <path class="scene__flame" d="M42 190C37 199 35 204 35 207A7 7 0 0 0 49 207C49 204 47 199 42 190Z" fill="#ffb347"/>
  <path class="scene__flame scene__glow--late" d="M318 190C313 199 311 204 311 207A7 7 0 0 0 325 207C325 204 323 199 318 190Z" fill="#ffb347"/>
</svg>
<div class="scene__tint"></div>`;

export function createScene() {
  const scene = document.getElementById("scene");
  scene.innerHTML = SCENE_ART;
  for (let i = 0; i < EMBER_COUNT; i++) {
    const ember = document.createElement("span");
    ember.className = "scene__ember";
    ember.style.left = `${5 + i * 9.5}%`;
    ember.style.animationDelay = `${-i * 1.3}s`;
    ember.style.animationDuration = `${7 + (i % 4) * 1.5}s`;
    scene.append(ember);
  }
}

// У каждого акта свой оттенок
export function setSceneAct(act) {
  document.getElementById("scene").dataset.act = String(act);
}
