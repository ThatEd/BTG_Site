(async function(){
  'use strict';
  var api='https://jocmjietuviegelluiev.supabase.co/functions/v1/api';
  var seriesEl=document.getElementById('series-bar'),seasonEl=document.getElementById('lineup-seasons'),status=document.getElementById('lineup-status'),activeSeries='F1',activeYear;
  var data=await BTG.DBCache.init(),lastPayload=null,renderId=0;
  if(!data){status.textContent='Lineup data is unavailable. Please reload to retry.';return;}
  try{var res=await fetch(api+'?data=lineups',{cache:'no-store',signal:AbortSignal.timeout(15000)});var live=await res.json();if(!res.ok||!live.ok||!Array.isArray(live.settings)||!Array.isArray(live.seasons))throw Error();data.teams=live.teams.filter(function(t){return BTG.seriesIsVisible(t.series);});BTG.registerNumberSheets(live.number_sheets||[]);data.series=live.series.filter(function(s){return BTG.seriesIsVisible(s.series_id);});if(Array.isArray(live.drivers))data.drivers=live.drivers;data.lineup_seasons=live.seasons.filter(function(s){return BTG.seriesIsVisible(s.series);});data.lineup_series_settings=live.settings.filter(function(s){return BTG.seriesIsVisible(s.series);});data.driver_cars=live.driver_cars;data.app_state=live.app_state;}catch(e){status.textContent='Using the last saved database snapshot; recent contracts or branding changes may be unavailable.';}
  if(!data.lineup_seasons||!data.lineup_series_settings){status.textContent='Lineup settings are not available yet. Please reload shortly.';return;}
  var choices=(data.series||[]).filter(function(s){return BTG.seriesIsVisible(s.series_id) && (data.teams||[]).some(function(t){return t.series===s.series_id;})&&data.lineup_series_settings.some(function(c){return c.series===s.series_id;});}).sort(function(a,b){return a.sort_order-b.sort_order;});
  await BTG.loadLogoManifest();
  choices.forEach(function(s){var b=document.createElement('button');b.type='button';b.className='series-tab';b.dataset.series=s.series_id;b.title=s.name;b.setAttribute('aria-label',s.name);var cfg=data.lineup_series_settings.find(function(c){return c.series===s.series_id;});var im=document.createElement('img');im.src=cfg.series_logo;im.alt=s.name;b.appendChild(im);b.onclick=function(){activeSeries=s.series_id;seasons();};seriesEl.appendChild(b);});
  function send(){if(lastPayload)BTG.NativeLineup.render(lastPayload);}
  function seasonButtons(){seasonEl.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.year)===activeYear));});}
  function seasons(){var series=activeSeries,cfg=data.lineup_series_settings.find(function(c){return c.series===series;});activeYear=BTG.LineupData.currentYear(data,series);seasonEl.innerHTML='';data.lineup_seasons.filter(function(s){return s.series===series;}).sort(function(a,b){return a.year-b.year;}).forEach(function(s){var b=document.createElement('button');b.type='button';b.className='season-btn';b.dataset.year=s.year;b.title=s.display_name;b.setAttribute('aria-label',s.display_name);b.textContent=cfg.numbered_seasons?s.season_number:s.year;b.onclick=function(){activeYear=Number(s.year);seasonButtons();render();};seasonEl.appendChild(b);});seriesEl.querySelectorAll('button').forEach(function(b){b.classList.toggle('active',b.dataset.series===series);});document.documentElement.style.setProperty('--team-accent',cfg.accent);seasonButtons();render();}
  async function imageUrl(urls){
    var seasonal=urls.filter(function(u){return /drivers\/\d{4}\//.test(u);});
    var found=await Promise.all(seasonal.map(function(url){return new Promise(function(resolve){var im=new Image();im.onload=function(){resolve(url);};im.onerror=function(){resolve(null);};im.src=url;});}));
    var saved=found.find(Boolean);if(saved)return saved;
    if(BTG.LOGO_FILES.size)return urls.find(function(u){return BTG.LOGO_FILES.has(u)||BTG.LOGO_FILES.has(u.replace(/^logos\//,''));})||null;
    for(var i=0;i<urls.length;i++){if(await new Promise(function(resolve){var im=new Image();im.onload=function(){resolve(true);};im.onerror=function(){resolve(false);};im.src=urls[i];}))return urls[i];}return null;
  }
  var photoJobs={},numberJobs={},supportView=null;
  function knownPhoto(urls){return urls.find(function(u){return BTG.LOGO_FILES.has(u)||BTG.LOGO_FILES.has(u.replace(/^logos\//,''));})||null;}
  function support(series,year){
    var rows=BTG.LineupData.supportFor(data,series,year),section=document.getElementById('lineup-support'),revision=renderId;
    section.hidden=!rows.length;document.getElementById('support-jump').hidden=!rows.length;
    if(!rows.length){if(supportView){supportView.destroy();supportView=null;}section.replaceChildren();return;}
    if(!supportView){section.innerHTML='<h2>Reserves, Juniors & Affiliates · <span class="support-year"></span></h2><div id="native-support" class="native-lineup-root"><div class="wrap"><div class="board"></div></div></div>';supportView=BTG.NativeLineup.create(document.getElementById('native-support'),{content:true});}
    section.querySelector('.support-year').textContent=year;
    var cfg=data.lineup_series_settings.find(function(c){return c.series===series;}),teams=[],jobs=[];
    rows.forEach(function(g){var t=g.team,drivers=[];
      [['reserve','Reserve'],['junior','Junior'],['affiliate','Affiliate']].forEach(function(pair){g.roles[pair[0]].forEach(function(d){drivers.push(Object.assign({},d,{role:pair[1]}));});});
      // Keep the series' actual card design readable: additional people get
      // another row of that team's same design, rather than shrinking six faces.
      for(var offset=0;offset<drivers.length;offset+=3){var chunk=drivers.slice(offset,offset+3);
        teams.push({id:t.team_id,c:t.color_primary||'#777777',c2:t.color_secondary||t.color_primary||'#777777',trim:t.color_secondary||t.color_primary||'#777777',team:t.team_name||t.team_key,logo:t.logo?'logos/'+(/^(teams|mini)\//.test(t.logo)?t.logo:'teams/'+t.logo):null,cnt:chunk.length,
          dr:chunk.map(function(d){var identity=BTG.LineupData.identityFor(data,d.name)||{},name=d.name.split(' '),urls=BTG.driverPhotoUrls(d.name,year),style=BTG.numberStyleFor(t.team_key,'reserve',year);
            var flag=BTG.flagImg(identity.nation),match=flag.match(/src="([^"]+)"/),driver={fullName:d.name,first:name.slice(0,-1).join(' '),name:name.slice(-1)[0],img:knownPhoto(urls),role:d.role,num:identity.driver_number||null,numberImage:null,numberHidden:style==='hidden',flag:match?match[1]:null,nation:'',vacant:false};
            var pk=year+'|'+d.name;if(!photoJobs[pk])photoJobs[pk]=imageUrl(urls);jobs.push(photoJobs[pk].then(function(url){if(url)driver.img=url;}));
            if(driver.num&&cfg.editor_config?.opts?.num&&style!=='hidden'&&style!=='plain'){var key=['support',year,t.team_id,driver.num,style].join('|');if(!numberJobs[key])numberJobs[key]=BTG.discoverNumberSheets().then(async function(){var sheet=BTG.numberSheetFor(t.team_key,year,undefined,'reserve');if(!sheet)return null;var strip=await BTG.numberStrip(sheet,String(driver.num).split(''),90,t.color_primary,false,null,BTG.numberCustomizationFor(t.team_key,'reserve',year));return strip&&strip.url;});jobs.push(numberJobs[key].then(function(url){driver.numberImage=url;}));}
            return driver;
          })});
      }
    });
    var payload={support:true,series:series,year:year,settings:cfg,seasonLabel:data.lineup_seasons.find(function(s){return s.series===series&&Number(s.year)===year;}).display_name,logo:cfg.series_logo,teams:teams};
    supportView.render(payload);Promise.all(jobs).then(function(){if(revision===renderId&&supportView)supportView.render(payload);}).catch(console.error);
  }
  function render(){
    var id=++renderId,series=activeSeries,year=activeYear,cfg=data.lineup_series_settings.find(function(c){return c.series===series;});BTG.currentSeason=year;
    support(series,year);
    var roster=year<BTG.LineupData.currentYear(data,series)?BTG.DBCache.buildDriverList(series,year,{includeAll:true}):[];
    var groups=BTG.LineupData.teamsFor(data,series,year,roster),total=0,jobs=[];
    var teams=groups.map(function(g){var t=g.team,drivers=g.drivers.slice(0,4);total+=drivers.length;while(drivers.length<2)drivers.push({name:'Seat available',vacant:true,seat:drivers.length+1});
      return {id:t.team_id,c:t.color_primary||'#777777',c2:t.color_secondary||t.color_primary||'#777777',trim:t.color_secondary||t.color_primary||'#777777',team:t.team_name||t.team_key,logo:t.logo?'logos/'+(/^(teams|mini)\//.test(t.logo)?t.logo:'teams/'+t.logo):null,cnt:drivers.length,
        dr:drivers.map(function(d){var identity=BTG.LineupData.identityFor(data,d.name)||{},name=d.name.split(' '),number=d.number||identity.driver_number||identity.number||null,nation=d.nation||identity.nation||identity.nationality;
          var urls=d.vacant?[]:BTG.driverPhotoUrls(d.name,year),photo=knownPhoto(urls),numberSeat=Number(d.seat)===1?'car1':Number(d.seat)===2?'car2':'reserve',style=BTG.numberStyleFor(t.team_key,numberSeat,year);
          var flagHtml=BTG.flagImg(nation),flagMatch=flagHtml.match(/src="([^"]+)"/);
          var result={first:d.vacant?'':name.slice(0,-1).join(' '),name:d.vacant?'TBA':name.slice(-1)[0],img:d.vacant?'logos/drivers/TBA.png':photo,flag:flagMatch?flagMatch[1]:null,nation:'',num:number,numberImage:null,numberColour:BTG.numberCustomizationFor(t.team_key,numberSeat,year).ink||null,numberHidden:style==='hidden',rookie:false,vacant:!!d.vacant};
          if(!d.vacant){var pk=year+'|'+d.name;if(!photoJobs[pk])photoJobs[pk]=imageUrl(urls);jobs.push(photoJobs[pk].then(function(url){if(url)result.img=url;}));}
          if(cfg.editor_config&&cfg.editor_config.opts&&cfg.editor_config.opts.num&&number&&style!=='hidden'&&style!=='plain'){
            var nk=[year,t.team_id,numberSeat,number,style,JSON.stringify(t.number_customization||{})].join('|');
            if(!numberJobs[nk])numberJobs[nk]=BTG.discoverNumberSheets().then(async function(){var sheet=BTG.numberSheetFor(t.team_key,year,undefined,numberSeat);if(!sheet)return null;var strip=await BTG.numberStrip(sheet,String(number).split(''),90,t.color_primary,false,null,BTG.numberCustomizationFor(t.team_key,numberSeat,year));return strip&&strip.url;});
            jobs.push(numberJobs[nk].then(function(url){result.numberImage=url;}));
          }
          return result;
        })};});
    var seasonLabel=data.lineup_seasons.find(function(s){return s.series===series&&Number(s.year)===year;}).display_name;
    lastPayload={series:series,year:year,settings:cfg,seasonLabel:seasonLabel,logo:cfg.series_logo,teams:teams};send();
    status.textContent=year>BTG.LineupData.currentYear(data,series)?year+' · '+total+' signed drivers. Remaining seats are unconfirmed.':year+' · '+groups.length+' teams · '+total+' drivers';
    // Paint immediately; asset discovery must not hold up series/season input.
    Promise.all(jobs).then(function(){if(id===renderId)send();}).catch(console.error);
  }
  seasons();
})().catch(function(e){document.getElementById('lineup-status').textContent='Could not load lineups. Reload to retry.';console.error(e);});
