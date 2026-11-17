/* Keep the supplied v17 engine's reference layouts; replace only its data. */
(function(){
  'use strict';
  var style=document.createElement('style');style.textContent="@font-face{font-family:Formula1;src:url('fonts/Formula1-Regular_web_0%20(1).ttf')}@font-face{font-family:Formula1;src:url('fonts/Formula1-Bold_web_0%20(1).ttf');font-weight:700}html,body{height:100%;overflow:hidden;padding:0!important}body .wrap{position:absolute;width:1600px;max-width:none;transform-origin:top left}#board{visibility:hidden}#board.f1 .ttl,#board.f1 .sub,#board.f1 .nm,#board.f2 .f2-name,#board.f2 .f2-nameplate,#board.f2 .f2-surname,#board.f2 .f2-title,#board.f2 .ttl,#board.f2 .sub{font-family:Formula1,sans-serif!important}#board .fe12-bg-action{display:none!important}";document.head.appendChild(style);
  function height(){var wrap=document.querySelector('.wrap'),b=document.getElementById('board');var h=b.offsetHeight;if(!h)return;var scale=Math.min(innerWidth/1600,innerHeight/h);wrap.style.transform='scale('+scale+')';wrap.style.left=(innerWidth-1600*scale)/2+'px';wrap.style.top=(innerHeight-h*scale)/2+'px';}
  function names(){document.querySelectorAll('#board .nm .t,#board .f2-label .t,#board .fe12-name .f,#board .fe12-name .t,#board .f2-titletext,#board .f2-yeartxt').forEach(function(el){var available=el.clientWidth;if(!available)return;var size=parseFloat(getComputedStyle(el).fontSize);if(el.scrollWidth>available)el.style.setProperty('font-size',Math.max(5,size*available/el.scrollWidth*.96)+'px','important');});}
  var logoCache={};
  function logoTreatment(img,team,layout){
    var source=img.getAttribute('src'),key=[source,team.c,team.c2,layout].join('|');
    function finish(result){if(!img.isConnected)return;if(result.url)img.src=result.url;if(result.tint)img.dataset.teamTint=result.tint;
      if(layout==='fe12'){var card=img.closest('.fe12-team');if(card){card.style.setProperty('--logo-bg',result.background);card.dataset.logoBackground=result.background;}}
      img.dataset.logoReady='true';
    }
    function work(){
      if(logoCache[key]){finish(logoCache[key]);return;}
      try{
        var cv=document.createElement('canvas');cv.width=64;cv.height=64;var ctx=cv.getContext('2d');ctx.drawImage(img,0,0,64,64);var pixels=ctx.getImageData(0,0,64,64).data,points=[],weight=0,mono=0,light=0,maxAlpha=0;
        function luminance(r,g,b){return [r,g,b].map(function(x){x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);}).reduce(function(v,x,i){return v+x*[.2126,.7152,.0722][i];},0);}
        for(var i=0;i<pixels.length;i+=4){var alpha=pixels[i+3]/255;if(alpha<.03)continue;var r=pixels[i],g=pixels[i+1],b=pixels[i+2];weight+=alpha;light+=(r+g+b)/3*alpha;if(Math.max(r,g,b)-Math.min(r,g,b)<30)mono+=alpha;maxAlpha=Math.max(maxAlpha,pixels[i+3]);points.push([luminance(r,g,b),alpha]);}
        function score(colour){var bg=lum(colour),sum=0;points.forEach(function(p){sum+=Math.log((Math.max(bg,p[0])+.05)/(Math.min(bg,p[0])+.05))*p[1];});return Math.exp(sum/Math.max(weight,.001));}
        var result={background:team.c};
        if(layout==='fe12'&&score(team.c2)>score(team.c)*1.25)result.background=team.c2;
        var tint=(layout==='f1'||layout==='f2')&&weight&&mono/weight>.86&&light/weight>145;
        if(tint||maxAlpha<235){cv.width=img.naturalWidth;cv.height=img.naturalHeight;ctx=cv.getContext('2d');ctx.drawImage(img,0,0);
          if(maxAlpha>0&&maxAlpha<235){var image=ctx.getImageData(0,0,cv.width,cv.height);for(var j=3;j<image.data.length;j+=4)image.data[j]=Math.min(255,image.data[j]*255/maxAlpha);ctx.putImageData(image,0,0);}
          if(tint){ctx.globalCompositeOperation='source-in';ctx.fillStyle=team.c;ctx.fillRect(0,0,cv.width,cv.height);result.tint=team.c;}
          result.url=cv.toDataURL();
        }
        logoCache[key]=result;finish(result);
      }catch(e){finish({background:team.c});}
    }
    if(img.complete&&img.naturalWidth)work();else img.addEventListener('load',work,{once:true});
  }
  window.addEventListener('message',function(e){
    if(e.source!==parent||e.origin!==location.origin||e.data.type!=='btg-lineup')return;
    var p=e.data.payload,c=p.settings;
    if(!['f1','f2','fe12'].includes(c.layout)||!Array.isArray(p.teams))return;
    document.getElementById('board').style.height='';
    var custom=!!(c.editor_config&&c.editor_config.preset);
    document.documentElement.dataset.lineupReference=custom?'false':'true';
    BTGLineupEngine.apply(p);
    if(custom){
      render();var customBoard=document.getElementById('board');customBoard.dataset.btgSeries=p.series;customBoard.dataset.btgYear=String(p.year);customBoard.style.visibility='visible';
      customBoard.querySelectorAll('[contenteditable]').forEach(function(el){el.removeAttribute('contenteditable');});
      BTGLineupEngine.numbers(p);names();height();document.fonts.ready.then(function(){names();height();});return;
    }
    // Never retain reference-driver names or the original championship branding.
    render();
    var b=document.getElementById('board');
    b.dataset.btgSeries=p.series;b.dataset.btgYear=String(p.year);b.style.visibility='visible';
    b.classList.add('btg-'+c.background);b.style.setProperty('--btg-accent',c.accent);
    b.querySelectorAll('.fe12-team').forEach(function(el,i){var colour=p.teams[i].c;el.style.setProperty('--name-ink',lum(colour)>.4?shade(colour,-.7):colour);});
    if(c.layout==='f1'){var sub=b.querySelector('#sub'),tb=b.querySelector('.tb');if(sub){sub.textContent=p.seasonLabel;if(tb)tb.insertBefore(sub,tb.children[1]);}}
    b.querySelectorAll('[contenteditable]').forEach(function(el){el.removeAttribute('contenteditable');});
    b.querySelectorAll('[tabindex]').forEach(function(el){el.removeAttribute('tabindex');});
    b.querySelectorAll('[data-k="logo"][data-t] img').forEach(function(img){var team=img.closest('[data-t]').dataset.t;logoTreatment(img,p.teams[Number(team)],c.layout);});
    if(c.layout==='f2')b.querySelectorAll('.f2-label .f2-flag').forEach(function(flag){flag.closest('.f2-driver').appendChild(flag);});
    b.querySelectorAll('.num,.btg-number').forEach(function(el){el.remove();});
    BTGLineupEngine.numbers(p);
    names();height();document.fonts.ready.then(function(){names();height();});
  });
  new ResizeObserver(height).observe(document.getElementById('board'));
  var fontStyle=document.createElement('style');fontStyle.textContent='#board.f2-native .f2-label,#board.f2-native .f2-titletext,#board.f2-native .f2-yeartxt{font-family:Formula1,sans-serif!important}#board.btg-dark .fe12-back{display:none}#board.f2-native .f2-yeartxt,#board.f1 .sub{color:var(--btg-accent)!important}#board .fe12-name .t{color:var(--name-ink,#111)!important}';document.head.appendChild(fontStyle);
  var cleanStyle=document.createElement('style');cleanStyle.textContent='#board.btg-dark{background:#17181d!important}#board.btg-light{background:#f4f4f4!important}#board.btg-grey{background:#aaa!important}#board::before,#board::after,#board .band::before{display:none!important}#board .band::after{border-top:0!important}#board.f2-native .f2-teamlogo{background:transparent!important;clip-path:none!important;padding:0!important;box-shadow:none!important;filter:none!important;transform:translateX(-50%) scale(1.2)!important;overflow:visible!important}#board.f1 .lg{transform:scale(1.2)}#board .nm .t,#board .f2-label .t,#board .fe12-name .t,#board .fe12-name .f{overflow:visible!important;text-overflow:clip!important}';document.head.appendChild(cleanStyle);
  var backdropStyle=document.createElement('style');backdropStyle.textContent='#board [data-k="img"],#board [data-k="logo"]{background:transparent!important;box-shadow:none!important;border:0!important}#board.f1.btg-light{background:repeating-linear-gradient(135deg,#f4f4f4 0 .6cqw,#ececec .6cqw 1.2cqw)!important}#board.f1.btg-dark{background:repeating-linear-gradient(135deg,#17181d 0 .6cqw,#1c1e24 .6cqw 1.2cqw)!important}';document.head.appendChild(backdropStyle);
  var f2Style=document.createElement('style');f2Style.textContent="@font-face{font-family:Formula1Wide;src:url('fonts/Formula1-Wide_web_0%20(1).ttf');font-weight:700}#board .opt-logo-band{display:none!important}#board.f2-native.btg-dark{background:radial-gradient(ellipse at 55% 30%,#075a80,#03314c 70%,#021d30)!important}#board.f2-native::before{display:block!important;background:repeating-linear-gradient(125deg,#0004 0 1px,transparent 1px 5px)!important;opacity:.45}#board.f2-native .f2-titletext{font-family:Formula1Wide,Formula1,sans-serif!important;font-size:2.65cqw;font-weight:700;font-style:italic;white-space:nowrap;letter-spacing:-.04em;margin-top:1.4cqw}#board.f2-native .f2-yeartxt{font-family:Formula1Wide,Formula1,sans-serif!important;font-size:4.1cqw;font-weight:700;font-style:italic}#board.f2-native .f2-label .t{font-family:Formula1,sans-serif!important;font-weight:700;font-size:1.18cqw}#board.f2-native .f2-label{background:linear-gradient(110deg,var(--c) 0%,var(--c) 53%,#07101be6 100%);height:16%;overflow:visible}#board.f2-native .f2-livery{top:34%;height:22%;opacity:1;background:linear-gradient(100deg,transparent 0%,#fff 24%,#fff 78%,transparent 100%);clip-path:polygon(9% 0,100% 0,93% 100%,0 100%)}#board.f2-native .f2-driver>.f2-flag{position:absolute;left:8%;top:65%;width:1.65cqw;height:1.1cqw;z-index:8;transform:skew(-10deg)}#board.f2-native .f2-face img{object-fit:cover;object-position:center 14%}#board.f2-native .f2-brandmark img{max-width:90%}";document.head.appendChild(f2Style);
  var labelStyle=document.createElement('style');labelStyle.textContent='#board.f1 .nm{padding-inline:.75em!important}#board.f2-native .f2-titletext,#board.f2-native .f2-yeartxt{max-width:100%}#board .sl{border:0!important;background:transparent!important}';document.head.appendChild(labelStyle);
  var contrastStyle=document.createElement('style');contrastStyle.textContent='#board.f1 .nm{padding-inline:1.15em!important}#board .fe12-team,#board .fe12-backbar,#board .fe12-logo,#board .fe12-logo img{opacity:1!important;filter:none!important;mix-blend-mode:normal!important}#board .fe12-backbar{background:var(--logo-bg,var(--c))!important}#board.f2-native .f2-livery{top:32%;height:26%}#board.f1 [data-k=logo] img,#board.f2-native [data-k=logo] img{filter:drop-shadow(0 .4px .4px #0009)}';document.head.appendChild(contrastStyle);
  function scopeLegacy(sheet,all){
    Array.from(sheet.cssRules||[]).forEach(function(rule){if(rule.selectorText&&(all||rule.selectorText.includes('#board.f1')))rule.selectorText=rule.selectorText.split(',').map(function(selector){return 'html[data-lineup-reference="true"] '+selector;}).join(',');});
  }
  [fontStyle,cleanStyle,backdropStyle,f2Style,labelStyle,contrastStyle].forEach(function(el){scopeLegacy(el.sheet,true);});scopeLegacy(style.sheet,false);
  var seriesStyle=document.createElement('style');seriesStyle.textContent='#board.f1 .tb .sl{width:18cqw;aspect-ratio:2.4;height:7.5cqw}#board.f1 .tb>.sub{font:italic 700 2.5cqw Formula1,sans-serif;margin:0!important}#board.f1 .tb .ttl{font-size:3.8cqw}#board.fe12 .fe12-series{top:0;transform:scale(3);transform-origin:top right}';document.head.appendChild(seriesStyle);
  window.addEventListener('resize',height);
  parent.postMessage({type:'btg-lineup-ready'},location.origin);
})();
