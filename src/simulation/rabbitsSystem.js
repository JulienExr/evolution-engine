import { WORLD } from "../core/constants.js";
import { clamp, distanceSq, lerp, rand } from "../core/math.js";
import { state } from "../state.js";
import { createGenes, createRabbit, reproductionEnergy } from "./entities.js";
import { isFoodInsidePlayableArea } from "./foodSystem.js";
import { inheritGenes } from "./genetics.js";
import { addParticle } from "./particles.js";
import { findNearestRefuge, getRefugeAt, reserveRefuge, resetRefugeUse, updateRabbitRefugeState } from "./refuges.js";

export function stepRabbits(dt, pressureCost) {
  const newborns = [];
  const dead = new Set();
  resetRefugeUse();

  for (const rabbit of state.rabbits) {
    rabbit.age += dt;
    rabbit.cooldown = Math.max(0, rabbit.cooldown - dt);
    rabbit.nursing = Math.max(0, rabbit.nursing - dt);
    rabbit.hop += dt * lerp(0.12, 0.24, rabbit.genes.speed);
    advancePregnancy(rabbit, newborns, dt);

    const speed = lerp(0.021, 0.07, rabbit.genes.speed);
    const sizeCost = lerp(0.45, 1.12, rabbit.genes.size);
    const speedCost = lerp(0.55, 1.65, rabbit.genes.speed);
    const metabolismBonus = lerp(1.26, 0.7, rabbit.genes.metabolism);
    const pregnancyCost = rabbit.pregnancy ? 1.32 : 1;
    rabbit.energy -= 0.032 * speedCost * sizeCost * metabolismBonus * pressureCost * pregnancyCost * dt;

    const threat = findNearestFox(rabbit);
    let refugeTarget = threat ? findNearestRefuge(rabbit, lerp(3.6, 8.8, rabbit.genes.vision)) : null;
    if (refugeTarget && rabbit.inRefuge !== refugeTarget && !reserveRefuge(refugeTarget)) {
      refugeTarget = null;
    }
    const foodTarget = threat ? null : findNearestFood(rabbit);
    const mateTarget = !threat && canSeekMate(rabbit) ? findPotentialMate(rabbit) : null;
    const hungry = rabbit.energy < reproductionEnergy(rabbit) * 0.92 || Boolean(rabbit.pregnancy);
    const target = !hungry && mateTarget ? mateTarget : foodTarget;

    rabbit.targetFood = foodTarget;
    rabbit.targetMate = mateTarget;
    rabbit.threat = threat;
    rabbit.targetRefuge = refugeTarget;
    rabbit.intent = threat ? "flee" : target === mateTarget ? "mate" : target === foodTarget ? "food" : "wander";

    if (threat) {
      rabbit.energy -= 0.018 * lerp(0.8, 1.45, rabbit.genes.speed) * dt;
    }

    moveRabbit(rabbit, target, speed, dt, threat, refugeTarget);
    updateRabbitRefugeState(rabbit);
    eatNearbyFood(rabbit);
    if (!threat) tryMate(rabbit);

    const maxAge = lerp(2450, 1450, rabbit.genes.speed) + rabbit.genes.metabolism * 550;
    if (rabbit.energy <= 0 || rabbit.age > maxAge) {
      dead.add(rabbit);
      state.deaths += 1;
      addParticle(rabbit.x, rabbit.y, "rgba(229,121,99,", 5);
    }
  }

  return { dead, newborns };
}

export function commitRabbitStep(dead, newborns) {
  if (dead.size) {
    state.rabbits = state.rabbits.filter((rabbit) => !dead.has(rabbit));
  }

  if (newborns.length) {
    state.rabbits.push(...newborns);
  }

  if (state.rabbits.length < 8 && state.tick % 100 === 0) {
    for (let i = 0; i < 4; i += 1) {
      state.rabbits.push(createRabbit(rand(8, WORLD.width - 8), rand(8, WORLD.height - 8), createGenes(0.04)));
    }
  }
}

function moveRabbit(rabbit, target, speed, dt, threat = null, refugeTarget = null) {
  let ax = 0;
  let ay = 0;

  if (threat && refugeTarget) {
    const refuge = getRefugeAt(rabbit.x, rabbit.y, 0.05);
    if (refuge) {
      rabbit.vx *= 0.58;
      rabbit.vy *= 0.58;
    } else {
      const dx = refugeTarget.x - rabbit.x;
      const dy = refugeTarget.y - rabbit.y;
      const d = Math.hypot(dx, dy) || 1;
      const urgency = lerp(1.22, 1.72, rabbit.genes.vision);
      ax += (dx / d) * speed * urgency;
      ay += (dy / d) * speed * urgency;
    }
  } else if (threat) {
    const dx = rabbit.x - threat.x;
    const dy = rabbit.y - threat.y;
    const d = Math.hypot(dx, dy) || 1;
    const panic = lerp(1.1, 1.55, rabbit.genes.vision);
    ax += (dx / d) * speed * panic;
    ay += (dy / d) * speed * panic;
    rabbit.heading += rand(-0.05, 0.05);
  } else if (target) {
    const targetPoint = getSafeTargetPoint(target);
    const dx = targetPoint.x - rabbit.x;
    const dy = targetPoint.y - rabbit.y;
    const d = Math.hypot(dx, dy) || 1;
    const arrival = clamp(d / 1.25, 0.28, 1);
    ax += (dx / d) * speed * arrival;
    ay += (dy / d) * speed * arrival;
    if (d < 0.72) {
      rabbit.vx *= 0.72;
      rabbit.vy *= 0.72;
    }
  } else {
    rabbit.heading += rand(-0.13, 0.13);
    ax += Math.cos(rabbit.heading) * speed * 0.42;
    ay += Math.sin(rabbit.heading) * speed * 0.42;
  }

  const margin = 1.2;
  if (rabbit.x < margin) ax += speed * 1.8;
  if (rabbit.y < margin) ay += speed * 1.8;
  if (rabbit.x > WORLD.width - margin) ax -= speed * 1.8;
  if (rabbit.y > WORLD.height - margin) ay -= speed * 1.8;

  const maxSpeed = threat ? speed * 1.34 : speed;
  rabbit.vx = clamp((rabbit.vx + ax) * 0.82, -maxSpeed, maxSpeed);
  rabbit.vy = clamp((rabbit.vy + ay) * 0.82, -maxSpeed, maxSpeed);
  rabbit.x = clamp(rabbit.x + rabbit.vx * dt, 0.4, WORLD.width - 0.4);
  rabbit.y = clamp(rabbit.y + rabbit.vy * dt, 0.4, WORLD.height - 0.4);

  if ((rabbit.x <= 0.42 && rabbit.vx < 0) || (rabbit.x >= WORLD.width - 0.42 && rabbit.vx > 0)) {
    rabbit.vx = 0;
  }
  if ((rabbit.y <= 0.42 && rabbit.vy < 0) || (rabbit.y >= WORLD.height - 0.42 && rabbit.vy > 0)) {
    rabbit.vy = 0;
  }

  if (Math.abs(rabbit.vx) + Math.abs(rabbit.vy) > 0.001) {
    rabbit.heading = Math.atan2(rabbit.vy, rabbit.vx);
  }
}

function eatNearbyFood(rabbit) {
  if (rabbit.targetFood) {
    if (!isFoodInsidePlayableArea(rabbit.targetFood)) {
      rabbit.targetFood = null;
      rabbit.foodFocusTicks = 0;
      return;
    }

    const targetIndex = state.food.indexOf(rabbit.targetFood);
    if (targetIndex !== -1) {
      const targetFood = state.food[targetIndex];
      const targetRadius = 0.58 + rabbit.genes.size * 0.22;
      const closeEnough = distanceSq(rabbit, targetFood) < targetRadius * targetRadius;
      const stalledAtFood =
        distanceSq(rabbit, targetFood) < 0.92 * 0.92 && Math.abs(rabbit.vx) + Math.abs(rabbit.vy) < 0.004;

      if (closeEnough || stalledAtFood) {
        consumeFood(rabbit, targetFood, targetIndex);
        rabbit.foodFocusTicks = 0;
        return;
      }

      rabbit.foodFocusTicks = distanceSq(rabbit, targetFood) < 1.2 * 1.2 ? (rabbit.foodFocusTicks ?? 0) + 1 : 0;
      if (rabbit.foodFocusTicks > 90) {
        rabbit.heading += rand(-0.8, 0.8);
        rabbit.foodFocusTicks = 0;
      }
    }
  }

  for (let i = state.food.length - 1; i >= 0; i -= 1) {
    const food = state.food[i];
    const eatRadius = 0.46 + rabbit.genes.size * 0.18;
    if (distanceSq(rabbit, food) < eatRadius * eatRadius) {
      consumeFood(rabbit, food, i);
      break;
    }
  }
}

function consumeFood(rabbit, food, index) {
  rabbit.energy = clamp(rabbit.energy + food.energy * food.growth, 0, 150);
  rabbit.targetFood = null;
  addParticle(food.x, food.y, "rgba(215,239,111,", 5);
  state.food.splice(index, 1);
}

function tryMate(rabbit) {
  if (rabbit.sex !== "female" || !canSeekMate(rabbit)) return;

  const mate = findMate(rabbit);
  if (!mate) return;

  const cost = 18 + rabbit.genes.size * 9;
  rabbit.energy -= cost;
  mate.energy -= cost * 0.45;
  rabbit.cooldown = lerp(210, 96, rabbit.genes.fertility);
  mate.cooldown = lerp(80, 36, mate.genes.fertility);
  rabbit.pregnancy = {
    fatherGenes: { ...mate.genes },
    fatherGeneration: mate.generation,
    timer: lerp(330, 190, (rabbit.genes.fertility + mate.genes.fertility) * 0.5),
    litterSize: getLitterSize(rabbit, mate),
  };

  addParticle(rabbit.x, rabbit.y, "rgba(104,212,189,", 8);
}

function advancePregnancy(rabbit, newborns, dt) {
  if (!rabbit.pregnancy) return;

  rabbit.pregnancy.timer -= dt;
  if (rabbit.pregnancy.timer > 0) return;

  const freeSlots = WORLD.maxRabbits - state.rabbits.length - newborns.length;
  const litterSize = Math.max(0, Math.min(rabbit.pregnancy.litterSize, freeSlots));
  for (let i = 0; i < litterSize; i += 1) {
    const childGenes = inheritGenes(rabbit.genes, rabbit.pregnancy.fatherGenes);
    const child = createRabbit(
      clamp(rabbit.x + rand(-0.55, 0.55), 0.6, WORLD.width - 0.6),
      clamp(rabbit.y + rand(-0.55, 0.55), 0.6, WORLD.height - 0.6),
      childGenes,
      Math.max(rabbit.generation, rabbit.pregnancy.fatherGeneration) + 1,
    );

    child.energy = 44 + rabbit.genes.metabolism * 12;
    child.cooldown = child.maturityAge;
    newborns.push(child);
    state.births += 1;
    addParticle(child.x, child.y, "rgba(104,212,189,", 5);
  }

  rabbit.energy -= 12 + litterSize * 9;
  rabbit.nursing = 160;
  rabbit.cooldown = lerp(180, 70, rabbit.genes.fertility);
  rabbit.pregnancy = null;
}

function getLitterSize(mother, father) {
  const fertility = (mother.genes.fertility + father.genes.fertility) * 0.5;
  const energyBonus = mother.energy > 120 ? 1 : mother.energy > 96 ? 0.55 : 0;
  const crowdingPenalty = state.rabbits.length > WORLD.maxRabbits * 0.72 ? -1 : 0;
  return clamp(Math.round(1 + fertility * 2.8 + energyBonus + crowdingPenalty + rand(-0.75, 0.75)), 1, 4);
}

function canSeekMate(rabbit) {
  return (
    rabbit.age >= rabbit.maturityAge &&
    rabbit.cooldown <= 0 &&
    !rabbit.pregnancy &&
    rabbit.nursing <= 0 &&
    rabbit.energy >= reproductionEnergy(rabbit)
  );
}

function findNearestFood(rabbit) {
  const vision = lerp(2.8, 9.2, rabbit.genes.vision);
  const visionSq = vision * vision;
  let nearest = null;
  let nearestD = Infinity;

  for (const food of state.food) {
    if (!isFoodInsidePlayableArea(food)) continue;
    const d = distanceSq(rabbit, food);
    if (d < visionSq && d < nearestD) {
      nearest = food;
      nearestD = d;
    }
  }

  return nearest;
}

function getSafeTargetPoint(target) {
  const safeMargin = 1.65;
  return {
    x: clamp(target.x, safeMargin, WORLD.width - safeMargin),
    y: clamp(target.y, safeMargin, WORLD.height - safeMargin),
  };
}

function findNearestFox(rabbit) {
  if (!state.foxes.length || rabbit.age < 45) return null;

  const fearRadius = lerp(2.4, 8.8, rabbit.genes.vision);
  const fearRadiusSq = fearRadius * fearRadius;
  let nearest = null;
  let nearestD = Infinity;

  for (const fox of state.foxes) {
    const d = distanceSq(rabbit, fox);
    if (d < fearRadiusSq && d < nearestD) {
      nearest = fox;
      nearestD = d;
    }
  }

  return nearest;
}

function findPotentialMate(rabbit) {
  const vision = lerp(2.6, 8.4, rabbit.genes.vision);
  return findBestMate(rabbit, vision * vision);
}

function findMate(rabbit) {
  return findBestMate(rabbit, 1.75 * 1.75);
}

function findBestMate(rabbit, radiusSq) {
  if (!canSeekMate(rabbit)) return null;
  let best = null;
  let bestScore = -Infinity;

  for (const other of state.rabbits) {
    if (other === rabbit || other.sex === rabbit.sex || !canSeekMate(other)) continue;
    const d = distanceSq(rabbit, other);
    if (d > radiusSq) continue;

    const fitness = (other.genes.speed + other.genes.vision + other.genes.metabolism + other.energy / 150) * 0.25;
    const selectivity = state.mateSelectivity;
    const score = fitness * selectivity - d * (1 - selectivity * 0.55);
    if (score > bestScore) {
      best = other;
      bestScore = score;
    }
  }

  return best;
}
