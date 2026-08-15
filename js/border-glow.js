/* ═══════════════════════════════════════════════════════════════════════════
   BeTheGrid — BorderGlow (vanilla port of TFGTools BorderGlow)
   Directional team-color glow around cards, following the cursor.
   ═══════════════════════════════════════════════════════════════════════════ */

window.BTG = window.BTG || {};

/* Convert "r,g,b" → "h s l" string (for modern hsl() syntax). */
BTG.rgbToHslDeg = function(rgb) {
  if (!rgb) return '40 80 80';
  var parts = rgb.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return '40 80 80';
  var r = parts[0]/255, g = parts[1]/255, b = parts[2]/255;
  var max = Math.max(r,g,b), min = Math.min(r,g,b);
  var h = 0, s = 0, l = (max+min)/2;
  if (max !== min) {
    var d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if (max === r) h = ((g-b)/d + (g<b?6:0)) / 6;
    else if (max === g) h = ((b-r)/d + 2) / 6;
    else h = ((r-g)/d + 4) / 6;
  }
  return Math.round(h*360) + ' ' + Math.round(s*100) + ' ' + Math.round(l*100);
};

/* Read a CSS custom property from <html>. */
BTG.readCssVar = function(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

/* Build the --glow-color* opacity ladder. */
function buildGlowVars(glowColor, intensity) {
  var base = glowColor;
  var opacities = [100, 60, 50, 40, 30, 20, 10];
  var keys = ['', '-60', '-50', '-40', '-30', '-20', '-10'];
  var vars = {};
  for (var i = 0; i < opacities.length; i++) {
    vars['--glow-color' + keys[i]] = 'hsl(' + base + ' / ' + Math.min(opacities[i] * (intensity || 1), 100) + '%)';
  }
  return vars;
}

/**
 * Generate the markup for a border-glow card.
 * @param {string} inner - already-built HTML for the card body
 * @param {object} opts  - { teamColor:"r,g,b", backgroundColor:"#161618",
 *                          borderRadius:12, glowRadius:30, glowIntensity:1,
 *                          interactive:false, selected:false, className:"", css:{...} }
 * @returns {string} wrapper HTML
 */
BTG.wrapCard = function(inner, opts) {
  opts = opts || {};
  var teamRgb = opts.teamColor ? opts.teamColor.replace(/\s*,\s*/g, ' ') : '99 102 241';
  var glowColor = opts.glowColor || BTG.rgbToHslDeg(opts.teamColor) || '40 80 80';
  var glowVars = buildGlowVars(glowColor, opts.glowIntensity);

  var style = '--card-bg:' + (opts.backgroundColor || '#161618') + ';'
    + '--border-radius:' + (opts.borderRadius || 12) + 'px;'
    + '--glow-padding:' + (opts.glowRadius || 30) + 'px;'
    + '--team-rgb:' + teamRgb + ';';
  for (var k in glowVars) style += k + ':' + glowVars[k] + ';';

  var cls = 'border-glow-card';
  if (opts.interactive) cls += ' border-glow-card--interactive';
  if (opts.selected) cls += ' border-glow-card--selected';
  if (opts.className) cls += ' ' + opts.className;

  return '<div class="' + cls + '" style="' + style + '">'
    + '<span class="edge-light"></span>'
    + '<div class="border-glow-inner">' + inner + '</div>'
    + '</div>';
};

/**
 * Initialize cursor-tracking glow on all .border-glow-card elements.
 * Call after rendering, or once on DOMContentLoaded for static cards.
 */
BTG.initBorderGlow = function(root) {
  var scope = root || document;
  var cards = scope.querySelectorAll('.border-glow-card:not([data-glow-bound])');
  cards.forEach(function(card) {
    card.setAttribute('data-glow-bound', '1');
    card.addEventListener('pointermove', function(e) {
      if (card.classList.contains('border-glow-card--selected')) return;
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2, cy = rect.height / 2;
      var dx = x - cx, dy = y - cy;
      if (dx === 0 && dy === 0) return;
      var degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      card.style.setProperty('--cursor-angle', degrees.toFixed(1) + 'deg');
    });
  });
};

/**
 * Initialize the TFG-style conic cursor glow on every .dp-card element
 * (the ::after mask uses --cursor-angle). Call after rendering.
 */
BTG.initCardGlow = function(root) {
  var scope = root || document;
  var cards = scope.querySelectorAll('.dp-card:not([data-glow-bound])');
  cards.forEach(function(card) {
    card.setAttribute('data-glow-bound', '1');
    card.addEventListener('pointermove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2, cy = rect.height / 2;
      var dx = x - cx, dy = y - cy;
      if (dx === 0 && dy === 0) return;
      var degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      card.style.setProperty('--cursor-angle', degrees.toFixed(1) + 'deg');
    });
  });
};
