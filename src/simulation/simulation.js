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

  for (let i = 0; i < state.foodTarget; i += 1) {
    state.food.push(createFood());
  }

  for (let i = 0; i < WORLD.initialRabbits; i += 1) {
    state.rabbits.push(createRabbit(rand(5, WORLD.width - 5), rand(5, WORLD.height - 5)));
  }
}

export function stepSimulation(dt) {
  state.tick += 1;
  const climateGrowth = state.climate === "lush" ? 1.55 : state.climate === "dry" ? 0.55 : 1;
  const pressureCost = state.pressure === "high" ? 1.36 : state.pressure === "medium" ? 1.14 : 1;

  if (state.food.length < state.foodTarget && Math.random() < 0.26 * climateGrowth) {
    state.food.push(createFood());
  }

  for (const food of state.food) {
    food.growth = clamp(food.growth + 0.0028 * climateGrowth, 0, 1);
    food.sway += 0.025;
  }

  const newborns = [];
  const dead = new Set();

  for (const rabbit of state.rabbits) {
    rabbit.age += dt;
    rabbit.cooldown = Math.max(0, rabbit.cooldown - dt);
    rabbit.hop += dt * lerp(0.12, 0.24, rabbit.genes.speed);

    const speed = lerp(0.021, 0.07, rabbit.genes.speed);
    const sizeCost = lerp(0.45, 1.12, rabbit.genes.size);
    const speedCost = lerp(0.55, 1.65, rabbit.genes.speed);
    const metabolismBonus = lerp(1.26, 0.7, rabbit.genes.metabolism);
    rabbit.energy -= 0.032 * speedCost * sizeCost * metabolismBonus * pressureCost * dt;

    const target = findNearestFood(rabbit);
    rabbit.targetFood = target;

    moveRabbit(rabbit, target, speed, dt);
    eatNearbyFood(rabbit);
    tryReproduce(rabbit, newborns);

    const maxAge = lerp(2450, 1450, rabbit.genes.speed) + rabbit.genes.metabolism * 550;
    if (rabbit.energy <= 0 || rabbit.age > maxAge) {
      dead.add(rabbit);
      state.deaths += 1;
      addParticle(rabbit.x, rabbit.y, "rgba(229,121,99,", 5);
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

function tryReproduce(rabbit, newborns) {
  const mate = findMate(rabbit);
  if (!mate || state.rabbits.length + newborns.length >= WORLD.maxRabbits) return;

  const cost = 31 + rabbit.genes.size * 14;
  rabbit.energy -= cost;
  mate.energy -= cost;
  rabbit.cooldown = lerp(90, 38, rabbit.genes.fertility);
  mate.cooldown = lerp(90, 38, mate.genes.fertility);

  const childGenes = inheritGenes(rabbit.genes, mate.genes);
  const child = createRabbit(
    clamp((rabbit.x + mate.x) * 0.5 + rand(-0.35, 0.35), 0.6, WORLD.width - 0.6),
    clamp((rabbit.y + mate.y) * 0.5 + rand(-0.35, 0.35), 0.6, WORLD.height - 0.6),
    childGenes,
    Math.max(rabbit.generation, mate.generation) + 1,
  );

  child.energy = 58;
  child.cooldown = 80;
  newborns.push(child);
  state.births += 1;
  addParticle(child.x, child.y, "rgba(104,212,189,", 8);
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

function findMate(rabbit) {
  if (rabbit.energy < reproductionEnergy(rabbit) || rabbit.cooldown > 0) return null;
  const radiusSq = 2.1 * 2.1;

  for (const other of state.rabbits) {
    if (other === rabbit || other.cooldown > 0 || other.energy < reproductionEnergy(other)) continue;
    if (distanceSq(rabbit, other) < radiusSq) return other;
  }

  return null;
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
