import {createServer,IncomingMessage,ServerResponse} from 'node:http';
import {readFileSync,existsSync,mkdirSync,statSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {Store} from './store.js';
import {Engine} from './engine.js';
import type {Config} from './types.js';
import {createAccessGuard} from './auth.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
mkdirSync(`${root}/data`,{recursive:true,mode:0o700});
const config:Config=JSON.parse(readFileSync(process.env.ASTRA_CONFIG||`${root}/data/config.json`,'utf8'));
const authorize=createAccessGuard(config);
const store=new Store(`${root}/data/control.sqlite`),engine=new Engine(config,store,root);
const csrf=randomBytes(32).toString('hex');
const peers=new Set<ServerResponse>();
const publicOrigin=config.publicOrigin;
function json(res:ServerResponse,status:number,data:any){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function text(value:any,name:string,max=12000):string{if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error(`Invalid ${name}`);return value.trim();}
function requestId(x:any){const id=text(x,'request ID',100);if(!/^[a-zA-Z0-9-]{8,100}$/.test(id))throw new Error('Invalid request ID');return id;}
function equal(a:string,b:string){return a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
async function body(req:IncomingMessage){let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>50000)throw new Error('Request too large');}return JSON.parse(data||'{}');}
let notifyTimer:NodeJS.Timeout|undefined;
engine.on('change',()=>{if(notifyTimer)return;notifyTimer=setTimeout(()=>{notifyTimer=undefined;for(const res of peers)res.write('event: change\ndata: {}\n\n');},300);});
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 try{
  let identity;try{identity=await authorize(req);}catch(e){return json(res,403,{error:(e as Error).message});}
  const path=new URL(req.url||'/','http://localhost').pathname;
  if(req.method!=='GET'&&req.method!=='HEAD'){
   const origin=req.headers.origin;if(origin!==`http://localhost:${config.port}`&&origin!==`http://127.0.0.1:${config.port}`&&(!publicOrigin||origin!==publicOrigin))return json(res,403,{error:'Invalid origin'});
   const token=req.headers['x-astra-control'];if(typeof token!=='string'||!equal(token,csrf))return json(res,403,{error:'Reload the dashboard before submitting this action'});
  }
  if(path==='/api/state'&&req.method==='GET')return json(res,200,{...engine.state(),csrf,version:'0.1.0'});
  if(path==='/healthz')return json(res,200,{ok:true,version:'0.1.0'});
  if(path==='/api/events'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write('event: connected\ndata: {}\n\n');peers.add(res);const timer=setInterval(()=>res.write(': heartbeat\n\n'),20000);const expiry=identity.expiresAt?setTimeout(()=>res.end(),Math.min(2147483647,Math.max(0,identity.expiresAt-Date.now()))):undefined;res.on('close',()=>{peers.delete(res);clearInterval(timer);if(expiry)clearTimeout(expiry);});return;}
  if(path==='/api/detail'&&req.method==='GET'){const key=new URL(req.url||'','http://localhost').searchParams.get('key');return json(res,200,await engine.detail(text(key,'task')));}
  if(req.method==='POST'){
   const b=await body(req);
   if(path==='/api/watch'){if(typeof b.value!=='boolean')throw new Error('Invalid watch value');engine.watch(text(b.key,'task'),b.value);return json(res,200,{ok:true});}
   if(path==='/api/actions/resolve'){const a=store.actions().find(a=>a.id===b.id);if(!a||(a.kind==='approval'&&a.status!=='expired'))throw new Error('Use the approval controls to answer this request');store.resolve(a.id);engine.emit('change');return json(res,200,{ok:true});}
   if(path==='/api/approval')return json(res,200,engine.approval(text(b.id,'action'),b));
   if(path==='/api/send')return json(res,200,await engine.send(requestId(b.requestId),text(b.key,'task'),text(b.prompt,'message')));
   if(path==='/api/pause')return json(res,200,await engine.pause(requestId(b.requestId),text(b.key,'task')));
   if(path==='/api/create')return json(res,200,await engine.create(requestId(b.requestId),text(b.hostId,'machine'),text(b.cwd,'repository'),text(b.title,'title',160),text(b.prompt,'prompt')));
   if(path==='/api/chat')return json(res,200,await engine.chat(text(b.message,'message',5000)));
   if(path==='/api/refresh'){await engine.refresh();return json(res,200,{ok:true});}
  }
  if(path.startsWith('/api/'))return json(res,404,{error:'Not found'});
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed'});
  const files:Record<string,string>={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg'};const file=files[path];if(!file)return json(res,404,{error:'Not found'});
  const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':types[extname(file)]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?'':readFileSync(`${root}/public/${file}`));
 }catch(e){json(res,400,{error:(e as Error).message});}
});
server.listen(config.port,'127.0.0.1',()=>{console.log(`Astra Control listening on 127.0.0.1:${config.port}`);engine.start();});
function stop(){engine.close();for(const p of peers)p.end();server.close(()=>{store.close();process.exit(0);});setTimeout(()=>process.exit(0),3000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
