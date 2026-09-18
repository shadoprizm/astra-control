import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {Rpc} from './rpc.js';
import type {HostConfig,Task} from './types.js';
import {taskKey} from './types.js';

export class Host {
 rpc:Rpc; online=false; lastSeen=0; error='Connecting'; polling=false;
 constructor(public config:HostConfig,private root:string){this.rpc=new Rpc(config);}
 async snapshot(id?:string):Promise<Task[]>{const tasks=await this.python(id?{id}:{});const now=Date.now();return tasks.map((t:any)=>({...t,key:taskKey(this.config.id,t.id),hostId:this.config.id,observedAt:now}));}
 async git(id:string){return this.python({method:'git',id});}
 private python(params:any):Promise<any>{
  const script=readFileSync(`${this.root}/connector/snapshot.py`,'utf8');
  const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'";
  const args=JSON.stringify(params);
  const child=this.config.ssh?spawn('ssh',['-T','-o','BatchMode=yes','-o','ConnectTimeout=8',this.config.ssh,`python3 - ${quote(args)}`]):spawn(this.config.python||'python3',['-',args]);
  return new Promise((resolve,reject)=>{let out='';const timeout=setTimeout(()=>{child.kill();reject(new Error('Host did not respond within 25 seconds'));},25000);child.stdout.on('data',d=>{out+=d;if(out.length>8000000)child.kill();});child.stderr.on('data',()=>{});child.on('error',e=>{clearTimeout(timeout);reject(e);});child.on('close',code=>{clearTimeout(timeout);try{const result=JSON.parse(out);if(!result.ok)throw new Error(result.error);resolve(result.result);}catch(e){reject(new Error(code===255?'SSH connection unavailable':(e as Error).message));}});child.stdin.end(script);});
 }
}
