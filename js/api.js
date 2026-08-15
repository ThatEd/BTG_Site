/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — API Layer
   Talks to the BTG-Gateway Google Apps Script backend.
   Falls back to local demo data when the Gateway is unreachable.
   ═══════════════════════════════════════════════════════════════════════════ */

window.BTG = window.BTG || {};

/* ── Gateway config ──────────────────────────────────────────────────────── */

BTG.GATEWAY_URL = 'https://script.google.com/macros/s/AKfycbynjzkleTl5YLyw6ty9FI2S7Jy5lgKie4cJDWZ6fm_2gMqofZHfN3NqKgVp7fW0frZI/exec';

/* ── Internal cache ──────────────────────────────────────────────────────── */

var _cache = {};

function cached(key, fetcher, ttlMs) {
  var now = Date.now();
  var entry = _cache[key];
  if (entry && (now - entry.ts) < (ttlMs || 30000)) return entry.data;
  var data = fetcher();
  _cache[key] = { data: data, ts: now };
  return data;
}

/* ── Gateway call ────────────────────────────────────────────────────────── */

BTG._call = async function(action, payload) {
  try {
    var res = await fetch(BTG.GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {}))
    });
    return await res.json();
  } catch (e) {
    console.warn('BTG Gateway unreachable:', e.message);
    return null;
  }
};

/* ── Public data loaders ─────────────────────────────────────────────────── */

/** Load all drivers from the backend (requires admin login). */
BTG.loadAllDrivers = async function(username, password) {
  var result = await BTG._call('login', { username: username, password: password });
  if (result && result.ok && result.drivers) {
    return result.drivers.map(_mapDriver);
  }
  return null;
};

/** Load a single driver (requires driver login). */
BTG.loadMyDriver = async function(username, password) {
  var result = await BTG._call('login', { username: username, password: password });
  if (result && result.ok && result.driver) {
    return _mapDriver(result.driver);
  }
  return null;
};

/* ── Mapping ─────────────────────────────────────────────────────────────── */

function _mapDriver(d) {
  return {
    id: d.driver || '',
    name: d.driver || '',
    nation: d.nation || '',
    ovr: d.ovr || 0,
    targetOvr: d.targetOvr || 0,
    team: d.team || null,
    affiliation: d.affiliation || null,
    teamColor: d.teamColor || null,
    aggression: d.aggression,
    aggressionLocked: d.aggressionLocked,
    skills: d.attributes || {},
    standings: d.standings || null,
    history: d.history || []
  };
}

/* ── Local helpers (used by pages) ───────────────────────────────────────── */

/** Get a flat list of unique series from drivers. Falls back to config. */
BTG.getSeries = function(drivers) {
  if (!drivers || !drivers.length) return BTG.SERIES_CONFIG || [];
  var seen = {};
  var list = [];
  drivers.forEach(function(d) {
    var s = d.series || 'Unknown';
    if (!seen[s]) { seen[s] = true; list.push({ id: s, name: s }); }
  });
  return list;
};

/** Get a flat list of unique teams from drivers. Falls back to config. */
BTG.getTeams = function(drivers) {
  if (!drivers || !drivers.length) return BTG.TEAMS_CONFIG || [];
  var seen = {};
  var list = [];
  drivers.forEach(function(d) {
    if (d.team && !seen[d.team]) {
      seen[d.team] = true;
      list.push({ id: d.team, name: d.team, color: d.teamColor });
    }
  });
  return list;
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

/** Sort drivers by standings position, then by OVR descending. */
BTG.sortStandings = function(drivers) {
  return (drivers || []).slice().sort(function(a, b) {
    var pa = a.standings ? a.standings.pos : 999;
    var pb = b.standings ? b.standings.pos : 999;
    if (pa !== pb) return pa - pb;
    return (b.ovr || 0) - (a.ovr || 0);
  });
};

/* ── Demo data (fallback when Gateway is unreachable) ────────────────────── */

BTG.DEMO = {
  drivers: [
    { id:'1',name:'Jack Harris',   nation:'GBR',ovr:85.3,targetOvr:90,team:'Apex Sport',affiliation:null,teamColor:'220,40,50',series:'F1',skills:{cornering:87,braking:82,reactions:84,accuracy:79,control:81,smoothness:76,overtaking:91,defending:88},standings:{pos:1,pts:287},history:[{season:4,series:'F1',grade:'B+'},{season:3,series:'GT3',grade:'B'},{season:2,series:'GT5',grade:'A−'}]},
    { id:'2',name:'Mia Svensson',   nation:'SWE',ovr:88.7,targetOvr:92,team:'Verdant Racing',affiliation:null,teamColor:'0,158,96',series:'F1',skills:{cornering:93,braking:90,reactions:85,accuracy:88,control:86,smoothness:84,overtaking:85,defending:82},standings:{pos:2,pts:261},history:[{season:4,series:'F1',grade:'A−'},{season:3,series:'F2',grade:'A−'}]},
    { id:'3',name:'Ryo Tanaka',     nation:'JPN',ovr:81.2,targetOvr:86,team:'Ironclad GP',affiliation:null,teamColor:'70,100,180',series:'F1',skills:{cornering:80,braking:78,reactions:82,accuracy:81,control:83,smoothness:80,overtaking:79,defending:84},standings:{pos:3,pts:244},history:[{season:4,series:'F1',grade:'B'}]},
    { id:'4',name:'Carlos Ferro',   nation:'BRA',ovr:83.5,targetOvr:88,team:'Red Horizon',affiliation:null,teamColor:'200,50,30',series:'F1',skills:{cornering:85,braking:88,reactions:80,accuracy:82,control:79,smoothness:77,overtaking:76,defending:78},standings:{pos:4,pts:219},history:[{season:4,series:'F1',grade:'B+'}]},
    { id:'5',name:'Elena Voss',     nation:'GER',ovr:76.0,targetOvr:82,team:'Apex Sport',affiliation:null,teamColor:'220,40,50',series:'F1',skills:{cornering:75,braking:73,reactions:78,accuracy:77,control:74,smoothness:76,overtaking:80,defending:79},standings:{pos:5,pts:198},history:[{season:4,series:'F1',grade:'C+'}]},
    { id:'6',name:'Dmitri Orlov',   nation:'RUS',ovr:74.8,targetOvr:80,team:'Frontier F1',affiliation:null,teamColor:'0,120,180',series:'F1',skills:{cornering:72,braking:76,reactions:73,accuracy:75,control:74,smoothness:72,overtaking:77,defending:71},standings:{pos:6,pts:175},history:[{season:4,series:'F1',grade:'C'}]},
    // F2
    { id:'7',name:'Aiko Hashimoto', nation:'JPN',ovr:82.1,targetOvr:87,team:'Verdant F2',affiliation:'Verdant Academy',teamColor:'0,158,96',series:'F2',skills:{cornering:81,braking:80,reactions:83,accuracy:82,control:80,smoothness:79,overtaking:85,defending:80},standings:{pos:1,pts:198},history:[{season:4,series:'F2',grade:'B+'}]},
    { id:'8',name:'Felix Brandt',   nation:'AUT',ovr:80.5,targetOvr:85,team:'Ironclad F2',affiliation:null,teamColor:'70,100,180',series:'F2',skills:{cornering:79,braking:82,reactions:78,accuracy:81,control:80,smoothness:77,overtaking:80,defending:79},standings:{pos:2,pts:177},history:[{season:4,series:'F2',grade:'B'}]},
    // Privateer
    { id:'9',name:'Marco Reyes',    nation:'ESP',ovr:71.5,targetOvr:78,team:null,affiliation:null,teamColor:null,series:'F2',skills:{cornering:72,braking:70,reactions:73,accuracy:71,control:70,smoothness:69,overtaking:74,defending:68},standings:{pos:5,pts:101},history:[{season:4,series:'F2',grade:'C−'}]},
    // GT3
    { id:'10',name:'Marcus Webb',   nation:'AUS',ovr:91.2,targetOvr:94,team:'GT Vanguard',affiliation:null,teamColor:'255,128,0',series:'GT3',skills:{cornering:93,braking:91,reactions:88,accuracy:90,control:92,smoothness:89,overtaking:86,defending:85},standings:{pos:1,pts:231},history:[{season:4,series:'GT3',grade:'A'}]},
    { id:'11',name:'Ingrid Larsen', nation:'NOR',ovr:84.6,targetOvr:89,team:'Nordic GT',affiliation:null,teamColor:'74,157,208',series:'GT3',skills:{cornering:82,braking:86,reactions:85,accuracy:83,control:84,smoothness:82,overtaking:78,defending:80},standings:{pos:2,pts:209},history:[{season:4,series:'GT3',grade:'B+'}]},
    // GT4
    { id:'12',name:'Zara Nkosi',    nation:'RSA',ovr:80.3,targetOvr:85,team:'Apex GT4',affiliation:null,teamColor:'220,40,50',series:'GT4',skills:{cornering:79,braking:81,reactions:80,accuracy:82,control:78,smoothness:77,overtaking:79,defending:81},standings:{pos:1,pts:176},history:[{season:4,series:'GT4',grade:'B+'}]},
    { id:'13',name:'Kai Sorensen',  nation:'DEN',ovr:70.0,targetOvr:76,team:null,affiliation:null,teamColor:null,series:'GT4',skills:{cornering:70,braking:68,reactions:71,accuracy:72,control:69,smoothness:67,overtaking:73,defending:66},standings:{pos:3,pts:133},history:[{season:4,series:'GT4',grade:'C+'}]}
  ],
  news: [
    { tag:'transfer',title:'Apex Sport and Mia Svensson reported to be in contract talks',series:'F1',time:'2 hours ago'},
    { tag:'bop',title:'Supra receives mandatory rear wing increase ahead of GT3 round 4',series:'GT3',time:'5 hours ago'},
    { tag:'rumour',title:'Paddock sources: Red Horizon approached Ryo Tanaka over multi-year deal',series:'F1',time:'8 hours ago'},
    { tag:'finance',title:'Belaick Financial steps in to rescue struggling GT5 squad',series:'GT5',time:'1 day ago'},
    { tag:'seasonEnd',title:'Marcus Webb locks in A rating after dominant GT3 campaign',series:'GT3',time:'3 days ago'}
  ]
};

/** Ensure the demo data is loaded. Use as fallback when Gateway is down. */
BTG.useDemo = function() {
  BTG.drivers = BTG.DEMO.drivers;
  BTG.news = BTG.DEMO.news;
  return BTG;
};
