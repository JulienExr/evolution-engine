import { WORLD } from "../core/constants.js";
import { rand } from "../core/math.js";
import { state } from "../state.js";
import { createFox, createFoxGenes, createGenes, createRabbit } from "./entities.js";
import { seedFood } from "./foodSystem.js";
import { addParticle } from "./particles.js";
import { buildRefuges } from "./refuges.js";
import { getAverages, getFoxAverages } from "./stats.js";
import { buildTerrain } from "./terrain.js";

export function resetSimulation() {
  state.rabbits = [];
  state.foxes = [];
  state.food = [];
  state.particles = [];
  state.terrain = buildTerrain();
  state.refuges = buildRefuges(state.terrain);
  state.history = [];
  state.selection = null;
  state.camera.x = 0;
  state.camera.y = 0;
  state.camera.zoom = 1;
  state.camera.drag = false;
  state.tick = 0;
  state.births = 0;
  state.deaths = 0;
  state.foxBirths = 0;
  state.foxDeaths = 0;
  state.hunted = 0;
  state.droughtTimer = 0;

  seedFood(state.foodTarget);

  for (let i = 0; i < WORLD.initialRabbits; i += 1) {
    const sex = i % 2 === 0 ? "female" : "male";
    const rabbit = createRabbit(rand(5, WORLD.width - 5), rand(5, WORLD.height - 5), createGenes(), 1, sex);
    const startsAdult = i < WORLD.initialRabbits * 0.74;
    rabbit.age = startsAdult ? rand(rabbit.maturityAge + 20, rabbit.maturityAge + 760) : rand(40, rabbit.maturityAge * 0.72);
    rabbit.cooldown = startsAdult ? rand(0, 55) : rabbit.maturityAge - rabbit.age;
    state.rabbits.push(rabbit);
  }

  for (let i = 0; i < getInitialFoxCount(); i += 1) {
    const fox = createFox(
      rand(4, WORLD.width - 4),
      rand(4, WORLD.height - 4),
      rand(620, 1800),
      createFoxGenes(),
      1,
      i % 2 === 0 ? "female" : "male",
    );
    fox.cooldown = rand(0, 420);
    state.foxes.push(fox);
  }
}

export function triggerDrought() {
  state.droughtTimer = Math.max(state.droughtTimer, 720);
  state.food = state.food.filter(() => Math.random() > 0.22);
  addParticle(WORLD.width * 0.5, WORLD.height * 0.48, "rgba(229,121,99,", 36);
}

export function introduceRabbits() {
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

export function introduceFoxes(count = 3) {
  for (let i = 0; i < count && state.foxes.length < WORLD.maxFoxes; i += 1) {
    const { x, y } = randomEdgePosition();
    const generation = Math.max(1, Math.round(getFoxAverages().generation));
    const fox = createFox(x, y, rand(560, 1300), createFoxGenes(rand(-0.02, 0.1)), generation, i % 2 === 0 ? "female" : "male");
    fox.cooldown = rand(0, 500);
    state.foxes.push(fox);
    addParticle(x, y, "rgba(238,132,54,", 6);
  }
}

export function getInitialFoxCount() {
  if (state.predatorPressure <= 0.02) return 0;
  return Math.min(10, Math.max(2, Math.round(2 + state.predatorPressure * 8)));
}

export function randomEdgePosition() {
  const side = Math.floor(rand(0, 4));
  if (side === 0) return { x: rand(1, WORLD.width - 1), y: rand(0.6, 2.2) };
  if (side === 1) return { x: rand(1, WORLD.width - 1), y: rand(WORLD.height - 2.2, WORLD.height - 0.6) };
  if (side === 2) return { x: rand(0.6, 2.2), y: rand(1, WORLD.height - 1) };
  return { x: rand(WORLD.width - 2.2, WORLD.width - 0.6), y: rand(1, WORLD.height - 1) };
}
