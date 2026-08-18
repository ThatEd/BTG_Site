/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Roster Helper (drivers + teams, all formats in one place)
   ---------------------------------------------------------------------------
   The single place that loads every driver/team source and merges them into
   one consistent dataset, so pages only ever talk to BTG.Roster (or to
   BTG.Data.buildDriverList) and never need to know which format data came in.

   Sources (all optional — discovered by filename under Data/Drivers and teams/):
     • BTG - Copy of Drivers.csv   base driver identity (name, nation, team, id)
     • BTG - Drivers (1).csv       optional ratings (OVR + skills) — merged over
                                   the base when the file is present (it is NOT
                                   shipped to the live site — ratings are local)
     • BTG - Teams.csv             team keys, colors, series, car
     • BTG - TeamNameLong.csv      long display names
   Adding a new format = add one entry to DRIVER_FILES / TEAM_FILES below.
   No HTML changes required — pages keep consuming BTG.Roster / BTG.Data.

   The module runs in BOTH the browser (fetch) and Node (fs), so the cache
   builder (scripts/build-cache.js) uses the exact same parsing + merge logic.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory({ node: true });
  } else {
    root.BTG = root.BTG || {};
    // Idempotent — safe to include (or inject) this file more than once.
    if (root.BTG.Roster) return;
    root.BTG.Roster = factory({ node: false });
  }
})(typeof self !== 'undefined' ? self : this, function (env) {
  'use strict';

  var isNode = !!(env && env.node);

  /* ── Base path (overridden in Node via setBaseDir) ─────────────────────── */
  var ROSTER_DIR_NAME = 'Drivers and teams';
  var baseDir = isNode
    ? null // set by build-cache.js via Roster.setBaseDir()
    : 'Data/' + encodeURIComponent(ROSTER_DIR_NAME) + '/';

  function setBaseDir(dir) { baseDir = dir; }

  /* ── Source file list ────────────────────────────────────────────────────
     The "overall helper" contract: list every format here and the helper
     merges them. Files that 404 / don't exist are skipped silently.         */
  var DRIVER_FILES = [
    { file: 'BTG - Copy of Drivers.csv', kind: 'base' },   // identity (always)
    { file: 'BTG - Drivers (1).csv',     kind: 'ratings' } // ratings (local only)
  ];
  var TEAM_FILES = [
    { file: 'BTG - Teams.csv',           kind: 'teams' },
    { file: 'BTG - TeamNameLong.csv',    kind: 'long' }
  ];

  /* ── Default team order (from the last season's team standings) ──────────
     Drivers are listed / grouped by this per-series team order by default.
     Keys are the internal roster team keys (e.g. "F2 MP" — the internal name;
     the display name "MP" comes from BTG - Teams.csv).                    */
  var TEAM_ORDER = {
    'F1': ['Red Bull', 'Mercedes', 'Ferrari', 'McLaren', 'Aston Martin', 'Alpine', 'Williams', 'Racing Bulls', 'Sauber', 'Haas'],
    'F2': ['F2 ART', 'F2 Prema', 'F2 Rodin', 'F2 DAMS', 'F2 Invicta', 'F2 MP', 'F2 VAR', 'F2 Hitech', 'F2 Trident', 'F2 Campos']
  };

  /* ── IO (browser fetch / node fs) ──────────────────────────────────────── */
  function readText(rel) {
    if (isNode) {
      var fs = require('fs');
      var path = require('path');
      var p = baseDir ? path.join(baseDir, rel) : rel;
      try {
        if (!fs.existsSync(p)) return null;
        return fs.readFileSync(p, 'utf8');
      } catch (e) { return null; }
    }
    return fetch(baseDir + encodeURIComponent(rel))
      .then(function (r) { return r.ok ? r.text() : null; })
      .catch(function () { return null; });
  }

  /* ── Name handling ───────────────────────────────────────────────────────
     nameKey: "first name + surname" (middle names dropped), diacritics
     stripped, lower-cased. Used to combine the same person across sources.
     e.g. "Theo Amaro" and "Theo Rafael Amaro" both → "theo amaro".          */
  function stripDiacritics(s) {
    try { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    catch (e) { return String(s || ''); }
  }

  function nameKey(name) {
    var parts = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    if (!parts.length) return '';
    parts = stripDiacritics(parts.join(' ')).split(' ');
    if (parts.length === 1) return parts[0];
    return parts[0] + ' ' + parts[parts.length - 1];
  }

  /** "First Surname" — middle names dropped (the display name used most places). */
  function shortName(name) {
    var parts = String(name || '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
    if (!parts.length) return '';
    return parts.length === 1 ? parts[0] : parts[0] + ' ' + parts[parts.length - 1];
  }

  /* ── CSV parsing (quote-aware) ─────────────────────────────────────────── */
  function parseCSV(text) {
    if (!text) return [];
    var rows = [], row = [], field = '', inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (inQuotes) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else if (c !== '\r') {
        field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /** Find the index of the header row (first cell matches a known key). */
  function findHeader(rows, key) {
    for (var i = 0; i < rows.length; i++) {
      if (String((rows[i] || [])[0] || '').trim() === key) return i;
    }
    return -1;
  }

  function headerIndex(rows) {
    var hdr = [];
    for (var i = 0; i < rows.length; i++) {
      var first = String((rows[i] || [])[0] || '').trim();
      if (first === 'Driver' || first === 'Team') {
        hdr = rows[i].map(function (h) { return String(h || '').trim(); });
        return { idx: i, hdr: hdr };
      }
    }
    return { idx: -1, hdr: [] };
  }

  function cell(r, hdr, name) {
    var c = hdr.indexOf(name);
    return c >= 0 ? String((r[c] != null ? r[c] : '') || '').trim() : '';
  }

  function numCell(r, hdr, name) {
    var c = hdr.indexOf(name);
    if (c < 0) return 0;
    var v = parseFloat(r[c]);
    return isFinite(v) ? v : 0;
  }

  /* ── Driver parsing ────────────────────────────────────────────────────── */
  var SKILL_COLS = [
    'Cornering', 'Braking', 'Reactions', 'Accuracy',
    'Control', 'Smoothness', 'Adaptability', 'Overtaking', 'Defending'
  ];

  function parseDriverCsv(text) {
    var rows = parseCSV(text);
    var h = headerIndex(rows);
    if (h.idx < 0) return [];
    var out = [];
    for (var i = h.idx + 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r) continue;
      var name = cell(r, h.hdr, 'Driver');
      if (!name) continue;
      var nation = cell(r, h.hdr, 'Nation');
      if (!nation || nation === 'N/A') continue;
      var team = cell(r, h.hdr, 'Team');
      if (!team || team === 'N/A') continue;
      var id = cell(r, h.hdr, 'DriverID');
      var skills = {};
      for (var s = 0; s < SKILL_COLS.length; s++) {
        var col = SKILL_COLS[s];
        var v = numCell(r, h.hdr, col);
        if (v) skills[col.charAt(0).toLowerCase() + col.slice(1)] = v;
      }
      out.push({
        id: id,
        name: shortName(name),
        nameKey: nameKey(name),
        fullName: (name !== shortName(name)) ? name : '',
        nation: nation,
        team: team,
        normalName: cell(r, h.hdr, 'Normal Name'),
        affiliation: cell(r, h.hdr, 'Affiliation'),
        ovr: numCell(r, h.hdr, 'OVR'),
        targetOvr: numCell(r, h.hdr, 'Target OVR'),
        aggression: numCell(r, h.hdr, 'Aggression'),
        skills: skills
      });
    }
    return out;
  }

  /* ── Team parsing ──────────────────────────────────────────────────────── */
  function parseTeamsCsv(text) {
    var rows = parseCSV(text);
    var h = headerIndex(rows);
    if (h.idx < 0) return [];
    var out = [];
    for (var i = h.idx + 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r) continue;
      var key = cell(r, h.hdr, 'Team');
      if (!key || key === 'N/A') continue;
      out.push({
        key: key,
        name: cell(r, h.hdr, 'Team Name') || key,
        color1: cell(r, h.hdr, 'Color 1'),
        color2: cell(r, h.hdr, 'Color 2'),
        teamID: cell(r, h.hdr, 'TeamID'),
        series: cell(r, h.hdr, 'Series'),
        car: cell(r, h.hdr, 'Car'),
        longName: ''
      });
    }
    return out;
  }

  function parseTeamLongCsv(text) {
    var rows = parseCSV(text);
    var h = headerIndex(rows);
    if (h.idx < 0) return [];
    var map = {};
    for (var i = h.idx + 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r) continue;
      var key = cell(r, h.hdr, 'Team');
      if (!key) continue;
      map[key] = cell(r, h.hdr, 'Team Name') || '';
    }
    return map;
  }

  /* ── Colour helpers ────────────────────────────────────────────────────── */
  /** '#RRGGBB' → 'r,g,b' (used by BTG.setTeamColors / teamColor fields). */
  function hexToRgb(hex) {
    if (!hex) return null;
    var h = String(hex).trim().replace(/^#/, '');
    if (h.length !== 6) return null;
    var n = parseInt(h, 16);
    if (isNaN(n)) return null;
    return ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255);
  }

  /** Merge src into target — the fuller name wins, other fields fill gaps. */
  function mergeDriver(target, src) {
    if (src.name && src.name.length > (target.name || '').length) target.name = src.name;
    // Track the fullest known name for the drivers tab (e.g. "Theo Rafael Amaro").
    if (src.fullName && src.fullName.length > (target.fullName || '').length) target.fullName = src.fullName;
    target.nameKey = target.nameKey || src.nameKey;
    ['id', 'nation', 'team', 'normalName', 'affiliation', 'ovr', 'targetOvr', 'aggression'].forEach(function (k) {
      if (src[k] && !target[k]) target[k] = src[k];
    });
    if (src.skills && Object.keys(src.skills).length) {
      target.skills = Object.assign({}, target.skills || {}, src.skills);
    }
  }

  /* ── Build the merged roster ───────────────────────────────────────────── */
  var _state = null;
  var _asyncPending = false;

  /** Sync read — in the browser a not-yet-loaded source yields null (and
      flags _asyncPending) so we never cache a partial/empty roster. */
  function readSync(rel) {
    var t = readText(rel);
    if (t && typeof t.then === 'function') { _asyncPending = true; return null; }
    return t;
  }

  function build() {
    _asyncPending = false;
    var teams = [];
    var teamLong = {};
    var seenTeam = {};

    // 1. Teams + long names
    TEAM_FILES.forEach(function (tf) {
      var text = readSync(tf.file);
      if (text == null) return;
      if (tf.kind === 'teams') {
        parseTeamsCsv(text).forEach(function (t) {
          if (!seenTeam[t.key]) { seenTeam[t.key] = true; teams.push(t); }
          else {
            var ex = teams.filter(function (x) { return x.key === t.key; })[0];
            Object.keys(t).forEach(function (k) { if (t[k]) ex[k] = t[k]; });
          }
        });
      } else if (tf.kind === 'long') {
        var m = parseTeamLongCsv(text);
        Object.keys(m).forEach(function (k) { teamLong[k] = m[k]; });
      }
    });
    teams.forEach(function (t) { if (teamLong[t.key]) t.longName = teamLong[t.key]; });

    var teamByKey = {};
    teams.forEach(function (t) {
      teamByKey[t.key] = t;
      t.colorRgb = hexToRgb(t.color1) || null;
      t.color2Rgb = hexToRgb(t.color2) || null;
    });

    // 2. Drivers — combine every source by id first, then by first+surname.
    var drivers = [];
    var byId = {}, byKey = {}, byName = {};
    DRIVER_FILES.forEach(function (df) {
      var text = readSync(df.file);
      if (text == null) return;
      parseDriverCsv(text).forEach(function (d) {
        var existing = (d.id && byId[d.id]) || byKey[d.nameKey] || byName[d.name];
        if (existing) {
          mergeDriver(existing, d);
          byName[existing.name] = existing;
        } else {
          if (d.id) byId[d.id] = d;
          byKey[d.nameKey] = d;
          byName[d.name] = d;
          drivers.push(d);
        }
      });
    });

    // 3. Resolve each driver's series from their team
    drivers.forEach(function (d) {
      var t = teamByKey[d.team];
      d.series = t ? t.series : null;
      d.teamID = t ? t.teamID : null;
    });

    // 4. Unique series, ordered F1, F2, GT1, then the rest. Only series that
    //    actually have drivers are registered (teams alone don't create a tab).
    var seriesSet = {};
    drivers.forEach(function (d) { if (d.series) seriesSet[d.series] = true; });
    var preferred = ['F1', 'F2', 'GT1', 'GT2', 'GT3', 'GT4', 'XGT'];
    var series = preferred.filter(function (s) { return seriesSet[s]; })
      .concat(Object.keys(seriesSet).filter(function (s) { return preferred.indexOf(s) === -1; }));

    // Browser: if any source is still an unresolved fetch, do NOT cache a
    // partial/empty roster — a later load() will build the real one.
    if (_asyncPending) { _state = null; return { teams: [], drivers: [], series: [] }; }

    _state = {
      teams: teams,
      drivers: drivers,
      series: series,
      teamByKey: teamByKey,
      byId: byId,
      byKey: byKey,
      byName: byName,
      generatedAt: new Date().toISOString()
    };
    return _state;
  }

  /* ── Public load API ───────────────────────────────────────────────────── */
  function loadSync() { return _state || build(); }

  function load() {
    if (_state) return Promise.resolve(_state);
    if (isNode) return Promise.resolve(build());
    // Browser: async read of each source, then build.
    var texts = {};
    var jobs = [];
    DRIVER_FILES.concat(TEAM_FILES).forEach(function (f) {
      jobs.push(readText(f.file).then(function (t) { texts[f.file] = t; }));
    });
    return Promise.all(jobs).then(function () {
      // Replace readText with a sync cache for build()
      var orig = readText;
      readText = function (rel) { return texts.hasOwnProperty(rel) ? texts[rel] : null; };
      try { return build(); }
      finally { readText = orig; }
    });
  }

  /* ── Lookups ───────────────────────────────────────────────────────────── */
  /** Ordered team keys for a series (only teams present in the roster). */
  function teamOrderFor(seriesId) {
    var st = loadSync();
    return (TEAM_ORDER[seriesId] || []).filter(function (k) { return st.teamByKey[k]; });
  }

  /** Order index for a team in a series (matches key / display / long name). */
  function teamOrderIndexOf(seriesId, teamName) {
    if (!teamName) return 99;
    var st = loadSync();
    var order = TEAM_ORDER[seriesId] || [];
    var exact = order.indexOf(teamName);
    if (exact !== -1) return exact;
    var lower = String(teamName).toLowerCase();
    for (var j = 0; j < order.length; j++) {
      var k = order[j];
      var t = st.teamByKey[k];
      var names = [k, t ? t.name : '', t ? t.longName : ''];
      for (var n = 0; n < names.length; n++) {
        if (names[n] && (names[n].toLowerCase() === lower || lower.indexOf(names[n].toLowerCase()) !== -1)) return j;
      }
    }
    return 99;
  }

  function teamByKey(key) { return (_state || loadSync()).teamByKey[key] || null; }
  function driverByName(name) { return (_state || loadSync()).byKey[nameKey(name)] || null; }
  function driverById(id) { return (_state || loadSync()).byId[id] || null; }

  /** Drivers for a series, optionally filtered to one team key. */
  function driversFor(seriesId, teamKey) {
    return (_state || loadSync()).drivers.filter(function (d) {
      if (seriesId && d.series !== seriesId) return false;
      if (teamKey && d.team !== teamKey) return false;
      return true;
    });
  }

  /** Teams for a series (F1 / F2 / GT1 …). */
  function teamsFor(seriesId) {
    return (_state || loadSync()).teams.filter(function (t) { return t.series === seriesId; });
  }

  /* ── Seed a BTG.Data-style store ─────────────────────────────────────────
     Registers series + driver season records (nation, team, colour) from the
     roster. Existing fields from race data are never overwritten — the roster
     only fills gaps, so it is safe to run before/after race ingestion.      */
  function applyToStore(store, year) {
    var st = loadSync();
    if (!store) store = { series: {}, drivers: {} };
    if (!store.series) store.series = {};
    if (!store.drivers) store.drivers = {};

    st.series.forEach(function (sid) {
      if (!store.series[sid]) store.series[sid] = { years: {}, logo: 'logos/' + sid + '.png' };
      store.series[sid].years[year] = true;
    });

    // Index existing store drivers by first+surname.
    var keyIndex = {};
    Object.keys(store.drivers).forEach(function (n) {
      var k = nameKey(n);
      if (!k) return;
      if (!keyIndex[k] || n.length < keyIndex[k].length) keyIndex[k] = n;
    });

    st.drivers.forEach(function (d) {
      if (!d.series) return;
      var mk = d.nameKey || nameKey(d.name);
      if (!mk) return;
      var canonical = d.name; // short name is the canonical store key

      // Existing key: exact short name, else the same first+surname person.
      var existingKey = store.drivers[canonical] ? canonical : (keyIndex[mk] || null);
      var drv;

      if (existingKey && existingKey !== canonical) {
        drv = store.drivers[existingKey];
        // The key being replaced may itself be the fuller name (from race data).
        if (existingKey.length > canonical.length && !drv.fullName) drv.fullName = existingKey;
        store.drivers[canonical] = drv;
        delete store.drivers[existingKey];
        keyIndex[mk] = canonical;
        drv.name = canonical;
      } else if (existingKey) {
        drv = store.drivers[existingKey];
      } else {
        drv = { name: canonical, seasons: {} };
        store.drivers[canonical] = drv;
        keyIndex[mk] = canonical;
      }

      if (d.fullName && d.fullName.length > (drv.fullName || '').length) drv.fullName = d.fullName;

      if (!drv.seasons[d.series]) drv.seasons[d.series] = {};
      if (!drv.seasons[d.series][year]) {
        drv.seasons[d.series][year] = {
          results: [], latestTeam: null, points: 0, wins: 0, podiums: 0,
          dnfs: 0, bestFinish: 99, races: 0, gridSum: 0, finishSum: 0, poles: 0,
          sprints: 0, sprintPts: 0, sprintWins: 0, sprintPodiums: 0,
          explicitStandings: false, car: null, className: null, carNumber: null
        };
      }
      var sr = drv.seasons[d.series][year];
      if (!sr.nation) sr.nation = d.nation;
      if (!sr.latestTeam) sr.latestTeam = d.team;
      var t = st.teamByKey[d.team];
      if (!sr.teamColor && t && t.colorRgb) sr.teamColor = t.colorRgb;
      drv.roster = d;
    });

    return store;
  }

  return {
    setBaseDir: setBaseDir,
    load: load,
    loadSync: loadSync,
    nameKey: nameKey,
    shortName: shortName,
    applyToStore: applyToStore,
    teamOrderFor: teamOrderFor,
    teamOrderIndexOf: teamOrderIndexOf,
    teamByKey: teamByKey,
    driverByName: driverByName,
    driverById: driverById,
    driversFor: driversFor,
    teamsFor: teamsFor,
    get teams() { return loadSync().teams; },
    get drivers() { return loadSync().drivers; },
    get series() { return loadSync().series; },
    get state() { return loadSync(); }
  };
});
