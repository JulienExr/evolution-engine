import { WORLD } from "../core/constants.js";
import { distanceSq, rand } from "../core/math.js";
import { state } from "../state.js";

const REFUGE_CAPACITY = 3;
const TARGET_REFUGE_COUNT = 6;
const MIN_REFUGE_COUNT = 4;

export function buildRefuges(terrain) {
  const refuges = [];
  const candidates = terrain
    .filter((tile) => tile.cover > 0.34 && tile.biome !== "wetland")
    .sort((a, b) => b.cover + b.forage - (a.cover + a.forage));

  for (const tile of candidates) {
    if (refuges.length >= TARGET_REFUGE_COUNT) break;
    const x = tile.x + rand(0.24, 0.76);
    const y = tile.y + rand(0.24, 0.76);
    const tooClose = refuges.some((refuge) => distanceSq(refuge, { x, y }) < 5.8 * 5.8);
    if (tooClose) continue;

    refuges.push({
      id: `refuge-${refuges.length + 1}`,
      x,
      y,
      radius: rand(0.92, 1.32),
      capacity: REFUGE_CAPACITY,
      occupants: 0,
      reserved: 0,
      cover: tile.cover,
      forage: tile.forage,
    });
  }

  while (refuges.length < MIN_REFUGE_COUNT) {
    refuges.push({
      id: `refuge-${refuges.length + 1}`,
      x: rand(4, WORLD.width - 4),
      y: rand(4, WORLD.height - 4),
      radius: rand(0.86, 1.18),
      capacity: REFUGE_CAPACITY,
      occupants: 0,
      reserved: 0,
      cover: 0.62,
      forage: 0.9,
    });
  }

  return refuges;
}

export function getRefugeAt(x, y, padding = 0) {
  for (const refuge of state.refuges) {
    const radius = refuge.radius + padding;
    if (distanceSq(refuge, { x, y }) <= radius * radius) return refuge;
  }
  return null;
}

export function resetRefugeUse() {
  for (const refuge of state.refuges) {
    refuge.occupants = 0;
    refuge.reserved = 0;
  }

  for (const rabbit of state.rabbits) {
    rabbit.inRefuge = null;
    const refuge = getRefugeAt(rabbit.x, rabbit.y, 0.08);
    if (!refuge || !hasFreeSlot(refuge)) continue;
    refuge.occupants += 1;
    rabbit.inRefuge = refuge;
  }
}

export function findNearestRefuge(entity, maxDistance) {
  const maxDistanceSq = maxDistance * maxDistance;
  let nearest = null;
  let nearestD = Infinity;

  for (const refuge of state.refuges) {
    if (entity.inRefuge !== refuge && !hasFreeSlot(refuge)) continue;
    const d = distanceSq(entity, refuge);
    if (d < maxDistanceSq && d < nearestD) {
      nearest = refuge;
      nearestD = d;
    }
  }

  return nearest;
}

export function reserveRefuge(refuge) {
  if (!refuge || !hasFreeSlot(refuge)) return false;
  refuge.reserved += 1;
  return true;
}

export function updateRabbitRefugeState(rabbit) {
  const previous = rabbit.inRefuge;
  const refuge = getRefugeAt(rabbit.x, rabbit.y, 0.08);

  if (previous && previous !== refuge) {
    previous.occupants = Math.max(0, previous.occupants - 1);
  }

  if (!refuge) {
    rabbit.inRefuge = null;
    rabbit.hideProgress = Math.max(0, (rabbit.hideProgress ?? 0) - 0.055);
    return null;
  }

  if (previous !== refuge) {
    const hasReservedSlot = rabbit.targetRefuge === refuge && (refuge.reserved ?? 0) > 0;
    if (!hasReservedSlot && !hasFreeSlot(refuge)) {
      rabbit.inRefuge = null;
      rabbit.hideProgress = Math.max(0, (rabbit.hideProgress ?? 0) - 0.055);
      return null;
    }
    if (hasReservedSlot) refuge.reserved = Math.max(0, refuge.reserved - 1);
    refuge.occupants += 1;
  }

  rabbit.inRefuge = refuge;
  rabbit.hideProgress =
    rabbit.intent === "flee" ? Math.min(1, (rabbit.hideProgress ?? 0) + 0.085) : Math.max(0, (rabbit.hideProgress ?? 0) - 0.055);
  return rabbit.inRefuge;
}

export function isRabbitProtected(rabbit) {
  return Boolean(rabbit.inRefuge && rabbit.intent === "flee");
}

function hasFreeSlot(refuge) {
  return (refuge.occupants ?? 0) + (refuge.reserved ?? 0) < (refuge.capacity ?? REFUGE_CAPACITY);
}
