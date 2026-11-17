// Shared v17 lineup engine, extracted from the supplied source.

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const lum=h=>{const n=parseInt(h.slice(1),16),f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(n>>16)+.7152*f(n>>8&255)+.0722*f(n&255)};
const shade=(h,a)=>{const n=parseInt(h.slice(1),16),f=v=>Math.round(a<0?v*(1+a):v+(255-v)*a);return '#'+[n>>16,n>>8&255,n&255].map(v=>f(v).toString(16).padStart(2,'0')).join('')};
const tc=c=>lum(c)>.45?'#111':'#fff';

const F1=[
 {c:'#4fd1bd',n:['Hamilton','Russell']},{c:'#1b2070',n:['Verstappen','Perez']},{c:'#f78a1d',n:['Norris','Ricciardo']},
 {c:'#0e6b58',n:['Vettel','Stroll']},{c:'#1c2b52',n:['Ocon','Alonso']},{c:'#e30613',n:['Leclerc','Sainz']},
 {c:'#27345e',n:['Gasly','Tsunoda']},{c:'#8d1b2c',n:['Bottas','Zhou']},{c:'#e2142d',n:['Magnussen','Schumacher']},{c:'#3a9ddb',n:['Albon','Latifi']}];
const F2=[
 {team:'PREMA RACING',c:'#e21823',n:['Hauger','Daruvala'],f:['Dennis','Jehan'],r:[1,0],flags:['🇳🇴','🇮🇳']},
 {team:'VIRTUOSI RACING',c:'#0076ac',n:['Doohan','Sato'],f:['Jack','Marino'],r:[1,0],flags:['🇦🇺','🇯🇵']},
 {team:'CARLIN',c:'#14298e',n:['Lawson','Sargeant'],f:['Liam','Logan'],r:[1,1],flags:['🇳🇿','🇺🇸']},
 {team:'HITECH GRAND PRIX',c:'#242a53',n:['Armstrong','Vips'],f:['Marcus','Jüri'],flags:['🇳🇿','🇪🇪']},
 {team:'ART GRAND PRIX',c:'#21252d',n:['Vesti','Pourchaire'],f:['Frederik','Théo'],r:[1,0],flags:['🇩🇰','🇫🇷']},
 {team:'MP MOTORSPORT',c:'#fa2639',n:['Drugovich','Novalak'],f:['Felipe','Clément'],r:[0,1],flags:['🇧🇷','🇫🇷']},
 {team:'CAMPOS RACING',c:'#c61222',n:['Caldwell','Boschung'],f:['Olli','Ralph'],r:[1,0],flags:['🇬🇧','🇨🇭']},
 {team:'DAMS',c:'#073d83',n:['Nissany','Iwasa'],f:['Roy','Ayumu'],r:[0,1],flags:['🇮🇱','🇯🇵']},
 {team:'TRIDENT',c:'#6726bf',n:['Verschoor','Williams'],f:['Richard','Calan'],r:[0,1],flags:['🇳🇱','🇦🇺']},
 {team:'CHAROUZ',c:'#ea1732',n:['Fittipaldi','Bolukbasi'],f:['Enzo','Cem'],r:[0,1],flags:['🇧🇷','🇹🇷']},
 {team:'VAN AMERSFOORT RACING',c:'#ff761d',n:['Hughes','Cordeel'],f:['Jake','Amaury'],flags:['🇬🇧','🇧🇪']}
];
const F3=[
 {c:'#c8102e',n:['Badoer','Leon','Ugochukwu'],r:[1,0,1]},{c:'#6a2fa8',n:['Stromsted','Camara','Wurz'],r:[1,0,0]},
 {c:'#8e1b2a',n:['Van Hoepen','Taponen','Wharton'],r:[0,1,1]},{c:'#9a9aa0',n:['Boya','Inthraphuvasak','Tsolov'],r:[0,0,0]},
 {c:'#b4bac4',n:['Stenshorne','Dufek','Xie'],r:[0,0,1]},{c:'#e29a4a',n:['Tramnitz','Del Pino','Giusti'],r:[0,1,1]},
 {c:'#d7733d',n:['Nael','Ramos','Domingues'],r:[1,1,1]},{c:'#d9d0ae',n:['Voisin','Sharp','Bilinski'],r:[1,1,1]},
 {c:'#5fb84d',n:['Sagrera','Marnangeli','Bedrin'],r:[1,1,1]},{c:'#52a7d8',n:['Lacorte','Zagazeta','Ho'],r:[1,1,1]}];
const INDY26=[
 {c:'#bf172b',f:['Kyffin','Scott','Alex'],n:['Simpson','Dixon','Palou'],nums:[8,9,10],team:'CHIP GANASSI RACING'},
 {c:'#d5232d',f:['Josef','Scott','David'],n:['Newgarden','McLaughlin','Malukas'],nums:[2,3,12],team:'TEAM PENSKE'},
 {c:'#ef6e11',f:['Pato','Nolan','Christian'],n:["O’Ward",'Siegel','Lundgaard'],nums:[5,6,7],team:'ARROW McLAREN'},
 {c:'#d22426',f:['Will','Kyle','Marcus'],n:['Power','Kirkwood','Ericsson'],nums:[26,27,28],team:'ANDRETTI'},
 {c:'#9b1a27',cnt:2,f:['Caio','Santino'],n:['Collet','Ferrucci'],nums:[4,14],team:'AJ FOYT RACING'},
 {c:'#2357b7',cnt:2,f:['Felix','Marcus'],n:['Rosenqvist','Armstrong'],nums:[60,66],team:'MEYER SHANK RACING'},
 {c:'#cf2535',cnt:2,f:['Romain','Dennis'],n:['Grosjean','Hauger'],nums:[18,19],team:'DALE COYNE RACING'},
 {c:'#a6a121',cnt:2,f:['Alexander','Christian'],n:['Rossi','Rasmussen'],nums:[20,21],team:'ED CARPENTER RACING'},
 {c:'#229b52',cnt:2,f:['Rinus','Sting Ray'],n:['Veekay','Robb'],nums:[76,77],team:'JUNCOS HOLLINGER'},
 {c:'#ae1e35',f:['Graham','Louis','Mick'],n:['Rahal','Foster','Schumacher'],nums:[15,45,47],team:'RAHAL LETTERMAN LANIGAN'}
];
const INDY=[
 {c:'#c8102e',f:['Kyffin','Scott','Alex'],n:['Simpson','Dixon','Palou']},
 {c:'#f2c200',f:['Josef','Scott','Will'],n:['Newgarden','McLaughlin','Power']},
 {c:'#ff8000',f:['Pato','Nolan','Christian'],n:["O'Ward",'Siegel','Lundgaard']},
 {c:'#d71920',f:['Colton','Kyle','Marcus'],n:['Herta','Kirkwood','Ericsson']},
 {c:'#7a1f1f',cnt:2,f:['David','Santino'],n:['Malukas','Ferrucci']},
 {c:'#1e4fa3',cnt:2,f:['Felix','Marcus'],n:['Rosenqvist','Armstrong']},
 {c:'#c8102e',cnt:2,f:['Robert','Callum'],n:['Shwartzman','Ilott']},
 {c:'#2a7de1',cnt:2,f:['Alexander','Christian'],n:['Rossi','Rasmussen']},
 {c:'#2ea44f',cnt:2,f:['Sting Ray','Conor'],n:['Robb','Daly']},
 {c:'#e0112b',f:['Graham','Devlin','Louis'],n:['Rahal','DeFrancesco','Foster']},
 {c:'#5c6bc0',cnt:2,f:['Rinus','Jacob'],n:['Veekay','Abel']}];
/* Reference rosters are editable examples, not live championship standings. */
const FE10=[
 {team:'ABT CUPRA',c:'#222327',f:['Nico','TBA'],n:['Muller','?']},
 {team:'MAHINDRA',c:'#ce3242',f:['Lucas','Jehan'],n:['Di Grassi','Daruvala']},
 {team:'ANDRETTI',c:'#d83c3d',f:['Jake','Oliver'],n:['Dennis','Rowland']},
 {team:'MASERATI',c:'#0c56bd',f:['Edoardo','TBA'],n:['Mortara','?']},
 {team:'DS PENSKE',c:'#a98545',f:['Stoffel','Jean-Éric'],n:['Vandoorne','Vergne']},
 {team:'NEOM McLAREN',c:'#f58a46',f:['Jake','Sam'],n:['Hughes','Bird']},
 {team:'ENVISION',c:'#48b333',f:['Sébastien','Robin'],n:['Buemi','Frijns']},
 {team:'NIO 333',c:'#04438b',f:['Dan','Sérgio'],n:['Ticktum','Sette Camara']},
 {team:'JAGUAR TCS',c:'#050607',f:['Mitch','Nick'],n:['Evans','Cassidy']},
 {team:'NISSAN',c:'#b63d45',f:['Nyck','Sacha'],n:['De Vries','Fenestraz']},
 {team:'TAG HEUER PORSCHE',c:'#12161c',f:['Pascal','António'],n:['Wehrlein','Da Costa']}
];
const FE22=[
 {team:'AVALANCHE ANDRETTI',c:'#ef383b',f:['Jake','Oliver'],n:['Dennis','Askew']},
 {team:'DRAGON PENSKE',c:'#06070b',f:['Sérgio','Antonio'],n:['Sette Camara','Giovinazzi']},
 {team:'DS TECHEETAH',c:'#cba55d',f:['António Félix','Jean-Éric'],n:['Da Costa','Vergne']},
 {team:'ENVISION RACING',c:'#0c1959',f:['Robin','Nick'],n:['Frijns','Cassidy']},
 {team:'MAHINDRA',c:'#df062d',f:['Oliver','Alexander'],n:['Rowland','Sims']},
 {team:'MERCEDES-EQ',c:'#05070a',f:['Nyck','Stoffel'],n:['De Vries','Vandoorne']},
 {team:'NIO 333',c:'#123e5d',f:['Oliver','Dan'],n:['Turvey','Ticktum']},
 {team:'NISSAN E.DAMS',c:'#1c1919',f:['Sébastien','Maximilian'],n:['Buemi','Guenther']},
 {team:'JAGUAR TCS',c:'#50545d',f:['Sam','Mitch'],n:['Bird','Evans']},
 {team:'ROKiT VENTURI',c:'#08090b',f:['Edoardo','Lucas'],n:['Mortara','Di Grassi']},
 {team:'TAG HEUER PORSCHE',c:'#171616',f:['André','Pascal'],n:['Lotterer','Wehrlein']}
];
const FE12=[
 {team:'ANDRETTI',c:'#e32c27',f:['Jake','Felipe'],n:['Dennis','Drugovich']},
 {team:'DS PENSKE',c:'#080909',f:['Maximilian','Taylor'],n:['Guenther','Barnard'],trim:'#c6ab69'},
 {team:'ENVISION RACING',c:'#10164e',f:['Sébastien','Joel'],n:['Buemi','Eriksson'],trim:'#15bf3b'},
 {team:'JAGUAR TCS',c:'#f5f5ef',f:['Mitch','António Félix'],n:['Evans','Da Costa'],trim:'#16181b'},
 {team:'CUPRA KIRO',c:'#e7f400',f:['Dan','Pepe'],n:['Ticktum','Martí']},
 {team:'LOLA YAMAHA ABT',c:'#fad61e',f:['Lucas','Zane'],n:['Di Grassi','Maloney'],trim:'#1239a6'},
 {team:'MAHINDRA',c:'#c90e32',f:['Nyck','Edoardo'],n:['De Vries','Mortara']},
 {team:'CITROËN RACING',c:'#f6f6f6',f:['Nick','Jean-Éric'],n:['Cassidy','Vergne'],trim:'#bd162f'},
 {team:'PORSCHE',c:'#0c0c0d',f:['Pascal','Nico'],n:['Wehrlein','Mueller'],trim:'#e21423'},
 {team:'NISSAN',c:'#d80636',f:['Oliver','Norman'],n:['Rowland','Nato']}
];
function rook(i,j,p,cls='rk'){
  return S.opts.rookie?`<button class="${cls} ${p.rookie?'on':''}" data-k="rookie" data-t="${i}" data-d="${j}" aria-pressed="${!!p.rookie}" title="Toggle rookie status">ROOKIE</button>`:'';
}
function logoBody(t, i){
 return t.logo?`<img src="${t.logo}" alt="">`:`<span class="box">${LOGO}<span>${esc(t.team||'TEAM '+(i+1))}</span></span>`;
}
function posterTitle(cls, title, sub){
 return `<div class="${cls}"><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(title)}</div><div class="sub" id="sub" contenteditable="true" spellcheck="false">${esc(sub)}</div></div>`;
}
function FE10team(i){
 const t=S.teams[i], d=t.cnt||S.d;
 let portraits='', labels='';
 for(let j=0;j<d;j++){
   const p=t.dr[j];
   portraits+=`<div class="fe10-photo ph" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload driver portrait">${p.img?`<img src="${p.img}" alt="">`:SIL}</div>`;
   labels+=`<div class="fe10-driver-slot"><span class="fe10-barname t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}" style="font-size:${Math.min(1.37,19/Math.max(10,p.name.length*d/2)).toFixed(2)}cqw">${esc(p.name)}</span>${rook(i,j,p)}</div>`;
 }
 return `<div class="fe10-team" data-drivers="${d}" style="--c:${t.c};--tc:${tc(t.c)}"><div class="fe10-photo-row">${portraits}</div><div class="fe10-logo lg" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload team logo">${logoBody(t,i)}</div><div class="fe10-bar">${labels}</div><input class="cp" type="color" data-t="${i}" value="${t.c}" aria-label="Team color"></div>`;
}
function renderFE10(b){
 b.className=`board fe10${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');
 const odd=S.n%2,sn=S.n-(odd?1:0),sideRows=sn/2,rows=sideRows+(odd?1:0);
 let html='';
 for(let i=0;i<sn;i++){
   const right=i%2===1,row=Math.floor(i/2);
   // In the reference the top/bottom pairs bend inward and the central pairs bow outward.
   const extent=Math.abs(row-(sideRows-1)/2)/Math.max(.5,(sideRows-1)/2);
   const inset=(S.layout==='orbit'?1+16*Math.pow(extent,.55):1).toFixed(2);
   html+=`<div class="fe10-orbit-cell ${right?'right':'left'}" style="grid-column:${right?2:1};grid-row:${row+1};--orbit-inset:${inset}cqw">${FE10team(i)}</div>`;
 }
 if(odd)html+=`<div class="fe10-orbit-cell center" style="grid-column:1/-1;grid-row:${rows}">${FE10team(S.n-1)}</div>`;
 b.innerHTML=`<div class="fe10-stage" style="grid-template-rows:repeat(${rows},minmax(0,1fr))">${html}${posterTitle('fe10-title',S.title,S.sub)}</div>`;
}
function FE22team(i){
 const t=S.teams[i],d=t.cnt||S.d;let drivers='';
 for(let j=0;j<d;j++){
  const p=t.dr[j];
  drivers+=`<div class="fe22-driver"><div class="fe22-photo ph" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload driver photo">${p.img?`<img src="${p.img}" alt="">`:SIL}</div><div class="fe22-name"><span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.first)}</span><span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.name)}</span></div>${rook(i,j,p)}</div>`;
 }
 return `<div class="fe22-team" style="--c:${t.c};--tc:${tc(t.c)};--trim:${t.trim||t.c}"><div class="fe22-dots"></div><div class="fe22-slab"></div><div class="fe22-end"></div><div class="fe22-bottom"></div><div class="fe22-logo lg" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload team logo">${logoBody(t,i)}</div><div class="fe22-drivers">${drivers}</div><input class="cp" type="color" data-t="${i}" value="${t.c}" aria-label="Team color"></div>`;
}
function renderFE22(b){
 b.className=`board fe22${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');
 b.innerHTML=`<div class="fe22-header"><div class="sub" id="sub" contenteditable="true" spellcheck="false">${esc(S.sub)}</div><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title)}</div></div><div class="fe22-rows" style="--fe22rows:${S.n}">${Array.from({length:S.n},(_,i)=>FE22team(i)).join('')}</div>`;
}
function fe12Backdrop(){
 let p='';
 for(let i=0;i<10;i++)p+=`<path d="M${-220+i*80} 1060 L${930+i*140} -100" stroke="${i%2===0?'#5c7782':'#bdc8c5'}" stroke-width="${90+i*10}" stroke-opacity=".11" fill="none"/>`;
 return `<svg class="fe12-back" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="trackBlur"><feGaussianBlur stdDeviation="56"/></filter></defs><g filter="url(#trackBlur)"><path d="M-300 920 L750 380 L2150 470" stroke="#d6d8d8" stroke-width="300" fill="none" opacity=".6"/><path d="M-300 980 L650 520 L1950 590" stroke="#3c4447" stroke-width="200" fill="none" opacity=".6"/></g>${p}</svg>`;
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
 return `<div class="fe12-team" data-drivers="${d}" style="--c:${t.c};--tc:${tc(t.c)};--trim:${t.trim||t.c}"><div class="fe12-pictures"><div class="fe12-backbar"></div>${faces}<div class="fe12-logo lg" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload team logo">${logoBody(t,i)}</div></div><div class="fe12-nameplate">${names}</div>${badges}<input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Team color"></div>`;
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


/* ===== Super Formula 2024/2026 examples, based on the supplied graphics ===== */
const sfItem=(num,name,teamName,nation='🇯🇵',first='')=>({num,name,first,teamName,nation});
const SF24_DRIVERS=[
 sfItem(3,'Kenta Yamashita','KONDO RACING'),sfItem(14,'Kazuya Oshima','docomo business ROOKIE'),sfItem(38,'Sena Sakaguchi','VERTEX PARTNERS CERUMO-INGING'),
 sfItem(4,'Kazuto Kotaka','KONDO RACING'),sfItem(15,'Ayumu Iwasa','TEAM MUGEN'),sfItem(39,'Toshiki Oyu','VERTEX PARTNERS CERUMO-INGING'),
 sfItem(5,'Tadasuke Makino','DOCOMO TEAM DANDELION'),sfItem(16,'Tomoki Nojiri','TEAM MUGEN'),sfItem(50,'Iori Kimura','San-Ei Gen with B-Max'),
 sfItem(6,'Kakunoshin Ohta','DOCOMO TEAM DANDELION'),sfItem(19,'Théo Pourchaire','ITOCHU ENEX TEAM IMPUL','🇫🇷'),sfItem(53,'Juju','TGM Grand Prix'),
 sfItem(7,'Kamui Kobayashi','Kids com Team KCMG'),sfItem(20,'Yuji Kunimoto','ITOCHU ENEX TEAM IMPUL'),sfItem(55,'Nobuharu Matsushita','TGM Grand Prix'),
 sfItem(8,'Nirei Fukuzumi','Kids com Team KCMG'),sfItem(36,'Sho Tsuboi','VANTELIN TEAM TOM’S'),sfItem(64,'Naoki Yamamoto','PONOS NAKAJIMA RACING'),
 sfItem(12,'Atsushi Miyake','ThreeBond Racing'),sfItem(37,'Ukyo Sasahara','VANTELIN TEAM TOM’S'),sfItem(65,'Ren Sato','PONOS NAKAJIMA RACING'),
 sfItem(99,'TBA','Team 22')
];
// Column-major reference order interleaved into two-driver rows for the editor.
const SF26_LEFT=[
 sfItem(1,'Ayumu IWASA','TEAM MUGEN AUTOBACS','🇯🇵','岩佐 歩夢'),sfItem(16,'Tomoki NOJIRI','TEAM MUGEN AUTOBACS','🇯🇵','野尻 智紀'),
 sfItem(3,'Luke BROWNING','REALIZE KONDO RACING','🇬🇧','ルーク・ブラウニング'),sfItem(4,'Ukyo SASAHARA','REALIZE KONDO RACING','🇯🇵','笹原 右京'),
 sfItem(5,'Tadasuke MAKINO','DOCOMO TEAM DANDELION','🇯🇵','牧野 任祐'),sfItem(6,'Kakunoshin OHTA','DOCOMO TEAM DANDELION','🇯🇵','太田 格之進'),
 sfItem(7,'Kamui KOBAYASHI','KDDI TGMGP TGR-DC','🇯🇵','小林 可夢偉'),sfItem(28,'Rikuto KOBAYASHI','KDDI TGMGP TGR-DC','🇯🇵','小林 利徠斗'),
 sfItem(8,'Kenta YAMASHITA','KCMG','🇯🇵','山下 健太'),sfItem(69,'Kalle ROVANPERÄ','KCMG','🇫🇮','カッレ・ロバンペラ'),
 sfItem(10,'JUJU','HAZAMA ANDO Triple Tree Racing','🇯🇵','ジュジュ'),sfItem(12,'Syun KOIDE','ThreeBond Racing','🇯🇵','小出 峻')
];
const SF26_RIGHT=[
 sfItem(14,'Nirei FUKUZUMI','NTT docomo Business ROOKIE','🇯🇵','福住 仁嶺'),sfItem(19,"Zak O’SULLIVAN",'TEAM IMPUL','🇬🇧','ザック・オサリバン'),
 sfItem(22,'Nobuharu MATSUSHITA','DELIGHTWORKS RACING','🇯🇵','松下 信治'),sfItem(36,'Sho TSUBOI',"VANTELIN TEAM TOM’S",'🇯🇵','坪井 翔'),
 sfItem(37,'Sacha FENESTRAZ',"VANTELIN TEAM TOM’S",'🇦🇷','サッシャ・フェネストラズ'),sfItem(38,'Sena SAKAGUCHI','SANKI VERTEX CERUMO-INGING','🇯🇵','阪口 晴南'),
 sfItem(39,'Toshiki OYU','SANKI VERTEX CERUMO-INGING','🇯🇵','大湯 都史樹'),sfItem(50,'Yuto NOMURA','San-Ei Gen with B-Max','🇯🇵','野村 勇斗'),
 sfItem(53,'Charlie WURZ','TEAM GOH','🇦🇹','チャーリー・ブルツ'),sfItem(64,'Ren SATO','PONOS NAKAJIMA RACING','🇯🇵','佐藤 蓮'),
 sfItem(65,'Igor Omura FRAGA','PONOS NAKAJIMA RACING','🇧🇷','イゴール・大村・フラガ'),sfItem(97,'Roman STANĚK','Buzz MK Racing','🇨🇿','ロマン・スタネック')
];
const sfTeams=list=>Array.from({length:Math.ceil(list.length/2)},(_,i)=>{
 const p=list.slice(i*2,i*2+2);return{c:'#087d5e',team:p[0]?.teamName||`Super Formula ${i+1}`,f:p.map(x=>x.first),n:p.map(x=>x.name),nums:p.map(x=>x.num),entries:p};
});
const SF24=sfTeams(SF24_DRIVERS);
const SF26=sfTeams(SF26_LEFT.flatMap((x,i)=>[x,SF26_RIGHT[i]]));
/* MotoGP team presets reproduce the supplied reference compositions; editable example rosters. */
const MOTO24=[
 {team:'LCR HONDA',c:'#f4f4f4',f:['T','J'],n:['Nakagami','Zarco'],nums:[30,5]},
 {team:'RED BULL KTM',c:'#d76925',f:['B','J'],n:['Binder','Miller'],nums:[33,43]},
 {team:'APRILIA',c:'#56b53c',f:['A','M'],n:['Espargaro','Viñales'],nums:[41,12]},
 {team:'YAMAHA',c:'#132d85',f:['F','A'],n:['Quartararo','Rins'],nums:[20,42]},
 {team:'REPSOL HONDA',c:'#ed9515',f:['L','J'],n:['Marini','Mir'],nums:[10,36]},
 {team:'DUCATI',c:'#dd041b',f:['F','E'],n:['Bagnaia','Bastianini'],nums:[1,23]},
 {team:'VR46 DUCATI',c:'#d5f11b',f:['M','F'],n:['Bezzecchi','Di Giannantonio'],nums:[72,49]},
 {team:'GASGAS TECH3',c:'#a81732',f:['A','P'],n:['Fernandez','Acosta'],nums:[37,31]},
 {team:'GRESINI DUCATI',c:'#9baed1',f:['A','M'],n:['Marquez','Marquez'],nums:[73,93]},
 {team:'PRAMAC DUCATI',c:'#8437c0',f:['J','F'],n:['Martin','Morbidelli'],nums:[89,21]},
 {team:'TRACKHOUSE APRILIA',c:'#1056af',f:['M','R'],n:['Oliveira','Fernandez'],nums:[88,25]}
];
const MOTO25=[
 {team:'APRILIA',c:'#61b63c',f:['J','M'],n:['Martin','Bezzecchi'],nums:[89,72]},
 {team:'KTM',c:'#ed6a26',f:['B','P'],n:['Binder','Acosta'],nums:[33,31]},
 {team:'DUCATI',c:'#e01917',f:['F','M'],n:['Bagnaia','Marquez'],nums:[63,93]},
 {team:'YAMAHA',c:'#113b8b',f:['F','A'],n:['Quartararo','Rins'],nums:[20,42]},
 {team:'HONDA',c:'#f7a514',f:['L','J'],n:['Marini','Mir'],nums:[10,36]},
 {team:'GRESINI',c:'#9ab0d7',f:['A','F'],n:['Marquez','Aldeguer'],nums:[73,54]},
 {team:'VR46 DUCATI',c:'#dcef18',f:['F','F'],n:['Di Giannantonio','Morbidelli'],nums:[49,21]},
 {team:'TECH3 KTM',c:'#e46c2c',f:['E','M'],n:['Bastianini','Viñales'],nums:[23,12]},
 {team:'LCR HONDA',c:'#eeeeee',f:['J','S'],n:['Zarco','Chantra'],nums:[5,35]},
 {team:'PRAMAC YAMAHA',c:'#9445b9',f:['M','J'],n:['Oliveira','Miller'],nums:[88,43]},
 {team:'TRACKHOUSE',c:'#076ac2',f:['R','A'],n:['Fernandez','Ogura'],nums:[25,79]}
];
const MOTO26=[
 {team:'APRILIA',c:'#9b28d8',f:['J','M'],n:['Martin','Bezzecchi'],nums:[89,72]},
 {team:'PRAMAC YAMAHA',c:'#0b4cc0',f:['J','T'],n:['Miller','Razgatlioglu'],nums:[43,7]},
 {team:'DUCATI',c:'#b5000d',f:['M','F'],n:['Marquez','Bagnaia'],nums:[93,63]},
 {team:'LCR HONDA',c:'#eeeeee',f:['J','D'],n:['Zarco','Moreira'],nums:[5,11]},
 {team:'KTM',c:'#fd782b',f:['P','B'],n:['Acosta','Binder'],nums:[31,33]},
 {team:'GRESINI',c:'#9faedb',f:['A','F'],n:['Marquez','Aldeguer'],nums:[73,54]},
 {team:'YAMAHA',c:'#153ba0',f:['F','A'],n:['Quartararo','Rins'],nums:[20,42]},
 {team:'TECH3 KTM',c:'#eb6a08',f:['E','M'],n:['Bastianini','Viñales'],nums:[23,12]},
 {team:'HONDA',c:'#e50005',f:['J','L'],n:['Mir','Marini'],nums:[36,10]},
 {team:'VR46 DUCATI',c:'#dcf900',f:['F','F'],n:['Di Giannantonio','Morbidelli'],nums:[49,21]},
 {team:'TRACKHOUSE',c:'#028cce',f:['A','R'],n:['Ogura','Fernandez'],nums:[79,25]}
];

const sfEntry=(i,j)=>{
 const t=S.teams[i],p=t.dr[j],num=p.num??i*4+j+1,indiv=p.teamName||t.team||'TEAM';
 return `<div class="sf-slot" data-team-index="${i}" data-driver-index="${j}"><div class="sf-card" style="--c:${t.c}">
 <div class="sf-num num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(num)}</div>
 <div class="sf-face" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload portrait for ${esc(p.name)}">${p.img?`<img src="${p.img}" alt="">`:SIL}</div>
 ${S.opts.flag?`<div class="sf-flag" role="button" tabindex="0" data-k="flag" data-t="${i}" data-d="${j}" aria-label="Upload flag">${p.flag?`<img src="${p.flag}" alt="">`:esc(p.nation||'🇯🇵')}</div>`:''}
 <div class="sf-data"><span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.name)}</span><span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.first||'')}</span></div>
 <div class="sf-emblem lg" role="button" tabindex="0" data-k="driverlogo" data-t="${i}" data-d="${j}" aria-label="Upload driver's team logo">${p.logo?`<img src="${p.logo}" alt="">`:`<span class="box">${LOGO}<span class="drvteam" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(indiv)}</span></span>`}</div>
 <input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Team color"></div>${rook(i,j,p)}</div>`;
};
function renderSF(b){
 const is26=S.preset==='sf26',cls=is26?'sf26':'sf24';
 b.className=`board ${cls}${S.pv?' pv':''}`;b.style.removeProperty('--tw');b.style.removeProperty('--s');
 const entries=[];for(let i=0;i<S.n;i++)for(let j=0;j<(S.teams[i].cnt||S.d);j++)entries.push(sfEntry(i,j));
 const columns=is26?2:3,rows=Math.ceil(entries.length/columns);
 // The Super Formula references are long individual-driver lists. Keep each
 // entry legible at 4–14 teams × 2–4 drivers by lengthening the poster, rather
 // than squeezing 56 drivers into the height intended for 22–24.
 const baseRows=is26?12:8;
 b.classList.toggle('sf-adaptive',rows!==baseRows);
 const posterHeight=is26?Math.round(341+88*Math.max(rows,6)):Math.round(246+54*Math.max(rows,5));
 b.style.aspectRatio=is26?`1100 / ${posterHeight}`:`1024 / ${posterHeight}`;
 b.style.setProperty('--density','1');
 const top=is26?
 `<div class="sf-top"><div class="sf-banner"><div class="sf-logo-mark">SUPER<br>FORMULA</div><div class="sf-divider"></div><div><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title)}</div><div class="sub" id="sub" contenteditable="true" spellcheck="false">${esc(S.sub)}</div></div></div></div><div class="sf26-caption"><div class="ttl" id="year" contenteditable="true" spellcheck="false">${esc(S.year||'2026 DRIVER LINE-UP')}</div></div>`:
 `<div class="sf-top"><div class="sf-banner"><div class="sf-logo-mark">SUPER<br>FORMULA</div><div class="sf-divider"></div><div><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title)}</div><div class="sub" id="sub" contenteditable="true" spellcheck="false">${esc(S.sub)}</div></div></div><div class="sf24-opening"><div class="ttl" id="year" contenteditable="true" spellcheck="false">${esc(S.year||'2024 SUZUKA CIRCUIT')}</div><div class="sf-rounds">Rd.1 SUZUKA　 ◉ Rd.2 AUTOPOLIS　 ◉ Rd.3 SUGO　 ◉ Rd.4 FUJI　 ◉ Rd.5 MOTEGI　 ◉ Rd.6 FUJI</div></div></div>`;
 b.innerHTML=(S.opts.hero&&S.hero?`<img class="style-bg-image" src="${S.hero}" alt="">`: '')+top+`<div class="sf-roster" style="grid-template-rows:repeat(${rows},minmax(0,1fr))">${entries.join('')}</div>`+(is26?`<div class="sf-footer">Deloitte.　 HRC　 TOYOTA GAZOO RACING　 YOKOHAMA　 AUTOBACS　 MUGEN　 NAKAJIMA RACING</div>`:'')+`<button type="button" class="style-bg-action" data-k="hero">${S.hero?'Change':'Upload'} background</button>`;
}
function motoCard(i){
 const t=S.teams[i],d=t.cnt||S.d,short=String(t.team||'TEAM').replace(/\s+(RACING|DUCATI|YAMAHA)$/,'');
 const faces=Array.from({length:d},(_,j)=>{
  const p=t.dr[j];return `<div class="mg-face" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload ${esc(p.name)} portrait">${p.img?`<img src="${p.img}" alt="">`:SIL}</div>`;
 }).join('');
 const names=Array.from({length:d},(_,j)=>{const p=t.dr[j],full=(p.first||'')+' '+p.name;const fs=Math.min(1.16,16/Math.max(8,full.length))*(d>2?2/d:1);return `<span class="mg-drivername" style="font-size:${fs.toFixed(2)}cqw"><span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.first||'')}</span>&nbsp;<span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.name)}</span></span>`}).join('');
 const extras=S.preset==='mg24' && S.opts.num?`<span class="mg-outnum left num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="0">${esc(t.dr[0].num??i*2+1)}</span><span class="mg-outnum right num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${d-1}">${esc(t.dr[d-1].num??i*2+d)}</span>`:'';
 const tags=''; // independent per-driver overlay badges (stable layout)
 return `<div class="mg-team" data-drivers="${d}" style="--c:${t.c};--tc:${tc(t.c)};--numcolor:${lum(t.c)>.65?'#222':t.c}"><div class="mg-facezone">${faces}<div class="mg-logo lg" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload ${esc(t.team)} logo">${logoBody(t,i)}</div></div><div class="mg-strip"><div class="mg-labels" data-team="${esc(short)}">${names}</div>${extras}</div>${tags}<input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Team color"></div>`;
}
function renderMoto(b){
 const style=S.preset,is24=style==='mg24',year=style.slice(2);
 const pattern=balancedRows(S.n+1,3),rows=pattern.length,titleSlot=is24?0:1;
 b.className=`board ${style}${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');
 b.style.setProperty('--mg-card-height',(rows===2?17.2:rows===3?14:rows===4?11.4:9.0)+'cqw');
 b.style.setProperty('--mg-top',rows===2?'14%':rows===3?'7%':'4%');
 b.style.setProperty('--mg-bottom',rows===2?'7%':rows===3?'5%':'3.3%');
 let all='',idx=0,slot=0;
 for(let row=0;row<rows;row++){
   const amount=pattern[row],start=amount===3?1:amount===2?2:3;
   for(let j=0;j<amount;j++,slot++){
     const col=start+2*j;
     if(slot===titleSlot)all+=`<div class="mg-cell" style="grid-row:${row+1};grid-column:${col} / span 2"><div class="mg-title"><div class="mg-series" id="sub" contenteditable="true" spellcheck="false">${esc(S.sub||'MotoGP')}</div><div class="mg-year" id="year" contenteditable="true" spellcheck="false">${esc(S.year||'20'+year)}</div><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title||'LINE-UP')}</div></div></div>`;
     else all+=`<div class="mg-cell" data-team-index="${idx}" style="grid-row:${row+1};grid-column:${col} / span 2">${motoCard(idx++)}</div>`;
   }
 }
 b.innerHTML=(S.opts.hero&&S.hero?`<img class="style-bg-image" src="${S.hero}" alt="">`: '')+`<div class="mg-stage" style="--mg-rows:${rows};grid-template-rows:repeat(${rows},minmax(0,1fr))">${all}</div><button type="button" class="style-bg-action" data-k="hero">${S.hero?'Change':'Upload'} background</button>`;
}


const EXTRA=['#d6213a','#2e8b57','#7b4bd8','#e0a800'];
const S={};

function loadPreset(p){
  const f3=p==='f3',f2=p==='f2',fox=p==='fox',i26=p==='indy26',fe10=p==='fe10',fe22=p==='fe22',fe12=p==='fe12',
        sf24=p==='sf24',sf26=p==='sf26',mg24=p==='mg24',mg25=p==='mg25',mg26=p==='mg26',
        isSF=sf24||sf26,isMoto=mg24||mg25||mg26,
        ind=p==='indy'||fox||i26,
        D=f2?F2:sf24?SF24:sf26?SF26:mg24?MOTO24:mg25?MOTO25:mg26?MOTO26:fe10?FE10:fe22?FE22:fe12?FE12:i26?INDY26:f3?F3:ind?INDY:F1;
  const isFE=fe10||fe22||fe12;
  Object.assign(S,{preset:p,n:f2?11:sf26?12:sf24?11:isMoto?11:fe12?10:isFE?11:i26?10:ind?11:10,d:f2?2:isSF||isMoto||isFE?2:f3||ind?3:2,
    customEnabled:false,cols:0,layout:f2?'grid':isSF||isMoto?'grid':fe10?'orbit':fox||i26||isFE?'grid':'orbit',logo:ind?'below':'auto',bg:f2?'dark':f3?'grey':ind?'dark':'light',selected:0,
    opts:f2?{num:0,flag:1,rookie:1,band:1,slogo:1,hero:0}:isSF?{num:1,flag:1,rookie:0,band:0,slogo:0,hero:0}:
    isMoto?{num:mg24?1:0,flag:0,rookie:0,band:0,slogo:0,hero:0}:
    i26?{num:1,flag:0,rookie:1,band:0,slogo:1,hero:0}:
    fox?{num:1,flag:0,rookie:1,band:0,slogo:1,hero:0}:
    f3?{num:1,flag:1,rookie:1,band:1,slogo:1,hero:0}:
    ind?{num:0,flag:0,rookie:0,band:0,slogo:0,hero:1}:
    isFE?{num:0,flag:0,rookie:0,band:0,slogo:fe12?1:0,hero:0}:
    {num:0,flag:0,rookie:0,band:0,slogo:0,hero:0},
    year:sf26?'2026 DRIVER LINE-UP':sf24?'開幕戦 3月9日 ▶10日 鈴鹿サーキット':isMoto?'20'+p.slice(2):i26?'2026':fe12?'SEASON 12':'',
    title:f2?'LINE-UP':sf26?'HUMAN MOTOR SPORTS':sf24?'2024 DRIVER LINEUP':isMoto?'LINE-UP':i26?'TEAM\nLINEUP':fox?'TEAM LINEUP':fe10?'Formula E':fe22?'2021/22 OFFICIAL\nTEAM + DRIVER LINEUP':fe12?'DRIVER LINE-UP':f3?'2025\nLine‑up':ind?'2025\nTeam\nLineup':'F1 2022\nDriver\nLineup',
    sub:f2?'2022':sf26?'SUPER FORMULA':sf24?'スーパーフォーミュラ2024 ドライバーラインアップ':isMoto?'MotoGP':i26?'FULL-TIME DRIVERS':fox?'2025 NTT INDYCAR SERIES FULL-TIME DRIVERS':fe10?'SEASON 10':fe22?'FIA ABB FORMULA E WORLD CHAMPIONSHIP':fe12?'':f3?'Season 7':ind?'Full-time drivers':'',
    slogo:null,hero:null,pv:false});
  S.teams=Array.from({length:14},(_,i)=>{const r=D[i];
    return{c:r?r.c:EXTRA[(i-D.length+EXTRA.length*5)%4],team:r?.team||'TEAM '+(i+1),trim:r?.trim||null,logo:null,cnt:r?.cnt||0,
      dr:[0,1,2,3].map(j=>({name:r?.n?.[j]||'Driver '+(j+1),first:r?.f?.[j]||(ind||isFE?'First':''),img:null,flag:null,num:r?.nums?.[j]??null,rookie:!!r?.r?.[j],
        nation:r?.flags?.[j]||r?.entries?.[j]?.nation||'🏁',teamName:r?.entries?.[j]?.teamName||r?.team||'TEAM',logo:null}))}});
  if(fox){
    const order=[1,6,3,5,9,7,0,8,2,10,4], originals=S.teams.slice();
    S.teams=order.map(i=>originals[i]).concat(originals.slice(11));
    const numbers=[[2,3,12],[83,90],[26,27,28],[60,66],[15,30,45],[20,21],[8,9,10],[76,77],[5,6,7],[18,51],[4,14]];
    S.teams.slice(0,11).forEach((t,i)=>{t.cnt=numbers[i].length;t.team=FOX_TEAM_NAMES[i]||t.team;numbers[i].forEach((v,j)=>t.dr[j].num=v)});
  }
  sync();render();
}

function sync(){
  $('#rT').value=S.n;$('#oT').textContent=S.n;
  const set=(n,v)=>document.querySelectorAll(`input[name=${n}]`).forEach(r=>r.checked=r.value==String(v));
  set('p',isQuickPreset() ? S.preset : (S.customEnabled?'custom':S.preset));set('d',S.d);set('c',S.cols);set('b',S.bg);set('l',S.layout);set('g',S.logo);
  document.querySelectorAll('[data-o]').forEach(c=>c.checked=!!S.opts[c.dataset.o]);$('#driverGapsLabel').hidden=!['f1','f3'].includes(S.preset);$('#pv').checked=S.pv;
  syncTeamEditor();
  syncCustomPanel();
  syncQuickPanel();
}
function syncTeamEditor(){
  const sel=$('#teamSelect');if(!sel)return;
  S.selected=Math.max(0,Math.min(S.selected||0,S.n-1));
  sel.innerHTML=Array.from({length:S.n},(_,i)=>`<option value="${i}">${i+1}. ${esc(S.teams[i].team||'TEAM')}</option>`).join('');
  sel.value=String(S.selected);
  $('#teamDrivers').value=String(S.teams[S.selected].cnt||S.d);
  $('#teamName').value=S.teams[S.selected].team||'';
  if(S.customEnabled){syncCustomTargets();syncMixTargets();}
  syncQuickPanel();
}

const SIL='<svg viewBox="0 0 100 100" fill="currentColor" opacity=".6"><circle cx="50" cy="30" r="19"/><path d="M6 100c0-28 19-42 44-42s44 14 44 42z"/></svg>';
const LOGO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M12 8v8M8 10l8 4"/></svg>';
const K={2:4.5,3:2.95,4:2.5},LIM={2:13,3:7.6,4:6.5};
const fit=(n,d)=>Math.min(1,((S.preset==='indy'||S.preset==='fox')?11:LIM[d])/Math.max(1,String(n).length)).toFixed(2)+'em';

function team(i,cols,col,center,orb){
  const t=S.teams[i],d=t.cnt||S.d,o=S.opts,indy=S.preset==='indy',below=S.logo==='below';
  const uniformOutboard=S.logo==='auto'&&S.teams.slice(0,S.n).some(t=>(t.cnt||S.d)%2!==0);
  const mid=d%2===0&&!uniformOutboard;
  const right=center?false:(cols===2?col===1:col===cols-1);
  const li=below?-1:(mid?d/2:(right?d:0));              // logo slot among the columns; -1 = below the row
  const tr=[];for(let s=0;s<(below?d:d+1);s++)tr.push(s===li?'.85fr':'1fr');
  const sc=below||mid?'1/-1':(right?'1/-2':'2/-1');
  const k=indy?(100/(d*8.6)).toFixed(3):K[d];           // indy: 1em = one driver column / 8.6, so cards match across teams
  const lx=(orb&&!center&&!below&&!mid)?(right?1:-1)*45/(d+.9):0;   // odd count: logo sits at one edge, so nudge the card to keep the drivers on the arc
  let h=`<div class="team" style="--lx:${lx.toFixed(2)};--w:${Math.min(1,d/S.d).toFixed(4)};--c:${t.c};--c2:${shade(t.c,-.3)};--tc:${tc(t.c)}"><div class="g" style="--k:${k};grid-template-columns:${tr.join(' ')}">`;
  if(o.band)h+='<div class="band"></div>';
  const splits=(o.splits&&(S.preset==='f1'||S.preset==='f3'))?
    Array.from({length:d-1},(_,j)=>{
      const edge=j+1;
      const pos=below||!mid?100*edge/d:
        100*(edge+(edge===d/2?.425:(edge>d/2?.85:0)))/(d+.85);
      return `<span class="driver-split" style="--split-position:${pos.toFixed(4)}%" aria-hidden="true"></span>`;
    }).join(''):'';
  h+=`<div class="strip" style="grid-column:${sc}">${splits}<input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Colour of team ${i+1}"></div>`;
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


function foxLines(){
  // Vector-only replacement for the reference's car: diagonal red/cyan speed lines.
  let paths='';
  for(let i=0;i<15;i++){
    const y=990+i*22;
    paths+=`<path d="M -100 ${y} C 280 ${y+85} 375 ${y+20} 680 ${y-75} S 990 ${y-280} 1250 ${y-310}" fill="none" stroke="${i%3?'#00c7ef':'#68eaff'}" stroke-width="${i%4===0?5:1.7}" opacity="${.16+(i%5)*.11}"/>`;
  }
  for(let i=0;i<19;i++){
    const x=710+i*32;
    paths+=`<path d="M ${x} 1550 Q ${x+60} 880 ${x+430} -70" fill="none" stroke="${i%4===0?'#ff251d':'#be171d'}" stroke-width="${i%5===0?7:1.7}" opacity="${.16+(i%6)*.09}"/>`;
  }
  return `<svg class="fox-lines" viewBox="0 0 1100 1375" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="speedfade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#00dbff"/><stop offset="1" stop-color="#d0131b"/></linearGradient></defs>${paths}<path d="M0 1190 Q340 1260 670 1120" stroke="#04d5ff" opacity=".75" stroke-width="10" fill="none"/><path d="M1030 0 L665 1130" stroke="#ff241c" opacity=".72" stroke-width="9" fill="none"/></svg>`;
}
function foxTeam(i,side){
  const t=S.teams[i],d=t.cnt||S.d;
  let cards='';
  for(let j=0;j<d;j++){
    const p=t.dr[j],num=p.num??(i*4+j+1);
    const font=n=>Math.min(1.8,13.5/Math.max(7,String(n).length)).toFixed(2)+'cqw';
    cards+=`<div class="fox-card" style="--c:${t.c}"><div class="fox-card-top ph" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload driver photo">${p.img?`<img src="${p.img}" alt="">`:SIL}${S.opts.num?`<span class="fox-number num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(num)}</span>`:''}</div><div class="fox-nameplate"><span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}" style="font-size:${font(p.first)}">${esc(p.first)}</span><span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}" style="font-size:${font(p.name)}">${esc(p.name)}</span></div>${rook(i,j,p)}</div>`;
  }
  // Team logo always receives its own fixed-width slot; never behind a driver.
  const logo=`<div class="fox-teamlogo lg" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload logo for team ${i+1}">${t.logo?`<img src="${t.logo}" alt="">`:`<span class="box">${LOGO}<span>${esc(t.team||'TEAM '+(i+1))}</span></span>`}</div>`;
  return `<div class="fox-team ${side}" style="--c:${t.c}">${logo}<div class="fox-cardrow">${cards}</div><input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Team colour"></div>`;
}
const FOX_TEAM_NAMES=['TEAM PENSKE','PREMA','ANDRETTI','MEYER SHANK','RAHAL LETTERMAN','ED CARPENTER','GANASSI','JUNCOS HOLLINGER','ARROW McLAREN','DALE COYNE','AJ FOYT','TEAM 12','TEAM 13','TEAM 14'];
function renderFox(b){
  b.className=`board fox${S.pv?' pv':''}`;
  b.style.removeProperty('--tw');b.style.removeProperty('--s');
  const rows=Math.ceil(S.n/2);
  const maxDrivers=Math.max(...S.teams.slice(0,S.n).map(t=>t.cnt||S.d));
  b.style.setProperty('--fox-card-width',maxDrivers===4?'7.95cqw':'10.2cqw');
  b.style.setProperty('--fox-card-height',Math.min(14.1,(125-19-(rows-1)*1.3)/rows).toFixed(2)+'cqw');
  // Sort display slots, never S.teams: editing, uploads and exports retain team identity.
  const priority=Array.from({length:S.n},(_,i)=>i).sort((a,b)=>
    (S.teams[b].cnt||S.d)-(S.teams[a].cnt||S.d)||a-b);
  const split=Math.ceil(S.n/2),left=priority.slice(0,split),right=priority.slice(split);
  const display=[...left.map((id,row)=>({id,row,column:1})),...right.map((id,row)=>({id,row,column:2}))];
  b.innerHTML=foxLines()+`<div class="fox-stage"><div class="fox-header"><div class="fox-heading"><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title)}</div><div class="sub" id="sub" contenteditable="true" spellcheck="false">${esc(S.sub)}</div></div><div class="fox-badge sl ${S.slogo?'':'empty'}" role="button" tabindex="0" data-k="slogo" aria-label="Upload IndyCar series logo">${S.slogo?`<img class="slogo" src="${S.slogo}" alt="">`:'SERIES LOGO'}</div></div><div class="fox-rows" style="--fox-rows:${rows}">${display.map(({id,row,column})=>`<div data-team-index="${id}" data-side="${column===1?'left':'right'}" style="grid-column:${column};grid-row:${row+1};min-width:0;min-height:0">${foxTeam(id,column===1?'left':'right')}</div>`).join('')}</div></div>`;
}


function indy26Backdrop(){
 let lines='';
 for(let i=0;i<=23;i++)lines+=`<path d="M${i*90} 0V1280" stroke="#d7edf3" stroke-opacity="${i%3===0?.12:.06}" stroke-width="1"/>`;
 for(let i=0;i<=15;i++)lines+=`<path d="M0 ${i*90}H2048" stroke="#d7edf3" stroke-opacity="${i%3===0?.12:.06}" stroke-width="1"/>`;
 for(let i=0;i<26;i++){
  const y=1100+i*12;
  lines+=`<path d="M-80 ${y} Q620 ${y-155-i*3} 1150 ${y+170-i*5} T2190 ${y-100-i*7}" stroke="${i%3===0?'#d4f9ff':'#8bd8ec'}" stroke-width="${i%5===0?5:1.3}" stroke-opacity="${.07+(i%6)*.027}" fill="none"/>`;
 }
 return `<svg class="indy26-back" viewBox="0 0 2048 1280" preserveAspectRatio="none" aria-hidden="true">${lines}<path d="M664 260 H1380 M664 760 H1380 M664 260 V760 M1380 260 V760" stroke="#d1eaf1" stroke-opacity=".21" stroke-width="2"/></svg>`;
}
function indy26Team(i){
 const t=S.teams[i],d=t.cnt||S.d,meta=INDY26[i];
 let cards='';
 for(let j=0;j<d;j++){
  const p=t.dr[j],num=p.num??(i*4+j+1);
  cards+=`<div class="indy26-card" style="--c:${t.c}"><div class="indy26-photo ph" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload driver portrait">${p.img?`<img src="${p.img}" alt="">`:SIL}</div><div class="indy26-label"><span class="indy26-number num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(num)}</span><div class="indy26-words"><span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.first)}</span><span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.name)}</span></div></div></div>`;
 }
 return `<div class="indy26-team" style="--c:${t.c}"><div class="indy26-drivers">${cards}</div><div class="indy26-logo lg" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload team logo">${t.logo?`<img src="${t.logo}" alt="">`:`<span class="box">${LOGO}${esc(t.team||'TEAM '+(i+1))}</span>`}</div><input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Team colour"></div>`;
}
function renderIndy26(b){
 b.className=`board indy26${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');
 const rows=Math.ceil(S.n/2);
 let t='';
 for(let i=0;i<S.n;i++)t+=`<div style="grid-column:${i%2?3:1};grid-row:${Math.floor(i/2)+1};min-width:0;min-height:0">${indy26Team(i)}</div>`;
 b.innerHTML=indy26Backdrop()+`<div class="indy26-series sl ${S.slogo?'':'empty'}" role="button" tabindex="0" data-k="slogo" aria-label="Upload series logo">${S.slogo?`<img src="${S.slogo}" alt="">`:'SERIES LOGO'}</div><div class="indy26-stage" style="--i26-rows:${rows}">${t}<div class="indy26-center"><div class="indy26-year" id="year" contenteditable="true" spellcheck="false">${esc(S.year||'2026')}</div><div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title)}</div><div class="sub" id="sub" contenteditable="true" spellcheck="false">${esc(S.sub)}</div><div class="indy26-decoration"><svg viewBox="0 0 400 140" aria-hidden="true"><path d="M5 80H395 M15 93H385 M32 107H365" fill="none" stroke="#daf4fa" stroke-opacity=".35" stroke-width="2"/><path d="M40 112 C92 46 192 62 240 99 S350 124 385 57" fill="none" stroke="#e5f8fe" stroke-opacity=".72" stroke-width="3"/><path d="M-8 135 C106 24 225 142 410 36" fill="none" stroke="#9ae1f2" stroke-opacity=".55" stroke-width="2"/></svg></div></div></div>`;
}

/* Shared visibility + overlays for every series; the card grid never reflows when toggling an option. */
function decorateOptions(b){
  const active=S.teams.slice(0,S.n);
  const odd=active.some(t=>((t.cnt||S.d)%2)!==0);
  b.classList.toggle('uniform-logo',odd&&S.logo==='auto');
  b.classList.toggle('logo-below',S.logo==='below');
  b.classList.toggle('has-band',!!S.opts.band);
  b.classList.toggle('no-numbers',!S.opts.num);
  b.classList.toggle('no-flags',!S.opts.flag);
  b.classList.toggle('no-series',!S.opts.slogo);
  b.classList.toggle('no-hero',!S.opts.hero);
  // Each renderer owns its portrait geometry. Overlay controls are anchored to the
  // portrait (not to a new track) so toggling never changes a measured card size.
  for(const photo of b.querySelectorAll('[data-k="img"][data-t][data-d]')){
    const i=Number(photo.dataset.t),j=Number(photo.dataset.d),p=S.teams[i]?.dr[j];
    if(!p)continue;
    const root=b;
    const matching=(sel)=>[...root.querySelectorAll(sel)].some(el=>Number(el.dataset.t)===i&&Number(el.dataset.d)===j);
    if(S.opts.num&&!matching('.num[data-t][data-d]')){
      const el=document.createElement('span');el.className='num opt-number';
      el.contentEditable='true';el.spellcheck=false;el.dataset.t=i;el.dataset.d=j;
      el.textContent=p.num??(i*4+j+1);photo.append(el);
    }
    if(S.opts.flag&&!matching('[data-k="flag"][data-t][data-d]')){
      const el=document.createElement('span');el.className='opt-flag';el.role='button';el.tabIndex=0;
      el.dataset.k='flag';el.dataset.t=i;el.dataset.d=j;
      el.setAttribute('aria-label','Upload driver flag');
      if(p.flag){const img=document.createElement('img');img.src=p.flag;img.alt='';el.append(img)}
      else el.textContent=p.nation||'⚑';
      photo.append(el);
    }
    if(S.opts.rookie&&!matching('[data-k="rookie"][data-t][data-d]')){
      const el=document.createElement('button');el.type='button';
      el.className='rk opt-rookie'+(p.rookie?' on':'');
      el.dataset.k='rookie';el.dataset.t=i;el.dataset.d=j;
      el.setAttribute('aria-pressed',String(!!p.rookie));el.textContent='ROOKIE';
      photo.append(el);
    }
  }
  // A logo band is visual decoration only, and never adds a grid row.
  if(S.opts.band){
    const selectors={f2:'.f2-team',f1:'.team',f3:'.team',indy:'.team',fox:'.fox-team',indy26:'.indy26-team',fe10:'.fe10-team',fe22:'.fe22-team',fe12:'.fe12-team',sf24:'.sf-card',sf26:'.sf-card',mg24:'.mg-team',mg25:'.mg-team',mg26:'.mg-team'};
    for(const el of b.querySelectorAll(selectors[S.preset]||'.team')){
      if(el.querySelector('.band')||el.querySelector(':scope > .opt-logo-band'))continue;
      const band=document.createElement('div');band.className='opt-logo-band';band.setAttribute('aria-hidden','true');
      el.prepend(band);
    }
  }
  if(b.classList.contains('mix-board')){applyCustomAppearance(b);return;}
  // Show the shared series upload slot even in styles without an intrinsic logo slot.
  if(S.opts.slogo&&!b.querySelector('[data-k="slogo"]')){
    const el=document.createElement('div');el.className='opt-series';el.role='button';el.tabIndex=0;
    el.dataset.k='slogo';el.setAttribute('aria-label','Upload series logo');
    el.innerHTML=S.slogo?`<img src="${S.slogo}" alt="">`:'SERIES LOGO';b.append(el);
  }
  if(S.opts.hero&&!b.querySelector('[data-k="hero"]')){
    const el=document.createElement('div');el.className='opt-hero';el.role='button';el.tabIndex=0;
    el.dataset.k='hero';el.setAttribute('aria-label','Upload optional centerpiece image');
    el.innerHTML=S.hero?`<img src="${S.hero}" alt="">`:'CENTERPIECE IMAGE';b.append(el);
  }
  applyCustomAppearance(b);
}
function render(){
  const orbit=S.layout==='orbit',b=$('#board');
  try{
  if(isQuickPreset()){const d=mixState();d.mixEnabled=true;d.mixLayout=S.preset==='customOrbit'?'orbit':'grid';renderComposerV14(b);return;}
  if(S.customEnabled && mixState().mixEnabled){renderComposerV14(b);return;}
  if(S.preset==='f2'){renderF2(b);return;}
  if(S.preset==='fox'){renderFox(b);return;}
  if(S.preset==='indy26'){renderIndy26(b);return;}
  if(S.preset==='fe10'){renderFE10(b);return;}
  if(S.preset==='fe22'){renderFE22(b);return;}
  if(S.preset==='fe12'){renderFE12(b);return;}
  if(S.preset==='sf24'||S.preset==='sf26'){renderSF(b);return;}
  if(['mg24','mg25','mg26'].includes(S.preset)){renderMoto(b);return;}
  b.className=`board ${S.bg} ${S.preset}${S.pv?' pv':''}${orbit?' orbit':''}${orbit&&S.n%2?' has-orphan':''}`;
  let h='';
  if(orbit){
    const odd=S.n%2===1,sn=S.n-(odd?1:0),m=sn/2,B=10,den=1-Math.sin(Math.PI*.5/m),ind=S.preset==='indy';
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
  }finally{decorateOptions(b);}
}

// 16:9 fit: heights scale linearly with team width, so one factor makes every row fit
function fitOrbit(){
  const b=$('#board');if(!b.classList.contains('orbit')||!b.clientWidth)return;
  b.style.setProperty('--s',1);
  const bw=b.clientWidth;let hm=0;
  b.querySelectorAll('.team').forEach(t=>hm=Math.max(hm,t.offsetHeight));
  const avail=((56.25-4.8-(S.rows-1)*1.2)/S.rows)*bw/100;
  b.style.setProperty('--s',Math.min(1,avail/hm*.97).toFixed(3));
}
new ResizeObserver(fitOrbit).observe($('#board'));
if(document.fonts)document.fonts.ready.then(fitOrbit);
addEventListener('load',fitOrbit);

// ---- controls
$('#rT').oninput=e=>{S.n=+e.target.value;$('#oT').textContent=S.n;syncTeamEditor();render()};
document.querySelectorAll('input[type=radio]').forEach(r=>r.addEventListener('change',e=>{
  const v=e.target.value,n=e.target.name;
  if(n==='p'){
    if(v==='custom'){activateCustom();return}
    if(v==='customOrbit'||v==='customGrid'){enterQuickPreset(v);return}
    if(S.customEnabled)customDraft=JSON.parse(JSON.stringify(S));
    loadPreset(v);return;
  }
  if(isQuickPreset()&&n==='l'){enterQuickPreset(v==='orbit'?'customOrbit':'customGrid');return;}
  if(S.customEnabled && ['l','c','g','b'].includes(n)){const mx=hcBegin();if(n==='l')mx.mixLayout=v;if(n==='c')mx.mixCols=Number(v);if(n==='g')mx.mixLogoPosition=v;if(n==='b')mx.mixTone=({light:'light',grey:'metal',dark:'dark'})[v];syncMixPanel();render();return;}
  if(n==='d'){S.d=+v;S.teams.forEach(t=>t.cnt=0);syncTeamEditor()}if(n==='c')S.cols=+v;if(n==='b')S.bg=v;if(n==='l')S.layout=v;if(n==='g')S.logo=v;render();}));
document.querySelectorAll('[data-o]').forEach(c=>c.addEventListener('change',e=>{S.opts[e.target.dataset.o]=e.target.checked?1:0;render()}));
$('#pv').onchange=e=>{S.pv=e.target.checked;render()};
$('#teamSelect').onchange=e=>{S.selected=Number(e.target.value);syncTeamEditor()};
$('#teamDrivers').onchange=e=>{S.teams[S.selected].cnt=Number(e.target.value);syncTeamEditor();render()};
$('#teamName').oninput=e=>{S.teams[S.selected].team=e.target.value;const el=$('#teamSelect').selectedOptions[0];if(el)el.textContent=(S.selected+1)+'. '+e.target.value;render()};
$('#saveProject').onclick=()=>{
 const blob=new Blob([JSON.stringify({version:3,settings:S},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lineup-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
};
$('#openProject').onclick=()=>$('#projectFile').click();
$('#projectFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{
 const o=JSON.parse(await file.text()),v=o.settings||o;
 if(!Array.isArray(v.teams)||v.teams.length<4||!v.preset)throw Error('Unsupported lineup project');
 Object.assign(S,v);S.n=Math.max(4,Math.min(14,Number(S.n)||10));S.d=Math.max(2,Math.min(4,Number(S.d)||2));S.selected=0;
 sync();render();
 }catch(err){alert('Could not open project: '+err.message)}e.target.value='';
};

// ---- editing
const board=$('#board'),P=el=>S.teams[+el.dataset.t].dr[+el.dataset.d];
board.addEventListener('input',e=>{
  const el=e.target;
  if(el.id==='ttl')S.title=el.innerText;
  else if(el.id==='year')S.year=el.textContent;
  else if(el.id==='sub')S.sub=el.textContent;
  else if(el.classList.contains('drvteam'))P(el).teamName=el.textContent;
  else if(el.classList.contains('f'))P(el).first=el.textContent;
  else if(el.classList.contains('t')){P(el).name=el.textContent;if(['f1','f3','indy'].includes(S.preset))el.style.fontSize=fit(el.textContent,S.d)}
  else if(el.classList.contains('num'))P(el).num=el.textContent;
  else if(el.classList.contains('cp')){
    const t=S.teams[+el.dataset.t],c=el.value,tm=el.closest('.team,.fox-team,.indy26-team,.fe10-team,.fe22-team,.fe12-team,.hc-team');t.c=c;
    if(tm){tm.style.setProperty('--c',c);tm.style.setProperty('--c2',shade(c,-.3));tm.style.setProperty('--tc',tc(c));}}
});
board.addEventListener('keydown',e=>{
  const el=e.target;
  if(e.key==='Enter'&&(el.classList.contains('t')||el.classList.contains('f')||el.classList.contains('num')||el.id==='sub'||el.id==='year')){e.preventDefault();el.blur()}
  else if((e.key==='Enter'||e.key===' ')&&el.dataset&&el.dataset.k&&el.getAttribute('role')==='button'){e.preventDefault();el.click()}
});
let target=null;
board.addEventListener('click',e=>{
  if(e.target.closest('.num,.t,.f,.cp,.drvteam'))return;
  const b=e.target.closest('[data-k]');if(!b)return;
  if(b.dataset.k==='rookie'){const p=P(b);p.rookie=!p.rookie;render();return}
  target=Object.assign({},b.dataset);$('#file').value='';$('#file').click();
});
$('#file').onchange=e=>{
  const f=e.target.files[0];if(!f||!target)return;
  const r=new FileReader();
  r.onload=()=>{const k=target.k;
    if(k==='slogo'){S.slogo=r.result;S.opts.slogo=1;document.querySelector('[data-o=slogo]').checked=true;}
    else if(k==='hero'){S.hero=r.result;S.opts.hero=1;document.querySelector('[data-o=hero]').checked=true;}
    else{const t=S.teams[+target.t];
      if(k==='logo')t.logo=r.result;else t.dr[+target.d][k==='driverlogo'?'logo':k==='flag'?'flag':'img']=r.result}
    render()};
  r.readAsDataURL(f);
};

// === Configurable custom style layer. It is never written into the 13 original templates. ===
const CUSTOM_FONTS={
 '':'Use template font',
 '"Titillium Web",Arial,sans-serif':'Titillium Web — racing',
 '"Barlow Condensed",Arial,sans-serif':'Barlow Condensed',
 '"Barlow",Arial,sans-serif':'Barlow',
 '"Archivo Black",Impact,sans-serif':'Archivo Black',
 'Impact,"Arial Narrow",sans-serif':'Impact',
 'Arial,Helvetica,sans-serif':'Arial / Helvetica',
 'Georgia,serif':'Georgia',
 '"Courier New",monospace':'Monospace',
 '"Trebuchet MS",sans-serif':'Trebuchet MS'
};
const CUSTOM_BASES=[['f1','F1 2022'],['f3','F3 2025'],['f2','F2 2022'],['indy','IndyCar 2025'],['fox','IndyCar Broadcast'],['indy26','IndyCar 2026'],['fe10','Formula E Season 10'],['fe22','Formula E 2021/22'],['fe12','Formula E Season 12'],['sf24','Super Formula 2024'],['sf26','Super Formula 2026'],['mg24','MotoGP 2024'],['mg25','MotoGP 2025'],['mg26','MotoGP 2026']];
const DEFAULT_NAME=Object.freeze({font:'',colorOn:false,color:'#ffffff',plateOn:false,plate:'#e10600',size:100,align:'original',x:0,y:0});
const freshCustom=()=>({bgOn:false,bg:'#ffffff',titleFont:'',titleColorOn:false,titleColor:'#ffffff',titleSize:100,
  nameGlobal:{...DEFAULT_NAME},nameTeams:{},nameDrivers:{},
  rookieOn:false,rookieText:'ROOKIE',rookieFont:'',rookieBg:'#b733aa',rookieFg:'#ffffff',rookieSize:100});
let customDraft=null;
const customState=()=>S.customDesign||(S.customDesign=freshCustom());
const customNode=id=>document.getElementById(id);
function getNameScope(){return customNode('customNameScope')?.value||'all'}
function effectiveNameRule(i,j){
 const d=customState(),key=i+':'+j;
 return {...DEFAULT_NAME,...d.nameGlobal,...(d.nameTeams[i]||{}),...(d.nameDrivers[key]||{})};
}
function scopeNameRule(){
 const d=customState(),scope=getNameScope(),i=S.selected||0,j=Number(customNode('customDriver')?.value||0);
 if(scope==='all')return {...DEFAULT_NAME,...d.nameGlobal};
 if(scope==='team')return {...DEFAULT_NAME,...d.nameGlobal,...(d.nameTeams[i]||{})};
 return effectiveNameRule(i,j);
}
function editScopeRule(k,v){
 const d=customState(),scope=getNameScope(),i=S.selected||0,j=Number(customNode('customDriver')?.value||0),key=i+':'+j;
 let dest;
 if(scope==='all')dest=d.nameGlobal;
 else if(scope==='team')dest=d.nameTeams[i]||(d.nameTeams[i]={});
 else dest=d.nameDrivers[key]||(d.nameDrivers[key]={});
 dest[k]=v;
 render();
}
function activateCustom(){
 if(customDraft){
   const copy=JSON.parse(JSON.stringify(customDraft));
   Object.keys(S).forEach(k=>delete S[k]);Object.assign(S,copy);
 }else{
   S.customDesign=freshCustom();
 }
 S.customEnabled=true;
 if(!S.customDesign)S.customDesign=freshCustom();
 sync();render();
}
function syncCustomPanel(){
 const panel=customNode('customPanel');if(!panel)return;
 panel.hidden=!S.customEnabled||isQuickPreset();
 if(!S.customEnabled||isQuickPreset())return;
 const d=customState();customNode('customBase').value=S.preset;
 for(const [key,val] of Object.entries({customBgOn:d.bgOn,customBg:d.bg,
  customTitleFont:d.titleFont,customTitleColorOn:d.titleColorOn,customTitleColor:d.titleColor,customTitleSize:d.titleSize,
  customRookieOn:d.rookieOn,customRookieText:d.rookieText,customRookieFont:d.rookieFont,
  customRookieBg:d.rookieBg,customRookieFg:d.rookieFg,customRookieSize:d.rookieSize})){
    const el=customNode(key);if(!el)continue;
    if(el.type==='checkbox')el.checked=!!val;else el.value=String(val);
 }
 customNode('customTitleSizeOut').textContent=d.titleSize+'%';
 customNode('customRookieSizeOut').textContent=d.rookieSize+'%';
 syncCustomTargets();
 syncMixPanel();
}
function syncCustomTargets(){
 if(!S.customEnabled)return;
 const t=S.teams[S.selected];if(!t)return;
 customNode('customTeamColor').value=t.c;
 const driver=customNode('customDriver'),previous=Number(driver.value)||0;
 driver.innerHTML=Array.from({length:t.cnt||S.d},(_,j)=>`<option value="${j}">${j+1}. ${esc((t.dr[j].first||'')+' '+t.dr[j].name)}</option>`).join('');
 driver.value=String(Math.min(previous,(t.cnt||S.d)-1));
 syncNameFields();
}
function syncNameFields(){
 if(!S.customEnabled)return;
 const rule=scopeNameRule();
 customNode('customDriverRow').hidden=getNameScope()!=='driver';
 const kv={customNameFont:rule.font,customNameColor:rule.color,customNameColorOn:rule.colorOn,
  customPlate:rule.plate,customPlateOn:rule.plateOn,customNameSize:rule.size,
  customAlign:rule.align,customX:rule.x,customY:rule.y};
 for(const [id,value] of Object.entries(kv)){
    const el=customNode(id);if(el.type==='checkbox')el.checked=!!value;else el.value=String(value);
 }
 customNode('customNameSizeOut').textContent=rule.size+'%';
 customNode('customXOut').textContent=(rule.x>0?'+':'')+rule.x;
 customNode('customYOut').textContent=(rule.y>0?'+':'')+rule.y;
}
function setCustomScaledFont(el,scale){
 if(!el.dataset.customBaseFont){
   const base=parseFloat(getComputedStyle(el).fontSize)||12;
   el.dataset.customBaseFont=String(base);
 }
 const px=parseFloat(el.dataset.customBaseFont)*scale/100;
 el.style.setProperty('font-size',Math.max(5,px).toFixed(2)+'px','important');
}
const NAME_BLOCKS='.nm,.fox-nameplate,.indy26-words,.fe10-driver-slot,.fe22-name,.fe12-name,.sf-data,.mg-drivername,.mix-label,.hc-nameplate';
function applyCustomAppearance(b){
 b.classList.toggle('custom-studio',!!S.customEnabled);
 b.style.removeProperty('background');
 if(!S.customEnabled)return;
 const d=customState();
 if(d.bgOn)b.style.setProperty('background',d.bg,'important');
 const titleNodes=b.querySelectorAll('.ttl,.mg-year,.title-year,.indy26-year');
 for(const el of titleNodes){
   if(d.titleFont)el.style.setProperty('font-family',d.titleFont,'important');
   if(d.titleColorOn)el.style.setProperty('color',d.titleColor,'important');
   if(d.titleSize!==100)setCustomScaledFont(el,d.titleSize);
 }
 // The underlying font sizes and positions belong to the chosen template.
 // Overrides are applied to text nodes and their enclosing name blocks after render,
 // so neither row heights nor portraits are mutated.
 const blocks=new Map();
 for(const el of b.querySelectorAll('.t[data-t][data-d],.f[data-t][data-d],.fe10-barname[data-t][data-d]')){
   const i=Number(el.dataset.t),j=Number(el.dataset.d),rule=effectiveNameRule(i,j);
   if(rule.font)el.style.setProperty('font-family',rule.font,'important');
   if(rule.colorOn)el.style.setProperty('color',rule.color,'important');
   if(rule.size!==100)setCustomScaledFont(el,rule.size);
   if(rule.align!=='original')el.style.textAlign=rule.align;
   // `translate` composes with the original template's transforms; it is a
   // paint-only change and does not cause grid/card reflow.
   if(rule.x||rule.y)el.style.translate=rule.x+'cqw '+rule.y+'cqw';
   const block=el.closest(NAME_BLOCKS);
   if(block&&!blocks.has(block))blocks.set(block,{i,j,rule});
 }
 for(const [block,{i,rule}] of blocks){
   if(rule.plateOn){
     block.style.setProperty('background',rule.plate,'important');
     // On F1/F3 a shared angled strip must only be recolored when every driver
     // in the group has the same plate override. Otherwise a one-driver edit
     // would unexpectedly recolor their team-mate's segment too.
     if(block.matches('.nm')){
       const team=block.closest('.team'),count=S.teams[i]?.cnt||S.d;
       const uniformlyColored=Array.from({length:count},(_,j)=>effectiveNameRule(i,j))
         .every(r=>r.plateOn&&r.plate===rule.plate);
       if(team&&uniformlyColored){
         team.classList.add('custom-plate-active');team.style.setProperty('--custom-plate',rule.plate);
       }
     }
   }
   if(rule.align!=='original'){
     if(block.matches('.nm,.fe10-driver-slot,.fox-nameplate,.indy26-words,.fe12-name,.sf-data,.mg-drivername,.mix-label,.hc-nameplate')){
       block.style.setProperty('justify-content',rule.align==='left'?'flex-start':rule.align==='right'?'flex-end':'center','important');
       block.style.setProperty('text-align',rule.align==='left'?'left':rule.align==='right'?'right':'center','important');
       if(block.matches('.fe12-name,.indy26-words,.sf-data,.fox-nameplate,.mix-label,.hc-nameplate'))block.style.setProperty('align-items',rule.align==='left'?'flex-start':rule.align==='right'?'flex-end':'center','important');
     } else if(block.matches('.fe22-name')){
       block.style.setProperty('align-items',rule.align==='left'?'flex-start':rule.align==='right'?'flex-end':'center','important');
       block.style.setProperty('text-align',rule.align==='left'?'left':rule.align==='right'?'right':'center','important');
     }
   }
 }
 if(d.rookieOn){
   for(const tag of b.querySelectorAll('.rk')){
      tag.textContent=d.rookieText||'ROOKIE';
      tag.style.setProperty('background',d.rookieBg,'important');
      tag.style.setProperty('color',d.rookieFg,'important');
      if(d.rookieFont)tag.style.setProperty('font-family',d.rookieFont,'important');
      if(d.rookieSize!==100)setCustomScaledFont(tag,d.rookieSize);
   }
 }
}
// Apply an optional plate color to F1/F3 angled strips without squaring the clipping geometry.
// The rule is inserted as a stylesheet rule rather than changing all team colors.
function initCustomStudio(){
 const base=customNode('customBase');
 base.innerHTML=CUSTOM_BASES.map(([v,n])=>`<option value="${v}">${n}</option>`).join('');
 for(const id of ['customTitleFont','customNameFont','customRookieFont']){
    customNode(id).innerHTML=Object.entries(CUSTOM_FONTS).map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
 }
 base.addEventListener('change',()=>{
   const design=JSON.parse(JSON.stringify(customState())),previous=JSON.parse(JSON.stringify(S));
   loadPreset(base.value);
   if(customNode('customKeepRoster').checked){
      S.teams=previous.teams;S.n=previous.n;S.d=previous.d;S.selected=previous.selected;
      S.opts=previous.opts;S.slogo=previous.slogo;S.hero=previous.hero;
   }
   design.mixEnabled=false; design.mixInitialized=false; // Reference is shown until user changes a hybrid setting.
   S.customEnabled=true;S.customDesign=design;
   sync();render();
 });
 customNode('customLoadExamples').onclick=()=>{
   const p=S.preset,custom=JSON.parse(JSON.stringify(customState()));
   loadPreset(p);S.customEnabled=true;S.customDesign=custom;sync();render();
 };
 customNode('resetCustomAll').onclick=()=>{S.customDesign=freshCustom();syncCustomPanel();render()};
 customNode('customBgOn').onchange=e=>{customState().bgOn=e.target.checked;render()};
 customNode('customBg').oninput=e=>{customState().bg=e.target.value;render()};
 customNode('customTitleFont').onchange=e=>{customState().titleFont=e.target.value;render()};
 customNode('customTitleColorOn').onchange=e=>{customState().titleColorOn=e.target.checked;render()};
 customNode('customTitleColor').oninput=e=>{customState().titleColor=e.target.value;render()};
 customNode('customTitleSize').oninput=e=>{customState().titleSize=Number(e.target.value);customNode('customTitleSizeOut').textContent=e.target.value+'%';render()};
 customNode('customTeamColor').oninput=e=>{S.teams[S.selected].c=e.target.value;render()};
 customNode('customAllTeams').onclick=()=>{const color=customNode('customTeamColor').value;S.teams.slice(0,S.n).forEach(t=>t.c=color);render()};
 customNode('customNameScope').onchange=()=>syncNameFields();
 customNode('customDriver').onchange=()=>syncNameFields();
 const nameControls={customNameFont:['font','change'],customNameColor:['color','input'],customNameColorOn:['colorOn','change'],
   customPlate:['plate','input'],customPlateOn:['plateOn','change'],customNameSize:['size','input'],
   customAlign:['align','change'],customX:['x','input'],customY:['y','input']};
 for(const [id,[key,evt]] of Object.entries(nameControls)){
    customNode(id).addEventListener(evt,e=>{
       const v=e.target.type==='checkbox'?e.target.checked:e.target.type==='range'?Number(e.target.value):e.target.value;
       editScopeRule(key,v);
       if(['size','x','y'].includes(key)){
         const label={size:'customNameSizeOut',x:'customXOut',y:'customYOut'}[key];
         customNode(label).textContent=key==='size'?v+'%':(v>0?'+':'')+v;
       }
    });
 }
 customNode('customResetScope').onclick=()=>{
   const d=customState(),scope=getNameScope(),i=S.selected||0,j=Number(customNode('customDriver').value||0);
   if(scope==='all')d.nameGlobal={...DEFAULT_NAME};
   else if(scope==='team')delete d.nameTeams[i];
   else delete d.nameDrivers[i+':'+j];
   syncNameFields();render();
 };
 const rookieKeys={customRookieOn:'rookieOn',customRookieText:'rookieText',customRookieFont:'rookieFont',
   customRookieBg:'rookieBg',customRookieFg:'rookieFg',customRookieSize:'rookieSize'};
 for(const [id,key] of Object.entries(rookieKeys)){
    const el=customNode(id),event=el.type==='checkbox'||el.tagName==='SELECT'?'change':'input';
    el.addEventListener(event,e=>{
      const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;
      customState()[key]=value;
      if(key==='rookieSize')customNode('customRookieSizeOut').textContent=value+'%';
      render();
    });
 }
}
initCustomStudio();

/* ===== v11 composable theme / content / placement subsystem ===== */
const MIX_TEAMS={
 auto:'Use base template',f1:'F1 angled strips',f3:'F3 metallic bands',f2:'F2 2022 ribbons',indy:'IndyCar 2025 paper',
 broadcast:'IndyCar broadcast',ice:'IndyCar 2026 ice',formulae:'Formula E S12 split panel',
 pill:'Formula E Season 10 pill',fe22:'Formula E 2021/22 ribbon',motogp:'MotoGP shared shape',mg24:'MotoGP 2024 number-bar',mg25:'MotoGP 2025 panel',mg26:'MotoGP 2026 split strip',sf:'Super Formula timing bars',sf26:'Super Formula 2026 timing'
};
const MIX_DRIVERS={auto:'Use team card',ribbon:'Angled racing strip',metal:'F3 metallic strip',
 broadcast:'Broadcast numbered frame',ice:'IndyCar number coin',pill:'Rounded pill',paper:'IndyCar paper nameplate',
 clean:'Formula E clean white',fe22:'Formula E bold-name ribbon',segment:'MotoGP segmented',mg24:'MotoGP side numbers',mg25:'MotoGP flat color',mg26:'MotoGP split bar',timing:'Timing-row label',sf26:'Super Formula timing pill',f2:'F2 rookie strip'};
const MIX_SOURCE_STYLES={f1:['f1','ribbon'],f3:['f3','metal'],f2:['f2','f2'],
 indy:['indy','paper'],fox:['broadcast','broadcast'],indy26:['ice','ice'],
 fe10:['pill','pill'],fe22:['fe22','fe22'],fe12:['formulae','clean'],
 sf24:['sf','timing'],sf26:['sf26','sf26'],
 mg24:['mg24','mg24'],mg25:['mg25','mg25'],mg26:['mg26','mg26']};
const MIX_DEFAULTS={mixEnabled:false,mixLayout:'grid',mixCols:0,mixTeam:'auto',mixDriver:'auto',
 mixOrbitCurve:8.3,mixTeamStyles:{},mixDriverStyles:{},mixLogoPosition:'auto',mixTitleMode:'cell',mixTitleRow:1,
 mixTitleCol:1,mixTitleSpan:1,mixTitleAlign:'center',mixSeriesMode:'in-title',mixSeriesRow:1,
 mixSeriesCol:2,mixTone:'navy',mixRowHeight:15.5,mixRowGap:1.5,mixShowTeamNames:false,
 mixUseTeamPlate:false,mixUseTeamText:false,mixTeamPlateOverrides:{},mixTeamTextOverrides:{}};
function mixState(){const d=customState();for(const [key,val] of Object.entries(MIX_DEFAULTS)){
 if(d[key]===undefined)d[key]=val&&typeof val==='object'?JSON.parse(JSON.stringify(val)):val;
}return d}
function mixBaseStyle(){return MIX_SOURCE_STYLES[S.preset]||['f1','ribbon']}
function mixTeamStyle(i){const d=mixState(),value=d.mixTeamStyles[i]||d.mixTeam;return value==='auto'?mixBaseStyle()[0]:value}
function mixDriverStyle(i,j){const d=mixState(),value=d.mixDriverStyles[i+':'+j]||d.mixDriver;
 if(value!=='auto')return value;
 const team=mixTeamStyle(i);const matches={f1:'ribbon',f3:'metal',f2:'f2',indy:'paper',broadcast:'broadcast',ice:'ice',formulae:'clean',pill:'pill',fe22:'fe22',motogp:'segment',mg24:'mg24',mg25:'mg25',mg26:'mg26',sf:'timing',sf26:'sf26'};
 return matches[team]||mixBaseStyle()[1];
}
function mixText(str){return esc(String(str??''))}
function mixSeriesMark(){return `<div class="mix-series-mark" role="button" tabindex="0" data-k="slogo" aria-label="Upload series logo">${S.slogo?`<img src="${S.slogo}" alt="">`:(S.preset==='f2'?'F2':'SERIES LOGO')}</div>`}
function mixSeriesTitle(withLogo=true){
 return `<div class="mix-series">${withLogo?mixSeriesMark():''}<div id="ttl" class="ttl" contenteditable="true" spellcheck="false">${mixText(S.title)}</div><div id="sub" class="sub" contenteditable="true" spellcheck="false">${mixText(S.sub)}</div></div>`;
}
function mixDriver(i,j){
 const t=S.teams[i],p=t.dr[j],frame=mixDriverStyle(i,j),number=p.num??(i*S.d+j+1);
 const hasFirst=!!(p.first&&p.first!=='First');
 const flag=S.opts.flag?`<span class="mix-flag" role="button" tabindex="0" data-k="flag" data-t="${i}" data-d="${j}" aria-label="Upload driver flag">${p.flag?`<img src="${p.flag}" alt="">`:mixText(p.nation||'🏁')}</span>`:'';
 const num=S.opts.num?`<span class="mix-num num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${mixText(number)}</span>`:'';
 return `<div class="mix-driver frame-${frame}" data-driver="${j}" data-frame="${frame}" data-t="${i}" data-d="${j}">
  <div class="mix-photo" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload ${mixText(p.name)} photo">${p.img?`<img src="${p.img}" alt="">`:SIL}</div>
  <div class="mix-label">${hasFirst?`<span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${mixText(p.first)}</span>`:''}<span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${mixText(p.name)}</span></div>
  ${num}${flag}${S.opts.rookie?`<button class="rk mix-rookie ${p.rookie?'on':''}" data-k="rookie" data-t="${i}" data-d="${j}" title="${p.rookie?'Remove rookie status':'Mark as rookie'}" aria-label="${p.rookie?'Remove rookie tag':'Mark as rookie'}: ${mixText(p.name)}" aria-pressed="${!!p.rookie}">${p.rookie?'ROOKIE':'+'}</button>`:''}</div>`;
}
function mixTeam(i,extra={}){
 const t=S.teams[i],d=t.cnt||S.d,st=extra.forceStyle||mixTeamStyle(i);
 const globalOdd=S.teams.slice(0,S.n).some(t=>(t.cnt||S.d)%2===1);
 const design=mixState(),lp=design.mixLogoPosition;
 const place=(lp==='auto'?(globalOdd?(i%2?'right':'left'):'center'):lp);
 const classes=['mix-team','team-'+st,'logo-'+place].join(' ');
 return `<div class="${classes}" data-team="${i}" data-count="${d}" data-style="${st}" style="--c:${t.c};--tc:${tc(t.c)};--trim:${t.trim||t.c}" >
    ${S.opts.band?'<div class="mix-band"></div>':''}
    <div class="mix-photozone">${Array.from({length:d},(_,j)=>mixDriver(i,j)).join('')}</div>
    <div class="mix-team-logo" role="button" tabindex="0" data-k="logo" data-t="${i}" aria-label="Upload logo for ${mixText(t.team)}">${logoBody(t,i)}</div>
    ${design.mixShowTeamNames?`<span class="mix-teamtext">${mixText(t.team)}</span>`:''}
    <input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Team ${i+1} color"></div>`;
}
function mixTeamTile(i,row,col,columns,extra={}){
 return `<div class="mix-tile team-tile" data-index="${i}" style="grid-column:${2*col-1}/span 2;grid-row:${row}">${mixTeam(i,extra)}</div>`;
}
function mixGridHtml(extra={}){
 const d=mixState();const cols=extra.cols||(Number(d.mixCols)|| (S.n>=10?4:S.n>=7?3:2));
 const maxRows=Math.max(9,Math.ceil((S.n+2)/cols)+2),occupied=new Set(),key=(r,c)=>r+':'+c;
 const reserve=(row,col,span=1)=>{
   const r=Math.max(1,Math.min(maxRows,Number(row)||1)),c=Math.max(1,Math.min(cols,Number(col)||1)),ss=Math.min(span,cols-c+1);
   for(let dx=0;dx<ss;dx++)if(occupied.has(key(r,c+dx)))return null;
   for(let dx=0;dx<ss;dx++)occupied.add(key(r,c+dx));
   return {r,c,span:ss};
 };
 const titleMode=extra.isF2?'cell':d.mixTitleMode;
 const isF2=!!extra.isF2;
 const titleRow=isF2?1:d.mixTitleRow,titleCol=isF2?1:d.mixTitleCol,titleSpan=isF2?1:Number(d.mixTitleSpan)||1;
 const wantTitle=titleMode==='cell',tSlot=wantTitle?reserve(titleRow,titleCol,titleSpan):null;
 const ownLogo=!isF2&&d.mixSeriesMode==='own-cell';
 let logoSlot=ownLogo?reserve(d.mixSeriesRow,d.mixSeriesCol,1):null;
 if(ownLogo&&!logoSlot){for(let r=1;r<=maxRows&&!logoSlot;r++)for(let c=1;c<=cols&&!logoSlot;c++)logoSlot=reserve(r,c,1)}
 const positions=[];
 for(let i=0;i<S.n;i++){
   let pos=null;
   for(let r=1;r<=maxRows&&!pos;r++)for(let c=1;c<=cols&&!pos;c++)if(!occupied.has(key(r,c)))pos=reserve(r,c,1);
   if(!pos)break;
   positions.push(pos);
 }
 // Center incomplete final rows if no reserved title/logo tile occupies that row.
 const maxPlacedRow=Math.max(1,...positions.map(x=>x.r),tSlot?.r||1,logoSlot?.r||1);
 const lastGroup=positions.filter(x=>x.r===maxPlacedRow);
 const hasOther=(tSlot&&tSlot.r===maxPlacedRow)||(logoSlot&&logoSlot.r===maxPlacedRow);
 const shift=new Map();
 if(!hasOther&&lastGroup.length&&lastGroup.length<cols){
    const m=lastGroup.length,centerOffset=cols-m;
    lastGroup.forEach((slot,j)=>shift.set(slot,(centerOffset+2*j)+1));
 }
 let html='';
 if(tSlot){
  const align=d.mixTitleAlign==='left'?'mix-title-left':d.mixTitleAlign==='right'?'mix-title-right':'';
  const attachLogo=isF2||d.mixSeriesMode==='in-title';
  html+=`<div class="mix-tile series-tile ${align}" style="grid-column:${2*tSlot.c-1}/span ${2*tSlot.span};grid-row:${tSlot.r}">${mixSeriesTitle(attachLogo)}</div>`;
 }
 if(logoSlot){html+=`<div class="mix-tile" style="grid-column:${2*logoSlot.c-1}/span 2;grid-row:${logoSlot.r}"><div class="mix-logo-tile" role="button" tabindex="0" data-k="slogo">${S.slogo?`<img src="${S.slogo}" alt="">`:'<span class="mix-logo-text">UPLOAD SERIES LOGO</span>'}</div></div>`;}
 positions.forEach((p,i)=>{
   const col=shift.has(p)?shift.get(p):2*p.c-1;
   html+=`<div class="mix-tile team-tile" data-index="${i}" style="grid-column:${col}/span 2;grid-row:${p.r}">${mixTeam(i,extra.isF2?{forceStyle:'f2'}:{})}</div>`;
 });
 return {html,cols,rows:maxPlacedRow,header:titleMode==='header',titleMode};
}
function renderComposer(b,extra={}){
 const d=mixState();const orbit=!extra.isF2&&d.mixLayout==='orbit';
 const tone=extra.isF2?'navy':d.mixTone;
 b.className=`board mix-board mix-tone-${tone}${extra.isF2?' f2-board':''}${orbit?' mix-orbit':''}${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');
 const height=Number(d.mixRowHeight)||15.5,gap=Number(d.mixRowGap)||1.5;
 b.style.setProperty('--mix-row-h',height+'cqw');
 if(orbit){
  const odd=S.n%2,m=Math.ceil(S.n/2),pairs=Math.floor(S.n/2);
  let inner='';
  for(let k=0;k<pairs;k++){
   inner+=`<div class="mix-tile team-tile" data-index="${2*k}" style="grid-column:1;grid-row:${k+1}">${mixTeam(2*k)}</div>`;
   inner+=`<div class="mix-tile team-tile" data-index="${2*k+1}" style="grid-column:3;grid-row:${k+1}">${mixTeam(2*k+1)}</div>`;
  }
  if(odd)inner+=`<div class="mix-tile team-tile mix-orbit-orphan" data-index="${S.n-1}" style="grid-column:1/-1;grid-row:${m}">${mixTeam(S.n-1)}</div>`;
  const mark=d.mixSeriesMode!=='hidden';
  inner+=`<div class="mix-tile mix-orbit-series" style="grid-column:2;grid-row:1/${m+1}">${mixSeriesTitle(mark)}</div>`;
  b.innerHTML=`<div class="mix-stage mix-orbit-stage" style="--mix-orbit-rows:${m};grid-template-rows:repeat(${m},minmax(0,1fr))">${inner}</div>`;
 }else{
  const grid=mixGridHtml(extra);
  const header=grid.header?`<div class="mix-header">${mixSeriesTitle(d.mixSeriesMode==='in-title')}</div>`:'';
  b.innerHTML=header+`<div class="mix-stage mix-grid" style="grid-template-columns:repeat(${grid.cols*2},minmax(0,1fr));grid-auto-rows:${height}cqw;row-gap:${gap}cqw">${grid.html}</div>`;
 }
 // All native editing/upload hooks bind through the original board event delegation.
}
/* F2 2022: dedicated broadcast composition. Independent of Custom Studio's
   mixed-card renderer; all card dimensions are set by the board, not team size. */
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
     <input class="cp" type="color" value="${t.c}" data-t="${i}" aria-label="Change team ${i+1} color">
   </div>`;
 }
 b.innerHTML=h+'</div>';
}
new ResizeObserver(()=>{
 const b=document.getElementById('board');
 if(!b.classList.contains('f2-native'))return;
 const rows=Number(b.style.getPropertyValue('--f2-rows'))||3;
 const h=Math.round(b.clientWidth*(rows*16.2+4.8)/100)+'px';
 if(b.style.height!==h)b.style.height=h;
}).observe(document.getElementById('board'));
function fillMixSelect(sel,choices){sel.innerHTML=Object.entries(choices).map(([v,n])=>`<option value="${v}">${mixText(n)}</option>`).join('')}
function syncMixPanel(){
 const wrap=document.getElementById('mixToolset');if(!wrap)return;
 wrap.hidden=!S.customEnabled||isQuickPreset();
 if(!S.customEnabled||isQuickPreset())return;
 const d=mixState();
 for(const k of ['mixEnabled','mixLayout','mixOrbitCurve','mixCols','mixTeam','mixDriver','mixLogoPosition',
 'mixTitleMode','mixTitleRow','mixTitleCol','mixTitleSpan','mixTitleAlign','mixSeriesMode',
 'mixSeriesRow','mixSeriesCol','mixTone','mixRowHeight','mixRowGap','mixShowTeamNames','mixUseTeamPlate','mixUseTeamText']){
  const el=document.getElementById(k);if(!el)continue;
  el[el.type==='checkbox'?'checked':'value']=d[k];
 }
 document.getElementById('mixTitleRowWrap').hidden=d.mixTitleMode!=='cell';
 document.getElementById('mixTitleColWrap').hidden=d.mixTitleMode!=='cell';
 document.getElementById('mixSeriesCoordWrap').hidden=d.mixSeriesMode!=='own-cell';
 document.getElementById('mixGeometryWrap').hidden=d.mixLayout==='orbit';
 document.getElementById('mixOrbitCurveWrap').hidden=d.mixLayout!=='orbit';
 document.getElementById('mixOrbitCurveOut').textContent=d.mixOrbitCurve+'%';
 document.getElementById('mixRowHeightOut').textContent=d.mixRowHeight+'%';
  const status=document.getElementById('compositionStatus');
  if(status)status.textContent=d.mixEnabled
   ?'HYBRID ACTIVE: independent layout, team shell and driver cards. Styles apply immediately.'
   :'REFERENCE MODE: original '+(CUSTOM_BASES.find(([p])=>p===S.preset)?.[1]||S.preset)+' layout.';
  syncMixTargets();
}
function syncMixTargets(){
 if(!S.customEnabled)return;
 const d=mixState(),i=S.selected||0;
 const tm=document.getElementById('mixTeamOverride'),dv=document.getElementById('mixDriverOverride');
 const driverTarget=document.getElementById('mixDriverTarget');
 if(!tm||!dv)return;
 tm.value=d.mixTeamStyles[i]||'inherit';
 document.getElementById('mixTeamPlateOverride').value=d.mixTeamPlateOverrides[i]||'inherit';
 document.getElementById('mixTeamTextOverride').value=d.mixTeamTextOverrides[i]||'inherit';
 const count=S.teams[i]?.cnt||S.d;
 if(driverTarget){
   const choices=Array.from({length:count},(_,j)=>({value:String(j),label:`${j+1}. ${S.teams[i].dr[j]?.name||'Driver '+(j+1)}`}));
   const actual=Array.from(driverTarget.options).map(o=>o.value).join(',');
   if(actual!==choices.map(o=>o.value).join(',')){
     driverTarget.innerHTML=choices.map(c=>`<option value="${c.value}">${esc(c.label)}</option>`).join('');
   }else choices.forEach((x,j)=>driverTarget.options[j].textContent=x.label);
   const selected=Math.max(0,Math.min(count-1,Number(d.mixSelectedDriver)||0));
   driverTarget.value=String(selected);
 }
 const driver=Math.max(0,Math.min(count-1,Number(d.mixSelectedDriver)||0));
 dv.value=d.mixDriverStyles[i+':'+driver]||'inherit';
}

function initMixStudio(){
 const lookup={mixTeam:MIX_TEAMS,mixDriver:MIX_DRIVERS};
 for(const [id,dict] of Object.entries(lookup))fillMixSelect(document.getElementById(id),dict);
 fillMixSelect(document.getElementById('mixTeamOverride'),{inherit:'Use global team style',...Object.fromEntries(Object.entries(MIX_TEAMS).filter(([v])=>v!=='auto'))});
 fillMixSelect(document.getElementById('mixDriverOverride'),{inherit:'Use global driver style',...Object.fromEntries(Object.entries(MIX_DRIVERS).filter(([v])=>v!=='auto'))});
 const inputKeys=['mixEnabled','mixLayout','mixOrbitCurve','mixCols','mixTeam','mixDriver','mixLogoPosition',
 'mixTitleMode','mixTitleRow','mixTitleCol','mixTitleSpan','mixTitleAlign','mixSeriesMode',
 'mixSeriesRow','mixSeriesCol','mixTone','mixRowHeight','mixRowGap','mixShowTeamNames','mixUseTeamPlate','mixUseTeamText'];
 for(const k of inputKeys){const el=document.getElementById(k);if(!el)continue;
  el.addEventListener(el.type==='range'||el.type==='number'?'input':'change',()=>{
   const d=k==='mixEnabled'&&!el.checked?mixState():hcBegin();
   d[k]=el.type==='checkbox'?el.checked:(['mixCols','mixOrbitCurve','mixTitleRow','mixTitleCol','mixTitleSpan','mixSeriesRow','mixSeriesCol','mixRowHeight','mixRowGap'].includes(k)?Number(el.value):el.value);
   if(k==='mixLayout')S.layout=el.value;
   syncMixPanel();render();
  });
 }
 document.getElementById('mixTeamOverride').addEventListener('change',e=>{
  const d=hcBegin(),i=S.selected||0;
  if(e.target.value==='inherit')delete d.mixTeamStyles[i];else d.mixTeamStyles[i]=e.target.value;
  render();
 });
 for(const [id,stateKey] of [['mixTeamPlateOverride','mixTeamPlateOverrides'],['mixTeamTextOverride','mixTeamTextOverrides']]){
   document.getElementById(id).addEventListener('change',e=>{
     const d=hcBegin(),i=S.selected||0;
     if(e.target.value==='inherit')delete d[stateKey][i];else d[stateKey][i]=e.target.value;
     syncMixPanel();render();
   });
 }
 document.getElementById('mixDriverOverride').addEventListener('change',e=>{
  const d=hcBegin(),i=S.selected||0,j=Number(document.getElementById('mixDriverTarget').value||0);
  if(e.target.value==='inherit')delete d.mixDriverStyles[i+':'+j];else d.mixDriverStyles[i+':'+j]=e.target.value;
  render();
 });
 document.getElementById('customDriver').addEventListener('change',e=>{mixState().mixSelectedDriver=Number(e.target.value)||0;syncMixTargets()});
 document.getElementById('mixDriverTarget').addEventListener('change',e=>{mixState().mixSelectedDriver=Number(e.target.value)||0;syncMixTargets()});
 document.getElementById('mixRestoreBase').addEventListener('click',()=>{mixState().mixEnabled=false;syncMixPanel();render()});
 document.getElementById('mixResetComponents').addEventListener('click',()=>{
  const d=mixState();d.mixTeamStyles={};d.mixDriverStyles={};d.mixTeamPlateOverrides={};d.mixTeamTextOverrides={};d.mixTeam='auto';d.mixDriver='auto';
  syncMixPanel();render();
 });
}
initMixStudio();


/* ================= v14 truly composable hybrid renderer =================
   Layout, team livery, and driver physical frame are separate independent axes.
   Team style never forces unrelated driver styles to fall back or go invisible. */
const HC_TIMING=new Set(['timing','sf26']);
const HC_SHELL_TIMING=new Set(['sf','sf26']);
const HC_BASE={
 f1:{layout:'orbit',tone:'light',cols:2,row:11.0,gap:.85,title:'cell',logo:'in-title'},
 f3:{layout:'orbit',tone:'metal',cols:2,row:12.0,gap:.8,title:'cell',logo:'in-title'},
 f2:{layout:'grid',tone:'navy',cols:4,row:16.0,gap:1.1,title:'cell',logo:'in-title'},
 indy:{layout:'orbit',tone:'dark',cols:2,row:11.8,gap:.9,title:'cell',logo:'in-title'},
 fox:{layout:'grid',tone:'dark',cols:2,row:15.8,gap:1.2,title:'header',logo:'in-title'},
 indy26:{layout:'orbit',tone:'blue',cols:2,row:12.5,gap:.9,title:'cell',logo:'in-title'},
 fe10:{layout:'orbit',tone:'light',cols:2,row:11.0,gap:.7,title:'cell',logo:'in-title'},
 fe22:{layout:'grid',tone:'light',cols:2,row:15,gap:1,title:'header',logo:'in-title'},
 fe12:{layout:'grid',tone:'dark',cols:4,row:17.2,gap:1.9,title:'header',logo:'in-title'},
 sf24:{layout:'grid',tone:'blue',cols:3,row:15,gap:.9,title:'header',logo:'in-title'},
 sf26:{layout:'grid',tone:'blue',cols:2,row:15.5,gap:.8,title:'header',logo:'in-title'},
 mg24:{layout:'grid',tone:'metal',cols:3,row:16.3,gap:1.4,title:'cell',logo:'in-title'},
 mg25:{layout:'grid',tone:'light',cols:3,row:16.3,gap:1.4,title:'cell',logo:'in-title'},
 mg26:{layout:'grid',tone:'light',cols:3,row:16.3,gap:1.4,title:'cell',logo:'in-title'}
};
function hcBegin(){
 const d=mixState();
 if(!d.mixInitialized){
   const x=HC_BASE[S.preset]||HC_BASE.f1;
   d.mixLayout=x.layout;d.mixCols=x.cols;d.mixTone=x.tone;d.mixRowHeight=x.row;
   d.mixRowGap=x.gap;d.mixTitleMode=x.title;d.mixSeriesMode=x.logo;
   d.mixTitleRow=1;d.mixTitleCol=S.preset==='mg26'?2:1;d.mixTitleSpan=1;
   d.mixInitialized=true;
 }
 d.mixEnabled=true;
 return d;
}
function hcLogo(t,i){
 return `<div class="hc-logo" data-k="logo" role="button" tabindex="0" data-t="${i}" aria-label="Upload team logo">${t.logo?`<img src="${t.logo}" alt="">`:`<div class="box">${LOGO}<span>LOGO</span></div>`}</div>`;
}
// Missing given names in the F1 preset used to produce single-line "IndyCar" cards.
// These are display-only defaults: user-entered first names always override them.
const HC_F1_GIVEN={Hamilton:'Lewis',Russell:'George',Verstappen:'Max',Perez:'Sergio',Norris:'Lando',Ricciardo:'Daniel',Vettel:'Sebastian',Stroll:'Lance',Ocon:'Esteban',Alonso:'Fernando',Leclerc:'Charles',Sainz:'Carlos',Gasly:'Pierre',Tsunoda:'Yuki',Bottas:'Valtteri',Zhou:'Guanyu',Magnussen:'Kevin',Schumacher:'Mick',Albon:'Alexander',Latifi:'Nicholas'};
function hcGivenName(p){
 if(p.first&&p.first!=='First')return p.first;
 if(S.preset==='f1'||isQuickPreset())return HC_F1_GIVEN[p.name]||'';
 return '';
}
function hcDriver(i,j,frame){
 const t=S.teams[i],p=t.dr[j];
 const number=p.num??(i*4+j+1),first=hcGivenName(p);
 const flag=S.opts.flag?`<span class="hc-flag" role="button" tabindex="0" data-k="flag" data-t="${i}" data-d="${j}" aria-label="Upload flag">${p.flag?`<img src="${p.flag}" alt="">`:esc(p.nation||'⚑')}</span>`:'';
 const num=S.opts.num?`<span class="hc-number num" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(number)}</span>`:'';
 const rookie=S.opts.rookie?`<button class="rk hc-rookie ${p.rookie?'on':''}" data-k="rookie" data-t="${i}" data-d="${j}" type="button" title="Toggle rookie status" aria-pressed="${!!p.rookie}">${p.rookie?'ROOKIE':'+'}</button>`:'';
 const teamPlate=hcUseTeamColor(i,'mixUseTeamPlate','mixTeamPlateOverrides');
 const teamLettering=hcUseTeamColor(i,'mixUseTeamText','mixTeamTextOverrides');
 return `<div class="hc-driver${teamPlate?' hc-team-plate':''}${teamLettering?' hc-team-lettering':''}" data-card-style="${frame}" data-t="${i}" data-d="${j}" style="--hc-plate-ink:${tc(t.c)}">
   <div class="hc-portrait" role="button" tabindex="0" data-k="img" data-t="${i}" data-d="${j}" aria-label="Upload driver ${j+1} portrait">${p.img?`<img src="${p.img}" alt="">`:SIL}</div>
   <div class="hc-nameplate">${first?`<span class="f" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(first)}</span>`:''}<span class="t" contenteditable="true" spellcheck="false" data-t="${i}" data-d="${j}">${esc(p.name)}</span></div>
   ${num}${flag}${rookie}
 </div>`;
}
// Resolve global/selected-team color modes without coupling them to the chosen card geometry.
function hcUseTeamColor(i,option,overrides){
 const d=mixState(),local=d[overrides]?.[i];
 return local==='on'||(local!=='off'&&!!d[option]);
}
function hcTeam(i){
 const t=S.teams[i],d=t.cnt||S.d,ts=mixTeamStyle(i);
 const frames=Array.from({length:d},(_,j)=>mixDriverStyle(i,j));
 const stacked=HC_SHELL_TIMING.has(ts)||frames.some(f=>HC_TIMING.has(f));
 const anyOdd=S.teams.slice(0,S.n).some(q=>((q.cnt||S.d)%2)!==0);
 const design=mixState();
 // The IndyCar 2025 reference has individual cut-out portraits and paper
 // nameplates with the logo BELOW the complete group, not between drivers.
 // When all teams are Indy-style, this is also the single consistent logo
 // position if any group contains an odd number of drivers.
 const allIndy=S.teams.slice(0,S.n).every((_,k)=>mixTeamStyle(k)==='indy');
 const logoMode=design.mixLogoPosition==='auto'?
   (stacked?'above':allIndy?'below':anyOdd?'above':ts==='indy'?'below':'center'):
   design.mixLogoPosition;
 const inline=!stacked&&['center','left','right'].includes(logoMode);
 const nslots=d+(inline?1:0),slots=[];
 if(stacked){slots.push(...frames.map((f,j)=>hcDriver(i,j,f)));}
 else{
   for(let j=0;j<=d;j++){
     if(inline&&(logoMode==='left'&&j===0||logoMode==='right'&&j===d||logoMode==='center'&&j===Math.floor(d/2)))
       slots.push(`<div class="hc-logo-slot">${hcLogo(t,i)}</div>`);
     if(j<d)slots.push(hcDriver(i,j,frames[j]));
   }
 }
 let header='',footer='';
 if(logoMode==='above'||(stacked&&logoMode!=='below'))header=`<div class="hc-logo-top">${hcLogo(t,i)}</div>`;
 if(logoMode==='below')footer=`<div class="hc-logo-bottom">${hcLogo(t,i)}</div>`;
 // Stacked timing rows always need an exterior logo. A "center" slot would
 // otherwise hide behind the driver rows and a logo would become unclickable.
 return `<div class="hc-team" data-team-style="${ts}" data-flow="${stacked?'stack':'portrait'}" data-logo="${stacked?(logoMode==='below'?'below':'above'):logoMode}" data-count="${d}" data-index="${i}" style="--c:${t.c};--tc:${tc(t.c)};--hc-slots:${nslots}">
   ${S.opts.band?'<div class="hc-band" aria-hidden="true"></div>':''}${header}
   <div class="hc-cardrow" data-flow="${stacked?'stack':'portrait'}">${slots.join('')}</div>
   ${footer}${design.mixShowTeamNames?`<div class="hc-teamname">${esc(t.team||'')}</div>`:''}
   <input class="cp" type="color" data-t="${i}" value="${t.c}" aria-label="Team ${i+1} color">
 </div>`;
}
function hcSeries(includeLogo,align='center'){
 const logo=includeLogo?`<div class="hc-series-mark" data-k="slogo" role="button" tabindex="0" aria-label="Upload series logo">${S.slogo?`<img src="${S.slogo}" alt="">`:(S.preset==='f1'?'F1':S.preset==='f2'?'F2':'SERIES')}</div>`:'';
 return `<div class="hc-series ${align}">${logo}<div class="ttl" id="ttl" contenteditable="true" spellcheck="false">${esc(S.title)}</div><div class="sub" id="sub" contenteditable="true" spellcheck="false">${esc(S.sub)}</div></div>`;
}
function hcAutoFit(b){
 // Fit text to its own physical plate, not to the selected series' original
 // template. It is safe with mixed horizontal and portrait nameplate designs.
 for(const textEl of b.querySelectorAll('.hc-nameplate .t,.hc-nameplate .f')){
   textEl.style.fontSize='';
   const plate=textEl.closest('.hc-nameplate');
   if(!plate)continue;
   let computed=parseFloat(getComputedStyle(textEl).fontSize)||12;
   const available=Math.max(10,plate.clientWidth-8);
   const measured=textEl.scrollWidth;
   if(measured>available && measured>0){
     const needed=Math.max(7,computed*available/measured*.94);
     textEl.style.fontSize=needed.toFixed(1)+'px';
   }
 }
}
function renderComposerV14(b){
 const d=mixState(),mode=d.mixLayout==='orbit'?'orbit':'grid';
 let cols=Number(d.mixCols)||2;
 cols=Math.min(4,Math.max(2,cols));
 const rowBase=Math.max(10,Math.min(24,Number(d.mixRowHeight)||16));
 const fullCount=S.teams.slice(0,S.n).map(t=>t.cnt||S.d);
 const hasStack=S.teams.slice(0,S.n).some((t,i)=>HC_SHELL_TIMING.has(mixTeamStyle(i))||Array.from({length:fullCount[i]},(_,j)=>mixDriverStyle(i,j)).some(f=>HC_TIMING.has(f)));
 const maxDrivers=Math.max(...fullCount);
 const row=mode==='orbit'?Math.max(rowBase,hasStack?maxDrivers*3.35: maxDrivers>=4?15:11):Math.max(rowBase,hasStack?maxDrivers*3.5:0);
 const gap=Number(d.mixRowGap)||.6;
 const tone=d.mixTone||'light';
 b.className=`board mix-board hc-board hc-tone-${tone}${S.pv?' pv':''}`;
 b.style.removeProperty('--tw');b.style.removeProperty('--s');b.style.removeProperty('aspect-ratio');b.style.removeProperty('height');
 b.style.setProperty('--hc-row',row+'cqw');b.style.setProperty('--hc-gap',gap+'cqw');b.style.setProperty('--hc-tracks',cols*2);
 let html='',endRow=1;
 if(mode==='orbit'){
   const pairs=Math.floor(S.n/2),odd=!!(S.n%2),rows=pairs+(odd?1:0);
   let series=`<div class="hc-tile hc-center" style="grid-column:2;grid-row:1/${odd?Math.max(2,rows):rows+1};z-index:2">${hcSeries(d.mixSeriesMode!=='hidden',d.mixTitleAlign)}</div>`;
   for(let k=0;k<pairs;k++){
     // The two arcs move INWARD at their top/bottom and OUTWARD at the
     // equator. This is actual horseshoe geometry, not two straight columns.
     // Arc displacement uses board-width units, independent of driver style.
     const t=pairs<=2?(k===0?.80:.13):Math.pow(Math.abs((k-(pairs-1)/2)/((pairs-1)/2)),1.45);
     // The final pair in an odd-team layout stays outboard so the centered
     // orphan has its own unobstructed row.
     const curve=odd&&k===pairs-1?-.5:Math.max(2,Math.min(11,Number(d.mixOrbitCurve)||8.3))*t;
     html+=`<div class="hc-tile hc-arc-left${odd&&k===pairs-1?' hc-last-left':''}" data-kind="team" data-index="${2*k}" data-arc="${curve.toFixed(2)}" style="grid-column:1;grid-row:${k+1};--hc-arc:${curve.toFixed(2)}cqw">${hcTeam(2*k)}</div>`;
     html+=`<div class="hc-tile hc-arc-right${odd&&k===pairs-1?' hc-last-right':''}" data-kind="team" data-index="${2*k+1}" data-arc="${(-curve).toFixed(2)}" style="grid-column:3;grid-row:${k+1};--hc-arc:${(-curve).toFixed(2)}cqw">${hcTeam(2*k+1)}</div>`;
   }
   if(odd)html+=`<div class="hc-tile hc-orphan" data-kind="team" data-index="${S.n-1}" style="grid-column:1/-1;grid-row:${rows}">${hcTeam(S.n-1)}</div>`;
   html+=series;
   b.innerHTML=`<div class="hc-stage hc-stage-orbit" style="grid-template-rows:repeat(${rows},${row}cqw)">${html}</div>`;
 }else{
   const occupied=new Set(),positions=[],key=(r,c)=>r+':'+c,maxRows=Math.max(10,Math.ceil((S.n+4)/cols)+2);
   const reserve=(rr,cc,span=1)=>{
     const r=Math.min(maxRows,Math.max(1,Number(rr)||1)),c=Math.min(cols,Math.max(1,Number(cc)||1));
     const n=Math.max(1,Math.min(Number(span)||1,cols-c+1));
     if(Array.from({length:n},(_,x)=>key(r,c+x)).some(k=>occupied.has(k)))return null;
     for(let x=0;x<n;x++)occupied.add(key(r,c+x));
     return {r,c,span:n};
   };
   let titlePos=null,logoPos=null;
   if(d.mixTitleMode==='cell')titlePos=reserve(d.mixTitleRow,d.mixTitleCol,d.mixTitleSpan);
   if(d.mixSeriesMode==='own-cell'){
     logoPos=reserve(d.mixSeriesRow,d.mixSeriesCol);
     if(!logoPos)for(let r=1;r<=maxRows&&!logoPos;r++)for(let c=1;c<=cols&&!logoPos;c++)logoPos=reserve(r,c);
   }
   for(let i=0;i<S.n;i++){
     let slot=null;
     for(let r=1;r<=maxRows&&!slot;r++)for(let c=1;c<=cols&&!slot;c++)if(!occupied.has(key(r,c)))slot=reserve(r,c);
     if(slot)positions.push(slot);
   }
   const lastRow=Math.max(titlePos?.r||0,logoPos?.r||0,...positions.map(p=>p.r));
   const final=positions.filter(p=>p.r===lastRow);
   const canCenter=final.length>0&&final.length<cols&&!((titlePos&&titlePos.r===lastRow)||(logoPos&&logoPos.r===lastRow));
   const lastShift=new Map();
   if(canCenter)final.forEach((p,j)=>lastShift.set(p,(cols-final.length)+2*j+1));
   if(titlePos){let a=d.mixTitleAlign||'center';
     html+=`<div class="hc-tile" data-kind="title" style="grid-column:${2*titlePos.c-1}/span ${2*titlePos.span};grid-row:${titlePos.r}">${hcSeries(d.mixSeriesMode==='in-title',a)}</div>`;
   }
   if(logoPos){html+=`<div class="hc-tile" data-kind="series-logo" style="grid-column:${2*logoPos.c-1}/span 2;grid-row:${logoPos.r}"><div class="hc-logo-tile" data-k="slogo" role="button" tabindex="0">${S.slogo?`<img src="${S.slogo}" alt="">`:'UPLOAD SERIES LOGO'}</div></div>`}
   positions.forEach((p,i)=>html+=`<div class="hc-tile" data-kind="team" data-index="${i}" style="grid-column:${lastShift.get(p)||2*p.c-1}/span 2;grid-row:${p.r}">${hcTeam(i)}</div>`);
   const header=d.mixTitleMode==='header'?`<div class="hc-header">${hcSeries(d.mixSeriesMode==='in-title',d.mixTitleAlign)}</div>`:'';
   b.innerHTML=header+`<div class="hc-stage hc-stage-grid" style="grid-auto-rows:${row}cqw">${html}</div>`;
 }
 if(isQuickPreset())b.classList.add(S.preset==='customOrbit'?'hc-standalone-orbit':'hc-standalone-grid');
 hcAutoFit(b);
}

/* ===== Two standalone custom compositions, sharing all original card components ===== */
function isQuickPreset(){return S.preset==='customOrbit'||S.preset==='customGrid'}
function applyQuickDefaults(mode,reset=false){
  if(reset)S.customDesign=freshCustom();
  const d=mixState(),orbit=mode==='customOrbit';
  Object.assign(d,{
    mixEnabled:true,mixInitialized:true,mixLayout:orbit?'orbit':'grid',
    mixCols:orbit?2:3,mixTone:orbit?'navy':'light',
    mixTeam:orbit?'f3':'formulae',mixDriver:orbit?'ribbon':'clean',
    mixOrbitCurve:8.5,mixRowHeight:orbit?12.8:16,mixRowGap:orbit?1.05:1.75,
    mixLogoPosition:'center',mixTitleMode:'cell',mixTitleRow:1,mixTitleCol:orbit?2:2,
    mixTitleSpan:1,mixTitleAlign:'center',mixSeriesMode:'in-title',mixSeriesRow:1,mixSeriesCol:1,
    mixUseTeamPlate:false,mixUseTeamText:!orbit,mixShowTeamNames:false,
    mixTeamStyles:{},mixDriverStyles:{},mixTeamPlateOverrides:{},mixTeamTextOverrides:{}
  });
  S.customDesign.nameGlobal={...DEFAULT_NAME};
  S.customDesign.titleFont='';
}
function enterQuickPreset(mode){
  const alreadyQuick=isQuickPreset();
  if(!alreadyQuick){
    if(S.customEnabled)customDraft=JSON.parse(JSON.stringify(S));
    S.customDesign=freshCustom();
    S.customEnabled=true;
    S.preset=mode;
    applyQuickDefaults(mode);
    S.opts={...S.opts,num:0,flag:0,rookie:0,band:0,slogo:1};
    if(!S.title||/^F1 2022\s/i.test(S.title)){
      S.title='2026\nDRIVER\nLINEUP';S.sub='THE STARTING GRID';
    }
  }else{
    const previous=S.preset;
    S.quickDesigns ||= {};
    S.quickDesigns[previous]=JSON.parse(JSON.stringify(S.customDesign));
    S.preset=mode;
    if(S.quickDesigns[mode])S.customDesign=JSON.parse(JSON.stringify(S.quickDesigns[mode]));
    else {S.customDesign=freshCustom();applyQuickDefaults(mode)}
    const d=mixState();d.mixLayout=mode==='customOrbit'?'orbit':'grid';
    d.mixEnabled=true;d.mixInitialized=true;
  }
  S.layout=mode==='customOrbit'?'orbit':'grid';
  S.customEnabled=true;sync();render();
}
function syncQuickPanel(){
  const panel=document.getElementById('quickPanel');if(!panel)return;
  const yes=isQuickPreset();panel.hidden=!yes;if(!yes)return;
  const d=mixState(),orbit=S.preset==='customOrbit',name=S.customDesign?.nameGlobal||DEFAULT_NAME;
  document.getElementById('quickHeading').textContent=orbit?'CUSTOM ORBIT':'CUSTOM GRID';
  const fields={qTeam:d.mixTeam,qDriver:d.mixDriver,qTone:d.mixTone,qLogo:d.mixLogoPosition,
    qFont:name.font||'',qAlign:name.align||'original',qPlate:d.mixUseTeamPlate,qText:d.mixUseTeamText,
    qCurve:d.mixOrbitCurve,qCols:d.mixCols,qHeight:d.mixRowHeight,
    qNameSize:name.size??100,qX:name.x??0,qY:name.y??0,
    qTitleFont:S.customDesign?.titleFont||'',qTitleMode:d.mixTitleMode,qTitleRow:d.mixTitleRow,qTitleCol:d.mixTitleCol,
    qSeriesMode:d.mixSeriesMode,qSeriesRow:d.mixSeriesRow,qSeriesCol:d.mixSeriesCol};
  for(const [key,val] of Object.entries(fields)){
    const el=document.getElementById(key);if(el)el[el.type==='checkbox'?'checked':'value']=val;
  }
  document.getElementById('qCurveBox').hidden=!orbit;
  for(const id of ['qColsBox','qTitleModeBox','qTitleRowBox','qTitleColBox','qSeriesModeBox','qSeriesRowBox','qSeriesColBox'])
    document.getElementById(id).hidden=orbit;
  document.getElementById('qCurveValue').textContent=d.mixOrbitCurve+'%';
  document.getElementById('qHeightValue').textContent=d.mixRowHeight+'cqw';
  document.getElementById('qNameSizeValue').textContent=(name.size??100)+'%';
  document.getElementById('qXValue').textContent=String(name.x??0);
  document.getElementById('qYValue').textContent=String(name.y??0);
  document.getElementById('qTeamOverride').value=d.mixTeamStyles[S.selected]||'inherit';
  const driverSel=document.getElementById('qDriverIndex');
  const count=S.teams[S.selected]?.cnt||S.d;
  driverSel.innerHTML=Array.from({length:count},(_,j)=>`<option value="${j}">${esc(S.teams[S.selected]?.dr[j]?.name||'Driver '+(j+1))}</option>`).join('');
  const active=Math.min(count-1,Number(d.mixSelectedDriver)||0);
  driverSel.value=String(active);
  document.getElementById('qDriverOverride').value=d.mixDriverStyles[S.selected+':'+active]||'inherit';
}
function initQuickPanel(){
  const E=id=>document.getElementById(id);
  fillMixSelect(E('qTeam'),Object.fromEntries(Object.entries(MIX_TEAMS).filter(([v])=>v!=='auto')));
  fillMixSelect(E('qDriver'),Object.fromEntries(Object.entries(MIX_DRIVERS).filter(([v])=>v!=='auto')));
  fillMixSelect(E('qTeamOverride'),{inherit:'Use global team style',...Object.fromEntries(Object.entries(MIX_TEAMS).filter(([v])=>v!=='auto'))});
  fillMixSelect(E('qDriverOverride'),{inherit:'Use global driver style',...Object.fromEntries(Object.entries(MIX_DRIVERS).filter(([v])=>v!=='auto'))});
  for(const id of ['qFont','qTitleFont'])E(id).innerHTML=Object.entries(CUSTOM_FONTS).map(([v,n])=>`<option value="${esc(v)}">${esc(n)}</option>`).join('');
  for(const id of ['qTitleRow','qSeriesRow','qTitleCol','qSeriesCol']){
    const size=id.endsWith('Col')?4:10;
    E(id).innerHTML=Array.from({length:size},(_,j)=>`<option value="${j+1}">${j+1}</option>`).join('');
  }
  const mixFields={qTeam:'mixTeam',qDriver:'mixDriver',qTone:'mixTone',qLogo:'mixLogoPosition',
    qPlate:'mixUseTeamPlate',qText:'mixUseTeamText',qCurve:'mixOrbitCurve',qCols:'mixCols',
    qHeight:'mixRowHeight',qTitleMode:'mixTitleMode',qTitleRow:'mixTitleRow',qTitleCol:'mixTitleCol',
    qSeriesMode:'mixSeriesMode',qSeriesRow:'mixSeriesRow',qSeriesCol:'mixSeriesCol'};
  for(const [id,key] of Object.entries(mixFields)){
    const el=E(id);el.addEventListener(el.type==='range'?'input':'change',()=>{
      const d=mixState();
      d[key]=el.type==='checkbox'?el.checked:(el.type==='range'||['qCols','qTitleRow','qTitleCol','qSeriesRow','qSeriesCol'].includes(id)?Number(el.value):el.value);
      d.mixEnabled=true;render();
      if(id==='qCurve')E('qCurveValue').textContent=d[key]+'%';
      if(id==='qHeight')E('qHeightValue').textContent=d[key]+'cqw';
    });
  }
  for(const [id,key] of Object.entries({qFont:'font',qAlign:'align',qNameSize:'size',qX:'x',qY:'y'})){
    const el=E(id);el.addEventListener(el.type==='range'?'input':'change',()=>{
      const name=customState().nameGlobal;name[key]=el.type==='range'?Number(el.value):el.value;
      if(id==='qNameSize')E('qNameSizeValue').textContent=name[key]+'%';
      if(id==='qX')E('qXValue').textContent=String(name[key]);
      if(id==='qY')E('qYValue').textContent=String(name[key]);
      render();
    });
  }
  E('qTitleFont').addEventListener('change',e=>{customState().titleFont=e.target.value;render()});
  E('qTeamOverride').addEventListener('change',e=>{
    const d=mixState();if(e.target.value==='inherit')delete d.mixTeamStyles[S.selected];
    else d.mixTeamStyles[S.selected]=e.target.value;render();
  });
  E('qDriverIndex').addEventListener('change',e=>{mixState().mixSelectedDriver=Number(e.target.value)||0;syncQuickPanel()});
  E('qDriverOverride').addEventListener('change',e=>{
    const d=mixState(),key=S.selected+':'+(d.mixSelectedDriver||0);
    if(e.target.value==='inherit')delete d.mixDriverStyles[key];else d.mixDriverStyles[key]=e.target.value;
    render();
  });
  E('qReset').addEventListener('click',()=>{applyQuickDefaults(S.preset,true);syncQuickPanel();render()});
}
initQuickPanel();

loadPreset('f1');
