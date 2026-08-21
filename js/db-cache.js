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
  function seriesOfTeam(key) {
    var k = String(key);
    var t = (D && D.teams || []).filter(function (x) { return String(x.team_key) === k || String(x.team_id) === k; })[0];
    return t ? str(t.series) : '';
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
      // No DB seasons for this series yet — fall back to the latest season
      // year we have (so e.g. F2/GT tabs still show a season).
      var latest = 0;
      (D && D.race_seasons || []).forEach(function (s) { if (num(s.year) > latest) latest = num(s.year); });
      years = latest ? [latest] : [];
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
    var standings = by(D && D.season_driver_standings || [], 'season_id', seasonIdFor(series, year));

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
    var push = function (name) {
      if (!name || seen[name]) return;
      seen[name] = true;
      list.push(buildDriver(name));
    };

    results.forEach(function (r) { push(str(r.driver_name)); });
    standings.forEach(function (s) { push(str(s.driver_name)); });

    function preSeasonList(series, year) {
      var rs = window.BTG && BTG.Roster;
      var rows = [];

      // Prefer DB drivers (series resolved via team → Teams.series) when the
      // cache carries them; otherwise fall back to the roster CSV drivers.
      var dbDrivers = (D && D.drivers || []).filter(function (dd) {
        return seriesOfTeam(dd.team_id) === series;
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
        rows = (rs.driversFor(series) || []).map(function (d) {
          return {
            name: d.name,
            fullName: d.fullName || d.name,
            team: d.team,
            nation: d.nation || '',
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

      var teamColorOf = {};
      rosterTeams.forEach(function (t) { teamColorOf[canon(t.key)] = t.colorRgb || null; });

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
      var nation = rosterNation(name);

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
          avgFinish: racesCount ? (finishSum / racesCount).toFixed(1) : '—'
        });
      }

      return {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: name,
        fullName: name,
        team: normTeam(teamNameStr),
        teamOrder: rosterTeamOrder(teamSeries, teamNameStr),
        car: null, className: null, carNumber: null,
        series: series,
        nation: nation,
        ovr: 0, targetOvr: 0, teamColor: null, skills: {},
        standings: sd ? { pos: sd.position != null ? num(sd.position) : '—', pts: num(sd.points) } : null,
        seasonStats: {
          races: racesCount, wins: wins, podiums: podiums, dnfs: dnfs,
          bestFinish: bestFinish < 99 ? bestFinish : '—',
          avgFinish: racesCount ? (finishSum / racesCount).toFixed(1) : '—',
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
              status: str(r.status)
            };
          })
        },
        history: history,
        careerRecord: {
          starts: racesCount, wins: wins, podiums: podiums,
          points: sd ? num(sd.points) : 0, dnfs: dnfs,
          bestFinish: bestFinish < 99 ? bestFinish : '—',
          avgFinish: racesCount ? (finishSum / racesCount).toFixed(1) : '—',
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
        .catch(function () { D = null; return null; });
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
    data: function () { return D; }
  };
})();
