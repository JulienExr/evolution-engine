import { WORLD } from "../core/constants.js";
import { clamp, distanceSq, lerp, rand } from "../core/math.js";
import { state } from "../state.js";
import { createFox, createFoxGenes } from "./entities.js";
import { inheritFoxGenes } from "./genetics.js";
import { addParticle } from "./particles.js";
import { randomEdgePosition } from "./population.js";
import { isRabbitProtected } from "./refuges.js";
import { getFoxAverages } from "./stats.js";

export function stepFoxes(deadRabbits, dt) {
  const newbornFoxes = [];
  const deadFoxes = new Set();

  for (const fox of state.foxes) {
    fox.age += dt;
    fox.cooldown = Math.max(0, fox.cooldown - dt);
    fox.hop += dt * lerp(0.13, 0.24, fox.genes.speed);

    const maturity = clamp(fox.age / fox.maturityAge, 0.35, 1);
    const canReproduce = canFoxReproduce(fox);
    const mate = canReproduce ? findFoxMate(fox) : null;
    const shouldHunt = !mate || fox.energy < foxReproductionEnergy(fox) * 1.22;
    const target = shouldHunt && fox.age > fox.maturityAge * 0.42 ? findFoxTarget(fox, deadRabbits) : null;
    fox.targetRabbit = target;
    fox.targetMate = mate;
    fox.intent = mate && !target ? "mate" : target ? "hunt" : "prowl";

    const speed = lerp(0.035, 0.092, fox.genes.speed) * maturity;
    const sizeCost = lerp(0.72, 1.36, fox.genes.size);
    const speedCost = lerp(0.68, 1.42, fox.genes.speed);
    const metabolismCost = lerp(1.25, 0.72, fox.genes.metabolism);
    const pressureCost = lerp(0.82, 1.22, state.predatorPressure);
    fox.energy -= (target ? 0.042 : 0.026) * sizeCost * speedCost * metabolismCost * pressureCost * dt;
    moveFox(fox, target || mate, speed, dt);
    forageSmallPrey(fox, target, dt);

    const catchRadius = 0.45 + fox.genes.size * 0.24;
    if (target && !deadRabbits.has(target) && distanceSq(fox, target) < catchRadius * catchRadius) {
      if (isRabbitProtected(target)) {
        fox.energy -= 1.8 * dt;
        fox.targetRabbit = null;
      } else {
        deadRabbits.add(target);
        fox.energy = clamp(fox.energy + 58 + target.genes.size * 26 + fox.genes.metabolism * 12, 0, 210);
        fox.cooldown = Math.max(fox.cooldown, 80);
        state.deaths += 1;
        state.hunted += 1;
        addParticle(target.x, target.y, "rgba(255,190,99,", 12);
      }
    }

    if (mate && canReproduce && canFoxReproduce(mate) && distanceSq(fox, mate) < 1.65 * 1.65) {
      createFoxLitter(fox, mate, newbornFoxes);
    }

    const maxAge = lerp(3200, 2500, fox.genes.speed) + fox.genes.metabolism * 900 + fox.genes.size * 380;
    if (fox.energy <= 0 || fox.age > maxAge) {
      deadFoxes.add(fox);
      state.foxDeaths += 1;
      addParticle(fox.x, fox.y, "rgba(229,121,99,", 7);
    }
  }

  if (deadFoxes.size) {
    state.foxes = state.foxes.filter((fox) => !deadFoxes.has(fox));
  }

  if (newbornFoxes.length) {
    state.foxes.push(...newbornFoxes);
  }
}

export function seedFoxesIfExtinct() {
  if (state.predatorPressure <= 0.05 || state.foxes.length > 0 || state.rabbits.length < 24) return;

  if (state.tick % 900 === 0) {
    const generation = Math.max(1, Math.round(getFoxAverages().generation));
    for (let i = 0; i < 2 && state.foxes.length < WORLD.maxFoxes; i += 1) {
      const { x, y } = randomEdgePosition();
      state.foxes.push(createFox(x, y, rand(620, 1300), createFoxGenes(0.04), generation, i % 2 === 0 ? "female" : "male"));
      addParticle(x, y, "rgba(238,132,54,", 6);
    }
  }
}

function moveFox(fox, target, speed, dt) {
  let ax = 0;
  let ay = 0;

  if (target) {
    const dx = target.x - fox.x;
    const dy = target.y - fox.y;
    const d = Math.hypot(dx, dy) || 1;
    ax += (dx / d) * speed * 1.18;
    ay += (dy / d) * speed * 1.18;
  } else {
    fox.heading += rand(-0.08, 0.08);
    ax += Math.cos(fox.heading) * speed * 0.46;
    ay += Math.sin(fox.heading) * speed * 0.46;
  }

  const margin = 1.4;
  if (fox.x < margin) ax += speed * 1.5;
  if (fox.y < margin) ay += speed * 1.5;
  if (fox.x > WORLD.width - margin) ax -= speed * 1.5;
  if (fox.y > WORLD.height - margin) ay -= speed * 1.5;

  fox.vx = clamp((fox.vx + ax) * 0.86, -speed, speed);
  fox.vy = clamp((fox.vy + ay) * 0.86, -speed, speed);
  fox.x = clamp(fox.x + fox.vx * dt, 0.5, WORLD.width - 0.5);
  fox.y = clamp(fox.y + fox.vy * dt, 0.5, WORLD.height - 0.5);

  if (Math.abs(fox.vx) + Math.abs(fox.vy) > 0.001) {
    fox.heading = Math.atan2(fox.vy, fox.vx);
  }
}

function findFoxTarget(fox, deadRabbits) {
  if (state.rabbits.length < 24 && fox.energy > 54) return null;

  const vision = lerp(4.8, 13.5, fox.genes.vision) * lerp(0.88, 1.18, state.predatorPressure);
  const visionSq = vision * vision;
  let best = null;
  let bestScore = Infinity;

  for (const rabbit of state.rabbits) {
    if (deadRabbits.has(rabbit) || rabbit.age < 70 || isRabbitProtected(rabbit)) continue;

    const d = distanceSq(fox, rabbit);
    if (d > visionSq) continue;

    const vulnerability =
      (rabbit.pregnancy ? 0.7 : 0) +
      (rabbit.age < rabbit.maturityAge ? 0.55 : 0) +
      (1 - rabbit.genes.speed) * 0.75 +
      (1 - rabbit.genes.vision) * 0.45 +
      (rabbit.energy < 32 ? 0.5 : 0) +
      fox.genes.vision * 0.28 +
      fox.genes.speed * 0.2;
    const refugePenalty = rabbit.targetRefuge ? 1.18 : 1;
    const score = d * refugePenalty * lerp(1.08, 0.5, vulnerability);
    if (score < bestScore) {
      best = rabbit;
      bestScore = score;
    }
  }

  return best;
}

function forageSmallPrey(fox, target, dt) {
  if (target || fox.energy > foxReproductionEnergy(fox) * 0.92) return;

  const habitat = state.droughtTimer > 0 ? 0.45 : 1;
  const skill = fox.genes.vision * 0.34 + fox.genes.speed * 0.24 + fox.genes.metabolism * 0.42;
  const chance = 0.0018 * habitat * lerp(0.7, 1.35, skill) * dt;
  if (Math.random() > chance) return;

  fox.energy = clamp(fox.energy + rand(10, 22) * lerp(0.75, 1.18, fox.genes.metabolism), 0, 210);
  addParticle(fox.x, fox.y, "rgba(238,132,54,", 3);
}

function canFoxReproduce(fox) {
  return fox.age >= fox.maturityAge && fox.cooldown <= 0 && fox.energy > foxReproductionEnergy(fox) && state.predatorPressure > 0.04;
}

function foxReproductionEnergy(fox) {
  return lerp(150, 116, fox.genes.fertility) + fox.genes.size * 18;
}

function findFoxMate(fox) {
  const radiusSq = lerp(2.2, 4.4, fox.genes.vision) ** 2;
  let best = null;
  let bestScore = -Infinity;

  for (const other of state.foxes) {
    if (other === fox || other.sex === fox.sex || !canFoxReproduce(other)) continue;
    const d = distanceSq(fox, other);
    if (d > radiusSq) continue;

    const fitness =
      other.genes.speed * 0.32 +
      other.genes.vision * 0.28 +
      other.genes.metabolism * 0.22 +
      (other.energy / 210) * 0.18;
    const score = fitness - d * 0.045;
    if (score > bestScore) {
      best = other;
      bestScore = score;
    }
  }

  return best;
}

function createFoxLitter(parentA, parentB, newbornFoxes) {
  const capacity = getFoxCarryingCapacity();
  if (state.foxes.length + newbornFoxes.length >= capacity) return;

  const fertility = (parentA.genes.fertility + parentB.genes.fertility) * 0.5;
  const preyBonus = state.rabbits.length > 90 ? 1 : state.rabbits.length > 42 ? 0.55 : 0;
  const litterSize = clamp(Math.round(1 + fertility * 2.2 + preyBonus + rand(-0.55, 0.65)), 1, 3);
  const freeSlots = capacity - state.foxes.length - newbornFoxes.length;

  for (let i = 0; i < Math.min(litterSize, freeSlots); i += 1) {
    const childGenes = inheritFoxGenes(parentA.genes, parentB.genes);
    const child = createFox(
      clamp((parentA.x + parentB.x) * 0.5 + rand(-0.75, 0.75), 0.7, WORLD.width - 0.7),
      clamp((parentA.y + parentB.y) * 0.5 + rand(-0.75, 0.75), 0.7, WORLD.height - 0.7),
      0,
      childGenes,
      Math.max(parentA.generation, parentB.generation) + 1,
    );
    child.energy = 74 + child.genes.metabolism * 12;
    child.cooldown = child.maturityAge;
    newbornFoxes.push(child);
    state.foxBirths += 1;
    addParticle(child.x, child.y, "rgba(238,132,54,", 8);
  }

  const cost = 34 + litterSize * 12;
  parentA.energy -= cost;
  parentB.energy -= cost * 0.55;
  parentA.cooldown = lerp(880, 460, parentA.genes.fertility);
  parentB.cooldown = lerp(760, 420, parentB.genes.fertility);
}

function getFoxCarryingCapacity() {
  if (state.predatorPressure <= 0.02) return 0;
  const preyCapacity = Math.floor(state.rabbits.length / 5);
  const habitatCapacity = Math.round(3 + state.predatorPressure * 10);
  return clamp(Math.min(WORLD.maxFoxes, preyCapacity + habitatCapacity), 2, WORLD.maxFoxes);
}
