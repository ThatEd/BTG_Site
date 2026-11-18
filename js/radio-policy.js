/* Shared authorization and canonical radio payload; caller supplies a verified actor. */
(function(root){'use strict';
const norm=v=>String(v||'').trim().toLowerCase();
function roster(data,actor){
 if(!actor||!['driver','tp','admin'].includes(actor.role))return [];
 const teams=data.teams||[],people=data.drivers||[],states=data.app_state||[];
 const out=[];
 for(const c of data.driver_cars||[]){
  const team=teams.find(t=>String(t.team_id)===String(c.team_id));if(!team||Number(team.team_id)===999||!team.series||team.series==='GT1')continue;
  const year=Number((states.find(s=>(s.series||s.series_id)===team.series)||states[0]||{}).year)||Number(actor.year);
  if(c.from_year==null||c.till_year==null||Number(c.from_year)>year||Number(c.till_year)<year)continue;
  const d=people.find(d=>norm(d.full_name||d.driver_name)===norm(c.driver_name));if(!d)continue;
  if(actor.role==='driver'&&norm(d.full_name)!==norm(actor.driverName))continue;
  if(actor.role==='tp'&&!(actor.teamIds||[]).map(String).includes(String(team.team_id)))continue;
  if(out.some(x=>x.driverId===d.driver_id&&x.teamId===team.team_id))continue;
  out.push({driverId:d.driver_id,fullName:d.full_name,number:d.driver_number,teamId:team.team_id,team:team.team_name,teamKey:team.team_key,series:team.series,year,colour:team.color_primary||'#777777',logo:team.logo?'logos/teams/'+team.logo:''});
 }
 if(actor.role==='admin')for(const d of people){if(!out.some(x=>x.driverId===d.driver_id))out.push({driverId:d.driver_id,fullName:d.full_name,number:d.driver_number,teamId:null,team:'',teamKey:'',series:'',colour:'#777777',logo:''});}
 return out;
}
function prepare(data,actor,request){
 if(!actor||!['driver','tp','admin'].includes(actor.role))return {ok:false,error:'forbidden'};
 const target=roster(data,actor).find(x=>String(x.driverId)===String(request.driverId)&&String(x.teamId||'')===String(request.teamId||''));
 if(!target)return {ok:false,error:'forbidden_driver'};
 if(!target.series)return {ok:false,error:'no_active_series'};
 const from=actor.role==='driver'?'driver':actor.role==='tp'?'engineer':request.from==='driver'?'driver':'engineer';
 const sender=actor.role==='admin'?(from==='driver'?target.fullName:'ENGINEER'):actor.role==='driver'?actor.driverName:actor.identity;
 if(!Array.isArray(request.lines))return {ok:false,error:'bad_payload'};
 const lines=request.lines.map(l=>({from,label:from==='engineer'?sender.slice(0,24).toUpperCase():'',text:String(l.text||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim()}));
 if(!lines.length||lines.length>4||lines.some(l=>!l.text||l.text.length>140))return {ok:false,error:'bad_payload'};
 const payload={name:target.fullName.split(/\s+/).pop().toUpperCase(),number:String(target.number||''),team:target.team.toUpperCase(),colour:target.colour,textColour:'#ffffff',logo:target.logo,lines};
 return {ok:true,series:target.series,driverId:target.driverId,teamId:target.teamId,raceId:null,session:null,lap:null,senderName:sender,payload};
}
const policy={roster,prepare};if(typeof module!=='undefined')module.exports=policy;root.BTGRadioPolicy=policy;
})(typeof globalThis!=='undefined'?globalThis:this);
