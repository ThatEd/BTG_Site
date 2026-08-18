#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Data Cache Builder (Node)
   Reads the Site/Data folder and pre-computes the exact same `BTG.Data` shape
   that js/data-loader.js builds in the browser, then writes it to
   Site/data-cache.json. The site loads this single file first for speed and
   only runs live auto-discovery afterwards to catch anything new.

   Usage:
     node Site/scripts/build-cache.js [--out <path>] [--pretty]

   Output:
     Site/data-cache.json
       {
         "version": 1,
         "generatedAt": "<ISO>",
         "series":   { <seriesId>: { years: {<year>: true}, logo: "logos/<id>.png" } },
         "drivers":  { <name>: { name, seasons: { <seriesId>: { <year>: {...} } } } },
         "circuits": { "<seriesId>:<UniqueName>": {...} },
         "cars":     {},
         "files":    { <seriesId>: ["<relpath>", ...] }
       }
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const fs = require('fs');
const path = require('path');

const SITE_ROOT = path.resolve(__dirname, '..');
const DATA_ROOT = path.join(SITE_ROOT, 'Data');
const DEFAULT_OUT = path.join(SITE_ROOT, 'data-cache.json');

/* Shared roster helper (drivers/teams base data) — same logic as the browser,
   so the pre-built cache matches what live auto-discovery produces. */
const Roster = require(path.join(SITE_ROOT, 'js', 'roster.js'));
Roster.setBaseDir(path.join(DATA_ROOT, 'Drivers and teams'));

/* ── CLI flags ───────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
let outPath = DEFAULT_OUT;
let pretty = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') outPath = path.resolve(SITE_ROOT, args[++i]);
  else if (args[i] === '--pretty') pretty = true;
}

/* ── Data store (mirrors window.BTG.Data) ────────────────────────────────── */
const DATA = { series: {}, drivers: {}, circuits: {}, cars: {} };
const FILES = {}; // seriesId -> [relative file paths]

/* ── Constants (mirror data-loader.js) ───────────────────────────────────── */
const DEFAULT_YEAR = 2024; // fallback when no race data carries a year

/* ── Filesystem helpers ──────────────────────────────────────────────────── */

/** Recursively list relative file paths under a directory. */
function listFilesRel(dir, base) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (e.isDirectory()) out.push(...listFilesRel(full, base));
    else if (e.isFile()) out.push(rel);
  }
  return out.sort();
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_ROOT, rel), 'utf8'));
  } catch (e) {
    return null;
  }
}

/** Read a file inside a series folder by relative path. */
function readSeriesFile(seriesId, rel) {
  return readJson(path.join(seriesId, rel));
}

/* ── Core helpers (mirror data-loader.js) ────────────────────────────────── */

function median(arr) {
  if (!arr || !arr.length) return null;
  const a = arr.slice().sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function lapTimeToMs(str) {
  if (!str) return 0;
  const parts = String(str).split(':');
  let sec = 0;
  if (parts.length === 3) sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  else if (parts.length === 2) sec = Number(parts[0]) * 60 + Number(parts[1]);
  else sec = Number(parts[0]);
  return Number.isFinite(sec) ? Math.round(sec * 1000) : 0;
}

function reliabilityFromPace(paceMs, finishPos, laps) {
  if (!paceMs || paceMs <= 0) return 50;
  const pct = (paceMs - paceMs * 0.9) / (paceMs * 0.2);
  let score = 100 - pct * 100;
  if (finishPos && finishPos >= 99) score -= 15;
  score += Math.min(10, (laps || 0) / 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function racePts(pos) { const p = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]; return p[pos - 1] || 0; }
function sprintPts(pos) { const p = [8, 7, 6, 5, 4, 3, 2, 1]; return p[pos - 1] || 0; }

function registerSeries(seriesId, year) {
  if (!DATA.series[seriesId]) DATA.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
  DATA.series[seriesId].years[year] = true;
}

function ensureSeason(seriesId, year, name) {
  if (!DATA.drivers[name]) DATA.drivers[name] = { name: name, seasons: {} };
  const d = DATA.drivers[name];
  if (!d.seasons[seriesId]) d.seasons[seriesId] = {};
  if (!d.seasons[seriesId][year]) {
    d.seasons[seriesId][year] = {
      results: [], latestTeam: null, points: 0,
      wins: 0, podiums: 0, dnfs: 0, bestFinish: 99, races: 0,
      gridSum: 0, finishSum: 0, poles: 0,
      sprints: 0, sprintPts: 0, sprintWins: 0, sprintPodiums: 0,
      explicitStandings: false, car: null, className: null, carNumber: null
    };
  }
  return d.seasons[seriesId][year];
}

function guessYearFromFile(seriesId, file) {
  const s = DATA.series[seriesId];
  if (s) {
    const ys = Object.keys(s.years).map(Number).sort((a, b) => b - a);
    if (ys.length) return ys[0];
  }
  return DEFAULT_YEAR;
}

const COUNTRY_MAP = {
  'United Kingdom': 'GBR', 'Great Britain': 'GBR', 'England': 'ENG', 'Scotland': 'SCT',
  'Wales': 'WLS', 'Northern Ireland': 'NIR', 'UK': 'GBR', 'United States': 'USA', 'USA': 'USA',
  'Japan': 'JPN', 'Germany': 'GER', 'France': 'FRA', 'Italy': 'ITA', 'Spain': 'ESP',
  'Australia': 'AUS', 'Brazil': 'BRA', 'Canada': 'CAN', 'China': 'CHN', 'Denmark': 'DEN',
  'Finland': 'FIN', 'India': 'IND', 'Mexico': 'MEX', 'Netherlands': 'NED', 'Norway': 'NOR',
  'Poland': 'POL', 'Portugal': 'POR', 'Russia': 'RUS', 'South Africa': 'RSA', 'South Korea': 'KOR',
  'Sweden': 'SWE', 'Switzerland': 'SUI', 'Thailand': 'THA', 'Turkey': 'TUR', 'Austria': 'AUT',
  'Belgium': 'BEL', 'Argentina': 'ARG', 'New Zealand': 'NZL', 'Monaco': 'MON', 'Ireland': 'IRL',
  'Czech Republic': 'CZE', 'Hungary': 'HUN', 'Ukraine': 'UKR', 'Romania': 'ROU',
  'Greece': 'GRE', 'Croatia': 'CRO', 'Serbia': 'SRB', 'Slovakia': 'SVK', 'Slovenia': 'SVN',
  'Bulgaria': 'BUL', 'Estonia': 'EST', 'Latvia': 'LVA', 'Lithuania': 'LTU', 'Luxembourg': 'LUX',
  'Iceland': 'ISL', 'Andorra': 'AND', 'San Marino': 'SMR', 'Colombia': 'COL', 'Chile': 'CHI',
  'Venezuela': 'VEN', 'Uruguay': 'URU', 'Paraguay': 'PAR', 'Peru': 'PER', 'Ecuador': 'ECU',
  'United Arab Emirates': 'UAE', 'Saudi Arabia': 'KSA', 'Qatar': 'QAT', 'Bahrain': 'BHR',
  'Singapore': 'SGP', 'Malaysia': 'MAS', 'Indonesia': 'INA', 'Israel': 'ISR'
};

function countryToIoc(name) {
  if (!name) return null;
  return COUNTRY_MAP[name] || null;
}

function argbToRgb(hex) {
  if (!hex) return null;
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 8) h = h.slice(2);
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (isNaN(n)) return null;
  return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

/* ── SeasonStatistics manifest (data-manifest.json / circuits.json) ───────── */

function loadSeasonStats(seriesId, files) {
  const candidates = ['data-manifest.json', 'circuits.json'];
  let manifestPath = null;
  for (const c of candidates) {
    if (files.indexOf(c) !== -1) { manifestPath = c; break; }
  }
  if (!manifestPath) return false;
  const m = readSeriesFile(seriesId, manifestPath);
  if (!m || !m.seasonStatistics || !m.seasonStatistics.driverStandings) return false;

  let year = DEFAULT_YEAR;
  let yMatch = m.season && String(m.season.seasonName).match(/(20\d{2})/);
  if (!yMatch && m.season && m.season.seasonStartDate) yMatch = String(m.season.seasonStartDate).match(/(20\d{2})/);
  if (yMatch) year = Number(yMatch[1]);

  registerSeries(seriesId, year);

  let order = 0;
  m.seasonStatistics.driverStandings.forEach(function(row) {
    const name = row.driverName || (row.driverInfo && row.driverInfo.realName);
    if (!name) return;
    const sr = ensureSeason(seriesId, year, name);
    const pos = row.positions || {};
    const part = row.participation || {};
    sr.explicitStandings = true;
    sr.manifestOrder = order++;
    sr.latestTeam = row.teamName || (row.teamInfo && row.teamInfo.fullName) || sr.latestTeam;
    sr.car = (row.teamInfo && row.teamInfo.car) || sr.car;
    sr.points = Number(row.points) || 0;
    sr.standingPos = row.position > 0 ? row.position : null;
    sr.wins = pos.wins || 0;
    sr.podiums = pos.podiums || 0;
    sr.topFives = pos.topFives || 0;
    sr.topTens = pos.topTens || 0;
    sr.poles = pos.polePositions || 0;
    sr.fastestLaps = pos.fastestLaps || 0;
    sr.races = part.racesParticipated || 0;
    sr.avgFinish = pos.averageRacePosition || null;
    sr.nation = countryToIoc(row.driverInfo && row.driverInfo.nationality);
    sr.teamColor = argbToRgb(row.teamInfo && row.teamInfo.primaryColor);
    sr.teamFullName = row.teamInfo && row.teamInfo.fullName;
  });
  return true;
}

/* ── RLT Event/Race exports (*_event_*.json / *_race_*.json) ─────────────── */

function loadRltEvents(seriesId, files) {
  if (!files || !files.length) return;
  const eventFiles = files.filter(function(f) {
    return /\.json$/i.test(f) && (/_event_/i.test(f) || /_race_/i.test(f)) && !/xlsx\.json$/i.test(f);
  });
  eventFiles.forEach(function(f) {
    const m = readSeriesFile(seriesId, f);
    if (!m) return;
    let year = DEFAULT_YEAR;
    const yMatch = m.season && String(m.season.seasonName).match(/(20\d{2})/);
    if (yMatch) year = Number(yMatch[1]);
    registerSeries(seriesId, year);
    const track = (m.event && m.event.track && m.event.track.trackName) || null;
    const sessions = m.sessions || (m.session ? [m.session] : []);
    sessions.forEach(function(sess) {
      const type = sess.sessionInfo && sess.sessionInfo.sessionType;
      const drivers = sess.drivers || [];
      drivers.forEach(function(row) {
        if (!row.driverName) return;
        const sr = ensureSeason(seriesId, year, row.driverName);
        const teamName = row.teamName || (row.teamInfo && row.teamInfo.fullName) || sr.latestTeam;
        if (teamName) sr.latestTeam = teamName;
        const car = (row.teamInfo && row.teamInfo.car) || sr.car;
        if (car) sr.car = car;
        const pts = Number(row.driverPoints || row.points || 0);
        if (/Race/i.test(type)) {
          const pos = Number(row.position || 0);
          const grid = Number(row.gridPosition || 0);
          const dnf = /dnf|retired|ret|dns/i.test(row.status || '');
          sr.results.push({
            track: track, pos: pos, grid: grid, dnf: dnf ? 1 : 0,
            fl: Number(row.fastestLapTimeMs || 0) / 1000,
            timeMs: Number(row.totalTimeMs || 0),
            laps: Number(row.lapsCompleted || 0),
            status: row.status || null
          });
          sr.races++;
          sr.gridSum += grid || 20;
          sr.finishSum += pos || 20;
          if (pos === 1) sr.wins++;
          if (pos > 0 && pos <= 3) sr.podiums++;
          if (dnf) sr.dnfs++;
          if (pos > 0 && pos < sr.bestFinish) sr.bestFinish = pos;
          if (grid === 1) sr.poles++;
          sr.points += pts || racePts(pos);
          if (!sr.standingPos && pos > 0) sr.standingPos = pos;
        }
      });
    });
  });
}

/* ── Second Monitor exports (*.xlsx.json) ────────────────────────────────── */

function loadSecondMonitor(seriesId, files) {
  if (!files || !files.length) return;
  const smFiles = files.filter(function(f) { return /\.xlsx\.json$/i.test(f); });
  smFiles.forEach(function(f) {
    const m = readSeriesFile(seriesId, f);
    if (!m) return;
    const year = guessYearFromFile(seriesId, f);
    const isMultiClass = !!m.IsMultiClass;
    registerSeries(seriesId, year);
    (m.Drivers || []).forEach(function(row) {
      const name = row.DriverLongName || row.DriverId || row.DriverName;
      if (!name) return;
      const n = String(name).trim();
      const sr = ensureSeason(seriesId, year, n);
      const car = row.CarName || sr.car;
      if (car) sr.car = car;
      const cls = isMultiClass ? (row.ClassName || sr.className) : null;
      if (cls) sr.className = cls;
      if (row.CarNumber != null) sr.carNumber = row.CarNumber;
      const team = row.TeamName || sr.latestTeam;
      if (team && team.trim()) sr.latestTeam = team.trim();
      if (row.DriverLongName) sr.smName = row.DriverLongName.trim();
      const sType = m.SessionType || '';
      const pos = Number(row.FinishingPosition || 0);
      const lapsMs = [];
      (row.Laps || []).forEach(function(lap) {
        if (!lap.IsValid || lap.IsPitLap) return;
        const ms = lapTimeToMs(lap.LapTime);
        if (ms > 0) lapsMs.push(ms);
      });
      if (/Practice/i.test(sType)) {
        if (pos > 0) sr.smPracticePos = pos;
      } else if (/Qual/i.test(sType)) {
        if (pos > 0) sr.smQualiPos = pos;
        if (lapsMs.length) sr.smQualiLapTimes = (sr.smQualiLapTimes || []).concat(lapsMs);
      } else if (/Race/i.test(sType)) {
        if (pos > 0) sr.smRacePos = pos;
        if (lapsMs.length) sr.smLapTimes = (sr.smLapTimes || []).concat(lapsMs);
      }
    });
  });

  Object.keys(DATA.drivers).forEach(function(name) {
    const d = DATA.drivers[name];
    if (!d.seasons[seriesId]) return;
    Object.keys(d.seasons[seriesId]).forEach(function(year) {
      const sr = d.seasons[seriesId][year];
      if (sr.smLapTimes && sr.smLapTimes.length) {
        sr.paceMedianMs = median(sr.smLapTimes);
        sr.smReliability = reliabilityFromPace(sr.paceMedianMs, sr.smRacePos, sr.smLapTimes.length);
      }
      if (sr.smQualiLapTimes && sr.smQualiLapTimes.length) {
        sr.qualiMedianMs = median(sr.smQualiLapTimes);
      }
    });
  });
}

/* ── Per-year circuits (Data/{Series}/{Year}/circuits.json) ──────────────── */

function loadCircuits(seriesId, year) {
  const circuits = readSeriesFile(seriesId, String(year) + '/circuits.json');
  if (!circuits || !Array.isArray(circuits)) return;
  circuits.forEach(function(c) {
    DATA.circuits[seriesId + ':' + c.UniqueName] = c;
  });
}

/* ── F1-style race files (root data-manifest.json) ───────────────────────── */

function processRaceData(seriesId, year, race, isSprint) {
  (race.Drivers || []).forEach(function(entry) {
    const name = entry.Driver && entry.Driver.Name;
    const teamName = entry.Team && entry.Team.Name;
    if (!name) return;
    const sr = ensureSeason(seriesId, year, name);
    sr.latestTeam = teamName;
    if (isSprint) {
      sr.sprints++;
      if (entry.Position === 1) sr.sprintWins++;
      if (entry.Position <= 3) sr.sprintPodiums++;
      sr.sprintPts += sprintPts(entry.Position);
    } else {
      sr.results.push({
        track: race.TrackName,
        trackId: race.TrackUniqueName,
        pos: entry.Position,
        grid: entry.GridPosition,
        dnf: (entry.Status === 'DNF' || entry.Status === 'DNF ') ? 1 : 0,
        fl: entry.FastestLapTimeInt || 0
      });
      sr.races++;
      sr.gridSum += (entry.GridPosition || 20);
      sr.finishSum += (entry.Position || 20);
      if (entry.Position === 1) sr.wins++;
      if (entry.Position <= 3) sr.podiums++;
      if (entry.Status === 'DNF' || entry.Status === 'DNF ') sr.dnfs++;
      if (entry.Position < sr.bestFinish) sr.bestFinish = entry.Position;
      if (entry.GridPosition === 1) sr.poles++;
      sr.points += racePts(entry.Position);
    }
  });
}

function processRaceFiles(seriesId, year, files) {
  files.forEach(function(f) {
    // Files may be bare names (manifest) or "<year>/name" (file-list discovery).
    const rel = String(f).indexOf('/') !== -1 ? f : String(year) + '/' + f;
    const race = readSeriesFile(seriesId, rel);
    if (!race) return;
    processRaceData(seriesId, year, race, false);
  });
}

function processSprintFiles(seriesId, year, files) {
  files.forEach(function(f) {
    const rel = String(f).indexOf('/') !== -1 ? f : String(year) + '/' + f;
    const race = readSeriesFile(seriesId, rel);
    if (!race) return;
    processRaceData(seriesId, year, race, true);
  });
}

/* ── Standings ───────────────────────────────────────────────────────────── */

function computeAllStandings() {
  Object.keys(DATA.drivers).forEach(function(name) {
    const d = DATA.drivers[name];
    Object.keys(d.seasons).forEach(function(seriesId) {
      Object.keys(d.seasons[seriesId]).forEach(function(year) {
        const sr = d.seasons[seriesId][year];
        if (sr.explicitStandings) {
          if (sr.standingPos) return;
          const ranked = [];
          Object.keys(DATA.drivers).forEach(function(n) {
            const osr = DATA.drivers[n].seasons[seriesId] && DATA.drivers[n].seasons[seriesId][year];
            if (osr && osr.explicitStandings) ranked.push({ name: n, pts: osr.points, order: osr.manifestOrder || 0 });
          });
          ranked.sort(function(a, b) { return b.pts - a.pts || a.order - b.order; });
          const idx = ranked.findIndex(function(r) { return r.name === name; });
          sr.standingPos = idx >= 0 ? idx + 1 : '—';
          return;
        }
        const ranked = [];
        Object.keys(DATA.drivers).forEach(function(n) {
          const osr = DATA.drivers[n].seasons[seriesId] && DATA.drivers[n].seasons[seriesId][year];
          if (osr && osr.races) ranked.push({ name: n, pts: osr.points });
        });
        ranked.sort(function(a, b) { return b.pts - a.pts; });
        const idx = ranked.findIndex(function(r) { return r.name === name; });
        sr.standingPos = idx >= 0 ? idx + 1 : '—';
      });
    });
  });
}

/* ── Main build ──────────────────────────────────────────────────────────── */

function build() {
  console.log('BeTheGrid cache builder');
  console.log('  Data root: ' + DATA_ROOT);

  // Data-source folders that are not racing series.
  const SKIP_SERIES = ['Drivers and teams', 'Drivers', 'Teams'];
  const seriesDirs = fs.existsSync(DATA_ROOT)
    ? fs.readdirSync(DATA_ROOT, { withFileTypes: true })
      .filter(e => e.isDirectory() && SKIP_SERIES.indexOf(e.name) === -1)
      .map(e => e.name)
      .sort()
    : [];

  // Root manifest (F1-style race files)
  let manifest = {};
  try { manifest = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, 'data-manifest.json'), 'utf8')); } catch (e) {}

  const seriesSet = {};
  seriesDirs.forEach(s => { seriesSet[s] = true; });
  Object.keys(manifest).forEach(k => { seriesSet[k] = true; });
  const seriesKeys = Object.keys(seriesSet).sort();

  seriesKeys.forEach(function(seriesId) {
    const files = listFilesRel(path.join(DATA_ROOT, seriesId), path.join(DATA_ROOT, seriesId));
    FILES[seriesId] = files;

    // SeasonStatistics
    const hasStats = loadSeasonStats(seriesId, files);
    // RLT event/race
    loadRltEvents(seriesId, files);
    // Second Monitor
    loadSecondMonitor(seriesId, files);
    // F1-style race files
    if (manifest[seriesId]) {
      const years = Object.keys(manifest[seriesId]).sort(function(a, b) { return Number(b) - Number(a); });
      if (!DATA.series[seriesId]) DATA.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
      years.forEach(function(y) { DATA.series[seriesId].years[y] = true; });
      years.forEach(function(year) { loadCircuits(seriesId, year); });
      years.forEach(function(year) {
        const data = manifest[seriesId][year];
        processRaceFiles(seriesId, year, (data && data.races) || []);
        processSprintFiles(seriesId, year, (data && data.sprints) || []);
      });
    } else {
      // No root manifest entry — discover F1-style races from the file list
      // ("<year>/results_*_race.json" / "_sprint.json").
      const byYear = {};
      files.forEach(function(f) {
        const parts = String(f).split('/');
        if (parts.length < 2) return;
        const year = Number(parts[0]);
        if (!year) return;
        const name = parts[parts.length - 1];
        if (!byYear[year]) byYear[year] = { races: [], sprints: [] };
        if (/_race\.json$/i.test(name)) byYear[year].races.push(f);
        else if (/_sprint\.json$/i.test(name)) byYear[year].sprints.push(f);
      });
      const yrs = Object.keys(byYear).map(Number).sort(function(a, b) { return b - a; });
      if (yrs.length) {
        if (!DATA.series[seriesId]) DATA.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
        yrs.forEach(function(y) { DATA.series[seriesId].years[y] = true; });
        yrs.forEach(function(year) {
          loadCircuits(seriesId, year);
          processRaceFiles(seriesId, year, byYear[year].races);
          processSprintFiles(seriesId, year, byYear[year].sprints);
        });
      } else if (!hasStats && files.length) {
        if (!DATA.series[seriesId]) DATA.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
      }
    }
  });

  // Roster (drivers/teams base data) — fills series + driver identity so the
  // cache works even before any race results exist. Never overwrites race data.
  let rosterYear = DEFAULT_YEAR;
  Object.keys(DATA.series).forEach(function (sid) {
    Object.keys(DATA.series[sid].years || {}).forEach(function (k) {
      const v = Number(k); if (v > rosterYear) rosterYear = v;
    });
  });
  try { Roster.applyToStore(DATA, rosterYear); }
  catch (e) { console.warn('  roster apply skipped: ' + e.message); }

  computeAllStandings();

  const cache = {
    version: 1,
    generatedAt: new Date().toISOString(),
    series: DATA.series,
    drivers: DATA.drivers,
    circuits: DATA.circuits,
    cars: DATA.cars,
    files: FILES
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, pretty ? JSON.stringify(cache, null, 2) : JSON.stringify(cache));

  const driverCount = Object.keys(DATA.drivers).length;
  const seriesCount = Object.keys(DATA.series).length;
  const bytes = fs.statSync(outPath).size;
  console.log('  series:  ' + seriesCount);
  console.log('  drivers: ' + driverCount);
  console.log('  output:  ' + outPath + ' (' + (bytes / 1024).toFixed(1) + ' KB)');
  console.log('Done.');
}

build();
