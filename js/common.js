/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Common (shared nav, utilities)
   Include on every page. Editable in one place.
   ═══════════════════════════════════════════════════════════════════════════ */

window.BTG = window.BTG || {};

/* ── Nav ────────────────────────────────────────────────────────────────────
   Auto-rendered into <nav id="btg-nav"> on every page. The top bar lives
   entirely in JS here — pages just include this script and a
   <nav id="btg-nav"></nav> placeholder. Set document.body.dataset.page
   ('standings'|'drivers'|'dashboard'|'news') to highlight the active tab.
   ─────────────────────────────────────────────────────────────────────────── */
BTG.renderNav = function(activePage) {
  var nav = document.getElementById('btg-nav');
  if (!nav) return;

  var tabs = [
    { id: 'standings', label: 'Standings', href: 'standings.html' },
    { id: 'drivers',   label: 'Drivers',   href: 'drivers.html' },
    { id: 'teams',     label: 'Teams',     href: 'teams.html' },
    { id: 'race-weekend', label: 'Race Weekend', href: 'race-weekend.html' },
    { id: 'calendar', label: 'Calendar', href: 'calendar.html' },
    { id: 'dashboard', label: 'Dashboard', href: 'BTG_DriverAttributes.html' },
    { id: 'radio',     label: 'Radio Creator', href: 'radio-creator.html' },
    { id: 'news',      label: 'News',      href: 'news.html' }
  ];

  var html = '<a class="btg-logo" href="index.html"><img class="btg-logo-img" src="logos/BTG.png" alt="BeTheGrid"></a>';
  tabs.forEach(function(t) {
    var cls = 'nav-tab' + (t.id === activePage ? ' active' : '');
    html += '<a class="' + cls + '" href="' + t.href + '">' + t.label + '</a>';
  });
  html += '<div class="nav-right">'
    + '<a class="nav-social" href="https://www.youtube.com/@Bethegrid" target="_blank" rel="noopener" title="YouTube" aria-label="YouTube"><img class="nav-social-img" src="logos/Youtube.png" alt=""></a>'
    + '<a class="nav-social" href="https://discord.gg/bethegrid" target="_blank" rel="noopener" title="Discord" aria-label="Discord"><img class="nav-social-img" src="logos/Discord.webp" alt=""></a>'
    + '<button class="nav-donate" type="button" onclick="BTG.openDonate()">'
    + '<span class="nav-donate-heart">♥</span><span>Support this site\'s development</span>'
    + '</button>'
    + '</div>';
  nav.innerHTML = html;
};

/* ── Donate modal (global) ─────────────────────────────────────────────── */
BTG.ensureDonateModal = function() {
  if (document.getElementById('donate-modal')) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'donate-modal';
  overlay.innerHTML =
    '<div class="modal donate-modal">'
    + '<div class="modal-header"><div class="modal-title">Support this site\'s development</div>'
    + '<button class="modal-close" type="button" onclick="BTG.closeDonate()">✕</button></div>'
    + '<div class="modal-body">'
    + '<a class="donate-btn" href="https://paypal.me/ThatOneEd" target="_blank" rel="noopener">'
    + '<span class="donate-btn-icon">♥</span>Donate via PayPal'
    + '</a>'
    + '<div class="donate-note">Opens PayPal.me in a new tab — you don\'t need a PayPal account to send a donation.</div>'
    + '</div></div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) BTG.closeDonate(); });
  document.body.appendChild(overlay);
};
BTG.openDonate = function() {
  BTG.ensureDonateModal();
  document.getElementById('donate-modal').classList.add('open');
};
BTG.closeDonate = function() {
  var m = document.getElementById('donate-modal');
  if (m) m.classList.remove('open');
};

// Auto-render the nav on every page that includes this script.
(function() {
  function boot() {
    var page = document.body && document.body.dataset ? document.body.dataset.page : null;
    if (!page && location.hash) page = location.hash.replace('#','');
    BTG.renderNav(page);
    BTG.ensureDonateModal();
    BTG.loadLogoManifest();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ── Logo manifest ──────────────────────────────────────────────────────────
   The list of images that actually exist under logos/. Several views build
   candidate paths and fall back on 404 (team crests, series logos); knowing the
   real file list up front avoids those wasted requests. Resolves to the same
   Set on every call, so it is safe to await more than once. */
BTG.LOGO_FILES = BTG.LOGO_FILES || new Set();
BTG.loadLogoManifest = function() {
  if (BTG._logoManifestPromise) return BTG._logoManifestPromise;
  BTG._logoManifestPromise = fetch('logos/logos-manifest.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (m) {
      (m && m.logos || []).forEach(function (p) {
        BTG.LOGO_FILES.add('logos/' + String(p).replace(/^\/+/, ''));
      });
      return BTG.LOGO_FILES;
    })
    .catch(function () { return BTG.LOGO_FILES; });
  return BTG._logoManifestPromise;
};

/* ── Data endpoint probes ───────────────────────────────────────────────────
   Auto-discovery asks the dev server for the Data/ folder listing (/api/*).
   Static hosting (GitHub Pages) has no such endpoints, so each probe is a 404,
   and pages asked more than once per load. These memos keep it to one request
   per endpoint per page load in both cases. Resolving to null means "this host
   has no such endpoint" — distinct from an empty array ("folder is empty"). */
BTG.dataManifest = function() {
  if (BTG._dataManifestPromise) return BTG._dataManifestPromise;
  BTG._dataManifestPromise = fetch('Data/data-manifest.json')
    .then(function(r) { return r.ok ? r.json() : {}; })
    .catch(function() { return {}; })
    .then(function(m) { return (m && typeof m === 'object') ? m : {}; });
  return BTG._dataManifestPromise;
};

BTG.apiSeries = function() {
  if (BTG._apiSeriesPromise) return BTG._apiSeriesPromise;
  BTG._apiSeriesPromise = fetch('/api/series')
    .then(function(r) { return r.ok ? r.json() : null; })
    .catch(function() { return null; })
    .then(function(list) { return Array.isArray(list) ? list : null; });
  return BTG._apiSeriesPromise;
};

/** File list for a series from the dev server, or null when /api is absent. */
BTG.apiSeriesFiles = function(series) {
  if (!series) return Promise.resolve(null);
  BTG._apiFiles = BTG._apiFiles || {};
  if (BTG._apiFiles[series]) return BTG._apiFiles[series];
  BTG._apiFiles[series] = BTG.apiSeries().then(function(supported) {
    if (!supported) return null;
    return fetch('/api/series-files?series=' + encodeURIComponent(series))
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; })
      .then(function(list) { return Array.isArray(list) ? list : null; });
  });
  return BTG._apiFiles[series];
};

/* ── Team Colors ──────────────────────────────────────────────────────────── */

/** Parse "r,g,b" strings and set CSS --team-* variables on <html>.
    rgb2 (secondary team colour) feeds the second background gradient. */
BTG.setTeamColors = function(rgb, rgb2) {
  var root = document.documentElement;
  if (!rgb) { BTG.resetTeamColors(); return; }
  var parts = rgb.split(',').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) { BTG.resetTeamColors(); return; }
  var r = parts[0], g = parts[1], b = parts[2];
  var r2 = Math.round(r*0.55), g2 = Math.round(g*0.45), b2 = Math.round(b*0.5);
  if (rgb2) {
    var p2 = rgb2.split(',').map(Number);
    if (p2.length === 3 && !p2.some(isNaN)) { r2 = p2[0]; g2 = p2[1]; b2 = p2[2]; }
  }
  root.style.setProperty('--team-accent', 'rgb('+r+','+g+','+b+')');
  root.style.setProperty('--team-accent-hot', 'rgb('+Math.min(255,Math.round(r*1.15))+','+Math.min(255,Math.round(g*1.15))+','+Math.min(255,Math.round(b*1.15))+')');
  root.style.setProperty('--team-accent-on', '#fff');
  root.style.setProperty('--team-surface', 'rgba('+r+','+g+','+b+',0.08)');
  root.style.setProperty('--team-edge', 'rgba('+r+','+g+','+b+',0.30)');
  root.style.setProperty('--team-glow', 'rgba('+r+','+g+','+b+',0.18)');
  root.style.setProperty('--team-glow2', 'rgba('+r2+','+g2+','+b2+',0.18)');
};

BTG.resetTeamColors = function() {
  var root = document.documentElement;
  root.style.setProperty('--team-accent', 'var(--ember)');
  root.style.setProperty('--team-accent-hot', 'var(--ember-hot)');
  root.style.setProperty('--team-accent-on', 'var(--ember-on)');
  root.style.setProperty('--team-surface', 'rgba(185,29,46,0.08)');
  root.style.setProperty('--team-edge', 'rgba(185,29,46,0.30)');
  root.style.setProperty('--team-glow', 'rgba(185,29,46,0.18)');
  root.style.setProperty('--team-glow2', 'rgba(185,29,46,0.18)');
};

/* ── Flags ────────────────────────────────────────────────────────────────── */

/** IOC 3-letter code → local SVG flag <img> HTML (Flags/{a2}.svg).
 *  `cls` is an optional class for the <img> (e.g. the home-row flag size). */
BTG.flagImg = function(ioc, w, h, cls) {
  if (!ioc) return '';
  // Common IOC → A2 mappings (plus ISO 3166-1 alpha-3 variants some exports use)
  var map = {
    GBR:'gb',SWE:'se',JPN:'jp',BRA:'br',GER:'de',RUS:'ru',AUT:'at',IND:'in',
    ITA:'it',AUS:'au',NOR:'no',MEX:'mx',RSA:'za',KEN:'ke',FRA:'fr',DEN:'dk',
    ESP:'es',FIN:'fi',USA:'us',NED:'nl',CAN:'ca',CHN:'cn',MON:'mc',SUI:'ch',
    BEL:'be',POR:'pt',ARG:'ar',NZL:'nz',THA:'th',KOR:'kr',TUR:'tr',POL:'pl',
    CZE:'cz',HUN:'hu',IRL:'ie',MAS:'my',UAE:'ae',UKR:'ua',COL:'co',CHI:'cl',
    VEN:'ve',URU:'uy',PAR:'py',PER:'pe',ECU:'ec',BOL:'bo',CRO:'hr',SRB:'rs',
    GRE:'gr',ROU:'ro',BUL:'bg',SVK:'sk',SVN:'si',EST:'ee',LVA:'lv',LTU:'lt',
    ISL:'is',LUX:'lu',AND:'ad',SMR:'sm',LIE:'li',MONACO:'mc',MCO:'mc',
    // Middle East / Asia / others reachable from countryToIoc
    KSA:'sa',QAT:'qa',BHR:'bh',SGP:'sg',INA:'id',ISR:'il',
    // ISO 3166-1 alpha-3 variants (some exports use these instead of IOC)
    DEU:'de',NLD:'nl',PRT:'pt',CHE:'ch',DNK:'dk',GRC:'gr',IRL:'ie',
    ZAF:'za',MYS:'my',ARE:'ae',SAU:'sa',IDN:'id',
    // UK nations
    NIR:'gb-nir',ENG:'gb-eng',SCT:'gb-sct',WLS:'gb-wls'
  };
  var code = String(ioc).trim();
  // Skip placeholders / em-dashes that aren't real nation codes
  if (!code || code === '—' || code === '-') return '';
  var a2 = map[code] || code.toLowerCase();
  // Only emit when it looks like a valid A2 code (letters)
  if (!/^[a-z]{2}(-[a-z]{2})?$/.test(a2)) return '';
  w = w || 24; h = h || 18;
  return '<img' + (cls ? ' class="' + String(cls) + '"' : '') + ' src="Flags/' + a2 + '.svg"'
    + ' width="' + w + '" height="' + h + '" alt="' + code + '" loading="lazy"'
    + ' onerror="this.style.visibility=\'hidden\';"'
    + ' style="object-fit:cover;border-radius:1px;">';
};

/* ── Skill Weights ────────────────────────────────────────────────────────── */

BTG.SKILL_WEIGHTS = {
  cornering: 0.20, braking: 0.18, accuracy: 0.15, control: 0.14,
  reactions: 0.11, overtaking: 0.08, defending: 0.07, smoothness: 0.05,
  adaptability: 0.02
};

/** Compute weighted OVR from skills object. */
BTG.computeOvr = function(skills) {
  var sum = 0;
  for (var k in BTG.SKILL_WEIGHTS) {
    sum += (skills[k] || 0) * BTG.SKILL_WEIGHTS[k];
  }
  return Math.round(sum * 10) / 10;
};

/* ── Formatting ───────────────────────────────────────────────────────────── */

BTG.fmtOvr = function(v) { return (v || 0).toFixed(1); };

BTG.esc = function(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/** Group drivers by series. Returns { seriesId: [drivers] }. */
BTG.groupBySeries = function(drivers) {
  var groups = {};
  (drivers || []).forEach(function(d) {
    var s = d.series || 'Unknown';
    if (!groups[s]) groups[s] = [];
    groups[s].push(d);
  });
  return groups;
};

/* ── Modal ────────────────────────────────────────────────────────────────── */

BTG.openModal = function(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
};
BTG.closeModal = function(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  BTG.resetTeamColors();
};
BTG.bgClose = function(e, id) {
  if (e.target === document.getElementById(id)) BTG.closeModal(id);
};

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(function(el) {
      el.classList.remove('open');
      document.body.style.overflow = '';
    });
    BTG.resetTeamColors();
  }
});
