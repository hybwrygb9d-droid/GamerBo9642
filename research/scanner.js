'use strict';
const scanDialog=document.createElement('dialog');
scanDialog.id='scan-dialog';scanDialog.style.width='min(850px,95vw)';scanDialog.style.maxHeight='90vh';document.body.append(scanDialog);
let scanSession=null;
const sq=selector=>scanDialog.querySelector(selector);
const isCurrent=s=>scanSession===s && scanDialog.open && !s.closed;
const safeSource=UQTCatalog.https;
function scanMessage(s,text){if(isCurrent(s))sq('#scan-message').textContent=text;}
function persistScan(s){const ok=save();if(isCurrent(s)){sq('#scan-save').textContent=ok?'Changes saved on this browser.':'Saving failed. Close the scanner and export a backup before leaving.';sq('#scan-save').style.color=ok?'':'#ffb5b5';}return ok;}
function syncControls(s){if(!isCurrent(s))return;
  sq('#share-screen').disabled=s.sharingPending;
  sq('#scan-frame').disabled=!s.stream || !!s.job;
  sq('#auto-scan').disabled=!s.stream;
  sq('#auto-scan').textContent=s.automatic?'Pause automatic scan':'Scan while I scroll';
  sq('#cancel-ocr').disabled=!s.job;
  sq('#scan-file').disabled=!!s.job;
  sq('#research-game').disabled=!!s.research;
  sq('#cancel-research').hidden=!s.research;
  sq('#capture-state').textContent=s.stream?(s.automatic?'Sharing active · scanning while you scroll':'Sharing active · ready to scan'):'Screen sharing is off';
}
function disposeWorker(s){const task=s.worker;s.worker=null;task?.then(w=>w.terminate()).catch(()=>{});}
function cancelOCR(s,notify=true){if(s.job){clearTimeout(s.job.timer);s.job.cancel();s.job=null;disposeWorker(s);}if(isCurrent(s))sq('#ocr-progress').hidden=true;if(notify)scanMessage(s,'Scan cancelled. Confirmed items are unchanged.');syncControls(s);}
function pauseAuto(s){s.automatic=false;clearTimeout(s.timer);s.timer=null;syncControls(s);}
function stopCapture(s=scanSession,notify=true){if(!s)return;s.captureGeneration++;pauseAuto(s);cancelOCR(s,false);const old=s.stream;s.stream=null;old?.getTracks().forEach(t=>t.stop());if(isCurrent(s)){sq('video').srcObject=null;sq('video').hidden=true;if(notify)scanMessage(s,'Sharing stopped. Review the matches below.');syncControls(s);}}
function closeScan(){const s=scanSession;if(!s)return;s.closed=true;stopCapture(s,false);s.controller.abort();s.research?.controller.abort();disposeWorker(s);scanDialog.close();scanSession=null;render();}
function launchGame(g){const url=robloxURL(g.url);if(!url){scanMessage(scanSession,'Add the Roblox game link in Game setup first.');return;}const id=new URL(url).pathname.match(/\/games\/(\d+)/)[1];const a=document.createElement('a');a.href='roblox://placeId='+id;a.click();}
async function openScanner(){
  if(scanSession)closeScan();const owner=game();if(!owner)return;
  owner.scan=UQTCatalog.normalize(owner.scan);
  const s={owner,controller:new AbortController(),closed:false,stream:null,worker:null,job:null,research:null,automatic:false,timer:null,captureGeneration:0,frames:0,sharingPending:false};scanSession=s;
  scanDialog.innerHTML=`<h2>Scan ${esc(owner.name)}</h2><p class="muted">1. Load the catalog · 2. Share your game window · 3. Scroll your inventory · 4. Confirm matches</p>
  <div class="row"><button id="launch-game">Open Roblox game</button><button id="refresh-catalog">Refresh catalog</button><button id="close-scan" class="primary">Done · save & close</button></div>
  <p id="scan-message" role="status" aria-live="polite" style="margin:12px 0">Loading your catalog…</p><p id="scan-save" role="status" class="muted"></p>
  <details><summary>Live research & sources</summary><p>The Skibi Defense catalog works without installing anything. To research live pages, run the optional helper on this computer. It collects references, not complete game knowledge.</p>
  <a class="link" href="./uqt-scanner.zip" download>Download research helper</a><p>Extract it. Windows: with Python 3 installed, run Start-UQT-Windows.cmd. Mac: run <code>python3 research/helper.py</code> in its folder. Keep the terminal open.</p>
  <label>Source pages (optional; one HTTPS URL per line)<textarea id="source-urls" rows="2" placeholder="A wiki item list or guide"></textarea></label>
  <div class="row"><button id="research-game">Research live pages</button><button id="cancel-research" hidden>Cancel research</button></div><small>Research may take up to two minutes. Browser permission to connect to the local helper may be required. Its local tracker address has separate saves.</small></details>
  <div id="research-info" class="muted"></div>
  <div class="panel" style="margin-top:14px"><strong id="capture-state">Screen sharing is off</strong><div class="row"><button id="share-screen">Share game window</button><button id="scan-frame" disabled>Scan current screen</button><button id="auto-scan" disabled>Scan while I scroll</button><button id="stop-screen">Stop sharing</button></div>
  <p class="muted">Choose the Roblox window, then open your inventory. Automatic scanning reads one frame at a time, with a three-second pause between scans. Stop when you have covered your inventory.</p>
  <video id="scan-video" hidden muted autoplay playsinline style="width:100%;max-height:220px;background:#111"></video>
  <div class="row"><label class="link">Scan screenshot<input type="file" id="scan-file" accept="image/png,image/jpeg,image/webp" hidden></label><button id="cancel-ocr" disabled>Cancel scan</button></div>
  <p class="muted">Images stay on your computer. The first scan downloads the text recognition engine.</p><progress id="ocr-progress" hidden max="1" style="width:100%"></progress>
  <label>Minimum OCR quality: <span id="confidence-value">${owner.scan.threshold}</span><input id="scan-confidence" type="range" min="0" max="100" value="${owner.scan.threshold}"></label><small>Quality is measured for the whole image, not the probability that an item is owned. Short names need manual review.</small></div>
  <div class="two"><label>Find an item<input id="item-search" placeholder="Filter catalog"></label><label>Show<select id="result-filter"><option value="all">All items</option><option value="seen">Names detected</option><option value="owned">Owned</option><option value="missing">Missing</option><option value="unknown">Unknown</option></select></label></div>
  <div id="scan-results" style="max-height:340px;overflow:auto;margin-top:12px"></div>`;
  sq('#close-scan').onclick=closeScan;sq('#launch-game').onclick=()=>launchGame(owner);
  sq('#refresh-catalog').onclick=()=>refreshCatalog(s);sq('#research-game').onclick=()=>researchGame(s);
  sq('#cancel-research').onclick=()=>s.research?.controller.abort();
  sq('#share-screen').onclick=()=>shareScreen(s);sq('#scan-frame').onclick=()=>scanFrame(s);
  sq('#auto-scan').onclick=()=>{if(s.automatic){pauseAuto(s);scanMessage(s,'Automatic scanning paused.')}else{s.automatic=true;syncControls(s);autoTick(s);}};
  sq('#stop-screen').onclick=()=>stopCapture(s);sq('#cancel-ocr').onclick=()=>{pauseAuto(s);cancelOCR(s)};
  sq('#scan-file').onchange=e=>scanFile(s,e);sq('#item-search').oninput=()=>drawResults(s);sq('#result-filter').onchange=()=>drawResults(s);
  sq('#scan-confidence').oninput=e=>{owner.scan.threshold=Number(e.target.value);sq('#confidence-value').textContent=e.target.value;persistScan(s);drawResults(s)};
  scanDialog.oncancel=e=>{e.preventDefault();closeScan()};scanDialog.showModal();
  if(/skibi.*defen[cs]e/i.test(owner.name)&&!owner.url){owner.url='https://www.roblox.com/games/14279693118/Skibi-Defense';persistScan(s)}
  drawResults(s);syncControls(s);
  if(owner.autoLaunch!==false)launchGame(owner);
  await refreshCatalog(s);
}
async function refreshCatalog(s){
  if(!isCurrent(s))return;if(!/skibi.*defen[cs]e/i.test(s.owner.name)){scanMessage(s,'No built-in catalog for this game yet. Use Live research & sources to collect candidates.');return;}
  if(s.catalogLoading)return;s.catalogLoading=true;sq('#refresh-catalog').disabled=true;
  try{const r=await fetch('./research/skibi-defense.json',{cache:'no-store',signal:s.controller.signal});if(!r.ok)throw Error();const incoming=await r.json();if(!isCurrent(s))return;
    if(!Number.isFinite(Date.parse(s.owner.scan.checkedAt))||Date.parse(incoming.checkedAt)>=Date.parse(s.owner.scan.checkedAt)){s.owner.scan=UQTCatalog.merge(s.owner.scan,incoming);persistScan(s)}
    drawResults(s);scanMessage(s,'Catalog ready. Share the game window or scan a screenshot. Existing confirmations are kept.');
  }catch(e){if(isCurrent(s))scanMessage(s,'Could not refresh the catalog. Your saved catalog is still available.');}
  finally{s.catalogLoading=false;if(isCurrent(s))sq('#refresh-catalog').disabled=false;}
}
async function researchGame(s){
  if(!isCurrent(s)||s.research)return;const controller=new AbortController(),task={controller};s.research=task;syncControls(s);
  const timer=setTimeout(()=>controller.abort(),120000);
  scanMessage(s,'Reading live reference pages… You can cancel research without losing your catalog.');
  try{const sources=sq('#source-urls').value.split('\n').map(v=>v.trim()).filter(Boolean);if(sources.length>6||sources.some(url=>!safeSource(url)))throw Error('Use at most six valid HTTPS source links.');
    const r=await fetch('http://127.0.0.1:8766/research',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:s.owner.name,sources}),signal:controller.signal});
    const data=await r.json();if(!r.ok)throw Error(data.error||'The helper could not read these sources.');if(!isCurrent(s)||s.research!==task)return;
    if(data.items?.length){s.owner.scan=UQTCatalog.merge(s.owner.scan,data);persistScan(s);drawResults(s)}
    scanMessage(s,`${data.items?.length||0} reference candidates found. ${(data.warnings||[]).join(' ')}`);
  }catch(e){if(isCurrent(s))scanMessage(s,e.name==='AbortError'?'Research cancelled or timed out. Your catalog is unchanged.':e instanceof TypeError?'Cannot reach the helper. Start it, allow local-network access if prompted, and retry.':e.message);}
  finally{clearTimeout(timer);if(s.research===task)s.research=null;syncControls(s);}
}
function drawResults(s){if(!isCurrent(s))return;const d=s.owner.scan,threshold=d.threshold,query=sq('#item-search').value.toLowerCase(),filter=sq('#result-filter').value;
  const seen=i=>Number.isFinite(i.confidence)&&i.confidence>=threshold;
  sq('#research-info').innerHTML=`<p>${d.items.length} catalog entries · ${d.items.filter(seen).length} detected · ${d.items.filter(i=>i.status==='owned').length} owned · ${d.items.filter(i=>i.status==='missing').length} missing</p><p>Reference checked: ${esc(d.checkedAt?new Date(d.checkedAt).toLocaleString():'not yet')}. ${d.lastScanAt?'Last image scan: '+esc(new Date(d.lastScanAt).toLocaleString()):''}</p>${d.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a>`).join(' · ')}<p>${esc(d.warnings.join(' '))}</p>`;
  const items=d.items.map((i,index)=>({i,index})).filter(({i})=>i.name.toLowerCase().includes(query)&&(filter==='all'||filter==='seen'&&seen(i)||i.status===filter)).sort((a,b)=>Number(seen(b.i))-Number(seen(a.i)));
  sq('#scan-results').innerHTML=items.map(({i,index})=>{const tracked=s.owner.goals.some(q=>q.catalogSource&&q.catalogSource===i.source||q.title.toLowerCase()===i.name.toLowerCase());return `<div class="panel"><div class="row"><strong>${esc(i.name)}</strong>${i.source?`<a href="${esc(i.source)}" target="_blank" rel="noopener noreferrer">Source ↗</a>`:''}</div><small>${seen(i)?`Name detected · image OCR ${Math.round(i.confidence)}/100 · confirm ownership`:Number.isFinite(i.confidence)?'Detected below your quality threshold':'No screen evidence yet'}</small><div class="row"><label>Status for ${esc(i.name)}<select data-item-status="${index}">${['unknown','owned','missing'].map(value=>`<option ${i.status===value?'selected':''}>${value}</option>`).join('')}</select></label><button data-item-track="${index}" ${tracked?'disabled':''}>${tracked?'Already tracked':'Track as goal'}</button></div></div>`;}).join('')||'<p>No items match this filter.</p>';
  sq('#scan-results').onchange=e=>{const index=e.target.dataset.itemStatus;if(index===undefined)return;d.items[Number(index)].status=e.target.value;persistScan(s);drawResults(s)};
  sq('#scan-results').onclick=e=>{const b=e.target.closest('[data-item-track]');if(!b)return;const i=d.items[Number(b.dataset.itemTrack)];if(s.owner.goals.length>=1000){scanMessage(s,'Goal limit reached. Remove an old goal first.');return;}
    s.owner.goals.push({id:uid(),title:i.name,current:i.status==='owned'?1:0,target:1,unit:'owned',note:'Check obtainment requirements: '+i.source,pinned:true,catalogSource:i.source});persistScan(s);drawResults(s);scanMessage(s,i.name+' added to your goals. Update its target and progress in the tracker.');};
}
async function shareScreen(s){
  if(!isCurrent(s)||s.sharingPending)return;stopCapture(s,false);s.sharingPending=true;const generation=s.captureGeneration;syncControls(s);
  try{if(!navigator.mediaDevices?.getDisplayMedia)throw Error('Use desktop Chrome or Edge to share a window, or scan a screenshot.');
    const media=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
    if(!isCurrent(s)||s.captureGeneration!==generation){media.getTracks().forEach(t=>t.stop());return;}
    s.stream=media;const video=sq('video');video.hidden=false;video.srcObject=media;await video.play();
    if(!isCurrent(s)||s.captureGeneration!==generation)return;
    media.getVideoTracks()[0].addEventListener('ended',()=>{if(s.stream===media)stopCapture(s)},{once:true});
    scanMessage(s,'Sharing active. Open your inventory, then choose Scan while I scroll.');
  }catch(e){if(isCurrent(s)){stopCapture(s,false);scanMessage(s,e.name==='NotAllowedError'?'Screen sharing cancelled or denied. Try again or use a screenshot.':e.message);}}
  finally{s.sharingPending=false;syncControls(s);}
}
async function getWorker(s){
  if(!s.worker){
    const pending=Tesseract.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',logger:message=>{
      if(isCurrent(s)&&s.job){sq('#ocr-progress').value=Number(message.progress)||0;scanMessage(s,`${message.status} · ${Math.round((Number(message.progress)||0)*100)}%`);}
    }}).catch(e=>{if(s.worker===pending)s.worker=null;throw e;});
    s.worker=pending;
  }
  return s.worker;
}
async function ocr(s,image){
  if(!isCurrent(s)||s.job)return false;if(!s.owner.scan.items.length){scanMessage(s,'Load a catalog before scanning.');return false;}
  const generation=s.captureGeneration,job={};s.job=job;syncControls(s);sq('#ocr-progress').hidden=false;scanMessage(s,'Reading locally… the first scan downloads the recognition model.');
  const cancel=new Promise((_,reject)=>{job.cancel=()=>reject(new Error('Cancelled'));job.timer=setTimeout(()=>reject(new Error('Recognition timed out. Try a smaller or clearer screenshot.')),90000)});
  try{const {data}=await Promise.race([(async()=>{const worker=await getWorker(s);return worker.recognize(image)})(),cancel]);
    if(!isCurrent(s)||s.job!==job||generation!==s.captureGeneration)return false;
    const matches=UQTMatch.matchNames(data.text,s.owner.scan.items),now=new Date().toISOString();
    for(const item of s.owner.scan.items)if(matches.includes(item.name)){item.confidence=Math.max(item.confidence||0,Math.min(100,Math.max(0,Number(data.confidence)||0)));item.seenAt=now;}
    s.frames++;s.owner.scan.lastScanAt=now;persistScan(s);drawResults(s);
    scanMessage(s,`Scan ${s.frames}: ${matches.length} names matched. ${s.automatic?'Keep scrolling your inventory.':'Review their status below.'} A name alone does not prove ownership.`);return true;
  }catch(e){if(isCurrent(s)&&s.job===job){pauseAuto(s);disposeWorker(s);scanMessage(s,'Scan failed: '+e.message+' You can retry or use a screenshot.');}return false;}
  finally{clearTimeout(job.timer);if(s.job===job){s.job=null;if(isCurrent(s))sq('#ocr-progress').hidden=true;}syncControls(s);}
}
async function scanFrame(s){if(!isCurrent(s))return false;const video=sq('video');if(!s.stream||!video.videoWidth){scanMessage(s,'Share the game window and wait for its preview.');return false;}
  const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext('2d').drawImage(video,0,0);return ocr(s,canvas);
}
async function autoTick(s){if(!isCurrent(s)||!s.automatic||!s.stream)return;if(s.job){s.timer=setTimeout(()=>autoTick(s),1000);return;}
  const ok=await scanFrame(s);if(isCurrent(s)&&s.automatic&&s.stream){if(ok)s.timer=setTimeout(()=>autoTick(s),3000);else pauseAuto(s);}
}
async function scanFile(s,e){const file=e.target.files[0];e.target.value='';if(!file||!isCurrent(s))return;if(file.size>15e6){scanMessage(s,'Use a screenshot smaller than 15 MB.');return;}
  pauseAuto(s);const generation=s.captureGeneration,url=URL.createObjectURL(file);
  try{const img=new Image();img.src=url;await img.decode();if(!isCurrent(s)||s.captureGeneration!==generation)return;if(img.width*img.height>16000000)throw Error('Use an image under 16 megapixels.');await ocr(s,img);}
  catch(e){scanMessage(s,'Cannot read the image. Use PNG, JPEG or WebP under 16 megapixels.');}finally{URL.revokeObjectURL(url);}
}
document.addEventListener('keydown',e=>{if(e.key==='F3'&&scanDialog.open){e.preventDefault();e.stopImmediatePropagation();closeScan();closeTracker();}},true);
window.addEventListener('pagehide',()=>{if(scanSession)closeScan()});
