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

  /* ── Placeholder rows ─────────────────────────────────────────────────────
     The league DB keeps an unassigned/free-agent team row (team_id 999,
     team_key/team_name "None"). It is a valid FK target for contracts whose
     driver has no team, but it must never be rendered as a real team name —
     pages would show a "None" constructor. Treat those ids/keys, plus null
     and empty input, as "unknown" everywhere a team is looked up. */
  var PLACEHOLDER_TEAM_IDS = { '0': true, '999': true };
  var PLACEHOLDER_TEAM_KEYS = { 'none': true, 'null': true, 'undefined': true, 'n/a': true, '-': true, '—': true };

  function isPlaceholderTeamKey(v) {
    var s = str(v).trim().toLowerCase();
    return !s || PLACEHOLDER_TEAM_KEYS[s] === true;
  }
  function isPlaceholderTeam(row) {
    if (!row) return true;
    if (PLACEHOLDER_TEAM_IDS[str(row.team_id)] === true) return true;
    return isPlaceholderTeamKey(row.team_key) && isPlaceholderTeamKey(row.team_name);
  }
  /** Normalise a team reference; '' for null/undefined/"None"/999. */
  function teamRef(key) {
    if (key == null) return '';
    var k = str(key).trim();
    if (isPlaceholderTeamKey(k) || PLACEHOLDER_TEAM_IDS[k] === true) return '';
    return k;
  }

  /** Loose comparison key for a team reference: the DB stores the same team as
   *  "red_bull" (Teams.team_key), "Red Bull" (contract_history.team_key /
   *  driver_cars.team_key) and "RB" in places, so exact string equality misses
   *  real matches and makes one constructor look like two. Lower-case and drop
   *  every non-alphanumeric character: "red_bull", "Red Bull" and "RedBull"
   *  all become "redbull". */
  function teamMatchKey(v) {
    return str(v).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function teamName(key) {
    var k = teamRef(key);
    if (!k) return '';
    // The league DB mixes key styles ("haas" / "red_bull" vs contract_history's
    // "Haas" / "Red Bull"), so match loosely — the same way teamRow() does.
    var kl = teamMatchKey(k);
    var rows = (D && D.teams || []).filter(function (x) { return !isPlaceholderTeam(x); });
    var t = rows.filter(function (x) {
      return teamMatchKey(x.team_key) === kl || teamMatchKey(x.team_name) === kl || String(x.team_id) === k;
    })[0];
    // team_name and team_key are the same value for some DB rows; a row whose
    // only name is the key adds nothing, so fall back to the raw reference.
    if (!t) return k;
    return str(t.team_name) || str(t.team_key) || k;
  }
  // Official per-season team names from the "Team Identity" table (Short Name
  // and Full Name keyed by team_id + Season). Short name preferred for general
  // display; pass long=true for the Full Name. Falls back to teamName.
  function teamIdentity(key, year, long) {
    var k = teamRef(key);
    if (!k) return '';
    var rows = D && D.team_identity || [];
    var hit = null, bestSeason = null;
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var rid = r.team_id != null ? String(r.team_id) : '';
      if (rid !== k && teamMatchKey(r.Team_key) !== teamMatchKey(k)) continue;
      if (year != null && String(r.Season) !== String(year)) continue;
      if (hit == null || (r.Season != null && (bestSeason == null || Number(r.Season) > Number(bestSeason)))) { hit = r; bestSeason = r.Season; }
    }
    if (!hit) return teamName(k);
    var n = long ? (hit['Full Name'] || hit['Short Name']) : (hit['Short Name'] || hit['Full Name']);
    return n ? String(n) : teamName(k);
  }
  function teamFullName(key, year) { return teamIdentity(key, year, true); }
  function seriesOfTeam(key) {
    var k = teamRef(key);
    if (!k) return '';
    var kl = teamMatchKey(k);
    var t = (D && D.teams || []).filter(function (x) {
      return !isPlaceholderTeam(x) &&
        (teamMatchKey(x.team_key) === kl || teamMatchKey(x.team_name) === kl || String(x.team_id) === k);
    })[0];
    return t ? str(t.series) : '';
  }
  // DB team colour (hex) by team_key / team_id — the site-wide source of truth.
  function teamRow(key) {
    var k = teamRef(key).toLowerCase();
    if (!k) return null;
    var rows = (D && D.teams || []).filter(function (x) { return !isPlaceholderTeam(x); });
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

  /* ── Car / seat order ────────────────────────────────────────────────────
     `Contracts.seat` is the league's source of truth for who is in which car:
     1-2 = the race cars (car 1 = seat 1), 3+ = reserve/junior/affiliate seats.
     It reaches the site as `driver_cars` in the cache; older caches (and
     non-F1 entries) fall back to the game's own car order, which the `team_staff`
     driver rows carry as `pos_in_team`.

     Every page that lists a team's drivers uses these helpers so car 1 is
     always shown first instead of whatever order the source happened to have
     (contract creation order, alphabetical, OVR, …). */

  // Name key for matching a driver across sources: lower-case, diacritics
  // stripped, middle names dropped ("Lily Wiśniewska" == "Lily Wisniewska",
  // "Michiii MaraDöner" == "Michiii Maradoener", "Theo Rafael Amaro" ==
  // "Theo Amaro"). The race data, the Contracts table and the roster each
  // spell some names differently, so the key must be accent-insensitive.
  function nameKey(v) {
    var s = str(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/đ/g, 'd').replace(/æ/g, 'ae').replace(/ß/g, 'ss');
    var parts = s.replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
    if (!parts.length || !parts[0]) return '';
    return parts.length <= 2 ? parts.join(' ') : parts[0] + ' ' + parts[parts.length - 1];
  }

  // Driver name from whatever shape a page holds: a plain string, a cache
  // driver row, a contract_history row, or a teams-page {first_name,last_name}.
  function driverLabel(x) {
    if (x == null) return '';
    if (typeof x === 'string') return x;
    var nm = x.fullName || x.name || x.driver_name || x.entity_name;
    if (!nm) nm = (str(x.first_name) + ' ' + str(x.last_name)).trim();
    return str(nm);
  }

  /* ── Seat resolution ─────────────────────────────────────────────────────
     `Contracts.seat` is the league's source of truth for who is in which car,
     but a driver can hold several CONCURRENT seats: a race seat in one series
     plus a reserve/junior seat at an F1 team (e.g. an F2 driver who is also an
     F1 academy member). A name-only lookup picks whichever row happens to win
     the tie-break, so the same driver would sort as "car 1" on both teams.

     Seats are therefore resolved per (driver, team) — and per series when the
     caller knows it — so each team's lineup is ordered from its own contracts.
     Rows whose contract window misses the season fall back to an unwindowed
     row from the same team, then to the game's `team_staff.pos_in_team`. */
  function seatRowsByName() {
    var map = {};
    function add(nm, seat, from, till, rank, teamId, teamSeries) {
      var k = nameKey(nm);
      if (!k || !(seat >= 1)) return;
      (map[k] = map[k] || []).push({
        seat: seat, from: from, till: till, rank: rank,
        team_id: teamRef(teamId), series: str(teamSeries)
      });
    }
    // 1) League contracts (authoritative).
    (D && D.driver_cars || []).forEach(function (c) {
      add(c.driver_name, num(c.seat),
        c.from_year == null || c.from_year === '' ? null : num(c.from_year),
        c.till_year == null || c.till_year === '' ? null : num(c.till_year), 0,
        c.team_id, c.series || seriesOfTeam(c.team_id));
    });
    // 2) Fallback: the game's car position for the team's drivers.
    (D && D.team_staff || []).forEach(function (s) {
      if (str(s.role_label) !== 'Driver') return;
      var nm = (str(s.first_name) + ' ' + str(s.last_name)).trim();
      add(nm, num(s.pos_in_team), null, null, 1, s.team_id, seriesOfTeam(s.team_id));
    });
    return map;
  }

  /** Normalise the optional `scope` argument into { team, series }. */
  function seatScope(scope) {
    if (scope == null) return { team: '', series: '' };
    if (typeof scope === 'object') {
      return {
        team: teamRef(scope.team != null ? scope.team : (scope.team_id != null ? scope.team_id : scope.teamKey)),
        series: str(scope.series)
      };
    }
    // A bare string is a team key or team id.
    return { team: teamRef(scope), series: '' };
  }

  /** Car/seat number for a driver (1 = car 1).
   *
   *  `year`  — prefer the contract row whose window covers that season (the
   *            tightest window wins, so a one-year deal beats a longer future
   *            deal that also spans the season).
   *  `scope` — optional { team, series } (or a team key/id) so a driver with
   *            concurrent seats in different teams/series is ordered by the
   *            seat that belongs to the team being rendered. Omit it to keep
   *            the old best-row behaviour. */
  function carSeat(name, year, scope) {
    var rows = seatRowsByName()[nameKey(driverLabel(name))];
    if (!rows || !rows.length) return null;
    var sc = seatScope(scope);
    var teamId = sc.team ? String((teamRow(sc.team) || {}).team_id || sc.team) : '';
    var scoped = rows;
    if (teamId || sc.series) {
      var hit = rows.filter(function (r) {
        if (teamId && String(r.team_id) !== teamId) return false;
        if (sc.series && r.series && r.series !== sc.series) return false;
        return true;
      });
      // A scope that matches nothing here means the driver has no seat on this
      // team — report "no seat" instead of falling back to another team's car.
      if (!hit.length) return null;
      scoped = hit;
    }
    var y = year == null || year === '' ? null : Number(year);
    var pool = scoped.filter(function (r) {
      if (y == null) return true;
      return (r.from == null || r.from <= y) && (r.till == null || r.till >= y);
    });
    if (!pool.length) pool = scoped;
    pool = pool.slice().sort(function (a, b) {
      if (a.rank !== b.rank) return a.rank - b.rank;
      var wa = a.till == null || a.from == null ? Infinity : a.till - a.from;
      var wb = b.till == null || b.from == null ? Infinity : b.till - b.from;
      if (wa !== wb) return wa - wb;
      if (a.seat !== b.seat) return a.seat - b.seat;
      return 0;
    });
    return pool[0].seat;
  }

  /** Team key for a driver-like value (object with teamKey/team, or a name). */
  function teamKeyOf(x) {
    if (x && typeof x === 'object') {
      if (x.teamKey != null) return teamRef(x.teamKey);
      if (x.team != null) return teamRef(x.team);
      return '';
    }
    return '';
  }

  /** Order two drivers by car seat. `scope` behaves like carSeat()'s, plus
   *  { perTeam: true } which scopes each driver to their own team. */
  function compareByCar(a, b, year, scope) {
    var la = driverLabel(a), lb = driverLabel(b);
    var sa, sb;
    if (scope && typeof scope === 'object' && scope.perTeam) {
      var series = str(scope.series);
      var ta = teamKeyOf(a), tb = teamKeyOf(b);
      sa = carSeat(la, year, { team: ta, series: series || seriesOfTeam(ta) });
      sb = carSeat(lb, year, { team: tb, series: series || seriesOfTeam(tb) });
    } else {
      sa = carSeat(la, year, scope);
      sb = carSeat(lb, year, scope);
    }
    if (sa == null && sb == null) { }
    else if (sa == null) return 1;
    else if (sb == null) return -1;
    else if (sa !== sb) return sa - sb;
    var na = nameKey(la), nb = nameKey(lb);
    return na < nb ? -1 : na > nb ? 1 : 0;
  }

  /** Comparator that orders a team's drivers by car: seat 1, seat 2, then the
   *  reserve/junior seats, then anything without a seat (by name).
   *  `scope` is passed through to carSeat() — pass { team, series } so each
   *  team's lineup uses that team's own contracts. */
  function byCarOrder(year, scope) {
    return function (a, b) { return compareByCar(a, b, year, scope); };
  }

  /** Sort a list of drivers into car order (returns a new array).
   *
   *  `scope` is optional:
   *   • omitted                  → every driver is ordered by their best seat
   *                                across all teams (legacy behaviour).
   *   • { team, series }         → one team's lineup, ordered by that team's
   *                                own contracts.
   *   • { perTeam: true, series } → a mixed list spanning several teams: each
   *                                driver is scoped to their own team so a
   *                                driver holding seats in two series is never
   *                                ordered by the other team's car. */
  function sortByCar(list, year, scope) {
    var arr = (list || []).slice();
    return arr.sort(function (a, b) { return compareByCar(a, b, year, scope); });
  }

  // Whole-career favorite circuit + favored track type for a driver, computed
  // over EVERY race the cache has them in (all seasons/series). DNS/DSQ races
  // are ignored completely — as if the driver never raced there.
  //  • Favorite circuit: best average finish per track, nudged for repeat bests.
  //  • Favorite track type: a SINGLE type — the track's physical type (Road
  //    Course/Street) OR its characteristics (Power/High Speed/...), whichever
  //    the driver statistically favours. Each result is compared to the
  //    driver's own average for the season it came from (only races they were
  //    in); DNFs count half weight; physical wins on a 50/50.
  function careerFavorite(name) {
    var out = { track: null, name: '', flag: '', best: null, bestCount: 0, type: null, typeKind: null };
    try {
      if (!(D && D.race_results && D.races)) return out;
      var raceById = {};
      (D.races || []).forEach(function (r) { raceById[String(r.race_id)] = r; });
      var metaFn = null;
      try { metaFn = (window.BTG && BTG.circuitMeta) ? BTG.circuitMeta : null; } catch (e) {}
      var metaOf = function (slug) { try { return metaFn ? metaFn(slug) : null; } catch (e2) { return null; } };

      var racesList = [];
      var perCircuit = {};
      (D.race_results || []).forEach(function (rr) {
        if (str(rr.driver_name) !== name) return;
        var race = raceById[String(rr.race_id)];
        if (!race) return;
        var circuit = str(race.circuit) || str(race.name);
        if (!circuit) return;
        // DNS / DSQ: ignore completely, as if the driver never raced there.
        var stLow = (str(rr.status) + ' ' + str(rr.dnf_reason)).toLowerCase();
        if (stLow.indexOf('dsq') >= 0 || stLow.indexOf('dns') >= 0) return;
        var season = String(race.season_id == null ? '' : race.season_id);
        var pos = num(rr.finish_position);
        var dnf = !!(rr.dnf) || /dnf|retired|ret/i.test(str(rr.status)) || !(pos > 0);
        var quality = pos > 0 ? Math.max(0, Math.min(1, (21 - pos) / 20)) : 0;
        racesList.push({ season: season, circuit: circuit, quality: quality, pos: pos, dnf: dnf, status: str(rr.status) });
        var c = perCircuit[circuit] || (perCircuit[circuit] = { sum: 0, n: 0, best: 99, bestN: 0 });
        c.sum += pos > 0 ? pos : 21;
        c.n++;
        if (pos > 0) {
          if (pos < c.best) { c.best = pos; c.bestN = 1; }
          else if (pos === c.best) { c.bestN++; }
        }
      });
      if (!racesList.length) return out;

      var bestCircuit = null, bestScore = 1e9;
      Object.keys(perCircuit).forEach(function (slug) {
        var c = perCircuit[slug];
        var score = (c.sum / c.n) - (c.bestN * 2);
        if (score < bestScore) { bestScore = score; bestCircuit = slug; }
      });
      var favC = perCircuit[bestCircuit] || {};
      var meta = metaOf(bestCircuit) || {};

      // Single favorite track type via the shared picker (physical vs
      // characteristics; DNF half weight; DNS/DSQ ignored; season-normalised).
      var pk = null;
      try {
        if (window.BTG && BTG.pickFavType && racesList.length) {
          pk = BTG.pickFavType(racesList.map(function (r) {
            return { circuit: r.circuit, pos: r.pos, dnf: r.dnf, status: r.status, season: r.season };
          }));
        }
      } catch (e3) { pk = null; }

      out.track = bestCircuit;
      out.name = bestCircuit;
      out.flag = meta.flag ? str(meta.flag) : '';
      out.best = favC.best < 99 ? favC.best : null;
      out.bestCount = favC.bestN || 0;
      out.type = pk ? pk.type : null;
      out.typeKind = pk ? pk.kind : null;
      return out;
    } catch (e) { return out; }
  }

  // Contract history timeline for an entity (driver name or TP name), newest
  // first. Rows from the cached contract_history table.
  //
  // Ordering must not depend on the payload order: the DB returns rows in
  // insertion order, which is not the timeline. Current contracts come first,
  // then the latest end year, then the latest start year, then the row itself.
  //
  // Team identity is normalised here too: the league DB stores an
  // unassigned/free-agent team as team_id 999 with team_key "None". Pages
  // render `team_key` directly, so it is blanked rather than showing "None".
  function contractHistory(name) {
    return (D && D.contract_history || [])
      .filter(function (h) { return str(h.entity_name) === name; })
      .map(function (h) {
        var team = teamRef(h.team_key) || teamRef(h.team_id);
        return Object.assign({}, h, {
          team_key: isPlaceholderTeamKey(h.team_key) ? '' : str(h.team_key),
          // Display name for the row's team (falls back to the raw key).
          team_name: team ? teamName(team) : ''
        });
      })
      .sort(function (a, b) {
        if (!!a.is_current !== !!b.is_current) return a.is_current ? -1 : 1;
        var ta = a.till_year == null || a.till_year === '' ? -Infinity : num(a.till_year);
        var tb = b.till_year == null || b.till_year === '' ? -Infinity : num(b.till_year);
        if (ta !== tb) return tb - ta;
        var fa = a.from_year == null || a.from_year === '' ? -Infinity : num(a.from_year);
        var fb = b.from_year == null || b.from_year === '' ? -Infinity : num(b.from_year);
        if (fa !== fb) return fb - fa;
        var ca = str(a.created_at), cb = str(b.created_at);
        if (ca !== cb) return ca < cb ? 1 : -1;
        return num(b.history_id) - num(a.history_id);
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
    // Teams can arrive as a key ("haas") from contract_history and a display
    // name ("Haas") from the Teams table, so dedupe case-insensitively rather
    // than showing the same constructor twice in the career panel.
    function teamSeen(st, tk) {
      if (!tk) return true;
      var low = tk.toLowerCase();
      for (var i = 0; i < st.teamKeys.length; i++) if (str(st.teamKeys[i]).toLowerCase() === low) return true;
      return false;
    }
    function addTeam(st, tk) {
      if (!tk || teamSeen(st, tk)) return;
      st.teams[tk] = true;
      st.teamKeys.push(tk);
    }
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
      // NOTE: a race FINISH is not a championship POSITION. bestPos below is
      // driven by season_driver_standings so it means "best championship
      // result", which is what every caller (driver modal) labels it as.
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
      addTeam(acc(s), str(h.team_key));
    });
    // Live-race teams: a driver can have raced for a team that their current
    // contract_history row doesn't mention (history is only backfilled from the
    // latest contract), so fold in the teams actually seen in results.
    var teamKeyById = {};
    (D && D.teams || []).forEach(function (t) { teamKeyById[str(t.team_id)] = isPlaceholderTeam(t) ? '' : str(t.team_key); });
    (D && D.race_results || []).filter(function (r) { return str(r.driver_name) === name; }).forEach(function (r) {
      var series = seasonSeries[raceToSeason[String(r.race_id)]];
      if (!series) return;
      addTeam(acc(series), teamKeyById[str(r.team_id)]);
    });
    // The driver's CURRENT team only belongs to the series that team races in.
    // Adding it to every series made multi-series drivers look like they drove
    // for their F1 team in F2/XGT too (e.g. an F1 academy driver's F2 row
    // listing "Red Bull").
    if (myTeam) {
      var mySeries = seriesOfTeam(myTeam);
      Object.keys(out).forEach(function (k) {
        if (mySeries && k !== mySeries) return;
        addTeam(out[k], myTeam);
      });
    }
    return Object.keys(out).map(function (k) { return out[k]; })
      .sort(function (a, b) { return a.series < b.series ? -1 : a.series > b.series ? 1 : 0; });
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
    // Membership by current Driving seat (contract_history) — a driver can be
    // an F1 reserve while their racing seat is in another series, and their
    // single Drivers.team_id may point at either.
    if ((D && D.contract_history || []).some(function (h) {
      return str(h.entity_type) === 'driver' && h.is_current && str(h.role) === 'Driving'
        && (str(h.series) === series || seriesOfTeam(h.team_id) === series);
    })) return true;
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
            teamRef: dd.team_id,
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
            teamRef: d.team,
            nation: d.nation || dbNation(d.name || d.fullName || ''),
            number: d.number != null ? d.number : null
          };
        });
      }
      // Membership fallback: a driver with a CURRENT Driving seat in this
      // series belongs on the grid even when their DB Drivers.team_id points
      // at another series (e.g. an F1 Haas reserve whose racing seat is XGT).
      if (drivingKnown) {
        var nk = function (s) { return String(s || '').trim().toLowerCase(); };
        var inRows = {};
        rows.forEach(function (r) { inRows[nk(r.name)] = true; });
        (D && D.contract_history || []).forEach(function (h) {
          if (str(h.entity_type) !== 'driver' || !h.is_current) return;
          if (str(h.role) !== 'Driving') return;
          var hs = str(h.series) || seriesOfTeam(h.team_id);
          if (hs !== series) return;
          var nm = str(h.entity_name);
          var k = nk(nm);
          if (!nm || inRows[k]) return;
          inRows[k] = true;
          var dd = (D && D.drivers || []).filter(function (x) {
            return nk(x.full_name || x.driver_name || '') === k;
          })[0] || {};
          rows.push({
            name: nm,
            fullName: str(dd.full_name) || nm,
            team: teamName(h.team_id),
            teamRef: h.team_id,
            nation: str(dd.nation) || dbNation(nm),
            number: dd.driver_number != null ? dd.driver_number : null
          });
        });
      }
      if (!rows.length) return [];

      // Canonical team display name for a raw ref (roster key or DB name).
      function canon(teamRefIn) {
        if (teamRefIn == null) return '';
        var nm = rs && rs.teamName ? rs.teamName(teamRefIn) : teamRefIn;
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
          teamKey: teamRef(d.teamRef != null ? d.teamRef : team),
          teamOrder: team != null && team !== '' && teamSort[team] != null ? teamSort[team] : 99,
          car: null, className: null,
          carNumber: d.number != null ? d.number : null,
          series: series,
          nation: d.nation || '',
          ovr: 0, targetOvr: 0, teamColor: team ? (teamColorOf[team] || null) : null, skills: {},
          standings: null,
          seasonStats: null,
          history: [],
          careerRecord: { starts: 0, wins: 0, podiums: 0, points: 0, dnfs: 0, bestFinish: '—', avgFinish: '—', yrs: 0, yrsAtTeam: 0 }
        };
      }).sort(function (a, b) {
        var ta = a.teamOrder != null ? a.teamOrder : 99, tb = b.teamOrder != null ? b.teamOrder : 99;
        if (ta !== tb) return ta - tb;
        // Inside a team: car 1 first (each driver scoped to their own team).
        var carCmp = byCarOrder(year, { perTeam: true, series: series })(a, b);
        if (carCmp) return carCmp;
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
      // Sprint bonus points count towards the same total as the race's.
      var sprintPts = mySprints.reduce(function (a, s) { return a + num(s.points) + num(s.bonus_points); }, 0);
      var dnfs = mine.filter(function (r) { return num(r.dnf) === 1 || /dnf/i.test(str(r.status)); }).length;
      var finishes = mine.filter(function (r) { return num(r.finish_position) > 0; }).map(function (r) { return num(r.finish_position); });
      var bestFinish = finishes.length ? Math.min.apply(null, finishes) : 99;
      var finishSum = finishes.reduce(function (a, b) { return a + b; }, 0);
      var gridPos = mine.map(function (r) { return r.grid_position != null ? num(r.grid_position) : null; }).filter(function (v) { return v != null; });
      var avgGrid = gridPos.length ? gridPos.reduce(function (a, b) { return a + b; }, 0) / gridPos.length : null;
      var poles = mine.filter(function (r) { return num(r.grid_position) === 1; }).length;
      var sortedResults = mine.slice().sort(function (a, b) { return num(a.race_id) - num(b.race_id); });
      // Current team = the team from the driver's MOST RECENT race of the
      // season, not whatever row happened to come last in the cache payload
      // (results arrive grouped by race, but never guaranteed sorted).
      var lastResult = sortedResults.length ? sortedResults[sortedResults.length - 1] : null;
      var teamKey = lastResult ? teamRef(lastResult.team_id) : '';
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
        team: teamNameStr ? normTeam(teamNameStr) : '',
        teamKey: teamKey,
        teamOrder: teamNameStr ? rosterTeamOrder(teamSeries, teamNameStr) : 99,
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
        },
        favorite: careerFavorite(name)
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
    carSeat: carSeat,
    byCarOrder: byCarOrder,
    sortByCar: sortByCar,
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
