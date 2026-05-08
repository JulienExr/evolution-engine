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
    const legendHeight = drawLegend(width);

    chartCtx.strokeStyle = "rgba(241,244,236,0.08)";
    chartCtx.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = legendHeight + ((height - legendHeight - 8) / 4) * i;
      chartCtx.beginPath();
      chartCtx.moveTo(0, y);
      chartCtx.lineTo(width, y);
      chartCtx.stroke();
    }

    if (state.history.length < 2) return;

    const maxPopulation = Math.max(
      20,
      ...state.history.map((point) => point.population),
      ...state.history.map((point) => point.foxes),
    );
    plotLine(
      state.history.map((point) => point.population / maxPopulation),
      "#d7ef6f",
      legendHeight,
    );
    plotLine(
      state.history.map((point) => point.foxes / maxPopulation),
      "#ee8436",
      legendHeight,
    );
  }

  function plotLine(values, color, top) {
    const width = chart.clientWidth;
    const height = chart.clientHeight;
    const bottom = 8;
    chartCtx.strokeStyle = color;
    chartCtx.lineWidth = 2;
    chartCtx.beginPath();
    values.forEach((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - bottom - clamp(value, 0, 1) * (height - top - bottom);
      if (index === 0) chartCtx.moveTo(x, y);
      else chartCtx.lineTo(x, y);
    });
    chartCtx.stroke();
  }

  function drawLegend(width) {
    const items = [
      ["Lapins", "#d7ef6f"],
      ["Renards", "#ee8436"],
    ];

    chartCtx.save();
    chartCtx.font = "11px Inter, ui-sans-serif, system-ui, sans-serif";
    chartCtx.textBaseline = "middle";
    let x = 10;
    let y = 11;
    for (const [label, color] of items) {
      const itemWidth = chartCtx.measureText(label).width + 34;
      if (x > 10 && x + itemWidth > width - 8) {
        x = 10;
        y += 15;
      }
      chartCtx.fillStyle = color;
      chartCtx.fillRect(x, y - 1, 10, 3);
      chartCtx.fillStyle = "rgba(241,244,236,0.72)";
      chartCtx.fillText(label, x + 14, y);
      x += itemWidth;
    }
    chartCtx.restore();
    return y + 13;
  }

  return { draw, resize };
}
