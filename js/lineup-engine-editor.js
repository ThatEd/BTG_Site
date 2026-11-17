(function(){
  'use strict';
  var payload,applying=false,revision=0;
  var originalRender=render;
  function liveTeams(){if(!payload)return;var copy=JSON.parse(JSON.stringify(payload.teams));copy.forEach(function(team){while(team.dr.length<4)team.dr.push({first:'',name:'TBA',num:null,img:'logos/drivers/TBA.png',vacant:true});});while(copy.length<14)copy.push({team:'',c:'#777777',cnt:2,dr:Array.from({length:4},function(){return {first:'',name:'TBA',vacant:true};})});S.teams=copy;S.n=payload.teams.length;S.selected=Math.min(S.selected||0,Math.max(0,S.n-1));S.slogo=payload.logo;S.year=payload.seasonLabel;S.sub=payload.seasonLabel;}
  render=function(){liveTeams();originalRender();if(!payload)return;
    var board=document.getElementById('board');board.style.visibility='visible';
    board.querySelectorAll('[contenteditable]').forEach(function(el){if(el.id!=='ttl')el.removeAttribute('contenteditable');});
    board.querySelectorAll('[data-k]').forEach(function(el){el.removeAttribute('tabindex');el.setAttribute('aria-label',el.dataset.k==='img'?'Driver portrait':'Repository image');});
    BTGLineupEngine.numbers(Object.assign({},payload,{settings:Object.assign({},payload.settings,{editor_config:BTGLineupEngine.snapshot()})}));
    if(!applying)parent.postMessage({type:'btg-studio-change',revision:revision,config:BTGLineupEngine.snapshot()},location.origin);
  };
  document.getElementById('board').addEventListener('input',function(event){if(event.target.id==='ttl'&&payload&&!applying)parent.postMessage({type:'btg-studio-change',revision:revision,config:BTGLineupEngine.snapshot()},location.origin);});
  var originalPreset=loadPreset;
  loadPreset=function(p){var title=S.title;originalPreset(p);if(payload){S.title=title||payload.settings.title;S.bg=S.bg||payload.settings.background;sync();render();}};
  // Roster and repository imagery are managed by the dashboard's existing tools.
  ['rT','teamName','teamDrivers'].forEach(function(id){var el=document.getElementById(id);if(el){el.disabled=true;var group=el.closest('.lb');if(group)group.hidden=true;}});
  document.querySelectorAll('input[name=d]').forEach(function(el){el.disabled=true;el.closest('.lb').hidden=true;});
  document.getElementById('board').addEventListener('click',function(event){if(event.target.closest('[data-k]')){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.getElementById('board').addEventListener('keydown',function(event){if(event.target.closest('[data-k]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();}},true);
  var teamLabel=document.getElementById('teamSelect').parentNode;if(teamLabel.firstChild.nodeType===3)teamLabel.firstChild.textContent='Team to customize ';
  var heroLabel=document.createElement('label');heroLabel.className='lb';heroLabel.textContent='Background image from repository';
  var heroInput=document.createElement('input');heroInput.type='text';heroInput.placeholder='e.g. logos/backgrounds/race.png';heroInput.setAttribute('aria-label','Repository background image path');heroLabel.appendChild(heroInput);document.querySelector('.ctl').appendChild(heroLabel);
  heroInput.onchange=function(){var value=this.value.trim();if(value&&(!/^[a-z0-9_][a-z0-9_ ./-]*\.(png|webp|jpg|jpeg|svg)$/i.test(value)||value.includes('..'))){this.setCustomValidity('Enter a repository-relative image path.');this.reportValidity();return;}this.setCustomValidity('');S.hero=value||null;S.opts.hero=value?1:0;sync();render();};
  var note=document.createElement('p');note.className='btg-studio-note';note.textContent='Live team and driver data. Edit the layout here; portraits, logos and car numbers use the existing dashboard settings.';document.querySelector('.wrap').prepend(note);
  window.addEventListener('message',function(event){
    if(event.source!==parent||event.origin!==location.origin||!event.data||event.data.type!=='btg-studio-load')return;
    payload=event.data.payload;revision=event.data.revision;if(!payload||!Array.isArray(payload.teams)||!payload.teams.length)return;
    applying=true;BTGLineupEngine.apply(payload);heroInput.value=S.hero||'';S.pv=false;sync();render();applying=false;
    parent.postMessage({type:'btg-studio-loaded',revision:revision},location.origin);
  });
  parent.postMessage({type:'btg-studio-ready'},location.origin);
})();
