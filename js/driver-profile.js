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

  function gradeOf(v) { if (v >= 90) return 'A'; if (v >= 80) return 'B+'; if (v >= 70) return 'B'; if (v >= 60) return 'C+'; if (v >= 50) return 'C'; if (v >= 40) return 'D+'; if (v >= 30) return 'D'; return 'F'; }
  function gradeCls(g) { return 'gr gr-' + g[0].toLowerCase(); }
  function gbar(label, val, color) {
    var g = gradeOf(val);
    return '<div class="dp-grade__row"><span class="dp-grade__label">' + label + '</span>'
      + '<div class="dp-grade__bar"><div class="dp-grade__fill" style="width:' + Math.max(0, Math.min(100, val)) + '%;background:' + color + '"></div></div>'
      + '<span class="dp-grade__val ' + gradeCls(g) + '">' + g + '</span></div>';
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

  function computeH2H(d, ss, allDrivers) {
    var list = allDrivers || [];
    var car = d.car, team = d.team;
    var peers;
    var isSameCar = false;
    if (team) {
      peers = list.filter(function (x) { return x.id !== d.id && x.team === team && x.series === d.series; });
    }
    if (!peers || !peers.length) {
      peers = list.filter(function (x) { return x.id !== d.id && x.car === car && x.series === d.series; });
      isSameCar = true;
    }
    var reliability = (ss && ss.smReliability != null)
      ? ss.smReliability
      : perfVal(ss, 100 - (ss.dnfs || 0) * 15);
    var weight = isSameCar ? 2 : 1;
    var myPace = ss && ss.paceMedianMs;
    var peerPace = peers.map(function (p) { return p.seasonStats && p.seasonStats.paceMedianMs; }).filter(function (v) { return v != null && v > 0; });
    var pace, quali;
    if (myPace > 0 && peerPace.length) {
      var avgPeerPace = peerPace.reduce(function (a, b) { return a + b; }, 0) / peerPace.length;
      var paceRatio = myPace / avgPeerPace;
      pace = perfVal(ss, 50 + (1 - paceRatio) * 50 * weight);
    } else {
      pace = perfVal(ss, 100 - ss.avgGrid);
    }
    var myQuali = ss && ss.qualiMedianMs;
    var peerQuali = peers.map(function (p) { return p.seasonStats && p.seasonStats.qualiMedianMs; }).filter(function (v) { return v != null && v > 0; });
    if (myQuali > 0 && peerQuali.length) {
      var avgPeerQuali = peerQuali.reduce(function (a, b) { return a + b; }, 0) / peerQuali.length;
      var qualiRatio = myQuali / avgPeerQuali;
      quali = perfVal(ss, 50 + (1 - qualiRatio) * 50 * weight);
    } else {
      quali = perfVal(ss, 100 - ss.avgGrid);
    }
    var val;
    if (myPace > 0 && peerPace.length) {
      val = perfVal(ss, 50 + (pace - 50) * weight);
    } else {
      var myAvg = ss && ss.avgFinish && ss.avgFinish !== '—' ? parseFloat(ss.avgFinish) : null;
      var peerAvgs = peers.map(function (p) { return p.seasonStats && p.seasonStats.avgFinish; }).filter(function (v) { return v && v !== '—'; }).map(parseFloat);
      if (myAvg != null && peerAvgs.length) {
        var avgPeer = peerAvgs.reduce(function (a, b) { return a + b; }, 0) / peerAvgs.length;
        var ratio = myAvg / Math.max(0.1, avgPeer);
        val = perfVal(ss, 50 + (1 - ratio) * 50 * weight);
      } else {
        val = 0;
      }
    }
    return { label: isSameCar ? 'vs Same Car' : 'vs Teammate', val: val, reliability: reliability, pace: pace, quali: quali };
  }

  function seasonVerdict(d, ss) {
    var pos = d.standings ? d.standings.pos : 99;
    if (pos <= 3) return 'Championship Contender';
    if (pos <= 6) return 'Strong Season';
    if (pos <= 10) return 'Midfield Battle';
    if (pos <= 15) return 'Career Crossroads';
    return 'Struggling';
  }

  /** Whole-career rating (0–100) from actual race performance across ALL
   *  series the driver has raced (starts/wins/podiums/points/best finish),
   *  on the SAME scale as the season-performance score so a strong season
   *  yields a strong career rating (this is year one of BTG). */
  function careerRating(name) {
    try {
      var career = (BTG.DBCache && BTG.DBCache.driverCareer) ? BTG.DBCache.driverCareer(name) : [];
      if (!career || !career.length) return null;
      var totalStarts = 0, weighted = 0;
      career.forEach(function (s) {
        var starts = num(s.starts);
        if (!starts) return;
        var bestPos = num(s.bestPos) || 99;
        var score = Math.max(0, 100 - (bestPos - 1) * 5);   // best result
        score += (num(s.wins) / starts) * 15;                // win rate
        score += (num(s.podiums) / starts) * 10;             // podium rate
        score += Math.min(15, (num(s.points) / starts) * 1.5); // points rate
        score -= (num(s.dnfs) / starts) * 8;                 // DNF rate
        score = Math.max(0, Math.min(100, score));
        totalStarts += starts;
        weighted += score * starts;
      });
      if (!totalStarts) return null;
      return Math.max(0, Math.min(100, Math.round(weighted / totalStarts)));
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
      var overallGrade = gradeOf(computeOverallScore(d, ss));
      var nameParts = (d.fullName || d.name).split(' ');
      var rating = opts.showRating !== false ? careerRating(d.fullName || d.name) : null;

      var html = '<div class="dp-main">';
      html += '<div class="dp-left">';

      var heroInner = '<div class="dp-card dp-hero">'
        + '<div class="dp-hero__number">' + (d.standings ? d.standings.pos : '') + '</div>'
        + '<div class="dp-hero__photo" style="border-color:rgb(' + color + ');box-shadow:0 0 24px rgb(' + color + ' / 0.2)">'
        + BTG.driverPhotoImg(d.fullName || d.name, 76)
        + '</div>'
        + '<div class="dp-hero__info">'
        + '<div class="dp-hero__name"><span class="dp-hero__first">' + (nameParts.slice(0, -1).join(' ') || '') + '</span><span class="dp-hero__last">' + (nameParts.slice(-1)[0] || '') + '</span></div>'
        + '<div class="dp-hero__meta">' + BTG.esc(d.nation || '') + (d.carNumber ? '<span class="dp-hero__sep">·</span>#' + BTG.esc(d.carNumber) : '') + '</div>'
        + '<div class="dp-hero__team" style="color:rgb(' + color + ')">'
        + BTG.entryLogoImg(d.team, d.car, d.series || series, 18)
        + '<span>' + BTG.esc(BTG.entryLabel(d.team, d.car)) + '</span>'
        + '</div>'
        + (d.academy ? '<div class="dp-hero__academy"' + (d.academyColor ? ' style="color:' + d.academyColor + '"' : '') + '>'
          + BTG.teamLogoImg(d.academy, d.series || series, 12)
          + '<span>' + BTG.esc(acadName) + (d.academyRole === 'Reserve' ? ' Reserve' : ' Academy') + '</span></div>' : '')
        + '</div></div>';
      if (BTG.wrapCard) html += BTG.wrapCard(heroInner, { teamColor: color, backgroundColor: '#161618', borderRadius: 8, glowRadius: 12, glowIntensity: 0.45, isSelected: true });
      else html += heroInner;

      // Career rating (whole-career, actual performance) — the scouting extra.
      if (rating != null) {
        html += '<div class="dp-card"><div class="dp-card__title">Career Rating</div>'
          + '<div class="dp-rating"><div class="dp-rating__num">' + rating + '</div>'
          + '<div><span class="dp-rating__grade">' + gradeOf(rating) + '</span>'
          + '<div class="dp-rating__meta">whole-career performance</div></div></div></div>';
      }

      var tenure = '—';
      var firstSeasonWithTeam = (d.history || []).find(function (h) { return h.series === d.series && h.team && h.team === d.team; });
      if (firstSeasonWithTeam) tenure = 'since ' + firstSeasonWithTeam.season;
      html += '<div class="dp-card"><div class="dp-card__title">Contract</div>'
        + '<div class="dp-contract">'
        + '<div class="dp-contract__row"><span class="dp-contract__label">Team Tenure</span><span class="dp-contract__val">' + tenure + '</span></div>'
        + '<div class="dp-contract__row"><span class="dp-contract__label">Contract Until</span><span class="dp-contract__val">—</span></div>'
        + '<div class="dp-contract__row"><span class="dp-contract__label">Status</span><span class="dp-contract__val">—</span></div>'
        + '</div></div>';

      html += '<div class="dp-card"><div class="dp-card__title">Season Position</div>'
        + '<div class="dp-pos"><span class="dp-pos__rank">' + (d.standings ? 'P' + d.standings.pos : '—') + '</span><span class="dp-pos__pts">' + (d.standings ? d.standings.pts + ' pts' : '—') + '</span></div></div>';

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
        + '<div><div class="dp-fav-track__name">' + (fav ? fav.track : '—') + '</div><div class="dp-fav-track__note">' + (fav ? (fav.bestCount > 0 ? 'Best: P' + fav.best + ' · ' + fav.bestCount + 'x' : '—') : '—') + '</div></div></div></div>';

      html += '</div>'; // left

      html += '<div class="dp-center">';
      var h2h = computeH2H(d, ss, allDrivers);
      var perf = [
        { label: 'Pace', val: h2h.pace, color: '#f87171' },
        { label: 'Qualifying', val: h2h.quali, color: '#a78bfa' },
        { label: 'Racecraft', val: perfVal(ss, (ss.wins || 0) * 20 + (ss.podiums || 0) * 10 + 40), color: '#34d399' },
        { label: h2h.label, val: h2h.val, color: '#f59e0b' },
        { label: 'Reliability', val: h2h.reliability, color: '#ef4444' }
      ];
      html += '<div class="dp-card"><div class="dp-card__title">Season Performance</div>'
        + '<div class="dp-grade__overall ' + gradeCls(gradeOf(overallGrade)) + '">' + overallGrade + '</div>'
        + '<div class="dp-grade__bars">'
        + perf.map(function (p) { return gbar(p.label, p.val, p.color); }).join('')
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
      var h2hScore = (h2h && h2h.val > 0) ? Math.round(h2h.val) : '—';
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
            return '<div class="dp-past-row"><span class="yr">' + h.season + '</span>'
              + '<span class="st">' + BTG.esc(h.series || '—') + '</span>'
              + '<span class="tm">' + logo + BTG.esc(label) + (h.role === 'Reserve' ? '<span class="sx">Reserve</span>' : '') + '</span>'
              + '<span class="px">' + (h.pos && h.pos !== '—' ? 'P' + h.pos : '—') + '</span>'
              + '<span class="px">' + (h.wins ? h.wins : '—') + '</span>'
              + '<span class="px">' + (h.podiums ? h.podiums : '—') + '</span>'
              + '<span class="px">' + (h.points != null ? h.points : '—') + '</span>'
              + '<span class="ps">' + (h.grade || '—') + '</span></div>';
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
