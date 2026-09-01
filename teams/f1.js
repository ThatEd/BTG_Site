/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — F1 Team Data
   Colors & identities derived from ThatFinnishGuy Save Viewer branding config.
   ═══════════════════════════════════════════════════════════════════════════ */

window.BTG = window.BTG || {};

/** F1 team definitions. */
BTG.F1_TEAMS = [
  { id: 1,  name: 'Ferrari',        color: '220,0,0',      colorSecondary: '142,147,150',  logo: 'logos/f1.png' },
  { id: 2,  name: 'McLaren',        color: '255,128,0',    colorSecondary: '45,45,45',     logo: 'logos/f1.png' },
  { id: 3,  name: 'Red Bull',       color: '30,91,198',    colorSecondary: '247,195,0',    logo: 'logos/f1.png' },
  { id: 4,  name: 'Mercedes',       color: '0,210,190',    colorSecondary: '61,61,61',     logo: 'logos/f1.png' },
  { id: 5,  name: 'Alpine',         color: '0,144,255',    colorSecondary: '255,135,188',  logo: 'logos/f1.png' },
  { id: 6,  name: 'Williams',       color: '0,90,255',     colorSecondary: '4,30,66',      logo: 'logos/f1.png' },
  { id: 7,  name: 'Haas',           color: '230,0,43',     colorSecondary: '61,61,61',     logo: 'logos/f1.png' },
  { id: 8,  name: 'Racing Bulls',   color: '22,52,203',    colorSecondary: '38,71,216',    logo: 'logos/f1.png' },
  { id: 9,  name: 'Audi',           color: '192,0,0',      colorSecondary: '127,133,137',  logo: 'logos/f1.png' },
  { id: 10, name: 'Aston Martin',   color: '0,111,98',     colorSecondary: '206,220,0',    logo: 'logos/f1.png' },
  { id: 32, name: 'Cadillac',       color: '200,16,46',    colorSecondary: '123,127,130',  logo: 'logos/f1.png' }
];

/** F2 team definitions. */
BTG.F2_TEAMS = [
  { id: 11, name: 'PREMA',                 color: '239,1,1',     colorSecondary: '61,61,61',     logo: 'logos/f2.png' },
  { id: 12, name: 'Invicta Virtuosi',      color: '254,242,15',  colorSecondary: '142,147,150',  logo: 'logos/f2.png' },
  { id: 13, name: 'Rodin Carlin',          color: '45,45,45',    colorSecondary: '61,61,61',     logo: 'logos/f2.png' },
  { id: 14, name: 'Hitech',                color: '112,112,112', colorSecondary: '61,61,61',     logo: 'logos/f2.png' },
  { id: 15, name: 'ART',                   color: '237,28,36',   colorSecondary: '61,61,61',     logo: 'logos/f2.png' },
  { id: 16, name: 'MP',                    color: '0,61,165',    colorSecondary: '109,110,113',  logo: 'logos/f2.png' },
  { id: 17, name: 'AIX Racing',            color: '61,190,74',   colorSecondary: '109,110,113',  logo: 'logos/f2.png' },
  { id: 18, name: 'DAMS',                  color: '0,61,165',    colorSecondary: '109,110,113',  logo: 'logos/f2.png' },
  { id: 19, name: 'Campos Racing',         color: '203,32,15',   colorSecondary: '109,110,113',  logo: 'logos/f2.png' },
  { id: 20, name: 'Van Amersfoort Racing', color: '232,119,34',  colorSecondary: '109,110,113',  logo: 'logos/f2.png' },
  { id: 21, name: 'Trident',               color: '40,58,142',   colorSecondary: '109,110,113',  logo: 'logos/f2.png' }
];

/** All teams merged (F1 + F2). */
BTG.ALL_TEAMS = BTG.F1_TEAMS.concat(BTG.F2_TEAMS);

/** Look up a team by ID. */
BTG.teamById = function(id) {
  return BTG.ALL_TEAMS.find(function(t) { return t.id === Number(id); });
};

/** Look up a team by name (fuzzy). */
BTG.teamByName = function(name) {
  if (!name) return null;
  var lname = name.toLowerCase();
  return BTG.ALL_TEAMS.find(function(t) { return t.name.toLowerCase() === lname; })
      || BTG.ALL_TEAMS.find(function(t) { return t.name.toLowerCase().indexOf(lname) !== -1 || lname.indexOf(t.name.toLowerCase()) !== -1; });
};

/* ═══════════════════════════════════════════════════════════════════════════
   Simple team-name → logo path resolver (no TFG dependency).
   Name → per-year webp (logos/teams/{year}/), falling back to mini png.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Team display name → per-year logo slug (logos/teams/{year}/{slug}.webp). */
BTG.TEAM_LOGO_SLUG = {
  'Alfa Romeo': 'alfa-romeo',
  'AlphaTauri': 'alphatauri',
  'Alpine': 'alpine',
  'Aston Martin': 'astonmartin',
  'Audi': 'audi',
  'Ferrari': 'ferrari',
  'Haas': 'haasf1team',
  'McLaren': 'mclaren',
  'Mercedes': 'mercedes',
  'Racing Bulls': 'racingbulls',
  'RB': 'racingbulls',
  'Red Bull': 'redbullracing',
  'Stake Sauber': 'kicksauber',
  'Kick Sauber': 'kicksauber',
  'Sauber': 'kicksauber',
  'Cadillac': 'cadillac',
  'Williams': 'williams'
};

/** Team display name → mini logo path (logos/mini/{file}.png). */
BTG.TEAM_MINI_LOGO = {
  'Alfa Romeo': 'AlphaRomeo.png',
  'AlphaTauri': 'Alphatauri.png',
  'Alpine': 'Alpine.png',
  'Aston Martin': 'AstonMartin.png',
  'Cadillac': 'Cadillac.png',
  'Ferrari': 'Ferrari.png',
  'Haas': 'Haas.png',
  'McLaren': 'McLaren.png',
  'Mercedes': 'Mercedes.png',
  'Racing Bulls': 'RacingBulls.png',
  'RB': 'RacingBulls.png',
  'Red Bull': 'Redbull.png',
  'Williams': 'Williams.png',
  'PREMA': 'mini/f2/PremaRacing.png',
  'Invicta Virtuosi': 'mini/f2/VirtuosiRacing.png',
  'Invicta': 'mini/f2/VirtuosiRacing.png',
  'Rodin Carlin': 'mini/f2/Carlin.png',
  'Rodin': 'mini/f2/Carlin.png',
  'Hitech': 'mini/f2/Hitech.png',
  'ART': 'mini/f2/ArtGrandPrix.png',
  'MP': 'mini/f2/MpMotorsport.png',
  'AIX Racing': 'mini/f2/Charouz.png',
  'PHM AIX': 'mini/f2/Charouz.png',
  'DAMS': 'mini/f2/Dams.png',
  'Campos Racing': 'mini/f2/CamposRacing.png',
  'Campos': 'mini/f2/CamposRacing.png',
  'Van Amersfoort Racing': 'mini/f2/VanAmersfoortRacing.png',
  'VAR': 'mini/f2/VanAmersfoortRacing.png',
  'Trident': 'mini/f2/Trident.png'
};

/**
 * Generate filename variants from a team name, so a logo can be auto-matched
 * regardless of the naming convention used on disk. For "Swansson Racing" this
 * yields e.g. "Swansson Racing", "swansson racing", "Swansson-Racing",
 * "swansson-racing", "swansson_racing", "swanssonracing".
 */
BTG.logoNameVariants = function(name) {
  if (!name) return [];
  var raw = String(name).trim();
  if (!raw) return [];
  var lower = raw.toLowerCase();
  var variants = [];
  function add(v) { if (v && variants.indexOf(v) === -1) variants.push(v); }
  add(raw);
  add(lower);
  add(raw.replace(/\s+/g, '-'));
  add(lower.replace(/\s+/g, '-'));
  add(lower.replace(/\s+/g, '_'));
  add(lower.replace(/[^a-z0-9]+/g, ''));
  add(lower.replace(/[^a-z0-9]+/g, '-'));
  add(raw.replace(/[^a-zA-Z0-9]+/g, ''));
  return variants;
};

/**
 * Resolve a stored logo value to a URL. Values without a folder are assumed to
 * live in logos/teams/ (the historical mapping, e.g. "Haas.png"); values with
 * a folder (e.g. "mini/Redbull.png" or "f1.png") are resolved relative to
 * logos/. Returns '' when there is no logo.
 */
BTG.teamLogoUrl = function(logo) {
  if (!logo) return '';
  var s = String(logo);
  return 'logos/' + (s.indexOf('/') === -1 ? 'teams/' + s : s);
};

/**
 * Build an ordered list of candidate logo URLs for a team name.
 * Resolution order (per BTG convention):
 *   1. logos/teams/{series}/{name}  — series-specific folder if the team
 *      belongs to that series and a file with the same name exists there
 *      (e.g. Red Bull → logos/teams/XGT/Red Bull.png)
 *   2. logos/teams/{name}           — root teams folder (flat files)
 *   3. logos/brands/{name}          — colored brand/mini logos
 *   4. logos/mini/{name}            — colored mini logos (last resort)
 * Full team wordmarks (logos/teams/{year}/…) are intentionally NOT used.
 * Any team name is auto-searched; explicit mini-map entries are appended.
 *
 * @param {string} teamName
 * @param {string} [series] - e.g. "F1", "f2", "XGT" for series-specific folders
 */
BTG.teamLogoCandidates = function(teamName, series) {
  if (!teamName) return [];
  var out = [];
  function push(p) { if (p && out.indexOf(p) === -1) out.push(p); }

  // 0. DB-backed logo (cache/public-data.json → Teams.logo) — source of truth
  //    for admin-changed team logos, so changes apply site-wide. When the
  //    cache isn't loaded yet, this resolves nothing and we fall through to
  //    the file-name auto-search below.
  try {
    if (window.BTG && BTG.DBCache && BTG.DBCache.teamLogo) {
      var dbLogo = BTG.DBCache.teamLogo(teamName);
      if (dbLogo) push(BTG.teamLogoUrl(dbLogo));
    }
  } catch (e) {}

  var variants = BTG.logoNameVariants(teamName);

  // 1. Series-specific folder: logos/teams/{series}/{name}
  if (series) {
    variants.forEach(function(v) {
      push('logos/teams/' + series + '/' + v + '.png');
      push('logos/teams/' + series + '/' + v + '.webp');
    });
  }

  // 2. Root teams folder (flat files): logos/teams/{name}
  variants.forEach(function(v) {
    push('logos/teams/' + v + '.png');
    push('logos/teams/' + v + '.webp');
  });

  // 3. Colored brand/mini logos: logos/brands/{name}
  variants.forEach(function(v) {
    push('logos/brands/' + v + '.png');
    push('logos/brands/' + v + '.webp');
  });

  // 4. Colored mini logos: logos/mini/{name} (and logos/mini/f2/{name})
  variants.forEach(function(v) {
    push('logos/mini/' + v + '.png');
    push('logos/mini/f2/' + v + '.png');
  });

  // 5. Explicit mini map (already points at the right mini file) — matched
  //    case-insensitively ("prema" == "PREMA").
  var miniKey = null;
  Object.keys(BTG.TEAM_MINI_LOGO || {}).forEach(function (k) {
    if (!miniKey && k.toLowerCase() === String(teamName).toLowerCase()) miniKey = k;
  });
  var mini = miniKey ? BTG.TEAM_MINI_LOGO[miniKey] : null;
  if (mini) push('logos/' + (mini.indexOf('mini/') === 0 ? '' : 'mini/') + mini);

  return out;
};

/**
 * Resolve a team's logo path by name (first candidate), or '' if none.
 * @param {string} teamName
 * @param {string} [series] - series for series-specific folder resolution
 * @returns {string} relative logo URL ('' = no logo, caller hides the img)
 */
BTG.teamLogo = function(teamName, series) {
  var c = BTG.teamLogoCandidates(teamName, series);
  return c.length ? c[0] : '';
};

/**
 * Advance an <img> through its candidate logo list (data-logos). When all
 * candidates fail the image is hidden — never replaced with an F1 placeholder.
 */
BTG.logoStep = function(el) {
  if (!el) return;
  var list = (el.getAttribute('data-logos') || '').split('|').filter(Boolean);
  var idx = Number(el.getAttribute('data-logo-idx') || 0) + 1;
  if (idx < list.length) {
    el.setAttribute('data-logo-idx', idx);
    el.src = list[idx];
  } else {
    el.style.display = 'none';
    el.removeAttribute('src');
  }
};

/**
 * A helper for building an <img> tag for a team, walking the auto-matched
 * candidate list and hiding the element if no logo exists.
 * @param {string} teamName
 * @param {string} [series] - series for series-specific folder resolution
 * @param {number} [size]
 * @returns {string} HTML string, or '' when there are no candidates
 */
BTG.teamLogoImg = function(teamName, series, size) {
  var candidates = BTG.teamLogoCandidates(teamName, series);
  if (!candidates.length) return '';
  var sizePx = size || 18;
  var chain = candidates.map(function(p) { return p.replace(/"/g, '&quot;'); }).join('|');
  return '<img src="' + candidates[0] + '" alt="' + BTG.esc(teamName || '') + '" height="' + sizePx + '" style="object-fit:contain;max-width:90px;" '
    + 'data-logos="' + chain + '" data-logo-idx="0" '
    + 'onerror="BTG.logoStep(this)">';
};

/* ═══════════════════════════════════════════════════════════════════════════
   Car → manufacturer logo resolver.
   For championships that use cars instead of teams (XGT / GT Class One etc.),
   we derive the manufacturer from the car name ("Toyota GR010" → "Toyota") and
   look that up in logos/brands/ — the colored manufacturer logos.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Strip extra noise from a car name to find the manufacturer token. */
BTG.carManufacturer = function(carName) {
  if (!carName) return '';
  var name = String(carName).trim();
  // Known manufacturer name → canonical slug (already in logos/brands/)
  var known = [
    ['Acura', 'Acura'], ['Alpine', 'Alpine'], ['Aston Martin', 'Aston Martin'], ['AstonMartin', 'Aston Martin'],
    ['Audi', 'Audi'], ['BMW', 'BMW'], ['Cadillac', 'Cadillac'], ['Chevrolet', 'Chevrolet'],
    ['Ferrari', 'Ferrari'], ['Ford', 'Ford'], ['Honda', 'Honda'], ['Hyundai', 'Hyundai'],
    ['Koenigsegg', 'Koenigsegg'], ['Lamborghini', 'Lamborghini'], ['Maserati', 'Maserati'],
    ['Mazda', 'Mazda'], ['McLaren', 'McLaren'], ['Mercedes', 'Mercedes'], ['Nissan', 'Nissan'],
    ['Peugeot', 'Peugeot'], ['Porsche', 'Porsche'], ['Renault', 'Renault'], ['SCG', 'SCG'],
    ['Toyota', 'Toyota'], ['Volkswagen', 'Volkswagen']
  ];
  for (var i = 0; i < known.length; i++) {
    if (name.toLowerCase().indexOf(known[i][0].toLowerCase()) !== -1) return known[i][1];
  }
  // Fallback: first word
  var first = name.split(/\s+/)[0] || '';
  return first;
};

/**
 * Build an ordered list of candidate logo URLs for a car name (manufacturer).
 * Looks in logos/brands/ first (colored), then logos/teams/, then logos/mini/.
 */
BTG.carLogoCandidates = function(carName, series) {
  var mfr = BTG.carManufacturer(carName);
  if (!mfr) return [];
  var out = [];
  function push(p) { if (p && out.indexOf(p) === -1) out.push(p); }
  var variants = BTG.logoNameVariants(mfr);

  if (series) {
    variants.forEach(function(v) {
      push('logos/teams/' + series + '/' + v + '.png');
      push('logos/teams/' + series + '/' + v + '.webp');
    });
  }
  variants.forEach(function(v) {
    push('logos/brands/' + v + '.png');
    push('logos/brands/' + v + '.webp');
  });
  variants.forEach(function(v) {
    push('logos/teams/' + v + '.png');
    push('logos/teams/' + v + '.webp');
  });
  variants.forEach(function(v) {
    push('logos/mini/' + v + '.png');
  });
  return out;
};

/** Resolve a car's manufacturer logo path (first candidate), or '' if none. */
BTG.carLogo = function(carName, series) {
  var c = BTG.carLogoCandidates(carName, series);
  return c.length ? c[0] : '';
};

/** Build an <img> for a car's manufacturer logo, walking candidates + hide on fail. */
BTG.carLogoImg = function(carName, series, size) {
  var candidates = BTG.carLogoCandidates(carName, series);
  if (!candidates.length) return '';
  var sizePx = size || 18;
  var chain = candidates.map(function(p) { return p.replace(/"/g, '&quot;'); }).join('|');
  return '<img src="' + candidates[0] + '" alt="' + BTG.esc(carName || '') + '" height="' + sizePx + '" style="object-fit:contain;max-width:90px;" '
    + 'data-logos="' + chain + '" data-logo-idx="0" '
    + 'onerror="BTG.logoStep(this)">';
};

/**
 * Logo for a racing entry: prefer the team logo; when the entry has no team
 * (or its team has no logo), fall back to the car's manufacturer logo.
 * @param {string} teamName
 * @param {string} carName
 * @param {string} [series]
 * @param {number} [size]
 * @returns {string} HTML
 */
BTG.entryLogoImg = function(teamName, carName, series, size) {
  var sizePx = size || 18;
  if (teamName) {
    var teamCandidates = BTG.teamLogoCandidates(teamName, series);
    if (teamCandidates.length) {
      var chain = teamCandidates.map(function(p) { return p.replace(/"/g, '&quot;'); }).join('|');
      return '<img src="' + teamCandidates[0] + '" alt="' + BTG.esc(teamName) + '" height="' + sizePx + '" style="object-fit:contain;max-width:90px;" '
        + 'data-logos="' + chain + '" data-logo-idx="0" onerror="BTG.logoStep(this)">';
    }
  }
  return BTG.carLogoImg(carName, series, size);
};

/** Human label for an entry: team + car, team, or car — never a bare "Privateer" when a car exists. */
BTG.entryLabel = function(teamName, carName) {
  var hasTeam = teamName && teamName !== 'Privateer';
  var hasCar = !!carName && carName !== 'Privateer';
  if (hasTeam && hasCar && carName !== teamName) return teamName + ' · ' + carName;
  if (hasTeam) return teamName;
  if (hasCar) return carName;
  return 'Privateer';
};

/**
 * Entry columns for a table, driven purely by the data (never hardcoded per series):
 *   ['Team', 'Car'] when any row has a real team and any row has a car
 *   ['Team']        when only teams exist
 *   ['Car']         when only cars exist
 */
BTG.entryColumns = function(rows, teamField, carField) {
  teamField = teamField || 'team';
  carField = carField || 'car';
  var hasTeams = (rows || []).some(function(r) {
    var t = r[teamField];
    return t && t !== 'Privateer' && (!r[carField] || t !== r[carField]);
  });
  var hasCars = (rows || []).some(function(r) { return !!r[carField] && r[carField] !== 'Privateer'; });
  if (hasTeams && hasCars) return ['Team', 'Car'];
  if (hasTeams) return ['Team'];
  return ['Car'];
};

/** Label for one entry column of a row. */
BTG.entryColLabel = function(row, col, teamField, carField) {
  teamField = teamField || 'team';
  carField = carField || 'car';
  if (col === 'Team') return row[teamField] && row[teamField] !== 'Privateer' ? row[teamField] : '';
  return row[carField] && row[carField] !== 'Privateer' ? row[carField] : '';
};

/** Logo for one entry column of a row (team logo, or car manufacturer logo). */
BTG.entryColLogo = function(row, col, series, size, teamField, carField) {
  teamField = teamField || 'team';
  carField = carField || 'car';
  if (col === 'Team') {
    var t = row[teamField];
    if (t && t !== 'Privateer') {
      var tc = BTG.teamLogoCandidates(t, series);
      if (tc.length) {
        var chain = tc.map(function(p) { return p.replace(/"/g, '&quot;'); }).join('|');
        return '<img src="' + tc[0] + '" alt="' + BTG.esc(t) + '" height="' + (size || 14) + '" style="object-fit:contain;max-width:90px;" '
          + 'data-logos="' + chain + '" data-logo-idx="0" onerror="BTG.logoStep(this)">';
      }
    }
    return '';
  }
  var c = row[carField];
  return c ? BTG.carLogoImg(c, series, size) : '';
};

/**
 * Resolve a series' logo path dynamically: logos/{series}.png.
 * This auto-discovers any new series — as long as a PNG exists in logos/,
 * it loads with no code changes. Returns '' if the file is missing.
 * @param {string} seriesId - e.g. "F1", "F2", "GT1", "XGT"
 * @returns {string} relative logo URL
 */
BTG.seriesLogo = function(seriesId) {
  if (!seriesId) return '';
  return 'logos/' + seriesId + '.png';
};

/**
 * Build an <img> tag for a series logo. Rendered at a fixed box size via CSS
 * (.series-tab img) so all series logos appear the same size. If no PNG exists
 * for the series, the image is hidden (no placeholder). Auto-loads any new
 * series PNG dropped into logos/.
 * @param {string} seriesId
 * @param {number} [size] - max height in px (CSS fallback; .series-tab img wins)
 * @param {string} [className]
 * @returns {string} HTML
 */
BTG.seriesLogoImg = function(seriesId, size, className) {
  var primary = BTG.seriesLogo(seriesId);
  var cls = className || 'dp-series-logo';
  return '<img class="' + cls + '" src="' + primary + '" alt="' + BTG.esc(seriesId || '') + '" '
    + 'onerror="this.style.display=\'none\';">';
};

/**
 * Data-driven accent color for a series — never hardcoded per series name.
 * Priority: (1) DB cache series.color (authoritative — F1 red, F2 blue,
 * XGT yellow, GT1 grey); (2) known fallback map; (3) samples the most common
 * team color among the series' drivers (via BTG.Data); (4) neutral accent.
 * Returns an "r,g,b" string usable as `rgb(r,g,b)`.
 * @param {string} seriesId
 * @returns {string} "r,g,b"
 */
BTG.seriesAccent = function(seriesId) {
  // 1. DB cache series color (the authoritative source).
  try {
    var db = (window.BTG && BTG.DBCache && BTG.DBCache.data) ? BTG.DBCache.data() : null;
    var srs = (db && db.series) || [];
    for (var i = 0; i < srs.length; i++) {
      if (String(srs[i].series_id) !== String(seriesId)) continue;
      var hx = String(srs[i].color || '').replace('#', '');
      if (hx.length === 6 && !isNaN(parseInt(hx, 16))) {
        var r = parseInt(hx.slice(0, 2), 16), g = parseInt(hx.slice(2, 4), 16), b = parseInt(hx.slice(4, 6), 16);
        if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return r + ',' + g + ',' + b;
      }
      break;
    }
  } catch (e) {}
  // 2. Known fallback map (used when the cache isn't loaded yet).
  var known = { F1: '225,6,0', F2: '0,144,255', XGT: '216,186,22', GT1: '138,138,138' };
  if (known[seriesId]) return known[seriesId];
  // 3. Old sampling logic (roster team colors).
  try {
    if (window.BTG && BTG.Data && BTG.Data.drivers) {
      var counts = {};
      var best = null, bestCount = 0;
      Object.keys(BTG.Data.drivers).forEach(function(name) {
        var d = BTG.Data.drivers[name];
        var sr = d.seasons && d.seasons[seriesId];
        if (!sr) return;
        Object.keys(sr).forEach(function(year) {
          var s = sr[year];
          var c = s.teamColor || null;
          if (!c) {
            var t = BTG.teamByName(s.latestTeam);
            c = t ? t.color : null;
          }
          if (!c) return;
          counts[c] = (counts[c] || 0) + 1;
          if (counts[c] > bestCount) { bestCount = counts[c]; best = c; }
        });
      });
      if (best) return best;
    }
  } catch(e) {}
  return '136,16,24'; // neutral BTG accent fallback
};

/** Alias for callers that want a CSS hex/#rgb value. */
BTG.seriesColorHex = function(seriesId) {
  var c = BTG.seriesAccent(seriesId);
  var parts = String(c).split(',').map(function(n) { return parseInt(n, 10); });
  function hex(n) { var h = (n || 0).toString(16); return h.length === 1 ? '0' + h : h; }
  return '#' + hex(parts[0]) + hex(parts[1]) + hex(parts[2]);
};

/**
 * Resolve a driver's photo path from their name, using the convention
 * {firstname}_{surname}.png / .webp inside a driver-photos folder.
 *
 * The public folder (logos/drivers/) is probed lazily: we return the primary
 * candidate and let the caller fall back via onerror. Each candidate is also
 * prefixed with the optional `logos/drivers/` base. If a driver has no
 * parseable first+last name we return null so callers show the "?" placeholder.
 *
 * @param {string} fullName  - e.g. "Charles Leclerc"
 * @param {string} [base]    - folder relative to site root, default "logos/drivers"
 * @returns {string|null}    - relative URL, or null if no name could be parsed
 */
/** Strip diacritics (ä→a, ö→o, ś→s, á→a, …) so driver names match photo
 *  filenames on disk (e.g. "Kärkkäinen" → "karkkainen"). */
function deaccent(s) {
  try { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { return String(s); }
}

BTG.driverPhoto = function(fullName, base) {
  if (!fullName) return null;
  var name = String(fullName).trim().replace(/\s+/g, ' ');
  if (!name) return null;

  // Normalize a name token → deaccented, lowercase, non-alphanumerics → single underscore
  function tok(s) {
    return deaccent(s.toLowerCase()).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  // Handle "FirstName LastName" and "FirstName MiddleName LastName" → first_last
  var parts = name.split(' ');
  var first = tok(parts[0]);
  var last = tok(parts[parts.length - 1]);
  if (!first || !last || first === last) return null;

  var dir = base || 'logos/drivers/';
  return dir + first + '_' + last;
};

/**
 * Ordered list of candidate photo bases (without extension) for a driver.
 * Handles BOTH naming conventions used on disk:
 *   1. first.middle.last  — full name, lowercase, dots (e.g. kaj.ten.voorde)
 *   2. first_last         — first + last, underscore (README convention)
 * The caller walks these via BTG.driverPhotoImg's onerror chain.
 */
BTG.driverPhotoCandidates = function(fullName, base) {
  if (!fullName) return [];
  var name = String(fullName).trim().replace(/\s+/g, ' ');
  if (!name) return [];
  var dir = base || 'logos/drivers/';
  function tokDot(s) { return deaccent(s.toLowerCase()).replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, ''); }
  function tokUnd(s) { return deaccent(s.toLowerCase()).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  var parts = name.split(' ').map(tokDot).filter(Boolean);
  var out = [];
  function add(p) { if (p && out.indexOf(p) === -1) out.push(p); }
  if (parts.length >= 2) add(dir + parts.join('.'));
  var first = tokUnd(parts[0] || ''), last = tokUnd(parts[parts.length - 1] || '');
  if (first && last && first !== last) add(dir + first + '_' + last);
  if (parts.length >= 2 && parts[parts.length - 1] !== parts[0]) add(dir + parts[0] + '.' + parts[parts.length - 1]);
  return out;
};

/**
 * Build an <img> tag for a driver photo, walking every candidate base
 * (.webp → .png for each), then swapping in the "?" placeholder span.
 * @param {string} fullName
 * @param {number} [size] - width/height in px for the img element
 * @param {string} [className]
 * @returns {string} HTML
 */
BTG.driverPhotoImg = function(fullName, size, className) {
  var bases = BTG.driverPhotoCandidates(fullName);
  var sizePx = size || 76;
  var cls = className || 'dp-hero__img';
  if (!bases.length) {
    return '<span class="dp-hero__placeholder">?</span>';
  }
  var urls = [];
  // Fast path: 256px webp thumbs (logos/drivers/thumbs/) first — the source
  // PNGs are ~1254px / ~1.5MB and are only ever shown small.
  bases.forEach(function (b) {
    urls.push(b.replace('logos/drivers/', 'logos/drivers/thumbs/') + '.webp');
  });
  bases.forEach(function (b) { urls.push(b + '.webp'); urls.push(b + '.png'); });
  var chain = urls.map(function (u) { return u.replace(/"/g, '&quot;'); }).join('|');
  return '<img class="' + cls + '" src="' + urls[0] + '" width="' + sizePx + '" height="' + sizePx + '" alt="' + BTG.esc(fullName || '') + '" '
    + 'onload="this.style.opacity=1;" style="opacity:0;" '
    + 'data-logos="' + chain + '" data-logo-idx="0" data-name="' + BTG.esc(fullName || '') + '" '
    + 'onerror="BTG.driverPhotoStep(this)">';
};

/** Advance a driver photo through its candidate URLs; on failure → "?". */
BTG.driverPhotoStep = function(el) {
  if (!el) return;
  var list = (el.getAttribute('data-logos') || '').split('|').filter(Boolean);
  var idx = Number(el.getAttribute('data-logo-idx') || 0) + 1;
  if (idx < list.length) {
    el.setAttribute('data-logo-idx', idx);
    el.src = list[idx];
  } else {
    BTG.driverPhotoFail(el);
  }
};

/**
 * Global fallback: replace a driver photo <img> with the "?" placeholder
 * when all candidate .webp/.png files were tried and failed.
 */
BTG.driverPhotoFail = function(el) {
  if (!el || !el.parentNode) return;
  var span = document.createElement('span');
  span.className = 'dp-hero__placeholder';
  span.textContent = '?';
  el.parentNode.replaceChild(span, el);
};
