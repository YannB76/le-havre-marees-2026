const CSV_URL = "marees_le_havre_2026_evenements_COMPLET.csv";
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = [
  "janvier", "fevrier", "mars", "avril", "mai", "juin",
  "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
];
const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const SHORT_WEEKDAYS = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

const state = {
  events: [],
  days: new Map(),
  selectedDate: "2026-01-01",
  view: "day",
  bigTideThreshold: 95,
  bigTideMonth: "all"
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
  rangeLabel: document.querySelector("#range-label"),
  chart: document.querySelector("#tide-chart"),
  dayList: document.querySelector("#day-list"),
  monthSelect: document.querySelector("#month-select"),
  viewButtons: document.querySelectorAll("[data-view]"),
  dayView: document.querySelector("#day-view"),
  bigTidesView: document.querySelector("#big-tides-view"),
  bigTideThreshold: document.querySelector("#big-tide-threshold"),
  bigTideMonth: document.querySelector("#big-tide-month"),
  bigTideList: document.querySelector("#big-tide-list")
};

init();

async function init() {
  try {
    const response = await fetch(CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("CSV introuvable");
    const text = await response.text();
    loadData(text);
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
}

function selectInitialDate() {
  state.selectedDate = dateInside2026(new Date());
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
  renderDayList(monthKey);
  renderBigTides();
  drawChart();
}

function renderView() {
  els.dayView.classList.toggle("is-hidden", state.view !== "day");
  els.bigTidesView.classList.toggle("is-hidden", state.view !== "big-tides");
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

function drawChart() {
  const canvas = els.chart;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = { top: 18, right: 22, bottom: 42, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const minH = 0.8;
  const maxH = 8.4;
  const dayStart = new Date(`${state.selectedDate}T00:00:00`).getTime();
  const points = state.events.filter((event) => event.sortTime >= dayStart - 14 * 3600000 && event.sortTime <= dayStart + 38 * 3600000);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const seaY = yFor(4.7);
  ctx.fillStyle = "rgba(186, 217, 230, 0.72)";
  ctx.fillRect(pad.left, seaY, plotW, pad.top + plotH - seaY);

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
  ctx.fillText("Heures", pad.left + plotW / 2 - 22, height - 9);
  ctx.save();
  ctx.translate(20, pad.top + plotH / 2 + 28);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Hauteur (m)", 0, 0);
  ctx.restore();

  if (points.length > 1) {
    ctx.beginPath();
    for (let minute = 0; minute <= 24 * 60; minute += 8) {
      const absolute = dayStart + minute * 60000;
      const h = interpolateHeight(points, absolute);
      const x = xFor(minute);
      const y = yFor(h);
      if (minute === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const dayEvents = state.days.get(state.selectedDate) ?? [];
  dayEvents.forEach((event) => {
    ctx.beginPath();
    ctx.arc(xFor(event.minutes), yFor(event.height), 4, 0, Math.PI * 2);
    ctx.fillStyle = event.type === "Pleine mer" ? "#1f3a5f" : "#0f766e";
    ctx.fill();
  });

  els.rangeLabel.textContent = `${formatHeight(minH)} - ${formatHeight(maxH)}`;

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

function formatLongDate(date) {
  return `${WEEKDAYS[date.getDay()]} ${String(date.getDate()).padStart(2, "0")} ${capitalize(MONTHS[date.getMonth()])} 2026`;
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

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}
