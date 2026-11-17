(function(){
  'use strict';
  window.BTG=window.BTG||{};
  BTG.LineupStudio={mount:function(container,options){
    container.className='lb-studio';container.innerHTML='<div class="field-row"><div class="field"><label for="lb-studio-year">Preview season</label><select id="lb-studio-year"></select></div><button type="button" class="action action-quiet action-compact" id="lb-studio-reset"><span>Reset to series reference</span></button></div><p class="muted">Build the layout below, then use Save series appearance. The roster follows the selected season.</p><p id="lb-studio-status" class="muted" role="status">Loading lineup studio…</p><iframe class="lb-studio-frame" title="Driver lineup layout editor" src="lineup-engine.html?mode=editor" loading="lazy"></iframe>';
    var frame=container.querySelector('iframe'),year=container.querySelector('select'),status=container.querySelector('[role=status]'),ready=false,current,revision=0,lastPayload,dataPromise;
    function getData(){if(!dataPromise)dataPromise=(async function(){
      var data=await BTG.DBCache.init();if(!data)throw Error('Lineup data could not be loaded.');
      try{var response=await fetch(EDGE_URL+'?data=lineups',{cache:'no-store',signal:AbortSignal.timeout(12000)}),live=await response.json();if(!response.ok||!live.ok)throw Error();['teams','drivers','driver_cars','app_state','series'].forEach(function(key){if(Array.isArray(live[key]))data[key]=live[key];});BTG.registerNumberSheets(live.number_sheets||[]);}catch(e){status.textContent='Previewing the cached roster.';}
      await BTG.loadLogoManifest();await BTG.discoverNumberSheets();return data;
    })();return dataPromise;}
    function send(){if(ready&&lastPayload)frame.contentWindow.postMessage({type:'btg-studio-load',revision:revision,payload:lastPayload},location.origin);}
    function photo(name,season){var urls=BTG.driverPhotoUrls?BTG.driverPhotoUrls(name,season):[];return urls.find(function(url){return BTG.LOGO_FILES&&(BTG.LOGO_FILES.has(url)||BTG.LOGO_FILES.has(url.replace(/^logos\//,'')));})||'logos/drivers/TBA.png';}
    async function update(context,keepYear){
      current=context;var request=++revision;status.textContent='Loading live lineup preview…';
      try{var data=await getData();if(request!==revision)return;
        if(!keepYear){year.replaceChildren();BTG.LineupData.years(data,context.series).forEach(function(value){year.add(new Option(String(value),String(value)));});year.value=String(BTG.LineupData.currentYear(data,context.series));}
        var season=Number(year.value),cfg=context.settings,groups=BTG.LineupData.teamsFor(data,context.series,season,[]);
        var teams=await Promise.all(groups.map(async function(group){var team=group.team,drivers=group.drivers.slice(0,4);while(drivers.length<2)drivers.push({name:'TBA',vacant:true,seat:drivers.length+1});
          return {id:team.team_id,c:team.color_primary||'#777777',c2:team.color_secondary||team.color_primary||'#777777',trim:team.color_secondary||null,team:team.team_name||team.team_key,logo:team.logo?'logos/'+(/^(teams|mini)\//.test(team.logo)?team.logo:'teams/'+team.logo):null,cnt:drivers.length,
            dr:await Promise.all(drivers.map(async function(driver){var identity=BTG.LineupData.identityFor(data,driver.name)||{},parts=driver.name.split(' '),seat=Number(driver.seat)===1?'car1':Number(driver.seat)===2?'car2':'reserve',number=driver.number||identity.driver_number||null,style=BTG.numberStyleFor(team.team_key,seat,season),custom=BTG.numberCustomizationFor(team.team_key,seat,season),image=null;
              if(number&&style!=='plain'&&style!=='hidden'){var sheet=BTG.numberSheetFor(team.team_key,season,undefined,seat);if(sheet){var strip=await BTG.numberStrip(sheet,String(number).split(''),72,team.color_primary,false,null,custom);image=strip&&strip.url;}}
              var flag=BTG.flagImg?BTG.flagImg(identity.nation):'',match=flag.match(/src="([^"]+)"/);
              return {first:driver.vacant?'':parts.slice(0,-1).join(' '),name:driver.vacant?'TBA':parts.slice(-1)[0],img:driver.vacant?'logos/drivers/TBA.png':photo(driver.name,season),flag:match&&match[1],num:number,numberImage:image,numberHidden:style==='hidden',numberColour:custom.ink||null,vacant:!!driver.vacant};}))};}));
        if(request!==revision)return;
        var label=BTG.LineupData.seasonLabel?BTG.LineupData.seasonLabel(season,cfg):String(season);
        lastPayload={series:context.series,year:season,settings:cfg,seasonLabel:label,logo:cfg.series_logo,teams:teams};send();
      }catch(e){status.textContent=e.message;}
    }
    window.addEventListener('message',function(event){
      if(event.origin!==location.origin||event.source!==frame.contentWindow||!event.data)return;
      if(event.data.type==='btg-studio-ready'){ready=true;send();}
      if(event.data.type==='btg-studio-loaded'&&event.data.revision===revision)status.textContent='Preview ready. Changes are saved with Save series appearance.';
      if(event.data.type==='btg-studio-change'&&event.data.revision===revision){options.onChange(event.data.config);current.settings.editor_config=event.data.config;status.textContent='Unsaved layout changes.';}
    });
    year.onchange=function(){update(current,true);};
    container.querySelector('button').onclick=function(){current.settings.editor_config={};options.onChange({});update(current,true);};
    return {update:update};
  }};
})();
