import { WORLD } from "../core/constants.js";
import { clamp, lerp } from "../core/math.js";
import { state } from "../state.js";
import { getTerrainAt } from "../simulation/terrain.js";

export function createWorldRenderer(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    const drought = state.droughtTimer > 0;
    const seasonWarmth = state.seasons ? Math.sin(state.tick / 560) : 0;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, drought ? "#3c3527" : seasonWarmth < -0.45 ? "#223a3a" : "#273b35");
    sky.addColorStop(0.46, drought ? "#282419" : "#1b2824");
    sky.addColorStop(1, "#111614");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    drawTerrain();

    const drawables = [];
    for (const food of state.food) drawables.push({ kind: "food", y: food.x + food.y, item: food });
    for (const rabbit of state.rabbits) drawables.push({ kind: "rabbit", y: rabbit.x + rabbit.y + 0.12, item: rabbit });
    for (const fox of state.foxes) drawables.push({ kind: "fox", y: fox.x + fox.y + 0.18, item: fox });
    for (const particle of state.particles) {
      drawables.push({ kind: "particle", y: particle.x + particle.y + particle.z, item: particle });
    }
    drawables.sort((a, b) => a.y - b.y);

    for (const drawable of drawables) {
      if (drawable.kind === "food") drawFood(drawable.item);
      if (drawable.kind === "rabbit") drawRabbit(drawable.item);
      if (drawable.kind === "fox") drawFox(drawable.item);
      if (drawable.kind === "particle") drawParticle(drawable.item);
    }

    drawVignette(w, h);
    ctx.restore();
  }

  function attachCameraControls() {
    canvas.addEventListener("pointerdown", (event) => {
      state.camera.drag = true;
      state.camera.lastX = event.clientX;
      state.camera.lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", (event) => {
      if (!state.camera.drag) return;
      const dx = event.clientX - state.camera.lastX;
      const dy = event.clientY - state.camera.lastY;
      state.camera.x += dx;
      state.camera.y += dy;
      state.camera.lastX = event.clientX;
      state.camera.lastY = event.clientY;
    });

    canvas.addEventListener("pointerup", (event) => {
      state.camera.drag = false;
      canvas.releasePointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointercancel", () => {
      state.camera.drag = false;
    });

    canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const before = state.camera.zoom;
        state.camera.zoom = clamp(state.camera.zoom + (event.deltaY > 0 ? -0.08 : 0.08), 0.62, 1.55);
        const factor = state.camera.zoom / before;
        state.camera.x *= factor;
        state.camera.y *= factor;
      },
      { passive: false },
    );
  }

  function worldToIso(x, y, z = 0) {
    const tileW = WORLD.tileW * state.camera.zoom;
    const tileH = WORLD.tileH * state.camera.zoom;
    return {
      x: (x - y) * tileW * 0.5 + canvas.clientWidth * 0.5 + state.camera.x,
      y:
        (x + y) * tileH * 0.5 +
        canvas.clientHeight * 0.17 +
        state.camera.y -
        z * WORLD.elevation * state.camera.zoom,
    };
  }

  function drawDiamond(cx, cy, w, h, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.5);
    ctx.lineTo(cx + w * 0.5, cy);
    ctx.lineTo(cx, cy + h * 0.5);
    ctx.lineTo(cx - w * 0.5, cy);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  function grassColor(tile) {
    const wet = tile.moisture;
    const drought = state.droughtTimer > 0 ? 1 : 0;
    const winter = state.seasons ? clamp(-Math.sin(state.tick / 560), 0, 1) : 0;
    const r = Math.round(58 + tile.shade * 38 - wet * 10 + drought * 36 + winter * 4);
    const g = Math.round(104 + tile.shade * 82 + wet * 28 - drought * 42 - winter * 18);
    const b = Math.round(65 + tile.shade * 38 + wet * 18 - drought * 20 + winter * 18);
    return `rgb(${r},${g},${b})`;
  }

  function drawTerrain() {
    for (const tile of state.terrain) {
      const p = worldToIso(tile.x + 0.5, tile.y + 0.5, tile.h);
      const w = WORLD.tileW * state.camera.zoom + 0.8;
      const h = WORLD.tileH * state.camera.zoom + 0.8;
      const fill = grassColor(tile);
      drawDiamond(p.x, p.y, w, h, fill, "rgba(12,24,18,0.12)");

      if (tile.moisture > 0.74) {
        drawDiamond(
          p.x,
          p.y + h * 0.03,
          w * 0.92,
          h * 0.72,
          `rgba(66, 132, 139, ${0.16 + tile.moisture * 0.16})`,
          null,
        );
      }

      if (tile.blades.length && state.camera.zoom > 0.72) {
        ctx.strokeStyle = "rgba(221,239,157,0.18)";
        ctx.lineWidth = Math.max(1, state.camera.zoom);
        for (const blade of tile.blades) {
          const ox = blade.ox * w;
          const oy = blade.oy * h;
          ctx.beginPath();
          ctx.moveTo(p.x + ox, p.y + oy);
          ctx.lineTo(p.x + ox + blade.bend, p.y + oy - blade.height * state.camera.zoom);
          ctx.stroke();
        }
      }
    }
  }

  function rabbitColor(rabbit) {
    const speed = rabbit.genes.speed;
    const metabolism = rabbit.genes.metabolism;
    const sexTint = rabbit.sex === "female" ? 8 : -6;
    const r = Math.round(174 + speed * 46 + sexTint);
    const g = Math.round(166 + metabolism * 42);
    const b = Math.round(136 + rabbit.genes.vision * 42 - sexTint);
    return `rgb(${r},${g},${b})`;
  }

  function drawFood(food) {
    const tile = getTerrainAt(state.terrain, food.x, food.y);
    const p = worldToIso(food.x, food.y, tile.h + 0.08);
    const zoom = state.camera.zoom;
    const size = (4.5 + food.growth * 6) * zoom;
    const sway = Math.sin(food.sway) * 1.6 * zoom;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.fillStyle = "rgba(23,36,25,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, size * 0.55, size * 0.85, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(139, 204, 91, 0.9)";
    ctx.lineWidth = Math.max(1, 1.8 * zoom);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.35);
    ctx.quadraticCurveTo(sway, -size * 0.2, sway * 0.5, -size * 0.95);
    ctx.stroke();

    ctx.fillStyle = "rgba(216, 239, 102, 0.92)";
    ctx.beginPath();
    ctx.ellipse(sway * 0.5, -size * 0.82, size * 0.34, size * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRabbit(rabbit) {
    rabbit.renderX = lerp(rabbit.renderX ?? rabbit.x, rabbit.x, 0.34);
    rabbit.renderY = lerp(rabbit.renderY ?? rabbit.y, rabbit.y, 0.34);

    const tile = getTerrainAt(state.terrain, rabbit.renderX, rabbit.renderY);
    const hop = Math.max(0, Math.sin(rabbit.hop)) * 0.26;
    const p = worldToIso(rabbit.renderX, rabbit.renderY, tile.h + hop);
    const maturity = clamp(rabbit.age / rabbit.maturityAge, 0, 1);
    const ageScale = lerp(0.48, 1, maturity);
    const pregnancyScale = rabbit.pregnancy ? 1.08 : 1;
    const scale = lerp(0.66, 1.22, rabbit.genes.size) * ageScale * pregnancyScale * state.camera.zoom;
    const direction = rabbit.heading;
    const dx = Math.cos(direction);
    const earBoost = lerp(0.84, 1.42, rabbit.genes.vision);
    const body = rabbitColor(rabbit);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = "rgba(6,12,9,0.26)";
    ctx.beginPath();
    ctx.ellipse(0, 8, 10 * pregnancyScale, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (rabbit.pregnancy) {
      const pulse = 0.45 + Math.sin(state.tick / 18 + rabbit.age * 0.02) * 0.12;
      ctx.strokeStyle = `rgba(104,212,189,${pulse})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 1.5, 12, 6.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.rotate(direction * 0.18);
    ctx.fillStyle = body;
    ctx.strokeStyle = "rgba(40,34,26,0.18)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.ellipse(0, 0, rabbit.pregnancy ? 9.8 : 8.8, rabbit.pregnancy ? 6.4 : 5.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(6.8 * Math.sign(dx || 1), -3.2, 4.7, 4.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(235,226,202,0.96)";
    ctx.beginPath();
    ctx.ellipse(-7.2 * Math.sign(dx || 1), -0.4, 2.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(5.5 * Math.sign(dx || 1), -9.8, 1.55, 5.8 * earBoost, -0.24, 0, Math.PI * 2);
    ctx.ellipse(8.8 * Math.sign(dx || 1), -9.3, 1.45, 5.3 * earBoost, 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(67,53,42,0.85)";
    ctx.beginPath();
    ctx.arc(9.4 * Math.sign(dx || 1), -4.2, 0.8, 0, Math.PI * 2);
    ctx.fill();

    if (rabbit.energy < 28) {
      ctx.strokeStyle = "rgba(229,121,99,0.7)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0.2, Math.PI * 1.3);
      ctx.stroke();
    }

    if (rabbit.intent === "mate" && maturity >= 1) {
      ctx.fillStyle = "rgba(104,212,189,0.85)";
      ctx.beginPath();
      ctx.arc(-2.5, -8.8, 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFox(fox) {
    fox.renderX = lerp(fox.renderX ?? fox.x, fox.x, 0.38);
    fox.renderY = lerp(fox.renderY ?? fox.y, fox.y, 0.38);

    const tile = getTerrainAt(state.terrain, fox.renderX, fox.renderY);
    const hop = Math.max(0, Math.sin(fox.hop)) * 0.18;
    const p = worldToIso(fox.renderX, fox.renderY, tile.h + hop + 0.02);
    const maturity = clamp(fox.age / fox.maturityAge, 0.42, 1);
    const scale = lerp(0.72, 1.18, maturity) * lerp(0.84, 1.2, fox.genes.size) * state.camera.zoom;
    const direction = fox.heading;
    const dx = Math.cos(direction);
    const facing = Math.sign(dx || 1);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = "rgba(6,12,9,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 8.5, 13, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (fox.intent === "hunt") {
      ctx.strokeStyle = "rgba(255,190,99,0.35)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.ellipse(0, 1, 15, 7, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.rotate(direction * 0.16);

    const red = Math.round(188 + fox.genes.speed * 54);
    const green = Math.round(82 + fox.genes.metabolism * 54);
    const blue = Math.round(34 + fox.genes.vision * 24);
    const body = fox.energy < 34 ? "#b86432" : `rgb(${red},${green},${blue})`;
    const dark = "#6e3c2e";
    const cream = "#f2dbc2";

    ctx.fillStyle = body;
    ctx.strokeStyle = "rgba(35,24,18,0.26)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.ellipse(0, 0, 11.8, lerp(4.6, 5.8, fox.genes.size), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(7.7 * facing, -3.4, 5.2, 4.2, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(5.8 * facing, -6.7);
    ctx.lineTo(7.6 * facing, -13.2);
    ctx.lineTo(9.4 * facing, -6.5);
    ctx.closePath();
    ctx.moveTo(10.1 * facing, -6.2);
    ctx.lineTo(12.4 * facing, -12.4);
    ctx.lineTo(13.1 * facing, -5.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.ellipse(10.6 * facing, -1.6, 2.4, 1.65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(11.4 * facing, -4.3, 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-10.5 * facing, -0.4, lerp(7.2, 9.7, fox.genes.speed), 2.8, -0.18 * facing, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = cream;
    ctx.beginPath();
    ctx.ellipse(-17.4 * facing, -0.8, 3.2, 1.8, -0.18 * facing, 0, Math.PI * 2);
    ctx.fill();

    if (fox.energy < 30) {
      ctx.strokeStyle = "rgba(229,121,99,0.76)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 13.5, 0.16, Math.PI * 1.34);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawParticle(particle) {
    const tile = getTerrainAt(state.terrain, particle.x, particle.y);
    const p = worldToIso(particle.x, particle.y, tile.h + particle.z);
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = `${particle.color}${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(1, 2.8 * state.camera.zoom * alpha), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawVignette(w, h) {
    const gradient = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.1, w * 0.5, h * 0.45, h * 0.78);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  return { attachCameraControls, render, resize };
}
