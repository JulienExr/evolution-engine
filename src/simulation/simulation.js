import { state } from "../state.js";
import { clamp } from "../core/math.js";
import { stepFood } from "./foodSystem.js";
import { seedFoxesIfExtinct, stepFoxes } from "./foxesSystem.js";
import { updateParticles } from "./particles.js";
import { introduceFoxes, introduceRabbits, resetSimulation, triggerDrought } from "./population.js";
import { commitRabbitStep, stepRabbits } from "./rabbitsSystem.js";
import { getAverages, getFoxAverages, recordHistory } from "./stats.js";

export { getAverages, getFoxAverages, introduceFoxes, introduceRabbits, recordHistory, resetSimulation, triggerDrought };

export function stepSimulation(dt) {
  state.tick += 1;
  state.droughtTimer = Math.max(0, state.droughtTimer - dt);

  const seasonWave = state.seasons ? 0.86 + Math.sin(state.tick / 560) * 0.28 : 1;
  const droughtGrowth = state.droughtTimer > 0 ? 0.36 : 1;
  const climateBase = state.climate === "lush" ? 1.55 : state.climate === "dry" ? 0.55 : 1;
  const climateGrowth = clamp(climateBase * seasonWave * droughtGrowth, 0.15, 2.1);
  const pressureCost = state.pressure === "high" ? 1.36 : state.pressure === "medium" ? 1.14 : 1;

  stepFood(climateGrowth, dt);
  const { dead, newborns } = stepRabbits(dt, pressureCost);
  stepFoxes(dead, dt);
  seedFoxesIfExtinct();
  commitRabbitStep(dead, newborns);
  updateParticles(dt);

  if (state.tick % 18 === 0) {
    recordHistory();
  }
}
