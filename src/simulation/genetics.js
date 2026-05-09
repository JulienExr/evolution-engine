import { rand } from "../core/math.js";
import { state } from "../state.js";
import { normalizeGene } from "./entities.js";

export function mutateGene(value) {
  return normalizeGene(value + rand(-state.mutationRate, state.mutationRate));
}

export function inheritGenes(a, b) {
  return {
    speed: mutateGene((a.speed + b.speed) * 0.5),
    vision: mutateGene((a.vision + b.vision) * 0.5),
    metabolism: mutateGene((a.metabolism + b.metabolism) * 0.5),
    fertility: mutateGene((a.fertility + b.fertility) * 0.5),
    size: mutateGene((a.size + b.size) * 0.5),
  };
}

export function inheritFoxGenes(a, b) {
  return inheritGenes(a, b);
}
