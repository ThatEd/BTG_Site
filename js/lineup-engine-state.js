(function(){
  'use strict';
  var allowed=['f1','f3','f2','indy','fox','indy26','fe10','fe22','fe12','sf24','sf26','mg24','mg25','mg26','customOrbit','customGrid'];
  var keys=['preset','layout','logo','cols','bg','customEnabled','customDesign','quickDesigns','opts','title','teamIds','hero'];
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function apply(payload){
    var c=payload.settings||{},saved=c.editor_config||{},preset=allowed.includes(saved.preset)?saved.preset:c.layout;
    delete S.customDesign;delete S.quickDesigns;delete S.teamIds;customDraft=null;
    loadPreset(allowed.includes(preset)?preset:'f1');
    keys.forEach(function(key){if(Object.hasOwn(saved,key))S[key]=copy(saved[key]);});
    Object.assign(S,{selected:0,n:payload.teams.length,teams:copy(payload.teams),d:Math.max(2,Math.min(4,...payload.teams.map(function(t){return t.dr.length;}))),pv:true,slogo:payload.logo,
      bg:saved.bg||c.background,title:saved.title||c.title,sub:payload.seasonLabel,year:payload.seasonLabel});
    if(!saved.preset){S.layout=c.layout==='f1'?'orbit':'grid';S.opts={num:0,flag:c.layout==='f2'?1:0,rookie:0,band:c.layout==='f2'?1:0,slogo:1,hero:0};}
    var oldIds=saved.teamIds||[],newIds=payload.teams.map(function(team){return String(team.id);});
    function remap(design){if(!design||!oldIds.length)return;['nameTeams','nameDrivers','mixTeamStyles','mixDriverStyles'].forEach(function(key){if(!design[key])return;var mapped={};Object.entries(design[key]).forEach(function(entry){var parts=entry[0].split(':'),index=newIds.indexOf(String(oldIds[Number(parts[0])]));if(index>=0)mapped[index+(parts.length>1?':'+parts[1]:'')]=entry[1];});design[key]=mapped;});}
    remap(S.customDesign);Object.values(S.quickDesigns||{}).forEach(remap);
    S.teams.forEach(function(team){while(team.dr.length<4)team.dr.push({name:'TBA',first:'',num:null,img:'logos/drivers/TBA.png',vacant:true});});
    while(S.teams.length<14)S.teams.push({team:'',c:'#777777',dr:Array.from({length:4},function(){return {first:'',name:'TBA',vacant:true};}),cnt:2});
  }
  function snapshot(){var out={version:1};keys.forEach(function(key){if(S[key]!==undefined)out[key]=copy(S[key]);});out.teamIds=S.teams.slice(0,S.n).map(function(team){return team.id;});return out;}
  function numbers(payload){
    var board=document.getElementById('board');
    board.querySelectorAll('[data-k="img"][data-t][data-d]').forEach(function(el){var team=payload.teams[Number(el.dataset.t)],driver=team&&team.dr[Number(el.dataset.d)];el.classList.toggle('btg-vacancy',!!(driver&&driver.vacant));});
    var enabled=!!(payload.settings.editor_config&&payload.settings.editor_config.opts&&payload.settings.editor_config.opts.num);
    board.querySelectorAll('.num').forEach(function(el){el.style.display='none';});
    board.querySelectorAll('[data-k="img"][data-t][data-d]').forEach(function(el){var team=payload.teams[Number(el.dataset.t)],driver=team&&team.dr[Number(el.dataset.d)];el.classList.toggle('btg-vacancy',!!(driver&&driver.vacant));});
    if(!enabled)return;
    board.querySelectorAll('[data-k="img"][data-t][data-d]').forEach(function(el){var team=payload.teams[Number(el.dataset.t)],driver=team&&team.dr[Number(el.dataset.d)];if(!driver||!driver.num||driver.numberHidden)return;var number=document.createElement('span');number.className='btg-number';if(driver.numberImage){var image=document.createElement('img');image.src=driver.numberImage;image.alt=String(driver.num);number.appendChild(image);}else{number.textContent=driver.num;if(driver.numberColour)number.style.color=driver.numberColour;}el.appendChild(number);});
  }
  window.BTGLineupEngine={apply:apply,snapshot:snapshot,numbers:numbers,allowed:allowed};
})();
