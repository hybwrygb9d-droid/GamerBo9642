"""UQT research helper. Python 3.9+, no dependencies. Runs only on loopback."""
import json, re, socket, ipaddress, time, urllib.request, urllib.parse, urllib.error
from html.parser import HTMLParser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from datetime import datetime, timezone
import threading, webbrowser
ROOT=Path(__file__).resolve().parent.parent
ORIGINS={'https://hybwrygb9d-droid.github.io','http://127.0.0.1:8766','http://localhost:8766'}
LOCK=threading.Lock()
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args): return None
OPENER=urllib.request.build_opener(NoRedirect)
def safe_url(url):
    u=urllib.parse.urlsplit(url)
    if u.scheme!='https' or not u.hostname or u.username or u.password or u.port not in (None,443): raise ValueError('Only public HTTPS sources are supported')
    for a in socket.getaddrinfo(u.hostname,443,type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(a[4][0]).is_global: raise ValueError('Private addresses are not allowed')
    return url

def fetch(url):
    for _ in range(4):
        safe_url(url)
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'UQT/0.2 (user-requested game reference research)','Accept':'text/html,application/json'})
            with OPENER.open(req,timeout=12) as r:
                raw=r.read(2000001)
                if len(raw)>2000000: raise ValueError('Source too large')
                return raw.decode('utf-8','replace'),url
        except urllib.error.HTTPError as e:
            if e.code in (301,302,303,307,308): url=urllib.parse.urljoin(url,e.headers['Location']);continue
            raise
    raise ValueError('Too many redirects')
class Page(HTMLParser):
    def __init__(self):
        super().__init__();self.links=[];self.link=None;self.text=[];self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'): self.skip+=1
        if tag=='a': self.link=[dict(attrs).get('href',''),'']
    def handle_endtag(self,tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
        if tag=='a' and self.link: self.links.append(tuple(self.link));self.link=None
    def handle_data(self,data):
        if not self.skip:
            self.text.append(data)
            if self.link:self.link[1]+=data

def discover(name):
    html,base=fetch('https://www.google.com/search?'+urllib.parse.urlencode({'q':name+' Roblox wiki items towers inventory'}))
    p=Page();p.feed(html);out=[]
    for href,_ in p.links:
        if href.startswith('/url?'): href=urllib.parse.parse_qs(urllib.parse.urlsplit(href).query).get('q',[''])[0]
        host=urllib.parse.urlsplit(href).hostname or ''
        if (host.endswith('.wiki.gg') or host.endswith('.fandom.com')) and href.startswith('https://') and href not in out:out.append(href)
    return out[:5]

def research(data):
    name=str(data.get('name','')).strip()[:100]
    if not name:raise ValueError('Game name required')
    seeds=data.get('sources',[])
    if not isinstance(seeds,list) or len(seeds)>6 or not all(isinstance(s,str) for s in seeds):raise ValueError('Use at most six source URLs')
    warnings=[]
    if not seeds and re.search(r'skibi.*defen[cs]e',name,re.I): seeds=['https://rowikis.com/skibi-defense/towers/']
    if not seeds:
        try:seeds=discover(name)
        except Exception:warnings.append('Automatic source search failed. Paste a game wiki or item-list URL and retry.')
    if not seeds: return {'items':[],'sources':[],'warnings':warnings+['No accessible game sources found.'], 'checkedAt':datetime.now(timezone.utc).isoformat()}
    queue=list(seeds);seen=set();sources=[];items={};deadline=time.monotonic()+90
    while queue and len(seen)<10 and time.monotonic()<deadline:
        url=queue.pop(0)
        if url in seen:continue
        seen.add(url)
        try:
            html,final=fetch(url);p=Page();p.feed(html)
            if len(' '.join(p.text))<500:raise ValueError('Page has too little readable text')
            sources.append({'url':final,'title':urllib.parse.unquote(urllib.parse.urlsplit(final).path.split('/')[-1]).replace('_',' ') or name})
            for href,label in p.links:
                label=' '.join(label.split());dest=urllib.parse.urljoin(final,href);u=urllib.parse.urlsplit(dest)
                if u.hostname!=urllib.parse.urlsplit(final).hostname:continue
                if u.hostname=='rowikis.com':
                    if re.fullmatch(r'/skibi-defense/towers/[^/]+/',u.path) and 1<=len(label)<=65 and label!=',' and not label.startswith('All '): items.setdefault(dest,{'name':label,'source':dest})
                    continue
                if '/wiki/' not in u.path:continue
                tail=u.path.split('/wiki/',1)[1]
                if ':' in tail or '#' in href or not 3<=len(label)<=65:continue
                if re.search(r'^(sign in|register|edit|history|view|explore|home|wiki|community|main page|all pages|discussion|read more|navigation)',label,re.I):continue
                if re.search(r'(items|towers|weapons|units|equipment|inventory|characters|resources|quests)',label,re.I) and dest not in seen:queue.append(dest)
                items.setdefault(label.casefold(),{'name':label,'source':dest})
        except Exception as e:warnings.append('Could not read '+url+' ('+type(e).__name__+').')
    return {'items':list(items.values())[:500],'sources':sources,'warnings':warnings+['These are page-link candidates, not a verified complete item catalogue. Review before scanning.'], 'checkedAt':datetime.now(timezone.utc).isoformat()}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def allowed(self):return self.headers.get('Host') in ('127.0.0.1:8766','localhost:8766') and self.headers.get('Origin','http://127.0.0.1:8766') in ORIGINS
    def end_headers(self):
        origin=self.headers.get('Origin')
        if origin in ORIGINS:self.send_header('Access-Control-Allow-Origin',origin)
        self.send_header('Vary','Origin');super().end_headers()
    def do_OPTIONS(self):
        if not self.allowed():self.send_error(403);return
        self.send_response(204);self.send_header('Access-Control-Allow-Methods','POST, GET, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type');self.send_header('Access-Control-Allow-Private-Network','true');self.end_headers()
    def do_GET(self):
        if not self.allowed():self.send_error(403);return
        if self.path=='/health':self.respond({'ok':True});return
        super().do_GET()
    def respond(self,data,code=200):
        raw=json.dumps(data).encode();self.send_response(code);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
    def do_POST(self):
        if not self.allowed() or self.path!='/research' or self.headers.get('Content-Type')!='application/json':self.send_error(403);return
        if not LOCK.acquire(blocking=False):self.respond({'error':'Research already running. Try again after it finishes.'},429);return
        try:
            n=int(self.headers.get('Content-Length','0'))
            if not 0<n<=10000:raise ValueError('Invalid request size')
            self.respond(research(json.loads(self.rfile.read(n))))
        except Exception as e:self.respond({'error':str(e)},400)
        finally:LOCK.release()
if __name__=='__main__':
    print('UQT helper: http://127.0.0.1:8766 — leave this window open. Ctrl+C stops it.')
    server=ThreadingHTTPServer(('127.0.0.1',8766),Handler)
    webbrowser.open('http://127.0.0.1:8766')
    try:server.serve_forever()
    except KeyboardInterrupt:server.server_close()
