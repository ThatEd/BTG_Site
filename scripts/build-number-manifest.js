const fs = require('fs');
const path = require('path');
const DEFAULT_BOXES = Object.fromEntries(Array.from({length:10},(_,d)=>[d,[d%2?512:0,Math.floor(d/2)*410,d%2?512:500,d>=8?408:410]]));
function discover(root) {
  const sheets=[];
  function walk(dir) {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const full=path.join(dir,entry.name);
      if(entry.isDirectory())walk(full);
      else if(entry.isFile() && /\.(png|webp)$/i.test(entry.name)) {
        const relative=path.relative(root,full).split(path.sep).join('/');
        const group=path.posix.dirname(relative)==='.'?'Custom':path.posix.dirname(relative);
        const stem=path.posix.basename(relative).replace(/\.(png|webp)$/i,'').replace(/^T_Driver_Number_Atlas_/,'');
        let metadata={};const sidecar=full.replace(/\.(png|webp)$/i,'.json');
        if(fs.existsSync(sidecar))metadata=JSON.parse(fs.readFileSync(sidecar,'utf8'));
        sheets.push({id:group+':'+stem,label:metadata.label||group.replace(/\//g,' · ')+' · '+stem.replace(/_/g,' '),url:'driver-numbers/'+relative,boxes:metadata.boxes||DEFAULT_BOXES});
      }
    }
  }
  walk(root);sheets.sort((a,b)=>a.id.localeCompare(b.id));
  if(new Set(sheets.map(s=>s.id)).size!==sheets.length)throw Error('Duplicate number sheet IDs');
  return sheets;
}
if(require.main===module){const root=path.resolve(__dirname,'../driver-numbers');const sheets=discover(root);fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({sheets},null,2)+'\n');console.log('Discovered '+sheets.length+' number sheets');}
module.exports={discover};
