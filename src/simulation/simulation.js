import { WORLD } from "../core/constants.js";
import { clamp, distanceSq, lerp, rand } from "../core/math.js";
import { state } from "../state.js";
import { buildTerrain } from "./terrain.js";
import { createFood, createGenes, createRabbit, normalizeGene, reproductionEnergy } from "./entities.js";

export function resetSimulation() {
  state.rabbits = [];
  state.food = [];
  state.particles = [];
  state.terrain = buildTerrain();
  state.history = [];
  state.tick = 0;
  state.births = 0;
  state.deaths = 0;
  state.droughtTimer = 0;

  for (let i = 0; i < state.foodTarget; i += 1) {
    state.food.push(createFood());
  }

  for (let i = 0; i < WORLD.initialRabbits; i += 1) {
    const sex = i % 2 === 0 ? "female" : "male";
    const rabbit = createRabbit(rand(5, WORLD.width - 5), rand(5, WORLD.height - 5), createGenes(), 1, sex);
    const startsAdult = i < WORLD.initialRabbits * 0.74;
    rabbit.age = startsAdult ? rand(rabbit.maturityAge + 20, rabbit.maturityAge + 760) : rand(40, rabbit.maturityAge * 0.72);
    rabbit.cooldown = startsAdult ? rand(0, 55) : rabbit.maturityAge - rabbit.age;
    state.rabbits.push(rabbit);
  }
}

export function triggerDrought() {
  state.droughtTimer = Math.max(state.droughtTimer, 720);
  state.food = state.food.filter(() => Math.random() > 0.22);
  addParticle(WORLD.width * 0.5, WORLD.height * 0.48, "rgba(229,121,99,", 36);
}

export function introduceMigrants() {
  const count = 12;
  const generation = Math.max(1, Math.round(getAverages().generation));
  for (let i = 0; i < count && state.rabbits.length < WORLD.maxRabbits; i += 1) {
    const edge = Math.random() < 0.5;
    const x = edge ? rand(2, WORLD.width - 2) : rand(0.8, 2.2);
    const y = edge ? rand(0.8, 2.2) : rand(2, WORLD.height - 2);
    const genes = createGenes(rand(-0.02, 0.12));
    const rabbit = createRabbit(x, y, genes, generation, i % 2 === 0 ? "female" : "male");
    rabbit.age = rand(rabbit.maturityAge + 30, rabbit.maturityAge + 520);
    rabbit.cooldown = rand(0, 80);
    state.rabbits.push(rabbit);
    addParticle(x, y, "rgba(104,212,189,", 4);
  }
}

export function stepSimulation(dt) {
  state.tick += 1;
  state.droughtTimer = Math.max(0, state.droughtTimer - dt);

  const seasonWave = state.seasons ? 0.86 + Math.sin(state.tick / 560) * 0.28 : 1;
  const droughtGrowth = state.droughtTimer > 0 ? 0.36 : 1;
  const climateGrowth = (state.climate === "lush" ? 1.55 : state.climate === "dry" ? 0.55 : 1) * seasonWave * droughtGrowth;
  const pressureCost = state.pressure === "high" ? 1.36 : state.pressure === "medium" ? 1.14 : 1;

  if (state.food.length < state.foodTarget && Math.random() < 0.26 * climateGrowth) {
    state.food.push(createFood());
  }

  for (const food of state.food) {
    food.growth = clamp(food.growth + 0.0028 * climateGrowth, 0, 1);
    if (state.droughtTimer > 0) food.growth = clamp(food.growth - 0.0022 * dt, 0.2, 1);
    food.sway += 0.025;
  }

  const newborns = [];
  const dead = new Set();

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

    const foodTarget = findNearestFood(rabbit);
    const mateTarget = canSeekMate(rabbit) ? findPotentialMate(rabbit) : null;
    const hungry = rabbit.energy < reproductionEnergy(rabbit) * 0.92 || Boolean(rabbit.pregnancy);
    const target = !hungry && mateTarget ? mateTarget : foodTarget;
    rabbit.targetFood = foodTarget;
    rabbit.targetMate = mateTarget;
    rabbit.intent = target === mateTarget ? "mate" : target === foodTarget ? "food" : "wander";

    moveRabbit(rabbit, target, speed, dt);
    eatNearbyFood(rabbit);
    tryMate(rabbit);

    const maxAge = lerp(2450, 1450, rabbit.genes.speed) + rabbit.genes.metabolism * 550;
    const hunted = rabbit.energy > 0 && rabbit.age <= maxAge && isPredated(rabbit);
    if (rabbit.energy <= 0 || rabbit.age > maxAge || hunted) {
      dead.add(rabbit);
      state.deaths += 1;
      addParticle(rabbit.x, rabbit.y, hunted ? "rgba(255,190,99," : "rgba(229,121,99,", hunted ? 10 : 5);
    }
  }

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

  updateParticles(dt);

  if (state.tick % 18 === 0) {
    recordHistory();
  }
}

export function getAverages() {
  if (!state.rabbits.length) {
    return { speed: 0, vision: 0, metabolism: 0, size: 0, fertility: 0, generation: 0 };
  }

  const totals = state.rabbits.reduce(
    (acc, rabbit) => {
      acc.speed += rabbit.genes.speed;
      acc.vision += rabbit.genes.vision;
      acc.metabolism += rabbit.genes.metabolism;
      acc.size += rabbit.genes.size;
      acc.fertility += rabbit.genes.fertility;
      acc.generation += rabbit.generation;
      return acc;
    },
    { speed: 0, vision: 0, metabolism: 0, size: 0, fertility: 0, generation: 0 },
  );

  const count = state.rabbits.length;
  return {
    speed: totals.speed / count,
    vision: totals.vision / count,
    metabolism: totals.metabolism / count,
    size: totals.size / count,
    fertility: totals.fertility / count,
    generation: totals.generation / count,
  };
}

export function recordHistory() {
  const averages = getAverages();
  state.history.push({
    tick: state.tick,
    population: state.rabbits.length,
    speed: averages.speed,
    vision: averages.vision,
  });
  if (state.history.length > 180) state.history.shift();
}

function moveRabbit(rabbit, target, speed, dt) {
  let ax = 0;
  let ay = 0;

  if (target) {
    const dx = target.x - rabbit.x;
    const dy = target.y - rabbit.y;
    const d = Math.hypot(dx, dy) || 1;
    ax += (dx / d) * speed;
    ay += (dy / d) * speed;
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

  rabbit.vx = clamp((rabbit.vx + ax) * 0.82, -speed, speed);
  rabbit.vy = clamp((rabbit.vy + ay) * 0.82, -speed, speed);
  rabbit.x = clamp(rabbit.x + rabbit.vx * dt, 0.4, WORLD.width - 0.4);
  rabbit.y = clamp(rabbit.y + rabbit.vy * dt, 0.4, WORLD.height - 0.4);

  if (Math.abs(rabbit.vx) + Math.abs(rabbit.vy) > 0.001) {
    rabbit.heading = Math.atan2(rabbit.vy, rabbit.vx);
  }
}

function eatNearbyFood(rabbit) {
  for (let i = state.food.length - 1; i >= 0; i -= 1) {
    const food = state.food[i];
    const eatRadius = 0.46 + rabbit.genes.size * 0.18;
    if (distanceSq(rabbit, food) < eatRadius * eatRadius) {
      rabbit.energy = clamp(rabbit.energy + food.energy * food.growth, 0, 150);
      addParticle(food.x, food.y, "rgba(215,239,111,", 5);
      state.food.splice(i, 1);
      break;
    }
  }
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

function mutateGene(value) {
  return normalizeGene(value + rand(-state.mutationRate, state.mutationRate));
}

function inheritGenes(a, b) {
  return {
    speed: mutateGene((a.speed + b.speed) * 0.5),
    vision: mutateGene((a.vision + b.vision) * 0.5),
    metabolism: mutateGene((a.metabolism + b.metabolism) * 0.5),
    fertility: mutateGene((a.fertility + b.fertility) * 0.5),
    size: mutateGene((a.size + b.size) * 0.5),
  };
}

function findNearestFood(rabbit) {
  const vision = lerp(2.8, 9.2, rabbit.genes.vision);
  const visionSq = vision * vision;
  let nearest = null;
  let nearestD = Infinity;

  for (const food of state.food) {
    const d = distanceSq(rabbit, food);
    if (d < visionSq && d < nearestD) {
      nearest = food;
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

function isPredated(rabbit) {
  if (state.predatorPressure <= 0 || rabbit.age < 90) return false;
  const survivalTraits = (rabbit.genes.speed * 0.58 + rabbit.genes.vision * 0.42);
  const ageRisk = rabbit.age < rabbit.maturityAge ? 1.25 : 1;
  const pregnancyRisk = rabbit.pregnancy ? 1.18 : 1;
  const vulnerability = lerp(2.1, 0.5, survivalTraits) * ageRisk * pregnancyRisk;
  return Math.random() < 0.000075 * state.predatorPressure * vulnerability;
}

function addParticle(x, y, color, count = 6) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x,
      y,
      z: rand(0.15, 0.5),
      vx: rand(-0.035, 0.035),
      vy: rand(-0.035, 0.035),
      vz: rand(0.025, 0.065),
      life: rand(24, 42),
      maxLife: 42,
      color,
    });
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vz -= 0.0025 * dt;
    p.life -= dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}
