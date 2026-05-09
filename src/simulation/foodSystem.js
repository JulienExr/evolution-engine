import { WORLD } from "../core/constants.js";
import { clamp, rand } from "../core/math.js";
import { state } from "../state.js";
import { createFood } from "./entities.js";
import { getTerrainAt } from "./terrain.js";

export const FOOD_EDGE_MARGIN = 3;

export function createFoodInHabitat() {
  const interiorTiles = state.terrain.filter(isInteriorFoodTile);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const tile = interiorTiles[Math.floor(rand(0, interiorTiles.length))];
    if (!tile) break;

    const acceptance = tile.forage * (tile.biome === "wetland" ? 0.58 : 1);
    if (Math.random() > acceptance / 1.5) continue;

    const food = createFood(tile.x + rand(0.18, 0.82), tile.y + rand(0.18, 0.82));
    food.energy *= clamp(tile.forage, 0.58, 1.42);
    food.growth = clamp(food.growth * clamp(tile.forage, 0.72, 1.18), 0.34, 1);
    return food;
  }

  return createFood(rand(FOOD_EDGE_MARGIN, WORLD.width - FOOD_EDGE_MARGIN), rand(FOOD_EDGE_MARGIN, WORLD.height - FOOD_EDGE_MARGIN));
}

function isInteriorFoodTile(tile) {
  return (
    tile.x >= FOOD_EDGE_MARGIN &&
    tile.y >= FOOD_EDGE_MARGIN &&
    tile.x <= WORLD.width - FOOD_EDGE_MARGIN - 1 &&
    tile.y <= WORLD.height - FOOD_EDGE_MARGIN - 1
  );
}

export function isFoodInsidePlayableArea(food) {
  return (
    food.x >= FOOD_EDGE_MARGIN &&
    food.y >= FOOD_EDGE_MARGIN &&
    food.x <= WORLD.width - FOOD_EDGE_MARGIN &&
    food.y <= WORLD.height - FOOD_EDGE_MARGIN
  );
}

export function seedFood(count) {
  for (let i = 0; i < count; i += 1) {
    state.food.push(createFoodInHabitat());
  }
}

export function stepFood(climateGrowth, dt) {
  state.food = state.food.filter(isFoodInsidePlayableArea);

  if (state.food.length < state.foodTarget && Math.random() < 0.26 * climateGrowth) {
    state.food.push(createFoodInHabitat());
  }

  for (const food of state.food) {
    const tile = getTerrainAt(state.terrain, food.x, food.y);
    const habitatGrowth = clamp(tile.forage, 0.5, 1.42);
    food.growth = clamp(food.growth + 0.0028 * climateGrowth * habitatGrowth, 0, 1);
    if (state.droughtTimer > 0) food.growth = clamp(food.growth - 0.0022 * dt, 0.2, 1);
    food.sway += 0.025;
  }
}
