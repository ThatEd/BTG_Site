/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Data Loader
   Auto-discovers series from the Data/ folder (via /api/series + manifests).
   Supports multiple data formats:
     • Race-file style   — Data/{Series}/{Year}/*.json, indexed by the root
                           Data/data-manifest.json  (standings are calculated)
     • SeasonStatistics  — Data/{Series}/data-manifest.json OR circuits.json
                           containing explicit driverStandings/teamStandings
                           (loaded as-is; only missing values are calculated)
     • RLT Event/Race    — Data/{Series}/*_event_*.json / *_race_*.json with
                           sessions[] (qual + race), drivers, cars
     • Second Monitor    — Data/{Series}/*.xlsx.json (AMS 2 exports) with
                           CarName / ClassName / TeamName per driver
   RLT + Second Monitor data are auto-merged per driver when both exist.
   ═══════════════════════════════════════════════════════════════════════════ */

window.BTG = window.BTG || {};

BTG.Data = { series: {}, drivers: {}, circuits: {}, cars: {} };

/* ── Update notifications ───────────────────────────────────────────────────
   Cache-first loading means init() resolves with cached data so pages paint
   immediately. Auto-discovery then runs in the background and, ONLY when it
   fully completes, swaps in the fresh data and fires onUpdate so pages can
   re-render. Subscribers are invoked with the refreshed BTG.Data.           */

BTG.Data._updateListeners = [];

/** Register a callback that runs after auto-discovery finishes and applies. */
BTG.Data.onUpdate = function(cb) {
  if (typeof cb === 'function') BTG.Data._updateListeners.push(cb);
};

/** Notify subscribers that fresh (auto-discovered) data is now live. */
BTG.Data.notifyUpdate = function() {
  BTG.Data._updateListeners.slice().forEach(function(cb) {
    try { cb(BTG.Data); } catch(e) {}
  });
};

/** Get the pre-computed file list for a series (from cache) — used as a
 *  fallback when the Node server's /api/series-files endpoint is absent
 *  (e.g. static hosting on GitHub Pages). */
BTG.Data.getSeriesFiles = function(seriesId) {
  return (BTG.Data._files && BTG.Data._files[seriesId]) || [];
};

/* ── Roster helper ───────────────────────────────────────────────────────── */

/** Ensure the roster helper (js/roster.js) is loaded; inject it if needed. */
function ensureRoster() {
  return new Promise(function(resolve) {
    if (window.BTG && BTG.Roster) return resolve(BTG.Roster);
    var s = document.createElement('script');
    s.src = 'js/roster.js';
    s.onload = function() { resolve((window.BTG && BTG.Roster) ? BTG.Roster : null); };
    s.onerror = function() { resolve(null); };
    document.head.appendChild(s);
  });
}

/** Newest season year seen in a store (defaults to 2024). */
function latestYear(store) {
  var y = 2024;
  Object.keys((store && store.series) || {}).forEach(function(sid) {
    Object.keys((store.series[sid] && store.series[sid].years) || {}).forEach(function(k) {
      var v = Number(k); if (v > y) y = v;
    });
  });
  return y;
}

/** Nation fallback from the roster helper (matched by first name + surname). */
function rosterNation(name) {
  if (BTG.Roster && BTG.Roster.driverByName) {
    var d = BTG.Roster.driverByName(name);
    return (d && d.nation) ? d.nation : '';
  }
  return '';
}

/* ── Init (cache-first) ──────────────────────────────────────────────────── */

/**
 * Load data fast: apply the pre-built data-cache.json first, resolve so the
 * page paints immediately, then run auto-discovery in the background. The
 * auto-discovered data is applied only after it fully completes (via onUpdate).
 */
BTG.Data.init = async function() {
  // 0. Roster helper — one shared source for drivers/teams base data.
  var roster = await ensureRoster();

  // 1. Fast path — the pre-built cache (single fetch, no auto-discovery).
  await loadCache();

  // 1b. Roster fills gaps (nations, teams, series) so pages work even before
  //     any race results exist — flags included. Never overwrites race data.
  //     Must await load() so the CSV sources are resolved before applying.
  if (roster) {
    try {
      await roster.load();
      roster.applyToStore(BTG.Data, latestYear(BTG.Data));
    }
    catch(e) { console.warn('BTG roster apply failed.', e); }
  }

  // 2. Auto-discovery — rebuild everything from the Data folder, in the
  //    background. Results are applied atomically only when complete.
  autoDiscover().then(function() {
    // Cache-first: pages paint from the cached DB immediately, and the fresh
    // (auto-discovered) live data is swapped in once — 10s after the live
    // calls finish — so tabs don't flash as they re-fill from multiple sources.
    setTimeout(function() { BTG.Data.notifyUpdate(); }, 10000);
  }).catch(function(e) {
    console.warn('BTG auto-discovery failed — keeping cached data.', e);
  });

  return BTG.Data;
};

/** Apply the pre-built data-cache.json into BTG.Data (if present). */
async function loadCache() {
  try {
    var res = await fetch('data-cache.json');
    if (!res.ok) return false;
    var c = await res.json();
    if (!c || !c.series || !c.drivers) return false;
    BTG.Data.series = c.series || {};
    BTG.Data.drivers = c.drivers || {};
    BTG.Data.circuits = c.circuits || {};
    BTG.Data.cars = c.cars || {};
    BTG.Data._files = c.files || {};
    return true;
  } catch(e) { return false; }
}

/**
 * Rebuild BTG.Data from the Data folder (auto-discovery). Starts from a
 * clean store and only resolves after every source is processed, so partial
 * data is never shown — the caller applies the finished result atomically.
 */
async function autoDiscover() {
  // Fresh store — we rebuild into a new object and swap it in at the end so
  // any in-flight reader (already painted with cache) never sees half-loaded data.
  var fresh = { series: {}, drivers: {}, circuits: {}, cars: {}, _files: {} };

  var manifest;
  try {
    var mRes = await fetch('Data/data-manifest.json');
    manifest = await mRes.json();
  } catch(e) { manifest = {}; }

  // Discover series folders via the server (auto-discovery), union with the
  // root manifest keys so both formats are picked up with zero config.
  var folders = [];
  try {
    var sRes = await fetch('/api/series');
    folders = await sRes.json();
  } catch(e) {}
  var seriesSet = {};
  (folders || []).forEach(function(f) { seriesSet[f] = true; });
  Object.keys(manifest).forEach(function(k) { seriesSet[k] = true; });
  // Data-source folders that are not racing series.
  ['Drivers and teams', 'Drivers', 'Teams'].forEach(function(f) { delete seriesSet[f]; });
  // Include series known to the roster — on static hosting (no /api/series)
  // this is what makes race data dropped into those folders discoverable.
  if (BTG.Roster) {
    try {
      (BTG.Roster.state.series || []).forEach(function(s) { seriesSet[s] = true; });
    } catch(e) {}
  }
  var seriesKeys = Object.keys(seriesSet).sort();

  for (var si = 0; si < seriesKeys.length; si++) {
    var seriesId = seriesKeys[si];

    // 1. Discover all files in the series folder (auto-matches new exports).
    //    On static hosting there is no /api/series-files, so fall back to the
    //    committed cache's file list when it is available.
    var files = null;
    try {
      var fRes = await fetch('/api/series-files?series=' + encodeURIComponent(seriesId));
      if (fRes.ok) files = await fRes.json();
    } catch(e) {}
    if (!Array.isArray(files)) files = BTG.Data.getSeriesFiles(seriesId) || [];
    fresh._files[seriesId] = files;

    // 2. Explicit standings — SeasonStatistics manifest (data-manifest.json or circuits.json)
    var hasStats = await loadSeasonStats(fresh, seriesId, files);

    // 3. RLT Event/Race exports (sessions with qual + race)
    await loadRltEvents(fresh, seriesId, files);

    // 4. Second Monitor exports (.xlsx.json) — merged into RLT when both exist
    await loadSecondMonitor(fresh, seriesId, files);

    // 5. Race files — indexed by the root manifest (F1 style)
    if (manifest[seriesId]) {
      var years = Object.keys(manifest[seriesId]).sort(function(a,b){return Number(b)-Number(a);});
      if (!fresh.series[seriesId]) {
        fresh.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
      }
      years.forEach(function(y) { fresh.series[seriesId].years[y] = true; });

      // Load circuits for each year
      for (var yi = 0; yi < years.length; yi++) {
        await loadCircuits(fresh, seriesId, years[yi]);
      }

      // Load race + sprint data for each year
      for (var yi = 0; yi < years.length; yi++) {
        var year = years[yi];
        var data = manifest[seriesId][year];
        var raceFiles = (data && data.races) || [];
        var sprintFiles = (data && data.sprints) || [];

        await processRaceFiles(fresh, seriesId, year, raceFiles);
        await processSprintFiles(fresh, seriesId, year, sprintFiles);
      }
    } else {
      // 6. No root manifest entry — discover F1-style races straight from the
      //    file list ("<year>/results_*_race.json" / "_sprint.json"), which is
      //    how per-season race results are stored on disk.
      var byYear = {};
      files.forEach(function(f) {
        var parts = String(f).split('/');
        if (parts.length < 2) return;
        var year = Number(parts[0]);
        if (!year) return;
        var name = parts[parts.length - 1];
        if (!byYear[year]) byYear[year] = { races: [], sprints: [] };
        if (/_race\.json$/i.test(name)) byYear[year].races.push(f);
        else if (/_sprint\.json$/i.test(name)) byYear[year].sprints.push(f);
      });
      var yrs = Object.keys(byYear).map(Number).sort(function(a,b){return b-a;});
      if (yrs.length) {
        if (!fresh.series[seriesId]) {
          fresh.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
        }
        yrs.forEach(function(y) { fresh.series[seriesId].years[y] = true; });
        for (var yi = 0; yi < yrs.length; yi++) {
          await loadCircuits(fresh, seriesId, yrs[yi]);
          await processRaceFiles(fresh, seriesId, yrs[yi], byYear[yrs[yi]].races);
          await processSprintFiles(fresh, seriesId, yrs[yi], byYear[yrs[yi]].sprints);
        }
      } else if (!hasStats && files.length) {
        // A folder with files but no discoverable race files — still register it.
        if (!fresh.series[seriesId]) {
          fresh.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
        }
      }
    }
  }

  // Apply the roster so series + driver identity exist even before race
  // results are available (backfills nation/team/colour; never overwrites).
  if (BTG.Roster) {
    try { BTG.Roster.applyToStore(fresh, latestYear(fresh)); } catch(e) {}
  }

  // Compute season positions for all drivers (on the fresh store)
  computeAllStandings(fresh);

  // Swap the finished store in atomically — readers keep the old (cached)
  // data until this single assignment.
  BTG.Data.series = fresh.series;
  BTG.Data.drivers = fresh.drivers;
  BTG.Data.circuits = fresh.circuits;
  BTG.Data.cars = fresh.cars;
  BTG.Data._files = fresh._files;

  return BTG.Data;
}

/**
 * Load an explicit "SeasonStatistics" manifest (Data/{Series}/data-manifest.json
 * or circuits.json) and populate driver season records with its standings/stats.
 * Returns true if such a manifest was found and parsed.
 */
async function loadSeasonStats(store, seriesId, files) {
  // Try data-manifest.json first, then circuits.json (both are SeasonStatistics exports)
  var candidates = ['data-manifest.json', 'circuits.json'];
  var manifestPath = null;
  for (var ci = 0; ci < candidates.length; ci++) {
    if (files && files.indexOf(candidates[ci]) !== -1) { manifestPath = candidates[ci]; break; }
    try {
      var probe = await fetch('Data/' + encodeURIComponent(seriesId) + '/' + candidates[ci]);
      if (probe.ok) { manifestPath = candidates[ci]; break; }
    } catch(e) {}
  }
  if (!manifestPath) return false;

  var m;
  try {
    var res = await fetch('Data/' + encodeURIComponent(seriesId) + '/' + manifestPath);
    if (!res.ok) return false;
    m = await res.json();
  } catch(e) { return false; }
  if (!m || !m.seasonStatistics || !m.seasonStatistics.driverStandings) return false;

  // Year from seasonName ("Season 1 2024") or seasonStartDate
  var year = 2024;
  var yMatch = m.season && String(m.season.seasonName).match(/(20\d{2})/);
  if (!yMatch && m.season && m.season.seasonStartDate) yMatch = String(m.season.seasonStartDate).match(/(20\d{2})/);
  if (yMatch) year = Number(yMatch[1]);

  if (!store.series[seriesId]) {
    store.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
  }
  store.series[seriesId].years[year] = true;

  var order = 0;
  m.seasonStatistics.driverStandings.forEach(function(row) {
    var name = row.driverName || (row.driverInfo && row.driverInfo.realName);
    if (!name) return;
    if (!store.drivers[name]) store.drivers[name] = { name: name, seasons: {} };
    var d = store.drivers[name];
    if (!d.seasons[seriesId]) d.seasons[seriesId] = {};
    if (!d.seasons[seriesId][year]) {
      d.seasons[seriesId][year] = {
        results: [], latestTeam: null, points: 0,
        wins: 0, podiums: 0, dnfs: 0, bestFinish: 99, races: 0,
        gridSum: 0, finishSum: 0, poles: 0,
        sprints: 0, sprintPts: 0, sprintWins: 0, sprintPodiums: 0,
        explicitStandings: true, car: null, className: null, carNumber: null
      };
    }
    var sr = d.seasons[seriesId][year];
    var pos = row.positions || {};
    var part = row.participation || {};
    sr.explicitStandings = true;
    sr.manifestOrder = order++;
    sr.latestTeam = row.teamName || (row.teamInfo && row.teamInfo.fullName) || sr.latestTeam;
    sr.car = (row.teamInfo && row.teamInfo.car) || sr.car;
    sr.points = Number(row.points) || 0;
    sr.standingPos = row.position > 0 ? row.position : null; // 0 → calculate
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

/**
 * Parse "RLT Event/Race" exports (Data/{Series}/*_event_*.json / *_race_*.json).
 * These carry sessions[] (Qualification + Race) with per-driver rows. We merge
 * them into the driver season records (results, car, team, points).
 */
async function loadRltEvents(store, seriesId, files) {
  if (!files || !files.length) return;
  var eventFiles = files.filter(function(f) {
    return /\.json$/i.test(f) && (/_event_/i.test(f) || /_race_/i.test(f)) && !/xlsx\.json$/i.test(f);
  });
  for (var i = 0; i < eventFiles.length; i++) {
    try {
      var res = await fetch('Data/' + encodeURIComponent(seriesId) + '/' + eventFiles[i]);
      if (!res.ok) continue;
      var m = await res.json();
      var year = 2024;
      var yMatch = m.season && String(m.season.seasonName).match(/(20\d{2})/);
      if (yMatch) year = Number(yMatch[1]);
      registerSeries(store, seriesId, year);
      var track = (m.event && m.event.track && m.event.track.trackName) || null;
      var sessions = m.sessions || (m.session ? [m.session] : []);
      sessions.forEach(function(sess) {
        var type = sess.sessionInfo && sess.sessionInfo.sessionType;
        var drivers = sess.drivers || [];
        drivers.forEach(function(row) {
          if (!row.driverName) return;
          var sr = ensureSeason(store, seriesId, year, row.driverName);
          var teamName = row.teamName || (row.teamInfo && row.teamInfo.fullName) || sr.latestTeam;
          if (teamName) sr.latestTeam = teamName;
          var car = (row.teamInfo && row.teamInfo.car) || sr.car;
          if (car) sr.car = car;
          var pts = Number(row.driverPoints || row.points || 0);
          if (/Race/i.test(type)) {
            var pos = Number(row.position || 0);
            var grid = Number(row.gridPosition || 0);
            var dnf = /dnf|retired|ret|dns/i.test(row.status || '');
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
    } catch(e) {}
  }
}

/**
 * Parse "Second Monitor" exports (Data/{Series}/*.xlsx.json). These are the
 * richest source for car / class / team data. We auto-match by driver name and
 * merge into existing season records (filling any gaps the RLT data left).
 */
async function loadSecondMonitor(store, seriesId, files) {
  if (!files || !files.length) return;
  var smFiles = files.filter(function(f) { return /\.xlsx\.json$/i.test(f); });
  for (var i = 0; i < smFiles.length; i++) {
    try {
      var res = await fetch('Data/' + encodeURIComponent(seriesId) + '/' + smFiles[i]);
      if (!res.ok) continue;
      var m = await res.json();
      var year = guessYearFromFile(store, seriesId, smFiles[i]);
      var track = m.TrackInfo && m.TrackInfo.TrackName;
      var isMultiClass = !!m.IsMultiClass;
      registerSeries(store, seriesId, year);
      (m.Drivers || []).forEach(function(row) {
        var name = row.DriverLongName || row.DriverId || row.DriverName;
        if (!name) return;
        name = String(name).trim();
        var sr = ensureSeason(store, seriesId, year, name);
        var car = row.CarName || sr.car;
        if (car) sr.car = car;
        var cls = isMultiClass ? (row.ClassName || sr.className) : null; // ignore class unless multi-class
        if (cls) sr.className = cls;
        if (row.CarNumber != null) sr.carNumber = row.CarNumber;
        var team = row.TeamName || sr.latestTeam;
        if (team && team.trim()) sr.latestTeam = team.trim();
        if (row.DriverLongName) sr.smName = row.DriverLongName.trim();
        var sType = m.SessionType || '';
        var pos = Number(row.FinishingPosition || 0);
        var lapsMs = [];
        (row.Laps || []).forEach(function(lap) {
          if (!lap.IsValid || lap.IsPitLap) return;
          var ms = lapTimeToMs(lap.LapTime);
          if (ms > 0) lapsMs.push(ms);
        });
        if (/Practice/i.test(sType)) {
          if (pos > 0) sr.smPracticePos = pos;
        } else if (/Qual/i.test(sType)) {
          if (pos > 0) sr.smQualiPos = pos;
          // Collect valid quali laps → median quali pace for the driver
          if (lapsMs.length) sr.smQualiLapTimes = (sr.smQualiLapTimes || []).concat(lapsMs);
        } else if (/Race/i.test(sType)) {
          if (pos > 0) sr.smRacePos = pos;
          // Collect valid lap times → median pace for the driver
          if (lapsMs.length) {
            sr.smLapTimes = (sr.smLapTimes || []).concat(lapsMs);
          }
        }
      });
    } catch(e) {}
  }

  // Finalize medians for all drivers with AMS lap data (across all race files)
  Object.keys(store.drivers).forEach(function(name) {
    var d = store.drivers[name];
    if (!d.seasons[seriesId]) return;
    Object.keys(d.seasons[seriesId]).forEach(function(year) {
      var sr = d.seasons[seriesId][year];
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

/** Median of an array of numbers. */
function median(arr) {
  if (!arr || !arr.length) return null;
  var a = arr.slice().sort(function(x, y) { return x - y; });
  var mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

/** Convert "H:MM:SS.mmm"/"MM:SS.mmm"/"SS.mmm" to milliseconds. */
function lapTimeToMs(str) {
  if (!str) return 0;
  var parts = String(str).split(':');
  var sec = 0;
  if (parts.length === 3) sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  else if (parts.length === 2) sec = Number(parts[0]) * 60 + Number(parts[1]);
  else sec = Number(parts[0]);
  return Number.isFinite(sec) ? Math.round(sec * 1000) : 0;
}

/**
 * Derive a "car reliability / on-track quality" score from median pace.
 * Faster median lap → higher reliability/quality. Clamped 0–100.
 */
function reliabilityFromPace(paceMs, finishPos, laps) {
  if (!paceMs || paceMs <= 0) return 50;
  // A ~90s lap benchmark; spread 20% → full 0..100 band.
  var pct = (paceMs - paceMs * 0.9) / (paceMs * 0.2);
  var score = 100 - pct * 100;
  // DNF penalty and laps-completed bonus
  if (finishPos && finishPos >= 99) score -= 15;
  score += Math.min(10, (laps || 0) / 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Register a series folder + year (used by RLT/AMS parsers). */
function registerSeries(store, seriesId, year) {
  if (!store.series[seriesId]) {
    store.series[seriesId] = { years: {}, logo: 'logos/' + seriesId + '.png' };
  }
  store.series[seriesId].years[year] = true;
}

/** Get/create a driver's season record for (series, year, name). */
function ensureSeason(store, seriesId, year, name) {
  if (!store.drivers[name]) store.drivers[name] = { name: name, seasons: {} };
  var d = store.drivers[name];
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

/** Guess the season year from an AMS/Second-Monitor file name (falls back to the series). */
function guessYearFromFile(store, seriesId, file) {
  // AMS files are named like "..._Race_End.xlsx.json" — no year inside, so use
  // the series' registered years or default to its latest known season.
  var s = store.series[seriesId];
  if (s) {
    var ys = Object.keys(s.years).map(Number).sort(function(a,b){return b-a;});
    if (ys.length) return ys[0];
  }
  return 2024;
}

/** Full country name → IOC 3-letter code (for SeasonStatistics manifests). */
function countryToIoc(name) {
  if (!name) return null;
  var map = {
    'United Kingdom':'GBR','Great Britain':'GBR','England':'ENG','Scotland':'SCT',
    'Wales':'WLS','Northern Ireland':'NIR','UK':'GBR','United States':'USA','USA':'USA',
    'Japan':'JPN','Germany':'GER','France':'FRA','Italy':'ITA','Spain':'ESP',
    'Australia':'AUS','Brazil':'BRA','Canada':'CAN','China':'CHN','Denmark':'DEN',
    'Finland':'FIN','India':'IND','Mexico':'MEX','Netherlands':'NED','Norway':'NOR',
    'Poland':'POL','Portugal':'POR','Russia':'RUS','South Africa':'RSA','South Korea':'KOR',
    'Sweden':'SWE','Switzerland':'SUI','Thailand':'THA','Turkey':'TUR','Austria':'AUT',
    'Belgium':'BEL','Argentina':'ARG','New Zealand':'NZL','Monaco':'MON','Ireland':'IRL',
    'Austria':'AUT','Czech Republic':'CZE','Hungary':'HUN','Ukraine':'UKR','Romania':'ROU',
    'Greece':'GRE','Croatia':'CRO','Serbia':'SRB','Slovakia':'SVK','Slovenia':'SVN',
    'Bulgaria':'BUL','Estonia':'EST','Latvia':'LVA','Lithuania':'LTU','Luxembourg':'LUX',
    'Iceland':'ISL','Andorra':'AND','San Marino':'SMR','Colombia':'COL','Chile':'CHI',
    'Venezuela':'VEN','Uruguay':'URU','Paraguay':'PAR','Peru':'PER','Ecuador':'ECU',
    'United Arab Emirates':'UAE','Saudi Arabia':'KSA','Qatar':'QAT','Bahrain':'BHR',
    'Singapore':'SGP','Malaysia':'MAS','Indonesia':'INA','Israel':'ISR','South Africa':'RSA'
  };
  return map[name] || null;
}

/** "#AARRGGBB" or "#RRGGBB" → "r,g,b". */
function argbToRgb(hex) {
  if (!hex) return null;
  var h = String(hex).trim().replace(/^#/, '');
  if (h.length === 8) h = h.slice(2);   // drop alpha
  if (h.length !== 6) return null;
  var n = parseInt(h, 16);
  if (isNaN(n)) return null;
  return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
}

/* ── Build driver list for UI ────────────────────────────────────────────── */

BTG.Data.buildDriverList = function(targetSeries, targetSeason, opts) {
  opts = opts || {};
  var seriesId = targetSeries || Object.keys(BTG.Data.series)[0] || 'F1';
  var season = targetSeason || getLatestSeason(seriesId) || 2024;
  var list = [];

  // Resolve team keys / raw names to the canonical display name from the CSV
  // via the roster helper (e.g. "F2 MP" → "MP"). Unknown names pass through.
  var normTeam = (window.BTG && BTG.Roster && BTG.Roster.teamName)
    ? function(v) { return BTG.Roster.teamName(v); }
    : function(v) { return v; };

  Object.keys(BTG.Data.drivers).forEach(function(name) {
    var d = BTG.Data.drivers[name];
    var sr = d.seasons[seriesId] && d.seasons[seriesId][String(season)];

    // Only drivers that actually belong to this series — F1 drivers are not
    // F2 privateers and vice versa. Membership = a season record here, or the
    // roster lists them in this series.
    if (!sr && !(d.roster && d.roster.series === seriesId)) return;

    var team = BTG.teamByName(sr ? sr.latestTeam : null);
    var teamColor = (sr && sr.teamColor) || (team ? team.color : null);
    var nation = (sr && sr.nation) || rosterNation(name) || guessNation(name);

    // Build career history across ALL series for this driver. The driver is keyed
    // by name and is the SAME person whether they're a primary or a reserve in any
    // series — so their full career (every series they appeared in) is shown as one.
    var history = [];
    Object.keys(d.seasons).forEach(function(sid) {
      var seriesData = d.seasons[sid] || {};
      Object.keys(seriesData).sort(function(a,b){return Number(a)-Number(b);}).forEach(function(s) {
        var h = seriesData[s];
        history.push({
          season: Number(s),
          series: sid,
          team: normTeam(h.latestTeam),
          car: h.car,
          className: h.className,
          races: h.races,
          points: h.points,
          pos: h.standingPos,
          grade: calcGrade(h),
          wins: h.wins,
          podiums: h.podiums,
          dnfs: h.dnfs,
          avgFinish: h.avgFinish || (h.races ? (h.finishSum / h.races).toFixed(1) : '—')
        });
      });
    });
    history.sort(function(a,b) {
      if (a.season !== b.season) return a.season - b.season;
      return a.series < b.series ? -1 : a.series > b.series ? 1 : 0;
    });

    // Career totals
    var career = { starts:0, wins:0, podiums:0, points:0, dnfs:0, bestFinish:99, finishSum:0, seasonSet:new Set(), teamSet:new Set() };
    history.forEach(function(h) {
      career.starts += h.races || 0;
      career.wins += h.wins || 0;
      career.podiums += h.podiums || 0;
      career.points += h.points || 0;
      career.dnfs += h.dnfs || 0;
      if (h.pos !== '—' && h.pos <= career.bestFinish) career.bestFinish = h.pos;
      career.finishSum += h.races ? (parseFloat(h.avgFinish || 0) * h.races) : 0;
      career.seasonSet.add(h.season);
      if (h.team) career.teamSet.add(h.team);
    });

    // Current season stats
    var ss = sr ? {
      races: sr.races, wins: sr.wins, podiums: sr.podiums, dnfs: sr.dnfs,
      bestFinish: sr.bestFinish < 99 ? sr.bestFinish : '—',
      avgFinish: sr.avgFinish || (sr.races ? (sr.finishSum / sr.races).toFixed(1) : '—'),
      avgGrid: sr.races ? (sr.gridSum / sr.races).toFixed(1) : '—',
      poles: sr.poles, sprints: sr.sprints, sprintWins: sr.sprintWins,
      sprintPodiums: sr.sprintPodiums, sprintPts: sr.sprintPts,
      results: sr.results || [],
      paceMedianMs: sr.paceMedianMs || null,
      qualiMedianMs: sr.qualiMedianMs || null,
      smReliability: sr.smReliability != null ? sr.smReliability : null,
      smRacePos: sr.smRacePos || null,
      smQualiPos: sr.smQualiPos || null,
      smPracticePos: sr.smPracticePos || null
    } : null;

    list.push({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      fullName: (d && d.fullName) || name,
      team: normTeam(sr ? sr.latestTeam : null),
      teamOrder: teamOrderIndex(seriesId, sr ? sr.latestTeam : null),
      car: sr ? sr.car : null,
      className: sr ? sr.className : null,
      carNumber: sr ? sr.carNumber : null,
      series: seriesId,
      nation: nation,
      ovr: 0, targetOvr: 0, teamColor: teamColor, skills: {},
      standings: sr ? { pos: sr.standingPos || '—', pts: sr.points } : null,
      seasonStats: ss,
      history: history,
      careerRecord: {
        starts: career.starts, wins: career.wins, podiums: career.podiums,
        points: career.points, dnfs: career.dnfs,
        bestFinish: career.bestFinish < 99 ? career.bestFinish : '—',
        avgFinish: career.starts ? (career.finishSum / career.starts).toFixed(1) : '—',
        yrs: career.seasonSet.size, yrsAtTeam: career.teamSet.size
      }
    });
  });

  return list
    .filter(function(d) {
      // includeAll → also list roster drivers that have no race results yet
      // (i.e. the Drivers tab shows the full grid before the season starts).
      if (opts.includeAll) return true;
      return d.standings && d.standings.pos !== '—';
    })
    // Default ordering: team order (last season's team standings), then
    // driver position within the team, then name.
    .sort(function(a,b) {
      var ta = a.teamOrder != null ? a.teamOrder : 99, tb = b.teamOrder != null ? b.teamOrder : 99;
      if (ta !== tb) return ta - tb;
      var pa = a.standings && a.standings.pos !== '—' ? a.standings.pos : 999;
      var pb = b.standings && b.standings.pos !== '—' ? b.standings.pos : 999;
      if (pa !== pb) return pa - pb;
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
};

/* ── UI helpers ───────────────────────────────────────────────────────────── */

/** Team order index for a driver (falls back to 99 when unknown). */
function teamOrderIndex(seriesId, team) {
  if (BTG.Roster && BTG.Roster.teamOrderIndexOf) return BTG.Roster.teamOrderIndexOf(seriesId, team);
  return 99;
}

BTG.Data.getSeriesList = function() {
  return Object.keys(BTG.Data.series).map(function(id) {
    return { id: id, logo: BTG.Data.series[id].logo };
  });
};

BTG.Data.getSeasons = function(seriesId) {
  var s = BTG.Data.series[seriesId];
  return s ? Object.keys(s.years).sort(function(a,b){return Number(b)-Number(a);}).map(Number) : [2024];
};

/* ── Internal ─────────────────────────────────────────────────────────────── */

async function loadCircuits(store, seriesId, year) {
  try {
    var res = await fetch('Data/' + seriesId + '/' + year + '/circuits.json');
    if (!res.ok) return;
    var circuits = await res.json();
    circuits.forEach(function(c) {
      store.circuits[seriesId + ':' + c.UniqueName] = c;
    });
  } catch(e) {}
}

async function processRaceFiles(store, seriesId, year, files) {
  for (var i = 0; i < files.length; i++) {
    try {
      // Files may be bare names (manifest) or "<year>/name" (file-list discovery).
      var rel = String(files[i]).indexOf('/') !== -1 ? files[i] : year + '/' + files[i];
      var res = await fetch('Data/' + seriesId + '/' + rel);
      var race = await res.json();
      processRaceData(store, seriesId, year, race, false);
    } catch(e) {}
  }
}

async function processSprintFiles(store, seriesId, year, files) {
  for (var i = 0; i < files.length; i++) {
    try {
      var rel = String(files[i]).indexOf('/') !== -1 ? files[i] : year + '/' + files[i];
      var res = await fetch('Data/' + seriesId + '/' + rel);
      var race = await res.json();
      processRaceData(store, seriesId, year, race, true);
    } catch(e) {}
  }
}

function processRaceData(store, seriesId, year, race, isSprint) {
  (race.Drivers || []).forEach(function(entry) {
    var name = entry.Driver && entry.Driver.Name;
    var teamName = entry.Team && entry.Team.Name;
    if (!name) return;

    if (!store.drivers[name]) {
      store.drivers[name] = { name: name, seasons: {} };
    }
    var d = store.drivers[name];
    if (!d.seasons[seriesId]) d.seasons[seriesId] = {};
    if (!d.seasons[seriesId][year]) {
      d.seasons[seriesId][year] = {
        results: [], latestTeam: null, points: 0,
        wins: 0, podiums: 0, dnfs: 0, bestFinish: 99, races: 0,
        gridSum: 0, finishSum: 0, poles: 0,
        sprints: 0, sprintPts: 0, sprintWins: 0, sprintPodiums: 0
      };
    }
    var sr = d.seasons[seriesId][year];
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

function computeAllStandings(store) {
  Object.keys(store.drivers).forEach(function(name) {
    var d = store.drivers[name];
    Object.keys(d.seasons).forEach(function(seriesId) {
      Object.keys(d.seasons[seriesId]).forEach(function(year) {
        var sr = d.seasons[seriesId][year];

        // Explicit standings (SeasonStatistics): keep position if set,
        // otherwise rank by points (drivers may have no race files).
        if (sr.explicitStandings) {
          if (sr.standingPos) return;
          var ranked = [];
          Object.keys(store.drivers).forEach(function(n) {
            var od = store.drivers[n];
            var osr = od.seasons[seriesId] && od.seasons[seriesId][year];
            if (osr && osr.explicitStandings) ranked.push({ name: n, pts: osr.points, order: osr.manifestOrder || 0 });
          });
          ranked.sort(function(a,b) { return b.pts - a.pts || a.order - b.order; });
          var idx = ranked.findIndex(function(r) { return r.name === name; });
          sr.standingPos = idx >= 0 ? idx + 1 : '—';
          return;
        }

        // Calculated standings (race-file format)
        var ranked = [];
        Object.keys(store.drivers).forEach(function(n) {
          var od = store.drivers[n];
          var osr = od.seasons[seriesId] && od.seasons[seriesId][year];
          if (osr && osr.races) ranked.push({ name: n, pts: osr.points });
        });
        ranked.sort(function(a,b) { return b.pts - a.pts; });
        var idx = ranked.findIndex(function(r) { return r.name === name; });
        sr.standingPos = idx >= 0 ? idx + 1 : '—';
      });
    });
  });
}

function getLatestSeason(seriesId) {
  var s = BTG.Data.series[seriesId];
  if (!s) return null;
  var years = Object.keys(s.years).map(Number).sort(function(a,b){return b-a;});
  return years[0];
}

function racePts(pos) { var p=[25,18,15,12,10,8,6,4,2,1]; return p[pos-1]||0; }
function sprintPts(pos) { var p=[8,7,6,5,4,3,2,1]; return p[pos-1]||0; }

function calcGrade(h) {
  if (h.standingPos && h.standingPos <= 1) return 'A';
  if (h.standingPos && h.standingPos <= 3) return 'A−';
  if (h.standingPos && h.standingPos <= 6) return 'B+';
  if (h.standingPos && h.standingPos <= 10) return 'B';
  if (h.standingPos && h.standingPos <= 15) return 'C+';
  if (h.standingPos && h.standingPos <= 20) return 'C';
  return 'D';
}

function guessNation(name) {
  var map = {
    'Joshua Nathanial':'GBR','Eren Aygen':'TUR','Jack Harris':'GBR',
    'Mia Svensson':'SWE','Ryo Tanaka':'JPN','Carlos Ferro':'BRA',
    'Elena Voss':'GER','Dmitri Orlov':'RUS','Aiko Hashimoto':'JPN',
    'Felix Brandt':'AUT','Priya Mehta':'IND','Luca Ferretti':'ITA',
    'Marcus Webb':'AUS','Ingrid Larsen':'NOR','Tom Castillo':'MEX',
    'Zara Nkosi':'RSA','Marco Reyes':'ESP','Kai Sorensen':'DEN',
    'Ben Oduya':'KEN','Layla Fontaine':'FRA'
  };
  return map[name] || '—';
}
