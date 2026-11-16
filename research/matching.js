(function(root){
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function matchNames(text,items){
 let hay=' '+norm(text)+' ';const found=[];
 for(const item of [...items].sort((a,b)=>norm(b.name).length-norm(a.name).length)){
  const needle=' '+norm(item.name)+' ';
  if(needle.trim().length<4)continue;
  if(hay.includes(needle)){found.push(item.name);hay=hay.split(needle).join(' '.repeat(needle.length));}
 }
 return found;
}
root.UQTMatch={norm,matchNames};if(typeof module!=='undefined')module.exports=root.UQTMatch;
})(typeof window==='undefined'?globalThis:window);
