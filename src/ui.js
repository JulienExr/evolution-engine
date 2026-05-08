export function getUi() {
  return {
    pauseBtn: document.querySelector("#pauseBtn"),
    resetBtn: document.querySelector("#resetBtn"),
    speedInput: document.querySelector("#speedInput"),
    speedLabel: document.querySelector("#speedLabel"),
    foodInput: document.querySelector("#foodInput"),
    mutationInput: document.querySelector("#mutationInput"),
    climateBtn: document.querySelector("#climateBtn"),
    pressureBtn: document.querySelector("#pressureBtn"),
    population: document.querySelector("#statPopulation"),
    generation: document.querySelector("#statGeneration"),
    births: document.querySelector("#statBirths"),
    deaths: document.querySelector("#statDeaths"),
    traitSpeed: document.querySelector("#traitSpeed"),
    traitVision: document.querySelector("#traitVision"),
    traitMetabolism: document.querySelector("#traitMetabolism"),
    traitSize: document.querySelector("#traitSize"),
  };
}

export function bindUiControls(ui, state, { onReset }) {
  ui.pauseBtn.addEventListener("click", () => {
    state.running = !state.running;
    ui.pauseBtn.textContent = state.running ? "Pause" : "Lecture";
  });

  ui.resetBtn.addEventListener("click", onReset);

  ui.speedInput.addEventListener("input", () => {
    state.simSpeed = Number(ui.speedInput.value);
    ui.speedLabel.textContent = `${state.simSpeed.toFixed(2).replace(/\.00$/, "")}x`;
  });

  ui.foodInput.addEventListener("input", () => {
    state.foodTarget = Number(ui.foodInput.value);
  });

  ui.mutationInput.addEventListener("input", () => {
    state.mutationRate = Number(ui.mutationInput.value);
  });

  ui.climateBtn.addEventListener("click", () => {
    const next = state.climate === "stable" ? "lush" : state.climate === "lush" ? "dry" : "stable";
    state.climate = next;
    ui.climateBtn.textContent =
      next === "stable" ? "Climat stable" : next === "lush" ? "Climat fertile" : "Climat sec";
  });

  ui.pressureBtn.addEventListener("click", () => {
    const next = state.pressure === "low" ? "medium" : state.pressure === "medium" ? "high" : "low";
    state.pressure = next;
    ui.pressureBtn.textContent =
      next === "low" ? "Pression faible" : next === "medium" ? "Pression moyenne" : "Pression forte";
  });
}

export function updateStats(ui, state, averages) {
  ui.population.textContent = state.rabbits.length.toString();
  ui.generation.textContent = Math.round(averages.generation).toString();
  ui.births.textContent = state.births.toString();
  ui.deaths.textContent = state.deaths.toString();
  ui.traitSpeed.value = averages.speed;
  ui.traitVision.value = averages.vision;
  ui.traitMetabolism.value = averages.metabolism;
  ui.traitSize.value = averages.size;
}
