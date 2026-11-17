/* Native public layouts extracted from the supplied v17 renderer. */
(function(){'use strict';
function create(host,options={}){
const board=host.querySelector('.board');board.classList.add('lineup-board');
const $=s=>s==='#board'?board:host.querySelector(s),S={},LOGO='',SIL='';
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const lum=h=>{const n=parseInt(h.slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16)+.7152*f(n>>8&255)+.0722*f(n&255)};
const shade=(h,a)=>{const n=parseInt(h.slice(1),16),f=v=>Math.round(a<0?v*(1+a):v+(255-v)*a);return '#'+[n>>16,n>>8&255,n&255].map(v=>f(v).toString(16).padStart(2,'0')).join('')};
const tc=c=>lum(c)>.45?'#111':'#fff';
const K={1:7,2:4.5,3:2.95,4:2.5},LIM={2:13,3:7.6,4:6.5};
const fit=(n,d)=>Math.min(1,(LIM[d]||16)/Math.max(1,String(n).length)).toFixed(2)+'em';
function fe12Backdrop(){return '';}
function height(){const wrap=host.querySelector('.wrap'),h=board.offsetHeight;if(!h)return;const scale=options.content?host.clientWidth/1600:Math.min(host.clientWidth/1600,host.clientHeight/h);if(options.content)host.style.height=Math.ceil(h*scale)+'px';wrap.style.transform='scale('+scale+')';wrap.style.left=(host.clientWidth-1600*scale)/2+'px';wrap.style.top=(host.clientHeight-h*scale)/2+'px';}
function numbers(p){board.querySelectorAll('.num,.btg-number').forEach(el=>el.remove());board.querySelectorAll('[data-k="img"][data-t][data-d]').forEach(el=>{const d=p.teams[Number(el.dataset.t)]?.dr[Number(el.dataset.d)];el.classList.toggle('btg-vacancy',!!d?.vacant);if(!d?.num||d.numberHidden||!p.settings.editor_config?.opts?.num)return;const n=document.createElement('span');n.className='btg-number';if(d.numberImage){const im=document.createElement('img');im.src=d.numberImage;im.alt=String(d.num);n.append(im);}else{n.textContent=d.num;if(d.numberColour)n.style.color=d.numberColour;}el.append(n);});}
function logoBody(t, i){
 return t.logo?`<img src="${t.logo}" alt="">`:`<span class="box">${LOGO}<span>${esc(t.team||'TEAM '+(i+1))}</span></span>`;
}

function FE12team(i){
 const t=S.teams[i],d=t.cnt||S.d;
 let faces='',names='';
 for(let j=0;j<d;j++){
  const p=t.dr[j];
  faces+=`<div class="fe12-portrait ph" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload driver photo">${p.img?`<img src="${p.img}" alt="">`:SIL}</div>`;
  names+=`<div class="fe12-name"><span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}" style="font-size:${Math.min(1.25,3.0/d).toFixed(2)}cqw">${esc(p.first)}</span><span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}" style="font-size:${Math.min(1.38,3.05/d).toFixed(2)}cqw">${esc(p.name)}</span></div>`;
 }
 const badges=''; // per-driver rookies are inserted over their respective portraits by the option layer
 return `<div class="fe12-team" data-drivers="${d}" style="--c:${t.c};--tc:${tc(t.c)};--trim:${t.trim||t.c}"><div class="fe12-pictures"><div class="fe12-backbar"></div>${faces}<div class="fe12-logo lg" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload team logo">${logoBody(t,i)}</div></div><div class="fe12-nameplate">${names}</div>${badges}</div>`;
}
/* Flexible rows for every count: no one-card orphan, centered last row,
   and no change to card identity or edit/upload indices. */
function balancedRows(total, maxColumns, referenceRows=null){
  if(referenceRows && referenceRows.reduce((a,b)=>a+b,0)===total)return referenceRows.slice();
  const count=Math.ceil(total/maxColumns), result=Array(count).fill(maxColumns);
  let deficit=count*maxColumns-total;
  for(let i=count-1;i>=0&&deficit;i--){
    const removable=Math.min(deficit, result[i]-2);
    result[i]-=removable;deficit-=removable;
  }
  // Not needed for 4-14 teams, but cover unusual future minima.
  if(deficit){for(let i=count-1;i>=0&&deficit;i--){if(result[i]>1){result[i]--;deficit--;}}}
  return result;
}
function renderFE12(b){
 b.className=`board fe12${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');
 // Preserve the supplied reference's 4/4/2 arrangement at 10 teams, but
 // adapt for small and large rosters without empty edge columns or orphan cards.
 const cap=S.n<=4?2:S.n<=6||S.n===9?3:4;
 const pattern=S.n===10?[4,4,2]:balancedRows(S.n,cap);
 const rows=pattern.length,span=24/cap;
 b.style.setProperty('--fe12-card-height',(rows===2?15.5:rows===3?10.6:8.0)+'cqw');
 b.style.setProperty('--fe12-card-gutter',(cap===2?3:cap===3?1.8:1.05)+'cqw');
 b.style.setProperty('--fe12-top',rows===2?'29%':'25.5%');
 b.style.setProperty('--fe12-bottom',rows===2?'7%':rows===3?'6.5%':'4.0%');
 let html='',index=0;
 for(let row=0;row<rows;row++){
   const amount=pattern[row],start=(24-amount*span)/2+1;
   for(let j=0;j<amount;j++){
     const pos=start+j*span;
     html+=`<div class="fe12-slot" data-team-index="${index}" style="grid-row:${row+1};grid-column:${pos} / span ${span}">${FE12team(index++)}</div>`;
   }
 }
 b.innerHTML=fe12Backdrop()+`${S.opts.hero&&S.hero?`<img class="fe12-bg-image" src="${S.hero}" alt="" draggable="false">`:''}<div class="fe12-header"><div class="title-year" id="year" contenteditable="true" spellcheck="false">${esc(S.year||'SEASON 12')}</div><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title)}</div></div><div class="fe12-series ${S.slogo?'':'empty'}" role="button" tabindex="0" data-k="slogo" aria-label="Upload Formula E series logo">${S.slogo?`<img src="${S.slogo}" alt="">`:'SERIES LOGO'}</div><div class="fe12-grid" style="grid-template-rows:repeat(${rows},minmax(0,1fr))">${html}</div><button class="fe12-bg-action" type="button" data-k="hero" aria-label="Upload Formula E background">${S.hero?'Change background':'Add race background'}</button>`;
}



function team(i,cols,col,center,orb){
  const t=S.teams[i],d=t.cnt||S.d,o=S.opts,indy=S.preset==='indy',below=S.logo==='below';
  const uniformOutboard=S.logo==='auto'&&!S.support&&S.teams.slice(0,S.n).some(t=>(t.cnt||S.d)%2!==0);
  const mid=d%2===0&&!uniformOutboard;
  const right=center?false:(cols===2?col===1:col===cols-1);
  const li=below?-1:(mid?d/2:(right?d:0));              // logo slot among the columns; -1 = below the row
  const tr=[];for(let s=0;s<(below?d:d+1);s++)tr.push(s===li?'.85fr':'1fr');
  const sc=below||mid?'1/-1':(right?'1/-2':'2/-1');
  const singleSupport=S.support&&d===1;
  // Match a driver's column width to a two-person card, including its logo column.
  const cardWidth=singleSupport?1.85/2.85:Math.min(1,d/S.d);
  const k=indy?(100/(d*8.6)).toFixed(3):singleSupport?K[2]/cardWidth:K[d];           // indy: 1em = one driver column / 8.6, so cards match across teams
  const lx=(orb&&!center&&!below&&!mid)?(right?1:-1)*45/(d+.9):0;   // odd count: logo sits at one edge, so nudge the card to keep the drivers on the arc
  let h=`<div class="team" style="--lx:${lx.toFixed(2)};--w:${cardWidth.toFixed(4)};--c:${t.c};--c2:${shade(t.c,-.3)};--tc:${tc(t.c)}"><div class="g" style="--k:${k};grid-template-columns:${tr.join(' ')}">`;
  if(o.band)h+='<div class="band"></div>';
  const splits=(o.splits&&(S.preset==='f1'||S.preset==='f3'))?
    Array.from({length:d-1},(_,j)=>{
      const edge=j+1;
      const pos=below||!mid?100*edge/d:
        100*(edge+(edge===d/2?.425:(edge>d/2?.85:0)))/(d+.85);
      return `<span class="driver-split" style="--split-position:${pos.toFixed(4)}%" aria-hidden="true"></span>`;
    }).join(''):'';
  h+=`<div class="strip" style="grid-column:${sc}">${splits}</div>`;
  h+=`<div class="lg ${below?'below':(o.band?'inb':'')}" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload logo for team ${i+1}" style="${below?'':`grid-column:${li+1}`}">${t.logo?`<img src="${t.logo}" alt="">`:`<span class="box">${LOGO}Logo</span>`}</div>`;
  for(let j=0;j<d;j++){
    const c=(below?j:(j>=li?j+1:j))+1,p=t.dr[j],num=p.num!=null?p.num:i*d+j+1;
    h+=`<div class="ph" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload photo for driver ${j+1}" style="grid-column:${c}">${p.img?`<img src="${p.img}" alt="">`:SIL}${o.num?`<span class="num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(num)}</span>`:''}</div>`;
    // Rookie tag remains inside its nameplate's positioning context; it never adds a grid track.
    const tag=o.rookie?`<button class="rk ${p.rookie?'on':''}" data-k="rookie" data-t="${i}" data-d="${j}" aria-label="${p.rookie?'Remove rookie tag from':'Mark as rookie:'} ${esc(p.name)}" title="${p.rookie?'Remove rookie status':'Mark as rookie'}" aria-pressed="${!!p.rookie}">${p.rookie?'ROOKIE':'+'}</button>`:'';
    h+=`<div class="nm" style="grid-column:${c}">${o.flag?`<span class="fl" role="button" tabindex="0" data-k="flag" data-t="${i}" data-d="${j}" aria-label="Upload flag">${p.flag?`<img src="${p.flag}" alt="">`:''}</span>`:''}${indy?`<span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.first||'')}</span>`:''}<span class="t" contenteditable="true" spellcheck="false" style="font-size:${fit(p.name,d)}" data-t="${i}" data-d="${j}">${esc(p.name)}</span>${tag}</div>`;
  }
  return h+'</div></div>';
}

function titleBlock(inline,rows){
  const st=inline?'':`grid-column:2;grid-row:1/span ${rows}`;
  return `<div class="tb ${inline?'inline':''}" style="${st}">${S.opts.slogo?`<div class="sl" role="button" tabindex="0" data-k="slogo" aria-label="Upload series logo">${S.slogo?`<img src="${S.slogo}" alt="">`:'Series logo'}</div>`:''}
  <div><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(inline?S.title.replace(/\n/g,' '):S.title)}</div><div class="sub" id="sub" contenteditable="true" spellcheck="false" style="margin-top:.8cqw">${esc(S.sub)}</div></div>
  ${S.opts.hero?`<div class="hero" role="button" tabindex="0" data-k="hero" aria-label="Upload centre image">${S.hero?`<img src="${S.hero}" alt="">`:'Hero image'}</div>`:''}</div>`;
}



function renderF2(b){
 const cols=4, rows=Math.ceil((S.n+1)/cols);
 const anyOdd=S.teams.slice(0,S.n).some(t=>(t.cnt||S.d)%2!==0);
 b.className=`board f2-native${anyOdd?' f2-any-odd':''}${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');
 b.style.setProperty('--f2-rows',rows);
 // Explicit geometry avoids invalid calc() multiplication and empty board space.
 b.style.height=Math.round(b.clientWidth*(rows*16.2+4.8)/100)+'px';
 const editable='contenteditable="true" spellcheck="false"';
 const logo=`<div class="f2-brandmark" role="button" tabindex="0" data-k="slogo" aria-label="Upload Formula 2 championship logo">${S.slogo?`<img src="${S.slogo}" alt="Formula 2 logo">`:'<span class="f2-glyph">F<span>2</span></span><small>FIA FORMULA 2<br>CHAMPIONSHIP</small>'}</div>`;
 let h=`<div class="f2-stage"><div class="f2-tile f2-titletile" style="grid-column:1/span 2;grid-row:1"><div class="f2-heading">${logo}<div class="f2-titletext" id="ttl" ${editable}>${esc(S.title)}</div><div class="f2-yeartxt" id="sub" ${editable}>${esc(S.sub)}</div></div></div>`;
 for(let i=0;i<S.n;i++){
   const t=S.teams[i],d=t.cnt||S.d;
   const palette=Array.from({length:d},(_,j)=>j%2?shade(t.c,-.09):t.c);
   let drivers='';
   for(let j=0;j<d;j++){
     const p=t.dr[j],num=p.num??(i*4+j+1);
     const rtag=S.opts.rookie?`<button class="rk f2-rookie${p.rookie?' on':''}" type="button" data-k="rookie" data-t="${i}" data-d="${j}" aria-label="${p.rookie?'Remove rookie status':'Mark as rookie'}: ${esc(p.name)}" aria-pressed="${!!p.rookie}" title="${p.rookie?'Remove rookie status':'Mark as rookie'}">${p.rookie?'ROOKIE':'+'}</button>`:'';
     const flag=S.opts.flag?`<span class="f2-flag" role="button" tabindex="0" data-k="flag" data-t="${i}" data-d="${j}" aria-label="Upload flag for ${esc(p.name)}">${p.flag?`<img src="${p.flag}" alt="">`:`<span>${esc(p.nation||'🏁')}</span>`}</span>`:'';
     drivers+=`<div class="f2-driver" data-t="${i}" data-d="${j}" style="--c:${palette[j]};--ink:${tc(palette[j])}">
       <div class="f2-face ph" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload portrait for ${esc(p.name)}">${p.img?`<img src="${p.img}" alt="">`:SIL}</div>
       <div class="f2-label">${flag}<span class="t" ${editable} data-t="${i}" data-d="${j}">${esc(p.name)}</span></div>
       ${S.opts.num?`<span class="num f2-number" ${editable} data-t="${i}" data-d="${j}">${esc(num)}</span>`:''}
       ${rtag}
     </div>`;
   }
   const teamLogo=t.logo?`<img src="${t.logo}" alt="">`:`<span class="f2-logo-placeholder">${esc((t.team||'TEAM').replace(/ RACING$/i,''))}</span>`;
   const cidx=i+1,row=Math.floor(cidx/4),col=cidx%4;
   const amount=Math.min(4,S.n+1-row*4),track=amount===4?1+2*col:5-amount+2*col;
   h+=`<div class="f2-tile f2-team" data-index="${i}" data-count="${d}" style="grid-column:${track}/span 2;grid-row:${row+1};--c:${t.c};--tc:${tc(t.c)};--d:${d}">
     <div class="f2-livery" aria-hidden="true"></div>
     <div class="f2-heads">${drivers}</div>
     <div class="f2-teamlogo" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload logo for ${esc(t.team||'team')}">${teamLogo}</div>
     
   </div>`;
 }
 b.innerHTML=h+'</div>';
}

function fitOrbit(){
  const b=$('#board');if(!b.classList.contains('orbit')||!b.clientWidth)return;
  b.style.setProperty('--s',1);
  const bw=b.clientWidth;let hm=0;
  b.querySelectorAll('.team').forEach(t=>hm=Math.max(hm,t.offsetHeight));
  const avail=((56.25-(S.support?8.4:4.8)-(S.rows-1)*1.2)/S.rows)*bw/100;
  b.style.setProperty('--s',Math.min(1,avail/hm*.97).toFixed(3));
}

function renderLayout(){const b=board,orbit=S.layout==='orbit';if(S.preset==='f2'){renderF2(b);return;}if(S.preset==='fe12'){renderFE12(b);return;}
  if(S.n<4){b.className=`board ${S.bg} f1 pv support-small`;b.style.removeProperty('--tw');b.style.removeProperty('--s');b.innerHTML=titleBlock(true)+`<div class="grid support-small-grid" style="grid-template-columns:repeat(${Math.min(S.n,2)},minmax(0,1fr))">${S.teams.map((t,i)=>`<div class="cell">${team(i,2,i%2,false,false)}</div>`).join('')}</div>`;return;}
  b.className=`board ${S.bg} ${S.preset}${S.pv?' pv':''}${orbit?' orbit':''}${orbit&&S.n%2?' has-orphan':''}`;
  let h='';
  if(orbit){
    const odd=S.n%2===1,sn=S.n-(odd?1:0),m=S.support?Math.ceil(S.n/2):sn/2,B=10,den=1-Math.sin(Math.PI*.5/m),ind=S.preset==='indy';
    S.rows=m;
    b.style.setProperty('--tw',((100-12-4.4)*(ind?.30:.37)).toFixed(2));   // side-cell width in board cqw
    h+=`<div class="grid orbit" style="grid-template-columns:${ind?'30fr 40fr 30fr':'37fr 26fr 37fr'};grid-template-rows:repeat(${m},1fr)">`+titleBlock(false,odd?m-1:m);
    for(let i=0;i<sn;i++){
      const col=i%2,row=i>>1;
      // Odd-team layouts reserve the lower center for the final team.  The last
      // left and right teams move outward so that none of the three overlap.
      const o=(odd&&row===m-1)?-B*.66:B*(1-Math.sin(Math.PI*(row+.5)/m))/den;
      h+=`<div class="cell ${col?'r':'l'}" style="grid-column:${col?3:1};grid-row:${row+1};--o:${(col?-o:o).toFixed(2)}">${team(i,2,col,false,true)}</div>`;
    }
    if(odd)h+=`<div class="cell c orbit-orphan" style="grid-column:1/-1;grid-row:${m};--o:0">${team(S.n-1,2,0,true,true)}</div>`;
    b.innerHTML=h+'</div>';fitOrbit();return;
  }
  b.style.removeProperty('--tw');b.style.removeProperty('--s');
  const cols=S.cols||(S.n>10?3:2);
  if(cols===3){
    // A six-track grid allows 3 / 2 / 1 cards to be truly centered without
    // changing the underlying team widths or leaving an empty right corner.
    const pattern=balancedRows(S.n,3);
    h=titleBlock(true)+`<div class="grid standard-three">`;
    let idx=0;
    pattern.forEach((amount,row)=>{
      const start=amount===3?1:amount===2?2:3;
      for(let j=0;j<amount;j++){
        const i=idx++,col=start+2*j;
        h+=`<div class="cell" style="grid-column:${col} / span 2;grid-row:${row+1}">${team(i,3,Math.min(j,2),false,false)}</div>`;
      }
    });
  }else{
    // In two-column layouts the last unpaired team uses its own centered row
    // below the central title, exactly like the 11-team orbit treatment.
    const odd=S.n%2===1, pairs=Math.floor(S.n/2),rows=pairs+(odd?1:0);
    h=`<div class="grid standard-two" style="grid-template-columns:1fr 19% 1fr">`+titleBlock(false,odd?pairs:rows);
    for(let i=0;i<S.n-(odd?1:0);i++){
      const right=i%2,row=Math.floor(i/2)+1;
      h+=`<div class="cell ${right?'r':'l'}" style="grid-column:${right?3:1};grid-row:${row}">${team(i,2,right,false,false)}</div>`;
    }
    if(odd)h+=`<div class="cell c standard-orphan" style="grid-column:1/-1;grid-row:${rows}">${team(S.n-1,2,0,true,false)}</div>`;
  }
  b.innerHTML=h+'</div>';

}
  function names(){board.querySelectorAll('.nm .t,.f2-label .t,.fe12-name .f,.fe12-name .t,.f2-titletext,.f2-yeartxt').forEach(function(el){var available=el.clientWidth;if(!available)return;var size=parseFloat(getComputedStyle(el).fontSize);if(el.scrollWidth>available)el.style.setProperty('font-size',Math.max(5,size*available/el.scrollWidth*.96)+'px','important');});}
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

const instance={render:function(p){const c=p.settings,saved=c.editor_config||{};Object.assign(S,{preset:c.layout,layout:c.layout==='f1'?'orbit':'grid',support:!!p.support,logo:'auto',cols:0,teams:p.teams,n:p.teams.length,d:2,pv:true,bg:c.background,slogo:p.logo,title:p.support?'AFFILIATES LINE-UP':saved.title||c.title,sub:p.seasonLabel,year:p.seasonLabel,opts:{num:0,flag:c.layout==='f2',rookie:0,band:0,slogo:1,hero:0}});board.style.height='';renderLayout();const b=board;b.classList.add('lineup-board');if(p.support)b.classList.add('support-map');
    b.dataset.btgSeries=p.series;b.dataset.btgYear=String(p.year);b.style.visibility='visible';
    b.classList.add('btg-'+c.background);b.style.setProperty('--btg-accent',c.accent);
    b.querySelectorAll('.fe12-team').forEach(function(el,i){var colour=p.teams[i].c;el.style.setProperty('--name-ink',lum(colour)>.4?shade(colour,-.7):colour);});
    if(c.layout==='f1'){var sub=b.querySelector('#sub'),tb=b.querySelector('.tb');if(sub){sub.textContent=p.seasonLabel;if(tb)tb.insertBefore(sub,tb.children[1]);}}
    b.querySelectorAll('input,button').forEach(function(el){el.remove();});b.querySelectorAll('[role="button"]').forEach(function(el){el.removeAttribute('role');});
    b.querySelectorAll('[contenteditable]').forEach(function(el){el.removeAttribute('contenteditable');});
    b.querySelectorAll('[tabindex]').forEach(function(el){el.removeAttribute('tabindex');});
    b.querySelectorAll('[data-k="logo"][data-t] img').forEach(function(img){var team=img.closest('[data-t]').dataset.t;logoTreatment(img,p.teams[Number(team)],c.layout);});
    if(c.layout==='f2')b.querySelectorAll('.f2-label .f2-flag').forEach(function(flag){flag.closest('.f2-driver').appendChild(flag);});
    b.querySelectorAll('.num,.btg-number').forEach(function(el){el.remove();});
    numbers(p);
    if(p.support){
      b.querySelectorAll('[data-k="img"][data-t][data-d]').forEach(function(photo){
        const ti=Number(photo.dataset.t),di=Number(photo.dataset.d),d=p.teams[ti]?.dr[di];if(!d?.role)return;photo.dataset.driverName=d.fullName||[d.first,d.name].filter(Boolean).join(' ');photo.dataset.teamId=p.teams[ti].id;
        let target;
        if(c.layout==='f2')target=photo.closest('.f2-driver');
        else{const selector=c.layout==='fe12'?'.fe12-name .t':'.nm .t';const label=Array.from(b.querySelectorAll(selector)).find(el=>Number(el.dataset.t)===ti&&Number(el.dataset.d)===di);target=label?.parentElement;}
        if(target){const tag=document.createElement('span');tag.className='lineup-role';tag.textContent=d.role;tag.dataset.role=d.role.toLowerCase();target.appendChild(tag);}
      });
    }
    // Use real links for names and portraits, including supporting drivers.
    function profileLink(target,driver,team,photo){
      if(!target||driver.vacant)return;const name=driver.fullName||[driver.first,driver.name].filter(Boolean).join(' ');
      const a=document.createElement('a');a.className='lineup-driver-link'+(photo?' lineup-photo-link':'');a.href='drivers.html?'+new URLSearchParams({driver:name,series:p.series,season:p.year}).toString();a.setAttribute('aria-label','View '+name+' profile');
      while(target.firstChild)a.appendChild(target.firstChild);target.appendChild(a);
    }
    b.querySelectorAll('[data-k="img"][data-t][data-d]').forEach(function(photo){const ti=Number(photo.dataset.t),di=Number(photo.dataset.d),d=p.teams[ti]?.dr[di];if(!d)return;profileLink(photo,d,p.teams[ti],true);
      const selector=c.layout==='fe12'?'.fe12-name .t':c.layout==='f2'?'.f2-label .t':'.nm .t';
      const label=Array.from(b.querySelectorAll(selector)).find(el=>Number(el.dataset.t)===ti&&Number(el.dataset.d)===di);profileLink(c.layout==='fe12'?label?.parentElement:label,d,p.teams[ti],false);
    });
    if(host.id!=='native-lineup')b.querySelectorAll('[id]').forEach(el=>el.id=host.id+'-'+el.id);

b.querySelectorAll('img').forEach(im=>{if(!im.complete)im.addEventListener('load',()=>{names();fitOrbit();height();},{once:true});});
names();height();document.fonts.ready.then(()=>{names();fitOrbit();height();});}};
const observer=new ResizeObserver(()=>{if(board.classList.contains('f2-native')){const rows=Number(board.style.getPropertyValue('--f2-rows'))||3;board.style.height=Math.round(board.clientWidth*(rows*16.2+4.8)/100)+'px';}fitOrbit();height();});observer.observe(host);instance.destroy=()=>observer.disconnect();return instance;
}
window.BTG=window.BTG||{};const main=create(document.getElementById('native-lineup'));BTG.NativeLineup={render:main.render,create:create};
})();
