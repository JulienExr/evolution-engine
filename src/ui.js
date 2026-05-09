export function getUi() {
  return {
    pauseBtn: document.querySelector("#pauseBtn"),
    resetBtn: document.querySelector("#resetBtn"),
    zoomOutBtn: document.querySelector("#zoomOutBtn"),
    resetCameraBtn: document.querySelector("#resetCameraBtn"),
    zoomInBtn: document.querySelector("#zoomInBtn"),
    speedInput: document.querySelector("#speedInput"),
    speedLabel: document.querySelector("#speedLabel"),
    foodInput: document.querySelector("#foodInput"),
    mutationInput: document.querySelector("#mutationInput"),
    mateInput: document.querySelector("#mateInput"),
    climateBtn: document.querySelector("#climateBtn"),
    pressureBtn: document.querySelector("#pressureBtn"),
    seasonBtn: document.querySelector("#seasonBtn"),
    droughtBtn: document.querySelector("#droughtBtn"),
    rabbitBtn: document.querySelector("#rabbitBtn"),
    foxBtn: document.querySelector("#foxBtn"),
    population: document.querySelector("#statPopulation"),
    generation: document.querySelector("#statGeneration"),
    births: document.querySelector("#statBirths"),
    deaths: document.querySelector("#statDeaths"),
    adults: document.querySelector("#statAdults"),
    pregnant: document.querySelector("#statPregnant"),
    foxes: document.querySelector("#statFoxes"),
    hunted: document.querySelector("#statHunted"),
    inspectorSpecies: document.querySelector("#inspectorSpecies"),
    inspectorEmpty: document.querySelector("#inspectorEmpty"),
    inspectorBody: document.querySelector("#inspectorBody"),
    inspectorIntent: document.querySelector("#inspectorIntent"),
    inspectorEnergy: document.querySelector("#inspectorEnergy"),
    inspectorAge: document.querySelector("#inspectorAge"),
    inspectorGeneration: document.querySelector("#inspectorGeneration"),
    inspectorSex: document.querySelector("#inspectorSex"),
    inspectorSpeed: document.querySelector("#inspectorSpeed"),
    inspectorVision: document.querySelector("#inspectorVision"),
    inspectorMetabolism: document.querySelector("#inspectorMetabolism"),
    inspectorSize: document.querySelector("#inspectorSize"),
    inspectorFertility: document.querySelector("#inspectorFertility"),
    traitSpeed: document.querySelector("#traitSpeed"),
    traitVision: document.querySelector("#traitVision"),
    traitMetabolism: document.querySelector("#traitMetabolism"),
    traitSize: document.querySelector("#traitSize"),
    traitFertility: document.querySelector("#traitFertility"),
    foxTraitSpeed: document.querySelector("#foxTraitSpeed"),
    foxTraitVision: document.querySelector("#foxTraitVision"),
    foxTraitMetabolism: document.querySelector("#foxTraitMetabolism"),
    foxTraitFertility: document.querySelector("#foxTraitFertility"),
  };
}

export function bindUiControls(ui, state, { onReset, onDrought, onRabbits, onFoxes }) {
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

  ui.mateInput.addEventListener("input", () => {
    state.mateSelectivity = Number(ui.mateInput.value);
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

  ui.seasonBtn.addEventListener("click", () => {
    state.seasons = !state.seasons;
    ui.seasonBtn.textContent = state.seasons ? "Saisons actives" : "Saisons coupees";
  });

  ui.droughtBtn.addEventListener("click", onDrought);
  ui.rabbitBtn.addEventListener("click", onRabbits);
  ui.foxBtn.addEventListener("click", onFoxes);
}

export function updateStats(ui, state, averages, foxAverages) {
  const adults = state.rabbits.filter((rabbit) => rabbit.age >= rabbit.maturityAge).length;
  const pregnant = state.rabbits.filter((rabbit) => rabbit.pregnancy).length;

  ui.population.textContent = state.rabbits.length.toString();
  ui.generation.textContent = Math.round(averages.generation).toString();
  ui.births.textContent = state.births.toString();
  ui.deaths.textContent = state.deaths.toString();
  ui.adults.textContent = adults.toString();
  ui.pregnant.textContent = pregnant.toString();
  ui.foxes.textContent = state.foxes.length.toString();
  ui.hunted.textContent = state.hunted.toString();
  ui.traitSpeed.value = averages.speed;
  ui.traitVision.value = averages.vision;
  ui.traitMetabolism.value = averages.metabolism;
  ui.traitSize.value = averages.size;
  ui.traitFertility.value = averages.fertility;
  ui.foxTraitSpeed.value = foxAverages.speed;
  ui.foxTraitVision.value = foxAverages.vision;
  ui.foxTraitMetabolism.value = foxAverages.metabolism;
  ui.foxTraitFertility.value = foxAverages.fertility;
  updateInspector(ui, state);
}

function updateInspector(ui, state) {
  const selection = state.selection;
  const entity =
    selection?.type === "rabbit"
      ? state.rabbits.find((rabbit) => rabbit.id === selection.id)
      : selection?.type === "fox"
        ? state.foxes.find((fox) => fox.id === selection.id)
        : null;

  if (!entity) {
    state.selection = null;
    ui.inspectorSpecies.textContent = "-";
    ui.inspectorEmpty.hidden = false;
    ui.inspectorBody.hidden = true;
    return;
  }

  const species = selection.type === "rabbit" ? "Lapin" : "Renard";
  ui.inspectorSpecies.textContent = species;
  ui.inspectorEmpty.hidden = true;
  ui.inspectorBody.hidden = false;
  ui.inspectorIntent.textContent = formatIntent(entity);
  ui.inspectorEnergy.textContent = Math.round(entity.energy).toString();
  ui.inspectorAge.textContent = Math.round(entity.age).toString();
  ui.inspectorGeneration.textContent = entity.generation.toString();
  ui.inspectorSex.textContent = entity.sex === "female" ? "Femelle" : "Male";
  ui.inspectorSpeed.value = entity.genes.speed;
  ui.inspectorVision.value = entity.genes.vision;
  ui.inspectorMetabolism.value = entity.genes.metabolism;
  ui.inspectorSize.value = entity.genes.size;
  ui.inspectorFertility.value = entity.genes.fertility;
}

function formatIntent(entity) {
  if (entity.inRefuge && entity.intent === "flee") return "Refuge";
  if (entity.intent === "flee") return "Fuite";
  if (entity.intent === "food") return "Nourriture";
  if (entity.intent === "mate") return "Reproduction";
  if (entity.intent === "hunt") return "Chasse";
  if (entity.intent === "prowl") return "Traque";
  return "Exploration";
}
