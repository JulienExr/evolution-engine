import { state } from "../state.js";

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

export function getFoxAverages() {
  if (!state.foxes.length) {
    return { speed: 0, vision: 0, metabolism: 0, size: 0, fertility: 0, generation: 0 };
  }

  const totals = state.foxes.reduce(
    (acc, fox) => {
      acc.speed += fox.genes.speed;
      acc.vision += fox.genes.vision;
      acc.metabolism += fox.genes.metabolism;
      acc.size += fox.genes.size;
      acc.fertility += fox.genes.fertility;
      acc.generation += fox.generation;
      return acc;
    },
    { speed: 0, vision: 0, metabolism: 0, size: 0, fertility: 0, generation: 0 },
  );

  const count = state.foxes.length;
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
  state.history.push({
    tick: state.tick,
    population: state.rabbits.length,
    foxes: state.foxes.length,
  });
  if (state.history.length > 180) state.history.shift();
}
