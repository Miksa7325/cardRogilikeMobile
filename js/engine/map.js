// Генерация карты акта. Этот файл не трогает HTML: только создаёт данные карты.
import { CONFIG } from "../config.js";
import { nextFloat, nextInt, pickWeighted } from "./rng.js";

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

  assignNodeTypes(rng, nodes, rows);
  addDeadEnds(rng, nodes);
  placeBoss(rng, nodes, rows);
  return { nodes, rows };
}

// Комната босса в каждом акте в случайном месте: туннель к ней отходит от случайной комнаты основных путей
// не ниже bossMinFloor. Верхние комнаты, из которых больше никуда не ведёт, становятся тупиками — босса придётся искать
function placeBoss(rng, nodes, rows) {
  const { columns, maxTunnels, bossMinFloor } = CONFIG.map;
  const hosts = rows.flat().map((id) => nodes[id]).filter((node) => node.floor >= bossMinFloor && node.next.length < maxTunnels);
  const host = hosts[nextInt(rng, 0, hosts.length - 1)];
  // Сдвиг в сторону нужен только карте: так комната босса не ляжет поверх соседней
  const column = Math.max(-0.3, Math.min(columns - 0.7, host.column + nextInt(rng, -1, 1) * 0.5));
  const boss = { id: nodeId(host.floor + 1, "boss"), floor: host.floor + 1, column, type: "boss", next: [] };
  host.next.push(boss.id);
  nodes[boss.id] = boss;
}

// Тупики: от некоторых развилок отходит боковой туннель. В нём одна комната, а за ней тупик —
// иногда с сундуком, иногда пустой. Чтобы идти дальше, придётся вернуться к развилке.
// Боковых комнат нет в rows: это ряды основных путей, по ним строится карта
function addDeadEnds(rng, nodes) {
  const { floors, columns, maxTunnels, deadEnds, deadEndChestChance, deadEndRoomWeights, eliteMinFloor } = CONFIG.map;
  // Тупик заканчивается двумя этажами выше развилки и не должен дойти до этажа перед боссом
  const forks = Object.values(nodes).filter((node) => node.floor >= 2 && node.floor <= floors - 3 && node.next.length < maxTunnels);
  for (let index = 0; index < deadEnds && forks.length > 0; index++) {
    const fork = forks.splice(nextInt(rng, 0, forks.length - 1), 1)[0];
    // Боковой туннель уходит к ближнему краю карты, между колонками основных путей
    const side = fork.column <= (columns - 1) / 2 ? -1 : 1;
    const column = Math.max(-0.3, Math.min(columns - 0.7, fork.column + side * 0.5));

    const weights = { ...deadEndRoomWeights };
    if (fork.floor + 1 < eliteMinFloor) delete weights.elite;
    const room = { id: `${fork.floor + 1}-dead${index}`, floor: fork.floor + 1, column, type: pickWeighted(rng, weights), next: [] };
    const end = {
      id: `${fork.floor + 2}-dead${index}`,
      floor: fork.floor + 2,
      column,
      type: nextFloat(rng) < deadEndChestChance ? "chest" : "deadEnd",
      next: [],
    };
    room.next.push(end.id);
    fork.next.push(room.id);
    nodes[room.id] = room;
    nodes[end.id] = end;
  }
}

function nodeId(floor, column) {
  return `${floor}-${column}`;
}

// Стартовые колонки путей: минимум две разные. Из начальной комнаты ведут не больше трёх туннелей,
// а дальше больше трёх и не бывает: путь шагает только прямо или на колонку в сторону
function rollStartColumns(rng, pathCount, columns) {
  const { minNodesInRow, maxTunnels } = CONFIG.map;
  let result;
  do {
    result = [];
    for (let i = 0; i < pathCount; i++) result.push(nextInt(rng, 0, columns - 1));
    result.sort((a, b) => a - b);
  } while (countDistinct(result) < minNodesInRow || countDistinct(result) > maxTunnels);
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
  const { chestFloor, saveFloors, restFloor, eliteMinFloor, nodeWeights } = CONFIG.map;
  if (floor === 1) return "battle";
  if (floor === chestFloor) return "chest";
  if (saveFloors.includes(floor)) return "save";
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
