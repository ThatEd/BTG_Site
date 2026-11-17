/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — Driver numbers (port of TFGTools js/utils/driverNumbers.js)

   A number sheet holds the ten digits as transparent cut-outs, and a digit
   carries whatever ink the game gave it — white on Ferrari, near black on
   McLaren — so the plate behind it is what makes it read: the team's primary
   colour, which is what the game puts there too.

   A team with no number set draws nothing at all: not a dash, not a zero.
   ═══════════════════════════════════════════════════════════════════════════ */

window.BTG = window.BTG || {};

(function () {
  'use strict';

  var SUPERSAMPLE = 3;
  var ALPHA_FLOOR = 8;
  var FILL_REFERENCE = 60;
  var TEN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  /* ── Config (config/branding/driver-numbers.json) ───────────────────────── */

  var CFG = {
    basePath: 'driver-numbers',
    /* Where each digit sits on a 1024x2048 sheet. */
    layout: {
      '0': [0, 0, 500, 410],      '1': [512, 0, 512, 410],
      '2': [0, 410, 500, 410],    '3': [512, 410, 512, 410],
      '4': [0, 820, 500, 410],    '5': [512, 820, 512, 410],
      '6': [0, 1230, 500, 410],   '7': [512, 1230, 512, 410],
      '8': [0, 1640, 500, 408],   '9': [512, 1640, 512, 408]
    },
    seasonOrder: [2026, 2025, 2024],
    boxRatio: 3.95,
    plateDefaults: { 'Audi': 'secondary', 'Gucci Alpine': 'secondary' },
    sheets: {
      "2024": {
            "AlfaRomeo_Alt": "T_Driver_Number_Atlas_AlfaRomeo_Alt.png",
            "AlphaTauri": "T_Driver_Number_Atlas_AlphaTauri.png",
            "Alpine_Alt": "T_Driver_Number_Atlas_Alpine_Alt.png",
            "AstonMartin": "T_Driver_Number_Atlas_AstonMartin.png",
            "Ferrari": "T_Driver_Number_Atlas_Ferrari.png",
            "Haas_Alt": "T_Driver_Number_Atlas_Haas_Alt.png",
            "McLaren": "T_Driver_Number_Atlas_McLaren.png",
            "Mercedes": "T_Driver_Number_Atlas_Mercedes.png",
            "RedBull": "T_Driver_Number_Atlas_RedBull.png",
            "Williams": "T_Driver_Number_Atlas_Williams.png"
      },
      "2025": {
            "Ferrari": "T_Driver_Number_Atlas_Ferrari.png",
            "Haas": "T_Driver_Number_Atlas_Haas.png",
            "McLaren": "T_Driver_Number_Atlas_McLaren.png"
      },
      "2026": {
            "AlfaRomeo": "T_Driver_Number_Atlas_AlfaRomeo.png",
            "AlphaTauri_Alt": "T_Driver_Number_Atlas_AlphaTauri_Alt.png",
            "Alpine_Alt": "T_Driver_Number_Atlas_Alpine_Alt.png",
            "AstonMartin": "T_Driver_Number_Atlas_AstonMartin.png",
            "Ferrari": "T_Driver_Number_Atlas_Ferrari.png",
            "Haas": "T_Driver_Number_Atlas_Haas.png",
            "McLaren": "T_Driver_Number_Atlas_McLaren.png",
            "Mercedes": "T_Driver_Number_Atlas_Mercedes.png",
            "MyTeam": "T_Driver_Number_Atlas_MyTeam.png",
            "RedBull": "T_Driver_Number_Atlas_RedBull.png",
            "Williams": "T_Driver_Number_Atlas_Williams.png"
      },
      "Modded/Ford": {
            "RedBull": "T_Driver_Number_Atlas_RedBull.png"
      },
      "Modded/Gucci": {
            "Alpine": "T_Driver_Number_Atlas_Alpine.png"
      },
      "Modded/Hitech": {
            "Alpine_Alt": "T_Driver_Number_Atlas_Alpine_Alt.png"
      },
      "Modded/Lamborghini": {
            "MyTeam": "T_Driver_Number_Atlas_MyTeam.png"
      },
      "Modded/Lotus": {
            "MyTeams": "T_Driver_Number_Atlas_MyTeams.png",
            "MyTeam22": "T_Driver_Number_Atlas_MyTeam22.png"
      },
      "Modded/Maserati": {
            "AlphaTauri": "T_Driver_Number_Atlas_AlphaTauri.png"
      },
      "Modded/Peugeot": {
            "MyTeam": "T_Driver_Number_Atlas_MyTeam.png"
      },
      "Modded/Porsche": {
            "AlphaTauri": "T_Driver_Number_Atlas_AlphaTauri.png"
      },
      "Modded/Renault": {
            "Alpine": "T_Driver_Number_Atlas_Alpine.png",
            "Alpine_Alt": "T_Driver_Number_Atlas_Alpine_Alt.png"
      }
},
    brandKeys: {
      Ferrari: 'Ferrari', McLaren: 'McLaren', Mercedes: 'Mercedes',
      'Red Bull': 'RedBull', Williams: 'Williams', 'BMW Williams': 'Williams',
      Haas: 'Haas', 'Racing Bulls': 'AlphaTauri', RB: 'AlphaTauri', AlphaTauri: 'AlphaTauri',
      Alpine: 'Alpine_Alt', 'Gucci Alpine': 'Alpine_Alt', 'Aston Martin': 'AstonMartin',
      Audi: 'AlfaRomeo', 'Stake Sauber': 'AlfaRomeo', 'Kick Sauber': 'AlfaRomeo', 'Alfa Romeo': 'AlfaRomeo', Sauber: 'AlfaRomeo',
      Cadillac: 'MyTeam'
    },
    teamKeys: { '32': 'MyTeam' },
    feederStyle: 'MyTeam'
  };

  /* ── Small helpers ──────────────────────────────────────────────────────── */

  function digitsOf(number) {
    return String(number == null ? '' : number).replace(/[^0-9]/g, '').split('');
  }

  function channelsOf(colour) {
    var hex = /^#([0-9a-f]{6})$/i.exec(String(colour || '').trim());
    if (hex) {
      var v = hex[1];
      return [0, 2, 4].map(function (at) { return parseInt(v.slice(at, at + 2), 16); });
    }
    var parts = String(colour || '').match(/\d+(\.\d+)?/g);
    return parts && parts.length >= 3 ? parts.slice(0, 3).map(Number) : null;
  }

  function relativeLuminance(channels) {
    var rgb = channels.map(function (value) {
      var share = value / 255;
      return share <= 0.03928 ? share / 12.92 : Math.pow((share + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  /* A plate of the same lightness as its ink makes the number disappear, so a light plate takes dark ink. */
  function needsDarkInk(colour) {
    var c = channelsOf(colour);
    return c ? relativeLuminance(c) > 0.55 : false;
  }

  function numberBoxSide(height) { return Math.ceil(height * CFG.boxRatio); }

  function boxesSignature(boxes) {
    return TEN_DIGITS.map(function (d) { return (boxes[d] || CFG.layout[d]).join(','); }).join(';');
  }

  /* ── Sheet resolution ───────────────────────────────────────────────────── */

  function sheetUrl(style, year) {
    var selected=BTG.numberYear(year),block=CFG.sheets[selected];
    // Carry-forward is handled by saved year assignments, not by swapping presets.
    return block&&block[style]?CFG.basePath+'/'+selected+'/'+block[style]:null;
  }

  /*
   * The sheet a car's number is drawn from. A team the catalogue has no style for gets null, and the caller draws
   * nothing — the number is simply not shown.
   */
  var discoveredSheets={};
  BTG.registerNumberSheets=function(rows){(rows||[]).forEach(function(row){
    if(row && typeof row.id==='string' && typeof row.url==='string' && /^driver-numbers\/[\w /.-]+\.(png|webp)$/i.test(row.url) && !row.url.includes('..') && row.boxes)discoveredSheets[row.id]=row;
  });};
  var discoveryPromise;
  BTG.discoverNumberSheets=function(refresh){
    if(discoveryPromise&&!refresh)return discoveryPromise;
    discoveryPromise=(async function(){
      var result=[];
      for(var url of ['api/number-sheets','driver-numbers/manifest.json']){
        try{var response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!response.ok)continue;
          var data=await response.json();if(Array.isArray(data.sheets)){result=data.sheets;break;}
        }catch(e){}
      }
      // Python's local preview exposes directory listings. Static production uses the generated manifest.
      try{
        var listing=await fetch('driver-numbers/',{cache:'no-store',signal:AbortSignal.timeout(3000)});
        if(listing.ok && (listing.headers.get('content-type')||'').includes('text/html')){
          var origin=new URL('driver-numbers/',document.baseURI),seen=new Set();
          async function walk(base,depth){if(depth>6||seen.size>100||seen.has(base.href))return;seen.add(base.href);
            var r=await fetch(base,{signal:AbortSignal.timeout(3000)});if(!r.ok)return;
            var doc=new DOMParser().parseFromString(await r.text(),'text/html');
            await Promise.all(Array.from(doc.querySelectorAll('a[href]')).map(async function(a){
              var next=new URL(a.getAttribute('href'),base);if(next.origin!==origin.origin||!next.pathname.startsWith(origin.pathname)||next.href===base.href)return;
              if(next.pathname.endsWith('/'))return walk(next,depth+1);
              if(!/\.(png|webp)$/i.test(next.pathname))return;
              var relative=decodeURIComponent(next.pathname.slice(origin.pathname.length)),parts=relative.split('/'),file=parts.pop(),group=parts.join('/')||'Custom',stem=file.replace(/\.(png|webp)$/i,'').replace(/^T_Driver_Number_Atlas_/,'');
              var row={id:group+':'+stem,label:group.replace(/\//g,' · ')+' · '+stem.replace(/_/g,' '),url:'driver-numbers/'+relative,boxes:CFG.layout};
              try{var meta=await fetch(next.href.replace(/\.(png|webp)$/i,'.json'),{signal:AbortSignal.timeout(2000)});if(meta.ok){var m=await meta.json();row.boxes=m.boxes||row.boxes;row.label=m.label||row.label;}}catch(e){}
              if(!result.some(function(x){return x.id===row.id;}))result.push(row);
            }));
          }
          await walk(origin,0);
        }
      }catch(e){}
      BTG.registerNumberSheets(result);return result;
    })();return discoveryPromise;
  };
  BTG.numberSeatFor=function(team,number,name,year){
    var data=BTG.DBCache&&BTG.DBCache.data?BTG.DBCache.data():null;
    var row=BTG.DBCache&&BTG.DBCache.teamBranding?BTG.DBCache.teamBranding(team):null;
    if(!data||!row)return null;
    var norm=function(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();};
    var driver=name?(data.drivers||[]).find(function(d){return norm(d.full_name)===norm(name);}):null;
    if(!driver){var candidates=(data.drivers||[]).filter(function(d){return Number(d.driver_number)===Number(number);});driver=candidates.find(function(d){return String(d.team_id)===String(row.team_id);}) || (candidates.length===1?candidates[0]:null);}
    if(!driver)return null;
    var season=Number(year||BTG.currentSeason)||Math.max(2024,...(data.app_state||[]).map(function(r){return Number(r.year)||0;}));
    var contract=(data.driver_cars||[]).find(function(c){return String(c.team_id)===String(row.team_id)&&norm(c.driver_name)===norm(driver.full_name)&&Number(c.from_year||season)<=season&&Number(c.till_year||season)>=season;});
    return contract?(Number(contract.seat)===1?'car1':Number(contract.seat)===2?'car2':'reserve'):'reserve';
  };
  BTG.numberSheetFor = function (team, year, styleOverride, seat) {
    var override = styleOverride === undefined ? BTG.numberStyleFor(team, seat, year) : styleOverride;
    if (override === 'plain' || override === 'hidden') return null;
    if(discoveredSheets[override])return discoveredSheets[override];
    if (override !== 'auto') {
      var pair = override.split(':');
      var exact = CFG.sheets[pair[0]] && CFG.sheets[pair[0]][pair[1]];
      if (exact) return {id:override,url:CFG.basePath+'/'+pair[0]+'/'+exact,boxes:CFG.layout,label:override};
    }
    var style = (team != null && CFG.teamKeys[String(team)]) || null;
    var brand = BTG.numberBrandFor ? BTG.numberBrandFor(team) : team;
    if (!style) style = (brand && CFG.brandKeys[brand]) || null;
    if (!style) style = CFG.feederStyle;
    // These 2024 atlases use the game's _Alt filename for the same team.
    // Resolve the team alias within the requested year; saved styles above remain exact.
    var teamAtlasKeys={2024:{Haas:'Haas_Alt',AlfaRomeo:'AlfaRomeo_Alt'}};
    var yearAliases=teamAtlasKeys[BTG.numberYear(year)];
    if(yearAliases&&yearAliases[style])style=yearAliases[style];
    var url = style ? sheetUrl(style, year) : null;
    if (!url) return null;
    return { id: style, url: url, boxes: CFG.layout, label: style };
  };

  BTG.numberSheetByStyle = function (style, team, year) {
    if (style === 'auto') return BTG.numberSheetFor(team, year, 'auto');
    if(discoveredSheets[style])return discoveredSheets[style];
    var pair = String(style).split(':');
    var file = CFG.sheets[pair[0]] && CFG.sheets[pair[0]][pair[1]];
    return file ? {id:style,url:CFG.basePath+'/'+pair[0]+'/'+file,boxes:CFG.layout,label:style} : null;
  };
  BTG.numberYear = function(year){var value=Number(year||BTG.currentSeason);if(value)return value;var data=BTG.DBCache&&BTG.DBCache.data?BTG.DBCache.data():null;return Number(data&&data.app_state&&data.app_state[0]&&data.app_state[0].year)||2024;};
  BTG.numberYearAssignment = function(team,year){
    var row=BTG.DBCache&&BTG.DBCache.teamBranding?BTG.DBCache.teamBranding(team):null,root=row&&row.number_customization||{},limit=BTG.numberYear(year);
    var keys=Object.keys(root.years||{}).map(Number).filter(function(y){return y<=limit;}).sort(function(a,b){return b-a;});
    return keys.length?root.years[String(keys[0])]:null;
  };
  BTG.numberCustomizationFor = function (team,seat,year) {
    var row = BTG.DBCache && BTG.DBCache.teamBranding ? BTG.DBCache.teamBranding(team) : null;
    var c=BTG.numberYearAssignment(team,year)||row && row.number_customization || {};
    return seat && c.seats && c.seats[seat] ? c.seats[seat] : c;
  };

  BTG.numberStyleOptions = function () {
    var out=[{value:'auto',label:'Automatic team style'},{value:'plain',label:'Plain numbers'},{value:'hidden',label:'Hide numbers'}];
    Object.keys(CFG.sheets).forEach(function(year){Object.keys(CFG.sheets[year]).forEach(function(style){out.push({value:year+':'+style,label:year.replace('Modded/', 'Modded · ')+' · '+style.replace(/_/g, ' ')});});});
    Object.values(discoveredSheets).forEach(function(row){if(!out.some(function(o){return o.value===row.id;}))out.push({value:row.id,label:row.label});});
    return out;
  };
  BTG.numberStyleFor = function (team,seat,year) {
    var override=BTG.numberCustomizationFor(team,seat,year);
    if(seat && override.style && override.style!=='auto')return override.style;
    var assignment=BTG.numberYearAssignment(team,year);if(assignment&&assignment.style)return assignment.style;
    var row=BTG.DBCache && BTG.DBCache.teamBranding ? BTG.DBCache.teamBranding(team) : null;
    if (row && row.number_style && row.number_style !== 'auto') return row.number_style;
    var data=BTG.DBCache && BTG.DBCache.data ? BTG.DBCache.data() : null;
    var config=(data && data.lineup_series_settings || []).find(function(c){return row && c.series===row.series;});
    return config && config.number_style || 'auto';
  };

  /* A brand is what the team is called, which for BTG is the registry name. */
  BTG.numberBrandFor = function (team) {
    if (!team) return null;
    if (CFG.brandKeys[team]) return team;
    var key = Object.keys(CFG.brandKeys).filter(function (k) {
      return k.toLowerCase() === String(team).replace(/_/g, ' ').toLowerCase();
    })[0];
    return key || team;
  };

  /*
   * The team's own colour for the plate. BTG keeps team colours in its registry rather than the --teamN-triplet
   * variables the Save Viewer reads, so the registry is the source; the accent stands in when a team has none.
   */
  BTG.teamPlateColour = function (team) {
    var triplet = null;
    if (BTG.DBCache && BTG.DBCache.teamColorRgb) triplet = BTG.DBCache.teamColorRgb(team);
    if (!triplet) {
      var entry = BTG.teamByName && BTG.teamByName(team);
      if (entry && entry.color) triplet = entry.color;
    }
    if (triplet) return 'rgb(' + String(triplet).replace(/\s*,\s*/g, ',') + ')';
    var root = getComputedStyle(document.documentElement);
    return 'rgb(' + (root.getPropertyValue('--accent-rgb').trim() || '220 38 38') + ')';
  };

  /* ── Drawing ────────────────────────────────────────────────────────────── */

  var images = {};
  var strips = {};
  var cutCache = {};

  function loadSheet(url) {
    if (!images[url]) {
      images[url] = new Promise(function (resolve, reject) {
        var img = new Image();
        img.crossOrigin='anonymous';
        img.crossOrigin = 'anonymous';
        img.onload = function () { resolve(img); };
        img.onerror = function () { delete images[url]; reject(new Error('number sheet ' + url)); };
        img.src = url;
      });
    }
    return images[url];
  }

  function glyphGap(height, spacing) {
    var gap = spacing == null ? Math.max(1, Math.round(height * 0.12)) : spacing;
    return gap * SUPERSAMPLE;
  }

  /* Each digit is spaced by how close its ink comes to the next, line by line, so a leaning style tucks in. */
  function placeGlyphs(glyphs, gap) {
    var placed = [{ glyph: glyphs[0], x: 0 }];
    for (var i = 1; i < glyphs.length; i++) {
      var prev = glyphs[i - 1], gl = glyphs[i];
      var lines = Math.min(prev.height, gl.height);
      var reach = 0, shared = false;
      for (var line = 0; line < lines; line++) {
        if (prev.inkRight[line] >= 0 && gl.inkLeft[line] >= 0) {
          shared = true;
          reach = Math.max(reach, prev.inkRight[line] - gl.inkLeft[line]);
        }
      }
      placed.push({ glyph: gl, x: placed[i - 1].x + (shared ? reach : prev.width) + gap });
    }
    var left = Math.min.apply(null, placed.map(function (e) { return e.x; }));
    var right = Math.max.apply(null, placed.map(function (e) { return e.x + e.glyph.width; }));
    return { placed: placed, left: left, span: right - left };
  }

  /* Halving repeatedly keeps every step inside what the browser filters well, so thin outlines stay crisp. */
  function shrinkRegion(source, sx, sy, sw, sh, targetWidth, targetHeight) {
    var canvas = document.createElement('canvas');
    canvas.width = sw; canvas.height = sh;
    canvas.getContext('2d').drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);
    var width = sw, height = sh;
    while (width >= targetWidth * 2 && height >= targetHeight * 2 && width > 2 && height > 2) {
      var half = document.createElement('canvas');
      half.width = Math.max(targetWidth, Math.round(width / 2));
      half.height = Math.max(targetHeight, Math.round(height / 2));
      var hc = half.getContext('2d');
      hc.imageSmoothingQuality = 'high';
      hc.drawImage(canvas, 0, 0, width, height, 0, 0, half.width, half.height);
      canvas = half; width = half.width; height = half.height;
    }
    var out = document.createElement('canvas');
    out.width = targetWidth; out.height = targetHeight;
    var ctx = out.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, targetWidth, targetHeight);
    return out;
  }

  function cutGlyph(cacheKey, image, digit, box, height) {
    if (cacheKey) {
      var key = cacheKey + '|' + box.join(',') + '|' + digit + '|' + height;
      if (cutCache[key]) return cutCache[key];
      var made = cutGlyphRaw(image, box, height);
      cutCache[key] = made;
      return made;
    }
    return cutGlyphRaw(image, box, height);
  }

  function cutGlyphRaw(image, box, height) {
    var x = box[0], y = box[1], width = box[2], height_ = box[3] || 0;
    var w = Math.min(width, image.naturalWidth - x);
    var h = Math.min(height_, image.naturalHeight - y);
    if (w <= 0 || h <= 0) return null;

    var cell = document.createElement('canvas');
    cell.width = w; cell.height = h;
    var cellCtx = cell.getContext('2d');
    cellCtx.drawImage(image, x, y, w, h, 0, 0, w, h);
    var pixels = cellCtx.getImageData(0, 0, w, h).data;

    var minX = w, minY = h, maxX = -1, maxY = -1;
    for (var py = 0; py < h; py++) {
      for (var px = 0; px < w; px++) {
        if (pixels[(py * w + px) * 4 + 3] > ALPHA_FLOOR) {
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;

    var gw = maxX - minX + 1, gh = maxY - minY + 1;
    var targetWidth = Math.max(1, Math.round((gw * height) / gh));
    var targetHeight = Math.max(1, Math.round(height));
    var canvas = shrinkRegion(cell, minX, minY, gw, gh, targetWidth, targetHeight);

    var drawn = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    var inkLeft = new Int16Array(canvas.height).fill(-1);
    var inkRight = new Int16Array(canvas.height).fill(-1);
    for (var ry = 0; ry < canvas.height; ry++) {
      for (var rx = 0; rx < canvas.width; rx++) {
        if (drawn[(ry * canvas.width + rx) * 4 + 3] > ALPHA_FLOOR) {
          if (inkLeft[ry] < 0) inkLeft[ry] = rx;
          inkRight[ry] = rx;
        }
      }
    }
    return { canvas: canvas, width: canvas.width, height: canvas.height, inkLeft: inkLeft, inkRight: inkRight };
  }

  /* How wide a style's widest number is, so a narrow style fills the square rather than sitting small in it. */
  function sheetFillRatio(image, boxes, glyphKey) {
    var key = 'fill|' + glyphKey + '|' + boxesSignature(boxes);
    if (cutCache[key] != null) return Promise.resolve(cutCache[key]);
    var height = FILL_REFERENCE * SUPERSAMPLE;
    var glyphs = TEN_DIGITS
      .map(function (d) { return cutGlyph(null, image, d, boxes[d] || CFG.layout[d], height); })
      .filter(Boolean);
    if (!glyphs.length) return Promise.resolve(CFG.boxRatio);
    var gap = glyphGap(FILL_REFERENCE, null), widest = 0;
    for (var a = 0; a < glyphs.length; a++) {
      for (var b = 0; b < glyphs.length; b++) {
        var span = placeGlyphs([glyphs[a], glyphs[b]], gap).span;
        if (span > widest) widest = span;
      }
    }
    var ratio = widest / height;
    cutCache[key] = ratio;
    return Promise.resolve(ratio);
  }

  function renderStrip(image, boxes, digits, height, colour, glyphKey, plate, boxSide, ink, customization) {
    var glyphs = digits
      .map(function (d) { return cutGlyph(glyphKey, image, d, boxes[d] || CFG.layout[d], height * SUPERSAMPLE); })
      .filter(Boolean);
    if (!glyphs.length) return null;

    var gap = glyphGap(height, null);
    var darkInk = needsDarkInk(colour);
    var lined = placeGlyphs(glyphs, gap);
    var placed = lined.placed, left = lined.left, span = lined.span;

    /*
     * The plate is the square the caller asked for, in device pixels. It is worked out from the requested size and
     * not from the digit height: a digit is taller than the size it is drawn at whenever a style's own widest number
     * is narrower than the square, so sizing the plate off the digit would grow it a second time.
     */
    var side = boxSide * SUPERSAMPLE;
    var width = side, plateHeight = side;
    var offsetX = Math.round((side - span) / 2);
    var offsetY = Math.round((side - height * SUPERSAMPLE) / 2);
    var corner = Math.round(plateHeight * 0.22);

    var canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = plateHeight;
    var ctx = canvas.getContext('2d');

    if (plate) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(corner, 0);
      ctx.lineTo(width - corner, 0);
      ctx.quadraticCurveTo(width, 0, width, corner);
      ctx.lineTo(width, plateHeight - corner);
      ctx.quadraticCurveTo(width, plateHeight, width - corner, plateHeight);
      ctx.lineTo(corner, plateHeight);
      ctx.quadraticCurveTo(0, plateHeight, 0, plateHeight - corner);
      ctx.lineTo(0, corner);
      ctx.quadraticCurveTo(0, 0, corner, 0);
      ctx.closePath();
      ctx.fill();
    }

    /*
     * The plate keeps the team's colour; the ink is what moves. A plate too light takes the ink dark. With no
     * plate the digits are drawn exactly as the sheet holds them: the sheet's own colours are the number's
     * colours, so nothing is filtered and nothing is painted behind them.
     */
    var filter = plate && darkInk && !customization.keepInk ? 'brightness(0)' : 'none';
    if (customization.hue) filter = (filter === 'none' ? '' : filter + ' ') + 'hue-rotate(' + Number(customization.hue) + 'deg)';
    for (var i = 0; i < placed.length && !(customization.overlays || []).length && !customization.ink; i++) {
      ctx.filter = filter;
      ctx.drawImage(placed[i].glyph.canvas, placed[i].x - left + offsetX, offsetY);
    }
    ctx.filter = 'none';
    if ((customization.overlays || []).length || customization.ink) {
      // Recolour the digit layer alone, preserving the plate and transparency.
      var digitCanvas = document.createElement('canvas');
      digitCanvas.width = width; digitCanvas.height = plateHeight;
      var digitCtx = digitCanvas.getContext('2d');
      digitCtx.filter = filter;
      placed.forEach(function (item) { digitCtx.drawImage(item.glyph.canvas, item.x - left + offsetX, offsetY); });
      var pixels = digitCtx.getImageData(0, 0, width, plateHeight);
      (customization.overlays || []).forEach(function (rule) {
        var from = channelsOf(rule.from), to = channelsOf(rule.to);
        if (!from || !to) return;
        for (var at = 0; at < pixels.data.length; at += 4) {
          if (!pixels.data[at+3]) continue;
          var distance = Math.sqrt(from.reduce(function (sum, v, i) { return sum + Math.pow(v-pixels.data[at+i], 2); }, 0));
          var mix = Math.max(0, Math.min(1, (Number(rule.tolerance || 0) + Number(rule.softness || 1) - distance) / Math.max(1, Number(rule.softness || 1))));
          for (var channel = 0; channel < 3; channel++) pixels.data[at+channel] = Math.round(pixels.data[at+channel] * (1-mix) + to[channel] * mix);
        }
      });
      if(customization.ink){var inkChannels=channelsOf(customization.ink);for(var k=0;k<pixels.data.length;k+=4){pixels.data[k]=inkChannels[0];pixels.data[k+1]=inkChannels[1];pixels.data[k+2]=inkChannels[2];}}
      digitCtx.putImageData(pixels, 0, 0);
      ctx.drawImage(digitCanvas, 0, 0);
    }

    return {
      url: canvas.toDataURL('image/png'),
      width: width / SUPERSAMPLE,
      height: plateHeight / SUPERSAMPLE
    };
  }

  /**
   * The side of the square a number is drawn on.
   *
   * The Save Viewer sizes a number by the height of one digit and grows that out to the square the widest number needs
   * (`boxRatio`, 3.95). Asking a page for a number "12" therefore means a 47px badge there, which is right for a
   * profile card and far too big for a row. Here the caller gives the side of the badge it wants in pixels — the room
   * the page actually has — and the digits are fitted to it. `7` is the smallest that still reads.
   */
  var PLATE_MIN = 7;
  var PLATE_DEFAULT = 20;

  function plateSide(px) {
    var n = Number(px);
    if (!isFinite(n) || n <= 0) n = PLATE_DEFAULT;
    return Math.max(PLATE_MIN, Math.round(n));
  }

  /**
   * The strip one sheet draws for one number. Cached: the same number, style, colour and size is drawn once.
   */
  BTG.numberStampCss = function () {
    if (document.getElementById('drv-num-css')) return;
    var style = document.createElement('style');
    style.id = 'drv-num-css';
    style.textContent =
      '.drv-num{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;line-height:0;position:relative}' +
      '.drv-num img{display:block;flex:0 0 auto;width:100%;height:100%;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.6))}' +
      '.drv-num[data-drv-team]:hover::after{content:attr(data-drv-team);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);' +
      'margin-bottom:4px;padding:2px 6px;background:#101012;border:1px solid var(--border-medium);white-space:nowrap;' +
      'font-size:9px;font-weight:700;letter-spacing:0.04em;color:var(--text-secondary);z-index:20}';
    document.head.appendChild(style);
  };

  BTG.numberStrip = function (sheet, digits, platePx, colour, plate, ink, customization) {
    if (!sheet || !digits.length) return Promise.resolve(null);
    customization = customization || {};
    var box = plateSide(platePx);
    var onPlate = plate !== false;
    var key = sheet.id + '|' + digits.join('') + '|' + box + '|' + colour + '|' + (onPlate ? 'p' : 'n') + '|' + (ink || '') + '|' + JSON.stringify(customization);
    if (strips[key]) return strips[key];
    var pending = loadSheet(sheet.url)
      .then(function (image) {
        return sheetFillRatio(image, sheet.boxes, sheet.id).then(function (fill) {
          /* The square is exactly what the caller asked for; the digits are as tall as fills it. */
          var digitHeight = Math.max(2, Math.round(box / fill));
          return renderStrip(image, sheet.boxes, digits, digitHeight, colour, sheet.id, onPlate, box, ink || null, customization);
        });
      })
      .catch(function () { return null; });
    strips[key] = pending;
    return pending;
  };

  BTG.numberPresetPicture=async function(sheet,c,plateColour){
    var image=await loadSheet(sheet.url),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    var ctx=canvas.getContext('2d'),filter=c.plate!=='none'&&plateColour&&needsDarkInk(plateColour)&&!c.keepInk?'brightness(0)':'';if(c.hue)filter+=(filter?' ':'')+'hue-rotate('+Number(c.hue)+'deg)';ctx.filter=filter||'none';ctx.drawImage(image,0,0);ctx.filter='none';
    var pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
    (c.overlays||[]).forEach(function(rule){var from=channelsOf(rule.from),to=channelsOf(rule.to);for(var k=0;k<pixels.data.length;k+=4){if(!pixels.data[k+3])continue;var distance=Math.hypot(pixels.data[k]-from[0],pixels.data[k+1]-from[1],pixels.data[k+2]-from[2]),mix=Math.max(0,Math.min(1,(rule.tolerance+rule.softness-distance)/Math.max(1,rule.softness)));for(var ch=0;ch<3;ch++)pixels.data[k+ch]=Math.round(pixels.data[k+ch]*(1-mix)+to[ch]*mix);}});
    if(c.ink){var ink=channelsOf(c.ink);for(var k=0;k<pixels.data.length;k+=4){pixels.data[k]=ink[0];pixels.data[k+1]=ink[1];pixels.data[k+2]=ink[2];}}
    ctx.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
  };

  /**
   * A slot for a car's number.
   *
   * Returns the empty span a page puts in its markup, or an empty string when the number is not set — a team with no
   * number draws nothing at all rather than a placeholder. `BTG.numberSlotHydrate` fills the slots afterwards, once
   * each sheet's picture has loaded.
   *
   * `platePx` is the side of the badge in pixels: the room the number takes on the page. It is given to the slot up
   * front so the row it sits in does not jump when the picture arrives.
   */
  BTG.numberSlot = function (number, team, platePx, className, plate, seat, year) {
    var digits = digitsOf(number);
    if (!digits.length) return '';
    if (BTG.numberStyleFor(team,seat,year)==='hidden') return '';
    var box = plateSide(platePx);
    /* A slot that is filled rather than plated is marked, so the picture drawn for it carries the digits alone. */
    var onPlate = plate !== false;
    return '<span class="drv-num ' + (className || '') + '" data-drv-num="' + digits.join('') + '"'
      + ' data-drv-team="' + (team == null ? '' : String(team).replace(/"/g, '&quot;')) + '"'
      + ' data-drv-size="' + box + '"'
      + (seat ? ' data-drv-seat="'+String(seat).replace(/[^a-z0-9]/g,'')+'"' : '')
      + ' data-drv-year="'+BTG.numberYear(year)+'"'
      + (onPlate ? '' : ' data-drv-plate="0"')
      + ' style="width:' + box + 'px;height:' + box + 'px;font:italic 800 '+Math.round(box*.65)+'px sans-serif;">'+digits.join('')+'</span>';
  };

  /** Fill every number slot under `root`. Safe to call after any render. */
  BTG.numberSlotHydrate = async function (root) {
    BTG.numberStampCss();
    var scope = root || document;
    var slots = scope.querySelectorAll('.drv-num[data-drv-num]:not([data-drv-done])');
    var needsCatalogue=Array.prototype.some.call(slots,function(slot){
      var team=slot.getAttribute('data-drv-team'),year=BTG.numberYear(slot.getAttribute('data-drv-year'));
      var seat=slot.getAttribute('data-drv-seat')||BTG.numberSeatFor(team,slot.getAttribute('data-drv-num'),null,year);
      var style=BTG.numberStyleFor(team,seat,year);
      return style!=='auto'&&style!=='plain'&&style!=='hidden'&&!BTG.numberSheetByStyle(style,team,year);
    });
    if(needsCatalogue)await BTG.discoverNumberSheets();
    var jobs = [];
    Array.prototype.forEach.call(slots, function (slot) {
      slot.setAttribute('data-drv-done', '1');
      var digits = digitsOf(slot.getAttribute('data-drv-num'));
      var team = slot.getAttribute('data-drv-team') || null;
      var size = Number(slot.getAttribute('data-drv-size')) || 16;
      var year=BTG.numberYear(slot.getAttribute('data-drv-year'));
      var seat=slot.getAttribute('data-drv-seat')||BTG.numberSeatFor(team,digits.join(''),null,year);
      var numberStyle = BTG.numberStyleFor(team,seat,year);
      if (numberStyle === 'hidden') { slot.style.display='none'; return; }
      function plainNumber(){
        slot.textContent=digits.join('');slot.style.color=BTG.numberCustomizationFor(team,seat,year).ink||'inherit';slot.style.font='italic 800 '+Math.round(size*.65)+'px sans-serif';
        slot.dataset.drvFallback='plain';
      }
      if (numberStyle === 'plain') { plainNumber(); return; }
      var sheet = BTG.numberSheetFor(team, year, undefined, seat);
      if (!sheet) { plainNumber(); return; }
      var customization = BTG.numberCustomizationFor(team,seat,year);
      var colour = BTG.teamPlateColour(team);
      if (customization.plate === 'secondary' && BTG.DBCache && BTG.DBCache.teamColorRgb) {
        var secondary = BTG.DBCache.teamColorRgb(team, true);
        if (secondary) colour = 'rgb(' + secondary + ')';
      }
      var onPlate = slot.getAttribute('data-drv-plate') !== '0' && customization.plate !== 'none';
      jobs.push(BTG.numberStrip(sheet, digits, size, colour, onPlate, null, customization).then(function (strip) {
        if (!strip) { plainNumber(); slot.removeAttribute('data-drv-done'); return; }
        var img = document.createElement('img');
        img.src = strip.url;
        img.alt = digits.join('');
        slot.innerHTML = '';
        slot.appendChild(img);
      }).catch(function(){plainNumber();slot.removeAttribute('data-drv-done');}));
    });
    return Promise.all(jobs);
  };
})();
