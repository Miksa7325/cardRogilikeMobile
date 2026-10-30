// Генерация карты акта. Этот файл не трогает HTML: только создаёт данные карты.
import { CONFIG } from "../config.js";
import { nextInt, pickWeighted } from "./rng.js";

// Узлы лежат в сетке из рядов и колонок. Каждый путь — это колонка на каждом этаже.
// Колонки путей всегда отсортированы по порядку, поэтому линии между рядами не пересекаются.
export function generateMap(rng) {
  const { floors, columns, pathCount } = CONFIG.map;
  const nodes = {};
  const rows = [];

  let paths = rollStartColumns(rng, pathCount, columns);
  for (let floor = 1; floor <= floors; floor++) {
    const nextPaths = floor < floors ? rollNextColumns(rng, paths, columns) : null;
    const row = [];
    paths.forEach((column, pathIndex) => {
      const id = nodeId(floor, column);
      if (!nodes[id]) {
        nodes[id] = { id, floor, column, type: null, next: [] };
        row.push(id);
      }
      if (nextPaths) {
        const nextId = nodeId(floor + 1, nextPaths[pathIndex]);
        if (!nodes[id].next.includes(nextId)) nodes[id].next.push(nextId);
      }
    });
    rows.push(row);
    if (nextPaths) paths = nextPaths;
  }

  // Босс один: в него ведут все узлы последнего этажа
  const bossId = nodeId(floors + 1, "boss");
  nodes[bossId] = { id: bossId, floor: floors + 1, column: (columns - 1) / 2, type: "boss", next: [] };
  for (const id of rows[rows.length - 1]) nodes[id].next.push(bossId);
  rows.push([bossId]);

  assignNodeTypes(rng, nodes, rows);
  return { nodes, rows };
}

function nodeId(floor, column) {
  return `${floor}-${column}`;
}

// Стартовые колонки путей: минимум две разные
function rollStartColumns(rng, pathCount, columns) {
  let result;
  do {
    result = [];
    for (let i = 0; i < pathCount; i++) result.push(nextInt(rng, 0, columns - 1));
    result.sort((a, b) => a - b);
  } while (countDistinct(result) < CONFIG.map.minNodesInRow);
  return result;
}

// Каждый путь шагает вверх прямо или на колонку в сторону. Сортировка сохраняет порядок путей:
// никакая линия не пересечёт соседнюю. Повторяем, пока в ряду не наберётся минимум узлов.
function rollNextColumns(rng, paths, columns) {
  let result;
  do {
    result = paths.map((column) => {
      const moved = column + nextInt(rng, -1, 1);
      return Math.max(0, Math.min(columns - 1, moved));
    });
    result.sort((a, b) => a - b);
  } while (countDistinct(result) < CONFIG.map.minNodesInRow);
  return result;
}

function countDistinct(items) {
  return new Set(items).size;
}

// Типы назначаем снизу вверх: так у каждого узла уже известны типы узлов перед ним
function assignNodeTypes(rng, nodes, rows) {
  const parents = {};
  for (const node of Object.values(nodes)) {
    for (const nextId of node.next) (parents[nextId] ??= []).push(node);
  }

  for (const row of rows) {
    for (const id of row) {
      const node = nodes[id];
      if (node.type) continue;
      node.type = pickNodeType(rng, node.floor, parents[id] ?? []);
    }
  }
}

function pickNodeType(rng, floor, parentNodes) {
  const { chestFloor, restFloor, eliteMinFloor, nodeWeights } = CONFIG.map;
  if (floor === 1) return "battle";
  if (floor === chestFloor) return "chest";
  if (floor === restFloor) return "rest";

  const weights = { ...nodeWeights };
  if (floor < eliteMinFloor) delete weights.elite;
  // Отдых и магазин не стоят два раза подряд на одном пути
  if (floor + 1 === restFloor) delete weights.rest;
  for (const parent of parentNodes) {
    if (parent.type === "rest") delete weights.rest;
    if (parent.type === "shop") delete weights.shop;
  }
  return pickWeighted(rng, weights);
}
