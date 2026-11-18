const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const Catalog=require('../research/catalog.js');const Match=require('../research/matching.js');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
test('refresh keeps reviewed ownership when a unit is renamed, without inventing ownership for new entries',()=>{
 const old={threshold:75,items:[{name:'Old name',source:'https://example.com/unit',status:'owned',confidence:90},{name:'Missing unit',source:'https://example.com/missing',status:'missing'}]};
 const next=Catalog.merge(old,{items:[{name:'New name',source:'https://example.com/unit'},{name:'New unit',source:'https://example.com/new',status:'owned',confidence:100}]});
 assert.equal(next.items[0].status,'owned');assert.equal(next.items[0].confidence,90);
 assert.equal(next.items[1].status,'unknown');assert.equal(next.items[1].confidence,undefined);
 assert.equal(next.items[2].status,'missing');assert.equal(next.threshold,75);
});
test('malformed imported scan data cannot create unsafe source links or false quality scores',()=>{
 const d=Catalog.normalize({items:[null,{name:'Unit',source:'javascript:alert(1)',status:'bogus',confidence:'100'},{name:42}],sources:[null,{url:'data:text/html,hello'}],warnings:{},threshold:Infinity});
 assert.equal(d.items.length,1);assert.equal(d.items[0].source,'');assert.equal(d.items[0].status,'unknown');assert.equal(d.items[0].confidence,undefined);assert.equal(d.threshold,60);
});
test('matching uses name boundaries and prefers longer unit names',()=>{
 const items=[{name:'Camera'},{name:'Upgraded Camera'},{name:'TV-Girl'},{name:'N'}];
 assert.deepEqual(Match.matchNames('UPGRADED CAMERA\nTV Girl',items),['Upgraded Camera','TV-Girl']);
 assert.deepEqual(Match.matchNames('CameraGuy N',items),[]);
});
function harness(){
 const elements=new Map();const element=key=>{if(!elements.has(key))elements.set(key,{value:'',hidden:false,textContent:'',style:{},disabled:false,play:async()=>{},srcObject:null});return elements.get(key)};
 const dialog={open:true,style:{},querySelector:element,close(){this.open=false}};
 let saves=0;const context={console,URL,AbortController,Uint8Array,Promise,Number,Date,Error,TypeError,setTimeout,clearTimeout,document:{createElement:()=>dialog,body:{append(){}},addEventListener(){}},window:{addEventListener(){}},navigator:{mediaDevices:{}},UQTCatalog:Catalog,UQTMatch:Match,save:()=>{saves++;return true},render(){},esc:String,uid:()=> 'id',robloxURL:()=>null,fetch:async()=>{throw Error('not configured')}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../research/scanner.js'),'utf8'),context);
 const session={owner:{name:'Skibi Defense',goals:[],scan:Catalog.normalize({items:[{name:'Camera Fighter',status:'unknown'}]})},controller:new AbortController(),closed:false,stream:null,worker:null,job:null,research:null,automatic:false,timer:null,captureGeneration:0,frames:0,sharingPending:false};context.fixture=session;vm.runInContext('scanSession=fixture',context);
 return {context,session,dialog,elements,element,get saves(){return saves},run:code=>vm.runInContext(code,context)};
}
test('late catalog response after closing cannot overwrite the next game',async()=>{
 const h=harness(),request=deferred();h.context.fetch=()=>request.promise;
 const loading=h.run('refreshCatalog(fixture)');h.run('closeScan()');
 request.resolve({ok:true,json:async()=>({checkedAt:new Date().toISOString(),items:[{name:'Unexpected'}]})});await loading;
 assert.equal(h.session.owner.scan.items[0].name,'Camera Fighter');assert.equal(h.saves,0);
});
test('closing while the screen picker is open stops a late stream immediately',async()=>{
 const h=harness(),picker=deferred();let stopped=0;h.context.navigator.mediaDevices.getDisplayMedia=()=>picker.promise;
 const sharing=h.run('shareScreen(fixture)');h.run('closeScan()');
 picker.resolve({getTracks:()=>[{stop(){stopped++}}]});await sharing;
 assert.equal(stopped,1);assert.equal(h.session.stream,null);
});
test('cancelled OCR cannot apply a delayed result or keep automatic scanning alive',async()=>{
 const h=harness(),recognition=deferred();let terminated=0;
 h.context.Tesseract={createWorker:async()=>({recognize:()=>recognition.promise,terminate(){terminated++}})};
 h.session.automatic=true;const processing=h.run('ocr(fixture,{})');await Promise.resolve();await Promise.resolve();
 h.run('stopCapture(fixture)');recognition.resolve({data:{text:'Camera Fighter',confidence:99}});await processing;
 assert.equal(h.session.owner.scan.items[0].confidence,undefined);assert.equal(h.session.automatic,false);assert.equal(h.session.job,null);assert.equal(h.saves,0);assert.ok(terminated>=1);
});
test('live research cancelled by closing cannot write another session',async()=>{
 const h=harness(),request=deferred();h.context.fetch=()=>request.promise;
 const researching=h.run('researchGame(fixture)');h.run('closeScan()');
 request.resolve({ok:true,json:async()=>({items:[{name:'Other game unit'}]})});await researching;
 assert.equal(h.saves,0);assert.equal(h.session.owner.scan.items[0].name,'Camera Fighter');
});
test('automatic capture never starts overlapping OCR jobs and stops cleanly',async()=>{
 const h=harness(),recognition=deferred();let calls=0;
 h.context.document.createElement=tag=>tag==='canvas'?{getContext:()=>({drawImage(){}})}:h.dialog;
 h.element('video').videoWidth=800;h.element('video').videoHeight=600;
 h.session.stream={getTracks:()=>[{stop(){}}]};h.session.automatic=true;
 h.context.Tesseract={createWorker:async()=>({recognize(){calls++;return recognition.promise},terminate(){}})};
 const first=h.run('autoTick(fixture)');await Promise.resolve();await Promise.resolve();await Promise.resolve();
 await h.run('autoTick(fixture)');assert.equal(calls,1);
 h.run('stopCapture(fixture)');recognition.resolve({data:{text:'Camera Fighter',confidence:99}});await first;
 assert.equal(h.session.timer,null);assert.equal(h.session.stream,null);assert.equal(h.session.automatic,false);
});
