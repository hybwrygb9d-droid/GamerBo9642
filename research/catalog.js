(function (root) {
  const https = value => { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } };
  const key = item => https(item.source) || item.name.toLowerCase();
  function cleanItems(items) {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter(i => i && typeof i.name === 'string' && i.name.trim().length > 0 && i.name.length <= 160).slice(0,1000).map(i => ({
      name: i.name.trim(), source: https(i.source), status: ['owned','missing'].includes(i.status) ? i.status : 'unknown',
      ...(Number.isFinite(i.confidence) && i.confidence >= 0 && i.confidence <= 100 ? {confidence:i.confidence} : {}),
      ...(typeof i.seenAt === 'string' ? {seenAt:i.seenAt} : {})
    })).filter(i => { const k=key(i); if(seen.has(k))return false; seen.add(k); return true; });
  }
  function normalize(data) {
    const d = data && typeof data === 'object' ? data : {};
    return {items:cleanItems(d.items), sources:(Array.isArray(d.sources)?d.sources:[]).filter(s=>s && https(s.url)).slice(0,10).map(s=>({url:https(s.url),title:String(s.title||s.url).slice(0,200)})),
      checkedAt: typeof d.checkedAt === 'string' ? d.checkedAt : '', warnings:(Array.isArray(d.warnings)?d.warnings:[]).slice(0,20).map(s=>String(s).slice(0,500)),
      threshold:Number.isFinite(d.threshold)?Math.min(100,Math.max(0,d.threshold)):60,
      lastScanAt:typeof d.lastScanAt==='string'?d.lastScanAt:''};
  }
  function merge(previous, incoming) {
    if(!incoming || !Array.isArray(incoming.items))throw new Error('Invalid catalog');
    const old=normalize(previous), fresh=normalize(incoming), byKey=new Map(old.items.map(i=>[key(i),i])), byName=new Map(old.items.map(i=>[i.name.toLowerCase(),i]));
    fresh.items=fresh.items.map(i=>{const prior=byKey.get(key(i)) || byName.get(i.name.toLowerCase());return prior ? {...prior,name:i.name,source:i.source || prior.source}:{name:i.name,source:i.source,status:'unknown'};});
    const keys=new Set(fresh.items.map(key));
    fresh.items.push(...old.items.filter(i=>!keys.has(key(i))));
    fresh.items=fresh.items.slice(0,1000);fresh.threshold=old.threshold;fresh.lastScanAt=old.lastScanAt;
    return fresh;
  }
  root.UQTCatalog={https,normalize,merge};
  if(typeof module!=='undefined')module.exports=root.UQTCatalog;
})(typeof window==='undefined'?globalThis:window);
