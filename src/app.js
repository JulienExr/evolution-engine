import { createChartRenderer } from "./rendering/chartRenderer.js";
import { createWorldRenderer } from "./rendering/worldRenderer.js";
import { getAverages, recordHistory, resetSimulation, stepSimulation } from "./simulation/simulation.js";
import { state } from "./state.js";
import { bindUiControls, getUi, updateStats } from "./ui.js";

const canvas = document.querySelector("#world");
const chart = document.querySelector("#chart");
const ui = getUi();

const worldRenderer = createWorldRenderer(canvas);
const chartRenderer = createChartRenderer(chart);

let lastFrame = performance.now();
let simAccumulator = 0;

function resize() {
  worldRenderer.resize();
  chartRenderer.resize();
}

function updateUI() {
  updateStats(ui, state, getAverages());
  chartRenderer.draw();
}

function reset() {
  resetSimulation();
  recordHistory();
  updateUI();
  worldRenderer.render();
}

function frame(now) {
  const dt = Math.min(48, now - lastFrame);
  lastFrame = now;

  if (state.running) {
    simAccumulator += dt * state.simSpeed;
    const step = 16.666;
    while (simAccumulator >= step) {
      stepSimulation(1);
      simAccumulator -= step;
    }
  }

  worldRenderer.render();
  if (state.tick % 10 === 0) updateUI();
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
bindUiControls(ui, state, { onReset: reset });
worldRenderer.attachCameraControls();

resize();
reset();
requestAnimationFrame(frame);
