import { clamp } from "../core/math.js";
import { state } from "../state.js";

export function createChartRenderer(chart) {
  const chartCtx = chart.getContext("2d");
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const chartRect = chart.getBoundingClientRect();
    chart.width = Math.max(1, Math.floor(chartRect.width * dpr));
    chart.height = Math.max(1, Math.floor(chartRect.height * dpr));
    chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    chartCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = chart.clientWidth;
    const height = chart.clientHeight;

    chartCtx.clearRect(0, 0, width, height);
    chartCtx.fillStyle = "rgba(255,255,255,0.035)";
    chartCtx.fillRect(0, 0, width, height);

    chartCtx.strokeStyle = "rgba(241,244,236,0.08)";
    chartCtx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = (height / 4) * i;
      chartCtx.beginPath();
      chartCtx.moveTo(0, y);
      chartCtx.lineTo(width, y);
      chartCtx.stroke();
    }

    if (state.history.length < 2) return;

    const maxPopulation = Math.max(20, ...state.history.map((point) => point.population));
    plotLine(
      state.history.map((point) => point.population / maxPopulation),
      "#d7ef6f",
    );
    plotLine(
      state.history.map((point) => point.speed),
      "#68d4bd",
    );
  }

  function plotLine(values, color) {
    const width = chart.clientWidth;
    const height = chart.clientHeight;
    chartCtx.strokeStyle = color;
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();
    values.forEach((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - clamp(value, 0, 1) * (height - 18) - 9;
      if (index === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });
    chartCtx.stroke();
  }

  return { draw, resize };
}
