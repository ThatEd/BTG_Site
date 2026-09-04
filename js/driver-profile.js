/* ── Shared driver career profile renderer (extracted from drivers.html) ──
 * BTG.DriverProfile.render(container, driver, ctx, opts)
 *   driver  = buildDriverList element (standings/seasonStats/history/
 *             careerRecord/academy/nation/team/series/carNumber)
 *   ctx     = { allDrivers: [], series: 'F1', season: 2024 }
 *   opts    = { showRating: true }  (adds the whole-career rating card)
 */
(function () {
  if (!window.BTG) window.BTG = {};
  if (window.BTG.DriverProfile) return;

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function str(v) { return v == null ? '' : String(v); }

  function gradeOf(v) {
    if (v >= 98) return 'S+';
    if (v >= 95) return 'S';
    if (v >= 92) return 'S-';
    if (v >= 88) return 'A+';
    if (v >= 85) return 'A';
    if (v >= 82) return 'A-';
    if (v >= 78) return 'B+';
    if (v >= 75) return 'B';
    if (v >= 72) return 'B-';
    if (v >= 68) return 'C+';
    if (v >= 65) return 'C';
    if (v >= 62) return 'C-';
    if (v >= 58) return 'D+';
    if (v >= 55) return 'D';
    if (v >= 52) return 'D-';
    if (v >= 45) return 'E+';
    if (v >= 40) return 'E';
    return 'F';
  }
  function gradeCls(g) { return 'gr gr-' + g[0].toLowerCase(); }
  function gradeColor(g) {
    var c = String(g || '').charAt(0).toUpperCase();
    return { 'S': '#f59e0b', 'A': '#34d399', 'B': '#a1a1aa', 'C': '#71717a', 'D': '#ef4444', 'E': '#dc2626', 'F': '#991b1b' }[c] || '#71717a';
  }
  function numOr(v) { return (v == null || v === '' || isNaN(Number(v))) ? 0 : Number(v); }
  // 0–20 letter bands (Save Viewer distribution): an average (50) driver ≈ B.
  function ratingGrade(score) {
    var g = ['F-', 'F', 'F+', 'E-', 'E', 'E+', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S-', 'S', 'S+'];
    var idx = Math.max(0, Math.min(g.length - 1, Math.round(score == null ? 0 : score)));
    return g[idx];
  }
  function bandScore(v, kind) {
    v = numOr(v);
    // kind: 0 = vs Teammate (compressed), 2 = qualifying, 4 = reliability;
    // 1 (pace) / 3 (racecraft) share the wide performance band.
    if (kind === 0) {
      if (v >= 95) return 14; if (v >= 88) return 13; if (v >= 80) return 12;
      if (v >= 72) return 11; if (v >= 65) return 10; if (v >= 58) return 9;
      if (v >= 50) return 8; if (v >= 42) return 7; if (v >= 35) return 6;
      if (v >= 25) return 5; if (v >= 15) return 4; return 3;
    }
    if (kind === 2) {
      if (v >= 95) return 20; if (v >= 90) return 19; if (v >= 82) return 18;
      if (v >= 75) return 17; if (v >= 68) return 16; if (v >= 62) return 15;
      if (v >= 55) return 14; if (v >= 48) return 13; if (v >= 40) return 12;
      if (v >= 32) return 11; if (v >= 25) return 9; if (v >= 15) return 7;
      if (v >= 8) return 4; return 3;
    }
    if (kind === 4) {
      if (v >= 98) return 20; if (v >= 95) return 19; if (v >= 90) return 18;
      if (v >= 85) return 17; if (v >= 78) return 16; if (v >= 70) return 15;
      if (v >= 62) return 14; if (v >= 55) return 13; if (v >= 48) return 12;
      if (v >= 40) return 11; if (v >= 32) return 9; if (v >= 25) return 8;
      if (v >= 15) return 6; if (v >= 8) return 4; return 3;
    }
    if (v >= 95) return 20; if (v >= 88) return 19; if (v >= 80) return 18;
    if (v >= 72) return 17; if (v >= 65) return 16; if (v >= 58) return 15;
    if (v >= 50) return 14; if (v >= 42) return 13; if (v >= 35) return 12;
    if (v >= 28) return 11; if (v >= 20) return 9; if (v >= 12) return 7;
    if (v >= 5) return 4; return 2;
  }
  function gbar(label, val, color, grade) {
    var g = grade || gradeOf(val);
    return '<div class="dp-grade__row"><span class="dp-grade__label">' + label + '</span>'
      + '<div class="dp-grade__bar"><div class="dp-grade__fill" style="width:' + Math.max(0, Math.min(100, val)) + '%;background:' + color + '"></div></div>'
      + '<span class="dp-grade__val ' + gradeCls(g) + '" style="color:' + gradeColor(g) + '">' + g + '</span></div>';
  }
  function statCell(v, l) { return '<div class="dp-stat"><div class="dp-stat__val">' + v + '</div><div class="dp-stat__lbl">' + l + '</div></div>'; }

  function computeOverallScore(d, ss) {
    var score = 0;
    var pos = d.standings ? d.standings.pos : 99;
    if (pos !== '—' && !isNaN(pos)) score += Math.max(0, 100 - ((pos - 1) * 5));
    score += (ss.wins || 0) * 10;
    score += (ss.podiums || 0) * 3;
    score -= (ss.dnfs || 0) * 6;
    if (ss.avgFinish && ss.avgFinish !== '—') {
      var af = parseFloat(ss.avgFinish);
      if (!isNaN(af)) score += Math.max(0, 100 - (af * 3));
    }
    return Math.max(0, Math.min(100, score));
  }

  function computeFavoriteTrack(d) {
    var results = (d.seasonStats && d.seasonStats.results) || [];
    if (!results.length) return null;
    var byTrack = {};
    results.forEach(function (r) {
      if (r.pos == null || r.pos <= 0) return;
      if (!byTrack[r.track]) byTrack[r.track] = { sum: 0, count: 0, best: 99, bestCount: 0 };
      var t = byTrack[r.track];
      t.sum += r.pos; t.count++;
      if (r.pos < t.best) t.best = r.pos;
    });
    results.forEach(function (r) {
      var t = byTrack[r.track];
      if (r.pos === t.best) t.bestCount++;
    });
    var bestTrack = null, bestScore = 999;
    Object.keys(byTrack).forEach(function (track) {
      var t = byTrack[track];
      var score = (t.sum / t.count) - (t.bestCount * 2);
      if (score < bestScore) { bestScore = score; bestTrack = t; bestTrack.track = track; }
    });
    return bestTrack;
  }

  function abbreviate(track) {
    if (!track) return '';
    var map = {
      'Bahrain': 'BHR', 'Melbourne': 'MEL', 'Shanghai': 'CHN', 'Jeddah': 'JED', 'Miami Gardens': 'MIA',
      'Monaco': 'MON', 'Montreal': 'CAN', 'Suzuka': 'JPN', 'Silverstone': 'GBR', 'Monza': 'ITA',
      'Spielberg': 'AUT', 'Sakhir': 'BHR', 'Montmeló': 'ESP', 'Mogyoród': 'HUN', 'Zandvoort': 'NED',
      'Stavelot': 'BEL', 'Austin': 'USA', 'Mexico City': 'MEX', 'São Paulo': 'BRA', 'Las Vegas': 'LVG',
      'Yas Island': 'ABU', 'Imola': 'EMI', 'Baku': 'AZE', 'Lusail': 'QAT', 'Downtown Core': 'SIN'
    };
    return map[track] || track.slice(0, 3).toUpperCase();
  }

  function buildSparkline(d) {
    var results = (d.seasonStats && d.seasonStats.results) || [];
    var color = (d.teamColor || '185,29,46');
    return results.map(function (r, i) {
      var sp = r.grid || 20, fp = r.pos || 20;
      var sy = ((sp - 1) / 19) * 80, fy = ((fp - 1) / 19) * 80;
      var label = abbreviate(r.track) || 'R' + (i + 1);
      return '<div class="dp-sparkline__race" title="' + BTG.esc(label) + ': P' + sp + '→P' + fp + '">'
        + '<div class="dp-sparkline__track">'
        + (!r.dnf ? '<div class="dp-sparkline__line" style="top:' + Math.min(sy, fy) + 'px;height:' + (Math.abs(fy - sy) + 3) + 'px;background:rgb(' + color + ')"></div>' : '')
        + '<div class="dp-sparkline__dot" style="top:' + fy + 'px;background:' + (r.dnf ? '#ef4444' : '#34d399') + '"></div>'
        + '<div class="dp-sparkline__dot" style="top:' + sy + 'px;background:#f472b6"></div>'
        + '</div>'
        + '<span class="dp-sparkline__label">' + BTG.esc(label) + '</span>'
        + '</div>';
    }).join('') || '<div class="dp-empty">No race data.</div>';
  }

  function perfVal(ss, raw) {
    if (raw == null || isNaN(raw)) return 0;
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function computeSeasonPerformance(d, ss, allDrivers) {
    ss = ss || {};
    var list = allDrivers || [];
    var team = d.team, car = d.car;
    var peers = [];
    var isSameCar = false;
    if (team) peers = list.filter(function (x) { return x.id !== d.id && x.team === team && x.series === d.series; });
    if (!peers.length && car) {
      peers = list.filter(function (x) { return x.id !== d.id && x.car === car && x.series === d.series; });
      isSameCar = true;
    }

    // The "car" placement — team car performance derived from RACE DATA (no
    // real car data on this site): median quali lap, median race lap and
    // average grid/finish across the team's drivers.
    var teamDrivers = list.filter(function (x) { return x.series === d.series && x.team === d.team; });
    if (!teamDrivers.length) teamDrivers = [d];
    var laps = [], qualis = [], finishes = [], grids = [];
    teamDrivers.forEach(function (t) {
      var s = t.seasonStats || {};
      if (s.paceMedianMs > 0) laps.push(Number(s.paceMedianMs));
      if (s.qualiMedianMs > 0) qualis.push(Number(s.qualiMedianMs));
      var af = parseFloat(s.avgFinish), ag = parseFloat(s.avgGrid);
      if (!isNaN(af) && af > 0) finishes.push(af);
      if (!isNaN(ag) && ag > 0) grids.push(ag);
    });
    function med(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
    function mean(a) { if (!a.length) return null; return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
    var carM = { lapMs: med(laps), qualiMs: med(qualis), expFinish: mean(finishes), expGrid: mean(grids) };
    var results = ss.results || [];

    function clamp100(v) { return Math.max(0, Math.min(100, Math.round(v))); }
    function posToScore(avgPos) { var p = parseFloat(avgPos); if (isNaN(p)) return null; return clamp100(100 - (p - 1) * (100 / 19)); }
    function paceScoreFromRatio(carMs, myMs) {
      if (carMs == null || myMs == null || carMs <= 0 || myMs <= 0) return null;
      return clamp100(50 + (carMs - myMs) / carMs * 150);
    }

    // ── Whole-grid reference: every component is relative to the whole grid
    // of the driver's series (the per-team car placement above only states
    // where the car itself ranks among that grid). ──
    var gridVals = { pace: [], quali: [], grid: [], finish: [], rate: [] };
    list.forEach(function (gx) {
      var gs2 = gx.seasonStats || {};
      var gLap = Number(gs2.paceMedianMs) || null;
      var gQu = Number(gs2.qualiMedianMs) || null;
      var gAf = parseFloat(gs2.avgFinish), gAg = parseFloat(gs2.avgGrid);
      var gRaces = Number(gs2.races) || 0, gDnfs = Number(gs2.dnfs) || 0;
      if (gLap > 0) gridVals.pace.push(gLap);
      if (gQu > 0) gridVals.quali.push(gQu);
      if (!isNaN(gAf) && gAf > 0) gridVals.finish.push(gAf);
      if (!isNaN(gAg) && gAg > 0) gridVals.grid.push(gAg);
      if (gRaces > 0) gridVals.rate.push((gRaces - gDnfs) / gRaces);
    });
    function fieldPct(val, arr, lowerIsBetter) {
      // Percentile of the field: 100 = best in the series grid.
      if (val == null || isNaN(val)) return 50;
      var beat = 0, tie = 0, total = 0;
      for (var vi = 0; vi < arr.length; vi++) {
        var x = arr[vi];
        if (x == null || isNaN(x)) continue;
        total++;
        if (x === val) tie++;
        else if (lowerIsBetter ? x > val : x < val) beat++;
      }
      return total ? clamp100(((beat + tie * 0.5) / total) * 100) : 50;
    }

    // Pace: 30% quali lap + 70% average lap — lap pace percentile of the grid.
    var qPct = fieldPct(ss.qualiMedianMs != null ? Number(ss.qualiMedianMs) : null, gridVals.quali, true);
    var lPct = fieldPct(ss.paceMedianMs != null ? Number(ss.paceMedianMs) : null, gridVals.pace, true);
    var gPct = fieldPct(parseFloat(ss.avgGrid), gridVals.grid, true);
    if (!gridVals.quali.length) qPct = gPct;
    if (!gridVals.pace.length) lPct = gPct;
    var pace = clamp100(qPct * 0.3 + lPct * 0.7);

    // Qualifying: where the driver starts vs the whole grid.
    var qualifying = gPct;

    // Racecraft: overtake & defend success + volume + finish quality, each
    // relative to the series league average (real overtake data).
    var la = { ovtPct: 0.01, defPct: 0.5, ovtPerR: 0.05, defPerR: 1, fqPerR: 8 };
    var laO = 0, laFO = 0, laD = 0, laFD = 0, laFQ = 0, laCnt = 0;
    list.forEach(function (x) {
      ((x.seasonStats && x.seasonStats.results) || []).forEach(function (xr) {
        laO += numOr(xr.overtakes) + numOr(xr.successful_overtakes);
        laFO += numOr(xr.failedOvertakes) + numOr(xr.failed_overtakes);
        laD += numOr(xr.defends) + numOr(xr.successful_defends);
        laFD += numOr(xr.failedDefends) + numOr(xr.failed_defends);
        var pp = Number(xr.pos) || 0;
        if (pp > 0) laFQ += Math.max(0, 21 - pp);
        laCnt++;
      });
    });
    if (laCnt > 0) {
      la.ovtPct = (laO + laFO) > 0 ? laO / (laO + laFO) : 0.01;
      la.defPct = (laD + laFD) > 0 ? laD / (laD + laFD) : 0.5;
      la.ovtPerR = laO / laCnt;
      la.defPerR = laD / laCnt;
      la.fqPerR = laFQ / laCnt;
    }
    var succO = 0, failO = 0, succD = 0, failD = 0, finishQ = 0, raceCnt = results.length || 1;
    results.forEach(function (r) {
      succO += numOr(r.overtakes) + numOr(r.successful_overtakes);
      failO += numOr(r.failedOvertakes) + numOr(r.failed_overtakes);
      succD += numOr(r.defends) + numOr(r.successful_defends);
      failD += numOr(r.failedDefends) + numOr(r.failed_defends);
      var pp = Number(r.pos) || 20;
      finishQ += Math.max(0, 21 - pp);
    });
    var ovtRate = (succO + failO) > 0 ? succO / (succO + failO) : 0;
    var defRate = (succD + failD) > 0 ? succD / (succD + failD) : 0.5;
    var ovtScore = la.ovtPct > 0 ? Math.min(25, (ovtRate / la.ovtPct) * 12.5) : 12.5;
    var defScore = la.defPct > 0 ? Math.min(25, (defRate / la.defPct) * 12.5) : 12.5;
    var ovtVolScore = la.ovtPerR > 0 ? Math.min(15, ((succO / raceCnt) / la.ovtPerR) * 7.5) : 7.5;
    var defVolScore = la.defPerR > 0 ? Math.min(10, ((succD / raceCnt) / la.defPerR) * 5) : 5;
    var fqScore = la.fqPerR > 0 ? Math.min(40, ((finishQ / raceCnt) / la.fqPerR) * 20) : 20;
    var racecraft = clamp100(ovtScore + defScore + ovtVolScore + defVolScore + fqScore);

    // Reliability: finish vs car's expected finish + podium bonus.
    // Reliability: whole-grid relative — finish rate (no DNF) blended with
    // where the driver finishes vs the whole grid.
    var reliability = (ss.smReliability != null) ? clamp100(Number(ss.smReliability)) : null;
    if (reliability == null) {
      var racesN = Number(ss.races) || 0;
      if (racesN > 0) {
        var myRate = (racesN - (Number(ss.dnfs) || 0)) / racesN;
        reliability = clamp100(fieldPct(myRate, gridVals.rate, false) * 0.6 + fieldPct(parseFloat(ss.avgFinish), gridVals.finish, true) * 0.4);
      } else {
        reliability = 50;
      }
    }

    // vs Teammate: quali 20% + average lap 20% + race results 60%.
    var raceW = 0, raceL = 0, qualiW = 0, qualiL = 0, lapW = 0, lapL = 0;
    var peerByRace = {};
    peers.forEach(function (p) {
      ((p.seasonStats && p.seasonStats.results) || []).forEach(function (r) {
        var key = r.race != null ? r.race : r.trackId;
        if (key == null) return;
        if (!peerByRace[key]) peerByRace[key] = [];
        peerByRace[key].push(r);
      });
    });
    results.forEach(function (r) {
      var key = r.race != null ? r.race : r.trackId;
      var myPos = Number(r.pos) || 99;
      var myGrid = r.grid != null ? Number(r.grid) : 0;
      var myLap = r.fastest != null ? Number(r.fastest) : (r.fl != null ? Number(r.fl) : null);
      (peerByRace[key] || []).forEach(function (pr) {
        var tmPos = Number(pr.pos) || 99;
        if (myPos < tmPos) raceW++; else raceL++;
        var tmGrid = pr.grid != null ? Number(pr.grid) : 0;
        if (myGrid > 0 && tmGrid > 0) { if (myGrid < tmGrid) qualiW++; else qualiL++; }
        var tmLap = pr.fastest != null ? Number(pr.fastest) : (pr.fl != null ? Number(pr.fl) : null);
        if (myLap > 0 && tmLap > 0) { if (myLap < tmLap) lapW++; else lapL++; }
      });
    });
    var racePct = raceW + raceL > 0 ? (raceW / (raceW + raceL)) * 100 : null;
    var qualiPct = qualiW + qualiL > 0 ? (qualiW / (qualiW + qualiL)) * 100 : null;
    var lapPct = lapW + lapL > 0 ? (lapW / (lapW + lapL)) * 100 : null;
    var parts = [];
    if (qualiPct != null) parts.push({ w: 0.2, v: qualiPct });
    if (lapPct != null) parts.push({ w: 0.2, v: lapPct });
    if (racePct != null) parts.push({ w: 0.6, v: racePct });
    var teammate = 50;
    if (parts.length) {
      var wsum = 0, vsum = 0;
      parts.forEach(function (x) { wsum += x.w; vsum += x.w * x.v; });
      teammate = clamp100(vsum / wsum);
    }

    var paceScore = bandScore(pace, 1), qualiScore = bandScore(qualifying, 2);
    var raceScore = bandScore(racecraft, 3), teamScore = bandScore(teammate, 0);
    var reliScore = bandScore(reliability, 4);
    var overallScore = Math.round((paceScore + qualiScore + raceScore + teamScore + reliScore) / 5);
    return {
      label: isSameCar ? 'vs Same Car' : 'vs Teammate',
      pace: pace, qualifying: qualifying, racecraft: racecraft,
      teammate: teammate, reliability: reliability,
      paceScore: paceScore, qualiScore: qualiScore, raceScore: raceScore,
      teamScore: teamScore, reliScore: reliScore, overallScore: overallScore
    };
  }

  function seasonVerdict(d, ss) {
    var pos = d.standings ? d.standings.pos : 99;
    if (pos == null || pos === '—' || isNaN(Number(pos)) || Number(pos) >= 99) return '—';
    if (pos <= 3) return 'Championship Contender';
    if (pos <= 6) return 'Strong Season';
    if (pos <= 10) return 'Midfield Battle';
    if (pos <= 15) return 'Career Crossroads';
    return 'Struggling';
  }

  /** Series tier weight — a lower series is never worth the same as a higher
   *  one, so an identical season in F2/XGT rates below the same season in F1. */
  function seriesTier(series) {
    var s = str(series).toUpperCase();
    if (s === 'F1') return 1.0;
    if (s === 'F2') return 0.85;
    if (s === 'XGT') return 0.80;
    return 0.75;
  }

  /** Per-season 0–20 band from a season's finishing position — the same letter
   *  curve Season Performance uses, so a past season reads the same way. S/S+
   *  is reserved for dominant championship seasons, not routine finishes. */
  function pastSeasonScore20(pos, wins, podiums, dnfs, races) {
    races = num(races); wins = num(wins); podiums = num(podiums); dnfs = num(dnfs);
    if (pos <= 1) {
      // Champion: S+ only for a truly dominant year.
      if (races >= 10 && (wins / races) >= 0.5) return 20;
      if (races >= 10 && (wins / races) >= 0.4) return 19;
      if (wins >= 5 || (races > 0 && podiums >= Math.max(6, Math.round(races * 0.6)))) return 18;
      return 17;
    }
    if (pos <= 2) return 16;
    if (pos <= 3) return 15;
    if (pos <= 5) return 14;
    if (pos <= 7) return 13;
    if (pos <= 9) return 12;
    if (pos <= 11) return 11;
    if (pos <= 14) return 9;
    if (pos <= 17) return 7;
    return 5;
  }

  /** Whole-career rating — the series-tier weighted mean of every racing
   *  season's band (0–20). The LIVE season uses the exact Season Performance
   *  score, so the career card always agrees with the season card; older
   *  seasons are estimated from their championship position. Returns 0–20. */
  function careerRating(d, liveScore20) {
    try {
      if (!d) return null;
      var entries = [];
      // Racing seasons from career history (current + past). Reserve stints
      // carry pos '—' and no race stats, so they're skipped.
      (d.history || []).forEach(function (h) {
        var p = h.pos;
        if (p === '—' || p == null || p === '' || isNaN(Number(p))) return;
        entries.push({
          season: Number(h.season) || 0,
          series: str(h.series),
          pos: Number(p),
          wins: num(h.wins), podiums: num(h.podiums), dnfs: num(h.dnfs), races: num(h.races)
        });
      });
      // Defensive fallback: if the current series has no racing history entry
      // (standings-only edge case), add the live season.
      if (!entries.some(function (e) { return e.series === str(d.series); })) {
        if (d.standings && d.standings.pos != null && d.standings.pos !== '—' && !isNaN(Number(d.standings.pos))) {
          entries.push({
            season: 0,
            series: str(d.series),
            pos: Number(d.standings.pos),
            wins: num((d.seasonStats || {}).wins),
            podiums: num((d.seasonStats || {}).podiums),
            dnfs: num((d.seasonStats || {}).dnfs),
            races: num((d.seasonStats || {}).races)
          });
        }
      }
      if (!entries.length) return null;
      // Map every season to a 0–20 band.
      var scored = entries.map(function (e) {
        return { series: e.series, season: e.season, score20: pastSeasonScore20(e.pos, e.wins, e.podiums, e.dnfs, e.races) };
      });
      // The live season (the driver's current series, latest year) uses the
      // real Season Performance score so the two cards can never disagree.
      if (liveScore20 != null) {
        var liveSeries = str(d.series);
        var liveIdx = -1, liveSeason = -1;
        scored.forEach(function (s, i) {
          if (s.series === liveSeries && s.season >= liveSeason) { liveIdx = i; liveSeason = s.season; }
        });
        if (liveIdx === -1) scored.push({ series: liveSeries, season: liveSeason, score20: liveScore20 });
        else scored[liveIdx].score20 = liveScore20;
      }
      var sum = 0, wsum = 0;
      scored.forEach(function (s) { var w = seriesTier(s.series); sum += s.score20 * w; wsum += w; });
      if (!wsum) return null;
      return Math.max(0, Math.min(20, Math.round(sum / wsum)));
    } catch (e) { return null; }
  }

  function dbTeamRgb(name, secondary) {
    var v = BTG.DBCache && BTG.DBCache.teamColorRgb ? BTG.DBCache.teamColorRgb(name, secondary) : '';
    if (v) return v;
    var t = BTG.teamByName(name);
    return t ? (secondary ? (t.colorSecondary || '') : (t.color || '')) : '';
  }

  BTG.DriverProfile = {
    careerRating: careerRating,
    render: function (container, d, ctx, opts) {
      opts = opts || {};
      var allDrivers = (ctx && ctx.allDrivers) || [];
      var series = (ctx && ctx.series) || d.series || '';
      var season = (ctx && ctx.season) != null ? ctx.season : null;
      var acadName = d.academy && BTG.Roster && BTG.Roster.teamName
        ? (BTG.Roster.teamName(d.academy) || d.academy) : d.academy;
      var color = dbTeamRgb(d.team) || '185,29,46';
      var rgbSpaced = color.replace(/\s*,\s*/g, ' ');
      container.style.setProperty('--team-rgb', rgbSpaced);

      var ss = d.seasonStats || {};
      var perf = computeSeasonPerformance(d, ss, allDrivers);
      var overallGrade = ratingGrade(perf.overallScore);
      var nameParts = (d.fullName || d.name).split(' ');
      var rating = opts.showRating !== false ? careerRating(d, perf.overallScore) : null;

      var html = '<div class="dp-main">';
      html += '<div class="dp-left">';

      var heroInner = '<div class="dp-card dp-hero">'
        + '<div class="dp-hero__number">' + BTG.esc(d.standings ? d.standings.pos : '') + '</div>'
        + '<div class="dp-hero__photo" style="border-color:rgb(' + color + ');box-shadow:0 0 24px rgb(' + color + ' / 0.2)">'
        + BTG.driverPhotoImg(d.fullName || d.name, 76)
        + '</div>'
        + '<div class="dp-hero__info">'
        + '<div class="dp-hero__name"><span class="dp-hero__first">' + BTG.esc(nameParts.slice(0, -1).join(' ') || '') + '</span><span class="dp-hero__last">' + BTG.esc(nameParts.slice(-1)[0] || '') + '</span></div>'
        + '<div class="dp-hero__meta">' + BTG.esc(d.nation || '') + (d.carNumber ? '<span class="dp-hero__sep">·</span>#' + BTG.esc(d.carNumber) : '') + '</div>'
        + '<div class="dp-hero__team" style="color:rgb(' + color + ')">'
        + BTG.entryLogoImg(d.team, d.car, d.series || series, 18)
        + '<span>' + BTG.esc(BTG.entryLabel(d.team, d.car)) + '</span>'
        + '</div>'
        + (d.academy ? '<div class="dp-hero__academy"' + (d.academyColor ? ' style="color:' + BTG.esc(d.academyColor) + '"' : '') + '>'
          + BTG.teamLogoImg(d.academy, d.series || series, 12)
          + '<span>' + BTG.esc(acadName) + (d.academyRole === 'Reserve' ? ' Reserve' : ' Academy') + '</span></div>' : '')
        + '</div></div>';
      if (BTG.wrapCard) html += BTG.wrapCard(heroInner, { teamColor: color, backgroundColor: '#161618', borderRadius: 8, glowRadius: 12, glowIntensity: 0.45, isSelected: true });
      else html += heroInner;

      // Career rating (whole-career) — average of the season bands; the live
      // season is the Season Performance score, so it agrees with the season.
      if (rating != null) {
        html += '<div class="dp-card"><div class="dp-card__title">Career Rating</div>'
          + '<div class="dp-rating"><div class="dp-rating__num">' + Math.round(rating * 5) + '</div>'
          + '<div><span class="dp-rating__grade" style="color:' + gradeColor(ratingGrade(rating)) + '">' + ratingGrade(rating) + '</span>'
          + '<div class="dp-rating__meta">whole-career · series-weighted</div></div></div></div>';
      }

      var tenure = '—';
      var firstSeasonWithTeam = (d.history || []).find(function (h) { return h.series === d.series && h.team && h.team === d.team; });
      if (firstSeasonWithTeam) tenure = 'since ' + BTG.esc(firstSeasonWithTeam.season);
      html += '<div class="dp-card"><div class="dp-card__title">Contract</div>'
        + '<div class="dp-contract">'
        + '<div class="dp-contract__row"><span class="dp-contract__label">Team Tenure</span><span class="dp-contract__val">' + tenure + '</span></div>'
        + '<div class="dp-contract__row"><span class="dp-contract__label">Contract Until</span><span class="dp-contract__val">—</span></div>'
        + '<div class="dp-contract__row"><span class="dp-contract__label">Status</span><span class="dp-contract__val">—</span></div>'
        + '</div></div>';

      html += '<div class="dp-card"><div class="dp-card__title">Season Position</div>'
        + '<div class="dp-pos"><span class="dp-pos__rank">' + (d.standings ? 'P' + BTG.esc(d.standings.pos) : '—') + '</span><span class="dp-pos__pts">' + (d.standings ? BTG.esc(d.standings.pts) + ' pts' : '—') + '</span></div></div>';

      if (season != null) {
        var ls = (d.history || []).find(function (h) { return h.series === d.series && h.season === season - 1; });
        html += '<div class="dp-card"><div class="dp-card__title">Last Season · ' + (season - 1) + '</div>'
          + '<div class="dp-prev">'
          + '<div class="dp-prev__row"><span>Position</span><span>' + (ls && ls.pos && ls.pos !== '—' ? 'P' + ls.pos : '—') + '</span></div>'
          + '<div class="dp-prev__row"><span>Points</span><span>' + (ls && ls.points != null ? ls.points : '—') + '</span></div>'
          + '<div class="dp-prev__row"><span>Wins</span><span>' + (ls && ls.wins ? ls.wins : '—') + '</span></div>'
          + '<div class="dp-prev__row"><span>Podiums</span><span>' + (ls && ls.podiums ? ls.podiums : '—') + '</span></div>'
          + '<div class="dp-prev__row"><span>DNFs</span><span>' + (ls && ls.dnfs ? ls.dnfs : '—') + '</span></div>'
          + '<div class="dp-prev__row"><span>Avg Finish</span><span>' + (ls && ls.avgFinish && ls.avgFinish !== '—' ? 'P' + ls.avgFinish : '—') + '</span></div>'
          + '<div class="dp-prev__row"><span>Races</span><span>' + (ls && ls.races ? ls.races : '—') + '</span></div>'
          + '</div></div>';
      }

      var fav = computeFavoriteTrack(d);
      html += '<div class="dp-card"><div class="dp-card__title">Favorite Track</div>'
        + '<div class="dp-fav-track">'
        + '<div><div class="dp-fav-track__name">' + (fav ? BTG.esc(fav.track) : '—') + '</div><div class="dp-fav-track__note">' + (fav ? (fav.bestCount > 0 ? 'Best: P' + BTG.esc(fav.best) + ' · ' + BTG.esc(fav.bestCount) + 'x' : '—') : '—') + '</div></div></div></div>';

      html += '</div>'; // left

      html += '<div class="dp-center">';
      var perfBars = [
        { label: 'Pace', val: perf.pace, color: '#f87171', score: perf.paceScore },
        { label: 'Qualifying', val: perf.qualifying, color: '#a78bfa', score: perf.qualiScore },
        { label: 'Racecraft', val: perf.racecraft, color: '#34d399', score: perf.raceScore },
        { label: perf.label, val: perf.teammate, color: '#f59e0b', score: perf.teamScore },
        { label: 'Reliability', val: perf.reliability, color: '#ef4444', score: perf.reliScore }
      ];
      html += '<div class="dp-card"><div class="dp-card__title">Season Performance</div>'
        + '<div class="dp-grade__overall ' + gradeCls(overallGrade) + '" style="color:' + gradeColor(overallGrade) + '">' + overallGrade + '</div>'
        + '<div class="dp-grade__bars">'
        + perfBars.map(function (p) { return gbar(p.label, p.val, p.color, ratingGrade(p.score)); }).join('')
        + '</div></div>';

      html += '<div class="dp-card"><div class="dp-card__title">Season Race Positions</div>'
        + '<div class="dp-sparkline">' + buildSparkline(d) + '</div></div>';

      html += '<div class="dp-card"><div class="dp-card__title">Season Stats</div>'
        + '<div class="dp-stats-grid">'
        + statCell(ss.races || '—', 'Races') + statCell(ss.avgFinish || '—', 'Avg Finish') + statCell(ss.wins || '—', 'Wins') + statCell(ss.avgGrid || '—', 'Avg Grid')
        + statCell(ss.podiums || '—', 'Podiums') + statCell(ss.poles || '—', 'Poles') + statCell(ss.dnfs || '—', 'DNFs') + statCell('—', 'Pole→Win')
        + '</div>'
        + '<div style="margin-top:10px"><div class="dp-card__subtitle">Sprint Races</div>'
        + '<div class="dp-stats-grid" style="grid-template-columns:repeat(4,1fr)">'
        + statCell(ss.sprints || '—', 'Sprints') + statCell(ss.sprintWins || '—', 'Wins') + statCell(ss.sprintPodiums || '—', 'Podiums') + statCell(ss.sprintPts || '—', 'Points')
        + '</div></div></div>';

      html += '</div>'; // center

      html += '<div class="dp-right">';
      var h2hScore = (perf.teammate != null) ? Math.round(perf.teammate) + '%' : '—';
      var teamPts = 0;
      for (var ti = 0; ti < allDrivers.length; ti++) {
        var td = allDrivers[ti];
        if (td.series === d.series && td.team === d.team && td.standings) teamPts += Number(td.standings.pts) || 0;
      }
      var myPts = d.standings ? (Number(d.standings.pts) || 0) : 0;
      var ptsShare = teamPts > 0 ? Math.round(myPts / teamPts * 100) + '%' : '—';
      html += '<div class="dp-card"><div class="dp-card__title">Verdict</div>'
        + '<div class="dp-verdict__label">' + (d.standings ? seasonVerdict(d, ss) : '—') + '</div>'
        + '<div class="dp-verdict__stats">'
        + '<div class="dp-verdict__stat"><span class="dp-verdict__val">' + h2hScore + '</span><span class="dp-verdict__lbl">H2H</span></div>'
        + '<div class="dp-verdict__stat"><span class="dp-verdict__val">' + ptsShare + '</span><span class="dp-verdict__lbl">Pts Share</span></div>'
        + '</div>'
        + '<div class="dp-verdict__bullets">—</div></div>';

      var cr = d.careerRecord || {};
      html += '<div class="dp-card"><div class="dp-card__title">Career Race Record</div>'
        + '<div class="dp-career-grid">'
        + statCell(cr.starts || '—', 'Starts') + statCell(cr.wins || '—', 'Wins') + statCell(cr.podiums || '—', 'Podiums') + statCell(cr.points || '—', 'Points')
        + statCell(cr.dnfs || '—', 'DNFs') + statCell(cr.bestFinish || '—', 'Best Finish') + statCell(cr.avgFinish || '—', 'Avg Finish') + statCell(cr.yrs || '—', 'Yrs in ' + BTG.esc(d.series || 'Series'))
        + statCell(cr.yrsAtTeam || '—', 'Yrs at Team')
        + '</div></div>';

      if (d.history && d.history.length) {
        html += '<div class="dp-card"><div class="dp-card__title">Past Seasons</div>'
          + '<div class="dp-past-head"><span>Season</span><span>Series</span><span>Team</span><span class="px">Pos</span><span class="px">Wins</span><span class="px">Pods</span><span class="px">Pts</span><span class="ps">Rating</span></div>'
          + d.history.map(function (h) {
            var hcolor = dbTeamRgb(h.team) || '100,100,100';
            var label = h.team && h.team !== 'Privateer' ? h.team : (h.series || '');
            var logo = h.team && h.team !== 'Privateer' ? BTG.teamLogoImg(h.team, h.series, 14) : '';
            return '<div class="dp-past-row"><span class="yr">' + BTG.esc(h.season) + '</span>'
              + '<span class="st">' + BTG.esc(h.series || '—') + '</span>'
              + '<span class="tm">' + logo + BTG.esc(label) + (h.role === 'Reserve' ? '<span class="sx">Reserve</span>' : '') + '</span>'
              + '<span class="px">' + (h.pos && h.pos !== '—' ? 'P' + BTG.esc(h.pos) : '—') + '</span>'
              + '<span class="px">' + (h.wins ? BTG.esc(h.wins) : '—') + '</span>'
              + '<span class="px">' + (h.podiums ? BTG.esc(h.podiums) : '—') + '</span>'
              + '<span class="px">' + (h.points != null ? BTG.esc(h.points) : '—') + '</span>'
              + '<span class="ps"' + (h.grade ? ' style="color:' + BTG.esc(gradeColor(h.grade)) + '"' : '') + '>' + BTG.esc(h.grade || '—') + '</span></div>';
          }).join('') + '</div>';
      }

      html += '<div class="dp-card"><div class="dp-card__title">Grid Penalties</div><div style="color:var(--text-disabled);font-size:12px;padding:8px">No grid penalties</div></div>';
      html += '</div>'; // right
      html += '</div>'; // dp-main

      container.innerHTML = html;
      if (BTG.initBorderGlow) BTG.initBorderGlow(container);
      if (BTG.initCardGlow) BTG.initCardGlow(container);
    }
  };
})();
