const fs=require('fs'),path=require('path'),policy=require('../js/radio-policy');
const stateFile=path.resolve(__dirname,'../../_preview/radio-local-state.json');
let state={enabled:{},messages:[]};try{state=JSON.parse(fs.readFileSync(stateFile,'utf8'));}catch(e){}
function save(){fs.mkdirSync(path.dirname(stateFile),{recursive:true});fs.writeFileSync(stateFile,JSON.stringify(state));}
async function actorFor(token,data){
 if(typeof token!=='string'||token.length<8)return null;
 const res=await fetch('https://jocmjietuviegelluiev.supabase.co/functions/v1/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'session',token}),signal:AbortSignal.timeout(10000)});
 const user=await res.json();if(!res.ok||!user.ok)return null;
 const keys=(user.tp?.teams||[]).map(t=>t.key).concat([user.tp?.team,user.tp?.team2]);
 return {role:user.role,username:user.username,identity:user.tp?.name||user.driver?.driver||'BTG Officials',driverName:user.driver?.driver,teamIds:data.teams.filter(t=>keys.includes(t.team_key)).map(t=>t.team_id),year:user.year,series:user.series};
}
module.exports=async function(req,res,urlPath){
 const q=new URL(req.url,'http://localhost').searchParams;
 const send=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
 try{
  const data=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../cache/public-data.json'),'utf8'));
  if(urlPath==='/api/radio-poll'){
   const series=q.get('p_series'),mine=state.messages.filter(m=>m.series===series),cursor=mine.length?mine[mine.length-1].id:0;
   if(q.get('p_after')===null||state.enabled[series]===false){send({ok:true,enabled:state.enabled[series]!==false,cursor,messages:[]});return;}
   const messages=mine.filter(m=>m.id>Number(q.get('p_after'))).slice(0,10);
   send({ok:true,enabled:true,cursor:messages.length?messages[messages.length-1].id:Math.max(cursor,Number(q.get('p_after'))),messages:messages.map(m=>({id:m.id,age_ms:Date.now()-Date.parse(m.createdAt),payload:m.payload}))});return;
  }
  if(req.method!=='POST'){send({ok:false,error:'not_found'},404);return;}
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>20000){send({ok:false,error:'bad_payload'},413);return;}}
  const body=JSON.parse(raw||'{}'),fn=urlPath.split('/').pop(),series=body.p_series;
  if(fn==='radio_status'){send({ok:true,enabled:state.enabled[series]!==false});return;}
  const actor=await actorFor(body.p_token,data);if(!actor){send({ok:false,error:'unauthorized'});return;}
  if(fn==='radio_roster'){send({ok:true,role:actor.role,senderName:actor.identity,targets:policy.roster(data,actor)});return;}
  if(fn==='radio_set_enabled'){
   if(actor.role!=='admin'){send({ok:false,error:'forbidden'});return;}
   state.enabled[series]=!!body.p_enabled;save();send({ok:true,enabled:state.enabled[series]});return;
  }
  if(fn!=='radio_send'){send({ok:false,error:'unknown_function'},404);return;}
  const prepared=policy.prepare(data,actor,body.p_payload||{});if(!prepared.ok){send(prepared);return;}
  if(prepared.series!==series){send({ok:false,error:'invalid_race'});return;}
  if(state.enabled[series]===false){send({ok:false,error:'radio_off'});return;}
  if(state.messages.some(m=>m.username===actor.username&&Date.now()-Date.parse(m.createdAt)<10000)){send({ok:false,error:'too_fast'});return;}
  const message={...prepared,id:(state.messages.at(-1)?.id||0)+1,createdAt:new Date().toISOString(),username:actor.username,role:actor.role};state.messages.push(message);save();
  send({ok:true,id:message.id,createdAt:message.createdAt,raceId:message.raceId,lap:message.lap,preview:true});
 }catch(e){send({ok:false,error:'radio_unavailable'},503);}
};
