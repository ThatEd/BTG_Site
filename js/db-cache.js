/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — DB Cache loader

   The site reads race/roster data from `cache/public-data.json`, which is
   rebuilt DAILY from the Supabase DB by .github/workflows/update-db-cache.yml
   (the DB is populated by the League export tool). This replaces the old
   per-format data-loader checks: one file, one shape.

   Exposes `BTG.DBCache`:
     init()                      -> Promise (loads cache once)
     getSeriesList()             -> [{ id, name }]
     getSeasons(series)          -> [year, ...] desc
     buildDriverList(series, season, { includeAll }) -> driver objects
     getRaces(series, season)    -> races for a season
     getCarPerformance(raceId)   -> [{team_id, entry_key, car_tier, car_pace, ...}]
     getTeamStandings(series, season) -> [{team, position, points}]
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (!window.BTG) window.BTG = {};
  var D = null;           // raw cache data
  var ready = null;       // init promise

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? '' : String(v); }
  function by(arr, key, val) { return (arr || []).filter(function (r) { return String(r[key]) === String(val); }); }

  function teamName(key) {
    var k = String(key);
    var t = (D && D.teams || []).filter(function (x) { return String(x.team_key) === k || String(x.team_id) === k; })[0];
    return (t && t.team_name) || k;
  }
  // Official per-season team names from the "Team Identity" table (Short Name
  // and Full Name keyed by team_id + Season). Short name preferred for general
  // display; pass long=true for the Full Name. Falls back to teamName.
  function teamIdentity(key, year, long) {
    var k = String(key);
    var rows = D && D.team_identity || [];
    var hit = null, bestSeason = null;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var rid = r.team_id != null ? String(r.team_id) : '';
      if (rid !== k && String(r.Team_key || '') !== k) continue;
      if (year != null && String(r.Season) !== String(year)) continue;
      if (hit == null || (r.Season != null && (bestSeason == null || Number(r.Season) > Number(bestSeason)))) { hit = r; bestSeason = r.Season; }
    }
    if (!hit) return teamName(key);
    var n = long ? (hit['Full Name'] || hit['Short Name']) : (hit['Short Name'] || hit['Full Name']);
    return n ? String(n) : teamName(key);
  }
  function teamFullName(key, year) { return teamIdentity(key, year, true); }
  function seriesOfTeam(key) {
    var k = String(key);
    var t = (D && D.teams || []).filter(function (x) { return String(x.team_key) === k || String(x.team_id) === k; })[0];
    return t ? str(t.series) : '';
  }
  // DB team colour (hex) by team_key / team_id — the site-wide source of truth.
  function teamRow(key) {
    var k = String(key || '').trim().toLowerCase();
    if (!k) return null;
    var rows = D && D.teams || [];
    // Exact first: team_key / team_id / team_name.
    for (var i = 0; i < rows.length; i++) {
      var x = rows[i];
      if (String(x.team_key).toLowerCase() === k || String(x.team_id) === String(key) || String(x.team_name || '').toLowerCase() === k) return x;
    }
    // Fuzzy word-token match so short labels resolve without false hits:
    // "RB" → "RB" (not "Racing Bulls"), "ART" → "F2 ART", but "ART" ≠ "Aston Martin".
    var qwords = k.split(/[^a-z0-9]+/).filter(function (w) { return w.length > 1; });
    if (!qwords.length) return null;
    function words(v) { return String(v).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
    for (var j = 0; j < rows.length; j++) {
      var y = rows[j];
      var hay = words(y.team_key).concat(words(y.team_name || ''));
      var hit = qwords.every(function (w) { return hay.indexOf(w) !== -1; });
      if (hit) return y;
    }
    return null;
  }
  // DB team colour (hex) by team_key / team_id / team_name — site-wide truth.
  function teamColorHex(key) {
    var t = teamRow(key);
    return (t && t.color_primary) ? str(t.color_primary) : '';
  }
  // DB team colour as "#RRGGBB" -> "r,g,b" comma form (what setTeamColors/
  // the drivers page chip expects). Empty string when unknown.
  function teamColorRgb(key, secondary) {
    var t = teamRow(key);
    var hex = t ? (secondary ? t.color_secondary : t.color_primary) : '';
    hex = str(hex).replace('#', '');
    if (hex.length !== 6) return '';
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some(isNaN)) return '';
    return r + ',' + g + ',' + b;
  }

  // Logo filename (under logos/teams/) for a team, from the cached DB — the
  // site-wide source of truth (admin-changed logos land here after a cache
  // rebuild). Exact match first (team_key / team_id / team_name), then a safe
  // word-boundary match so short labels resolve without false hits:
  //   "Prema" → "Prema Racing", "ART" → "F2 ART", but "ART" ≠ "Aston Martin".
  function teamLogo(key) {
    var k = String(key).trim().toLowerCase();
    var rows = (D && D.teams || []);
    if (!k || !rows.length) return '';
    function words(v) { return String(v).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
    var t = null;
    for (var i = 0; i < rows.length; i++) {
      var x = rows[i];
      if (String(x.team_key).toLowerCase() === k || String(x.team_id) === String(key) || String(x.team_name || '').toLowerCase() === k) { t = x; break; }
    }
    if (!t) {
      for (var j = 0; j < rows.length; j++) {
        var y = rows[j];
        if (words(y.team_key).indexOf(k) !== -1 || words(y.team_name || '').indexOf(k) !== -1) { t = y; break; }
      }
    }
    return (t && t.logo) ? str(t.logo) : '';
  }

  // Names of drivers who currently hold a DRIVING seat (seat 1-2) in a series,
  // from contract_history. Empty when the cache has no contract data yet.
  function drivingSet(series) {
    var set = {};
    (D && D.contract_history || []).forEach(function (h) {
      if (str(h.entity_type) !== 'driver') return;
      if (!h.is_current) return;
      if (str(h.role) !== 'Driving') return;
      if (seriesOfTeam(h.team_id) !== series) return;
      set[str(h.entity_name)] = true;
    });
    return set;
  }

  // Contract history timeline for an entity (driver name or TP name), newest
  // first. Rows from the cached contract_history table.
  function contractHistory(name) {
    return (D && D.contract_history || [])
      .filter(function (h) { return str(h.entity_name) === name; })
      .slice().sort(function (a, b) {
        var ka = str(a.from_year) + str(a.till_year) + (a.created_at || '');
        var kb = str(b.from_year) + str(b.till_year) + (b.created_at || '');
        return ka < kb ? 1 : ka > kb ? -1 : 0;
      });
  }

  // Lifetime stats PER SERIES for a driver — only the series where they have
  // actually been a driver (race results, standings, or a driving contract).
  function driverCareer(name) {
    var raceToSeason = {}, seasonSeries = {}, seasonYear = {};
    (D && D.races || []).forEach(function (r) { raceToSeason[String(r.race_id)] = String(r.season_id); });
    (D && D.race_seasons || []).forEach(function (rs) { seasonSeries[String(rs.season_id)] = str(rs.series_id); seasonYear[String(rs.season_id)] = num(rs.year); });
    var dbNum = dbDriverNumber(name);
    var out = {};
    function acc(series) {
      if (!out[series]) out[series] = { series: series, years: 0, starts: 0, wins: 0, sprintWins: 0, podiums: 0, dnfs: 0, points: 0, bestPos: null, champYears: [], finishSum: 0, classified: 0, teams: {}, teamKeys: [], numbers: dbNum != null ? [dbNum] : [] };
      return out[series];
    }
    function teamOf(name) {
      // current team from the driver's current contract history row
      var cur = (D && D.contract_history || []).filter(function (h) {
        return str(h.entity_type) === 'driver' && str(h.entity_name) === name && h.is_current;
      })[0];
      return cur ? str(cur.team_key) : '';
    }
    var myTeam = teamOf(name);
    (D && D.race_results || []).filter(function (r) { return str(r.driver_name) === name; }).forEach(function (r) {
      var series = seasonSeries[raceToSeason[String(r.race_id)]];
      if (!series) return;
      var st = acc(series);
      st.starts++;
      var p = num(r.finish_position);
      if (p > 0) { st.finishSum += p; st.classified++; }
      if (p === 1) st.wins++;
      if (p >= 1 && p <= 3) st.podiums++;
      if (num(r.dnf) === 1 || /dnf/i.test(str(r.status))) st.dnfs++;
      if (p > 0 && (st.bestPos == null || p < st.bestPos)) st.bestPos = p;
    });
    (D && D.race_sprints || []).filter(function (s) { return str(s.driver_name) === name; }).forEach(function (s) {
      var series = seasonSeries[raceToSeason[String(s.race_id)]];
      if (!series) return;
      if (num(s.finish_position) === 1) acc(series).sprintWins++;
    });
    (D && D.season_driver_standings || []).filter(function (s) { return str(s.driver_name) === name; }).forEach(function (s) {
      var series = seasonSeries[String(s.season_id)];
      if (!series) return;
      var st = acc(series);
      st.years++;
      st.points += num(s.points);
      var pos = num(s.position);
      if (pos > 0 && (st.bestPos == null || pos < st.bestPos)) st.bestPos = pos;
      if (pos === 1) st.champYears.push(seasonYear[String(s.season_id)] || 0);
    });
    (D && D.contract_history || []).filter(function (h) {
      return str(h.entity_type) === 'driver' && str(h.entity_name) === name && str(h.role) === 'Driving';
    }).forEach(function (h) {
      var s = str(h.series);
      if (!s) return;
      var st = acc(s);
      var tk = str(h.team_key);
      if (tk && !st.teams[tk]) { st.teams[tk] = true; st.teamKeys.push(tk); }
    });
    var list = Object.keys(out).map(function (k) { return out[k]; });
    if (myTeam) list.forEach(function (st) { if (st.teamKeys.indexOf(myTeam) === -1) st.teamKeys.push(myTeam); });
    return list.sort(function (a, b) { return a.series < b.series ? -1 : a.series > b.series ? 1 : 0; });
  }

  function seasonIdFor(series, year) {
    var rows = (D && D.race_seasons || []).filter(function (s) {
      return String(s.series_id) === series && num(s.year) === num(year);
    });
    return rows.length ? num(rows[0].season_id) : null;
  }

  function seasonIdsOfSeries(series) {
    return (D && D.race_seasons || [])
      .filter(function (s) { return String(s.series_id) === series; })
      .map(function (s) { return String(s.season_id); });
  }

  /** True if any driver source has drivers for this series (DB drivers, roster,
   *  or standings/results rows). Used to hide empty series tabs (GT3/GT4/GT
   *  Class One currently have no drivers). */
  function seriesHasDrivers(series) {
    if ((D && D.drivers || []).some(function (dd) { return seriesOfTeam(dd.team_id) === series; })) return true;
    try {
      var rs = window.BTG && BTG.Roster;
      if (rs && rs.driversFor && (rs.driversFor(series) || []).length) return true;
    } catch (e) {}
    var sids = seasonIdsOfSeries(series);
    if (sids.length) {
      if ((D && D.season_driver_standings || []).some(function (r) { return sids.indexOf(String(r.season_id)) !== -1; })) return true;
      var raceToSeason = {};
      (D && D.races || []).forEach(function (r) { raceToSeason[String(r.race_id)] = String(r.season_id); });
      if ((D && D.race_results || []).some(function (r) { return sids.indexOf(raceToSeason[String(r.race_id)]) !== -1; })) return true;
    }
    return false;
  }

  function getSeriesList() {
    var seen = {};
    var order = {};
    (D && D.series || []).forEach(function (s) {
      seen[s.series_id] = { id: s.series_id, name: s.name };
      order[s.series_id] = num(s.sort_order);
    });
    (D && D.race_seasons || []).forEach(function (s) {
      if (!seen[s.series_id]) seen[s.series_id] = { id: s.series_id };
    });
    (D && D.teams || []).forEach(function (t) {
      if (t.series && !seen[t.series]) seen[t.series] = { id: t.series };
    });
    return Object.keys(seen)
      .map(function (id) { return seen[id]; })
      .filter(function (s) { return seriesHasDrivers(s.id); })
      .sort(function (a, b) {
        var oa = order[a.id] != null ? order[a.id] : 99, ob = order[b.id] != null ? order[b.id] : 99;
        return oa - ob || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      });
  }

  function getSeasons(series) {
    var set = {};
    (D && D.race_seasons || []).forEach(function (s) {
      if (String(s.series_id) === series) set[num(s.year)] = true;
    });
    var years = Object.keys(set).map(Number).sort(function (a, b) { return b - a; });
    if (!years.length) {
      // No DB seasons for this series yet — fall back to the current app year
      // (in-universe season) so roster-only tabs still show a season.
      var appYear = 0;
      if (D && D.app_state && D.app_state.length) appYear = num(D.app_state[0].year);
      years = appYear ? [appYear] : [];
    }
    return years;
  }

  function getRaces(series, year) {
    var sid = seasonIdFor(series, year);
    if (sid == null) return [];
    return by(D && D.races || [], 'season_id', sid)
      .slice().sort(function (a, b) { return num(a.round_number) - num(b.round_number); });
  }

  function getCarPerformance(raceId) {
    return by(D && D.race_car_performance || [], 'race_id', raceId);
  }

  function getTeamStandings(series, year) {
    var sid = seasonIdFor(series, year);
    if (sid == null) return [];
    return by(D && D.season_team_standings || [], 'season_id', sid)
      .slice().sort(function (a, b) { return num(a.position) - num(b.position); })
      .map(function (r) { return { team: teamName(r.entry_key), entryKey: r.entry_key, teamId: r.team_id, position: num(r.position), points: num(r.points) }; });
  }

  function rosterNation(name) {
    try {
      var rd = window.BTG && BTG.Roster && BTG.Roster.driverByName ? BTG.Roster.driverByName(name) : null;
      return (rd && rd.nation) || '';
    } catch (e) { return ''; }
  }
  function dbNation(name) {
    // DB (cache drivers) is the fallback source of truth when the roster CSV
    // has no match (e.g. name encoding mismatches).
    try {
      var nm = String(name || '').trim().toLowerCase();
      if (!nm) return '';
      var rows = (D && D.drivers) || [];
      for (var i = 0; i < rows.length; i++) {
        var x = rows[i];
        if (String(x.full_name || '').trim().toLowerCase() === nm || String(x.driver_name || '').trim().toLowerCase() === nm) return str(x.nation) || '';
      }
    } catch (e) {}
    return '';
  }
  function dbDriverNumber(name) {
    // Driver's car number from the DB drivers table (per driver).
    try {
      var nm = String(name || '').trim().toLowerCase();
      if (!nm) return null;
      var rows = (D && D.drivers) || [];
      for (var i = 0; i < rows.length; i++) {
        var x = rows[i];
        if (String(x.full_name || '').trim().toLowerCase() === nm || String(x.driver_name || '').trim().toLowerCase() === nm) {
          var n = num(x.driver_number);
          return n > 0 ? n : null;
        }
      }
    } catch (e) {}
    return null;
  }
  function rosterTeamOrder(series, team) {
    try {
      if (window.BTG && BTG.Roster && BTG.Roster.teamOrderIndexOf) return BTG.Roster.teamOrderIndexOf(series, team);
    } catch (e) {}
    return 99;
  }
  function normTeam(name) {
    try {
      if (window.BTG && BTG.Roster && BTG.Roster.teamName) return BTG.Roster.teamName(name);
    } catch (e) {}
    return name;
  }

  function buildDriverList(series, year, opts) {
    opts = opts || {};
    var races = getRaces(series, year);
    var raceIds = races.map(function (r) { return String(r.race_id); });
    var results = (D && D.race_results || []).filter(function (r) { return raceIds.indexOf(String(r.race_id)) !== -1; });
    var sprints = (D && D.race_sprints || []).filter(function (s) { return raceIds.indexOf(String(s.race_id)) !== -1; });
    var standings = by(D && D.season_driver_standings || [], 'season_id', seasonIdFor(series, year));
    // Current driving-seat drivers for this series (reserves/Juniors excluded).
    var driving = drivingSet(series);
    var drivingKnown = Object.keys(driving).length > 0;

    // Pre-season edge case: the season has a calendar but no race results and
    // no driver standings yet (no races run). Show the actual BTG grid from
    // the roster, ordered by TEAM (DB team-standings order, else roster team
    // order) — the drivers are BTG's own, not the real-world drivers, so we
    // never seed with real F1 championship order.
    if (!results.length && !standings.length) {
      return preSeasonList(series, year);
    }

    var list = [];
    var seen = {};
    // Drivers who actually have race results in this series always belong in
    // the standings — the Driving-seat filter only hides never-raced reserves.
    var raced = {};
    results.forEach(function (r) { raced[str(r.driver_name)] = true; });
    var push = function (name) {
      if (!name || seen[name]) return;
      seen[name] = true;
      list.push(buildDriver(name));
    };

    results.forEach(function (r) { if (!drivingKnown || raced[str(r.driver_name)] || driving[str(r.driver_name)]) push(str(r.driver_name)); });
    standings.forEach(function (s) { if (!drivingKnown || raced[str(s.driver_name)] || driving[str(s.driver_name)]) push(str(s.driver_name)); });

    function preSeasonList(series, year) {
      var rs = window.BTG && BTG.Roster;
      var rows = [];

      // Prefer DB drivers (series resolved via team → Teams.series) when the
      // cache carries them; otherwise fall back to the roster CSV drivers.
      var dbDrivers = (D && D.drivers || []).filter(function (dd) {
        return seriesOfTeam(dd.team_id) === series;
      });
      if (dbDrivers.length && drivingKnown) dbDrivers = dbDrivers.filter(function (dd) {
        return driving[str(dd.driver_name || dd.full_name || dd.name)];
      });
      if (dbDrivers.length) {
        rows = dbDrivers.map(function (dd) {
          return {
            name: dd.driver_name || dd.full_name || dd.name,
            fullName: dd.full_name || dd.name,
            // Resolve team_id → team name via the DB teams table (covers
            // XGT/GT teams the roster doesn't know); canon() passes names
            // through if the roster has no match.
            team: teamName(dd.team_id),
            nation: dd.nation || '',
            number: dd.driver_number != null ? dd.driver_number : null
          };
        });
      } else if (rs && rs.driversFor) {
        var rosterRows = (rs.driversFor(series) || []).filter(function (d) { return !drivingKnown || driving[d.name]; });
        rows = rosterRows.map(function (d) {
          return {
            name: d.name,
            fullName: d.fullName || d.name,
            team: d.team,
            nation: d.nation || dbNation(d.name || d.fullName || ''),
            number: d.number != null ? d.number : null
          };
        });
      }
      if (!rows.length) return [];

      // Canonical team display name for a raw ref (roster key or DB name).
      function canon(teamRef) {
        if (teamRef == null) return '';
        var nm = rs && rs.teamName ? rs.teamName(teamRef) : teamRef;
        return nm || '';
      }

      // Team sort keys: DB team standings positions first (1..N), then any
      // remaining teams (roster order, then DB series teams in cache order).
      var teamSort = {}, next = 0;
      getTeamStandings(series, year).forEach(function (ts) {
        var c = canon(ts.team);
        if (c && teamSort[c] == null) teamSort[c] = next++;
      });
      var fallbackStart = next;
      var rosterTeams = rs && rs.teamsFor ? rs.teamsFor(series) : [];
      rosterTeams.forEach(function (t) {
        var c = canon(t.key);
        if (c && teamSort[c] == null) teamSort[c] = fallbackStart + rs.teamOrderIndexOf(series, c);
      });
      (D && D.teams || []).filter(function (t) { return str(t.series) === series; }).forEach(function (t) {
        var c = canon(t.team_name);
        if (c && teamSort[c] == null) teamSort[c] = fallbackStart + Object.keys(teamSort).length + 1;
      });

      // Team colours: DB cache first (site-wide truth), roster as fallback.
      var teamColorOf = {};
      (D && D.teams || []).forEach(function (t) {
        if (str(t.series) !== series) return;
        var c = canon(t.team_name) || canon(t.team_key);
        if (c) teamColorOf[c] = teamColorRgb(t.team_key) || teamColorRgb(t.team_name) || null;
      });
      rosterTeams.forEach(function (t) {
        var c = canon(t.key);
        if (c && !teamColorOf[c]) teamColorOf[c] = t.colorRgb || null;
      });

      return rows.map(function (d) {
        var team = canon(d.team);
        return {
          id: d.name.toLowerCase().replace(/\s+/g, '-'),
          name: d.name,
          fullName: d.fullName || d.name,
          team: team,
          teamOrder: teamSort[team] != null ? teamSort[team] : 99,
          car: null, className: null,
          carNumber: d.number != null ? d.number : null,
          series: series,
          nation: d.nation || '',
          ovr: 0, targetOvr: 0, teamColor: teamColorOf[team] || null, skills: {},
          standings: null,
          seasonStats: null,
          history: [],
          careerRecord: { starts: 0, wins: 0, podiums: 0, points: 0, dnfs: 0, bestFinish: '—', avgFinish: '—', yrs: 0, yrsAtTeam: 0 }
        };
      }).sort(function (a, b) {
        var ta = a.teamOrder != null ? a.teamOrder : 99, tb = b.teamOrder != null ? b.teamOrder : 99;
        if (ta !== tb) return ta - tb;
        var na = a.carNumber != null ? a.carNumber : 99, nb = b.carNumber != null ? b.carNumber : 99;
        if (na !== nb) return na - nb;
        return (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      });
    }

    function buildDriver(name) {
      var mine = results.filter(function (r) { return str(r.driver_name) === name; });
      var sd = standings.filter(function (s) { return str(s.driver_name) === name; })[0];

      var racesCount = mine.length;
      var wins = mine.filter(function (r) { return num(r.finish_position) === 1; }).length;
      var podiums = mine.filter(function (r) { var p = num(r.finish_position); return p >= 1 && p <= 3; }).length;
      var sprintWins = sprints.filter(function (s) { return str(s.driver_name) === name && num(s.finish_position) === 1; }).length;
      var mySprints = sprints.filter(function (s) { return str(s.driver_name) === name; });
      var sprintPodiums = mySprints.filter(function (s) { var p = num(s.finish_position); return p >= 1 && p <= 3; }).length;
      var sprintPts = mySprints.reduce(function (a, s) { return a + num(s.points); }, 0);
      var dnfs = mine.filter(function (r) { return num(r.dnf) === 1 || /dnf/i.test(str(r.status)); }).length;
      var finishes = mine.filter(function (r) { return num(r.finish_position) > 0; }).map(function (r) { return num(r.finish_position); });
      var bestFinish = finishes.length ? Math.min.apply(null, finishes) : 99;
      var finishSum = finishes.reduce(function (a, b) { return a + b; }, 0);
      var gridPos = mine.map(function (r) { return r.grid_position != null ? num(r.grid_position) : null; }).filter(function (v) { return v != null; });
      var avgGrid = gridPos.length ? gridPos.reduce(function (a, b) { return a + b; }, 0) / gridPos.length : null;
      var poles = mine.filter(function (r) { return num(r.grid_position) === 1; }).length;
      var sortedResults = mine.slice().sort(function (a, b) { return num(a.race_id) - num(b.race_id); });
      var lastResult = mine[mine.length - 1] || null;
      var teamKey = lastResult ? str(lastResult.team_id) : '';
      var teamNameStr = teamKey ? teamName(teamKey) : '';
      var teamSeries = teamKey ? seriesOfTeam(teamKey) : series;
      var nation = rosterNation(name) || dbNation(name);
      var dbNum = dbDriverNumber(name);

      // Junior/feeder academy + reserve stints: the current academy team (Junior /
      // Affiliate / Reserve) plus the full per-team season ranges from
      // contract_history (Junior/Affiliate → academy row, Reserve → reserve row).
      var academy = '';
      var academyRole = ''; // 'Junior' | 'Affiliate' | 'Reserve' — for the label
      var acadStints = [], resStints = [];
      var acadByTeam = {}, resByTeam = {};
      (D && D.contract_history || []).forEach(function (h) {
        if (str(h.entity_type) !== 'driver' || str(h.entity_name) !== name) return;
        var r = str(h.role);
        var isRes = r === 'Reserve';
        if (r !== 'Junior' && r !== 'Affiliate' && r !== 'Reserve') return;
        var tk = str(h.team_key);
        if (!tk) return;
        // Current feeder tag: Junior/Affiliate → Academy, Reserve → Reserve.
        if (h.is_current) { academy = tk; academyRole = r; }
        var fy = num(h.from_year) || num(year);
        var ty = num(h.till_year) || fy;
        if (ty > num(year)) ty = num(year); // only current/past seasons, not future
        var map = isRes ? resByTeam : acadByTeam;
        if (!map[tk]) map[tk] = [];
        for (var sy = fy; sy <= ty; sy++) { if (map[tk].indexOf(sy) === -1) map[tk].push(sy); }
      });
      Object.keys(acadByTeam).forEach(function (tk) { acadStints.push({ team: tk, seasons: acadByTeam[tk].slice().sort(function (a, b) { return a - b; }), color: teamColorHex(tk) }); });
      Object.keys(resByTeam).forEach(function (tk) { resStints.push({ team: tk, seasons: resByTeam[tk].slice().sort(function (a, b) { return a - b; }), color: teamColorHex(tk) }); });
      var academyColor = academy ? teamColorHex(academy) : '';

      // Median lap pace (seconds→ms) from fastest-lap data, median quali time
      // (seconds) from race_qualifying best session per race.
      function median(arr) {
        var a = arr.slice().sort(function (x, y) { return x - y; });
        if (!a.length) return null;
        var mid = Math.floor(a.length / 2);
        return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
      }
      var paceMs = median(mine.map(function (r) { return r.fastest_lap_seconds != null ? num(r.fastest_lap_seconds) * 1000 : null; }).filter(function (v) { return v != null; }));
      var myQualiRows = (D && D.race_qualifying || []).filter(function (q) {
        return raceIds.indexOf(String(q.race_id)) !== -1 && str(q.driver_name) === name;
      });
      var bestQualiByRace = {};
      myQualiRows.forEach(function (q) {
        var times = [q.q1_time_seconds, q.q2_time_seconds, q.q3_time_seconds]
          .map(function (v) { return v != null && v !== '' ? num(v) : null; })
          .filter(function (v) { return v != null; });
        if (times.length) {
          var b = Math.min.apply(null, times);
          var key = String(q.race_id);
          if (bestQualiByRace[key] == null || b < bestQualiByRace[key]) bestQualiByRace[key] = b;
        }
      });
      var qualiMs = median(Object.keys(bestQualiByRace).map(function (k) { return bestQualiByRace[k]; }));

      var history = [];
      if (teamNameStr) {
        history.push({
          season: num(year), series: series,
          team: normTeam(teamNameStr), car: null, className: null,
          races: racesCount, points: sd ? num(sd.points) : 0,
          pos: sd ? num(sd.position) : '—',
          wins: wins, podiums: podiums, dnfs: dnfs,
          avgFinish: finishes.length ? (finishSum / finishes.length).toFixed(1) : '—'
        });
      }
      // Reserve contracts appear in the career history (Past Seasons) too, but are
      // kept out of the main timeline year blocks (they don't split a season).
      resStints.forEach(function (st) {
        st.seasons.forEach(function (sy) {
          var rteam = normTeam(st.team);
          var hs = seriesOfTeam(st.team) || '';
          var dup = history.some(function (x) { return x.team === rteam && x.season === sy && x.role === 'Reserve'; });
          if (dup) return;
          history.push({ season: sy, series: hs, team: rteam, car: null, className: null, role: 'Reserve', races: 0, points: 0, pos: '—', wins: 0, podiums: 0, dnfs: 0, avgFinish: '—' });
        });
      });

      return {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        fullName: name,
        team: normTeam(teamNameStr),
        teamOrder: rosterTeamOrder(teamSeries, teamNameStr),
        car: null, className: null, carNumber: dbNum != null ? dbNum : null,
        series: series,
        nation: nation,
        academy: academy,
        academyRole: academyRole,
        academyColor: academyColor,
        academyStints: acadStints,
        reserveStints: resStints,
        ovr: 0, targetOvr: 0, teamColor: null, skills: {},
        standings: sd ? { pos: sd.position != null ? num(sd.position) : '—', pts: num(sd.points) } : null,
        seasonStats: {
          races: racesCount, wins: wins, podiums: podiums, sprints: mySprints.length,
          sprintWins: sprintWins, sprintPodiums: sprintPodiums, sprintPts: sprintPts, dnfs: dnfs,
          bestFinish: bestFinish < 99 ? bestFinish : '—',
          avgFinish: finishes.length ? (finishSum / finishes.length).toFixed(1) : '—',
          avgGrid: avgGrid != null ? avgGrid.toFixed(1) : '—',
          poles: poles,
          paceMedianMs: paceMs,
          qualiMedianMs: qualiMs,
          smReliability: null,
          results: sortedResults.map(function (r) {
            return {
              race: num(r.race_id), round: raceRound(r.race_id), track: raceName(r.race_id),
              pos: num(r.finish_position), grid: r.grid_position != null ? num(r.grid_position) : null,
              pts: num(r.points), dnf: num(r.dnf), laps: num(r.laps),
              fastest: r.fastest_lap_seconds != null ? num(r.fastest_lap_seconds) : null,
              overtakes: num(r.successful_overtakes),
              failedOvertakes: num(r.failed_overtakes),
              defends: num(r.successful_defends),
              failedDefends: num(r.failed_defends),
              status: str(r.status)
            };
          })
        },
        history: history,
        careerRecord: {
          starts: racesCount, wins: wins, podiums: podiums,
          points: sd ? num(sd.points) : 0, dnfs: dnfs,
          bestFinish: bestFinish < 99 ? bestFinish : '—',
          avgFinish: finishes.length ? (finishSum / finishes.length).toFixed(1) : '—',
          yrs: teamNameStr ? 1 : 0, yrsAtTeam: teamNameStr ? 1 : 0
        }
      };
    }

    function raceRound(raceId) {
      var r = by(races, 'race_id', raceId)[0];
      return r ? num(r.round_number) : 0;
    }

    function raceName(raceId) {
      var r = by(races, 'race_id', raceId)[0];
      return r ? (r.name || r.circuit || '') : '';
    }

    return list.sort(function (a, b) {
      var ta = a.teamOrder != null ? a.teamOrder : 99, tb = b.teamOrder != null ? b.teamOrder : 99;
      if (ta !== tb) return ta - tb;
      var pa = a.standings ? num(a.standings.pos) : 99, pb = b.standings ? num(b.standings.pos) : 99;
      if (pa !== pb) return pa - pb;
      return (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    });
  }

  window.BTG.DBCache = {
    init: function () {
      if (ready) return ready;
      ready = fetch('cache/public-data.json')
        .then(function (r) { if (!r.ok) throw new Error('cache ' + r.status); return r.json(); })
        .then(function (d) { D = d; return d; })
        .catch(function () { ready = null; D = null; return null; });
      return ready;
    },
    isReady: function () { return !!D; },
    getSeriesList: getSeriesList,
    getSeasons: getSeasons,
    getRaces: getRaces,
    getCarPerformance: getCarPerformance,
    getTeamStandings: getTeamStandings,
    buildDriverList: buildDriverList,
    teamName: teamName,
    teamIdentity: teamIdentity,
    teamFullName: teamFullName,
    teamLogo: teamLogo,
    teamColorHex: teamColorHex,
    teamColorRgb: teamColorRgb,
    contractHistory: contractHistory,
    driverCareer: driverCareer,
    data: function () { return D; }
  };
})();
