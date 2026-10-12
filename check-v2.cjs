const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const prefix=fs.existsSync('dist/model.js')?'dist/':'';
const ctx={console};vm.createContext(ctx);for(const f of ['model.js','dxf-base.js','advanced.js'])vm.runInContext(fs.readFileSync(prefix+f,'utf8'),ctx);
const M=ctx.FIBC;
assert.equal(M.validate(M.defaults).length,0);
const shifted={...M.defaults,topOffsetX:100,topOffsetY:-50,bottomOffsetX:-80};
assert.equal(M.validate(shifted).length,0);
assert(M.validate({...shifted,topOffsetX:700}).some(x=>x.includes('outside')));
assert(M.validate({...M.defaults,baffleHoleCount:1000000}).length);
assert(M.validate({...M.defaults,showPrint:true,printX:800}).some(x=>x.includes('Print zone')));
assert(M.validate({...M.defaults,liner:'Form-fit',linerTopDia:1000}).some(x=>x.includes('liner')));
assert(M.validate({...M.defaults,seamType:'Plain seam',stitchPitch:0}).length);
const scene=M.scene(shifted,'front');assert(scene.entities.some(e=>e.type==='line'&&e.x1===375&&e.x2===725&&e.y1===-450));
const cs={...M.defaults,customer:'=FORMULA(1)',notes:'Two lines\nwith, commas and "quotes"',unit:'cm',topOffsetX:-10};const parsed=M.csvImport(M.csv(cs));assert.equal(parsed.customer,cs.customer);assert.equal(parsed.notes,cs.notes);assert.equal(parsed.length,900);assert.equal(parsed.topOffsetX,-10);
assert.throws(()=>M.csvImport('field,value\nunknown,1'));
assert.throws(()=>M.normalize({linerTop:'bad'}));
assert.equal(M.normalize({length:1000}).loopEmbedLength,150);
assert.equal(M.diff(M.defaults,{...M.defaults,height:1300}).length,1);
assert(M.checklist(M.defaults).every(x=>typeof x.complete==='boolean'));
let configs=0;for(const construction of ['u','four','circular'])for(const top of ['open','duffle','flat','spout'])for(const bottom of ['flat','spout','conical'])for(const loops of ['standard','cross','tunnel'])for(const baffles of [false,true])for(const ventilated of [false,true]){
 const s={...M.defaults,construction,top,bottom,loops,baffles,ventilated};assert.equal(M.validate(s).length,0);
 for(const v of ['assembly','front','side','top','bottom','all','loop','seam','baffle','liner']){const svg=M.svg(s,v);assert(!/NaN|Infinity|undefined/.test(svg));assert(svg.startsWith('<svg'));if(v!=='assembly')assert(M.dxf(s,v).endsWith('EOF\n'));}configs++;
}
const qa=process.env.FIBC_QA_DIR||require('node:path').join(process.cwd(),'tmp','qa');fs.mkdirSync(qa,{recursive:true});
for(const [name,s]of [['standard',M.defaults],['offset',shifted],['baffle',{...M.defaults,baffles:true,liner:'Form-fit',showPrint:true}],['tunnel',{...M.defaults,loops:'tunnel'}]])for(const view of ['front','side','top','bottom','all','loop','seam','baffle','liner']){fs.writeFileSync(qa+'/v2-check-'+name+'-'+view+'.dxf',M.dxf(s,view));fs.writeFileSync(qa+'/v2-check-'+name+'-'+view+'.svg',M.svg(s,view));}
console.log('V2 checks passed: '+configs+' configurations × 10 views, offsets, bounds, CSV round-trip, migration and diff.');
/* Event-level checks without browser emulation or a preview server. */
const nodes={};function node(id){return nodes[id]??={innerHTML:'',textContent:'',value:'1',style:{},events:{},dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(k,f){this.events[k]=f},setAttribute(){},click(){},querySelector:()=>null,showModal(){this.open=true},close(){this.open=false}};}
const memory={};ctx.document={querySelector:node,querySelectorAll:()=>[],getElementById:id=>node('#'+id),createElement:()=>node('download')};ctx.localStorage={getItem:k=>memory[k]??null,setItem:(k,v)=>memory[k]=v};ctx.setTimeout=()=>0;ctx.clearTimeout=()=>{};ctx.confirm=()=>true;ctx.crypto=require('node:crypto').webcrypto;ctx.Blob=Blob;ctx.URL=URL;ctx.window={print(){ctx.printed=true;}};
vm.runInContext(fs.readFileSync(prefix+'app.js','utf8'),ctx);
assert(nodes['#document'].innerHTML.includes('CUSTOMER APPROVAL SHEET'));
nodes['#specForm'].events.change({target:{tagName:'SELECT',name:'unit',value:'cm'}});assert.equal(JSON.parse(memory['fibc-current-v1']).length,900);
nodes['#specForm'].events.input({target:{tagName:'INPUT',type:'number',name:'length',value:'95'}});assert.equal(JSON.parse(memory['fibc-current-v1']).length,950);
nodes['#save'].events.click();assert.equal(JSON.parse(memory['fibc-revisions-v1'])[0].spec.length,950);
nodes['#print'].events.click();assert(ctx.printed);assert(nodes['#printArea'].innerHTML.includes('print-landscape'));assert(nodes['#printArea'].innerHTML.includes('CONSTRUCTION DETAILS'));
nodes['#specForm'].events.input({target:{tagName:'INPUT',type:'number',name:'ventBands',value:'1000000'}});assert(nodes['#exportDxf'].disabled);assert(nodes['#document'].innerHTML.includes('Invalid dimensions'));
console.log('App event checks passed: conversion, snapshot, print sections and export blocking.');
