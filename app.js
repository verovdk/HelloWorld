// 1. Initialize IndexedDB via Dexie
const db = new Dexie("BiologicalSurveyDB");
db.version(1).stores({
  trips: "guid, date, samplingMethod, targetedSpecies, recorder1, recordStatus"
});

let selectedGuid = null;
let isEditable = true;

// Helper: Generate UUID v4
function createGuid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Helper: Format timestamps matching your screenshot
function formatToday() {
  const d = new Date();
  return d.toLocaleDateString("en-GB"); // dd/mm/yyyy
}

function formatCreatedTimestamp() {
  const d = new Date();
  const datePart = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "/");
  const timePart = d.toTimeString().split(" ")[0];
  return `${datePart} ${timePart}`;
}

function formatShortListDate(ddmmyyyy) {
  const parts = (ddmmyyyy || "").split("/");
  if (parts.length !== 3) return ddmmyyyy;
  const [dd, mm, yyyy] = parts;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  if (isNaN(d)) return ddmmyyyy;
  const dayName = d.toLocaleDateString("en-AU", { weekday: "short" });
  const month = d.toLocaleDateString("en-AU", { month: "short" });
  const yr = yyyy.slice(-2);
  return `${dayName} ${dd}/${month}/${yr}`;
}

// Seed initial sample record if database is empty
async function seedIfEmpty() {
  const count = await db.trips.count();
  if (count === 0) {
    await db.trips.add({
      guid: "cb07980a-554d-4a4a-9074-bb1739d55662",
      date: "19/01/2022",
      samplingMethod: "Crab Trap",
      targetedSpecies: "Blue Swimmer Crab",
      purpose: "Relative Abundance",
      type: "Independent",
      vessel: "Amelia",
      project: "Haste",
      recorder1: "Pierre",
      recorder2: "",
      bioregion: "West Coast",
      tideCycle: "Neap",
      tideRange: "1.3",
      comments: "",
      siteNumber: "2",
      createdOnMobile: "19/Jan/2022 14:46:09",
      recordStatus: "New"
    });
  }
}

// Render left list
async function renderList(filterText = "") {
  let trips = await db.trips.toArray();
  const q = filterText.trim().toLowerCase();

  if (q) {
    trips = trips.filter(t =>
      (t.samplingMethod || "").toLowerCase().includes(q) ||
      (t.targetedSpecies || "").toLowerCase().includes(q) ||
      (t.recorder1 || "").toLowerCase().includes(q)
    );
  }

  const listEl = document.getElementById("trip-list");
  listEl.innerHTML = "";
  document.getElementById("item-count").textContent = `${trips.length} item${trips.length === 1 ? "" : "s"} in list`;

  if (!selectedGuid && trips.length > 0) {
    selectedGuid = trips[0].guid;
  }

  trips.forEach(trip => {
    const row = document.createElement("div");
    row.className = `trip-item ${trip.guid === selectedGuid ? "active" : ""}`;
    row.innerHTML = `
      <div class="trip-item-main">
        <div class="trip-method">${trip.samplingMethod || "Untitled"}</div>
        <div class="trip-species">${trip.targetedSpecies || "-"}</div>
        <div class="trip-date">${formatShortListDate(trip.date)}</div>
        <div class="trip-purpose">${trip.purpose || ""}</div>
        <div class="trip-recorder">${trip.recorder1 || ""}</div>
        <div class="trip-status">${trip.recordStatus || "New"}</div>
      </div>
      <div class="trip-chevron">&#8250;</div>
    `;
    row.addEventListener("click", () => selectTrip(trip.guid));
    listEl.appendChild(row);
  });

  if (selectedGuid) {
    await populateForm(selectedGuid);
  }
}

// Load selected record into right pane
async function selectTrip(guid) {
  selectedGuid = guid;
  await renderList(document.getElementById("filter-input").value);
}

async function populateForm(guid) {
  const trip = await db.trips.get(guid);
  if (!trip) return;

  document.getElementById("date").value = trip.date || "";
  document.getElementById("samplingMethod").value = trip.samplingMethod || "";
  document.getElementById("targetedSpecies").value = trip.targetedSpecies || "";
  document.getElementById("purpose").value = trip.purpose || "";
  document.getElementById("type").value = trip.type || "";
  document.getElementById("vessel").value = trip.vessel || "";
  document.getElementById("project").value = trip.project || "";
  document.getElementById("recorder1").value = trip.recorder1 || "";
  document.getElementById("recorder2").value = trip.recorder2 || "";
  document.getElementById("bioregion").value = trip.bioregion || "";
  document.getElementById("tideCycle").value = trip.tideCycle || "";
  document.getElementById("tideRange").value = trip.tideRange || "";
  document.getElementById("comments").value = trip.comments || "";
  document.getElementById("siteNumber").value = trip.siteNumber || "";
  document.getElementById("meta-guid").textContent = trip.guid;
  document.getElementById("meta-created").textContent = trip.createdOnMobile;
  document.getElementById("meta-status").textContent = trip.recordStatus;
}

// Auto-save form changes immediately to IndexedDB
async function saveCurrentTrip() {
  if (!selectedGuid) return;
  await db.trips.update(selectedGuid, {
    date: document.getElementById("date").value,
    samplingMethod: document.getElementById("samplingMethod").value,
    targetedSpecies: document.getElementById("targetedSpecies").value,
    purpose: document.getElementById("purpose").value,
    type: document.getElementById("type").value,
    vessel: document.getElementById("vessel").value,
    project: document.getElementById("project").value,
    recorder1: document.getElementById("recorder1").value,
    recorder2: document.getElementById("recorder2").value,
    bioregion: document.getElementById("bioregion").value,
    tideCycle: document.getElementById("tideCycle").value,
    tideRange: document.getElementById("tideRange").value,
    comments: document.getElementById("comments").value,
    siteNumber: document.getElementById("siteNumber").value
  });
  await renderList(document.getElementById("filter-input").value);
}

// Button Handlers
document.getElementById("btn-add").addEventListener("click", async () => {
  const newTrip = {
    guid: createGuid(),
    date: formatToday(),
    samplingMethod: "",
    targetedSpecies: "",
    purpose: "Relative Abundance",
    type: "Independent",
    vessel: "",
    project: "",
    recorder1: "",
    recorder2: "",
    bioregion: "",
    tideCycle: "",
    tideRange: "",
    comments: "",
    siteNumber: "",
    createdOnMobile: formatCreatedTimestamp(),
    recordStatus: "New"
  };
  await db.trips.add(newTrip);
  selectedGuid = newTrip.guid;
  await renderList();
});

document.getElementById("btn-delete").addEventListener("click", async () => {
  if (!selectedGuid) return;
  if (!confirm("Delete this survey trip record?")) return;
  await db.trips.delete(selectedGuid);
  selectedGuid = null;
  await renderList();
});

document.getElementById("btn-edit").addEventListener("click", () => {
  isEditable = !isEditable;
  document.querySelectorAll("#trip-form input, #trip-form select, #trip-form textarea").forEach(el => {
    el.disabled = !isEditable;
  });
  document.getElementById("mode-label").textContent = isEditable ? "Data Entry Mode" : "View Only Mode";
});

// Export all local trips to CSV (attached to the top globe/upload icon)
document.getElementById("btn-export").addEventListener("click", async () => {
  const trips = await db.trips.toArray();
  if (trips.length === 0) return alert("No records to export.");

  const headers = Object.keys(trips[0]);
  const csvRows = [
    headers.join(","),
    ...trips.map(row => headers.map(h => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `biological_survey_trips_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// Filter & Auto-save listeners
document.getElementById("filter-input").addEventListener("input", e => renderList(e.target.value));
document.getElementById("btn-clear-filter").addEventListener("click", () => {
  document.getElementById("filter-input").value = "";
  renderList();
});
document.getElementById("trip-form").addEventListener("input", saveCurrentTrip);
document.getElementById("trip-form").addEventListener("change", saveCurrentTrip);

// Boot app & register offline Service Worker
(async function init() {
  await seedIfEmpty();
  await renderList();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
})();
