// Фон игры: зал подземелья из текстур стен и пола, факелы и искры. Он лежит отдельным слоем под экранами,
// поэтому не перерисовывается вместе с ними и его анимация не сбивается. Текстуры заданы в css/theme.css.
const EMBER_COUNT = 10;

const SCENE_ART = `<div class="scene__texture"></div>
<svg class="scene__torches" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <radialGradient id="scene-glow"><stop offset="0" stop-color="#ffaa46" stop-opacity=".55"/><stop offset=".45" stop-color="#ff7828" stop-opacity=".14"/><stop offset="1" stop-color="#ff7828" stop-opacity="0"/></radialGradient>
  </defs>
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

// У каждого акта свои текстуры, а у меню своя: 0 означает меню
export function setSceneAct(act) {
  document.getElementById("scene").dataset.act = String(act);
}
