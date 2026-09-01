/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Race Weekend
   Faithful vanilla-JS port of the TFGTools race-weekend UI, rewired to the
   BTG JSON data in Site/Data/. Attribution: UI by TFGTools (patreon.com/c/TFGTools).
   ═══════════════════════════════════════════════════════════════════════════ */

window.BTG = window.BTG || {};

(function() {
  'use strict';

  /* Resolve a raw team key/name to the CSV display name via the roster helper
     (e.g. "F2 MP" → "MP"). No-op when the roster isn't loaded yet. */
  function normTeam(v) {
    if (!v) return v;
    return (window.BTG && BTG.Roster && BTG.Roster.teamName) ? (BTG.Roster.teamName(v) || v) : v;
  }

  /* ── Track metadata (slug → {name, flag ISO2, tag}) ─────────────────────── */
  var TRACK_META = {
    austin:        { name: 'United States Grand Prix', flag: 'us', tag: 'TEX' },
    baku:          { name: 'Azerbaijan Grand Prix',    flag: 'az', tag: 'AZE' },
    downtown_core: { name: 'Downtown Grand Prix',      flag: 'us', tag: 'DWC' },
    imola:         { name: 'Emilia-Romagna Grand Prix', flag: 'it', tag: 'IMO' },
    jeddah:        { name: 'Saudi Arabian Grand Prix', flag: 'sa', tag: 'SAU' },
    las_vegas:     { name: 'Las Vegas Grand Prix',     flag: 'us', tag: 'LAS' },
    le_castellet:  { name: 'French Grand Prix',        flag: 'fr', tag: 'FRA' },
    lusail:        { name: 'Qatar Grand Prix',         flag: 'qa', tag: 'QAT' },
    melbourne:     { name: 'Australian Grand Prix',    flag: 'au', tag: 'AUS' },
    mexico_city:   { name: 'Mexico City Grand Prix',   flag: 'mx', tag: 'MEX' },
    miami_gardens: { name: 'Miami Grand Prix',         flag: 'us', tag: 'MIA' },
    mogyor_d:      { name: 'Hungarian Grand Prix',     flag: 'hu', tag: 'HUN' },
    monaco:        { name: 'Monaco Grand Prix',        flag: 'mc', tag: 'MCO' },
    montmel:       { name: 'Spanish Grand Prix',       flag: 'es', tag: 'ESP' },
    montreal:      { name: 'Canadian Grand Prix',      flag: 'ca', tag: 'CAN' },
    monza:         { name: 'Italian Grand Prix',       flag: 'it', tag: 'MNZ' },
    s_o_paulo:     { name: 'São Paulo Grand Prix',     flag: 'br', tag: 'BRA' },
    sakhir:        { name: 'Bahrain Grand Prix',       flag: 'bh', tag: 'BHR' },
    shanghai:      { name: 'Chinese Grand Prix',       flag: 'cn', tag: 'CHN' },
    silverstone:   { name: 'British Grand Prix',       flag: 'gb', tag: 'GBR' },
    spielberg:     { name: 'Austrian Grand Prix',      flag: 'at', tag: 'AUT' },
    stavelot:      { name: 'Belgian Grand Prix',       flag: 'be', tag: 'BEL' },
    suzuka:        { name: 'Japanese Grand Prix',      flag: 'jp', tag: 'JPN' },
    yas_island:    { name: 'Abu Dhabi Grand Prix',     flag: 'ae', tag: 'UAE' },
    zandvoort:     { name: 'Dutch Grand Prix',         flag: 'nl', tag: 'NED' }
  };
  function trackMeta(slug) {
    if (!slug) return { name: 'Grand Prix', flag: '', tag: '' };
    return TRACK_META[slug] || { name: slug.replace(/_/g, ' ') + ' Grand Prix', flag: '', tag: slug.slice(0, 3).toUpperCase() };
  }

  /* ── Driver nationality guess (reuse data-loader's list + extra) ────────── */
  var NATION_GUESS = {
    'Joshua Nathanial':'GBR','Eren Aygen':'TUR','Jack Harris':'GBR','Jack Tef':'GBR',
    'Mia Svensson':'SWE','Ryo Tanaka':'JPN','Carlos Ferro':'BRA','Afonso Cachinho':'POR',
    'Elena Voss':'GER','Dmitri Orlov':'RUS','Aiko Hashimoto':'JPN','Eetu Väisänen':'FIN',
    'Felix Brandt':'AUT','Priya Mehta':'IND','Luca Ferretti':'ITA','Robin Keisner':'AUT',
    'Marcus Webb':'AUS','Ingrid Larsen':'NOR','Tom Castillo':'MEX','Richard Hicks':'GBR',
    'Zara Nkosi':'RSA','Marco Reyes':'ESP','Kai Sorensen':'DEN','Wesley Vandesteene':'BEL',
    'Ben Oduya':'KEN','Layla Fontaine':'FRA','Lucas Koopman':'NED','Maikel Zwart':'NED',
    'Zhao Lei':'CHN','Jason Roy':'CAN','Philippe Verhaeren':'BEL','Quarter Kevu':'FIN',
    'Lukus Wright':'GBR','Michiii MaraDöner':'TUR','Julian Kondra':'AUT','Sarah Springfield':'USA',
    'Sam Fakt':'NED','Riley Swansson':'USA','George Konstantaras':'GRE','Paul Aron':'EST',
    'Lance Stroll':'CAN','Liam Dela Cruz':'USA'
  };
  function guessNation(name) { return NATION_GUESS[name] || '—'; }

  /* ── Helpers (ported line-for-line from TFG race-weekend) ───────────────── */
  function formatRaceTime(value) {
    if (!Number.isFinite(value) || value <= 0) return "—";
    var ms = Math.round(value * 1000);
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var millis = ms % 1000;
    if (h > 0) return h + ':' + pad2(m) + ':' + pad2(s) + '.' + pad3(millis);
    return m + ':' + pad2(s) + '.' + pad3(millis);
  }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function pad3(n) { return String(n).padStart(3, '0'); }

  function formatGap(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "—";
    if (n === 0) return "—";
    return "+" + n.toFixed(3);
  }

  function formatSeconds(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return n.toFixed(digits || 3) + "s";
  }

  function formatGapToPole(poleTime, driverTime) {
    if (!Number.isFinite(poleTime) || !Number.isFinite(driverTime) || driverTime <= 0) return "—";
    var gap = driverTime - poleTime;
    if (gap <= 0.0005) return "Pole";
    return "+" + gap.toFixed(3) + "s";
  }

  function posTone(pos, dnf) {
    if (dnf) return "text-red-400 bg-red-500/10 border-red-500/20";
    if (Number(pos) === 1) return "text-yellow-300 bg-yellow-400/15 border-yellow-300/35";
    if (Number(pos) === 2) return "text-zinc-200 bg-zinc-300/12 border-zinc-300/25";
    if (Number(pos) === 3) return "text-orange-300 bg-orange-500/12 border-orange-300/25";
    if (Number(pos) <= 10) return "text-white bg-white/[0.04] border-white/[0.10]";
    return "text-muted-text bg-white/[0.02] border-white/[0.06]";
  }

  function podiumMedalStyle(pos) {
    if (pos === 1) return { rgb: "234 179 8", bg: "rgb(0 0 0 / 0.20)", border: "rgb(234 179 8 / 0.75)", text: "#fde68a" };
    if (pos === 2) return { rgb: "203 213 225", bg: "rgb(0 0 0 / 0.20)", border: "rgb(203 213 225 / 0.65)", text: "#e2e8f0" };
    return { rgb: "180 83 9", bg: "rgb(0 0 0 / 0.20)", border: "rgb(180 83 9 / 0.70)", text: "#fdba74" };
  }

  function driverDisplayName(driver, mode) {
    var full = (driver && driver.name) || "—";
    if (mode === "full") return full;
    var parts = full.split(/\s+/).filter(Boolean);
    return parts[parts.length - 1] || full;
  }

  /* F1 / sprint points tables (same as data-loader) */
  function racePts(pos) { var p=[25,18,15,12,10,8,6,4,2,1]; return p[pos-1]||0; }
  function sprintPts(pos) { var p=[8,7,6,5,4,3,2,1]; return p[pos-1]||0; }

  /* ── State ──────────────────────────────────────────────────────────────── */
  var state = {
    seriesList: [], activeSeries: 'F1',
    seasons: [], activeSeason: null,
    races: [],            // [{id, slug, name, flag, tag, day, isSprintWeekend}]
    selectedRaceId: null,
    selectedRace: null,
    activeTab: 'race',    // practice | quali | grid | sprint-quali | sprint | sprint-grid | race
    raceResult: [],       // raw drivers from race json
    sprintResult: [],     // raw drivers from sprint json
    qualiQ1: [], qualiQ2: [], qualiQ3: [],
    sprintQualiQ1: [], sprintQualiQ2: [], sprintQualiQ3: [],
    practiceP1: [], practiceP2: [], practiceP3: [],
    carMap: {},           // driverName → {car, className, team}
    loading: false
  };

  /* Team color registry: teamName → {id, color}.
     Color source of truth = the DB public cache (same as teams.html/drivers);
     falls back to the legacy hardcoded list only when the DB cache has no
     entry for the team. */
  var teamRegistry = {};
  var teamNextId = 1;
  function dbTeamColorRgb(name) {
    var v = BTG.DBCache && BTG.DBCache.teamColorRgb ? BTG.DBCache.teamColorRgb(name) : '';
    if (v) return v;
    var team = BTG.teamByName(name);
    return team ? (team.color || '') : '';
  }
  function teamIdFor(name) {
    if (!name) return 0;
    if (teamRegistry[name]) return teamRegistry[name].id;
    var color = dbTeamColorRgb(name) || '113,113,130';
    var id = teamNextId++;
    teamRegistry[name] = { id: id, color: color };
    // Expose --team{id}-triplet for the row coloring, like TFG
    document.documentElement.style.setProperty('--team' + id + '-triplet', color.replace(/\s*,\s*/g, ', '));
    return id;
  }
  function teamColorRgb(name) {
    var t = teamRegistry[name];
    return t ? 'rgb(var(--team' + t.id + '-triplet))' : 'rgb(113 113 130)';
  }

  var appEl = null;
  var viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1400;

  /* ── Boot ───────────────────────────────────────────────────────────────── */
  function boot() {
    appEl = document.getElementById('rw-app');
    if (!appEl) return;

    window.addEventListener('resize', function() {
      viewportWidth = window.innerWidth;
      if (state.selectedRaceId) render();
    });

    // Prefer the DB cache (Supabase) for series/season metadata so DB-backed
    // series (F2) show the right seasons; race data still comes from Data/
    // first, with the DB cache as the fallback in loadRaces().
    var dataInit = BTG.Data.init();
    var cacheInit = window.BTG.DBCache ? BTG.DBCache.init() : Promise.resolve(null);
    Promise.all([dataInit, cacheInit]).then(function(results) {
      var db = results[1];
      if (db && db.races && db.races.length) {
        BTG.Data.getSeriesList = BTG.DBCache.getSeriesList;
        BTG.Data.getSeasons = BTG.DBCache.getSeasons;
      }
      state.seriesList = BTG.Data.getSeriesList();
      state.activeSeries = state.seriesList[0] ? state.seriesList[0].id : 'F1';
      state.seasons = BTG.Data.getSeasons(state.activeSeries);
      state.activeSeason = state.seasons[0] || 2024;
      render(); // render shell + selector immediately (keeps selector visible)
      loadRaces();
    }).catch(function() {
      appEl.innerHTML = '<div class="text-center text-sm text-muted-text py-10">No data available.</div>';
    });

    // Auto-discovery completes in the background — refresh the strip with the
    // freshly discovered data (preserving the current selection when possible).
    BTG.Data.onUpdate(function() {
      state.seriesList = BTG.Data.getSeriesList();
      if (state.seriesList.length && !state.seriesList.some(function(s){ return s.id === state.activeSeries; })) {
        state.activeSeries = state.seriesList[0].id;
      }
      state.seasons = BTG.Data.getSeasons(state.activeSeries);
      if (state.seasons.indexOf(state.activeSeason) === -1) state.activeSeason = state.seasons[0] || 2024;
      loadRaces();
    });
  }

  /** Enumerate the races for the active series+season from every available source. */
  async function loadRaces() {
    var seriesId = state.activeSeries;
    var year = state.activeSeason;
    state.races = [];

    try {
      // 1. Root manifest (F1-style race files), when present
      var mRes = await fetch('Data/data-manifest.json');
      var manifest = mRes.ok ? await mRes.json() : {};
      var data = manifest[seriesId] && manifest[seriesId][String(year)];
      if (data && (data.races || data.sprints)) {
        var sprintFiles = (data.sprints || []).map(fileSlug);
        state.races = (data.races || []).map(function(f, i) {
          var slug = fileSlug(f);
          var meta = trackMeta(slug);
          return { id: slug, slug: slug, name: meta.name, flag: meta.flag, tag: meta.tag, day: i, isSprintWeekend: sprintFiles.indexOf(slug) >= 0 };
        });
      }

      // 2. No root manifest — discover "<year>/results_*_race.json" from the
      //    file list (per-season race results stored on disk).
      if (!state.races.length) {
        var files = await seriesFiles();
        var byYear = {};
        (files || []).forEach(function(f) {
          var parts = String(f).split('/');
          if (parts.length < 2) return;
          var y = Number(parts[0]);
          if (!y) return;
          if (!byYear[y]) byYear[y] = [];
          byYear[y].push(f);
        });
        if (byYear[year] && byYear[year].length) {
          state.races = racesFromFileList(byYear[year]);
        }
      }

      // 3. SeasonStatistics schedule — circuits.json lists the season's rounds
      if (!state.races.length) {
        var cRes = await fetch('Data/' + encodeURIComponent(seriesId) + '/circuits.json');
        if (cRes.ok) {
          var seasonStats = await cRes.json();
          if (seasonStats && seasonStats.season) buildScheduleFromSeason(seasonStats);
        }
      }

      // 4. AMS / Second Monitor files can also provide track names for the strip
      if (!state.races.length) {
        var smFiles = (await seriesFiles()).filter(function(f) { return /\.xlsx\.json$/i.test(f); });
        if (smFiles.length) {
          var amsRes = await fetch('Data/' + encodeURIComponent(seriesId) + '/' + smFiles[0]);
          if (amsRes.ok) {
            var ams = await amsRes.json();
            if (ams && ams.TrackInfo && ams.TrackInfo.TrackName) {
              var slug = String(ams.TrackInfo.TrackName).toLowerCase().replace(/[^a-z0-9]+/g, '_');
              var meta = trackMeta(slug);
              if (meta.name === 'Grand Prix') meta = { name: ams.TrackInfo.TrackName, flag: '', tag: slug.slice(0, 3).toUpperCase() };
              state.races.push({ id: slug, slug: slug, name: meta.name, flag: meta.flag, tag: meta.tag, day: 0, isSprintWeekend: false });
            }
          }
        }
      }

      // 5. DB cache (Supabase) — series whose race data lives in the DB, not in
      //    the Data/ folder (F2 results/sprints imported by the admin tool).
      if (!state.races.length && window.BTG.DBCache) {
        state.races = await cacheRacesFor(seriesId, year);
      }
    } catch(e) {}

    finalizeRaceLoad();
  }

  /** Build the strip from a year's file list (files like "<year>/results_*_race.json"). */
  function racesFromFileList(yearFiles) {
    var raceFiles = (yearFiles || []).filter(function(f) { return /_race\.json$/i.test(f); });
    var sprintSlugs = (yearFiles || [])
      .filter(function(f) { return /_sprint\.json$/i.test(f); })
      .map(slugFromFile);
    return raceFiles.map(function(f, i) {
      var slug = slugFromFile(f);
      var meta = trackMeta(slug);
      return { id: slug, slug: slug, name: meta.name, flag: meta.flag, tag: meta.tag, day: i, isSprintWeekend: sprintSlugs.indexOf(slug) >= 0 };
    });
  }

  /** Slug from a possibly year-prefixed file path ("2026/results_suzuka_2026_race.json"). */
  function slugFromFile(f) {
    var name = String(f).split('/').pop();
    return fileSlug(name);
  }

  function buildScheduleFromSeason(seasonStats) {
    // RLT SeasonStatistics may include an explicit rounds/schedule; if not, we
    // at least register the season so the strip can still be navigated.
    try {
      var schedule = seasonStats.season.schedule || seasonStats.seasonStatistics && seasonStats.seasonStatistics.schedule;
      if (schedule && schedule.length) {
        schedule.forEach(function(round, i) {
          var track = round.trackName || (round.track && round.track.trackName) || (round.event && round.event.track && round.event.track.trackName);
          if (!track) return;
          var slug = String(track).toLowerCase().replace(/[^a-z0-9]+/g, '_');
          var meta = trackMeta(slug);
          if (meta.name === 'Grand Prix') meta = { name: track, flag: '', tag: slug.slice(0, 3).toUpperCase() };
          state.races.push({ id: slug, slug: slug, name: meta.name, flag: meta.flag, tag: meta.tag, day: i, isSprintWeekend: false });
        });
      }
    } catch(e) {}
  }

  /** Get the active series' file list from the Node server, falling back to
   *  the cache (which exists on static hosting like GitHub Pages). */
  function seriesFiles() {
    return fetch('/api/series-files?series=' + encodeURIComponent(state.activeSeries))
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; })
      .then(function(files) {
        return (files === null) ? (BTG.Data.getSeriesFiles(state.activeSeries) || []) : files;
      });
  }

  function finalizeRaceLoad() {
    var completed = state.races;
    if (!state.selectedRaceId || !state.races.some(function(r) { return r.id === state.selectedRaceId; })) {
      // Default to the most recent race that actually has data; otherwise the
      // most recent round in the calendar.
      var withData = completed.filter(function (r) { return r.hasResults; });
      var pickList = withData.length ? withData : completed;
      state.selectedRace = pickList[pickList.length - 1] || null;
      state.selectedRaceId = state.selectedRace ? state.selectedRace.id : null;
    } else {
      state.selectedRace = state.races.filter(function(r) { return r.id === state.selectedRaceId; })[0] || null;
    }
    if (state.selectedRace) loadSelectedRaceData();
    else render();
  }

  /* ── DB cache race data (Supabase) — F2 results/sprints → TFG-style rows ── */
  function cacheTeamNameMap(cache, season) {
    var m = {};
    // Per-season team names come from "Team Identity" (Short Name / Full Name),
    // keyed by team_id + Season. Fall back to the Teams table team_name.
    (cache && cache.team_identity || []).forEach(function (t) {
      if (season != null && String(t.Season) !== String(season)) return;
      var id = t.team_id != null ? String(t.team_id) : '';
      if (!id) return;
      var n = t['Short Name'] || t['Full Name'] || '';
      if (n) m[id] = String(n);
    });
    (cache && cache.teams || []).forEach(function (t) {
      var id = String(t.team_id);
      if (!m[id]) m[id] = t.team_name || t.team_key || '';
    });
    return m;
  }
  function cacheTimeToSeconds(v) {
    if (v == null) return 0;
    var s = String(v).trim();
    if (!s || s.indexOf('+') === 0) return 0;
    var parts = s.split(':');
    if (parts.length >= 2) {
      var h = Number(parts[0]), m = Number(parts[1]), sec = Number(parts[2] || '0');
      if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(sec)) return h * 3600 + m * 60 + sec;
    }
    var n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function rowFromCacheResult(r, teamNameOf) {
    var pos = Number(r.finish_position || 0);
    var grid = Number(r.grid_position || 0);
    var dnf = !!r.dnf || /dnf|dns|retired/i.test(String(r.status || ''));
    var fl = Number(r.fastest_lap_seconds || 0);
    var laps = Number(r.laps || 0);
    var finishTime = cacheTimeToSeconds(r.time_or_gap);
    var overtakes = null;
    if (r.successful_overtakes != null || r.failed_overtakes != null) {
      overtakes = Number(r.successful_overtakes || 0) + Number(r.failed_overtakes || 0);
    }
    var teamName = teamNameOf(r.team_id) || String(r.entry_key || '').replace(/^F2\s*/i, '');
    // Register the team in the color registry (DB-backed) so team cells render
    // the correct colour, exactly like every other row source.
    var teamId = teamIdFor(teamName || 'Privateer');
    return {
      driverId: r.driver_name || '',
      teamName: teamName,
      teamId: teamId,
      TeamID: teamId,
      finishingPos: pos,
      startingPos: grid,
      fastestLap: fl,
      points: Number(r.points || 0),
      dnf: dnf,
      laps: laps,
      finishTime: finishTime,
      pitStops: Number(r.pit_stops || 0),
      pitTotal: Number(r.total_pit_time_seconds || 0),
      pitBest: Number(r.fastest_pit_time_seconds || 0),
      overtakes: overtakes,
      positionsGained: grid > 0 && pos > 0 && pos < 99 ? grid - pos : null,
      avgLap: laps > 0 && finishTime > 0 ? finishTime / laps : 0
    };
  }
  function rowFromCacheSprint(s, teamNameOf) {
    var pos = Number(s.finish_position || 0);
    var grid = Number(s.grid_position || 0);
    var teamName = teamNameOf(s.team_id) || '';
    var teamId = teamIdFor(teamName || 'Privateer');
    return {
      driverId: s.driver_name || '',
      teamName: teamName,
      teamId: teamId,
      TeamID: teamId,
      finishingPos: pos,
      startingPos: grid,
      fastestLap: Number(s.fastest_lap_seconds || 0),
      points: Number(s.points || 0),
      dnf: !!s.dnf,
      finishTime: 0,
      positionsGained: grid > 0 && pos > 0 && pos < 99 ? grid - pos : null
    };
  }
  async function cacheRacesFor(seriesId, year) {
    var cache = await BTG.DBCache.init();
    if (!cache || !cache.races) return [];
    var seasonRows = (cache.race_seasons || []).filter(function (s) { return String(s.series_id) === String(seriesId); });
    var sid = null;
    seasonRows.forEach(function (s) { if (Number(s.year) === Number(year)) sid = String(s.season_id); });
    if (sid == null && seasonRows.length) sid = String(seasonRows[seasonRows.length - 1].season_id);
    if (sid == null) return [];
    var out = [];
    (cache.races || []).filter(function (r) { return String(r.season_id) === sid; })
      .slice().sort(function (a, b) { return Number(a.round_number) - Number(b.round_number); })
      .forEach(function (r, i) {
        var circuit = String(r.circuit || r.name || '');
        var c = (window.BTG && BTG.circuitBySlug) ? BTG.circuitBySlug(circuit) : null;
        var name = c ? BTG.gpNameFor(circuit) : circuit.replace(/([a-z])([A-Z])/g, '$1 $2');
        var hasResults = (cache.race_results || []).some(function (x) { return String(x.race_id) === String(r.race_id); })
          || (cache.race_sprints || []).some(function (x) { return String(x.race_id) === String(r.race_id); });
        out.push({
          id: String(r.race_id),
          slug: String(r.race_id),
          name: name,
          flag: c ? c.flag : '',
          tag: (c && c.img) ? c.img.slice(0, 3).toUpperCase() : circuit.slice(0, 3).toUpperCase(),
          day: i,
          isSprintWeekend: true,
          cacheRace: true,
          hasResults: hasResults
        });
      });
    return out;
  }
  async function loadCacheRaceData(raceId) {
    var cache = await BTG.DBCache.init();
    state.raceResult = [];
    state.sprintResult = [];
    state.qualiQ1 = []; state.qualiQ2 = []; state.qualiQ3 = [];
    state.sprintQualiQ1 = []; state.sprintQualiQ2 = []; state.sprintQualiQ3 = [];
    state.practiceP1 = []; state.practiceP2 = []; state.practiceP3 = [];
    if (!cache) return;
    var teamNames = cacheTeamNameMap(cache, state.activeSeason);
    var teamNameOf = function (id) { return teamNames[String(id)] || ''; };
    state.raceResult = (cache.race_results || []).filter(function (r) { return String(r.race_id) === String(raceId); })
      .map(function (r) { return rowFromCacheResult(r, teamNameOf); })
      .sort(function (a, b) { return (a.finishingPos || 99) - (b.finishingPos || 99); });
    state.sprintResult = (cache.race_sprints || []).filter(function (s) { return String(s.race_id) === String(raceId); })
      .map(function (s) { return rowFromCacheSprint(s, teamNameOf); })
      .sort(function (a, b) { return (a.finishingPos || 99) - (b.finishingPos || 99); });
    state.qualiQ1 = []; state.qualiQ2 = []; state.qualiQ3 = [];
    // League export: one row per driver, all three times on it; `session` is the
    // highest session reached (Q1/Q2/Q3). Build the per-session grids from it.
    var quals = (cache.race_qualifying || []).filter(function (q) { return String(q.race_id) === String(raceId); });
    var makeQualRow = function (q, time) {
      return {
        DriverID: q.driver_name || '',
        teamName: teamNameOf(q.team_id) || '',
        TeamID: teamIdFor(teamNameOf(q.team_id) || 'Privateer'),
        FinishingPos: q.position != null ? Number(q.position) : 0,
        FastestLap: time != null ? Number(time) : 0,
        Laps: 0
      };
    };
    quals.forEach(function (q) {
      if (q.q1_time_seconds != null && Number(q.q1_time_seconds) > 0) state.qualiQ1.push(makeQualRow(q, q.q1_time_seconds));
      if (q.q2_time_seconds != null && Number(q.q2_time_seconds) > 0) state.qualiQ2.push(makeQualRow(q, q.q2_time_seconds));
      if (q.q3_time_seconds != null && Number(q.q3_time_seconds) > 0) state.qualiQ3.push(makeQualRow(q, q.q3_time_seconds));
    });
    // Practice sessions (1/2/3) — one row per driver per session from race_practice.
    state.practiceP1 = []; state.practiceP2 = []; state.practiceP3 = [];
    (cache.race_practice || []).filter(function (p) { return String(p.race_id) === String(raceId); })
      .forEach(function (p) {
        var row = {
          DriverID: p.driver_name || '',
          teamName: teamNameOf(p.team_id) || '',
          carName: null,
          TeamID: teamIdFor(teamNameOf(p.team_id) || 'Privateer'),
          FastestLap: p.best_lap_seconds != null ? Number(p.best_lap_seconds) : 0,
          Laps: p.laps != null ? Number(p.laps) : 0,
          FinishingPos: p.position != null ? Number(p.position) : 0
        };
        var sess = p.practice_session != null ? Number(p.practice_session) : 1;
        if (sess === 1) state.practiceP1.push(row);
        else if (sess === 2) state.practiceP2.push(row);
        else state.practiceP3.push(row);
      });
  }

  function fileSlug(file) {
    return String(file)
      .replace(/^results_/, '')
      .replace(/_\d{4}_(race|sprint)\.json$/, '');
  }

  function raceFileUrl(slug, session) {
    return 'Data/' + encodeURIComponent(state.activeSeries) + '/' + state.activeSeason + '/results_' + slug + '_' + state.activeSeason + '_' + session + '.json';
  }

  /** Load race data from every source available (RLT race/event + AMS). */
  function loadSelectedRaceData() {
    if (!state.selectedRace) { render(); return; }
    var slug = state.selectedRace.slug;
    state.loading = true;
    render();

    // DB-cache race (F2 and friends): read results/sprints straight from the
    // Supabase public cache instead of the Data/ folder.
    if (state.selectedRace.cacheRace) {
      loadCacheRaceData(state.selectedRace.id).then(function () {
        state.loading = false;
        render();
      });
      return;
    }

    // 1. F1-style race file
    var racePromise = fetch(raceFileUrl(slug, 'race')).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
    // 2. sprint file
    var sprintPromise = state.selectedRace.isSprintWeekend
      ? fetch(raceFileUrl(slug, 'sprint')).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; })
      : Promise.resolve(null);
    // 3. RLT event/race exports in the series folder
    var rltPromise = loadRltForRace(slug);
    // 4. AMS Second Monitor files (cars, teamless fallback, class)
    var amsPromise = loadAmsForRace(slug);

    Promise.all([racePromise, sprintPromise, rltPromise, amsPromise]).then(function(results) {
      var race = results[0];
      var sprint = results[1];
      var rlt = results[2];   // {raceRows, qualiRows} from RLT exports
      var ams = results[3];   // {raceRows, qualiRows, carMap}

      state.raceResult = [];
      state.sprintResult = [];
      state.qualiQ1 = []; state.qualiQ2 = []; state.qualiQ3 = [];
      state.sprintQualiQ1 = []; state.sprintQualiQ2 = []; state.sprintQualiQ3 = [];
      state.practiceP1 = []; state.practiceP2 = []; state.practiceP3 = [];

      // Prefer RLT/AMS structured sessions; fall back to the F1-style race file.
      if (ams && ams.raceRows.length) {
        state.raceResult = ams.raceRows;
      } else if (rlt && rlt.raceRows.length) {
        state.raceResult = rlt.raceRows;
      } else if (race && race.Drivers) {
        state.raceResult = race.Drivers;
      }

      if (ams && ams.qualiRows.length) {
        state.qualiQ1 = ams.qualiRows; // Second Monitor quali has no Q1/Q2/Q3 split — treat as one grid
      } else if (rlt && rlt.qualiRows.length) {
        state.qualiQ3 = rlt.qualiRows;
      }

      if (sprint && sprint.Drivers) state.sprintResult = sprint.Drivers;
      state.carMap = (ams && ams.carMap) || {};

      state.loading = false;
      render();
    });
  }

  /** Load RLT event/race exports for the selected track. */
  function loadRltForRace(slug) {
    var out = { raceRows: [], qualiRows: [] };
    return seriesFiles()
      .then(function(files) {
        var eventFiles = (files || []).filter(function(f) { return /(_event_|_race_)\.json$/i.test(f) && !/xlsx\.json$/i.test(f); });
        var loads = eventFiles.map(function(f) {
          return fetch('Data/' + encodeURIComponent(state.activeSeries) + '/' + f).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
        });
        return Promise.all(loads);
      })
      .then(function(ms) {
        (ms || []).forEach(function(m) {
          if (!m) return;
          var sessions = m.sessions || (m.session ? [m.session] : []);
          sessions.forEach(function(sess) {
            var type = sess.sessionInfo && sess.sessionInfo.sessionType;
            var track = (m.event && m.event.track && m.event.track.trackName) || null;
            if (track && slugify(track) !== slug) return;
            (sess.drivers || []).forEach(function(row) {
              var converted = rowFromRlt(row);
              if (/Qual/i.test(type)) out.qualiRows.push(converted);
              else if (/Race/i.test(type)) out.raceRows.push(converted);
            });
          });
        });
        out.raceRows.sort(function(a, b) { return (a.finishingPos || 99) - (b.finishingPos || 99); });
        out.qualiRows.sort(function(a, b) { return (a.finishingPos || 99) - (b.finishingPos || 99); });
        return out;
      })
      .catch(function() { return out; });
  }

  /** Load AMS / Second Monitor files for the selected track (cars + results). */
  function loadAmsForRace(slug) {
    var out = { raceRows: [], qualiRows: [], carMap: {} };
    return seriesFiles()
      .then(function(files) {
        var smFiles = (files || []).filter(function(f) { return /\.xlsx\.json$/i.test(f); });
        var loads = smFiles.map(function(f) {
          return fetch('Data/' + encodeURIComponent(state.activeSeries) + '/' + f).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
        });
        return Promise.all(loads);
      })
      .then(function(ms) {
        (ms || []).forEach(function(m) {
          if (!m || !m.Drivers) return;
          var track = m.TrackInfo && m.TrackInfo.TrackName;
          if (track && slugify(track) !== slug) return;
          var sType = m.SessionType || '';
          var isMultiClass = !!m.IsMultiClass;
          (m.Drivers || []).forEach(function(row) {
            if (row.CarName) out.carMap[row.DriverLongName] = { car: row.CarName, className: isMultiClass ? (row.ClassName || '') : '', team: row.TeamName || '' };
            var converted = rowFromAms(row, isMultiClass);
            if (/Race/i.test(sType)) out.raceRows.push(converted);
            else if (/Qual/i.test(sType)) out.qualiRows.push(converted);
          });
        });
        out.raceRows.sort(function(a, b) { return (a.finishingPos || 99) - (b.finishingPos || 99); });
        out.qualiRows.sort(function(a, b) { return (a.finishingPos || 99) - (b.finishingPos || 99); });
        return out;
      })
      .catch(function() { return out; });
  }

  function slugify(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_'); }

  /* ── Raw BTG driver → TFG-style row ─────────────────────────────────────── */
  function rowFromBtgDriver(entry, isSprint) {
    var name = entry.Driver && entry.Driver.Name;
    var teamName = entry.Team && entry.Team.Name;
    var pos = Number(entry.Position || 0);
    var grid = Number(entry.GridPosition || 0);
    var dnf = (entry.Status || '').toLowerCase().indexOf('dnf') >= 0 || pos >= 99;
    var timeMs = Number(entry.TimeInt || 0);   // milliseconds
    var gapMs = Number(entry.GapInt || 0);
    var flMs = Number(entry.FastestLapTimeInt || 0);
    var laps = Number(entry.LapsCount || 0);
    var teamId = teamIdFor(teamName);
    return {
      DriverID: name,
      TeamID: teamId,
      teamName: teamName,
      FinishingPos: pos,
      StartingPos: grid,
      GridPosition: grid,
      dnf: dnf,
      Laps: laps,
      Time: timeMs / 1000,            // seconds (for formatRaceTime)
      RaceTime: timeMs / 1000,
      FastestLap: flMs / 1000,        // seconds
      Points: isSprint ? sprintPts(pos) : racePts(pos),
      points: isSprint ? sprintPts(pos) : racePts(pos),
      driverId: name,
      teamId: teamId,
      finishingPos: pos,
      startingPos: grid,
      fastestLap: flMs / 1000,
      avgLap: laps > 0 && timeMs > 0 ? (timeMs / laps) / 1000 : 0,
      finishTime: timeMs / 1000,
      gapToNext: null,
      pitStops: 0,
      pitTotal: 0,
      pitBest: 0,
      overtakes: null,
      positionsGained: grid > 0 && pos > 0 && pos < 99 ? grid - pos : null,
      recentPerformance: null,
      DNF: dnf ? 1 : 0,
      PolePositionPoints: 0
    };
  }

  /* ── RLT session row → TFG-style row ───────────────────────────────────── */
  function rowFromRlt(row) {
    var name = row.driverName;
    var teamName = normTeam(row.teamName || (row.teamInfo && row.teamInfo.fullName) || null);
    var car = (row.teamInfo && row.teamInfo.car) || null;
    var pos = Number(row.position || 0);
    var grid = Number(row.gridPosition || 0);
    var status = row.status || row.finishStatus || '';
    var dnf = /dnf|retired|ret|dns/i.test(status);
    var laps = Number(row.lapsCompleted || 0);
    var timeMs = Number(row.totalTimeMs || 0);
    var flMs = Number(row.fastestLapTimeMs || 0);
    var teamId = teamIdFor(teamName || car || 'Privateer');
    return {
      DriverID: name,
      TeamID: teamId,
      teamName: teamName || car || 'Privateer',
      carName: car,
      FinishingPos: pos,
      StartingPos: grid,
      GridPosition: grid,
      dnf: dnf,
      Laps: laps,
      Time: timeMs / 1000,
      RaceTime: timeMs / 1000,
      FastestLap: flMs / 1000,
      Points: Number(row.driverPoints || row.points || 0) || racePts(pos),
      points: Number(row.driverPoints || row.points || 0) || racePts(pos),
      driverId: name,
      teamId: teamId,
      finishingPos: pos,
      startingPos: grid,
      fastestLap: flMs / 1000,
      avgLap: laps > 0 && timeMs > 0 ? (timeMs / laps) / 1000 : 0,
      finishTime: timeMs / 1000,
      gapToNext: null,
      pitStops: 0, pitTotal: 0, pitBest: 0,
      overtakes: null,
      positionsGained: grid > 0 && pos > 0 && pos < 99 ? grid - pos : null,
      recentPerformance: null,
      DNF: dnf ? 1 : 0,
      PolePositionPoints: 0
    };
  }

  /* ── Second Monitor (AMS) row → TFG-style row ──────────────────────────── */
  function rowFromAms(row, isMultiClass) {
    var name = row.DriverLongName || row.DriverId || row.DriverName;
    var car = row.CarName || '';
    // RLT/AMS can carry real team names (GT3/GT4, new series). Keep the real team
    // if present; otherwise leave teamName empty so car fallbacks kick in.
    var teamName = normTeam(row.TeamName && row.TeamName.trim() ? row.TeamName.trim() : '');
    var pos = Number(row.FinishingPosition || 0);
    var grid = Number(row.InitialPosition || row.GridPosition || 0);
    var status = row.FinishStatus || '';
    var dnf = /dnf|dns|retired|ret/i.test(status);
    var laps = Number(row.TotalLaps || 0);
    // AMS provides per-lap times + sectors. Derive total time, best lap, median pace.
    var totalMs = 0, bestLapMs = 0, validLapsMs = [];
    var s1s = [], s2s = [], s3s = [];
    var entryLaps = [], exitLaps = [];
    (row.Laps || []).forEach(function(lap) {
      var lt = lapTimeToMs(lap.LapTime);
      if (lt > 0) totalMs += lt;
      if (lap.IsPitEntryLap) entryLaps.push(lap);
      if (lap.IsPitExitLap) exitLaps.push(lap);
      if (lap.IsPitLap && lt > 0) {
        // pit lap — skip from pace/typical calculations
      } else if (lap.IsValid && lt > 0) {
        validLapsMs.push(lt);
        if (bestLapMs === 0 || lt < bestLapMs) bestLapMs = lt;
        if (lap.Sector1) s1s.push(lapTimeToMs(lap.Sector1));
        if (lap.Sector2) s2s.push(lapTimeToMs(lap.Sector2));
        if (lap.Sector3) s3s.push(lapTimeToMs(lap.Sector3));
      }
    });
    // Pit time lost, sector-accurate:
    //   • pit-entry lap → time lost is in Sector 3 (pit entry + stop)
    //   • pit-exit  lap → time lost is in Sector 1 (pit exit)
    // Compare each to the driver's median sector time, sum the loss, then keep
    // ~70% (remove ~30%) of the raw measure for the most accurate pit loss.
    var avgS1 = s1s.length ? median(s1s) : 0;
    var avgS3 = s3s.length ? median(s3s) : 0;
    var pitStops = Math.max(entryLaps.length, exitLaps.length);
    var stopLosses = [];
    for (var pi = 0; pi < pitStops; pi++) {
      var inS3 = entryLaps[pi] ? lapTimeToMs(entryLaps[pi].Sector3) : 0;
      var outS1 = exitLaps[pi] ? lapTimeToMs(exitLaps[pi].Sector1) : 0;
      var loss = 0;
      if (inS3 > 0 && avgS3 > 0) loss += Math.max(0, inS3 - avgS3);
      if (outS1 > 0 && avgS1 > 0) loss += Math.max(0, outS1 - avgS1);
      loss = loss * 0.7; // remove ~30% of the raw measure
      stopLosses.push(loss);
    }
    var pitTotalMs = stopLosses.reduce(function(a, b) { return a + b; }, 0);
    var pitBestExtra = stopLosses.length ? Math.min.apply(null, stopLosses) : 0;
    var paceMedianMs = validLapsMs.length ? median(validLapsMs) : 0;
    var teamId = teamIdFor(teamName || car || 'Privateer');
    return {
      DriverID: name,
      TeamID: teamId,
      teamName: teamName,
      carName: car,
      className: isMultiClass ? (row.ClassName || '') : '',
      CarNumber: row.CarNumber,
      FinishingPos: pos,
      StartingPos: grid,
      GridPosition: grid,
      dnf: dnf,
      Laps: laps,
      Time: totalMs / 1000,
      RaceTime: totalMs / 1000,
      FastestLap: bestLapMs / 1000,
      Points: racePts(pos),
      points: racePts(pos),
      driverId: name,
      teamId: teamId,
      finishingPos: pos,
      startingPos: grid,
      fastestLap: bestLapMs / 1000,
      paceMedianMs: paceMedianMs,
      avgLap: laps > 0 && totalMs > 0 ? (totalMs / laps) / 1000 : 0,
      finishTime: totalMs / 1000,
      gapToNext: null,
      pitStops: pitStops,
      pitTotal: pitTotalMs / 1000,
      pitBest: pitBestExtra / 1000,
      overtakes: null,
      positionsGained: grid > 0 && pos > 0 && pos < 99 ? grid - pos : null,
      recentPerformance: null,
      DNF: dnf ? 1 : 0,
      PolePositionPoints: 0
    };
  }

  /** Median of an array of numbers. */
  function median(arr) {
    if (!arr || !arr.length) return 0;
    var a = arr.slice().sort(function(x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  function lapTimeToMs(str) {
    if (!str) return 0;
    var parts = String(str).split(':');
    var sec = 0;
    if (parts.length === 3) sec = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
    else if (parts.length === 2) sec = Number(parts[0]) * 60 + Number(parts[1]);
    else sec = Number(parts[0]);
    return Number.isFinite(sec) ? Math.round(sec * 1000) : 0;
  }

  /* ── Race result rows (sorted by finishing position, enriched like TFG) ─── */
  function enrichRaceRows(data, isSprint) {
    var rows = (data || []).map(function(entry) {
      // AMS / RLT rows are already converted to TFG-style (have driverId + teamName +
      // lowercase fields). Raw F1 drivers have `.Driver`/`.Position`. Detect and
      // only convert raw F1 entries; pass already-converted rows through.
      if (entry && (entry.driverId !== undefined || entry.DriverID !== undefined) && !entry.Driver) {
        return normalizeRow(entry);
      }
      return rowFromBtgDriver(entry, isSprint);
    }).filter(Boolean);
    rows.sort(function(a, b) { return Number(a.finishingPos || 99) - Number(b.finishingPos || 99); });
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].dnf || !Number.isFinite(rows[i].finishTime) || rows[i].finishTime <= 0) { rows[i].gapToNext = null; continue; }
      if (i === 0) { rows[i].gapToNext = 0; continue; }
      var ahead = rows[i - 1];
      rows[i].gapToNext = (!ahead.dnf && Number.isFinite(ahead.finishTime) && ahead.finishTime > 0)
        ? rows[i].finishTime - ahead.finishTime : null;
    }
    return rows;
  }

  /** Normalize an already-converted TFG-style row to the canonical shape the renderers use. */
  function normalizeRow(r) {
    if (!r) return null;
    var pos = Number(r.finishingPos != null ? r.finishingPos : r.FinishingPos || 0);
    var grid = Number(r.startingPos != null ? r.startingPos : r.StartingPos || 0);
    var dnf = !!r.dnf || !!r.DNF || pos >= 99;
    var fl = Number(r.fastestLap != null ? r.fastestLap : r.FastestLap || 0);
    var time = Number(r.finishTime != null ? r.finishTime : r.Time != null ? r.Time : 0);
    var laps = Number(r.Laps != null ? r.Laps : 0);
    return {
      DriverID: r.driverId != null ? r.driverId : r.DriverID,
      TeamID: r.teamId != null ? r.teamId : r.TeamID,
      teamName: r.teamName,
      carName: r.carName || r.CarName || null,
      className: r.className || r.ClassName || '',
      carNumber: r.carNumber != null ? r.carNumber : r.CarNumber,
      FinishingPos: pos,
      StartingPos: grid,
      GridPosition: grid,
      dnf: dnf,
      Laps: laps,
      Time: time,
      RaceTime: time,
      FastestLap: fl,
      Points: r.points != null ? r.points : (r.Points != null ? r.Points : racePts(pos)),
      points: r.points != null ? r.points : (r.Points != null ? r.Points : racePts(pos)),
      driverId: r.driverId != null ? r.driverId : r.DriverID,
      teamId: r.teamId != null ? r.teamId : r.TeamID,
      finishingPos: pos,
      startingPos: grid,
      fastestLap: fl,
      paceMedianMs: r.paceMedianMs || 0,
      avgLap: r.avgLap || 0,
      finishTime: time,
      gapToNext: null,
      pitStops: Number(r.pitStops || 0),
      pitTotal: Number(r.pitTotal || 0),
      pitBest: Number(r.pitBest || 0),
      overtakes: r.overtakes != null ? r.overtakes : null,
      positionsGained: r.positionsGained != null ? r.positionsGained : (grid > 0 && pos > 0 && pos < 99 ? grid - pos : null),
      recentPerformance: r.recentPerformance || null,
      DNF: dnf ? 1 : 0,
      PolePositionPoints: 0
    };
  }

  function poleTimeFrom(q3) {
    var times = (q3 || []).map(function(r) { return Number(r.FastestLap); }).filter(function(t) { return Number.isFinite(t) && t > 0; });
    return times.length ? Math.min.apply(null, times) : null;
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  function render() {
    if (!appEl) return;
    var html = '';

    // PageHeader (TFG PageHeader)
    html += '<section class="rounded-md border border-white/[0.07] bg-[#161618] p-5">';
    html += '  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">';
    html += '    <div>';
    html += '      <div class="text-[11px] font-bold uppercase tracking-[0.14em] text-accent-light">Race Weekend</div>';
    html += '      <h2 class="mt-1 text-xl font-bold text-white">' + esc(state.selectedRace ? state.selectedRace.name : 'Select a Race') + '</h2>';
    html += '    </div>';
    html += '    <div class="flex items-center gap-3">';
    html += '      <label class="flex items-center gap-3">';
    html += '        <span class="text-sm font-medium text-secondary-text">Season</span>';
    html += '        <select onchange="BTG.RW.setSeason(this.value)" class="border border-white/10 bg-black/10 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300/50">';
    state.seasons.forEach(function(y) {
      html += '          <option value="' + y + '" class="bg-[#182026] text-white"' + (y === state.activeSeason ? ' selected' : '') + '>' + y + '</option>';
    });
    html += '        </select>';
    html += '      </label>';
    html += '    </div>';
    html += '  </div>';
    // belowSlot = RaceStrip
    html += '  <div class="mt-4 pt-4 border-t border-white/[0.06]">';
    html += renderRaceStrip();
    html += '  </div>';
    html += '</section>';

    // Formula switcher
    html += '<div class="flex items-center justify-between px-1 mt-4">';
    html += '  <div style="font-size:22px;font-weight:800;color:#f4f4f5;line-height:1.2;border-left:4px solid ' + seriesColor() + ';padding-left:12px;">' + esc(state.activeSeries) + ' Race Weekend</div>';
    html += '  <div style="display:flex;gap:8px;flex-shrink:0;">';
    state.seriesList.forEach(function(f) {
      if (f.id === state.activeSeries) return;
      html += '<button onclick="BTG.RW.setSeries(\'' + escAttr(f.id) + '\')" class="rw-switcher-btn">';
      html += BTG.seriesLogoImg(f.id).replace('class="dp-series-logo"', 'class="rw-series-logo"');
      html += '</button>';
    });
    html += '  </div>';
    html += '</div>';

    // Tabs
    html += '<div class="rw-tabs mt-2">';
    html += renderTabs();
    html += '</div>';

    // Content
    html += '<div class="content-panel mt-4">';
    if (state.loading) {
      html += '<div class="text-center text-sm text-muted-text py-10">Loading race data…</div>';
    } else if (!state.selectedRace) {
      html += '<div class="text-center text-sm text-muted-text py-10">Select a race from the strip above.</div>';
    } else {
      html += renderActiveTab();
    }
    html += '</div>';

    appEl.innerHTML = html;

    // Re-bind hover row effects (event delegation via data-row)
    appEl.querySelectorAll('[data-row]').forEach(function(el) {
      el.addEventListener('mouseover', function(e) {
        var cell = e.target.closest('[data-row]');
        if (!cell) return;
        var grid = cell.closest('.rw-result-grid');
        if (!grid) return;
        var idx = cell.getAttribute('data-row');
        grid.querySelectorAll('.rw-result-grid > div').forEach(function(c) {
          c.classList.remove('!bg-white/[0.05]');
        });
        grid.querySelectorAll('[data-row="' + idx + '"]').forEach(function(c) {
          c.classList.add('!bg-white/[0.05]');
        });
      });
    });
    appEl.querySelectorAll('.rw-result-grid').forEach(function(grid) {
      grid.addEventListener('mouseleave', function() {
        grid.querySelectorAll('.rw-result-grid > div').forEach(function(c) { c.classList.remove('!bg-white/[0.05]'); });
      });
    });
  }

  function renderRaceStrip() {
    var html = '<div class="rw-strip">';
    state.races.forEach(function(r) {
      var isSelected = r.id === state.selectedRaceId;
      var isCompleted = true; // all BTG races considered completed
      var cls = isSelected
        ? 'rw-strip__btn rw-strip__btn--active'
        : isCompleted ? 'rw-strip__btn' : 'rw-strip__btn rw-strip__btn--future';
      html += '<button class="' + cls + '" onclick="BTG.RW.selectRace(\'' + escAttr(r.id) + '\')" title="' + esc(r.name) + '">';
      if (r.flag) {
        html += '<img src="Flags/' + r.flag + '.svg" alt="" class="h-3.5 border border-white/10 rounded-sm" style="height:14px;width:auto;" onerror="this.style.display=\'none\';">';
      }
      html += '<span class="whitespace-nowrap">' + esc(r.tag) + '</span>';
      html += '</button>';
    });
    html += '</div>';
    return html;
  }

  function renderTabs() {
    var tabs = [];
    var hasPractice = state.practiceP1.length || state.practiceP2.length || state.practiceP3.length;
    var hasSprintQuali = state.sprintQualiQ1.length || state.sprintQualiQ2.length || state.sprintQualiQ3.length;
    var hasSprint = state.sprintResult.length;
    var hasQuali = state.qualiQ1.length || state.qualiQ2.length || state.qualiQ3.length;
    var hasCars = state.raceResult.some(function(r) { return r.carName; });

    if (hasPractice) tabs.push({ id: 'practice', label: '🔧 Practice' });
    tabs.push({ id: 'quali', label: '⏱️ Qualifying' });
    tabs.push({ id: 'grid', label: '📋 Starting Grid' });
    if (hasSprintQuali) tabs.push({ id: 'sprint-quali', label: '⚡ Sprint Quali' });
    if (hasSprint) tabs.push({ id: 'sprint', label: '⚡ Sprint Race' });
    if (hasSprint && (hasQuali || hasSprintQuali)) tabs.push({ id: 'sprint-grid', label: '⚡ Sprint Grid' });
    if (hasCars) tabs.push({ id: 'h2h', label: '⚔️ Head-to-Head' });
    tabs.push({ id: 'race', label: '🏁 Race Result' });

    // Ensure activeTab is valid
    if (!tabs.some(function(t) { return t.id === state.activeTab; })) state.activeTab = 'race';

    return tabs.map(function(t) {
      return '<button class="rw-tab' + (t.id === state.activeTab ? ' rw-tab--active' : '') + '" onclick="BTG.RW.setTab(\'' + t.id + '\')">' + t.label + '</button>';
    }).join('');
  }

  function renderActiveTab() {
    switch (state.activeTab) {
      case 'practice': return renderPracticeGrid();
      case 'quali': return renderQualiGrid(state.qualiQ1, state.qualiQ2, state.qualiQ3, poleTimeFrom(state.qualiQ3));
      case 'grid': return renderStartingGrid(state.raceResult);
      case 'sprint-quali': return renderQualiGrid(state.sprintQualiQ1, state.sprintQualiQ2, state.sprintQualiQ3, null);
      case 'sprint': return renderRaceWeekendDetail(state.sprintResult, true);
      case 'sprint-grid': return renderStartingGrid(state.raceResult, '⚡ Sprint Grid');
      case 'h2h': return renderHeadToHead();
      case 'race':
      default: return renderRaceWeekendDetail(state.raceResult, false);
    }
  }

  /* ── Head-to-Head: compare drivers on the same car ─────────────────────── */
  function renderHeadToHead() {
    var rows = enrichRaceRows(state.raceResult, false);
    var byCar = {};
    rows.forEach(function(r) { if (r.carName) { (byCar[r.carName] = byCar[r.carName] || []).push(r); } });
    var cars = Object.keys(byCar).filter(function(c) { return byCar[c].length > 1; }).sort();
    if (!cars.length) {
      return '<div class="text-center text-sm text-muted-text py-8">No head-to-head available — need multiple drivers on the same car.</div>';
    }
    var html = '';
    cars.forEach(function(car) {
      var group = byCar[car].sort(function(a, b) { return (a.finishingPos || 99) - (b.finishingPos || 99); });
      // Best (lowest) median lap pace in the group — used for delta display
      var bestPace = group.reduce(function(m, r) { return r.paceMedianMs > 0 && (m === 0 || r.paceMedianMs < m) ? r.paceMedianMs : m; }, 0);
      html += '<section class="mb-4 rounded border border-white/[0.07] bg-white/[0.02] p-3">';
      html += '<div class="mb-2 flex items-center gap-2">' + BTG.carLogoImg(car, state.activeSeries, 18) + '<span class="text-sm font-black text-white">' + esc(shortTeam(car)) + '</span><span class="text-xs text-muted-text">' + group.length + ' drivers</span></div>';
      html += '<div class="space-y-1">';
      group.forEach(function(r, idx) {
        var win = idx === 0;
        var paceDelta = (r.paceMedianMs > 0 && bestPace > 0) ? (r.paceMedianMs - bestPace) / 1000 : null;
        html += '<div class="flex items-center gap-2 rounded px-2 py-1 ' + (win ? 'bg-white/[0.04]' : '') + '">';
        html += '<span class="w-6 text-right font-mono font-black ' + (win ? 'text-yellow-300' : 'text-muted-text') + '">P' + (r.finishingPos || '—') + '</span>';
        html += photoHtml(r.driverId, r.teamName, 26);
        html += '<span class="truncate font-black text-white">' + esc(driverDisplayName({ name: r.driverId }, 'full')) + '</span>';
        if (r.paceMedianMs > 0) {
          html += '<span class="ml-auto font-mono text-[10px] ' + (paceDelta > 0 ? 'text-red-400' : 'text-emerald-400') + '">' + (paceDelta > 0 ? '+' + paceDelta.toFixed(3) : 'PACE') + 's</span>';
        } else {
          html += '<span class="ml-auto font-mono text-xs text-secondary-text">' + (r.finishTime > 0 ? formatRaceTime(r.finishTime) : (r.dnf ? 'DNF' : '—')) + '</span>';
        }
        html += '</div>';
      });
      html += '</div></section>';
    });
    return html;
  }

  /* ── Grid builders (ported from TFG) ────────────────────────────────────── */
  function buildQualiGridMeta(width, cols) {
    var available = Math.max(Number(width) || 0, 0);
    var compactMode = available < 900 ? "compact" : available < 1200 ? "medium" : "full";
    var scale = Math.max(0.75, Math.min(1.3, available / 1400));
    var widths = [42, 150]; // Pos, Driver
    cols.forEach(function() { widths.push(110); }); // Team and/or Car
    widths = widths.concat([88, 88, 88, 88]); // Q1, Q2, Q3, Gap to Pole
    var base = widths.map(function(n) { return Math.round(n * scale); });
    return { compactMode: compactMode, allowScroll: true, minWidth: base.reduce(function(s, n) { return s + n; }, 0), template: base.map(function(w) { return w + 'px'; }).join(' ') };
  }

  function buildRaceResultGridMeta(width, isSprint, hasPitData, hasOvertakes, cols) {
    var available = Math.max(Number(width) || 0, 0);
    var compactMode = available < 900 ? "lastNoPhoto" : available < 1080 ? "last" : "full";
    var scale = compactMode === "last" ? 1.0 : Math.max(0.75, Math.min(1.3, available / 1400));
    // Build the column widths from the actual header columns so the template always
    // matches the number of cells emitted (no staircasing).
    var widths = [38, 150]; // Pos, Driver
    cols.forEach(function() { widths.push(110); }); // Team and/or Car
    if (isSprint) {
      widths = widths.concat([88, 72, 46, 48, 54, 46, 82]); // Finish, Gap, Start, Finish, Places, Points, Best Lap
    } else {
      widths = widths.concat([88, 72, 46, 48, 54, 46]); // Finish, Gap, Start, Finish, Places, Points
      widths.push(hasPitData ? 50 : 0);   // Stops
      widths.push(hasPitData ? 72 : 0);   // Pit Time
      widths.push(hasPitData ? 64 : 0);   // Fastest Stop
      widths.push(76);                    // Avg Lap
      widths.push(hasOvertakes ? 72 : 0); // Overtakes
      widths.push(82);                    // Best Lap
    }
    var base = widths.map(function(n) { return Math.round(n * scale); });
    return { compactMode: compactMode, allowScroll: true, minWidth: base.reduce(function(s, n) { return s + n; }, 0), template: base.map(function(w) { return w + 'px'; }).join(' ') };
  }

  /* ── Qualifying grid ────────────────────────────────────────────────────── */
  function renderQualiGrid(q1, q2, q3, poleTime) {
    if (!q1.length && !q2.length && !q3.length) {
      return '<div class="text-center text-sm text-muted-text py-8">No qualifying data available</div>';
    }
    var grid = buildQualiGridMeta(viewportWidth, entryColumns(rows));
    var rows = [];

    // build driver map keyed by DriverID (name)
    var map = {};
    (q1 || []).forEach(function(r) { var k = r.DriverID; map[k] = map[k] || {}; map[k].q1 = r; });
    (q2 || []).forEach(function(r) { var k = r.DriverID; map[k] = map[k] || {}; map[k].q2 = r; });
    (q3 || []).forEach(function(r) { var k = r.DriverID; map[k] = map[k] || {}; map[k].q3 = r; });

    var q1Fastest = minTime(q1); var q2Fastest = minTime(q2); var q3Fastest = minTime(q3);
    // AMS / single-session quali has no Q1/Q2/Q3 split — derive pole from any populated list.
    if (poleTime == null) poleTime = q3Fastest || q2Fastest || q1Fastest;

    Object.keys(map).forEach(function(k) {
      var d = map[k];
      var q3v = d.q3, q2v = d.q2, q1v = d.q1;
      var pos = q3v ? Number(q3v.FinishingPos) : q2v ? Number(q2v.FinishingPos) : Number(q1v.FinishingPos);
      var bestTime = q3v ? q3v.FastestLap : q2v ? q2v.FastestLap : q1v.FastestLap;
      var src = q3v || q2v || q1v;
      rows.push({
        key: k,
        pos: pos,
        teamName: src.teamName,
        carName: src.carName || (state.carMap && state.carMap[k] && state.carMap[k].car) || null,
        teamId: src.TeamID,
        q1: q1v ? q1v.FastestLap : null, q1Fast: q1v && q1Fastest && Number(q1v.FastestLap).toFixed(3) === q1Fastest.toFixed(3),
        q2: q2v ? q2v.FastestLap : null, q2Fast: q2v && q2Fastest && Number(q2v.FastestLap).toFixed(3) === q2Fastest.toFixed(3),
        q3: q3v ? q3v.FastestLap : null, q3Fast: q3v && q3Fastest && Number(q3v.FastestLap).toFixed(3) === q3Fastest.toFixed(3),
        gap: formatGapToPole(poleTime, bestTime)
      });
    });
    rows.sort(function(a, b) { return a.pos - b.pos; });
    var cols = entryColumns(rows);
    var header = ['Pos', 'Driver'].concat(cols, ['Q1', 'Q2', 'Q3', 'Gap to Pole']);

    var html = '<div class="overflow-x-auto max-w-full rounded border border-white/[0.07] bg-white/[0.03]">';
    html += '<div class="w-full max-w-full min-w-0" style="min-width:' + grid.minWidth + 'px;">';
    html += '<div class="rw-result-grid grid w-full max-w-full min-w-0" style="grid-template-columns:' + grid.template + ';font-size:11px;">';
    header.forEach(function(h, i) {
      html += '<div class="min-w-0 overflow-hidden px-1 py-2 leading-tight border-b border-white/10 bg-base-header font-black uppercase tracking-[0.04em] text-muted-text ' + (i === 1 ? 'cell-driver' : i === 2 ? 'cell-team' : 'cell-data') + '" style="font-size:9px;">' + h + '</div>';
    });
    rows.forEach(function(r, idx) {
      var rowBg = idx % 2 === 1 ? 'bg-black/25' : 'bg-white/[0.018]';
      var dnf = r.pos >= 99;
      var isPole = r.gap === 'Pole';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 cell-pos border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '"><span class="inline-flex h-6 w-8 items-center justify-center rounded border font-mono text-[10px] font-black ' + posTone(r.pos, dnf) + '">' + (dnf ? 'DNF' : r.pos) + '</span></div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 cell-driver border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + (grid.compactMode !== 'compact' ? photoHtml(r.key, r.teamName, 24) : '') + '<span class="min-w-0 truncate font-black text-white">' + esc(r.key) + '</span></div>';
      html += entryCellsHtml(r, cols, grid.compactMode, 14, rowBg, idx);
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-data border-b border-white/[0.04] ' + rowBg + (r.q1Fast ? ' text-purple-400 font-black' : ' text-secondary-text') + '" data-row="' + idx + '">' + formatRaceTime(r.q1) + '</div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-data border-b border-white/[0.04] ' + rowBg + (r.q2Fast ? ' text-purple-400 font-black' : ' text-secondary-text') + '" data-row="' + idx + '">' + formatRaceTime(r.q2) + '</div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-data border-b border-white/[0.04] ' + rowBg + (r.q3Fast ? ' text-purple-400 font-black' : ' text-secondary-text') + '" data-row="' + idx + '">' + formatRaceTime(r.q3) + '</div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono font-black cell-last cell-data border-b border-white/[0.04] ' + rowBg + (isPole ? ' text-yellow-300' : ' text-accent-light') + '" data-row="' + idx + '">' + r.gap + '</div>';
    });
    html += '</div></div></div>';
    return html;
  }

  function minTime(arr) {
    var times = (arr || []).map(function(r) { return Number(r.FastestLap); }).filter(function(t) { return t > 0; });
    return times.length ? Math.min.apply(null, times) : null;
  }

  /** True if any row carries a real team name (as opposed to a car fallback). */
  function rowsHaveTeams(rows) {
    return (rows || []).some(function(r) {
      var t = r.teamName;
      return t && t !== 'Privateer' && (!r.carName || t !== r.carName);
    });
  }

  /** True if any row carries a car name. */
  function rowsHaveCars(rows) {
    return (rows || []).some(function(r) { return !!r.carName; });
  }

  /**
   * Entry columns for the grid. Series can have real teams (RLT: GT3/GT4) where
   * one team runs several different cars — keep team and car as separate columns.
   */
  function entryColumns(rows) {
    var hasTeams = rowsHaveTeams(rows);
    var hasCars = rowsHaveCars(rows);
    if (hasTeams && hasCars) return ['Team', 'Car'];
    if (hasTeams) return ['Team'];
    return ['Car'];
  }

  /** Display label for a row's entry cell: team name, or car name. */
  function entryCellLabel(row, col) {
    if (col === 'Team') return row.teamName && row.teamName !== 'Privateer' ? shortTeam(row.teamName) : '';
    return row.carName ? shortTeam(row.carName) : '';
  }

  /** Logo for a row's entry cell: team logo, or car manufacturer logo. */
  function entryCellLogo(row, col, size) {
    if (col === 'Team' && row.teamName && row.teamName !== 'Privateer' && BTG.teamLogoCandidates(row.teamName, state.activeSeries).length) {
      return teamLogoHtml(row.teamName, size);
    }
    if (col === 'Car' && row.carName) {
      return BTG.carLogoImg(row.carName, state.activeSeries, size).replace(/style="object-fit:contain;max-width:90px;"/, 'class="rw-team-logo" style="height:' + size + 'px;max-width:70px;"');
    }
    return '';
  }

  /** Render the entry cells (Team and/or Car) for a row. */
  function entryCellsHtml(row, cols, compactMode, size, rowBg, idx) {
    return cols.map(function(col) {
      var label = entryCellLabel(row, col);
      var logo = entryCellLogo(row, col, size);
      var color = col === 'Team' ? teamColorRgb(row.teamName) : 'rgb(113 113 130)';
      return '<div class="min-w-0 overflow-hidden truncate px-1 py-1 cell-team border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '" style="color:' + color + '">'
        + (label ? '<span class="min-w-0 truncate font-bold">' + esc(label) + '</span>' : '')
        + logo + '</div>';
    }).join('');
  }

  /** Compact combined label (podium / H2H): "Team · Car" when both exist. */
  function rowLabel(row) {
    var teamName = row.teamName;
    var hasTeam = teamName && teamName !== 'Privateer';
    var carName = row.carName;
    if (hasTeam && carName && carName !== teamName) return shortTeam(teamName) + ' · ' + shortTeam(carName);
    if (hasTeam) return shortTeam(teamName);
    if (carName) return shortTeam(carName);
    return 'Privateer';
  }

  /* ── Practice grid ──────────────────────────────────────────────────────── */
  function renderPracticeGrid() {
    var p1 = state.practiceP1, p2 = state.practiceP2, p3 = state.practiceP3;
    if (!p1.length && !p2.length && !p3.length) {
      return '<div class="text-center text-sm text-muted-text py-8">No practice data available</div>';
    }
    var rows = [];
    var map = {};
    (p1 || []).forEach(function(r) { var k = r.DriverID; map[k] = map[k] || {}; map[k].p1 = r; });
    (p2 || []).forEach(function(r) { var k = r.DriverID; map[k] = map[k] || {}; map[k].p2 = r; });
    (p3 || []).forEach(function(r) { var k = r.DriverID; map[k] = map[k] || {}; map[k].p3 = r; });
    rows = Object.keys(map).map(function(k) {
      var d = map[k];
      var row = d.p1 || d.p2 || d.p3;
      return {
        key: k, teamName: row.teamName,
        carName: row.carName || (state.carMap && state.carMap[k] && state.carMap[k].car) || null,
        p1: d.p1 ? d.p1.FastestLap : null, p1Laps: d.p1 ? d.p1.Laps : 0,
        p2: d.p2 ? d.p2.FastestLap : null, p2Laps: d.p2 ? d.p2.Laps : 0,
        p3: d.p3 ? d.p3.FastestLap : null, p3Laps: d.p3 ? d.p3.Laps : 0
      };
    });
    rows.sort(function(a, b) {
      var ab = a.p3 || a.p2 || a.p1 || Infinity;
      var bb = b.p3 || b.p2 || b.p1 || Infinity;
      return ab - bb;
    });
    var cols = entryColumns(rows);
    var grid = buildQualiGridMeta(viewportWidth, cols);
    var header = ['Pos', 'Driver'].concat(cols, ['FP1', 'FP2', 'FP3', 'Laps']);
    var p1f = minTime(p1), p2f = minTime(p2), p3f = minTime(p3);
    var html = '<div class="overflow-x-auto max-w-full rounded border border-white/[0.07] bg-white/[0.03]">';
    html += '<div class="w-full max-w-full min-w-0" style="min-width:' + grid.minWidth + 'px;">';
    html += '<div class="rw-result-grid grid w-full max-w-full min-w-0" style="grid-template-columns:' + grid.template + ';font-size:11px;">';
    header.forEach(function(h, i) {
      html += '<div class="min-w-0 overflow-hidden px-1 py-2 leading-tight border-b border-white/10 bg-base-header font-black uppercase tracking-[0.04em] text-muted-text ' + (i === 1 ? 'cell-driver' : i === 2 ? 'cell-team' : 'cell-data') + '" style="font-size:9px;">' + h + '</div>';
    });
    rows.forEach(function(r, idx) {
      var rowBg = idx % 2 === 1 ? 'bg-black/25' : 'bg-white/[0.018]';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 cell-pos border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '"><span class="inline-flex h-6 w-8 items-center justify-center rounded border font-mono text-[10px] font-black ' + posTone(idx + 1, false) + '">' + (idx + 1) + '</span></div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 cell-driver border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + (grid.compactMode !== 'compact' ? photoHtml(r.key, r.teamName, 24) : '') + '<span class="min-w-0 truncate font-black text-white">' + esc(r.key) + '</span></div>';
      html += entryCellsHtml(r, cols, grid.compactMode, 14, rowBg, idx);
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-data border-b border-white/[0.04] ' + rowBg + (p1f && r.p1 && Number(r.p1).toFixed(3) === p1f.toFixed(3) ? ' text-purple-400 font-black' : ' text-secondary-text') + '" data-row="' + idx + '">' + formatRaceTime(r.p1) + '</div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-data border-b border-white/[0.04] ' + rowBg + (p2f && r.p2 && Number(r.p2).toFixed(3) === p2f.toFixed(3) ? ' text-purple-400 font-black' : ' text-secondary-text') + '" data-row="' + idx + '">' + formatRaceTime(r.p2) + '</div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-data border-b border-white/[0.04] ' + rowBg + (p3f && r.p3 && Number(r.p3).toFixed(3) === p3f.toFixed(3) ? ' text-purple-400 font-black' : ' text-secondary-text') + '" data-row="' + idx + '">' + formatRaceTime(r.p3) + '</div>';
      html += '<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-last cell-data border-b border-white/[0.04] ' + rowBg + ' text-secondary-text" data-row="' + idx + '">' + ((r.p1Laps || 0) + (r.p2Laps || 0) + (r.p3Laps || 0) || '—') + '</div>';
    });
    html += '</div></div></div>';
    return html;
  }

  /* ── Race / sprint detail (TFG RaceWeekendDetail) ───────────────────────── */
  function renderRaceWeekendDetail(rawData, isSprint) {
    var rows = enrichRaceRows(rawData, isSprint);
    if (!rows.length) {
      return '<div class="text-center text-sm text-muted-text py-8">No ' + (isSprint ? 'sprint' : 'race') + ' result data available</div>';
    }
    // Only show pit / overtake columns when the data actually provides them.
    // We keep the cells in the grid (rendered as "—") and collapse the track to 0px
    // so CSS grid auto-placement never shifts rows out of alignment.
    var hasPitData = rows.some(function(r) { return r.pitStops > 0 || r.pitTotal > 0; });
    var hasOvertakes = rows.some(function(r) { return r.overtakes != null; });
    var cols = entryColumns(rows);
    var grid = buildRaceResultGridMeta(viewportWidth, isSprint, hasPitData, hasOvertakes, cols);
    var compactMode = grid.compactMode;
    var podium = rows.filter(function(r) { return r.finishingPos > 0 && r.finishingPos <= 3; }).sort(function(a, b) { return a.finishingPos - b.finishingPos; });
    var winnerTeamId = podium[0] ? podium[0].teamId : null;
    var fastest = rows.filter(function(r) { return r.fastestLap > 10; }).sort(function(a, b) { return a.fastestLap - b.fastestLap; })[0];
    var bestPit = rows.filter(function(r) { return r.pitBest > 0; }).sort(function(a, b) { return a.pitBest - b.pitBest; })[0];
    var fastestTime = fastest ? fastest.fastestLap : 0;

    var html = '<div class="overflow-hidden border border-white/10 bg-base-deep shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_18px_60px_rgba(0,0,0,0.35)]">';

    // Header
    html += '<div class="flex flex-col gap-3 border-b border-white/10 bg-white/[0.025] p-4 lg:flex-row lg:items-center lg:justify-between">';
    html += '  <div class="min-w-0">';
    html += '    <div class="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-light">' + (isSprint ? 'Sprint Classification' : 'Race Classification') + '</div>';
    html += '    <h3 class="mt-1 truncate text-xl font-black text-white">' + esc(state.selectedRace ? state.selectedRace.name : (isSprint ? 'Sprint Result' : 'Race Result')) + '</h3>';
    html += '  </div>';
    html += '  <div class="grid grid-cols-2 gap-2">';
    html += statTile(fastest ? formatRaceTime(fastest.fastestLap) : '—', 'Fastest Lap', fastest ? driverDisplayName({ name: fastest.driverId }, 'full') : undefined, 'text-purple-400');
    if (!isSprint && hasPitData) html += statTile(bestPit ? formatSeconds(bestPit.pitBest) : '—', 'Best Stop', bestPit ? driverDisplayName({ name: bestPit.driverId }, 'full') : undefined, 'text-emerald-400');
    html += '  </div>';
    html += '</div>';

    html += '<div class="space-y-4 p-4">';

    // Driver of the Day + Podium
    html += '<div class="grid items-stretch gap-4 xl:grid-cols-2">';
    html += renderDriverOfDay(rows, isSprint);
    html += renderPodium(podium, winnerTeamId);
    html += '</div>';

    // Result grid
    html += '<section class="' + (grid.allowScroll ? 'overflow-x-auto' : 'overflow-hidden') + ' max-w-full rounded border border-white/[0.07] bg-white/[0.03]">';
    html += '<div class="w-full max-w-full min-w-0" style="min-width:' + (grid.allowScroll ? grid.minWidth : 0) + 'px;">';
    html += '<div class="rw-result-grid grid w-full max-w-full min-w-0" style="grid-template-columns:' + grid.template + ';font-size:10px;">';

    // Always emit the full column set; collapsed (0px) tracks for missing data keep
    // the grid template length == cells-per-row, so rows never staircase.
    // Team and Car are separate columns when the series has both.
    var cols = entryColumns(rows);
    var headers = ['Pos', 'Driver'].concat(cols, ['Finish Time', 'Gap Ahead', 'Start', 'Finish', 'Places', 'Points']);
    if (!isSprint) headers = headers.concat(['Stops', 'Pit Time', 'Fastest Stop', 'Avg Lap', 'Overtakes']);
    headers.push('Best Lap');
    // Which header cells are collapsed to 0px (matching the template zeroing).
    var hiddenMask = [false, false];
    cols.forEach(function() { hiddenMask.push(false); });
    hiddenMask = hiddenMask.concat([false, false, false, false, false, false, false]);
    if (!isSprint) hiddenMask = hiddenMask.concat([!hasPitData, !hasPitData, !hasPitData, false, !hasOvertakes]);
    hiddenMask.push(false);
    headers.forEach(function(h, i) {
      html += '<div class="min-w-0 px-1 py-2 leading-tight border-b border-white/10 bg-base-header font-black uppercase tracking-[0.04em] text-muted-text ' + (i === 1 ? 'cell-driver' : i >= 2 && i < 2 + cols.length ? 'cell-team' : 'cell-data') + (hiddenMask[i] ? ' cell-hidden' : '') + '" style="font-size:8px;">' + h + '</div>';
    });

    rows.forEach(function(r, idx) {
      var rowBg = idx % 2 === 1 ? 'bg-black/25' : 'bg-white/[0.018]';
      var dnf = r.dnf;
      var cells = [];
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 cell-pos border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '"><span class="inline-flex h-6 w-7 items-center justify-center rounded border font-mono text-[10px] font-black ' + posTone(r.finishingPos, dnf) + '">' + (dnf ? 'DNF' : r.finishingPos) + '</span></div>');
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 cell-driver border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + (compactMode !== 'lastNoPhoto' ? photoHtml(r.driverId, r.teamName, 22) : '') + '<span class="min-w-0 truncate font-black text-white">' + esc(driverDisplayName({ name: r.driverId }, compactMode)) + '</span></div>');
      cells.push(entryCellsHtml(r, cols, compactMode, 14, rowBg, idx));
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + (dnf ? '-' : formatRaceTime(r.finishTime)) + '</div>');
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + (dnf ? '-' : formatGap(r.gapToNext)) + '</div>');
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + (r.startingPos || '—') + '</div>');
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + (dnf ? 'DNF' : r.finishingPos || '—') + '</div>');
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono font-black cell-data border-b border-white/[0.04] ' + rowBg + (r.positionsGained > 0 ? ' text-emerald-300' : r.positionsGained < 0 ? ' text-red-300' : ' text-muted-text') + '" data-row="' + idx + '">' + (r.positionsGained == null ? '—' : r.positionsGained > 0 ? '+' + r.positionsGained : r.positionsGained) + '</div>');
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono font-black text-yellow-300 cell-data border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + r.points + '</div>');
      if (!isSprint) {
        cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + (!hasPitData ? ' cell-hidden' : '') + '" data-row="' + idx + '">' + (hasPitData ? (r.pitStops || '—') : '—') + '</div>');
        cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + (!hasPitData ? ' cell-hidden' : '') + '" data-row="' + idx + '">' + (hasPitData ? formatSeconds(r.pitTotal) : '—') + '</div>');
        cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono ' + (hasPitData && bestPit && r.pitBest > 0 && r.pitBest === bestPit.pitBest ? 'text-emerald-300 font-black' : 'text-secondary-text') + ' cell-data border-b border-white/[0.04] ' + rowBg + (!hasPitData ? ' cell-hidden' : '') + '" data-row="' + idx + '">' + (hasPitData ? (r.pitBest > 0 ? formatSeconds(r.pitBest) : '—') : '—') + '</div>');
        cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + '" data-row="' + idx + '">' + formatRaceTime(r.avgLap) + '</div>');
        cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono text-secondary-text cell-data border-b border-white/[0.04] ' + rowBg + (!hasOvertakes ? ' cell-hidden' : '') + '" data-row="' + idx + '">' + (r.overtakes == null ? '—' : r.overtakes) + '</div>');
      }
      cells.push('<div class="min-w-0 overflow-hidden truncate px-1 py-1 font-mono cell-last cell-data border-b border-white/[0.04] ' + rowBg + (r.fastestLap > 10 && r.fastestLap === fastestTime ? ' text-purple-400 font-black' : ' text-secondary-text') + '" data-row="' + idx + '">' + formatRaceTime(r.fastestLap) + '</div>');
      html += cells.join('');
    });

    html += '</div></div></section>';
    html += '</div></div>'; // space-y-4, outer
    return html;
  }

  function statTile(value, label, subLabel, color) {
    var isHex = color && (color.indexOf('#') === 0 || color.indexOf('rgb') === 0 || color.indexOf('hsl') === 0);
    var cls = isHex ? '' : (color || 'text-white');
    var style = isHex ? ' style="color:' + color + ';"' : '';
    var html = '<div class="text-center bg-white/[0.01] border border-white/[0.04] rounded p-1.5">';
    html += '<div class="text-lg font-extrabold ' + cls + '"' + style + '>' + value + '</div>';
    html += '<div class="text-[8px] font-semibold uppercase tracking-[0.04em] text-muted-text mt-0.5">' + label + '</div>';
    if (subLabel) html += '<div class="text-[9px] font-bold text-white mt-0.5 truncate max-w-[120px]" title="' + esc(subLabel) + '">' + esc(subLabel) + '</div>';
    html += '</div>';
    return html;
  }

  /* ── Driver of the Day (ported scoring) ─────────────────────────────────── */
  function renderDriverOfDay(rows, isSprint) {
    var candidates = rows.filter(function(r) { return !r.dnf && r.finishingPos > 0 && r.finishingPos < 99; }).map(function(r) {
      var perf = r.recentPerformance || {};
      var formRaw = Number(perf.avg || 1.1);
      var winsRaw = Number(perf.wins || 0);
      var podsRaw = Number(perf.podiums || 0);
      var gain = Number(r.positionsGained || 0);
      var pos = r.finishingPos;
      var carPct = Number(null);
      var underdog = Number.isFinite(carPct) && carPct > 0 ? (100 - carPct) / 100 : 0.5;

      var historyScore = (formRaw / 2.35) * 12 + (winsRaw * winsRaw * 2.5) + (podsRaw * 0.5);
      var gainScore = gain > 0 ? gain * gain * 6 : 0;
      var finishBonus = pos === 1 ? 180 : pos === 2 ? 120 : pos === 3 ? 80 : pos <= 6 ? 35 : pos <= 10 ? 10 : 0;
      var carScore = underdog * underdog * 18;
      var raw = Math.max(1, historyScore + gainScore + finishBonus + carScore);
      var dotdScore = Math.pow(raw, 1.35);
      return { driverId: r.driverId, teamName: r.teamName, teamId: r.teamId, finishingPos: r.finishingPos, positionsGained: r.positionsGained, dotdScore: dotdScore, gainScore: gainScore, carScore: carScore, carPct: null, wins: winsRaw, podiums: podsRaw, isHome: false };
    }).sort(function(a, b) { return b.dotdScore - a.dotdScore || b.positionsGained - a.positionsGained || a.finishingPos - b.finishingPos; });

    var winner = candidates[0];
    if (!winner) {
      return '<section class="rounded border border-white/[0.07] bg-white/[0.03] p-3"><div class="text-[11px] font-black uppercase tracking-[0.14em] text-muted-text">Driver of the Day</div><div class="text-center text-sm text-muted-text py-4">No eligible driver data.</div></section>';
    }
    var voteTotal = candidates.reduce(function(s, c) { return s + Math.max(0, c.dotdScore); }, 0) || 1;
    var topVotes = candidates.slice(0, 4).map(function(c) { return { c: c, votePct: (Math.max(0, c.dotdScore) / voteTotal) * 100 }; });
    var others = topVotes.slice(1, 4);

    var html = '<div class="border-glow-card" style="--team-rgb:' + teamRegistryTriplet(winner.teamId) + ';--border-radius:0px;--card-bg:#090a0f;--glow-padding:18px;">';
    html += '<span class="edge-light"></span>';
    html += '<div class="border-glow-inner"><section class="h-full rounded border border-white/[0.07] bg-white/[0.03] p-3 shadow-[inset_0_0_24px_rgba(245,158,11,0.04)]">';
    html += '<div class="flex items-center justify-between gap-2"><div class="text-[11px] font-black uppercase tracking-[0.14em]" style="color:' + teamColorRgb(winner.teamName) + '">Driver of the Day</div><div class="text-2xl font-black leading-none" style="color:' + teamColorRgb(winner.teamName) + '">' + topVotes[0].votePct.toFixed(1) + '%</div></div>';
    html += '<div class="mt-3 flex items-center gap-3">' + photoHtml(winner.driverId, winner.teamName, 56) + '<div class="min-w-0 flex-1"><div class="truncate text-base font-black text-white">' + esc(driverDisplayName({ name: winner.driverId }, 'full')) + '</div><div class="mt-1 flex items-center gap-2 text-xs font-bold" style="color:' + teamColorRgb(winner.teamName) + '">' + rowLogoHtml(winner, 18) + '<span class="truncate">' + esc(rowLabel(winner)) + '</span></div></div></div>';
    html += '<div class="mt-4 space-y-2.5">';
    others.forEach(function(o, idx) {
      var c = o.c;
      html += '<div class="flex items-center gap-2 text-xs">';
      html += '<span class="w-4 text-right font-mono font-black text-muted-text">' + (idx + 2) + '</span>';
      html += '<span class="truncate font-black text-white">' + esc(driverDisplayName({ name: c.driverId }, 'full')) + '</span>';
      html += '<div class="ml-auto flex items-center gap-2"><div class="h-1.5 w-16 overflow-hidden rounded bg-white/[0.06]"><div class="h-full" style="width:' + Math.max(3, o.votePct) + '%;background:' + teamColorRgb(c.teamName) + ';"></div></div><span class="w-10 text-right font-mono font-black text-white">' + o.votePct.toFixed(1) + '%</span></div>';
      html += '</div>';
    });
    html += '</div></section></div></div>';
    return html;
  }

  function renderPodium(podium, winnerTeamId) {
    var html = '<div class="border-glow-card" style="--team-rgb:' + (winnerTeamId ? '99 102 241' : '99 102 241') + ';--border-radius:0px;--card-bg:#090a0f;--glow-padding:18px;">';
    html += '<span class="edge-light"></span>';
    html += '<div class="border-glow-inner"><section class="h-full rounded border border-white/[0.07] bg-white/[0.03] p-3">';
    html += '<div class="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-muted-text">Podium</div>';
    html += '<div class="grid grid-cols-3 gap-2">';
    [2, 1, 3].forEach(function(pos) {
      var p = null;
      podium.forEach(function(r) { if (r.finishingPos === pos) p = r; });
      var medal = podiumMedalStyle(pos);
      html += '<div class="' + (pos === 1 ? 'mt-0' : 'mt-5') + '"><div class="flex min-w-0 flex-col items-center p-2 text-center" style="background:' + medal.bg + ';color:' + medal.text + ';border:1px solid ' + medal.border + ';">';
      html += '<div class="text-[10px] font-black uppercase tracking-[0.12em]">P' + pos + '</div>';
      if (p) html += photoHtml(p.driverId, p.teamName, 56);
      else html += '<div class="h-[56px]"></div>';
      html += '<div class="mt-2 max-w-full truncate text-xs font-black text-white">' + (p ? esc(driverDisplayName({ name: p.driverId }, 'full')) : '—') + '</div>';
      if (p) html += rowLogoHtml(p, 18);
      html += '</div></div>';
    });
    html += '</div></section></div></div>';
    return html;
  }

  /* ── Starting Grid Visual (TFG StartingGridVisual + GridSlot) ───────────── */
  function renderStartingGrid(rawData, title) {
    var rows = (rawData || []).map(function(entry) {
      // Rows may already be converted (RLT/AMS) or raw F1-style entries.
      var isRow = typeof entry.finishingPos !== 'undefined' || typeof entry.carName !== 'undefined';
      var r = isRow ? entry : rowFromBtgDriver(entry, false);
      return {
        DriverID: r.driverId || r.DriverID,
        TeamID: r.teamId || r.TeamID,
        teamName: r.teamName,
        carName: r.carName || (state.carMap && state.carMap[r.driverId || r.DriverID] && state.carMap[r.driverId || r.DriverID].car) || null,
        gridPos: (r.startingPos || r.StartingPos || r.GridPosition || r.FinishingPos || r.finishingPos || 0)
      };
    });
    var grid = rows.filter(function(r) { return r.gridPos > 0; }).sort(function(a, b) { return a.gridPos - b.gridPos; });
    var pitlane = rows.filter(function(r) { return r.gridPos === 0; });
    if (!grid.length && !pitlane.length) {
      return '<div class="text-center text-sm text-muted-text py-8">No grid data available</div>';
    }
    var leftSlots = [], rightSlots = [];
    grid.forEach(function(d, i) { if (i % 2 === 0) leftSlots.push(d); else rightSlots.push(d); });

    var html = '<div><h3 class="text-sm font-bold text-white mb-4 px-2">' + esc(title || '🏁 Starting Grid') + '</h3>';
    html += '<div class="sg-track"><div class="sg-track__surface">';
    html += '<div class="sg-col sg-col--left">' + leftSlots.map(gridSlotHtml).join('') + '</div>';
    html += '<div class="sg-col sg-col--right">' + rightSlots.map(gridSlotHtml).join('') + '</div>';
    html += '</div></div>';
    if (pitlane.length) {
      html += '<div class="mt-4"><div class="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-red-400 border-y border-white/10 bg-red-500/10 mb-2">Pit Lane Start</div>';
      html += '<div class="grid grid-cols-1 gap-2">' + pitlane.map(gridSlotHtml).join('') + '</div></div>';
    }
    html += '</div>';
    return html;
  }

  function gridSlotHtml(d) {
    var teamColor = teamColorRgb(d.teamName);
    var isPitlane = d.gridPos === 0;
    return '<div class="sg-slot" style="border-left-color:' + teamColor + ';opacity:' + (isPitlane ? 0.7 : 1) + ';">'
      + '<div class="sg-slot__pos">' + (isPitlane ? 'PL' : 'P' + d.gridPos) + '</div>'
      + photoHtml(d.DriverID, d.teamName, 44)
      + '<div class="sg-slot__info"><div class="sg-slot__name" style="color:' + teamColor + '">' + esc(driverDisplayName({ name: d.DriverID }, 'full')) + '</div>'
      + '<div class="sg-slot__team">' + rowLogoHtml(d, 12) + '<span>' + esc(d.teamName && d.teamName !== 'Privateer' ? shortTeam(d.teamName) : (d.carName || 'Privateer')) + '</span></div></div>'
      + '<div class="sg-slot__num" style="color:' + teamColor + '">—</div>'
      + '</div>';
  }

  /* ── Shared cell helpers ────────────────────────────────────────────────── */
  function shortTeam(name) {
    if (!name) return 'Privateer';
    return String(name).replace(/ F[123]$/, '');
  }

  function photoHtml(driverName, teamName, size) {
    var bases = (window.BTG && BTG.driverPhotoCandidates) ? BTG.driverPhotoCandidates(driverName) : [];
    if (!bases.length) {
      return '<span class="rw-photo" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);flex-shrink:0;font-size:' + Math.round(size * 0.4) + 'px;color:#71717a;">?</span>';
    }
    // Dot-name photos (e.g. kaj.ten.voorde) + underscore fallback, thumbs first.
    var urls = [];
    bases.forEach(function (b) { urls.push(b.replace('logos/drivers/', 'logos/drivers/thumbs/') + '.webp'); });
    bases.forEach(function (b) { urls.push(b + '.webp'); urls.push(b + '.png'); });
    var chain = urls.map(function (u) { return u.replace(/"/g, '&quot;'); }).join('|');
    return '<span class="rw-photo" style="width:' + size + 'px;height:' + size + 'px;"><img src="' + urls[0] + '" onload="this.style.opacity=1" style="opacity:0;width:100%;height:100%;object-fit:cover;" data-logos="' + chain + '" data-logo-idx="0" onerror="BTG.driverPhotoStep(this)"></span>';
  }

  function teamLogoHtml(teamName, size) {
    return BTG.teamLogoImg(teamName, state.activeSeries, size).replace(/style="object-fit:contain;max-width:90px;"/, 'class="rw-team-logo" style="height:' + size + 'px;max-width:70px;"');
  }

  /** Team cell logo: use the team logo; if the driver has no team, use the car's manufacturer logo. */
  function rowLogoHtml(row, size) {
    var teamName = row.teamName;
    var hasTeam = teamName && teamName !== 'Privateer';
    if (hasTeam && BTG.teamLogoCandidates(teamName, state.activeSeries).length) {
      return teamLogoHtml(teamName, size);
    }
    if (row.carName) return BTG.carLogoImg(row.carName, state.activeSeries, size).replace(/style="object-fit:contain;max-width:90px;"/, 'class="rw-team-logo" style="height:' + size + 'px;max-width:70px;"');
    return '';
  }

  function teamRegistryTriplet(teamId) {
    var t = Object.keys(teamRegistry).map(function(k) { return teamRegistry[k]; }).filter(function(x) { return x.id === teamId; })[0];
    return t ? t.color.replace(/\s*,\s*/g, ' ') : '99 102 241';
  }

  function seriesColor() {
    // Data-driven accent color for the active series (never hardcoded per series).
    return 'rgb(' + BTG.seriesAccent(state.activeSeries) + ')';
  }

  /* ── Escaping ───────────────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

  /* ── Public API (called from inline onclick) ────────────────────────────── */
  BTG.RW = {
    setSeries: function(id) {
      if (id === state.activeSeries) return;
      state.activeSeries = id;
      state.seasons = BTG.Data.getSeasons(id);
      state.activeSeason = state.seasons[0] || 2024;
      state.selectedRaceId = null;
      state.selectedRace = null;
      state.activeTab = 'race';
      state.raceResult = []; state.sprintResult = [];
      loadRaces();
    },
    setSeason: function(y) {
      state.activeSeason = Number(y);
      state.selectedRaceId = null;
      state.selectedRace = null;
      state.activeTab = 'race';
      loadRaces();
    },
    selectRace: function(id) {
      state.selectedRace = state.races.filter(function(r) { return r.id === id; })[0] || null;
      state.selectedRaceId = id;
      state.activeTab = 'race';
      if (state.selectedRace) loadSelectedRaceData();
    },
    setTab: function(t) {
      state.activeTab = t;
      render();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
