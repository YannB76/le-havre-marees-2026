const CSV_URL = "marees_le_havre_2026_evenements_COMPLET.csv";
const ASTRONOMY_URL = "astronomie_le_havre_2026.json";
const CATCH_LOG_STORAGE_KEY = "le-havre-marees-2026-catch-log";
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
];
const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const SHORT_WEEKDAYS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];
const UNKNOWN_REGULATION = "À compléter / à vérifier sur source officielle";
const BAR_BADGE_LEVELS = [42, 50, 60, 70, 80];

const fishingRegulations = {
  bar: {
    commonName: "Bar",
    scientificName: "Dicentrarchus labrax",
    minSizeCm: 42,
    dailyLimit: 3,
    period: "Pêche autorisée du 1er avril au 31 janvier au nord du 48e parallèle. No-kill uniquement du 1er février au 31 mars.",
    noKill: "Obligatoire du 1er février au 31 mars ; autorisé hors période de conservation.",
    markingRequired: "À vérifier sur source officielle",
    recFishing: "Oui",
    comment: "Nord du 48e parallèle : 3 individus maximum par pêcheur et par jour. Filets fixes interdits pour le bar. Données 2026 à vérifier avant sortie.",
    source: "DIRM Manche Est - Mer du Nord",
    sourceUrl: "https://www.dirm.memn.developpement-durable.gouv.fr/bar-et-lieu-jaune-regles-applicables-en-2026-pour-a1334.html",
    lastChecked: "2026-05-05",
    rules: {
      minSizeCm: 42,
      dailyLimit: 3,
      recFishing: true,
      allowedRanges: [{ start: "04-01", end: "12-31" }, { start: "01-01", end: "01-31" }],
      noKillRanges: [{ start: "02-01", end: "03-31" }]
    }
  },
  lieuJaune: {
    commonName: "Lieu jaune",
    scientificName: "Pollachius pollachius",
    minSizeCm: 42,
    dailyLimit: 2,
    period: "Capture et détention interdites du 1er janvier au 30 avril. Pêche autorisée du 1er mai au 31 décembre.",
    noKill: "Pêcher-relâcher interdit.",
    markingRequired: "À vérifier sur source officielle",
    recFishing: "Oui",
    comment: "2 individus maximum par pêcheur et par jour. Données 2026 à vérifier avant sortie.",
    source: "DIRM Manche Est - Mer du Nord",
    sourceUrl: "https://www.dirm.memn.developpement-durable.gouv.fr/bar-et-lieu-jaune-regles-applicables-en-2026-pour-a1334.html",
    lastChecked: "2026-05-05",
    rules: {
      minSizeCm: 42,
      dailyLimit: 2,
      recFishing: true,
      allowedRanges: [{ start: "05-01", end: "12-31" }]
    }
  },
  maquereau: officialSizeRegulation("Maquereau", "Scomber spp.", 20, "Taille minimale Mer du Nord, Manche, Atlantique : 20 cm. Attention : ligne spécifique Mer du Nord à 30 cm dans l'arrêté."),
  doradeGrise: officialSizeRegulation("Dorade grise", "Spondyliosoma cantharus", 23),
  doradeRoyale: officialSizeRegulation("Dorade royale", "Sparus aurata", 23),
  sole: officialSizeRegulation("Sole", "Solea spp.", 25),
  limande: officialSizeRegulation("Limande", "Limanda limanda", 20),
  plieCarrelet: officialSizeRegulation("Plie / carrelet", "Pleuronectes platessa", 27),
  turbot: officialSizeRegulation("Turbot", "Psetta maxima", 30),
  congre: officialSizeRegulation("Congre", "Conger conger", 60),
  vieille: regulationToVerify("Vieille", "Labrus bergylta"),
  merlan: officialSizeRegulation("Merlan", "Merlangius merlangus", 27),
  mulet: officialSizeRegulation("Mulet", "Mugil spp.", 30),
  orphie: officialSizeRegulation("Orphie", "Belone spp.", 30),
  roussette: regulationToVerify("Roussette", null),
  raie: officialSizeRegulation("Raie", "Rajiformes", 45, "Taille minimale générale Rajiformes : 45 cm. Raie brunette : 78 cm. Espèce exacte à vérifier avant conservation."),
  seiche: regulationToVerify("Seiche", "Sepia officinalis"),
  encornet: regulationToVerify("Encornet", null),
  tourteau: officialSizeRegulation("Tourteau", "Cancer pagurus", 15, "Taille minimale au nord du 48e parallèle Nord : 15 cm. Au sud : 13 cm."),
  etrille: officialSizeRegulation("Étrille", "Polybius henslowi / Necora puber", 6.5),
  homard: officialSizeRegulation("Homard", "Homarus gammarus", 9, "Taille minimale : 9 cm de longueur céphalothoracique (LC)."),
  coquilleSaintJacques: officialSizeRegulation("Coquille Saint-Jacques", "Pecten maximus", 11)
};

const state = {
  events: [],
  days: new Map(),
  astronomy: {},
  moonPhases: [],
  selectedDate: "2026-01-01",
  view: "day",
  bigTideThreshold: 95,
  bigTideMonth: "all",
  catches: []
};

const els = {
  dateTitle: document.querySelector("#current-date"),
  dateMeta: document.querySelector("#date-meta"),
  datePicker: document.querySelector("#date-picker"),
  dayEvents: document.querySelector("#day-events"),
  previousDay: document.querySelector("#previous-day"),
  nextDay: document.querySelector("#next-day"),
  todayButton: document.querySelector("#today-button"),
  highSummary: document.querySelector("#high-tide-summary"),
  lowSummary: document.querySelector("#low-tide-summary"),
  nextTideName: document.querySelector("#next-tide-name"),
  nextTideDetail: document.querySelector("#next-tide-detail"),
  sunTimes: document.querySelector("#sun-times"),
  moonTimes: document.querySelector("#moon-times"),
  moonPhase: document.querySelector("#moon-phase"),
  rangeLabel: document.querySelector("#range-label"),
  chart: document.querySelector("#tide-chart"),
  dayList: document.querySelector("#day-list"),
  monthSelect: document.querySelector("#month-select"),
  viewButtons: document.querySelectorAll("[data-view]"),
  dayView: document.querySelector("#day-view"),
  bigTidesView: document.querySelector("#big-tides-view"),
  moonCalendarView: document.querySelector("#moon-calendar-view"),
  shoreFishingView: document.querySelector("#shore-fishing-view"),
  shoreFishingDate: document.querySelector("#shore-fishing-date"),
  shoreFishingRating: document.querySelector("#shore-fishing-rating"),
  shoreFishingCoeff: document.querySelector("#shore-fishing-coeff"),
  shoreFishingWindows: document.querySelector("#shore-fishing-windows"),
  fishingRegulationsView: document.querySelector("#fishing-regulations-view"),
  regulationSearch: document.querySelector("#regulation-search"),
  regulationList: document.querySelector("#regulation-list"),
  catchLogView: document.querySelector("#catch-log-view"),
  catchForm: document.querySelector("#catch-form"),
  catchDate: document.querySelector("#catch-date"),
  catchTime: document.querySelector("#catch-time"),
  catchSpecies: document.querySelector("#catch-species"),
  catchSize: document.querySelector("#catch-size"),
  catchWeight: document.querySelector("#catch-weight"),
  catchCount: document.querySelector("#catch-count"),
  catchPlace: document.querySelector("#catch-place"),
  catchMethod: document.querySelector("#catch-method"),
  catchBait: document.querySelector("#catch-bait"),
  catchTide: document.querySelector("#catch-tide"),
  catchWeather: document.querySelector("#catch-weather"),
  catchComment: document.querySelector("#catch-comment"),
  catchPrefill: document.querySelector("#catch-prefill"),
  catchRegulationPreview: document.querySelector("#catch-regulation-preview"),
  catchStats: document.querySelector("#catch-stats"),
  barBadgeList: document.querySelector("#bar-badge-list"),
  barRecordLabel: document.querySelector("#bar-record-label"),
  catchList: document.querySelector("#catch-list"),
  speciesList: document.querySelector("#species-list"),
  bigTideThreshold: document.querySelector("#big-tide-threshold"),
  bigTideMonth: document.querySelector("#big-tide-month"),
  bigTideList: document.querySelector("#big-tide-list"),
  moonCalendarGrid: document.querySelector("#moon-calendar-grid")
};

init();

async function init() {
  try {
    const [csvResponse, astronomyResponse] = await Promise.all([
      fetch(CSV_URL, { cache: "no-store" }),
      fetch(ASTRONOMY_URL, { cache: "no-store" })
    ]);
    if (!csvResponse.ok) throw new Error("CSV introuvable");
    if (!astronomyResponse.ok) throw new Error("Donnees astronomiques introuvables");
    const text = await csvResponse.text();
    const astronomy = await astronomyResponse.json();
    loadData(text);
    state.astronomy = astronomy.days ?? {};
    state.moonPhases = astronomy.phases ?? [];
    state.catches = loadCatchLog();
    setupControls();
    selectInitialDate();
    render();
    registerServiceWorker();
  } catch (error) {
    document.body.innerHTML = `<main class="empty">Impossible de charger les horaires de maree. Lance l'application depuis un petit serveur local pour autoriser le chargement du CSV.</main>`;
  }
}

function loadData(text) {
  const rows = parseCsv(text);
  state.events = rows
    .filter((row) => row.date && row.heure)
    .map((row) => {
      const minutes = toMinutes(row.heure);
      const height = Number(String(row.hauteur_m).replace(",", "."));
      return {
        date: row.date,
        port: row.port,
        dayCode: row.jour,
        type: row.type_maree,
        shortType: row.type_maree === "Pleine mer" ? "PM" : "BM",
        time: row.heure,
        minutes,
        height,
        coefficient: row.coefficient ? Number(row.coefficient) : null,
        sortTime: new Date(`${row.date}T00:00:00`).getTime() + minutes * 60000
      };
    })
    .sort((a, b) => a.sortTime - b.sortTime);

  state.events.forEach((event) => {
    if (!state.days.has(event.date)) state.days.set(event.date, []);
    state.days.get(event.date).push(event);
  });
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(";");
  return lines.map((line) => {
    const values = line.split(";");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function setupControls() {
  els.previousDay.addEventListener("click", () => moveDay(-1));
  els.nextDay.addEventListener("click", () => moveDay(1));
  els.todayButton.addEventListener("click", () => {
    state.selectedDate = dateInside2026(new Date());
    render();
  });
  els.datePicker.addEventListener("change", () => {
    state.selectedDate = clampDate(els.datePicker.value);
    render();
  });
  els.monthSelect.addEventListener("change", () => {
    const date = `${els.monthSelect.value}-01`;
    state.selectedDate = state.days.has(date) ? date : firstDateOfMonth(els.monthSelect.value);
    render();
  });
  els.bigTideThreshold.addEventListener("change", () => {
    state.bigTideThreshold = Number(els.bigTideThreshold.value);
    renderBigTides();
  });
  els.bigTideMonth.addEventListener("change", () => {
    state.bigTideMonth = els.bigTideMonth.value;
    renderBigTides();
  });
  els.regulationSearch.addEventListener("input", () => {
    renderFishingRegulations();
  });
  els.catchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addCatchFromForm();
  });
  els.catchPrefill.addEventListener("click", () => {
    prefillCatchForm();
  });
  [els.catchSpecies, els.catchSize, els.catchCount, els.catchDate].forEach((input) => {
    input.addEventListener("input", renderCatchRegulationPreview);
  });
  els.catchList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-catch]");
    if (button) deleteCatch(button.dataset.deleteCatch);
  });
  els.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  MONTHS.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = `2026-${String(index + 1).padStart(2, "0")}`;
    option.textContent = capitalize(month);
    els.monthSelect.append(option);
  });

  const allMonthsOption = document.createElement("option");
  allMonthsOption.value = "all";
  allMonthsOption.textContent = "Toute l'année";
  els.bigTideMonth.append(allMonthsOption);
  MONTHS.forEach((month, index) => {
    const option = document.createElement("option");
    option.value = `2026-${String(index + 1).padStart(2, "0")}`;
    option.textContent = capitalize(month);
    els.bigTideMonth.append(option);
  });

  Object.values(fishingRegulations).forEach((item) => {
    const option = document.createElement("option");
    option.value = item.commonName;
    els.speciesList.append(option);
  });
}

function selectInitialDate() {
  state.selectedDate = dateInside2026(new Date());
  state.bigTideMonth = state.selectedDate.slice(0, 7);
}

function render() {
  const events = state.days.get(state.selectedDate) ?? [];
  const date = parseLocalDate(state.selectedDate);
  const monthKey = state.selectedDate.slice(0, 7);

  els.dateTitle.textContent = formatLongDate(date);
  els.dateMeta.textContent = `Le Havre · ${timezoneLabel(date)} · semaine ${weekNumber(date)}`;
  els.datePicker.value = state.selectedDate;
  els.monthSelect.value = monthKey;
  els.bigTideThreshold.value = String(state.bigTideThreshold);
  els.bigTideMonth.value = state.bigTideMonth;

  renderView();
  renderTable(events);
  renderSummaries(events);
  renderAstronomy();
  renderDayList(monthKey);
  renderBigTides();
  renderMoonCalendar();
  renderShoreFishingAdvice();
  renderFishingRegulations();
  renderCatchLog();
  renderCatchRegulationPreview();
  drawChart();
}

function renderAstronomy() {
  const data = state.astronomy[state.selectedDate];
  if (!data) {
    els.sunTimes.textContent = "-";
    els.moonTimes.textContent = "-";
    els.moonPhase.textContent = "-";
    return;
  }

  els.sunTimes.textContent = `${data.sunrise ?? "-"} / ${data.sunset ?? "-"}`;
  els.moonTimes.textContent = `${data.moonrise ?? "-"} / ${data.moonset ?? "-"}`;
  els.moonPhase.textContent = data.moonPhase ?? nextMoonPhaseLabel(state.selectedDate);
}

function nextMoonPhaseLabel(dateString) {
  const next = state.moonPhases.find((item) => item.date >= dateString);
  if (!next) return "-";
  return `Prochaine : ${next.phase} le ${formatShortDate(next.date)}`;
}

function renderView() {
  els.dayView.classList.toggle("is-hidden", state.view !== "day");
  els.bigTidesView.classList.toggle("is-hidden", state.view !== "big-tides");
  els.moonCalendarView.classList.toggle("is-hidden", state.view !== "moon-calendar");
  els.shoreFishingView.classList.toggle("is-hidden", state.view !== "shore-fishing");
  els.fishingRegulationsView.classList.toggle("is-hidden", state.view !== "fishing-regulations");
  els.catchLogView.classList.toggle("is-hidden", state.view !== "catch-log");
  els.viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function renderTable(events) {
  els.dayEvents.innerHTML = "";
  events.forEach((event) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${event.shortType} <span class="muted">${event.type}</span></td>
      <td>${event.time}</td>
      <td>${formatHeight(event.height)}</td>
      <td>${event.coefficient ?? ""}</td>
    `;
    els.dayEvents.append(row);
  });
}

function renderSummaries(events) {
  const highs = events.filter((event) => event.type === "Pleine mer");
  const lows = events.filter((event) => event.type === "Basse mer");
  els.highSummary.textContent = highs.length ? highs.map((event) => `${event.time} (${formatHeight(event.height)}${event.coefficient ? ` · ${event.coefficient}` : ""})`).join(" · ") : "-";
  els.lowSummary.textContent = lows.length ? lows.map((event) => `${event.time} (${formatHeight(event.height)})`).join(" · ") : "-";

  const next = nextTideForSelectedDay();
  if (next) {
    els.nextTideName.textContent = `${next.shortType} ${next.time}`;
    els.nextTideDetail.textContent = `${next.type} · ${formatHeight(next.height)}${next.coefficient ? ` · coeff. ${next.coefficient}` : ""}`;
  } else {
    els.nextTideName.textContent = "-";
    els.nextTideDetail.textContent = "-";
  }
}

function renderDayList(monthKey) {
  els.dayList.innerHTML = "";
  const monthDates = [...state.days.keys()].filter((date) => date.startsWith(monthKey));
  monthDates.forEach((dateString) => {
    const date = parseLocalDate(dateString);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `day-card${dateString === state.selectedDate ? " is-selected" : ""}`;
    button.innerHTML = `
      <span class="day-name">${SHORT_WEEKDAYS[date.getDay()]}<br>${String(date.getDate()).padStart(2, "0")}</span>
      <span class="day-lines">
        ${(state.days.get(dateString) ?? []).map((event) => `
          <span class="mini-event">
            <span class="time">${event.time}</span>
            <span>${formatHeight(event.height)}</span>
            <span class="coeff">${event.coefficient ? event.coefficient : ""}</span>
          </span>
        `).join("")}
      </span>
    `;
    button.addEventListener("click", () => {
      state.selectedDate = dateString;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.dayList.append(button);
  });
}

function renderBigTides() {
  els.bigTideList.innerHTML = "";
  const items = [...state.days.entries()]
    .map(([dateString, events]) => {
      const highs = events.filter((event) => event.type === "Pleine mer" && event.coefficient);
      const lows = events.filter((event) => event.type === "Basse mer");
      const maxCoeff = Math.max(...highs.map((event) => event.coefficient), 0);
      return { dateString, highs, lows, maxCoeff };
    })
    .filter((item) => item.maxCoeff >= state.bigTideThreshold)
    .filter((item) => state.bigTideMonth === "all" || item.dateString.startsWith(state.bigTideMonth))
    .sort((a, b) => a.dateString.localeCompare(b.dateString));

  if (!items.length) {
    const monthLabel = state.bigTideMonth === "all" ? "sur l'année" : `en ${capitalize(MONTHS[Number(state.bigTideMonth.slice(5, 7)) - 1])}`;
    els.bigTideList.innerHTML = `<p class="empty">Aucune journée avec un coefficient supérieur ou égal à ${state.bigTideThreshold} ${monthLabel}.</p>`;
    return;
  }

  items.forEach((item) => {
    const date = parseLocalDate(item.dateString);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "big-tide-card";
    card.innerHTML = `
      <span class="big-tide-date">
        <span>${SHORT_WEEKDAYS[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}</span>
        <span>${capitalize(MONTHS[date.getMonth()])}</span>
      </span>
      <span class="big-tide-detail">
        <span><strong>Basse mer :</strong> ${formatEventList(item.lows)}</span>
        <span><strong>Pleine mer :</strong> ${formatEventList(item.highs, true)}</span>
      </span>
      <span class="big-tide-coeff">${item.maxCoeff}</span>
    `;
    card.addEventListener("click", () => {
      state.selectedDate = item.dateString;
      state.view = "day";
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    els.bigTideList.append(card);
  });
}

function renderMoonCalendar() {
  els.moonCalendarGrid.innerHTML = "";
  MONTHS.forEach((month, index) => {
    const monthNumber = index + 1;
    const phases = state.moonPhases.filter((item) => Number(item.date.slice(5, 7)) === monthNumber);
    const card = document.createElement("article");
    card.className = "moon-month-card";
    card.innerHTML = `
      <h3>${capitalize(month)}</h3>
      <div class="moon-phase-row">
        ${phases.map((item) => `
          <button class="moon-phase-item" type="button" data-date="${item.date}" title="${item.phase} le ${formatShortDate(item.date)}">
            <span class="moon-icon ${phaseClass(item.phase)}" aria-hidden="true"></span>
            <span class="moon-day">${Number(item.date.slice(8, 10))}</span>
            <span class="moon-label">${phaseShortLabel(item.phase)}</span>
          </button>
        `).join("")}
      </div>
    `;
    card.querySelectorAll(".moon-phase-item").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedDate = button.dataset.date;
        state.view = "day";
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
    els.moonCalendarGrid.append(card);
  });
}

function renderShoreFishingAdvice() {
  const events = state.days.get(state.selectedDate) ?? [];
  const date = parseLocalDate(state.selectedDate);
  const score = getFishingScoreForDay(events);
  const windows = getRecommendedFishingWindows(events, score);

  els.shoreFishingDate.textContent = formatLongDate(date);
  els.shoreFishingRating.textContent = score.label;
  els.shoreFishingRating.className = `shore-rating ${score.level}`;
  els.shoreFishingCoeff.textContent = score.maxCoeff ? String(score.maxCoeff) : "Non disponible";
  els.shoreFishingWindows.innerHTML = "";

  if (!events.length) {
    els.shoreFishingWindows.innerHTML = `<p class="empty">Aucune donnée de marée disponible pour cette date.</p>`;
    return;
  }

  windows.forEach((windowItem) => {
    const card = document.createElement("article");
    card.className = `shore-window-card ${windowItem.event.type === "Pleine mer" ? "is-high" : "is-low"}`;
    card.innerHTML = formatFishingWindow(windowItem);
    els.shoreFishingWindows.append(card);
  });
}

function getFishingScoreForDay(events) {
  const maxCoeff = Math.max(...events.map((event) => event.coefficient || 0), 0);
  if (maxCoeff < 50) {
    return {
      maxCoeff,
      label: "Peu favorable",
      level: "low",
      advice: "peu favorable, courant souvent plus faible"
    };
  }
  if (maxCoeff < 70) {
    return {
      maxCoeff,
      label: "Moyen",
      level: "medium",
      advice: "moyen, à adapter selon la météo et le poste"
    };
  }
  if (maxCoeff < 90) {
    return {
      maxCoeff,
      label: "Favorable",
      level: "good",
      advice: "favorable, courant intéressant autour des changements de marée"
    };
  }
  return {
    maxCoeff,
    label: "Très favorable",
    level: "very-good",
    advice: "très favorable, mer puissante, prudence"
  };
}

function getRecommendedFishingWindows(events, score) {
  return events.map((event) => {
    const isHigh = event.type === "Pleine mer";
    const startOffset = isHigh ? -120 : -60;
    const endOffset = 60;
    return {
      event,
      start: minutesToClock(event.minutes + startOffset),
      end: minutesToClock(event.minutes + endOffset),
      advice: isHigh
        ? score.advice
        : "intéressant pour repérer les zones, attention au retour de la mer"
    };
  });
}

function formatFishingWindow(windowItem) {
  const event = windowItem.event;
  const isHigh = event.type === "Pleine mer";
  const icon = isHigh ? "🌊" : "🏖️";
  return `
    <span class="shore-window-title">${icon} ${event.type} à ${formatTimeForText(event.time)}</span>
    <span><strong>Créneau conseillé :</strong> ${formatTimeForText(windowItem.start)} – ${formatTimeForText(windowItem.end)}</span>
    <span><strong>Hauteur :</strong> ${formatHeight(event.height)}</span>
    ${event.coefficient ? `<span><strong>Coefficient :</strong> ${event.coefficient}</span>` : ""}
    <span><strong>Avis :</strong> ${windowItem.advice}</span>
  `;
}

function renderFishingRegulations() {
  const query = normalizeSearch(els.regulationSearch.value);
  const items = Object.entries(fishingRegulations)
    .filter(([, item]) => {
      const haystack = normalizeSearch(`${item.commonName} ${item.scientificName ?? ""}`);
      return !query || haystack.includes(query);
    });

  els.regulationList.innerHTML = "";
  if (!items.length) {
    els.regulationList.innerHTML = `<p class="empty">Aucune espèce trouvée pour cette recherche.</p>`;
    return;
  }

  items.forEach(([key, item]) => {
    const card = document.createElement("article");
    card.className = "regulation-card";
    card.innerHTML = `
      <div class="regulation-card-head">
        <div>
          <h3>${item.commonName}</h3>
          <p>${displayRegulationValue(item.scientificName)}</p>
        </div>
        <span>${item.lastChecked}</span>
      </div>
      <dl class="regulation-facts">
        <div><dt>Taille minimale</dt><dd>${formatRegulationSize(item.minSizeCm)}</dd></div>
        <div><dt>Quota / jour</dt><dd>${formatRegulationLimit(item.dailyLimit)}</dd></div>
        <div><dt>Période</dt><dd>${displayRegulationValue(item.period)}</dd></div>
        <div><dt>No-kill</dt><dd>${displayRegulationValue(item.noKill)}</dd></div>
        <div><dt>Marquage obligatoire</dt><dd>${displayRegulationValue(item.markingRequired)}</dd></div>
        <div><dt>Déclaration RecFishing</dt><dd>${displayRegulationValue(item.recFishing)}</dd></div>
      </dl>
      <p class="regulation-comment">${displayRegulationValue(item.comment)}</p>
      <p class="regulation-source"><strong>Source officielle :</strong> ${formatRegulationSource(item)}</p>
    `;
    card.dataset.species = key;
    els.regulationList.append(card);
  });
}

function checkCatchRegulation(species, sizeCm, keptCountToday, date = state.selectedDate) {
  const item = findRegulationBySpecies(species);
  if (!item || !item.rules) {
    return {
      maillé: "inconnu",
      quotaDépassé: "inconnu",
      périodeAutorisée: "inconnu",
      message: "⚠️ Réglementation à vérifier sur source officielle"
    };
  }

  const sized = checkMinSize(item.rules, Number(sizeCm));
  const quota = checkDailyLimit(item.rules, Number(keptCountToday));
  const period = checkAllowedPeriod(item.rules, date);
  const messages = [];

  if (sized === true) messages.push("✅ Capture maillée");
  else if (sized === false) messages.push("❌ Poisson non maillé : à relâcher");
  else messages.push("⚠️ Taille minimale à vérifier");

  if (quota === true) messages.push("❌ Quota journalier dépassé");
  else if (quota === null) messages.push("⚠️ Quota journalier à vérifier");

  if (period === false) messages.push("❌ Période de conservation non autorisée");
  else if (period === null) messages.push("⚠️ Période autorisée à vérifier");

  if (item.rules.recFishing) messages.push("📲 Déclaration RecFishing potentiellement nécessaire");

  return {
    maillé: booleanToRegulationStatus(sized),
    quotaDépassé: booleanToRegulationStatus(quota),
    périodeAutorisée: booleanToRegulationStatus(period),
    message: messages.join(" · ")
  };
}

window.checkCatchRegulation = checkCatchRegulation;

function loadCatchLog() {
  try {
    const raw = localStorage.getItem(CATCH_LOG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveCatchLog() {
  localStorage.setItem(CATCH_LOG_STORAGE_KEY, JSON.stringify(state.catches));
}

function prefillCatchForm() {
  const now = new Date();
  const selectedIsToday = toIsoDate(now) === state.selectedDate;
  els.catchDate.value = state.selectedDate;
  els.catchTime.value = selectedIsToday ? minutesToClock(now.getHours() * 60 + now.getMinutes()) : "";
  els.catchTide.value = describeAssociatedTide(els.catchDate.value, els.catchTime.value);
  renderCatchRegulationPreview();
}

function addCatchFromForm() {
  const date = clampDate(els.catchDate.value || state.selectedDate);
  const time = els.catchTime.value || "00:00";
  const catchItem = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date,
    time,
    species: els.catchSpecies.value.trim(),
    sizeCm: numberOrNull(els.catchSize.value),
    weightKg: numberOrNull(els.catchWeight.value),
    count: Math.max(Number(els.catchCount.value) || 1, 1),
    place: els.catchPlace.value.trim(),
    method: els.catchMethod.value.trim(),
    bait: els.catchBait.value.trim(),
    tide: els.catchTide.value.trim() || describeAssociatedTide(date, time),
    weather: els.catchWeather.value.trim(),
    moonPhase: phaseForDate(date),
    dayCoefficient: maxCoefficientForDate(date),
    estimatedHeight: estimatedHeightForDateTime(date, time),
    comment: els.catchComment.value.trim(),
    createdAt: new Date().toISOString()
  };

  state.catches.unshift(catchItem);
  saveCatchLog();
  els.catchForm.reset();
  els.catchCount.value = "1";
  prefillCatchForm();
  renderCatchLog();
}

function deleteCatch(id) {
  const item = state.catches.find((catchItem) => catchItem.id === id);
  if (!item) return;
  const ok = window.confirm(`Supprimer la prise "${item.species || "sans espèce"}" du ${formatShortDate(item.date)} ?`);
  if (!ok) return;
  state.catches = state.catches.filter((catchItem) => catchItem.id !== id);
  saveCatchLog();
  renderCatchLog();
}

function renderCatchLog() {
  if (!els.catchDate.value) prefillCatchForm();
  renderCatchStats();
  renderBarBadges();
  els.catchList.innerHTML = "";

  if (!state.catches.length) {
    els.catchList.innerHTML = `<p class="empty">Aucune prise enregistrée pour le moment.</p>`;
    return;
  }

  state.catches
    .slice()
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
    .forEach((catchItem) => {
      const regulation = checkCatchRegulation(catchItem.species, catchItem.sizeCm, catchItem.count, catchItem.date);
      const card = document.createElement("article");
      card.className = "catch-card";
      card.innerHTML = `
        <div class="catch-card-head">
          <div>
            <h3>${escapeHtml(catchItem.species || "Espèce non renseignée")}</h3>
            <p>${formatShortDate(catchItem.date)} à ${formatTimeForText(catchItem.time)} · ${escapeHtml(catchItem.place || "Lieu non renseigné")}</p>
          </div>
          <button class="compact-button danger-button" type="button" data-delete-catch="${catchItem.id}">Supprimer</button>
        </div>
        <div class="catch-card-grid">
          <span><strong>Taille</strong>${formatOptionalNumber(catchItem.sizeCm, "cm")}</span>
          <span><strong>Poids</strong>${formatOptionalNumber(catchItem.weightKg, "kg")}</span>
          <span><strong>Nombre</strong>${catchItem.count}</span>
          <span><strong>Type</strong>${escapeHtml(catchItem.method || "-")}</span>
          <span><strong>Appât / leurre</strong>${escapeHtml(catchItem.bait || "-")}</span>
          <span><strong>Météo</strong>${escapeHtml(catchItem.weather || "-")}</span>
          <span><strong>Marée</strong>${escapeHtml(catchItem.tide || "-")}</span>
          <span><strong>Coeff.</strong>${catchItem.dayCoefficient || "-"}</span>
          <span><strong>Hauteur estimée</strong>${catchItem.estimatedHeight ? formatHeight(catchItem.estimatedHeight) : "-"}</span>
          <span><strong>Lune</strong>${escapeHtml(catchItem.moonPhase || "-")}</span>
        </div>
        <p class="catch-regulation">${escapeHtml(regulation.message)}</p>
        ${catchItem.comment ? `<p class="catch-comment-text">${escapeHtml(catchItem.comment)}</p>` : ""}
      `;
      els.catchList.append(card);
    });
}

function renderCatchStats() {
  const totalCount = state.catches.reduce((sum, item) => sum + (Number(item.count) || 1), 0);
  const outings = new Set(state.catches.map((item) => item.date)).size;
  const topSpecies = topEntries(state.catches.map((item) => item.species).filter(Boolean));
  const topTides = topEntries(state.catches.map((item) => tideKindFromText(item.tide)).filter(Boolean));
  const bestCoeff = Math.max(...state.catches.map((item) => item.dayCoefficient || 0), 0);

  els.catchStats.innerHTML = `
    <article><span class="eyebrow">Prises</span><strong>${totalCount}</strong></article>
    <article><span class="eyebrow">Sorties</span><strong>${outings}</strong></article>
    <article><span class="eyebrow">Espèce fréquente</span><strong>${topSpecies || "-"}</strong></article>
    <article><span class="eyebrow">Marée fréquente</span><strong>${topTides || "-"}</strong></article>
    <article><span class="eyebrow">Meilleur coeff.</span><strong>${bestCoeff || "-"}</strong></article>
  `;
}

function renderBarBadges() {
  const record = getBarRecord();
  els.barRecordLabel.textContent = record ? `Record : ${formatOptionalNumber(record.sizeCm, "cm")}` : "Aucun bar enregistré";
  els.barBadgeList.innerHTML = "";

  BAR_BADGE_LEVELS.forEach((level) => {
    const unlocked = record && record.sizeCm >= level;
    const badge = document.createElement("article");
    badge.className = `bar-badge ${unlocked ? "is-unlocked" : "is-locked"}`;
    badge.innerHTML = `
      <div class="bar-badge-medal">
        <span class="bar-badge-crown">▲</span>
        <span class="bar-badge-name">BAR</span>
        <span class="bar-badge-fish" aria-hidden="true">><(((°></span>
        <span class="bar-badge-size">${level}+</span>
      </div>
      <div class="bar-badge-text">
        <strong>${unlocked ? "Badge débloqué" : "Badge verrouillé"}</strong>
        <span>${unlocked ? `Record actuel : ${formatOptionalNumber(record.sizeCm, "cm")}` : `Ajoute un bar de ${level} cm ou plus`}</span>
      </div>
    `;
    els.barBadgeList.append(badge);
  });
}

function getBarRecord() {
  return state.catches
    .filter((item) => normalizeSearch(item.species).includes("bar") && Number.isFinite(item.sizeCm))
    .sort((a, b) => b.sizeCm - a.sizeCm)[0] ?? null;
}

function renderCatchRegulationPreview() {
  const species = els.catchSpecies.value.trim();
  if (!species) {
    els.catchRegulationPreview.textContent = "Renseigne une espèce et une taille pour vérifier la maille si disponible.";
    return;
  }
  const result = checkCatchRegulation(
    species,
    numberOrNull(els.catchSize.value),
    Number(els.catchCount.value) || 1,
    els.catchDate.value || state.selectedDate
  );
  els.catchRegulationPreview.textContent = result.message;
}

function describeAssociatedTide(dateString, time) {
  const events = state.days.get(dateString) ?? [];
  if (!events.length) return "Aucune marée disponible";
  const minutes = time ? toMinutes(time) : 12 * 60;
  const closest = events
    .slice()
    .sort((a, b) => Math.abs(a.minutes - minutes) - Math.abs(b.minutes - minutes))[0];
  return `${closest.type} ${closest.time}${closest.coefficient ? ` · coeff. ${closest.coefficient}` : ""}`;
}

function maxCoefficientForDate(dateString) {
  const events = state.days.get(dateString) ?? [];
  return Math.max(...events.map((event) => event.coefficient || 0), 0);
}

function estimatedHeightForDateTime(dateString, time) {
  if (!time) return null;
  const dateStart = parseLocalDate(dateString).getTime();
  const points = state.events.filter((event) => event.sortTime >= dateStart - 14 * 3600000 && event.sortTime <= dateStart + 38 * 3600000);
  if (points.length < 2) return null;
  return interpolateHeight(points, dateStart + toMinutes(time) * 60000);
}

function drawChart() {
  const canvas = els.chart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = { top: 18, right: 22, bottom: 150, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const minH = 0.8;
  const maxH = 8.4;
  const dayStart = new Date(`${state.selectedDate}T00:00:00`).getTime();
  const points = state.events.filter((event) => event.sortTime >= dayStart - 14 * 3600000 && event.sortTime <= dayStart + 38 * 3600000);
  const astronomy = state.astronomy[state.selectedDate];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#d7e1ea";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#283344";
  ctx.font = "14px Arial";
  for (let hour = 0; hour <= 24; hour += 2) {
    const x = xFor(hour * 60);
    line(x, pad.top, x, pad.top + plotH);
    ctx.fillText(String(hour), x - 6, pad.top + plotH + 18);
  }
  for (let h = 1; h <= 8; h += 1) {
    const y = yFor(h);
    line(pad.left, y, pad.left + plotW, y);
    ctx.fillText(String(h), pad.left - 20, y + 5);
  }

  ctx.fillStyle = "#000000";
  ctx.font = "15px Arial";
  ctx.fillText("Heures", pad.left + plotW / 2 - 22, pad.top + plotH + 40);
  ctx.save();
  ctx.translate(20, pad.top + plotH / 2 + 28);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Hauteur (m)", 0, 0);
  ctx.restore();

  let samples = [];
  if (points.length > 1) {
    samples = [];
    for (let minute = 0; minute <= 24 * 60; minute += 8) {
      const absolute = dayStart + minute * 60000;
      samples.push({
        minute,
        height: interpolateHeight(points, absolute)
      });
    }

    ctx.beginPath();
    samples.forEach((sample, index) => {
      const x = xFor(sample.minute);
      const y = yFor(sample.height);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(xFor(24 * 60), pad.top + plotH);
    ctx.lineTo(xFor(0), pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = "rgba(186, 217, 230, 0.45)";
    ctx.fill();

    ctx.beginPath();
    samples.forEach((sample, index) => {
      const x = xFor(sample.minute);
      const y = yFor(sample.height);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 3;
    ctx.stroke();

    const now = new Date();
    const isSelectedToday = toIsoDate(now) === state.selectedDate;
    if (isSelectedToday) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const nowHeight = interpolateHeight(points, dayStart + nowMinutes * 60000);
      const nowX = xFor(nowMinutes);
      const nowY = yFor(nowHeight);

      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = "#9f2d20";
      ctx.lineWidth = 2;
      line(nowX, pad.top, nowX, pad.top + plotH);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(nowX, nowY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#9f2d20";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#9f2d20";
      ctx.font = "700 14px Arial";
      const label = `Maintenant ${formatHeight(nowHeight)}`;
      const labelX = Math.min(nowX + 8, pad.left + plotW - 132);
      ctx.fillText(label, labelX, Math.max(nowY - 10, pad.top + 16));
      els.rangeLabel.textContent = label;
    } else {
      els.rangeLabel.textContent = `${formatHeight(minH)} - ${formatHeight(maxH)}`;
    }
  } else {
    els.rangeLabel.textContent = `${formatHeight(minH)} - ${formatHeight(maxH)}`;
  }

  const dayEvents = state.days.get(state.selectedDate) ?? [];
  dayEvents.forEach((event) => {
    ctx.beginPath();
    ctx.arc(xFor(event.minutes), yFor(event.height), 4, 0, Math.PI * 2);
    ctx.fillStyle = event.type === "Pleine mer" ? "#1f3a5f" : "#0f766e";
    ctx.fill();
  });

  drawAstronomyMarkers();

  function xFor(minutes) {
    return pad.left + (minutes / 1440) * plotW;
  }

  function yFor(value) {
    return pad.top + (1 - (value - minH) / (maxH - minH)) * plotH;
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawAstronomyMarkers() {
    if (!astronomy) return;

    const sunY = pad.top + plotH + 58;
    const moonY = pad.top + plotH + 112;
    const phase = phaseForDate(state.selectedDate);
    const markers = [
      { time: astronomy.sunrise, y: sunY, type: "sun", arrow: "↑" },
      { time: astronomy.sunset, y: sunY, type: "sun", arrow: "↓" },
      { time: astronomy.moonrise, y: moonY, type: "moon", arrow: "↑", phase },
      { time: astronomy.moonset, y: moonY, type: "moon", arrow: "↓", phase }
    ].filter((marker) => marker.time);

    ctx.save();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH + 20);
    ctx.lineTo(pad.left + plotW, pad.top + plotH + 20);
    ctx.stroke();

    markers.forEach((marker) => {
      const x = xFor(toMinutes(marker.time));
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = marker.type === "sun" ? "rgba(216, 132, 22, 0.45)" : "rgba(31, 58, 95, 0.35)";
      line(x, pad.top, x, pad.top + plotH + 18);
      ctx.restore();

      if (marker.type === "sun") {
        drawSunIcon(ctx, x, marker.y, 9);
        ctx.fillStyle = "#d88416";
      } else {
        drawMoonIcon(ctx, x, marker.y, 11, marker.phase);
        ctx.fillStyle = "#1f3a5f";
      }

      ctx.font = "700 12px Arial";
      ctx.textAlign = "left";
      ctx.fillText(marker.arrow, x + 13, marker.y + 4);
      ctx.fillStyle = "#334155";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(marker.time, x, marker.y + 25);
    });
    ctx.restore();
  }
}

function interpolateHeight(points, timestamp) {
  const nextIndex = points.findIndex((point) => point.sortTime >= timestamp);
  if (nextIndex <= 0) return points[0].height;
  const previous = points[nextIndex - 1];
  const next = points[nextIndex];
  if (!next) return previous.height;
  const progress = (timestamp - previous.sortTime) / (next.sortTime - previous.sortTime);
  const eased = (1 - Math.cos(progress * Math.PI)) / 2;
  return previous.height + (next.height - previous.height) * eased;
}

function moveDay(delta) {
  const next = new Date(parseLocalDate(state.selectedDate).getTime() + delta * DAY_MS);
  state.selectedDate = clampDate(toIsoDate(next));
  render();
}

function nextTideForSelectedDay() {
  const today = new Date();
  const selected = parseLocalDate(state.selectedDate);
  const selectedIsToday = toIsoDate(today) === state.selectedDate;
  if (selectedIsToday) {
    const minutesNow = today.getHours() * 60 + today.getMinutes();
    return (state.days.get(state.selectedDate) ?? []).find((event) => event.minutes >= minutesNow);
  }
  if (selected.getTime() > parseLocalDate(toIsoDate(today)).getTime()) {
    return (state.days.get(state.selectedDate) ?? [])[0];
  }
  return (state.days.get(state.selectedDate) ?? []).at(-1);
}

function firstDateOfMonth(monthKey) {
  return [...state.days.keys()].find((date) => date.startsWith(monthKey)) ?? `${monthKey}-01`;
}

function dateInside2026(date) {
  const iso = toIsoDate(date);
  if (iso < "2026-01-01") return "2026-01-01";
  if (iso > "2026-12-31") return "2026-12-31";
  return iso;
}

function clampDate(iso) {
  if (iso < "2026-01-01") return "2026-01-01";
  if (iso > "2026-12-31") return "2026-12-31";
  return iso;
}

function timezoneLabel(date) {
  const iso = toIsoDate(date);
  if (iso >= "2026-03-29" && iso < "2026-10-25") return "UTC+2";
  if (iso === "2026-10-25") return "UTC+1/UTC+2";
  return "UTC+1";
}

function weekNumber(date) {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3);
  return 1 + Math.round((target - firstThursday) / (7 * DAY_MS));
}

function parseLocalDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToClock(minutes) {
  const safeMinutes = (minutes + 24 * 60) % (24 * 60);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatTimeForText(time) {
  return time.replace(":", "h");
}

function regulationToVerify(commonName, scientificName) {
  return {
    commonName,
    scientificName,
    minSizeCm: null,
    dailyLimit: null,
    period: UNKNOWN_REGULATION,
    noKill: UNKNOWN_REGULATION,
    markingRequired: "Inconnu",
    recFishing: "À vérifier",
    comment: UNKNOWN_REGULATION,
    source: "À vérifier sur source officielle",
    sourceUrl: "",
    lastChecked: "2026-05-05"
  };
}

function officialSizeRegulation(commonName, scientificName, minSizeCm, comment = "Taille minimale officielle trouvée. Quotas, périodes, marquage et déclarations restent à vérifier selon zone et mode de pêche.") {
  return {
    commonName,
    scientificName,
    minSizeCm,
    dailyLimit: null,
    period: "À vérifier sur source officielle",
    noKill: "À vérifier sur source officielle",
    markingRequired: "À vérifier",
    recFishing: "À vérifier",
    comment,
    source: "Légifrance - tailles minimales de capture",
    sourceUrl: "https://www.legifrance.gouv.fr/loda/id/LEGISCTA000026582654/",
    lastChecked: "2026-05-05",
    rules: {
      minSizeCm
    }
  };
}

function displayRegulationValue(value) {
  if (value === null || value === undefined || value === "") return "À vérifier sur source officielle";
  return value;
}

function formatRegulationSize(value) {
  return Number.isFinite(value) ? `${value} cm` : "À vérifier sur source officielle";
}

function formatRegulationLimit(value) {
  return Number.isFinite(value) ? `${value} / pêcheur / jour` : "À vérifier sur source officielle";
}

function formatRegulationSource(item) {
  if (!item.sourceUrl) return displayRegulationValue(item.source);
  return `<a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer">${item.source}</a>`;
}

function normalizeSearch(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findRegulationBySpecies(species) {
  const key = normalizeSearch(species);
  return Object.values(fishingRegulations).find((item) => {
    return normalizeSearch(item.commonName) === key || normalizeSearch(item.scientificName ?? "") === key;
  });
}

function checkMinSize(rules, sizeCm) {
  if (!Number.isFinite(rules.minSizeCm) || !Number.isFinite(sizeCm)) return null;
  return sizeCm >= rules.minSizeCm;
}

function checkDailyLimit(rules, keptCountToday) {
  if (!Number.isFinite(rules.dailyLimit) || !Number.isFinite(keptCountToday)) return null;
  return keptCountToday > rules.dailyLimit;
}

function checkAllowedPeriod(rules, dateString) {
  if (!rules.allowedRanges) return null;
  const monthDay = dateString.slice(5, 10);
  return rules.allowedRanges.some((range) => monthDayIsInsideRange(monthDay, range.start, range.end));
}

function monthDayIsInsideRange(monthDay, start, end) {
  if (start <= end) return monthDay >= start && monthDay <= end;
  return monthDay >= start || monthDay <= end;
}

function booleanToRegulationStatus(value) {
  if (value === true) return "oui";
  if (value === false) return "non";
  return "inconnu";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && value !== "" ? number : null;
}

function formatOptionalNumber(value, unit) {
  if (!Number.isFinite(value)) return "-";
  return `${String(value).replace(".", ",")} ${unit}`;
}

function topEntries(values) {
  const counts = values.reduce((map, value) => {
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? `${best[0]} (${best[1]})` : "";
}

function tideKindFromText(value) {
  if (!value) return "";
  if (value.includes("Pleine mer")) return "Pleine mer";
  if (value.includes("Basse mer")) return "Basse mer";
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatLongDate(date) {
  return `${WEEKDAYS[date.getDay()]} ${String(date.getDate()).padStart(2, "0")} ${capitalize(MONTHS[date.getMonth()])} 2026`;
}

function formatShortDate(dateString) {
  const date = parseLocalDate(dateString);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatHeight(value) {
  return `${value.toFixed(2).replace(".", ",")}m`;
}

function formatEventList(events, includeCoeff = false) {
  if (!events.length) return "-";
  return events.map((event) => {
    const coeff = includeCoeff && event.coefficient ? `, coeff. ${event.coefficient}` : "";
    return `${event.time} (${formatHeight(event.height)}${coeff})`;
  }).join(" · ");
}

function phaseForDate(dateString) {
  const exact = state.moonPhases.find((item) => item.date === dateString);
  if (exact) return exact.phase;

  const selected = parseLocalDate(dateString).getTime();
  let closest = null;
  let closestDistance = Infinity;
  state.moonPhases.forEach((item) => {
    const distance = Math.abs(parseLocalDate(item.date).getTime() - selected);
    if (distance < closestDistance) {
      closest = item;
      closestDistance = distance;
    }
  });
  return closest?.phase ?? "Nouvelle Lune";
}

function phaseClass(phase) {
  if (phase === "Pleine Lune") return "phase-full";
  if (phase === "Nouvelle Lune") return "phase-new";
  if (phase === "Premier Quartier") return "phase-first";
  if (phase === "Dernier Quartier") return "phase-last";
  return "phase-new";
}

function phaseShortLabel(phase) {
  if (phase === "Pleine Lune") return "Pleine";
  if (phase === "Nouvelle Lune") return "Nouvelle";
  if (phase === "Premier Quartier") return "1er quart.";
  if (phase === "Dernier Quartier") return "Dern. quart.";
  return phase;
}

function drawSunIcon(ctx, x, y, radius) {
  ctx.save();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * (radius + 3), y + Math.sin(angle) * (radius + 3));
    ctx.lineTo(x + Math.cos(angle) * (radius + 8), y + Math.sin(angle) * (radius + 8));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fill();
  ctx.restore();
}

function drawMoonIcon(ctx, x, y, radius, phase) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#10213a";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  if (phase === "Pleine Lune") {
    ctx.fillStyle = "#dcecff";
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  } else if (phase === "Premier Quartier") {
    ctx.fillStyle = "#dcecff";
    ctx.fillRect(x, y - radius, radius, radius * 2);
  } else if (phase === "Dernier Quartier") {
    ctx.fillStyle = "#dcecff";
    ctx.fillRect(x - radius, y - radius, radius, radius * 2);
  }

  ctx.restore();
  ctx.strokeStyle = "rgba(31, 58, 95, 0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}
