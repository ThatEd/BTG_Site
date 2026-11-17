(function(){
  'use strict';
  var host=document.getElementById('admin-team-section');if(!host)return;
  var card=document.createElement('div');card.className='tool-card';
  card.innerHTML=`
<h3>Appearance customizer</h3>
<p class="muted">Choose a team, then edit its branding or each car’s numbers. Lineup and season settings have their own sections.</p>
<div class="field-row lb-context"><div class="field"><label for="lb-series">Series</label><select id="lb-series"></select></div><div class="field"><label for="lb-team">Team</label><select id="lb-team"></select></div><button type="button" class="action action-quiet action-compact" id="lb-load"><span>Reload settings</span></button></div>
<div class="lb-tabs" role="tablist" aria-label="Appearance settings"><button type="button" role="tab" id="lb-tab-team" data-panel="team" aria-selected="true" aria-controls="lb-panel-team">Team colours</button><button type="button" role="tab" id="lb-tab-numbers" data-panel="numbers" aria-selected="false" aria-controls="lb-panel-numbers">Car numbers</button><button type="button" role="tab" id="lb-tab-lineup" data-panel="lineup" aria-selected="false" aria-controls="lb-panel-lineup">Lineup layout</button><button type="button" role="tab" id="lb-tab-seasons" data-panel="seasons" aria-selected="false" aria-controls="lb-panel-seasons">Season labels</button></div>
<div id="lb-form">
<section id="lb-panel-team" role="tabpanel" aria-labelledby="lb-tab-team"><h4>Team colours</h4><p class="muted">These colours form the team’s gradient and number plates.</p><div class="field-row"><div class="field"><label for="lb-primary">Primary colour</label><input id="lb-primary" type="color"></div><div class="field"><label for="lb-secondary">Secondary colour</label><input id="lb-secondary" type="color"></div><button type="button" class="action action-quiet action-compact" id="lb-swap"><span>Swap colours</span></button></div><div id="lb-colour-preview" class="lb-colour-preview">Team colour preview</div></section>
<section id="lb-panel-numbers" role="tabpanel" aria-labelledby="lb-tab-numbers" hidden><h4>Driver number design</h4><div class="field-row"><div class="field"><label for="lb-target">Edit numbers for</label><select id="lb-target"><option value="team">Team default</option><option value="car1">Car 1</option><option value="car2">Car 2</option><option value="reserve">Reserves & affiliates</option></select></div><label class="lb-check"><input id="lb-inherit" type="checkbox"> Use team default</label><div class="field"><label for="lb-sample">Preview number</label><input id="lb-sample" value="16" inputmode="numeric" maxlength="3" pattern="[0-9]{1,3}"></div></div><p id="lb-target-hint" class="muted"></p><div id="lb-preview" class="lb-preview"><span id="lb-preview-name"></span><canvas id="lb-preview-number" width="96" height="96" aria-label="Number preview"></canvas></div><div class="field-row"><div class="field"><label for="lb-number">Number style</label><select id="lb-number"></select></div><div class="field"><label for="lb-plate">Number plate</label><select id="lb-plate"><option value="primary">Primary colour</option><option value="secondary">Secondary colour</option><option value="none">No plate</option></select></div><div class="field"><label for="lb-ink">Number colour</label><input id="lb-ink" type="color" value="#ffffff"><label class="lb-check"><input id="lb-original-ink" type="checkbox" checked> Keep sheet colours</label></div></div><details class="lb-details"><summary>Choose a number design</summary><button type="button" id="lb-refresh-library" class="action action-quiet action-compact"><span>Refresh number library</span></button><p id="lb-library-status" class="muted"></p><div id="lb-styles" class="lb-styles" role="group" aria-label="Number style catalogue"></div></details><details class="lb-details"><summary>Fine-tune colours & replace individual parts</summary><div class="field-row"><div class="field"><label for="lb-hue">Hue <output id="lb-hue-value">0°</output></label><input id="lb-hue" type="range" min="-180" max="180" value="0"></div><div class="field"><label for="lb-keep-ink">Light plates</label><select id="lb-keep-ink"><option value="0">Automatic dark ink</option><option value="1">Keep original number colours</option></select></div></div><p class="muted">Replace individual colours in the digits. Use Sample, then click the preview. Tolerance controls matching; softness blends the edges. Keep sheet colours enabled to edit separate parts.</p><div id="lb-overlays"></div><button type="button" class="action action-quiet action-compact" id="lb-add-overlay"><span>Add colour replacement</span></button><button type="button" class="action action-quiet action-compact" id="lb-reset"><span>Reset colour adjustments</span></button></details><details class="lb-details"><summary>Prepare a repository sheet or preset</summary><p class="muted">Number images are loaded from the GitHub repository. Open a local sheet to map its digits, then download the PNG and matching JSON into driver-numbers/ and commit both files. They appear in the library after deployment.</p><input id="lb-upload" type="file" accept="image/png,image/webp"><div id="lb-mapper" hidden><div class="field-row"><div class="field"><label for="lb-upload-label">Design name</label><input id="lb-upload-label" maxlength="180"></div><div class="field"><label for="lb-map-digit">Map digit</label><select id="lb-map-digit"><option>0</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option><option>9</option></select></div></div><p class="muted">Select a digit, then drag a rectangle around it. The standard two-column layout is prefilled.</p><canvas id="lb-map-canvas" aria-label="Draw a digit rectangle on the selected sheet"></canvas><div class="field-row" id="lb-map-coordinates"></div><button type="button" id="lb-save-upload" class="action action-compact"><span>Prepare PNG & mapping downloads</span></button></div><hr><div class="field-row"><div class="field"><label for="lb-preset-name">Preset name</label><input id="lb-preset-name" maxlength="180" placeholder="e.g. Car 1 white outline"></div><button type="button" id="lb-save-preset" class="action action-compact"><span>Prepare preset for GitHub</span></button></div><p class="muted">Presets bake these colours into all ten digits. Add the downloaded PNG and matching JSON to the repository to make the preset available to every team and car.</p><div id="lb-export" hidden><p class="muted">Save both files together in driver-numbers/Custom/, then commit and deploy the site.</p><a id="lb-export-png" class="action action-compact">Download PNG</a> <a id="lb-export-json" class="action action-quiet action-compact">Download digit mapping</a></div></details></section>
<section id="lb-panel-lineup" role="tabpanel" aria-labelledby="lb-tab-lineup" hidden><h4>Lineup layout</h4><div class="field-row"><div class="field"><label for="lb-layout">Layout</label><select id="lb-layout"><option value="f1">F1</option><option value="f2">F2</option><option value="fe12">Formula E Season 12</option></select></div><div class="field"><label for="lb-background">Background</label><select id="lb-background"><option value="light">Light</option><option value="grey">Grey</option><option value="dark">Dark</option></select></div></div><div class="field-row"><div class="field"><label for="lb-title">Title</label><input id="lb-title" maxlength="80"></div><div class="field"><label for="lb-accent">Title colour</label><input id="lb-accent" type="color"></div><div class="field"><label for="lb-default-number">Default number style</label><select id="lb-default-number"></select></div></div><div class="field"><label for="lb-logo">Series logo</label><input id="lb-logo" placeholder="logos/XGT.png"></div></section>
<section id="lb-panel-seasons" role="tabpanel" aria-labelledby="lb-tab-seasons" hidden><h4>Season labels</h4><div class="field-row"><div class="field"><label for="lb-numbered">Season numbering</label><select id="lb-numbered"><option value="year">Year only</option><option value="number">Season N</option><option value="number_year">Season N: YYYY</option></select></div><div class="field"><label for="lb-first-year">First season year</label><input id="lb-first-year" type="number" min="1900" max="2200"></div></div><div class="field-row"><div class="field"><label for="lb-season">Season year</label><select id="lb-season"></select></div><div class="field"><label for="lb-season-name">Season display name</label><input id="lb-season-name" maxlength="100"></div><button type="button" class="action action-compact" id="lb-save-season"><span>Save season name</span></button></div></section>
<div class="lb-save-bar"><button type="button" class="action action-lead action-compact" id="lb-save-team"><span>Save team branding</span></button><button type="button" class="action action-lead action-compact" id="lb-save-series" hidden><span>Save series appearance</span></button><span id="lb-dirty" class="muted" role="status"></span></div></div><div id="lb-result" class="result-line" role="status"></div>
`;
  var stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='css/lineup-admin.css?v=20261117-studio';document.head.appendChild(stylesheet);
  host.appendChild(card);var $=function(id){return document.getElementById('lb-'+id);},state, overlays=[], previewRevision=0, galleryRevision=0, pickIndex=null, numberDraft={}, target='team', activePanel='team', studio=null, studioLoading=null, editorConfigs={}, uploadImage=null, uploadPng=null, uploadBoxes=null;
  var numberRoot={},numberYear='';
  var css=document.createElement('style');css.textContent='.lb-preview{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 22px;margin:16px 0;border:1px solid #ffffff30;border-radius:10px;min-height:112px;color:white;font-size:18px;font-weight:700;text-shadow:0 1px 3px #000}.lb-preview canvas{width:96px;height:96px;flex:none}.lb-styles{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;max-height:320px;overflow:auto;margin:12px 0 18px}.lb-style{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;background:#252529;color:#eee;border:1px solid #ffffff20;border-radius:6px;min-height:85px;padding:6px;cursor:pointer;font-size:10px}.lb-style[aria-pressed=true]{border-color:#ff424f;box-shadow:inset 0 0 0 1px #ff424f}.lb-style img{width:44px;height:44px;object-fit:contain}.lb-overlay{display:flex;flex-wrap:wrap;align-items:end;gap:8px;margin:10px 0}.lb-overlay label{display:flex;flex-direction:column;gap:5px;font-size:11px}.lb-overlay input[type=number]{width:85px}';document.head.appendChild(css);
  function studioContext(){var series=$('series').value,c=BTG.LineupData.config(series,state&&state.settings||[]);return {series:series,settings:Object.assign({},c,{editor_config:editorConfigs[series]||c.editor_config||{},background:$('background').value,title:$('title').value,series_logo:$('logo').value,season_label_format:$('numbered').value,season_start_year:Number($('first-year').value),season_start_number:1,numbered_seasons:$('numbered').value!=='year'})};}
  async function openStudio(){
    if(!state)return;
    if(!studioLoading)studioLoading=new Promise(function(resolve,reject){var script=document.createElement('script');script.src='js/lineup-studio-admin.js?v=20261117-studio';script.onload=resolve;script.onerror=function(){studioLoading=null;reject(Error('The lineup studio could not load.'));};document.body.appendChild(script);});
    try{await studioLoading;if(!studio){var holder=document.createElement('div');$('panel-lineup').appendChild(holder);studio=BTG.LineupStudio.mount(holder,{onChange:function(config){editorConfigs[$('series').value]=config;if(typeof config.title==='string'&&config.title.length<=80)$('title').value=config.title;$('dirty').textContent='Unsaved layout changes';}});$('layout').closest('.field-row').hidden=true;}
      studio.update(studioContext());
    }catch(e){notice(e.message);}
  }
  $('panel-numbers').insertAdjacentHTML('afterbegin','<div class="field-row"><div class="field"><label for="lb-number-year">Apply number design to year</label><select id="lb-number-year"></select></div></div><p class="muted">This year uses its saved design, or the latest earlier assignment. Future assignments never apply backwards.</p>');
  function loadNumberYear(){
    var t=selectedTeam();if(!t)return;numberYear=$('number-year').value;
    var eligible=Object.keys(numberRoot.years||{}).filter(function(y){return Number(y)<=Number(numberYear);}).sort(function(a,b){return Number(b)-Number(a);});
    numberDraft=JSON.parse(JSON.stringify(eligible.length?numberRoot.years[eligible[0]]:numberRoot));delete numberDraft.years;
    numberDraft.style=numberDraft.style||t.number_style||'auto';target='team';$('target').value=target;loadTarget();gallery();
  }
  function collectNumberYears(){captureTarget();numberRoot.years=numberRoot.years||{};numberRoot.years[numberYear]=JSON.parse(JSON.stringify(numberDraft));return JSON.parse(JSON.stringify(numberRoot));}
  $('number-year').onchange=function(){if(numberYear){captureTarget();numberRoot.years=numberRoot.years||{};numberRoot.years[numberYear]=JSON.parse(JSON.stringify(numberDraft));}loadNumberYear();$('dirty').textContent='Unsaved year assignments';};
  var studioTitleTimer;
  $('title').addEventListener('input',function(){var series=$('series').value;editorConfigs[series]=Object.assign({},editorConfigs[series]||BTG.LineupData.config(series,state&&state.settings||[]).editor_config||{},{title:this.value});$('dirty').textContent='Unsaved layout changes';clearTimeout(studioTitleTimer);if(studio)studioTitleTimer=setTimeout(function(){studio.update(studioContext());},250);});
  function notice(message){$('result').textContent=message;}
  function admin(){return typeof CURRENT_USER!=='undefined'&&CURRENT_USER&&CURRENT_USER.role==='admin';}
  function numberOptions(el){el.innerHTML='';BTG.numberStyleOptions().forEach(function(o){el.add(new Option(o.label,o.value));});}
  function customization(){return {ink:$('original-ink').checked?null:$('ink').value,plate:$('plate').value,hue:Number($('hue').value),keepInk:$('keep-ink').value==='1',overlays:JSON.parse(JSON.stringify(overlays))};}
  function selectedTeam(){return state && state.teams.find(function(t){return String(t.team_id)===$('team').value;});}
  function captureTarget(){
    var c=customization();c.style=$('number').value;
    if(target==='team'){var seats=numberDraft.seats||{};numberDraft=Object.assign(c,{seats:seats});}
    else{numberDraft.seats=numberDraft.seats||{};if($('inherit').checked)delete numberDraft.seats[target];else numberDraft.seats[target]=c;}
  }
  function loadTarget(){
    var own=target==='team'?numberDraft:(numberDraft.seats||{})[target],c=own||numberDraft;
    $('inherit').disabled=target==='team';$('inherit').checked=target!=='team'&&!own;
    $('number').value=c.style||'auto';$('plate').value=c.plate||'primary';$('hue').value=c.hue||0;$('keep-ink').value=c.keepInk?'1':'0';
    $('original-ink').checked=!c.ink;$('ink').value=c.ink||'#ffffff';overlays=JSON.parse(JSON.stringify(c.overlays||[]));pickIndex=null;overlayRows();
    $('target-hint').textContent=target==='team'?'The default design for cars without an override.':own?'This car has its own saved design.':'This car follows the team default. Editing a control creates its own design.';
    preview();
  }
  function dirty(event){if(target!=='team' && event && ['number','plate','hue','keep-ink','ink','original-ink'].some(function(id){return event.target===$(id);}))$('inherit').checked=false;$('dirty').textContent='Unsaved changes';if(target!=='team'&&!$('inherit').checked)$('target-hint').textContent='This car has its own design. Save team branding to apply it.';preview();}
  function team(){
    var t=selectedTeam();if(!t)return;
    $('primary').value=t.color_primary||'#777777';$('secondary').value=t.color_secondary||t.color_primary||'#777777';
    numberRoot=JSON.parse(JSON.stringify(t.number_customization||{}));var keep=$('number-year').value,years=new Set((state.seasons||[]).filter(function(r){return r.series===t.series;}).map(function(r){return Number(r.year);}));Object.keys(numberRoot.years||{}).forEach(function(y){years.add(Number(y));});if(!years.size)years.add(2024);$('number-year').replaceChildren();Array.from(years).sort(function(a,b){return a-b;}).forEach(function(y){$('number-year').add(new Option(String(y),String(y)));});if(years.has(Number(keep)))$('number-year').value=keep;loadNumberYear();
    loadTarget();$('dirty').textContent='';gallery();
  }
  $('target').onchange=function(){captureTarget();target=this.value;loadTarget();};
  $('inherit').onchange=function(){if(this.checked){numberDraft.seats=numberDraft.seats||{};delete numberDraft.seats[target];loadTarget();}else captureTarget();dirty();};
  card.querySelectorAll('[role=tab]').forEach(function(btn){btn.onclick=function(){activePanel=btn.dataset.panel;if(activePanel==='lineup')openStudio();card.querySelectorAll('[role=tabpanel]').forEach(function(panel){panel.hidden=panel.id!=='lb-panel-'+activePanel;});card.querySelectorAll('[role=tab]').forEach(function(tab){tab.setAttribute('aria-selected',String(tab===btn));});$('save-team').hidden=!['team','numbers'].includes(activePanel);$('save-series').hidden=['team','numbers'].includes(activePanel);};btn.onkeydown=function(event){var tabs=Array.from(card.querySelectorAll('[role=tab]')),index=tabs.indexOf(btn);if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();var next=tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();next.click();}};});
  function effectiveStyle(){if($('number').value!=='auto')return $('number').value;return target!=='team'&&numberDraft.style&&numberDraft.style!=='auto'?numberDraft.style:$('default-number').value;}
  function sheetFor(style){var t=selectedTeam();return BTG.numberSheetByStyle(style,t && (t.team_name||t.team_key),Number($('number-year').value)||BTG.currentSeason||2024);}
  async function preview(){
    var revision=++previewRevision,t=selectedTeam();if(!t)return;
    var c=customization(),colour=$(c.plate==='secondary'?'secondary':'primary').value;
    $('preview').style.background='linear-gradient(90deg,'+$('primary').value+','+$('secondary').value+')';$('preview-name').textContent=t.team_name||t.team_key;
    $('colour-preview').style.background=$('preview').style.background;$('colour-preview').textContent=t.team_name||t.team_key;
    $('hue-value').textContent=c.hue+'°';var style=effectiveStyle(),digits=$('sample').value.replace(/[^0-9]/g,'').slice(0,3)||'16';
    var canvas=$('preview-number'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,96,96);
    $('styles').querySelectorAll('button').forEach(function(btn){btn.setAttribute('aria-pressed',String(btn.dataset.style===$('number').value));});
    if(style==='hidden')return;
    if(style==='plain'){ctx.fillStyle=c.ink||'#fff';ctx.font='italic bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(digits,48,64);return;}
    var sheet=sheetFor(style);if(!sheet)return;
    var strip=await BTG.numberStrip(sheet,digits.split(''),96,colour,c.plate!=='none',null,c);
    if(revision!==previewRevision)return;
    if(!strip){notice('Could not load this number sheet.');return;}
    var img=new Image();img.onload=function(){if(revision===previewRevision)ctx.drawImage(img,0,0,96,96);};img.src=strip.url;
  }
  async function gallery(){
    var revision=++galleryRevision;$('styles').replaceChildren();
    var digits=($('sample').value.replace(/[^0-9]/g,'')||'16').split('');
    BTG.numberStyleOptions().forEach(function(option){
      var btn=document.createElement('button');btn.type='button';btn.className='lb-style';btn.dataset.style=option.value;btn.setAttribute('aria-pressed',String(option.value===$('number').value));
      var label=document.createElement('span');label.textContent=option.label;btn.appendChild(label);
      btn.onclick=function(){$('number').value=option.value;if(target!=='team')$('inherit').checked=false;dirty();};$('styles').appendChild(btn);
      var sheet=sheetFor(option.value);if(!sheet)return;
      BTG.numberStrip(sheet,digits,44,$('primary').value,false).then(function(strip){if(!strip||revision!==galleryRevision)return;var img=document.createElement('img');img.src=strip.url;img.alt='';btn.prepend(img);});
    });
  }
  function overlayRows(){
    $('overlays').replaceChildren();
    overlays.forEach(function(rule,index){
      var row=document.createElement('div');row.className='lb-overlay';
      [['from','Source','color'],['to','Replace with','color'],['tolerance','Tolerance','number'],['softness','Softness','number']].forEach(function(spec){
        var label=document.createElement('label');label.textContent=spec[1];var input=document.createElement('input');input.type=spec[2];input.value=rule[spec[0]];
        if(spec[2]==='number'){input.min=spec[0]==='softness'?'1':'0';input.max='442';}
        input.oninput=function(){if(target!=='team')$('inherit').checked=false;rule[spec[0]]=spec[2]==='number'?Math.max(Number(input.min),Math.min(442,Number(input.value))):input.value;dirty();};
        if(spec[0]==='from'){var sample=document.createElement('button');sample.type='button';sample.className='action action-quiet action-compact';sample.textContent='Sample';sample.onclick=function(){pickIndex=index;$('preview-number').style.cursor='crosshair';};label.appendChild(sample);}
        label.appendChild(input);row.appendChild(label);
      });
      var remove=document.createElement('button');remove.type='button';remove.className='action action-quiet action-compact';remove.textContent='Remove';remove.onclick=function(){if(target!=='team')$('inherit').checked=false;overlays.splice(index,1);pickIndex=null;overlayRows();dirty();};row.appendChild(remove);$('overlays').appendChild(row);
    });
    $('add-overlay').disabled=overlays.length>=8;
  }
  $('preview-number').onclick=function(event){if(pickIndex===null||!overlays[pickIndex])return;var canvas=this,rect=canvas.getBoundingClientRect(),x=Math.max(0,Math.min(95,Math.floor((event.clientX-rect.left)*96/rect.width))),y=Math.max(0,Math.min(95,Math.floor((event.clientY-rect.top)*96/rect.height)));var pixel=canvas.getContext('2d').getImageData(x,y,1,1).data;if(!pixel[3])return;if(target!=='team')$('inherit').checked=false;overlays[pickIndex].from='#'+Array.from(pixel).slice(0,3).map(function(v){return v.toString(16).padStart(2,'0');}).join('');pickIndex=null;canvas.style.cursor='default';overlayRows();dirty();};
  $('add-overlay').onclick=function(){if(overlays.length>=8)return;if(target!=='team')$('inherit').checked=false;overlays.push({from:'#ffffff',to:'#ffffff',tolerance:30,softness:20});overlayRows();dirty();};
  $('swap').onclick=function(){var c=$('primary').value;$('primary').value=$('secondary').value;$('secondary').value=c;dirty();};
  $('reset').onclick=function(){if(target!=='team')$('inherit').checked=false;$('hue').value=0;$('original-ink').checked=true;$('keep-ink').value='0';overlays=[];overlayRows();dirty();};
  ['primary','secondary','sample','number','plate','hue','keep-ink','ink','original-ink','default-number'].forEach(function(id){$(id).addEventListener('input',dirty);});
  async function refreshLibrary(){
    $('refresh-library').disabled=true;$('library-status').textContent='Discovering number sheets…';
    try{
      var sheets=await BTG.discoverNumberSheets(true);BTG.registerNumberSheets(state&&state.number_sheets||[]);
      if(admin() && state && (state.capabilities||[]).includes('number_library')){
        var result=await callGateway('adminSyncNumberSheets',{sheets:sheets});if(!result.ok)throw Error(result.error||'Library sync failed');
      }
      var chosen=$('number').value,defaultStyle=$('default-number').value;numberOptions($('number'));numberOptions($('default-number'));$('number').value=chosen;$('default-number').value=defaultStyle;
      gallery();preview();$('library-status').textContent=BTG.numberStyleOptions().length-3+' designs available. New sheets are discovered on refresh and every site deployment.';
    }catch(e){$('library-status').textContent=e.message;}finally{$('refresh-library').disabled=false;}
  }
  $('refresh-library').onclick=refreshLibrary;
  function mapCoordinates(){
    var digit=$('map-digit').value,box=uploadBoxes[digit];$('map-coordinates').replaceChildren();
    ['X','Y','Width','Height'].forEach(function(label,index){var field=document.createElement('label');field.className='field';field.textContent=label;var input=document.createElement('input');input.type='number';input.min=index<2?0:1;input.value=box[index];input.onchange=function(){box[index]=Math.max(index<2?0:1,Math.round(Number(input.value)||0));drawMap();};field.appendChild(input);$('map-coordinates').appendChild(field);});
  }
  function drawMap(){if(!uploadImage)return;var canvas=$('map-canvas'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(uploadImage,0,0);ctx.lineWidth=Math.max(2,canvas.width/300);Object.keys(uploadBoxes).forEach(function(digit){var b=uploadBoxes[digit];ctx.strokeStyle=digit===$('map-digit').value?'#ff3045':'#00cfac';ctx.strokeRect(b[0],b[1],b[2],b[3]);ctx.fillStyle=ctx.strokeStyle;ctx.font='bold '+Math.max(18,canvas.width/40)+'px sans-serif';ctx.fillText(digit,b[0]+4,b[1]+Math.max(22,canvas.width/35));});}
  $('upload').onchange=async function(){
    var file=this.files[0];if(!file)return;if(!['image/png','image/webp'].includes(file.type)||file.size>8388608){notice('Choose a PNG or WebP up to 8 MB.');return;}
    try{
      var image=await createImageBitmap(file);if(image.width>8192||image.height>8192||image.width*image.height>33554432)throw Error('Use a sheet up to 8192 px per side and 32 megapixels.');
      uploadImage=image;var canvas=$('map-canvas');canvas.width=image.width;canvas.height=image.height;var original=document.createElement('canvas');original.width=image.width;original.height=image.height;original.getContext('2d').drawImage(image,0,0);uploadPng=original.toDataURL('image/png');
      uploadBoxes={};for(var digit=0;digit<10;digit++){var x=digit%2?Math.floor(image.width/2):0,y=Math.floor(digit/2)*Math.floor(image.height/5);uploadBoxes[digit]=[x,y,Math.floor(image.width/2),digit>=8?image.height-y:Math.floor(image.height/5)];}
      $('upload-label').value=file.name.replace(/\.(png|webp)$/i,'');$('mapper').hidden=false;mapCoordinates();drawMap();
    }catch(e){notice(e.message);}
  };
  $('map-digit').onchange=function(){mapCoordinates();drawMap();};
  var dragStart;
  function mapPoint(event){var rect=$('map-canvas').getBoundingClientRect();return [Math.max(0,Math.min(uploadImage.width,Math.round((event.clientX-rect.left)*uploadImage.width/rect.width))),Math.max(0,Math.min(uploadImage.height,Math.round((event.clientY-rect.top)*uploadImage.height/rect.height)))];}
  $('map-canvas').onpointerdown=function(event){dragStart=mapPoint(event);this.setPointerCapture(event.pointerId);};
  $('map-canvas').onpointermove=function(event){if(!dragStart)return;var point=mapPoint(event);uploadBoxes[$('map-digit').value]=[Math.min(point[0],dragStart[0]),Math.min(point[1],dragStart[1]),Math.max(1,Math.abs(point[0]-dragStart[0])),Math.max(1,Math.abs(point[1]-dragStart[1]))];drawMap();mapCoordinates();};
  $('map-canvas').onpointerup=function(){dragStart=null;};$('map-canvas').onpointercancel=function(){dragStart=null;};
  var exportUrls=[];
  function prepareExport(label,boxes,png){
    if(!label.trim()){notice('Enter a design name.');return;}
    var stem=label.trim().replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,100)||'NumberSheet';
    exportUrls.forEach(function(url){URL.revokeObjectURL(url);});exportUrls=[];
    $('export-png').href=png;$('export-png').download=stem+'.png';
    var url=URL.createObjectURL(new Blob([JSON.stringify({label:label.trim(),boxes:boxes},null,2)],{type:'application/json'}));exportUrls.push(url);
    $('export-json').href=url;$('export-json').download=stem+'.json';$('export').hidden=false;
    notice('Downloads ready. Add both files to driver-numbers/Custom/ in GitHub, then deploy and refresh the number library.');
  }
  $('save-upload').onclick=function(){if(!uploadPng)return;for(var b of Object.values(uploadBoxes)){if(b[0]+b[2]>uploadImage.width||b[1]+b[3]>uploadImage.height){notice('Every digit rectangle must fit inside the sheet.');return;}}prepareExport($('upload-label').value,uploadBoxes,uploadPng);};
  $('save-preset').onclick=async function(){var sheet=sheetFor(effectiveStyle());if(!sheet){notice('Choose a number sheet before preparing a preset.');return;}if(!$('preset-name').value.trim()){notice('Enter a preset name.');return;}this.disabled=true;try{var png=await BTG.numberPresetPicture(sheet,customization(),$($('plate').value==='secondary'?'secondary':'primary').value);prepareExport($('preset-name').value,sheet.boxes,png);}catch(e){notice(e.message);}finally{this.disabled=false;}};
  function seasonName(){var row=(state.seasons||[]).find(function(r){return r.series===$('series').value && Number(r.year)===Number($('season').value);});$('season-name').value=row ? row.display_name : ''; $('save-season').disabled=!row;}
  function series(){var s=$('series').value,c=BTG.LineupData.config(s,state.settings);['layout','background','accent','title'].forEach(function(k){$(k).value=c[k];});$('logo').value=c.series_logo||'logos/BTG.png';$('season').innerHTML='';(state.seasons||[]).filter(function(r){return r.series===s;}).sort(function(a,b){return a.year-b.year;}).forEach(function(r){$('season').add(new Option(r.display_name,r.year));});seasonName();$('default-number').value=c.number_style;$('first-year').value=c.season_start_year;$('numbered').value=c.season_label_format||(c.numbered_seasons?'number_year':'year');$('team').innerHTML='';state.teams.filter(function(t){return t.series===s;}).forEach(function(t){$('team').add(new Option(t.team_name||t.team_key,t.team_id));});team();if(activePanel==='lineup')openStudio();}
  function showSettings(loaded){
    if(!loaded || !Array.isArray(loaded.teams) || !loaded.teams.some(function(t){return t.series;}))throw Error('No team branding available');
    var previousSeries=$('series').value,previousTeam=$('team').value;
    state=Object.assign({settings:[],seasons:[]},state||{},loaded);BTG.registerNumberSheets(state.number_sheets||[]);
    $('series').replaceChildren();[...new Set(state.teams.map(function(t){return t.series;}))].filter(Boolean).sort().forEach(function(s){$('series').add(new Option(s,s));});
    if(Array.from($('series').options).some(function(o){return o.value===previousSeries;}))$('series').value=previousSeries;
    numberOptions($('number'));numberOptions($('default-number'));series();
    if(Array.from($('team').options).some(function(o){return o.value===previousTeam;})){$('team').value=previousTeam;team();}
  }
  $('load').onclick=async function(){
    var button=this;button.disabled=true;notice('Loading branding…');
    // Populate from the local site cache first: a slow API must never hide the editor.
    if(!state){
      try{var cached=await fetch('cache/public-data.json',{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!cached.ok)throw Error();var data=await cached.json();showSettings({teams:data.teams,settings:data.lineup_series_settings||[],seasons:data.lineup_seasons||[],drivers:data.drivers||[],driver_cars:data.driver_cars||[]});notice('Cached branding loaded. Checking database settings…');}catch(e){notice('Checking database settings…');}
    }
    try{
      var r=await fetch(EDGE_URL+'?data=branding',{cache:'no-store',signal:AbortSignal.timeout(8000)});var loaded=await r.json();
      if(!r.ok||!loaded.ok)throw Error('Could not load DB settings');
      // Preserve edits made while the database request was in flight.
      if($('dirty').textContent){state.capabilities=loaded.capabilities||[];state.number_sheets=loaded.number_sheets||[];BTG.registerNumberSheets(state.number_sheets);refreshLibrary();notice('Database connected. Your preview changes have been kept.');return;}
      showSettings(loaded);
      refreshLibrary();
      notice((state.capabilities||[]).includes('number_customization') ? 'Database settings loaded. Preview changes, then save team branding.' : 'Preview ready. Saving requires the number customizer backend update.');
    }catch(e){notice(state ? 'Showing cached branding. Database settings are unavailable; you can still customize the preview.' : 'Could not load teams. Use Load DB settings to retry.');}
    finally{button.disabled=false;}
  };
  $('series').onchange=series;$('team').onchange=team;
  $('season').onchange=seasonName;
  async function save(button,action,payload,done){if(!admin()){notice('Admin sign-in required.');return;}button.disabled=true;try{var r=await callGateway(action,payload);if(!r.ok)throw Error(r.error||'Save failed');done();notice('Saved to database.');}catch(e){notice(e.message);}finally{button.disabled=false;}}
  $('save-team').onclick=function(){if(!state || !(state.capabilities||[]).includes('per_car_numbers')){notice('The branding backend needs its number customizer update before these settings can be saved. Live preview is available.');return;}var t=state.teams.find(function(t){return String(t.team_id)===$('team').value;});if(!t)return;var p={teamId:t.team_id,primary:$('primary').value,secondary:$('secondary').value,numberStyle:t.number_style||'auto',numberCustomization:collectNumberYears()};save(this,'adminSetTeamBranding',p,function(){Object.assign(t,{color_primary:p.primary,color_secondary:p.secondary,number_style:p.numberStyle,number_customization:p.numberCustomization});$('dirty').textContent='';});};
  $('save-series').onclick=function(){var s=$('series').value,c={layout:$('layout').value,background:$('background').value,accent:$('accent').value,title:$('title').value,number_style:$('default-number').value,series_logo:$('logo').value,numbered_seasons:$('numbered').value!=='year',season_label_format:$('numbered').value,season_start_year:Number($('first-year').value),season_start_number:1,editor_config:editorConfigs[s]||BTG.LineupData.config(s,state.settings).editor_config||{}};save(this,'adminSetLineupSettings',{series:s,settings:c},function(){state.settings=state.settings.filter(function(x){return x.series!==s;}).concat([Object.assign({series:s},c)]);});};
  $('save-season').onclick=function(){var p={series:$('series').value,year:Number($('season').value),name:$('season-name').value};save(this,'adminSetLineupSeasonLabel',p,function(){var row=state.seasons.find(function(r){return r.series===p.series&&Number(r.year)===p.year;});if(row)row.display_name=p.name;});};
  numberOptions($('number'));numberOptions($('default-number'));
  $('load').click();
})();
