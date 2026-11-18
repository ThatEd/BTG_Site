(function(){'use strict';
const local=['localhost','127.0.0.1'].includes(location.hostname),API='https://jocmjietuviegelluiev.supabase.co';
const anon='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvY21qaWV0dXZpZWdlbGx1aWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNDc5NDQsImV4cCI6MjEwMjcyMzk0NH0.LOrbnYYc6iE0AZ_90NmRSBMGS1bF0qlyoEXRyf95c_0';
let root,model,selected,shownAt=null,sequence=0;
const $=id=>root.querySelector('#'+id),esc=v=>BTG.esc(String(v??''));
function token(){return CURRENT_USER?.token||'';}
async function rpc(fn,body){
 if(local){const r=await fetch('/api/radio-rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,p_token:token()})});return r.json();}
 if(fn==='radio_roster')return callGateway('radioRoster',{});
 // The publishable key is the same key used by the existing site gateway.
 const key=anon;
 if(!key)throw Error('Radio is not configured yet.');
 const r=await fetch(API+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key},body:JSON.stringify({...body,p_token:token()})});return r.json();
}
function request(){return {driverId:selected?.driverId,teamId:selected?.teamId,from:$('radio-from')?.value,lines:Array.from(root.querySelectorAll('.dashboard-radio-text')).map(t=>({text:t.value})).filter(l=>l.text.trim())};}
function status(text){$('radio-result').textContent=text;}
function choose(){
 selected=model.targets[Number($('radio-target').value)];shownAt=null;
 refreshStatus();draw();
}
async function refreshStatus(){const rev=++sequence;$('radio-send').disabled=true;if(!selected?.series){status('This driver has no active game series. You can still save an image.');return;}
 try{const result=await rpc('radio_status',{p_series:selected.series});if(rev!==sequence)return;$('radio-send').disabled=!result.ok||!result.enabled;status(result.enabled?'Connected radio is on.':'Live radio is off for this series.');if($('radio-toggle')){$('radio-toggle').textContent=result.enabled?'Turn live radio off':'Turn live radio on';$('radio-toggle').dataset.enabled=result.enabled?'1':'0';}}catch(e){status('Could not check game connection.');}}
let drawRevision=0;
const logoCache=new Map();
async function draw(){
 const revision=++drawRevision,canvas=$('radio-preview');if(!canvas||!selected)return;
 const req=request(),R=window.RadioCard;
 const row=BTG.DBCache?.data()?.teams?.find(t=>String(t.team_id)===String(selected.teamId));
 const main=row?.color_primary||selected.colour||'#777777',secondary=row?.color_secondary||selected.secondary||main;
 const bg=R.darkenHex(main,.16),ink=selected.teamKey==='F2 Invicta'?'#ffffff':R.bestTextColor(main,secondary,bg);
 const from=model.role==='driver'?'driver':model.role==='tp'?'engineer':req.from;
 const sender=model.role==='tp'?model.senderName:'ENGINEER';
 const messages=(req.lines.length?req.lines:[{text:'...'}]).map(l=>({type:from==='driver'?'driver':'team',quote:R.formatRadioQuote(l.text),sender}));
 const logo=row?.logo?'logos/teams/'+row.logo:selected.logo;
 let image=null;
 if(logo){if(!logoCache.has(logo))logoCache.set(logo,R.loadImage(logo).catch(()=>null));image=await logoCache.get(logo);}
 await R.ready();if(revision!==drawRevision||!canvas.isConnected)return;
 canvas.width=canvas.height=720;
 R.drawCardToCanvas(canvas.getContext('2d'),{W:720,H:720,bg,accent:ink,mainC:main,nameC:ink,numC:ink,stripeC:secondary,driverName:selected.fullName.toUpperCase(),carNum:String(selected.number||''),label:selected.team.toUpperCase(),logoImage:image,messages,teamSender:from==='driver'?null:sender});
}
async function send(){
 if(!selected?.series)return;
 $('radio-send').disabled=true;status('Sending…');try{const result=await rpc('radio_send',{p_series:selected.series,p_payload:request()});if(!result.ok){status('Not sent: '+result.error);return;}shownAt=result.createdAt;draw();status((result.preview?'Saved in local preview':'Saved to Supabase')+' · '+new Date(result.createdAt).toLocaleString()+' · Message '+result.id);}catch(e){status('Not sent. The radio service did not respond.');}finally{setTimeout(()=>{if(root?.isConnected)$('radio-send').disabled=false;},10000);}}
async function mount(host){
 root=host;const captured=token();root.innerHTML='<p class="muted">Loading your radio permissions…</p>';
 try{model=await rpc('radio_roster',{});if(captured!==token())return;if(!model.ok)throw Error(model.error);
 root.innerHTML='<div class="dashboard-radio"><div class="dashboard-radio-controls"><p>Send team radio to the game or save it as an image.</p><div class="field"><label for="radio-target">Driver</label><select id="radio-target">'+model.targets.map((t,i)=>'<option value="'+i+'">'+esc(t.fullName+(t.team?' · '+t.team:'')+(t.series?' · '+t.series:''))+'</option>').join('')+'</select></div>'+(model.role==='admin'?'<div class="field"><label for="radio-from">Send as</label><select id="radio-from"><option value="engineer">Team principal / engineer</option><option value="driver">Selected driver</option></select></div>':'<p>Sending as <strong>'+esc(model.senderName)+'</strong></p>')+'<div id="radio-lines"><div class="field"><label>Message <textarea class="dashboard-radio-text" maxlength="140" rows="3" placeholder="Your radio message"></textarea></label></div></div><button type="button" id="radio-add" class="action action-quiet">Add message</button><div class="btn-row"><button type="button" id="radio-send" class="action action-lead" disabled>Send to game</button><button type="button" id="radio-image" class="action action-quiet">Save image</button></div>'+(model.role==='admin'?'<button type="button" id="radio-toggle" class="action action-quiet">Live radio</button>':'')+'<p id="radio-result" role="status" aria-live="polite"></p></div><div class="dashboard-radio-preview"><canvas id="radio-preview" aria-label="Radio image preview"></canvas></div></div>';
 if(!model.targets.length){status('No current team drivers are available for your account.');$('radio-add').disabled=true;$('radio-image').disabled=true;return;}
 $('radio-target').onchange=choose;root.oninput=()=>{shownAt=null;draw();};$('radio-add').onclick=()=>{const n=root.querySelectorAll('textarea').length;if(n>=4)return;const div=document.createElement('div');div.className='field';div.innerHTML='<label>Message '+(n+1)+' <textarea class="dashboard-radio-text" maxlength="140" rows="3"></textarea></label>';$('radio-lines').appendChild(div);if(n===3)$('radio-add').disabled=true;draw();};$('radio-send').onclick=send;
 $('radio-image').onclick=async()=>{await draw();const a=document.createElement('a');a.download='radio-'+selected.fullName.replace(/\s+/g,'-')+'.png';a.href=$('radio-preview').toDataURL('image/png');a.click();};
 if($('radio-toggle'))$('radio-toggle').onclick=async()=>{if(!selected?.series)return;await rpc('radio_set_enabled',{p_series:selected.series,p_enabled:$('radio-toggle').dataset.enabled!=='1'});refreshStatus();};choose();
 }catch(e){root.textContent='Could not load radio: '+e.message;}
}
window.DashboardRadio={mount};
})();
