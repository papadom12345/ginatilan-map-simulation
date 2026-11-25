const D = [
  { name: "Calabawan", consumers: 87, lat: 9.5703, lon: 123.3335, sources: ["Inambakan Source", "Kasaksakan Source 1", "Kasaksakan Source 2", "Kasaksakan Source 3", "Kampoo Source", "Bulo-Bulo Spring 1", "Bulo-Bulo Spring 2", "Bulo-Bulo Spring 3"] },
  { name: "Cambagte", consumers: 1, lat: 9.585, lon: 123.367, sources: ["Huyong-Huyong Spring 1", "Huyong-Huyong Spring 2", "Tambakan Spring 1", "Tambakan Spring 2", "Tambakan Spring 3"] },
  { name: "Cañorong", consumers: 39, lat: 9.5479, lon: 123.3463, sources: ["Upper Cantias Spring", "Cantias Spring 2", "Bulo-Bulo Spring"] },
  { name: "Guiwanon", consumers: 207, lat: 9.5891, lon: 123.3193, sources: ["Tinumdan Spring"] },
  { name: "Looc", consumers: 193, lat: 9.6062, lon: 123.3198, sources: ["Hilog Spring"] },
  { name: "Malatbo", consumers: 95, lat: 9.5776, lon: 123.3245, sources: ["Kangalis Spring", "Ka-Botoy Spring", "Kasaksakan Spring", "Sima Spring"] },
  { name: "Mangaco", consumers: 85, lat: 9.5569, lon: 123.3467, sources: ["Navy Spring", "Kamongco Spring", "Kabalingkong Spring", "Talawgan Spring"] },
  { name: "Palanas", consumers: 378, lat: 9.5543, lon: 123.323, sources: ["Banahaw Spring", "Ka-Ading Spring", "Ka-Meyon Spring", "Tamba Spring", "Makupa Spring", "Ka-Ipilan Spring", "Linao Spring"] },
  { name: "Poblacion", consumers: 702, lat: 9.5707, lon: 123.3123, sources: ["Banahaw-San Roque Spring"] },
  { name: "Salamanca", consumers: 26, lat: 9.5962, lon: 123.3694, sources: ["Bayabas Spring", "Bandera Spring", "Semie 1 Spring", "Bamboo Spring"] }
];
const PER_CONSUMER = 0.6;
const OVR = {};
const HOME = { center: [123.3330, 9.5740], zoom: 12.6, pitch: 58, bearing: -18 };
const MAP_STYLES = {
  street: "OpenStreetMap / Street Map",
  satellite: "Satellite",
  "satellite-labels": "Satellite with Labels",
  terrain: "Terrain",
  dark: "Dark Map",
  light: "Light Map"
};
function createMapStyle(styleName) {
  const sources = {
    dem: { type: "raster-dem", tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"], encoding: "terrarium", tileSize: 256, maxzoom: 15 }
  };
  let baseSource, baseLayer;
  if (styleName === "satellite" || styleName === "satellite-labels") {
    sources.base = { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19, attribution: "Esri World Imagery" };
    baseSource = "base";
    if (styleName === "satellite-labels") {
      sources.labels = { type: "raster", tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19, attribution: "Esri reference labels" };
    }
  } else if (styleName === "dark" || styleName === "light") {
    sources.base = {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/" + (styleName === "dark" ? "dark_all" : "light_all") + "/{z}/{x}/{y}.png"],
      tileSize: 256, maxzoom: 19, attribution: "&copy; OpenStreetMap &copy; CARTO"
    };
    baseSource = "base";
  } else {
    sources.base = { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "&copy; OpenStreetMap" };
    baseSource = "base";
  }
  baseLayer = { id: "base-map", type: "raster", source: baseSource };
  const layers = [baseLayer];
  if (styleName === "satellite-labels") layers.push({ id: "map-labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.95 } });
  if (styleName === "terrain" || styleName === "street") {
    layers.push({ id: "hill", type: "hillshade", source: "dem", paint: { "hillshade-exaggeration": styleName === "terrain" ? 0.75 : 0.45 } });
  }
  return { version: 8, sources, layers, glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf" };
}

const $ = id => document.getElementById(id);
let selectedMapStyle = "street";
const map = new maplibregl.Map({ container: "map", style: createMapStyle(selectedMapStyle), ...HOME, maxPitch: 85, attributionControl: { compact: true } });
map.addControl(new maplibregl.NavigationControl({ showZoom: false, showCompass: true, visualizePitch: true }), "top-right");
map.addControl(new maplibregl.ScaleControl(), "bottom-right");
map.on("error", event => showError("Some map data did not load: " + ((event.error && event.error.message) || "network error")));

function showError(message) {
  const status = $("st");
  status.textContent = message;
  status.style.display = "block";
}

function rng(seed) {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(value) {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}
const M = 111320;
function offset(lon, lat, meters, degrees) {
  const angle = degrees * Math.PI / 180;
  return [lon + meters * Math.cos(angle) / (M * Math.cos(lat * Math.PI / 180)), lat + meters * Math.sin(angle) / M];
}
function circle(lon, lat, radius, count) {
  const ring = [];
  for (let i = 0; i <= (count || 36); i++) ring.push(offset(lon, lat, radius, i / (count || 36) * 360));
  return ring;
}
function curve(a, b, bow) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const cx = mx - dy * bow, cy = my + dx * bow, points = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16, u = 1 - t;
    points.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
  }
  return points;
}
function along(points, t) {
  const n = points.length - 1, x = t * n, i = Math.min(n - 1, Math.floor(x)), f = x - i;
  return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f];
}
const p2 = n => String(n).padStart(2, "0");
const fmtT = minutes => p2(Math.floor(minutes / 60) % 24) + ":" + p2(Math.floor(minutes % 60));
const fc = features => ({ type: "FeatureCollection", features });
const fmt = value => Math.round(value).toLocaleString();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function dmRaw(hour) {
  const gaussian = (x, mean, spread) => Math.exp(-((x - mean) * (x - mean)) / (2 * spread * spread));
  return 0.45 + 0.9 * gaussian(hour, 7, 1.3) + 0.8 * gaussian(hour, 18, 1.5) + 0.3 * gaussian(hour, 12.5, 1.5);
}
let dmMean = 0;
for (let i = 0; i < 240; i++) dmMean += dmRaw(i / 10);
dmMean /= 240;
const demandMult = hour => dmRaw(hour) / dmMean;

const B = D.map(barangay => {
  const random = rng(hash(barangay.name));
  const avg = barangay.consumers * PER_CONSUMER;
  const yieldRatio = 0.85 + random() * 0.45;
  const weights = barangay.sources.map(() => 0.6 + random() * 0.8);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const tankPosition = offset(barangay.lon, barangay.lat, 220, hash(barangay.name) % 360);
  const tank = {
    lon: tankPosition[0], lat: tankPosition[1], capacity: Math.max(avg * 480, 50),
    level: Math.max(avg * 480, 50) * 0.6, markerFill: null, markerLabel: null
  };
  const springs = barangay.sources.map((name, index) => {
    const angle = -70 + random() * 140, distance = 650 + random() * 700;
    const override = OVR[name] || {};
    const position = offset(barangay.lon, barangay.lat, distance, angle);
    const lon = override.lon != null ? override.lon : position[0];
    const lat = override.lat != null ? override.lat : position[1];
    const base = override.yield_lpm != null ? override.yield_lpm : avg * yieldRatio * weights[index] / weightTotal;
    return {
      name, bar: barangay.name, lon, lat, base, on: true,
      path: curve([lon, lat], tankPosition, (random() - 0.5) * 0.4), pipe: null
    };
  });
  return {
    ...barangay, avg, springs, tank, outletPath: curve(tankPosition, [barangay.lon, barangay.lat], (random() - 0.5) * 0.25),
    level: tank.level, dry: false, inflow: 0, demand: 0, consumptionRate: 0, consumedL: 0,
    pressureReading: 0, pinTxt: null, pinDot: null, pinMarker: null, tankMarker: null,
    meterPopup: null, tankPopup: null, outletPipe: null
  };
});

const SP = [];
const PIPES = [];
B.forEach(barangay => {
  barangay.springs.forEach(spring => {
    spring.id = SP.length;
    SP.push(spring);
    const name = spring.name + " → " + barangay.name + " tank";
    const pipeline = {
      id: "spring-" + PIPES.length, name, initialName: name,
      kind: "Spring → tank", spring, barangay, path: spring.path, initialPath: spring.path.map(point => point.slice()),
      enabled: true, blocked: false, deleted: false, color: "#168ce0", flowLpm: 0
    };
    spring.pipe = pipeline;
    PIPES.push(pipeline);
  });
  const outlet = {
    id: "tank-" + barangay.name, name: barangay.name + " tank → " + barangay.name,
    initialName: barangay.name + " tank → " + barangay.name,
    kind: "Tank → barangay", spring: null, barangay, path: barangay.outletPath,
    initialPath: barangay.outletPath.map(point => point.slice()),
    enabled: true, blocked: false, deleted: false, color: "#168ce0", flowLpm: 0
  };
  barangay.outletPipe = outlet;
  PIPES.push(outlet);
});
const MANUAL_PIPES = [];
let manualIdSequence = 1;
const MANUAL_PIPE_STORAGE_KEY = "ginatilan-water-simulation.manual-pipelines";
const AUTO_PIPE_STORAGE_KEY = "ginatilan-water-simulation.auto-pipeline-edits";
const PIPELINE_HISTORY_LIMIT = 50;
const undoHistory = [];
const redoHistory = [];

let simT = 5 * 60;
let speed = 4;
let playing = true;
let yieldAdjustment = 1;
let weather = "sunny";
let weatherIntensity = 0.5;
let flowLimit = 1200;
let pressure = 60;
let flowClock = 0;
let selectedPipeIndex = 0;
let totalSuppliedL = 0;
let totalDemandL = 0;
let log = [];
let mapReady = false;
let lastFrame = 0;
let lastRefresh = 0;
let orbiting = false;
let drawingMode = false;
let drawingPoints = [];
let editingPipeline = null;
let editOriginalPath = null;
let editOriginalState = null;
let addingEditPoint = false;
let selectedVertexIndex = null;
let editMarkers = [];
let mapInteractionState = null;
let pipelinesVisible = true;
let boundaryGeoJSON = null;
let pipelineOptionsSignature = "";
let overlayLayersReady = false;
let editorPipelineId = null;

function allPipelines() {
  return PIPES.filter(pipeline => !pipeline.deleted).concat(MANUAL_PIPES);
}
function selectedPipeline() {
  return allPipelines()[selectedPipeIndex] || null;
}
function persistManualPipelines() {
  const saved = MANUAL_PIPES.map(pipeline => ({
    id: pipeline.id,
    name: pipeline.name,
    path: pipeline.path,
    color: pipeline.color,
    enabled: pipeline.enabled,
    blocked: pipeline.blocked,
    sourceId: pipeline.spring.id,
    barangay: pipeline.barangay.name
  }));
  try {
    localStorage.setItem(MANUAL_PIPE_STORAGE_KEY, JSON.stringify(saved));
  } catch (error) {
    showError("Could not save manual pipelines in this browser: " + error.message);
  }
}
function persistAutoPipelineEdits() {
  const saved = PIPES.filter(pipeline =>
    pipeline.deleted || pipeline.name !== pipeline.initialName ||
    JSON.stringify(pipeline.path) !== JSON.stringify(pipeline.initialPath) ||
    pipeline.color !== "#168ce0" || !pipeline.enabled || pipeline.blocked
  ).map(pipeline => ({
    id: pipeline.id,
    name: pipeline.name,
    path: pipeline.path,
    color: pipeline.color,
    enabled: pipeline.enabled,
    blocked: pipeline.blocked,
    deleted: pipeline.deleted
  }));
  try {
    if (saved.length) localStorage.setItem(AUTO_PIPE_STORAGE_KEY, JSON.stringify(saved));
    else localStorage.removeItem(AUTO_PIPE_STORAGE_KEY);
  } catch (error) {
    showError("Could not save generated pipeline changes in this browser: " + error.message);
  }
}
function restoreAutoPipelineEdits() {
  let savedText;
  try {
    savedText = localStorage.getItem(AUTO_PIPE_STORAGE_KEY);
  } catch (error) {
    showError("Could not read saved generated pipeline changes: " + error.message);
    return;
  }
  if (!savedText) return;
  try {
    const saved = JSON.parse(savedText);
    if (!Array.isArray(saved)) throw new Error("saved data is not a route list");
    saved.forEach(record => {
      const pipeline = PIPES.find(item => item.id === record.id);
      const validPath = Array.isArray(record.path) && record.path.length >= 2 &&
        record.path.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
      if (!pipeline || !validPath || !/^#[0-9a-f]{6}$/i.test(record.color) || !String(record.name).trim()) {
        throw new Error("a saved route has invalid coordinates, color, or identity");
      }
      pipeline.name = String(record.name);
      pipeline.path = record.path.map(point => point.slice());
      pipeline.color = record.color;
      pipeline.enabled = Boolean(record.enabled);
      pipeline.blocked = Boolean(record.blocked);
      pipeline.deleted = Boolean(record.deleted);
    });
  } catch (error) {
    showError("Saved generated pipeline changes couldn't be loaded: " + error.message);
  }
}
function restoreManualPipelines() {
  let savedText;
  try {
    savedText = localStorage.getItem(MANUAL_PIPE_STORAGE_KEY);
  } catch (error) {
    showError("Could not read saved manual pipelines: " + error.message);
    return;
  }
  if (!savedText) return;
  try {
    const saved = JSON.parse(savedText);
    if (!Array.isArray(saved)) throw new Error("saved data is not a route list");
    saved.forEach(record => {
      const spring = SP[Number(record.sourceId)];
      const barangay = B.find(item => item.name === record.barangay);
      const validPath = Array.isArray(record.path) && record.path.length >= 2 &&
        record.path.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite));
      if (!spring || !barangay || !validPath || !/^#[0-9a-f]{6}$/i.test(record.color)) {
        throw new Error("a saved route has invalid coordinates, color, or connection");
      }
      const pipeline = {
        id: String(record.id), name: String(record.name), kind: "Manual route", manual: true,
        spring, barangay, path: record.path.map(point => point.slice()), color: record.color,
        enabled: Boolean(record.enabled), blocked: Boolean(record.blocked), flowLpm: 0
      };
      MANUAL_PIPES.push(pipeline);
      const match = pipeline.id.match(/^USR-(\d+)$/);
      if (match) manualIdSequence = Math.max(manualIdSequence, Number(match[1]) + 1);
    });
  } catch (error) {
    MANUAL_PIPES.length = 0;
    showError("Saved manual pipelines couldn't be loaded: " + error.message);
  }
}
restoreAutoPipelineEdits();
restoreManualPipelines();

function capturePipelineState() {
  const selected = selectedPipeline();
  const save = pipeline => ({
    id: pipeline.id,
    name: pipeline.name,
    path: pipeline.path.map(point => point.slice()),
    color: pipeline.color,
    enabled: pipeline.enabled,
    blocked: pipeline.blocked,
    deleted: Boolean(pipeline.deleted)
  });
  return {
    generated: PIPES.map(save),
    manual: MANUAL_PIPES.map(pipeline => ({
      ...save(pipeline),
      sourceId: pipeline.spring.id,
      barangay: pipeline.barangay.name
    })),
    selectedId: selected ? selected.id : null
  };
}
function pipelineStateSignature(state) {
  return JSON.stringify([state.generated, state.manual]);
}
function updatePipelineHistoryControls() {
  const editing = drawingMode || Boolean(editingPipeline);
  $("undo-pipeline").disabled = editing || undoHistory.length === 0;
  $("redo-pipeline").disabled = editing || redoHistory.length === 0;
}
function commitPipelineChange(previousState) {
  if (pipelineStateSignature(previousState) === pipelineStateSignature(capturePipelineState())) {
    updatePipelineHistoryControls();
    return false;
  }
  undoHistory.push(previousState);
  if (undoHistory.length > PIPELINE_HISTORY_LIMIT) undoHistory.shift();
  redoHistory.length = 0;
  updatePipelineHistoryControls();
  return true;
}
function restorePipelineState(state) {
  state.generated.forEach(saved => {
    const pipeline = PIPES.find(item => item.id === saved.id);
    if (!pipeline) return;
    pipeline.name = saved.name;
    pipeline.path = saved.path.map(point => point.slice());
    pipeline.color = saved.color;
    pipeline.enabled = saved.enabled;
    pipeline.blocked = saved.blocked;
    pipeline.deleted = saved.deleted;
  });
  const restoredManual = state.manual.map(saved => {
    const spring = SP.find(item => item.id === saved.sourceId);
    const barangay = B.find(item => item.name === saved.barangay);
    if (!spring || !barangay) throw new Error("A pipeline history entry has an invalid source or barangay.");
    const match = saved.id.match(/^USR-(\d+)$/);
    if (match) manualIdSequence = Math.max(manualIdSequence, Number(match[1]) + 1);
    return {
      id: saved.id,
      name: saved.name,
      kind: "Manual route",
      manual: true,
      spring,
      barangay,
      path: saved.path.map(point => point.slice()),
      color: saved.color,
      enabled: saved.enabled,
      blocked: saved.blocked,
      flowLpm: 0
    };
  });
  MANUAL_PIPES.splice(0, MANUAL_PIPES.length, ...restoredManual);
  const selectedIndex = allPipelines().findIndex(pipeline => pipeline.id === state.selectedId);
  selectedPipeIndex = selectedIndex >= 0 ? selectedIndex : 0;
  pipelineOptionsSignature = "";
  editorPipelineId = null;
  persistAutoPipelineEdits();
  persistManualPipelines();
  refresh();
}
function undoPipelineChange() {
  if (drawingMode || editingPipeline || undoHistory.length === 0) return;
  const previousState = undoHistory.pop();
  redoHistory.push(capturePipelineState());
  restorePipelineState(previousState);
  updatePipelineHistoryControls();
}
function redoPipelineChange() {
  if (drawingMode || editingPipeline || redoHistory.length === 0) return;
  const nextState = redoHistory.pop();
  undoHistory.push(capturePipelineState());
  if (undoHistory.length > PIPELINE_HISTORY_LIMIT) undoHistory.shift();
  restorePipelineState(nextState);
  updatePipelineHistoryControls();
}

const day = () => Math.floor(simT / 1440) + 1;
const weatherNames = { sunny: "Sunny", cloudy: "Cloudy", rainy: "Rainy", "heavy-rain": "Heavy Rain", storm: "Storm" };
function syncWeatherClass() {
  Object.keys(weatherNames).forEach(condition => {
    document.body.classList.toggle("weather-" + condition, condition === weather);
  });
}
function weatherMultiplier() {
  let multiplier = 1;
  if (weather === "sunny") multiplier = 1 - 0.38 * weatherIntensity;
  if (weather === "cloudy") multiplier = 1 - 0.08 * weatherIntensity;
  if (weather === "rainy") multiplier = 1 + 0.38 * weatherIntensity;
  if (weather === "heavy-rain") multiplier = 1 + 0.82 * weatherIntensity;
  if (weather === "storm") multiplier = 1 + 0.32 * weatherIntensity + 0.45 * weatherIntensity * Math.sin(simT / 210);
  return Math.max(0.12, multiplier);
}
function addLog(message) {
  log.push(fmtT(simT) + " (day " + day() + ") " + message);
  if (log.length > 40) log.shift();
  $("log").replaceChildren(...log.slice(-5).reverse().map(text => {
    const row = document.createElement("div");
    row.textContent = text;
    return row;
  }));
}
function color(barangay) {
  const fraction = barangay.tank.level / barangay.tank.capacity;
  return barangay.dry ? "#d7263d" : fraction < 0.2 ? "#f18f01" : fraction < 0.5 ? "#e6c229" : "#2e9e5b";
}
function routeStatus(pipeline) {
  if (pipeline.deleted) return "Closed";
  if (!pipeline.enabled) return "Closed";
  if (pipeline.blocked) return "Blocked";
  if (pipeline.spring && !pipeline.spring.on) return "Closed";
  if (!pipeline.manual && pipeline.spring && MANUAL_PIPES.some(route => route.spring === pipeline.spring)) return "Closed";
  if (pressure < 20) return "Low Pressure";
  return "Active";
}
function routeCanFlow(pipeline) {
  return !pipeline.deleted && pipeline.enabled && !pipeline.blocked && (!pipeline.spring || pipeline.spring.on) && pressure > 0;
}
function calculateFlows() {
  const multiplier = weatherMultiplier() * yieldAdjustment;
  const pressureFactor = Math.min(1.35, pressure / 50);
  const flowFactor = flowLimit / 1200;
  const candidates = new Map();
  const manualBySpring = new Map();
  MANUAL_PIPES.forEach(pipeline => {
    if (!manualBySpring.has(pipeline.spring)) manualBySpring.set(pipeline.spring, []);
    manualBySpring.get(pipeline.spring).push(pipeline);
  });
  let totalPotential = 0;
  B.forEach(barangay => {
    barangay.demand = barangay.avg * demandMult((simT / 60) % 24);
    let barangayPotential = 0;
    barangay.springs.forEach(spring => {
      const manualRoutes = manualBySpring.get(spring) || [];
      if (manualRoutes.length) {
        const openRoutes = manualRoutes.filter(routeCanFlow);
        const sharedYield = spring.on && openRoutes.length
          ? spring.base * multiplier * pressureFactor * flowFactor / openRoutes.length
          : 0;
        manualRoutes.forEach(pipeline => {
          const flow = openRoutes.includes(pipeline) ? sharedYield : 0;
          candidates.set(pipeline, flow);
          totalPotential += flow;
        });
        candidates.set(spring.pipe, 0);
        return;
      }
      const available = spring.on && routeCanFlow(spring.pipe) && routeCanFlow(barangay.outletPipe);
      const flow = available ? spring.base * multiplier * pressureFactor * flowFactor : 0;
      candidates.set(spring.pipe, flow);
      barangayPotential += flow;
    });
    candidates.set(barangay.outletPipe, barangayPotential);
    totalPotential += barangayPotential;
  });
  const flowScale = totalPotential > 2000 ? 2000 / totalPotential : 1;
  B.forEach(barangay => {
    barangay.inflow = 0;
    barangay.springs.forEach(spring => {
      spring.pipe.flowLpm = (candidates.get(spring.pipe) || 0) * flowScale;
      barangay.inflow += spring.pipe.flowLpm;
    });
    barangay.outletPipe.flowLpm = barangay.inflow;
  });
  MANUAL_PIPES.forEach(pipeline => {
    pipeline.flowLpm = (candidates.get(pipeline) || 0) * flowScale;
    pipeline.barangay.inflow += pipeline.flowLpm;
  });
}
function step(dtMin) {
  calculateFlows();
  let supplied = 0, demanded = 0;
  B.forEach(barangay => {
    const previousLevel = barangay.tank.level;
    const demandLiters = barangay.demand * dtMin;
    const inflowLiters = barangay.inflow * dtMin;
    const consumed = Math.min(demandLiters, previousLevel + inflowLiters);
    barangay.tank.level = clamp(previousLevel + inflowLiters - demandLiters, 0, barangay.tank.capacity);
    barangay.level = barangay.tank.level;
    barangay.consumptionRate = dtMin > 0 ? consumed / dtMin : 0;
    barangay.consumedL += consumed;
    supplied += inflowLiters;
    demanded += demandLiters;

    const dryNow = barangay.tank.level <= 0 && barangay.inflow < barangay.demand * 0.999;
    if (dryNow && !barangay.dry) addLog(barangay.name + " ran dry");
    if (!dryNow && barangay.dry) addLog(barangay.name + " supply restored");
    barangay.dry = dryNow;
  });
  totalSuppliedL += supplied;
  totalDemandL += demanded;
  simT += dtMin;
}

function pipesData() {
  return fc(allPipelines().map((pipeline, index) => ({
    type: "Feature",
    properties: {
      i: index, status: routeStatus(pipeline), selected: index === selectedPipeIndex ? 1 : 0,
      manual: pipeline.manual ? 1 : 0, color: pipeline.color || "#168ce0"
    },
    geometry: { type: "LineString", coordinates: pipeline.path }
  })));
}
function drawingData() {
  const features = [];
  if (drawingPoints.length >= 2) {
    features.push({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: drawingPoints.map(point => point.slice()) }
    });
  }
  drawingPoints.forEach((point, index) => {
    const role = index === 0 ? "start" : index === drawingPoints.length - 1 ? "end" : "turn";
    features.push({
      type: "Feature",
      properties: { role },
      geometry: { type: "Point", coordinates: point.slice() }
    });
  });
  return fc(features);
}
function updateDrawingTrace() {
  if (mapReady && overlayLayersReady) map.getSource("pipeline-draft").setData(drawingData());
}
function springsData() {
  return fc(SP.map(spring => ({
    type: "Feature", properties: { i: spring.id, on: spring.on ? 1 : 0 },
    geometry: { type: "Point", coordinates: [spring.lon, spring.lat] }
  })));
}
function dropsData() {
  const features = [];
  allPipelines().forEach(pipeline => {
    if (!routeCanFlow(pipeline) || pipeline.flowLpm <= 0) return;
    const count = clamp(Math.round(pipeline.flowLpm / 55), 1, 6);
    for (let i = 0; i < count; i++) {
      const t = ((i / count) + flowClock * 0.12) % 1;
      features.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: along(pipeline.path, t) } });
    }
  });
  return fc(features);
}
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function meterStatus(barangay) {
  if (barangay.dry) return "Water shortage";
  if (pressure < 20 && barangay.inflow > 0) return "Low pressure";
  if (barangay.tank.level / barangay.tank.capacity < 0.2) return "Low tank level";
  return "Operational";
}
function meterHtml(barangay) {
  const sourceList = barangay.springs.map(spring => "<li>" + escapeHtml(spring.name) + (spring.on ? "" : " (off)") + "</li>").join("");
  return "<strong>" + escapeHtml(barangay.name) + " · Simulated water meter</strong>" +
    "<br>Current water consumption: " + fmt(barangay.consumptionRate) + " L/min" +
    "<br>Current flow rate: " + fmt(barangay.inflow) + " L/min" +
    "<br>Total consumed: " + fmt(barangay.consumedL) + " L" +
    "<br>Current demand: " + fmt(barangay.demand) + " L/min" +
    "<br>Water pressure: " + fmt(barangay.pressureReading) + " PSI" +
    "<br>Tank level: " + fmt(barangay.tank.level) + " / " + fmt(barangay.tank.capacity) + " L" +
    "<br>Meter status: " + escapeHtml(meterStatus(barangay)) +
    "<br>Consumers: " + fmt(barangay.consumers) + "<br>Listed water sources:<ul>" + sourceList + "</ul>" +
    "<i>All meter readings and route positions are simulated.</i>";
}
function tankHtml(barangay) {
  return "<strong>" + escapeHtml(barangay.name) + " storage tank</strong>" +
    "<br>Water level: " + fmt(barangay.tank.level) + " L (" + fmt(barangay.tank.level / barangay.tank.capacity * 100) + "%)" +
    "<br>Capacity: " + fmt(barangay.tank.capacity) + " L" +
    "<br>Inflow: " + fmt(barangay.inflow) + " L/min" +
    "<br>Tank location and values are illustrative simulation data.";
}
function updateTankMarker(barangay) {
  const fraction = barangay.tank.level / barangay.tank.capacity;
  if (barangay.tank.markerFill) {
    barangay.tank.markerFill.style.height = (fraction * 100) + "%";
    barangay.tank.markerFill.style.background = color(barangay);
  }
  if (barangay.tank.markerLabel) barangay.tank.markerLabel.textContent = fmt(fraction * 100) + "%";
}
function pointLabel(point) {
  return Number(point[1]).toFixed(5) + ", " + Number(point[0]).toFixed(5);
}
function routeLengthMeters(points) {
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    const lat1 = points[i - 1][1] * Math.PI / 180;
    const lat2 = points[i][1] * Math.PI / 180;
    const dLat = lat2 - lat1, dLon = (points[i][0] - points[i - 1][0]) * Math.PI / 180;
    const a = clamp(Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2, 0, 1);
    distance += 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return distance;
}
function updatePipelineOptions() {
  const pipelines = allPipelines();
  const signature = pipelines.map(pipeline => pipeline.id + ":" + pipeline.name).join("|");
  if (signature === pipelineOptionsSignature) return;
  pipelineOptionsSignature = signature;
  const select = $("pipe-select");
  select.replaceChildren(...pipelines.map((pipeline, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = (pipeline.manual ? "[MANUAL] " : "[SIMULATED] ") + pipeline.name;
    return option;
  }));
  $("route-count").textContent = pipelines.length + " routes";
  $("tpipe-total").textContent = "of " + pipelines.length + " routes";
}
function renderPipelineDetails() {
  const pipelines = allPipelines();
  if (selectedPipeIndex >= pipelines.length) selectedPipeIndex = Math.max(0, pipelines.length - 1);
  updatePipelineOptions();
  const pipeline = selectedPipeline();
  if (!pipeline) {
    $("pipe-select").disabled = true;
    $("edit-pipeline").disabled = true;
    $("delete-pipeline").disabled = true;
    $("apply-pipe-properties").disabled = true;
    $("edit-pipe-name").disabled = true;
    $("edit-pipe-color").disabled = true;
    $("edit-pipe-status").disabled = true;
    return;
  }
  const status = routeStatus(pipeline);
  $("pipe-select").value = String(selectedPipeIndex);
  $("pipe-name").textContent = pipeline.name;
  $("pipe-flow").textContent = "Current flow: " + fmt(pipeline.flowLpm) + " L/min";
  $("pipe-type").textContent = pipeline.manual ? "Manual route" : "Auto-generated route";
  $("pipeline-status").textContent = status;
  $("pipeline-status").className = "status-chip " + status.toLowerCase().replace(" ", "-");
  $("pipe-toggle").textContent = pipeline.enabled ? "Close pipeline" : "Open pipeline";
  $("pipe-block").textContent = pipeline.blocked ? "Clear blockage" : "Simulate blockage";
  const toolBusy = drawingMode || Boolean(editingPipeline);
  $("pipe-select").disabled = toolBusy;
  $("pipe-toggle").disabled = toolBusy;
  $("pipe-block").disabled = !pipeline.enabled || toolBusy;
  $("pipe-id").textContent = pipeline.id;
  $("pipe-start").textContent = pointLabel(pipeline.path[0]);
  $("pipe-destination").textContent = pointLabel(pipeline.path[pipeline.path.length - 1]);
  $("pipe-length").textContent = fmt(routeLengthMeters(pipeline.path)) + " m (estimated)";
  $("pipe-pressure").textContent = fmt(pipeline.flowLpm > 0 ? pressure : 0) + " PSI";
  $("pipe-source").textContent = pipeline.spring ? pipeline.spring.name : "Stored tank supply";
  $("pipe-barangay").textContent = pipeline.barangay.name;
  $("edit-pipeline").disabled = drawingMode || Boolean(editingPipeline);
  $("delete-pipeline").disabled = drawingMode || Boolean(editingPipeline);
  $("apply-pipe-properties").disabled = drawingMode || Boolean(editingPipeline);
  $("edit-pipe-name").disabled = Boolean(editingPipeline);
  $("edit-pipe-color").disabled = Boolean(editingPipeline);
  $("edit-pipe-status").disabled = Boolean(editingPipeline);
  if (editorPipelineId !== pipeline.id) {
    editorPipelineId = pipeline.id;
    $("edit-pipe-name").value = pipeline.name;
    $("edit-pipe-color").value = pipeline.color || "#168ce0";
    $("edit-pipe-status").value = pipeline.enabled ? (pipeline.blocked ? "Blocked" : "Active") : "Inactive";
  }
}
function updateWeatherEffects() {
  syncWeatherClass();
  $("weather").value = weather;
  $("weather-label").textContent = weatherNames[weather];
  $("intensity-value").textContent = Math.round(weatherIntensity * 100) + "%";
  const impact = (weatherMultiplier() - 1) * 100;
  $("weather-impact").textContent = impact >= 0 ? "Recharge +" + Math.round(impact) + "%" : "Spring yield " + Math.round(impact) + "%";
}
function refresh() {
  calculateFlows();
  const demandColumns = [], supplyColumns = [];
  let totalFlow = 0, totalDemand = 0, dryCount = 0, available = 0, pressureTotal = 0, pressureCount = 0;
  let activePipelines = 0, operationalSprings = 0;
  const height = value => 25 + 55 * Math.sqrt(Math.max(value, 0));
  B.forEach(barangay => {
    const shade = color(barangay);
    totalFlow += barangay.inflow;
    totalDemand += barangay.demand;
    available += barangay.tank.level;
    if (barangay.dry) dryCount++;
    barangay.pressureReading = barangay.inflow > 0 ? pressure : (barangay.tank.level > 0 ? pressure * 0.65 : 0);
    if (barangay.pressureReading > 0) {
      pressureTotal += barangay.pressureReading;
      pressureCount++;
    }
    if (barangay.pinTxt) {
      barangay.pinTxt.textContent = fmt(barangay.tank.level / barangay.tank.capacity * 100) + "%";
      barangay.pinDot.style.background = shade;
    }
    updateTankMarker(barangay);
    if (barangay.meterPopup && barangay.meterPopup.isOpen()) barangay.meterPopup.setHTML(meterHtml(barangay));
    if (barangay.tankPopup && barangay.tankPopup.isOpen()) barangay.tankPopup.setHTML(tankHtml(barangay));
    demandColumns.push({
      type: "Feature", properties: { h: height(barangay.demand), c: shade },
      geometry: { type: "Polygon", coordinates: [circle(barangay.lon, barangay.lat, 300)] }
    });
    supplyColumns.push({
      type: "Feature", properties: { h: barangay.inflow > 0 ? height(barangay.inflow) : 1, c: shade },
      geometry: { type: "Polygon", coordinates: [circle(barangay.lon, barangay.lat, 190)] }
    });
    barangay.springs.forEach(spring => {
      if (spring.on && (spring.pipe.flowLpm > 0 || MANUAL_PIPES.some(pipeline => pipeline.spring === spring && pipeline.flowLpm > 0))) operationalSprings++;
    });
  });
  allPipelines().forEach(pipeline => { if (routeStatus(pipeline) === "Active") activePipelines++; });

  if (mapReady && overlayLayersReady) {
    map.getSource("dem-col").setData(fc(demandColumns));
    map.getSource("sup-col").setData(fc(supplyColumns));
    map.getSource("pipes").setData(pipesData());
    map.getSource("pipeline-draft").setData(drawingData());
    map.getSource("springs").setData(springsData());
  }
  $("clk").textContent = fmtT(simT);
  $("day").textContent = "Day " + day();
  $("tsup").textContent = fmt(totalFlow);
  $("tdem").textContent = fmt(totalDemand);
  $("tcons").textContent = fmt(B.reduce((sum, barangay) => sum + barangay.consumedL, 0));
  $("tpressure").textContent = fmt(pressureCount ? pressureTotal / pressureCount : 0);
  $("tactive").textContent = fmt(activePipelines);
  $("tpipe-total").textContent = "of " + allPipelines().length + " routes";
  $("tsprings").textContent = fmt(operationalSprings);
  $("tspring-total").textContent = "of " + SP.length + " sources";
  $("tdry").textContent = String(dryCount);
  $("available").textContent = fmt(available) + " L";
  $("supplied-total").textContent = fmt(totalSuppliedL) + " L";
  $("demand-total").textContent = fmt(totalDemandL) + " L";
  $("weather-impact").textContent = ((weatherMultiplier() - 1) >= 0 ? "Recharge +" : "Spring yield ") + Math.round((weatherMultiplier() - 1) * 100) + "%";
  renderPipelineDetails();
  updatePipelineHistoryControls();
}

function makeArrowImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d");
  context.fillStyle = "#0877c9";
  context.strokeStyle = "#ffffff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(5, 16);
  context.lineTo(24, 16);
  context.moveTo(17, 8);
  context.lineTo(25, 16);
  context.lineTo(17, 24);
  context.stroke();
  context.fill();
  context.beginPath();
  context.moveTo(17, 8);
  context.lineTo(26, 16);
  context.lineTo(17, 24);
  context.closePath();
  context.fill();
  return context.getImageData(0, 0, 32, 32);
}

function selectPipeline(index, showPopup) {
  selectedPipeIndex = clamp(index, 0, allPipelines().length - 1);
  refresh();
  if (showPopup && mapReady) {
    const pipeline = selectedPipeline();
    const midpoint = along(pipeline.path, 0.5);
    new maplibregl.Popup({ offset: 10 })
      .setLngLat(midpoint)
      .setHTML("<strong>" + escapeHtml(pipeline.name) + "</strong><br>Status: " + routeStatus(pipeline) +
        "<br>Flow: " + fmt(pipeline.flowLpm) + " L/min<br>" +
        (pipeline.manual ? "Manually drawn estimated route." : "Automatically generated estimated route.") +
        " Not surveyed infrastructure.")
      .addTo(map);
  }
}

function addBoundaryLayer() {
  if (!boundaryGeoJSON || map.getSource("bd")) return;
  map.addSource("bd", { type: "geojson", data: boundaryGeoJSON });
  map.addLayer({
    id: "bd-line", type: "line", source: "bd",
    paint: { "line-color": "#e8590c", "line-width": 3, "line-dasharray": [3, 2] }
  }, "pipe-casing");
}
function installSimulationLayers() {
  overlayLayersReady = false;
  map.addSource("pipes", { type: "geojson", data: pipesData() });
  map.addSource("pipeline-draft", { type: "geojson", data: drawingData() });
  map.addSource("springs", { type: "geojson", data: springsData() });
  map.addSource("drops", { type: "geojson", data: dropsData() });
  map.addSource("dem-col", { type: "geojson", data: fc([]) });
  map.addSource("sup-col", { type: "geojson", data: fc([]) });

  map.addLayer({
    id: "dem-col", type: "fill-extrusion", source: "dem-col",
    paint: { "fill-extrusion-color": ["get", "c"], "fill-extrusion-height": ["get", "h"], "fill-extrusion-opacity": 0.22 }
  });
  map.addLayer({
    id: "sup-col", type: "fill-extrusion", source: "sup-col",
    paint: { "fill-extrusion-color": ["get", "c"], "fill-extrusion-height": ["get", "h"], "fill-extrusion-opacity": 0.85, "fill-extrusion-vertical-gradient": true }
  });
  map.addLayer({
    id: "pipe-casing", type: "line", source: "pipes",
    paint: { "line-color": "#ffffff", "line-width": ["case", ["==", ["get", "selected"], 1], 9, 5], "line-opacity": 0.95 }
  });
  map.addLayer({
    id: "pipe", type: "line", source: "pipes",
    paint: {
      "line-width": ["case", ["==", ["get", "selected"], 1], 5, 2.5],
      "line-color": ["case",
        ["==", ["get", "selected"], 1], "#ffc928",
        ["==", ["get", "status"], "Blocked"], "#d63737",
        ["==", ["get", "status"], "Closed"], "#7d898e",
        ["==", ["get", "status"], "Low Pressure"], "#e59a18",
        ["get", "color"]],
      "line-opacity": 0.94
    }
  });
  if (!map.hasImage("flow-arrow")) map.addImage("flow-arrow", makeArrowImage());
  map.addLayer({
    id: "pipe-arrows", type: "symbol", source: "pipes",
    layout: { "symbol-placement": "line", "icon-image": "flow-arrow", "icon-size": 0.55, "icon-rotation-alignment": "map", "icon-keep-upright": false, "icon-allow-overlap": true, "icon-ignore-placement": true },
    paint: { "icon-opacity": ["case", ["==", ["get", "status"], "Active"], 0.95, 0.45] }
  });
  map.addLayer({
    id: "springs", type: "circle", source: "springs",
    paint: {
      "circle-radius": 7,
      "circle-color": ["case", ["==", ["get", "on"], 1], "#168ce0", "#555555"],
      "circle-stroke-color": "#ffffff", "circle-stroke-width": 2
    }
  });
  map.addLayer({
    id: "drops", type: "circle", source: "drops",
    paint: { "circle-radius": 3.2, "circle-color": "#c5f1ff", "circle-stroke-color": "#1565a8", "circle-stroke-width": 1 }
  });
  map.addLayer({
    id: "pipeline-draft-casing", type: "line", source: "pipeline-draft",
    paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.95 }
  });
  map.addLayer({
    id: "pipeline-draft-line", type: "line", source: "pipeline-draft",
    paint: { "line-color": "#ff6b35", "line-width": 4, "line-dasharray": [1.4, 0.8] }
  });
  map.addLayer({
    id: "pipeline-draft-points", type: "circle", source: "pipeline-draft",
    paint: {
      "circle-radius": ["case", ["==", ["get", "role"], "turn"], 4, 6],
      "circle-color": ["match", ["get", "role"], "start", "#25a55b", "end", "#e64b35", "#168ce0"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2
    }
  });
  if (!pipelinesVisible) setPipelineVisibility(false);
  addBoundaryLayer();
  overlayLayersReady = true;
}

let boundaryRequestStarted = false;
function loadMunicipalBoundary() {
  if (boundaryRequestStarted) return;
  boundaryRequestStarted = true;
  fetch("https://nominatim.openstreetmap.org/search?q=Ginatilan,+Cebu&format=geojson&polygon_geojson=1&limit=1")
    .then(response => {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(geojson => {
      if (!geojson.features || !geojson.features.length) return;
      boundaryGeoJSON = geojson;
      if (mapReady) addBoundaryLayer();
    })
    .catch(error => showError("Municipal boundary unavailable: " + error.message));
}

map.on("load", () => {
  mapReady = true;
  installSimulationLayers();
  map.setTerrain({ source: "dem", exaggeration: 1.6 });
  B.forEach(addMapMarkers);
  loadMunicipalBoundary();
  refresh();
  requestAnimationFrame(frame);
});
map.on("style.load", () => {
  if (!mapReady) return;
  installSimulationLayers();
  map.setTerrain({ source: "dem", exaggeration: 1.6 });
  refresh();
});
map.on("click", event => {
  if (drawingMode) {
    addDrawingPoint([event.lngLat.lng, event.lngLat.lat]);
    return;
  }
  if (editingPipeline) {
    if (addingEditPoint) addEditPoint([event.lngLat.lng, event.lngLat.lat]);
    return;
  }
  if (!mapReady || !overlayLayersReady) return;
  const features = map.queryRenderedFeatures(event.point, { layers: ["springs", "pipe", "pipe-arrows"] });
  const springFeature = features.find(feature => feature.layer.id === "springs");
  if (springFeature) {
    const spring = SP[Number(springFeature.properties.i)];
    spring.on = !spring.on;
    addLog((spring.on ? "Restored " : "Cut off ") + spring.name + " (" + spring.bar + ")");
    refresh();
    new maplibregl.Popup({ offset: 10 }).setLngLat([spring.lon, spring.lat]).setHTML(
      "<strong>" + escapeHtml(spring.name) + "</strong><br>Serves " + escapeHtml(spring.bar) +
      "<br>Yield: " + fmt(spring.base * weatherMultiplier() * yieldAdjustment) + " L/min<br>Status: " +
      (spring.on ? routeStatus(spring.pipe) : "Source off") +
      "<br><i>Source position and yield are illustrative simulated values.</i>"
    ).addTo(map);
    return;
  }
  const pipelineFeature = features.find(feature => feature.layer.id === "pipe" || feature.layer.id === "pipe-arrows");
  if (pipelineFeature) selectPipeline(Number(pipelineFeature.properties.i), true);
});
map.on("dblclick", () => {
  if (drawingMode) finishDrawing();
});
map.on("mousemove", event => {
  if (drawingMode || addingEditPoint) {
    map.getCanvas().style.cursor = "crosshair";
    return;
  }
  if (!mapReady || !overlayLayersReady) return;
  const hits = map.queryRenderedFeatures(event.point, { layers: ["springs", "pipe", "pipe-arrows"] });
  map.getCanvas().style.cursor = hits.length ? "pointer" : "";
});

function changeMapInteractions(disabled) {
  const names = ["dragPan", "dragRotate", "scrollZoom", "boxZoom", "doubleClickZoom", "touchZoomRotate", "touchPitch", "keyboard"];
  if (disabled) {
    mapInteractionState = {};
    names.forEach(name => {
      const handler = map[name];
      if (!handler || typeof handler.isEnabled !== "function") return;
      mapInteractionState[name] = handler.isEnabled();
      handler.disable();
    });
    B.forEach(barangay => {
      if (barangay.pinMarker) barangay.pinMarker.getElement().style.pointerEvents = "none";
      if (barangay.tankMarker) barangay.tankMarker.getElement().style.pointerEvents = "none";
    });
    return;
  }
  if (!mapInteractionState) return;
  Object.keys(mapInteractionState).forEach(name => {
    if (mapInteractionState[name]) map[name].enable();
  });
  B.forEach(barangay => {
    if (barangay.pinMarker) barangay.pinMarker.getElement().style.pointerEvents = "";
    if (barangay.tankMarker) barangay.tankMarker.getElement().style.pointerEvents = "";
  });
  mapInteractionState = null;
}
function setDrawingControls(active) {
  $("add-pipeline").disabled = active;
  $("pipe-select").disabled = active || Boolean(editingPipeline);
  $("finish-drawing").disabled = !active || drawingPoints.length < 2;
  $("cancel-drawing").disabled = !active;
  $("drawing-help").textContent = active
    ? "Drawing: click at least two map points, then double-click or choose Finish Pipeline. Dragging and map navigation are paused."
    : "Add Pipeline, then click map points. Double-click or choose Finish Pipeline to save.";
}
function addDrawingPoint(point) {
  const last = drawingPoints[drawingPoints.length - 1];
  if (last && routeLengthMeters([last, point]) < 2) return;
  drawingPoints.push(point);
  $("finish-drawing").disabled = drawingPoints.length < 2;
  $("drawing-help").textContent = "Drawing " + drawingPoints.length + " route point" + (drawingPoints.length === 1 ? "" : "s") + ". Double-click or choose Finish Pipeline to save.";
  updateDrawingTrace();
}
function startDrawing() {
  if (drawingMode || editingPipeline) return;
  drawingMode = true;
  drawingPoints = [];
  changeMapInteractions(true);
  map.getCanvas().style.cursor = "crosshair";
  setDrawingControls(true);
  refresh();
}
function stopDrawing() {
  drawingMode = false;
  drawingPoints = [];
  updateDrawingTrace();
  changeMapInteractions(false);
  map.getCanvas().style.cursor = "";
  setDrawingControls(false);
  refresh();
}
function finishDrawing() {
  if (!drawingMode || drawingPoints.length < 2) return;
  const previousState = capturePipelineState();
  const spring = SP[Number($("manual-source").value)];
  const barangay = B[Number($("manual-barangay").value)];
  const name = $("manual-name").value.trim() || ("Manual pipeline " + String(manualIdSequence).padStart(3, "0"));
  const pipeline = {
    id: "USR-" + String(manualIdSequence++).padStart(4, "0"),
    name, kind: "Manual route", manual: true, spring, barangay,
    path: drawingPoints.map(point => point.slice()), enabled: true, blocked: false,
    color: "#168ce0", flowLpm: 0
  };
  MANUAL_PIPES.push(pipeline);
  commitPipelineChange(previousState);
  persistManualPipelines();
  stopDrawing();
  selectedPipeIndex = allPipelines().length - 1;
  pipelineOptionsSignature = "";
  addLog("Added manual route " + pipeline.name);
  refresh();
}
function cancelDrawing() {
  if (!drawingMode) return;
  stopDrawing();
}
function removeEditMarkers() {
  editMarkers.forEach(marker => marker.remove());
  editMarkers = [];
}
function rebuildEditMarkers() {
  removeEditMarkers();
  editingPipeline.path.forEach((point, index) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = "vertex-marker";
    element.setAttribute("aria-label", "Drag route point " + (index + 1));
    if (index === selectedVertexIndex) element.classList.add("selected");
    element.addEventListener("click", event => {
      event.stopPropagation();
      selectedVertexIndex = index;
      editMarkers.forEach((item, itemIndex) => item.getElement().classList.toggle("selected", itemIndex === index));
      $("remove-route-point").disabled = editingPipeline.path.length <= 2;
    });
    const marker = new maplibregl.Marker({ element, anchor: "center", draggable: true })
      .setLngLat(point).addTo(map);
    marker.on("dragend", () => {
      editingPipeline.path[index] = marker.getLngLat().toArray();
      refresh();
    });
    editMarkers.push(marker);
  });
}
function startPipelineEdit() {
  const pipeline = selectedPipeline();
  if (!pipeline || drawingMode || editingPipeline) return;
  editOriginalState = capturePipelineState();
  editingPipeline = pipeline;
  editOriginalPath = pipeline.path.map(point => point.slice());
  addingEditPoint = false;
  selectedVertexIndex = null;
  changeMapInteractions(true);
  rebuildEditMarkers();
  $("edit-pipeline").disabled = true;
  $("delete-pipeline").disabled = true;
  $("apply-pipe-properties").disabled = true;
  $("edit-pipe-name").disabled = true;
  $("edit-pipe-color").disabled = true;
  $("edit-pipe-status").disabled = true;
  $("add-route-point").disabled = false;
  $("remove-route-point").disabled = pipeline.path.length <= 2;
  $("save-edit").disabled = false;
  $("cancel-edit").disabled = false;
  $("drawing-help").textContent = "Drag orange route points to reshape the route, or choose Add route point and click the map.";
  refresh();
}
function addEditPoint(point) {
  if (!editingPipeline || !addingEditPoint) return;
  editingPipeline.path.push(point);
  selectedVertexIndex = editingPipeline.path.length - 1;
  addingEditPoint = false;
  $("add-route-point").classList.remove("on");
  rebuildEditMarkers();
  $("remove-route-point").disabled = editingPipeline.path.length <= 2;
  $("drawing-help").textContent = "Drag orange route points or select one and remove it. Route edits are not saved until you choose Save edit.";
  refresh();
}
function closePipelineEdit(restore) {
  if (!editingPipeline) return;
  if (restore) editingPipeline.path = editOriginalPath.map(point => point.slice());
  else {
    commitPipelineChange(editOriginalState);
    if (editingPipeline.manual) persistManualPipelines();
    else persistAutoPipelineEdits();
  }
  removeEditMarkers();
  editingPipeline = null;
  editOriginalPath = null;
  editOriginalState = null;
  addingEditPoint = false;
  selectedVertexIndex = null;
  changeMapInteractions(false);
  map.getCanvas().style.cursor = "";
  $("add-route-point").disabled = true;
  $("remove-route-point").disabled = true;
  $("save-edit").disabled = true;
  $("cancel-edit").disabled = true;
  $("add-route-point").classList.remove("on");
  $("drawing-help").textContent = "Add Pipeline, then click map points. Double-click or Finish Drawing to save.";
  refresh();
}
function setPipelineVisibility(visible) {
  pipelinesVisible = visible;
  ["pipe-casing", "pipe", "pipe-arrows", "drops"].forEach(layerId => {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
  });
  $("toggle-pipelines").textContent = visible ? "Hide Pipelines" : "Show Pipelines";
  $("map-only-pipelines").textContent = visible ? "Hide Pipelines" : "Show Pipelines";
  $("map-only-pipelines").setAttribute("aria-pressed", String(visible));
}
function selectMapStyle(styleName, force) {
  if (!Object.prototype.hasOwnProperty.call(MAP_STYLES, styleName)) return;
  const changed = styleName !== selectedMapStyle;
  selectedMapStyle = styleName;
  $("map-style").value = styleName;
  $("map-only-style").value = styleName;
  $("sat").classList.toggle("on", styleName === "satellite" || styleName === "satellite-labels");
  if (mapReady && (force || changed)) {
    overlayLayersReady = false;
    map.setStyle(createMapStyle(styleName));
  }
}
function setMapOnlyMode(enabled) {
  document.body.classList.toggle("map-only-mode", enabled);
  [document.querySelector(".dashboard"), document.querySelector(".pipeline-panel"), document.querySelector(".bar")].forEach(panel => {
    panel.inert = enabled;
    panel.setAttribute("aria-hidden", String(enabled));
  });
  $("map-only-toolbar").setAttribute("aria-hidden", String(!enabled));
  $("map-only-toggle").setAttribute("aria-pressed", String(enabled));
  if (enabled) $("exit-map-only").focus();
  else $("map-only-toggle").focus();
  requestAnimationFrame(() => map.resize());
}
function enterMapOnlyMode() {
  setMapOnlyMode(true);
  if (document.fullscreenElement) return;
  if (!document.documentElement.requestFullscreen) {
    showError("Fullscreen is unavailable in this browser; map-only mode is active.");
    return;
  }
  document.documentElement.requestFullscreen().catch(error => {
    showError("Map-only mode is active, but fullscreen could not start: " + error.message);
  });
}
function exitMapOnlyMode() {
  if (!document.body.classList.contains("map-only-mode")) return;
  setMapOnlyMode(false);
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(error => {
      showError("Map-only mode ended, but fullscreen could not close: " + error.message);
    });
  }
}
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && document.body.classList.contains("map-only-mode")) setMapOnlyMode(false);
  requestAnimationFrame(() => map.resize());
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("map-only-mode")) {
    exitMapOnlyMode();
  }
});
function applyPipelineProperties() {
  const pipeline = selectedPipeline();
  if (!pipeline || editingPipeline) return;
  const newName = $("edit-pipe-name").value.trim();
  if (!newName) {
    $("edit-pipe-name").focus();
    return;
  }
  const previousState = capturePipelineState();
  pipeline.name = newName;
  pipeline.color = $("edit-pipe-color").value;
  const status = $("edit-pipe-status").value;
  pipeline.enabled = status !== "Inactive";
  pipeline.blocked = status === "Blocked";
  commitPipelineChange(previousState);
  if (pipeline.manual) persistManualPipelines();
  else persistAutoPipelineEdits();
  pipelineOptionsSignature = "";
  addLog("Updated " + (pipeline.manual ? "manual" : "generated") + " route " + pipeline.name);
  refresh();
}
function deleteSelectedPipeline() {
  const pipeline = selectedPipeline();
  if (!pipeline) return;
  const isManual = Boolean(pipeline.manual);
  const prompt = isManual
    ? "Delete manual pipeline \"" + pipeline.name + "\"? Its simulated source flow will return to the generated network."
    : "Delete generated pipeline \"" + pipeline.name + "\"? This route will be removed from the simulation and saved in this browser.";
  if (!window.confirm(prompt)) return;
  const previousState = capturePipelineState();
  const deletedName = pipeline.name;
  if (isManual) {
    MANUAL_PIPES.splice(MANUAL_PIPES.findIndex(item => item.id === pipeline.id), 1);
    persistManualPipelines();
  } else {
    pipeline.deleted = true;
    persistAutoPipelineEdits();
  }
  commitPipelineChange(previousState);
  selectedPipeIndex = Math.min(selectedPipeIndex, allPipelines().length - 1);
  pipelineOptionsSignature = "";
  addLog("Deleted " + (isManual ? "manual" : "generated") + " route " + deletedName);
  refresh();
}

function addMapMarkers(barangay) {
  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "pin";
  pin.setAttribute("aria-label", barangay.name + " simulated water meter");
  pin.innerHTML = "<i></i><span><b>" + escapeHtml(barangay.name) + "</b> · <span class=\"t\"></span></span>";
  barangay.pinDot = pin.querySelector("i");
  barangay.pinTxt = pin.querySelector(".t");
  const meterPopup = new maplibregl.Popup({ offset: 18 });
  barangay.meterPopup = meterPopup;
  meterPopup.on("open", () => meterPopup.setHTML(meterHtml(barangay)));
  barangay.pinMarker = new maplibregl.Marker({ element: pin, anchor: "bottom" })
    .setLngLat([barangay.lon, barangay.lat]).setPopup(meterPopup).addTo(map);

  const tank = document.createElement("button");
  tank.type = "button";
  tank.className = "tank-marker";
  tank.setAttribute("aria-label", barangay.name + " simulated storage tank");
  tank.innerHTML = "<span class=\"tank-vessel\"><i class=\"tank-fill\"></i><i class=\"tank-cap\"></i></span><small></small>";
  barangay.tank.markerFill = tank.querySelector(".tank-fill");
  barangay.tank.markerLabel = tank.querySelector("small");
  const tankPopup = new maplibregl.Popup({ offset: 18 });
  barangay.tankPopup = tankPopup;
  tankPopup.on("open", () => tankPopup.setHTML(tankHtml(barangay)));
  barangay.tankMarker = new maplibregl.Marker({ element: tank, anchor: "bottom" })
    .setLngLat([barangay.tank.lon, barangay.tank.lat]).setPopup(tankPopup).addTo(map);
}

function frame(timestamp) {
  const elapsedSeconds = Math.min(0.1, (timestamp - (lastFrame || timestamp)) / 1000);
  lastFrame = timestamp;
  if (playing) {
    let remainingMinutes = elapsedSeconds * speed * 15;
    while (remainingMinutes > 0) {
      const stepMinutes = Math.min(5, remainingMinutes);
      step(stepMinutes);
      remainingMinutes -= stepMinutes;
    }
    const particleSpeed = clamp((flowLimit / 1200) * (pressure / 60), 0.08, 2.5);
    flowClock += elapsedSeconds * (0.25 + 2.2 * particleSpeed) * speed;
  }
  if (mapReady && overlayLayersReady) map.getSource("drops").setData(dropsData());
  if (timestamp - lastRefresh > 250) {
    lastRefresh = timestamp;
    refresh();
  }
  requestAnimationFrame(frame);
}

function updateSpeedControls() {
  $("speed-value").textContent = speed + "x";
  $("speed-down").disabled = speed <= 1;
  $("speed-up").disabled = speed >= 100;
}

function syncSimulationControls() {
  $("play").textContent = playing ? "Pause" : "Play";
  $("play").classList.toggle("on", playing);
  $("weather").value = weather;
  $("weather-intensity").value = String(Math.round(weatherIntensity * 100));
  $("intensity-value").textContent = Math.round(weatherIntensity * 100) + "%";
  $("dr").value = String(Math.round(yieldAdjustment * 100));
  $("dv").textContent = Math.round(yieldAdjustment * 100) + "%";
  $("flow").value = String(flowLimit);
  $("flow-value").textContent = fmt(flowLimit) + " L/min";
  $("pressure").value = String(pressure);
  $("pressure-value").textContent = pressure + " PSI";
  updateSpeedControls();
  syncWeatherClass();
  updateWeatherEffects();
}

function resetSimulation() {
  if (drawingMode) stopDrawing();
  if (editingPipeline) closePipelineEdit(true);
  const previousPipelineState = capturePipelineState();
  simT = 5 * 60;
  speed = 4;
  playing = true;
  yieldAdjustment = 1;
  weather = "sunny";
  weatherIntensity = 0.5;
  flowLimit = 1200;
  pressure = 60;
  flowClock = 0;
  totalSuppliedL = 0;
  totalDemandL = 0;
  B.forEach(barangay => {
    barangay.tank.level = barangay.tank.capacity * 0.6;
    barangay.level = barangay.tank.level;
    barangay.dry = false;
    barangay.consumptionRate = 0;
    barangay.consumedL = 0;
    barangay.springs.forEach(spring => { spring.on = true; });
  });
  PIPES.forEach(pipeline => {
    pipeline.name = pipeline.initialName;
    pipeline.path = pipeline.initialPath.map(point => point.slice());
    pipeline.color = "#168ce0";
    pipeline.enabled = true;
    pipeline.blocked = false;
    pipeline.deleted = false;
  });
  MANUAL_PIPES.forEach(pipeline => { pipeline.enabled = true; pipeline.blocked = false; });
  persistAutoPipelineEdits();
  persistManualPipelines();
  commitPipelineChange(previousPipelineState);
  selectedPipeIndex = 0;
  pipelineOptionsSignature = "";
  editorPipelineId = null;
  log = [];
  addLog("Simulation reset");
  syncSimulationControls();
  refresh();
  map.flyTo({ ...HOME, duration: 1200 });
}

$("speed-down").addEventListener("click", () => {
  speed = clamp(speed - 1, 1, 100);
  updateSpeedControls();
});
$("speed-up").addEventListener("click", () => {
  speed = clamp(speed + 1, 1, 100);
  updateSpeedControls();
});
$("play").addEventListener("click", () => {
  playing = !playing;
  $("play").textContent = playing ? "Pause" : "Play";
  $("play").classList.toggle("on", playing);
});
$("dashboard-toggle").addEventListener("click", event => {
  const minimized = document.querySelector(".dashboard").classList.toggle("is-minimized");
  const button = event.currentTarget;
  button.textContent = minimized ? "+" : "−";
  button.setAttribute("aria-label", minimized ? "Expand water supply panel" : "Minimize water supply panel");
  button.setAttribute("aria-expanded", String(!minimized));
  button.title = minimized ? "Expand panel" : "Minimize panel";
  $("dashboard-content").inert = minimized;
  $("dashboard-content").setAttribute("aria-hidden", String(minimized));
});
$("weather").addEventListener("change", event => {
  weather = event.target.value;
  updateWeatherEffects();
  refresh();
});
$("weather-intensity").addEventListener("input", event => {
  weatherIntensity = Number(event.target.value) / 100;
  $("intensity-value").textContent = event.target.value + "%";
  updateWeatherEffects();
  refresh();
});
$("dr").addEventListener("input", event => {
  yieldAdjustment = Number(event.target.value) / 100;
  $("dv").textContent = event.target.value + "%";
  refresh();
});
$("flow").addEventListener("input", event => {
  flowLimit = Number(event.target.value);
  $("flow-value").textContent = fmt(flowLimit) + " L/min";
  refresh();
});
$("pressure").addEventListener("input", event => {
  pressure = Number(event.target.value);
  $("pressure-value").textContent = pressure + " PSI";
  refresh();
});
$("undo-pipeline").addEventListener("click", undoPipelineChange);
$("redo-pipeline").addEventListener("click", redoPipelineChange);
$("pipe-select").addEventListener("change", event => selectPipeline(Number(event.target.value), false));
$("pipe-toggle").addEventListener("click", () => {
  const pipeline = selectedPipeline();
  const previousState = capturePipelineState();
  pipeline.enabled = !pipeline.enabled;
  if (!pipeline.enabled) pipeline.blocked = false;
  commitPipelineChange(previousState);
  if (pipeline.manual) {
    persistManualPipelines();
  } else persistAutoPipelineEdits();
  editorPipelineId = null;
  addLog((pipeline.enabled ? "Opened " : "Closed ") + pipeline.name);
  refresh();
});
$("pipe-block").addEventListener("click", () => {
  const pipeline = selectedPipeline();
  if (!pipeline.enabled) return;
  const previousState = capturePipelineState();
  pipeline.blocked = !pipeline.blocked;
  commitPipelineChange(previousState);
  if (pipeline.manual) {
    persistManualPipelines();
  } else persistAutoPipelineEdits();
  editorPipelineId = null;
  addLog((pipeline.blocked ? "Blocked " : "Cleared blockage on ") + pipeline.name);
  refresh();
});
$("add-pipeline").addEventListener("click", startDrawing);
$("finish-drawing").addEventListener("click", finishDrawing);
$("cancel-drawing").addEventListener("click", cancelDrawing);
$("edit-pipeline").addEventListener("click", startPipelineEdit);
$("add-route-point").addEventListener("click", () => {
  if (!editingPipeline) return;
  addingEditPoint = !addingEditPoint;
  $("add-route-point").classList.toggle("on", addingEditPoint);
  $("drawing-help").textContent = addingEditPoint
    ? "Click the map to append a route point."
    : "Drag orange route points to reshape the route.";
});
$("remove-route-point").addEventListener("click", () => {
  if (!editingPipeline || editingPipeline.path.length <= 2) return;
  const removeIndex = selectedVertexIndex == null ? editingPipeline.path.length - 1 : selectedVertexIndex;
  editingPipeline.path.splice(removeIndex, 1);
  selectedVertexIndex = null;
  rebuildEditMarkers();
  $("remove-route-point").disabled = editingPipeline.path.length <= 2;
  refresh();
});
$("save-edit").addEventListener("click", () => closePipelineEdit(false));
$("cancel-edit").addEventListener("click", () => closePipelineEdit(true));
$("apply-pipe-properties").addEventListener("click", applyPipelineProperties);
$("delete-pipeline").addEventListener("click", deleteSelectedPipeline);
$("toggle-pipelines").addEventListener("click", () => setPipelineVisibility(!pipelinesVisible));
$("map-style").addEventListener("change", event => selectMapStyle(event.target.value, true));
$("map-only-toggle").addEventListener("click", enterMapOnlyMode);
$("exit-map-only").addEventListener("click", exitMapOnlyMode);
$("map-only-style").addEventListener("change", event => selectMapStyle(event.target.value, true));
$("map-only-zoom-in").addEventListener("click", () => map.zoomIn());
$("map-only-zoom-out").addEventListener("click", () => map.zoomOut());
$("map-only-reset").addEventListener("click", () => map.flyTo({ ...HOME, duration: 900 }));
$("map-only-pipelines").addEventListener("click", () => setPipelineVisibility(!pipelinesVisible));
$("tp").addEventListener("click", () => map.easeTo({ pitch: Math.min(85, map.getPitch() + 10) }));
$("tm").addEventListener("click", () => map.easeTo({ pitch: Math.max(0, map.getPitch() - 10) }));
$("town").addEventListener("click", () => map.flyTo({ center: [123.3123, 9.5707], zoom: 15.5, pitch: 65, bearing: -25, duration: 2200 }));
$("rst").addEventListener("click", resetSimulation);
$("sat").addEventListener("click", event => {
  const satelliteSelected = selectedMapStyle === "satellite" || selectedMapStyle === "satellite-labels";
  selectMapStyle(satelliteSelected ? "street" : "satellite", true);
  event.currentTarget.classList.toggle("on", !satelliteSelected);
});
function spin() {
  if (!orbiting) return;
  map.setBearing(map.getBearing() + 0.12);
  requestAnimationFrame(spin);
}
$("orb").addEventListener("click", event => {
  orbiting = !orbiting;
  event.currentTarget.classList.toggle("on", orbiting);
  if (orbiting) spin();
});
["mousedown", "touchstart", "wheel"].forEach(eventName => {
  map.getCanvas().addEventListener(eventName, () => {
    if (orbiting) {
      orbiting = false;
      $("orb").classList.remove("on");
    }
  }, { passive: true });
});

SP.forEach(spring => {
  const option = document.createElement("option");
  option.value = String(spring.id);
  option.textContent = spring.name + " · " + spring.bar;
  $("manual-source").append(option);
});
B.forEach((barangay, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = barangay.name;
  $("manual-barangay").append(option);
});
$("tspring-total").textContent = "of " + SP.length + " sources";
setDrawingControls(false);
updatePipelineOptions();
selectMapStyle(selectedMapStyle);
syncSimulationControls();
refresh();
