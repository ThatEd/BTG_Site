(function(){'use strict';
const NAME_REFERENCE='SWANSSON',DIVIDER_Y_RATIO=5/12;
const quoteMeasureCtx=document.createElement('canvas').getContext('2d'),LOGO_ART_CACHE=new Map();
function darkenHex(hex, factor) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return '#' + [r,g,b].map(v => Math.round(v*factor).toString(16).padStart(2,'0')).join('');
}
function hexToRgb(hex) {
  return { r:parseInt(hex.slice(1,3),16), g:parseInt(hex.slice(3,5),16), b:parseInt(hex.slice(5,7),16) };
}
function hexToRgba(hex, alpha) {
  const c = hexToRgb(hex); return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}
function rgbToHex(r,g,b) {
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}

/* ── colour contrast helpers ────────────────────────────── */
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(a, b) {
  const la = relativeLuminance(a), lb = relativeLuminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
function hslOf(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s, l };
}

/** Pick a readable text colour: prefer Color 2 when it reads well and isn't a
    dull mid-grey; otherwise Color 1; otherwise white. The 2.0 threshold keeps
    deep accent colours (e.g. ART red) while rejecting near-invisible greys. */
function bestTextColor(main, secondary, bg) {
  const { s, l } = hslOf(secondary);
  const crSecondary = contrastRatio(secondary, bg);
  const crMain = contrastRatio(main, bg);
  if (crSecondary >= 2.0 && !(s < 0.15 && l < 0.8)) return secondary;
  if (crMain >= 3.0) return main;
  return '#ffffff';
}

function waveFillColor(stripeHex, bgHex) {
  const {r,g,b} = hexToRgb(stripeHex);
  const rn=r/255, gn=g/255, bn=b/255;
  const max=Math.max(rn,gn,bn), min=Math.min(rn,gn,bn), delta=max-min;
  let h=0;
  if (delta!==0) {
    if (max===rn) h=((gn-bn)/delta)%6;
    else if (max===gn) h=(bn-rn)/delta+2;
    else h=(rn-gn)/delta+4;
    h*=60; if(h<0) h+=360;
  }
  const l=(max+min)/2, s=delta===0?0:delta/(1-Math.abs(2*l-1));
  const stripeL=l*100, stripeS=s*100;
  const bg=hexToRgb(bgHex);
  const bgL=(Math.max(bg.r,bg.g,bg.b)+Math.min(bg.r,bg.g,bg.b))/(2*255)*100;
  const isNeutral=stripeS<10;
  if (isNeutral) {
    const neutralL=stripeL<=28?Math.max(44,Math.min(76,stripeL*1.9+24)):Math.max(12,Math.min(24,stripeL*0.31));
    let adj=neutralL; const md=stripeL<=28?14:18;
    if (Math.abs(adj-bgL)<md) adj=bgL<50?Math.min(76,bgL+md):Math.max(12,bgL-md);
    return `hsl(0 0% ${Math.round(adj)}%)`;
  }
  const isVeryDark=stripeL<=28;
  let wH=h, wS, wL;
  if (!isVeryDark) {
    if (h>=150&&h<190) wH=(h+20)%360; else if (h>=190&&h<=240) wH=(h+7)%360;
    const bb=(h>=190&&h<=240)?8:0;
    wS=Math.max(22,Math.min(50,stripeS*0.44+bb)); wL=Math.max(12,Math.min(24,stripeL*0.31));
  } else {
    if (stripeS<10) { wH=0;wS=0;wL=Math.max(44,Math.min(76,stripeL*1.9+24)); }
    else { wH=(h+2)%360; wS=Math.max(20,Math.min(78,stripeS*0.62+8)); wL=Math.max(36,Math.min(72,stripeL*1.55+14)); }
  }
  const mcd=isVeryDark?14:18;
  if (Math.abs(wL-bgL)<mcd) wL=bgL<50?Math.min(isVeryDark?72:24,bgL+mcd):Math.max(isVeryDark?36:12,bgL-mcd);
  return `hsl(${Math.round(wH)} ${Math.round(wS)}% ${Math.round(wL)}%)`;
}

function withAlpha(color, alpha) {
  const hm=color.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if (hm) return `hsla(${hm[1]}, ${hm[2]}%, ${hm[3]}%, ${alpha})`;
  const xm=color.match(/^#([\da-f]{6})$/i);
  if (xm) { const c=hexToRgb(color); return `rgba(${c.r},${c.g},${c.b},${alpha})`; }
  return color;
}

/* ─── text helpers ──────────────────────────────────────── */
function fittedNameSize(ctx, name, baseSize, fontFamily) {
  const n=(name||'DRIVER').toUpperCase();
  ctx.font=`700 ${baseSize}px ${fontFamily}`;
  const maxW=ctx.measureText(NAME_REFERENCE).width;
  const nW=ctx.measureText(n).width;
  if (nW<=maxW) return baseSize;
  return Math.max(baseSize*0.55, baseSize*(maxW/nW));
}

function getWrappedLines(ctx, text, maxW) {
  const words=text.split(' ');
  const lines=[];
  let line='';
  for (let i=0;i<words.length;i++) {
    const word=words[i];
    if (ctx.measureText(word).width > maxW) {
      if (line) { lines.push(line); line=''; }
      let charLine='';
      for (const char of word) {
        const test=charLine+char;
        if (ctx.measureText(test).width > maxW && charLine) {
          lines.push(charLine);
          charLine=char;
        } else {
          charLine=test;
        }
      }
      if (charLine) line=charLine;
    } else {
      const test=line+(line?' ':'')+word;
      if (ctx.measureText(test).width>maxW && line) { lines.push(line); line=word; }
      else line=test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function wrapTextCanvas(ctx, text, x, y, maxW, lineH) {
  const lines=getWrappedLines(ctx,text,maxW);
  lines.forEach(l=>{ ctx.fillText(l,x,y); y+=lineH; });
}

/* ─── logo helpers ──────────────────────────────────────── */
// Find the bounding box of the actually-visible art inside a logo file. Many
// logos ship with lots of transparent padding around the art, which makes them
// render much smaller (and float higher) than their filesize suggests.
function logoArtBounds(img) {
  const src = img && (img.currentSrc || img.src);
  if (src && LOGO_ART_CACHE.has(src)) return LOGO_ART_CACHE.get(src);
  let b = null;
  try {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (iw > 0 && ih > 0) {
      const c = document.createElement('canvas');
      c.width = iw; c.height = ih;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, iw, ih).data;
      let top = -1, bottom = -1, left = -1, right = -1;
      for (let y = 0; y < ih; y++) {
        const row = y * iw;
        for (let x = 0; x < iw; x++) {
          if (d[(row + x) * 4 + 3] > 8) {
            if (top === -1) top = y;
            bottom = y;
            if (left === -1 || x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      if (top !== -1) b = { top, bottom, left, right };
    }
  } catch (_) { /* fall back to full image below */ }
  if (!b) b = { top: 0, bottom: (img.naturalHeight || img.height || 1) - 1, left: 0, right: (img.naturalWidth || img.width || 1) - 1 };
  if (src) LOGO_ART_CACHE.set(src, b);
  return b;
}

function loadImage(url) {
  return new Promise((resolve,reject)=>{
    const img=new Image(); img.crossOrigin='anonymous';
    img.onload=()=>resolve(img); img.onerror=()=>reject(new Error('load failed'));
    img.src=url;
  });
}

/* ─── seeded wave ───────────────────────────────────────── */
function seededRand(seed) {
  let s=seed>>>0; return ()=>{ s=(Math.imul(1664525,s)+1013904223)>>>0; return s/0x100000000; };
}
function computeSeed(card) {
  const combined=card.messages.map(m=>m.quote).join('')+card.carNum+card.label+card.mainC;
  let h=0x811c9dc5;for(let i=0;i<combined.length;i++){h^=combined.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0;}return h;
}
function generateBars(seed,count) {
  const rand=seededRand(seed);
  const hr=seededRand((seed^Math.imul(new Date().getHours()+1,2654435761))>>>0);
  const raw=[];
  for(let i=0;i<count;i++){
    const r=rand(); let v;
    if(r<0.12) v=0.08+rand()*0.10;
    else if(r<0.30) v=0.20+rand()*0.15;
    else if(r<0.55) v=0.38+rand()*0.20;
    else if(r<0.78) v=0.58+rand()*0.22;
    else v=0.80+rand()*0.20;
    raw.push(v);
  }
  const sm=raw.map((v,i)=>v*0.6+raw[(i-1+count)%count]*0.2+raw[(i+1)%count]*0.2);
  return sm.map((v,i)=>{ const t=i/(count-1); return v*(0.25+0.75*Math.sin(t*Math.PI))*0.7*(1+((hr()*2-1)*0.03)); });
}
function drawWave(ctx,W,H,color,bars) {
  const ZONE_H=H*0.415, FLOOR=Math.round(H*DIVIDER_Y_RATIO), SW=W/bars.length;
  ctx.save(); ctx.globalAlpha=1;
  for(let i=0;i<bars.length;i++){
    const bh=bars[i]*ZONE_H, yTop=Math.round(FLOOR-bh);
    const ss=Math.floor(i*W/bars.length), se=i===bars.length-1?W:Math.floor((i+1)*W/bars.length);
    const sw2=Math.max(1,se-ss), dw=Math.min(Math.max(1,Math.round(SW*1.4)),sw2);
    const x0=ss+Math.floor((sw2-dw)/2), x1=x0+dw;
    const grad=ctx.createLinearGradient(0,yTop,0,FLOOR);
    grad.addColorStop(0,withAlpha(color,0.2)); grad.addColorStop(0.3,withAlpha(color,1)); grad.addColorStop(1,withAlpha(color,1));
    ctx.fillStyle=grad; ctx.fillRect(x0,yTop,x1-x0,Math.ceil(bh));
  }
  ctx.restore();
}

/* ─── format helpers ────────────────────────────────────── */
function formatRadioQuote(text) {
  const n=(text||'...').trim().replace(/^\"+|\"+$/g,'');
  return `"${n.toUpperCase()}"`;
}

/* ─── global quote size helper (NO MINIMUM, ALLOW INFINITE SHRINK) ── */
function computeGlobalQuoteSize(messages, maxWidth, totalBlockH, totalMessages, sc) {
  const maxSize = 24 * sc;
  const gap = 4 * sc;
  const zoneH = (totalBlockH - (totalMessages - 1) * gap) / totalMessages;
  const usableH = zoneH - Math.round(2 * sc);
  for (let size = maxSize; size >= 1; size -= 1) {
    const lineHeight = size * 1.2;
    quoteMeasureCtx.font = `400 ${size}px Formula1 Regular, Arial`;
    let ok = true;
    for (const msg of messages) {
      const lines = getWrappedLines(quoteMeasureCtx, msg.quote, maxWidth);
      if (lines.length * lineHeight > usableH) { ok = false; break; }
    }
    if (ok) return { size: size, lineHeight, gap };
  }
  return { size: 1, lineHeight: 1.2, gap };
}

/* ─── draw the card ─────────────────────────────────────── */
function drawCardToCanvas(ctx, card) {
  const W = card.W, H = card.H, sc = W / 360;
  const divY = Math.round(H * DIVIDER_Y_RATIO);

  ctx.fillStyle = card.bg;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, 0, W, H, 24 * sc);
  else ctx.rect(0, 0, W, H);
  ctx.fill();

  drawWave(ctx, W, H, waveFillColor(card.mainC, card.bg), generateBars(computeSeed(card), 20));

  const nameY = Math.round(18 * sc);   // header text stays where it belongs
  ctx.textBaseline = 'top';
  const nameSz = fittedNameSize(ctx, card.driverName, 25 * sc, 'Formula1 Bold, Arial Black, Arial');

  // Logo — a genuine 2× size, right-aligned. The art sits centered inside its
  // box, and the box bottom is anchored just above the separator so the logo
  // never crosses the divider. If a centered art would clip the header text, it
  // is nudged down only as far as needed to clear it. Tiny banner logos whose
  // files carry huge transparent padding are cropped and enlarged to fill the
  // space, so they don't look smaller than the rest.
  const logoBottom = Math.round(H * DIVIDER_Y_RATIO) - Math.round(6 * sc);
  const logoMaxW = Math.round(W * 0.5);

  // Logo first — the header text is drawn over it, so it stays readable even
  // when the logo gets close.
  if (card.logoImage) {
    const iw = card.logoImage.naturalWidth || card.logoImage.width;
    const ih = card.logoImage.naturalHeight || card.logoImage.height;
    if (iw > 0 && ih > 0) {
      const art = logoArtBounds(card.logoImage);
      const srcW = art.right - art.left + 1;
      const srcH = art.bottom - art.top + 1;
      // Bottom of the RADIO label (name sits above it) — the logo must sit
      // BELOW this line so no series logo ever overlaps the header text.
      const radioBottom = nameY + nameSz * 1.05 + Math.round(4 * sc) + Math.round(26 * sc);
      const minTop = radioBottom + Math.round(2 * sc);
      const availH = Math.max(1, logoBottom - minTop);
      const ar = srcW / srcH;
      // Wide banner logos get the compact "banner" box; tall/square logos fit
      // the space between the header text and the divider.
      const bannerW = Math.round(120 * sc);
      const bannerH = Math.round(44 * sc);
      let dispW, dispH;
      if (ar > 1.5) {
        dispW = bannerW;
        dispH = Math.round(dispW / ar);
        if (dispH > bannerH) { dispH = bannerH; dispW = Math.round(dispH * ar); }
      } else {
        dispW = logoMaxW;
        dispH = Math.round(dispW / ar);
        if (dispH > availH) { dispH = availH; dispW = Math.round(dispH * ar); }
      }
      const dx = W - Math.round(22 * sc) - dispW;
      const dy = minTop + Math.round((availH - Math.min(dispH, availH)) / 2);
      ctx.drawImage(card.logoImage, art.left, art.top, srcW, srcH, dx, dy, dispW, dispH);
    }
  } else {
    ctx.fillStyle = card.nameC; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const len = card.label.length, fsb = len > 8 ? 8 : len > 5 ? 9 : len > 3 ? 11 : 16;
    ctx.font = `700 ${Math.round(fsb * sc)}px Formula1 Regular, Arial Black, Arial`;
    ctx.fillText(card.label, W - Math.round(22 * sc) - logoMaxW / 2, (Math.round(40 * sc) + logoBottom) / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // header (on top of the logo)
  ctx.font = `900 ${Math.round(75.2 * sc)}px Octosquares, Arial Black, Arial`;
  ctx.fillStyle = card.numC; ctx.textAlign = 'left';
  ctx.fillText(card.carNum, Math.round(20 * sc), Math.round(14 * sc));
  ctx.textAlign = 'right';
  ctx.font = `700 ${nameSz}px Formula1 Bold, Arial Black, Arial`;
  ctx.fillStyle = card.nameC;
  ctx.fillText(card.driverName, W - Math.round(22 * sc), nameY);
  ctx.font = `700 ${Math.round(26 * sc)}px Formula1 Bold, Arial Black, Arial`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('RADIO', W - Math.round(22 * sc), nameY + nameSz * 1.05 + Math.round(4 * sc));
  ctx.textBaseline = 'alphabetic';

  // Main divider
  ctx.fillStyle = hexToRgba(card.stripeC, 0.45);
  ctx.fillRect(0, divY, W, Math.max(1, Math.round(2 * sc)));

  // content area
  const qLeft = Math.round(20 * sc), qRight = Math.round(20 * sc);
  const maxWidth = W - qLeft - qRight;
  const contentH = H - divY;
  const totalMessages = card.messages.length;

  const senderHeight = Math.round(28 * sc);
  const messageBlockTop = divY + senderHeight;
  const messageBlockH = contentH - senderHeight;

  if (card.teamSender) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `400 ${Math.round(11 * sc)}px Formula1 Regular, Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(card.teamSender, qLeft, divY + Math.round(6 * sc));
    ctx.textBaseline = 'alphabetic';
  }

  const globalFit = computeGlobalQuoteSize(card.messages, maxWidth, messageBlockH, totalMessages, sc);
  const gap = globalFit.gap;
  const zoneH = (messageBlockH - (totalMessages - 1) * gap) / totalMessages;

  card.messages.forEach((msg, i) => {
    const zoneTop = messageBlockTop + i * (zoneH + gap);
    const isTeam = msg.type === 'team';
    ctx.textAlign = isTeam ? 'left' : 'right';
    ctx.fillStyle = isTeam ? '#ffffff' : card.accent;
    ctx.textBaseline = 'top';
    ctx.font = `400 ${globalFit.size}px Formula1 Regular, Arial`;
    const paddingTop = Math.round(2 * sc);
    wrapTextCanvas(ctx, msg.quote, isTeam ? qLeft : W - qRight, zoneTop + paddingTop, maxWidth, globalFit.lineHeight);
  });
}


async function ready(){await Promise.all([document.fonts.load('700 32px "Formula1 Bold"'),document.fonts.load('400 32px "Formula1 Regular"'),document.fonts.load('900 80px Octosquares')]);}
window.RadioCard={ready,darkenHex,hexToRgb,hexToRgba,rgbToHex,relativeLuminance,contrastRatio,hslOf,bestTextColor,waveFillColor,withAlpha,fittedNameSize,getWrappedLines,wrapTextCanvas,logoArtBounds,loadImage,seededRand,computeSeed,generateBars,drawWave,formatRadioQuote,computeGlobalQuoteSize,drawCardToCanvas};
})();
