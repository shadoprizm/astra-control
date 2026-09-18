import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';
import {Host} from './hosts.js';
import {Store} from './store.js';
import {taskKey,Config,Task} from './types.js';
import {coordinate} from './coordinator.js';

export class Engine extends EventEmitter {
 hosts:Host[]; timer?:NodeJS.Timeout; chatBusy=false; stopping=false;
 constructor(public config:Config,public store:Store,public root:string){super();this.hosts=config.hosts.map(c=>new Host(c,root));store.recover();for(const h of this.hosts){h.rpc.on('event',(e,g)=>this.event(h,e,g));h.rpc.on('disconnect',()=>{store.expireApprovals(h.config.id);this.emit('change');});}}
 host(id:string){const h=this.hosts.find(h=>h.config.id===id);if(!h)throw new Error('Unknown machine');return h;}
 task(key:string){const t=this.store.task(key);if(!t)throw new Error('Task not found');return t;}
 start(){void this.refresh();this.timer=setInterval(()=>void this.refresh(),12000);}
 async refresh(){await Promise.allSettled(this.hosts.map(h=>this.refreshHost(h)));this.emit('change');}
 async refreshHost(h:Host){if(h.polling||this.stopping)return;h.polling=true;try{const tasks=await h.snapshot();const missing=this.store.tasks().filter(t=>t.hostId===h.config.id&&t.watched&&!tasks.some(x=>x.id===t.id));for(const t of missing)tasks.push(...await h.snapshot(t.id));h.online=true;h.error='';h.lastSeen=Date.now();for(const t of tasks)this.ingest(t);}catch(e){h.online=false;h.error=(e as Error).message;}finally{h.polling=false;}}
 ingest(t:Task){const previous=this.store.task(t.key);this.store.upsert(t);if(previous?.watched && t.turnId && t.turnStatus && (previous.turnId!==t.turnId||previous.turnStatus!==t.turnStatus)){
 if(t.turnStatus==='completed')this.store.action('completion','Agent finished a turn',t.latest?.text?.slice(0,5000)||'Review the result and decide what comes next.',t.key,`completion:${t.key}:${t.turnId}`);
 if(t.turnStatus==='failed'||t.turnStatus==='interrupted')this.store.action('failure',t.turnStatus==='failed'?'Task needs attention':'Task paused',t.error||t.latest?.text?.slice(0,2000)||'Open the task to inspect its latest state.',t.key,`failure:${t.key}:${t.turnId}:${t.turnStatus}`);
 }}
 state(){return {tasks:this.store.tasks().sort((a,b)=>b.updatedAt-a.updatedAt),hosts:this.hosts.map(h=>({id:h.config.id,name:h.config.name,online:h.online,lastSeen:h.lastSeen,error:h.error,runtimeConnected:h.rpc.ready})),actions:this.store.actions(),commands:this.store.commands(),chat:this.store.chat(),chatBusy:this.chatBusy,now:Date.now()};}
 watch(key:string,value:boolean){const t=this.task(key);this.store.watch(key,value);if(value&&t.turnStatus==='completed')this.store.action('review','Review latest result',t.latest?.text?.slice(0,5000)||'This task has a completed turn. Review its outcome.',key,`watch:${key}:${t.turnId}`);this.emit('change');}
 async detail(key:string){const t=this.task(key),h=this.host(t.hostId);const tasks=await h.snapshot(t.id);if(!tasks[0])throw new Error('Task is no longer available on its machine');this.ingest(tasks[0]);const git=await h.git(t.id);return {task:this.task(key),messages:tasks[0].messages,git};}
 async command(id:string,key:string,kind:string,body:any,run:()=>Promise<any>){const prior=this.store.command(id);if(prior){if(prior.task_key!==key||prior.kind!==kind||prior.body!==JSON.stringify(body))throw new Error('Request ID was reused with a different action');return {status:prior.status,result:prior.result?JSON.parse(prior.result):null};}
 this.store.beginCommand(id,key,kind,body);try{const result=await run();this.store.finishCommand(id,'accepted',result);this.emit('change');return {status:'accepted',result};}catch(e){const text=(e as Error).message;const status=/timed out|connection closed/i.test(text)?'uncertain':'failed';this.store.finishCommand(id,status,{error:text});this.store.action('delivery','Instruction needs attention',text,key||null,`delivery:${id}`);this.emit('change');throw e;}}
 async send(id:string,key:string,prompt:string){const t=this.task(key),h=this.host(t.hostId);return this.command(id,key,'message',{prompt},async()=>{
 const current=(await h.snapshot(t.id))[0];if(!current)throw new Error('Task not found on its machine');
 if(!t.managed){if(current.owned)throw new Error('This task is controlled by the Codex desktop app. Open it in Codex, or start a dashboard task in the same repo. The message was not sent.');await h.rpc.call('thread/resume',{threadId:t.id});this.store.manage(key);}
 else {await h.rpc.call('thread/resume',{threadId:t.id});}
 const thread=await h.rpc.call('thread/read',{threadId:t.id,includeTurns:true});
 const active=thread.thread?.turns?.findLast((v:any)=>v.status==='inProgress');
 if(active)return h.rpc.call('turn/steer',{threadId:t.id,expectedTurnId:active.id,input:[{type:'text',text:prompt}]});
 return h.rpc.call('turn/start',{threadId:t.id,input:[{type:'text',text:prompt}]});
 });}
 async create(id:string,hostId:string,cwd:string,title:string,prompt:string){const h=this.host(hostId);const allowed=this.store.tasks().some(t=>t.hostId===hostId&&t.cwd===cwd);if(!allowed)throw new Error('Choose a repository already observed on this machine');return this.command(id,'','create',{hostId,cwd,title,prompt},async()=>{
 const r=await h.rpc.call('thread/start',{cwd,approvalPolicy:'on-request',sandbox:'workspace-write'});
 const tid=r.thread.id,key=taskKey(hostId,tid);this.store.upsert({key,id:tid,hostId,title,cwd,observedAt:Date.now(),updatedAt:Date.now(),status:'idle',owned:true,messages:[]});this.store.manage(key);
 await h.rpc.call('thread/name/set',{threadId:tid,name:title});
 const turn=await h.rpc.call('turn/start',{threadId:tid,input:[{type:'text',text:prompt}]});this.emit('change');return {key,threadId:tid,turnId:turn.turn.id};
 });}
 async pause(id:string,key:string){const t=this.task(key),h=this.host(t.hostId);if(!t.managed)throw new Error('Open this desktop-owned task in Codex to pause it');return this.command(id,key,'pause',{},async()=>{const r=await h.rpc.call('thread/read',{threadId:t.id,includeTurns:true});const active=r.thread?.turns?.findLast((x:any)=>x.status==='inProgress');if(!active)throw new Error('No active turn to pause');return h.rpc.call('turn/interrupt',{threadId:t.id,turnId:active.id});});}
 async chat(message:string){if(this.chatBusy)throw new Error('The coordinator is answering your previous message');this.chatBusy=true;this.store.addChat('user',{answer:message});this.emit('change');try{const local=this.hosts.find(h=>!h.config.ssh);if(!local)throw new Error('A local Codex runtime is required');const result=await coordinate(local.config.codex,this.root,message,this.store.tasks().filter(t=>t.watched||t.status==='running'),this.store.chat(),this.store.actions());this.store.addChat('assistant',result);return result;}catch(e){this.store.addChat('assistant',{answer:`Coordinator unavailable: ${(e as Error).message}`,dispatches:[]});throw e;}finally{this.chatBusy=false;this.emit('change');}}
 event(h:Host,e:any,generation:string){const p=e.params||{},tid=p.threadId||p.thread?.id;const key=tid?taskKey(h.config.id,tid):null;
 if(e.id!=null&&e.method){
  const supported=['item/commandExecution/requestApproval','item/fileChange/requestApproval','item/permissions/requestApproval','item/tool/requestUserInput','mcpServer/elicitation/request'];
  if(!supported.includes(e.method)){try{h.rpc.write({id:e.id,error:{code:-32601,message:'Astra Control does not support this interactive request. Open the task in Codex.'}});}catch{}return;}
  this.store.action('approval',e.method.includes('requestUserInput')?'Agent has a question':e.method.includes('fileChange')?'Review file access':e.method.includes('commandExecution')?'Review command':'Permission or input needed',p.reason||p.command||p.message||'Review the request below.',key,`approval:${h.config.id}:${generation}:${JSON.stringify(e.id)}`,{hostId:h.config.id,generation,requestId:e.id,method:e.method,params:p});this.emit('change');return;
 }
 if(e.method==='serverRequest/resolved'){for(const a of this.store.actions())if(a.kind==='approval'&&a.payload?.hostId===h.config.id&&JSON.stringify(a.payload.requestId)===JSON.stringify(p.requestId)&&a.payload.generation===generation)this.store.resolve(a.id);}
 if(e.method==='turn/completed'&&key){const turn=p.turn||{};this.store.action(turn.status==='failed'?'failure':'completion',turn.status==='failed'?'Task needs attention':'Agent finished a turn',turn.error?.message||'Review the latest response and changes.',key,`${turn.status==='failed'?'failure':'completion'}:${key}:${turn.id}${turn.status==='failed'?':failed':''}`);void this.refreshHost(h);}
 if(['turn/started','turn/completed','thread/status/changed','serverRequest/resolved'].includes(e.method))this.emit('change');
 }
 approval(id:string,decision:any){const a=this.store.actions().find(a=>a.id===id);if(!a||a.kind!=='approval'||a.status!=='open')throw new Error('This request is no longer pending');const p=a.payload,h=this.host(p.hostId);let response:any;
 if(p.method==='item/commandExecution/requestApproval'||p.method==='item/fileChange/requestApproval'){if(!['accept','decline','cancel'].includes(decision.action))throw new Error('Invalid decision');const offered=p.params.availableDecisions;if(Array.isArray(offered)&&!offered.includes(decision.action))throw new Error('This decision is not available for the request');response={decision:decision.action};}
 else if(p.method==='item/tool/requestUserInput'){const questions=p.params.questions||[];const answers:any={};for(const q of questions){const value=decision.answers?.[q.id];if(typeof value!=='string'||!value.trim())throw new Error('Answer every question');answers[q.id]={answers:[value]};}response={answers};}
 else if(p.method==='item/permissions/requestApproval'){if(!['accept','decline'].includes(decision.action))throw new Error('Invalid decision');response={permissions:decision.action==='accept'?p.params.permissions:{},scope:'turn'};}
 else {if(decision.action!=='decline'&&decision.action!=='cancel')throw new Error('This connector request must be completed in Codex; it can only be declined here');response={action:decision.action,content:null};}
 h.rpc.respond(p.requestId,response,p.generation);this.store.resolve(id,'responding');this.emit('change');return {status:'responding'};
 }
 close(){this.stopping=true;if(this.timer)clearInterval(this.timer);for(const h of this.hosts)h.rpc.close();}
}
