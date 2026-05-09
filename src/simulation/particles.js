import { rand } from "../core/math.js";
import { state } from "../state.js";

export function addParticle(x, y, color, count = 6) {
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

export function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const particle = state.particles[i];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.z += particle.vz * dt;
    particle.vz -= 0.0025 * dt;
    particle.life -= dt;
    if (particle.life <= 0) state.particles.splice(i, 1);
  }
}
