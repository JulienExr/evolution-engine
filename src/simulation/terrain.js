import { WORLD } from "../core/constants.js";
import { clamp, rand } from "../core/math.js";

export function terrainHeight(x, y) {
  const nx = x / WORLD.width;
  const ny = y / WORLD.height;
  return (
    Math.sin(nx * Math.PI * 2.1 + 0.35) * 0.48 +
    Math.cos(ny * Math.PI * 2.4 - 0.8) * 0.34 +
    Math.sin((nx + ny) * Math.PI * 2.8) * 0.22
  );
}

export function terrainMoisture(x, y) {
  const cx = WORLD.width * 0.57;
  const cy = WORLD.height * 0.4;
  const dx = (x - cx) / WORLD.width;
  const dy = (y - cy) / WORLD.height;
  return clamp(1 - Math.sqrt(dx * dx + dy * dy) * 2.3, 0, 1);
}

export function terrainBiome(x, y, h, moisture) {
  const patch = Math.sin(x * 0.68 + y * 0.21) + Math.cos(y * 0.57 - x * 0.18);

  if (moisture > 0.78) return "wetland";
  if (moisture < 0.18 || h > 0.62) return "dry";
  if (patch > 1.1 && moisture > 0.32) return "thicket";
  if (moisture > 0.52) return "meadow";
  return "grassland";
}

export function biomeStats(biome) {
  if (biome === "wetland") return { forage: 0.88, cover: 0.5 };
  if (biome === "dry") return { forage: 0.52, cover: 0.16 };
  if (biome === "thicket") return { forage: 1.04, cover: 1 };
  if (biome === "meadow") return { forage: 1.35, cover: 0.36 };
  return { forage: 1, cover: 0.25 };
}

export function buildTerrain() {
  const terrain = [];

  for (let y = 0; y < WORLD.height; y += 1) {
    for (let x = 0; x < WORLD.width; x += 1) {
      const h = terrainHeight(x, y);
      const moisture = terrainMoisture(x, y);
      const shade = clamp(0.52 + h * 0.16 + moisture * 0.18 + rand(-0.03, 0.03), 0, 1);
      const grass = rand(0.35, 1);
      const biome = terrainBiome(x, y, h, moisture);
      const { forage, cover } = biomeStats(biome);
      const blades = [];

      if (grass > 0.82) {
        const count = grass > 0.94 ? 3 : 2;
        for (let i = 0; i < count; i += 1) {
          blades.push({
            ox: rand(-0.24, 0.24) + i * 0.08,
            oy: rand(-0.12, 0.16),
            bend: rand(-2, 2),
            height: rand(4, 8),
          });
        }
      }

      terrain.push({ x, y, h, moisture, shade, grass, biome, forage, cover, blades });
    }
  }

  return terrain;
}

export function getTerrainAt(terrain, x, y) {
  const tx = clamp(Math.floor(x), 0, WORLD.width - 1);
  const ty = clamp(Math.floor(y), 0, WORLD.height - 1);
  return (
    terrain[ty * WORLD.width + tx] || {
      h: 0,
      moisture: 0.5,
      shade: 0.6,
      biome: "grassland",
      forage: 1,
      cover: 0.25,
      blades: [],
    }
  );
}
