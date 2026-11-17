/* Shared season/lineup model. No writes, tokens or private contract fields. */
(function(root){
  'use strict';
  var defaults={F1:{layout:'f1',background:'light',accent:'#E10600'},F2:{layout:'f2',background:'dark',accent:'#0090FF'},XGT:{layout:'fe12',background:'dark',accent:'#D8BA16',numbered_seasons:true}};
  function identityFor(data,name){
    var rows=data.drivers||[],norm=function(n){return String(n||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();},nameOf=function(d){return d.full_name||d.driver_name||d.name||'';};
    var exact=rows.find(function(d){return norm(nameOf(d))===norm(name);});if(exact)return exact;
    // Recover an unambiguous transposed surname in an imported name using
    // the canonical Drivers row (e.g. a contract spelling), never a name list.
    var key=function(n){var p=norm(n).split(/\s+/);return p.slice(0,-1).join(' ')+'|'+p.slice(-1)[0].split('').sort().join('');};
    var candidates=rows.filter(function(d){return key(nameOf(d))===key(name);});return candidates.length===1?candidates[0]:null;
  }
  function config(series,rows){return Object.assign({series:series,layout:'f1',background:'dark',accent:'#B91D2E',title:'DRIVER LINE-UP',season_start_year:2024,season_start_number:1,numbered_seasons:false,number_style:'auto'},defaults[series]||{},(rows||[]).find(function(r){return r.series===series;})||{});}
  function currentYear(data,series){var state=(data.app_state||[]).find(function(s){return s.series===series;})||(data.app_state||[])[0];return Number(state&&state.year)||Math.max(2024,...(data.race_seasons||[]).filter(function(s){return s.series_id===series;}).map(function(s){return Number(s.year)||2024;}));}
  function years(data,series){var now=currentYear(data,series),ys=new Set([now,now+1]);(data.race_seasons||[]).filter(function(s){return s.series_id===series;}).forEach(function(s){if(Number(s.year)>=1900)ys.add(Number(s.year));});return Array.from(ys).sort(function(a,b){return b-a;});}
  function teamsFor(data,series,year,roster){
    var teams=(data.teams||[]).filter(function(t){return t.series===series&&Number(t.team_id)!==999;});
    var byId=Object.fromEntries(teams.map(function(t){return [String(t.team_id),t];}));
    var members={};
    var contracts=(data.driver_cars||[]).filter(function(c){return byId[String(c.team_id)]&&Number(c.seat)>=1&&roleOf(c,series)==='driving'&&c.from_year!=null&&c.till_year!=null&&Number.isFinite(Number(c.from_year))&&Number.isFinite(Number(c.till_year))&&Number(c.from_year)<=year&&Number(c.till_year)>=year;});
    // Only signed contracts populate a future grid. Talks and offers are absent.
    contracts.forEach(function(c){var key=String(c.team_id),identity=identityFor(data,c.driver_name),name=identity?(identity.full_name||identity.driver_name||identity.name):c.driver_name;var list=members[key]||(members[key]=[]);if(!list.some(function(d){return d.name===name;}))list.push({name:name,seat:Number(c.seat)});});
    // Only genuinely historical views may supplement from that season's results.
    // Current Drivers.team_id / is_current history must never override dates.
    if(year<currentYear(data,series)){
      (roster||[]).forEach(function(d){var t=teams.find(function(t){return [t.team_key,t.team_name,String(t.team_id)].includes(d.team);});if(!t)return;var key=String(t.team_id);if(!members[key])members[key]=[];if(!members[key].some(function(x){return x.name===(d.fullName||d.name);})&&members[key].length<2)members[key].push({name:d.fullName||d.name,nation:d.nation,number:d.carNumber,seat:members[key].length+1});});
    }
    return teams.map(function(t){var list=(members[String(t.team_id)]||[]).sort(function(a,b){return a.seat-b.seat;});return {team:t,drivers:list};});
  }
  function roleOf(c,series){var role=String(c.contract_role||'').toLowerCase();if(['driving','reserve','junior','affiliate'].includes(role))return role;var seat=Number(c.seat);return seat<=(series==='GT1'?8:2)?'driving':seat<=5?'reserve':seat<=16?'junior':'affiliate';}
  function supportFor(data,series,year){
    var info=(data.series||[]).find(function(s){return s.series_id===series;});if(!info||!info.tier||Number(info.tier)>2)return [];
    return (data.teams||[]).filter(function(t){return t.series===series&&Number(t.team_id)!==999;}).map(function(t){
      var roles={reserve:[],junior:[],affiliate:[]},rows=(data.driver_cars||[]).filter(function(c){return Number(c.team_id)===Number(t.team_id)&&c.from_year!=null&&c.till_year!=null&&Number(c.from_year)<=year&&Number(c.till_year)>=year;});
      var driving=new Set(rows.filter(function(c){return roleOf(c,series)==='driving';}).map(function(c){return c.driver_name;}));
      rows.forEach(function(c){var role=roleOf(c,series);if(!roles[role]||driving.has(c.driver_name))return;var identity=identityFor(data,c.driver_name),name=identity?(identity.full_name||identity.driver_name||identity.name):c.driver_name;if(!roles[role].some(function(d){return d.name===name;}))roles[role].push({name:name,seat:Number(c.seat)});});
      return {team:t,roles:roles};
    }).filter(function(g){return Object.values(g.roles).some(function(list){return list.length;});});
  }
  root.BTG=root.BTG||{};function seasonLabel(year,c){var format=c.season_label_format||(c.numbered_seasons?'number_year':'year'),number=Number(year)-Number(c.season_start_year||2024)+1;return format==='number'?'Season '+number:format==='number_year'?'Season '+number+': '+year:String(year);}
  root.BTG.LineupData={seasonLabel:seasonLabel,config:config,currentYear:currentYear,years:years,teamsFor:teamsFor,identityFor:identityFor,supportFor:supportFor,roleOf:roleOf};
})(typeof window==='undefined'?globalThis:window);
