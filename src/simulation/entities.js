import { WORLD } from "../core/constants.js";
import { clamp, lerp, makeId, rand } from "../core/math.js";

export function normalizeGene(value) {
  return clamp(value, 0.1, 1);
}

export function createGenes(seedBias = 0) {
  return {
    speed: normalizeGene(rand(0.28, 0.74) + seedBias),
    vision: normalizeGene(rand(0.24, 0.78) + seedBias * 0.4),
    metabolism: normalizeGene(rand(0.28, 0.78) - seedBias * 0.25),
    fertility: normalizeGene(rand(0.28, 0.74)),
    size: normalizeGene(rand(0.34, 0.84)),
  };
}

export function createRabbit(x, y, genes = createGenes(), generation = 1, sex = Math.random() < 0.5 ? "female" : "male") {
  return {
    id: makeId(),
    x,
    y,
    renderX: x,
    renderY: y,
    vx: rand(-0.01, 0.01),
    vy: rand(-0.01, 0.01),
    heading: rand(-Math.PI, Math.PI),
    energy: rand(58, 88),
    age: 0,
    generation,
    sex,
    maturityAge: Math.round(lerp(420, 260, genes.fertility) + genes.size * 70),
    cooldown: rand(0, 80),
    pregnancy: null,
    nursing: 0,
    genes,
    targetFood: null,
    targetMate: null,
    intent: "wander",
    hop: rand(0, Math.PI * 2),
  };
}

export function createFood(x = rand(2, WORLD.width - 2), y = rand(2, WORLD.height - 2)) {
  return {
    id: makeId(),
    x,
    y,
    energy: rand(16, 28),
    growth: rand(0.68, 1),
    sway: rand(0, Math.PI * 2),
  };
}

export function reproductionEnergy(rabbit) {
  return lerp(76, 112, 1 - rabbit.genes.fertility) + rabbit.genes.size * 12;
}
